import { Readable } from "node:stream";
import { createHash } from "node:crypto";
import { beforeEach, describe, expect, it, vi } from "vitest";
vi.mock("server-only", () => ({}));
const mocks = vi.hoisted(() => ({
  auth: vi.fn(),
  read: vi.fn(),
  file: vi.fn(),
  exists: vi.fn(),
  stream: vi.fn(),
  mesh: vi.fn(),
  download: vi.fn(),
}));
vi.mock("@/lib/server/ai-providers", () => ({
  getMesh: mocks.mesh,
  downloadModel: mocks.download,
}));
vi.mock("@/lib/server/firebase-admin", () => ({ requireAiUser: mocks.auth }));
vi.mock("@/lib/server/ai-jobs", () => ({
  readGeneration: mocks.read,
  assetPath: (uid: string, id: string, file: string) =>
    `users/${uid}/ai-anchors/${id}/${file}`,
}));
import { GET } from "@/app/api/anchors/assets/[uid]/[jobId]/[file]/route";
const id = "b38a4860-fd01-4385-a579-ad255491693d";
const request = () =>
  new Request(
    `https://neuroquest.example/api/anchors/assets/alice/${id}/model.glb`,
  );
const context = (uid = "alice", file = "model.glb", jobId = id) => ({
  params: Promise.resolve({ uid, jobId, file }),
});
beforeEach(() => {
  vi.resetAllMocks();
  mocks.auth.mockResolvedValue({ uid: "alice", bucket: { file: mocks.file } });
  mocks.file.mockReturnValue({
    exists: mocks.exists,
    createReadStream: mocks.stream,
  });
  mocks.exists.mockResolvedValue([true]);
  mocks.stream.mockImplementation(() =>
    Readable.from([Buffer.from("GLB bytes")]),
  );
  mocks.read.mockResolvedValue({ status: "ready" });
});
describe("private model delivery", () => {
  it("streams an owner's ready model with private cache and owner headers", async () => {
    const response = await GET(request(), context());
    expect(response.status).toBe(200);
    expect(await response.text()).toBe("GLB bytes");
    expect(response.headers.get("Content-Type")).toBe("model/gltf-binary");
    expect(response.headers.get("X-NeuroQuest-Owner")).toBe("alice");
    expect(response.headers.get("Vary")).toBe("Authorization");
    expect(response.headers.get("Cache-Control")).toContain("private");
    expect(mocks.file).toHaveBeenCalledWith(
      `users/alice/ai-anchors/${id}/model.glb`,
    );
  });
  it.each([
    ["bob", "model.glb", id],
    ["alice", "../../../private", id],
    ["alice", "model.glb", "../job"],
  ])(
    "rejects another owner or unsafe paths before opening a file",
    async (uid, file, jobId) => {
      expect((await GET(request(), context(uid, file, jobId))).status).toBe(
        404,
      );
      expect(mocks.file).not.toHaveBeenCalled();
      expect(mocks.read).not.toHaveBeenCalled();
      expect(mocks.mesh).not.toHaveBeenCalled();
    },
  );
  it("keeps missing or unfinished models recoverable without exposing raw storage errors", async () => {
    mocks.read.mockResolvedValueOnce({ status: "generating" });
    expect((await GET(request(), context())).status).toBe(409);
    mocks.exists.mockResolvedValueOnce([false]);
    expect((await GET(request(), context())).status).toBe(404);
    mocks.exists.mockRejectedValueOnce(new Error("private credential leaked"));
    const response = await GET(request(), context());
    expect(response.status).toBe(502);
    expect(await response.text()).not.toContain("credential");
  });
  it("refreshes the original task link and streams only the verified model", async () => {
    const bytes = Buffer.alloc(5 * 1024 * 1024, 1);
    mocks.read.mockResolvedValue({
      status: "ready",
      storageProvider: "provider",
      taskId: "original-task",
      modelSha256: createHash("sha256").update(bytes).digest("hex"),
    });
    mocks.mesh.mockResolvedValue({
      status: "success",
      modelUrl: "https://assets.tripo3d.ai/fresh.glb?signature=private",
    });
    mocks.download.mockResolvedValue(bytes);
    const response = await GET(request(), context());
    expect(response.status).toBe(200);
    expect((await response.arrayBuffer()).byteLength).toBe(bytes.length);
    expect(mocks.mesh).toHaveBeenCalledWith("original-task");
    expect(mocks.download).toHaveBeenCalledWith(
      "https://assets.tripo3d.ai/fresh.glb?signature=private",
      expect.any(AbortSignal),
    );
    expect(mocks.file).not.toHaveBeenCalled();
    expect([...response.headers.values()].join(" ")).not.toContain("signature");
  });
  it("rejects replaced or expired provider models while leaving the stored job intact", async () => {
    mocks.read.mockResolvedValue({
      status: "ready",
      storageProvider: "provider",
      taskId: "original-task",
      modelSha256: "expected",
    });
    mocks.mesh
      .mockResolvedValueOnce({
        status: "success",
        modelUrl: "https://assets.tripo3d.ai/fresh.glb",
      })
      .mockResolvedValueOnce({ status: "expired" });
    mocks.download.mockResolvedValue(Buffer.from("changed"));
    const changed = await GET(request(), context());
    expect(changed.status).toBe(502);
    expect(await changed.json()).toMatchObject({ code: "MODEL_CHANGED" });
    const expired = await GET(request(), context());
    expect(expired.status).toBe(502);
    expect((await expired.json()).error).toContain(
      "study notes are still available",
    );
    expect(mocks.file).not.toHaveBeenCalled();
  });
  it("serves bounded Firestore previews without calling the mesh provider", async () => {
    const bytes = Buffer.from("RIFF0000WEBPpreview");
    mocks.read.mockResolvedValue({
      status: "ready",
      storageProvider: "provider",
      thumbnailBase64: bytes.toString("base64"),
    });
    const response = await GET(request(), context("alice", "thumbnail.webp"));
    expect(response.headers.get("Content-Type")).toBe("image/webp");
    expect(Buffer.from(await response.arrayBuffer())).toEqual(bytes);
    expect(mocks.mesh).not.toHaveBeenCalled();
    mocks.read.mockResolvedValue({
      status: "ready",
      storageProvider: "provider",
      thumbnailBase64: Buffer.alloc(256 * 1024 + 1).toString("base64"),
    });
    expect(
      (await GET(request(), context("alice", "thumbnail.webp"))).status,
    ).toBe(404);
    expect(mocks.file).not.toHaveBeenCalled();
  });
});
