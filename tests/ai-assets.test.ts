import { Readable } from "node:stream";
import { beforeEach, describe, expect, it, vi } from "vitest";
vi.mock("server-only", () => ({}));
const mocks = vi.hoisted(() => ({
  auth: vi.fn(),
  read: vi.fn(),
  file: vi.fn(),
  exists: vi.fn(),
  stream: vi.fn(),
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
});
