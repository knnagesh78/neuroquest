import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
vi.mock("server-only", () => ({}));
const mocks = vi.hoisted(() => ({
  admin: vi.fn(),
  vision: vi.fn(),
  start: vi.fn(),
  mesh: vi.fn(),
  download: vi.fn(),
}));
vi.mock("@/lib/server/firebase-admin", () => ({ getAdmin: mocks.admin }));
vi.mock("@/lib/server/ai-providers", () => ({
  analyzeConcept: mocks.vision,
  startMesh: mocks.start,
  getMesh: mocks.mesh,
  downloadModel: mocks.download,
}));
import {
  advanceGeneration,
  claimGenerationPoll,
  createGeneration,
  prepareGeneration,
  publicJob,
  readGeneration,
} from "@/lib/server/ai-jobs";
import { AiError } from "@/lib/server/ai-errors";

type Data = Record<string, unknown>;
function database() {
  const values = new Map<string, Data>();
  const files = new Map<string, Buffer>();
  const snapshot = (path: string) => ({
    exists: values.has(path),
    data: () => values.get(path),
  });
  const doc = (path: string) => ({
    path,
    get: async () => snapshot(path),
    update: async (data: Data) => {
      values.set(path, { ...values.get(path), ...data });
    },
  });
  let serial = Promise.resolve();
  const db = {
    doc,
    runTransaction: <T>(
      operation: (tx: {
        get: (
          ref: ReturnType<typeof doc>,
        ) => Promise<ReturnType<typeof snapshot>>;
        set: (ref: ReturnType<typeof doc>, value: Data) => void;
        update: (ref: ReturnType<typeof doc>, value: Data) => void;
      }) => Promise<T>,
    ) => {
      const run = serial.then(async () => {
        const writes = new Map<string, Data>();
        const result = await operation({
          get: async (ref) => snapshot(ref.path),
          set: (ref, data) => {
            writes.set(ref.path, data);
          },
          update: (ref, data) => {
            writes.set(ref.path, { ...values.get(ref.path), ...data });
          },
        });
        for (const [path, data] of writes) values.set(path, data);
        return result;
      });
      serial = run.then(
        () => {},
        () => {},
      );
      return run;
    },
  };
  const bucket = {
    file: (path: string) => ({
      save: async (bytes: Buffer) => {
        files.set(path, bytes);
      },
    }),
  };
  return { db, bucket, values, files };
}
let memory: ReturnType<typeof database>;
const id = "b38a4860-fd01-4385-a579-ad255491693d";
const concept = {
  conceptTitle: "Heart",
  category: "Anatomy",
  studyNotes: "# Heart",
  recallPrompt: "What does it do?",
};
beforeEach(() => {
  vi.resetAllMocks();
  vi.useFakeTimers();
  vi.setSystemTime(new Date("2026-10-11T12:00:00Z"));
  vi.stubEnv("AI_DAILY_USER_LIMIT", "3");
  vi.stubEnv("AI_DAILY_GLOBAL_LIMIT", "50");
  memory = database();
  memory.values.set("users/alice/workspace/room_anatomy", { id: "anatomy" });
  mocks.admin.mockReturnValue(memory);
  mocks.vision.mockResolvedValue(concept);
  mocks.start.mockResolvedValue("provider-task-123");
  mocks.download.mockResolvedValue(Buffer.from("validated glb"));
});
afterEach(() => {
  vi.useRealTimers();
  vi.unstubAllEnvs();
});

describe("durable scan ownership, quotas and recovery", () => {
  it("atomically creates one job and reserves quota once for concurrent retries", async () => {
    const results = await Promise.all([
      createGeneration("alice", id, "anatomy"),
      createGeneration("alice", id, "anatomy"),
    ]);
    expect(results.filter((result) => result.created)).toHaveLength(1);
    expect(memory.values.get("users/alice/ai-usage/2026-10-11")?.count).toBe(1);
    expect(memory.values.get("ai-usage/2026-10-11")?.count).toBe(1);
    expect(memory.values.get("users/alice/ai-room-jobs/anatomy")?.jobId).toBe(
      id,
    );
    await expect(readGeneration("bob", id)).rejects.toMatchObject({
      status: 404,
    });
    await expect(
      createGeneration("alice", id, "other-room"),
    ).rejects.toMatchObject({ code: "INVALID_JOB" });
  });
  it("does not consume quota for another owner's or an unsaved palace", async () => {
    await expect(createGeneration("bob", id, "anatomy")).rejects.toMatchObject({
      code: "ROOM_NOT_SAVED",
    });
    expect(memory.values.has("ai-usage/2026-10-11")).toBe(false);
  });
  it("enforces daily limits and spacing across distinct requests", async () => {
    await createGeneration("alice", id, "anatomy");
    await expect(
      createGeneration("alice", "another-id", "anatomy"),
    ).rejects.toMatchObject({ code: "TOO_FAST" });
    vi.advanceTimersByTime(16000);
    vi.stubEnv("AI_DAILY_USER_LIMIT", "1");
    await expect(
      createGeneration("alice", "another-id", "anatomy"),
    ).rejects.toMatchObject({ code: "DAILY_LIMIT" });
  });
  it("starts vision and mesh in parallel, then privately finalizes a model", async () => {
    await createGeneration("alice", id, "anatomy");
    let resolveVision!: (value: typeof concept) => void;
    mocks.vision.mockReturnValue(
      new Promise((resolve) => {
        resolveVision = resolve;
      }),
    );
    const preparation = prepareGeneration(
      "alice",
      id,
      Buffer.from("image"),
      Buffer.from("thumbnail"),
    );
    await Promise.resolve();
    await Promise.resolve();
    expect(mocks.start).toHaveBeenCalledOnce();
    expect(mocks.vision).toHaveBeenCalledOnce();
    resolveVision(concept);
    await preparation;
    const claims = await Promise.all([
      claimGenerationPoll("alice", id),
      claimGenerationPoll("alice", id),
    ]);
    expect(claims.filter(Boolean)).toHaveLength(1);
    mocks.mesh.mockResolvedValue({
      status: "success",
      progress: 100,
      modelUrl: "https://assets.tripo3d.ai/private.glb?signature=secret",
    });
    await advanceGeneration("alice", id);
    const ready = await readGeneration("alice", id);
    expect(ready.status).toBe("ready");
    expect(memory.files.has(`users/alice/ai-anchors/${id}/model.glb`)).toBe(
      true,
    );
    expect(publicJob(ready)).toMatchObject({
      concept,
      modelUrl: `/api/anchors/assets/alice/${id}/model.glb`,
      meshComplete: true,
    });
    expect(JSON.stringify(publicJob(ready))).not.toContain("provider-task");
    expect(JSON.stringify(publicJob(ready))).not.toContain("signature");
  });
  it("retries temporary polling failures without purchasing another mesh", async () => {
    await createGeneration("alice", id, "anatomy");
    await prepareGeneration("alice", id, Buffer.alloc(1), Buffer.alloc(1));
    mocks.mesh.mockRejectedValue(new AiError("MESH_RETRYABLE", "busy", 502));
    await advanceGeneration("alice", id);
    expect((await readGeneration("alice", id)).status).toBe("generating");
    expect(mocks.start).toHaveBeenCalledOnce();
    expect(await claimGenerationPoll("alice", id)).toBe(false);
    vi.advanceTimersByTime(16000);
    expect(await claimGenerationPoll("alice", id)).toBe(true);
  });
  it("records safe terminal errors and marks stalled startup jobs failed", async () => {
    await createGeneration("alice", id, "anatomy");
    mocks.vision.mockRejectedValue(new Error("provider secret"));
    await prepareGeneration("alice", id, Buffer.alloc(1), Buffer.alloc(1));
    const failed = await readGeneration("alice", id);
    expect(failed.status).toBe("failed");
    expect(failed.error).not.toContain("secret");
    vi.advanceTimersByTime(16000);
    await createGeneration("alice", "another-job", "anatomy");
    vi.advanceTimersByTime(180001);
    expect(await claimGenerationPoll("alice", "another-job")).toBe(false);
    expect((await readGeneration("alice", "another-job")).status).toBe(
      "failed",
    );
  });
});
