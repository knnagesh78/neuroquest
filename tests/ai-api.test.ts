import { beforeEach, describe, expect, it, vi } from "vitest";
vi.mock("server-only", () => ({}));
const mock = vi.hoisted(() => ({
  auth: vi.fn(),
  storage: vi.fn(),
  prepareImage: vi.fn(),
  keys: vi.fn(),
  create: vi.fn(),
  prepareJob: vi.fn(),
  claim: vi.fn(),
  advance: vi.fn(),
  read: vi.fn(),
  after: vi.fn(),
  pointer: vi.fn(),
}));
vi.mock("next/server", () => ({ after: mock.after }));
vi.mock("@/lib/server/firebase-admin", async (importOriginal) => ({
  ...(await importOriginal<object>()),
  requireAiUser: mock.auth,
  requireAiStorage: mock.storage,
}));
vi.mock("@/lib/server/ai-providers", () => ({
  prepareScanImage: mock.prepareImage,
  requireProviderKeys: mock.keys,
}));
vi.mock("@/lib/server/ai-jobs", () => ({
  createGeneration: mock.create,
  prepareGeneration: mock.prepareJob,
  claimGenerationPoll: mock.claim,
  advanceGeneration: mock.advance,
  readGeneration: mock.read,
  publicJob: (job: unknown) => job,
}));
import { GET, POST } from "@/app/api/anchors/ai-generate/route";
import { AiError } from "@/lib/server/ai-errors";

const id = "b38a4860-fd01-4385-a579-ad255491693d";
const job = {
  id,
  roomId: "anatomy",
  status: "preparing",
  analysisComplete: false,
  meshComplete: false,
  progress: 0,
};
const payload = {
  image: "data:image/png;base64,aW1hZ2U=",
  roomId: "anatomy",
  requestId: id,
};
function request(
  value: unknown = payload,
  headers: Record<string, string> = {},
) {
  return new Request("https://neuroquest.example/api/anchors/ai-generate", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Origin: "https://neuroquest.example",
      ...headers,
    },
    body: JSON.stringify(value),
  });
}
beforeEach(() => {
  vi.resetAllMocks();
  mock.auth.mockResolvedValue({
    uid: "alice",
    db: { doc: vi.fn().mockReturnValue({ get: mock.pointer }) },
  });
  mock.prepareImage.mockResolvedValue({
    image: Buffer.from("safe png"),
    thumbnail: Buffer.from("webp"),
  });
  mock.storage.mockResolvedValue(undefined);
  mock.create.mockResolvedValue({ created: true, job });
  mock.read.mockResolvedValue(job);
  mock.claim.mockResolvedValue(false);
  mock.pointer.mockResolvedValue({ data: () => undefined });
});

describe("authenticated generation route", () => {
  it("returns a resumable job and schedules preparation after the response", async () => {
    const response = await POST(request());
    expect(response.status).toBe(202);
    expect(await response.json()).toEqual({ job });
    expect(mock.create).toHaveBeenCalledWith("alice", id, "anatomy");
    expect(mock.prepareJob).not.toHaveBeenCalled();
    await mock.after.mock.calls[0][0]();
    expect(mock.prepareJob).toHaveBeenCalledWith(
      "alice",
      id,
      Buffer.from("safe png"),
      Buffer.from("webp"),
    );
  });
  it("accepts camera/file multipart uploads", async () => {
    const form = new FormData();
    form.append(
      "image",
      new File(["bytes"], "photo.webp", { type: "image/webp" }),
    );
    form.append("roomId", "anatomy");
    form.append("requestId", id);
    const response = await POST(
      new Request("https://neuroquest.example/api/anchors/ai-generate", {
        method: "POST",
        body: form,
      }),
    );
    expect(response.status).toBe(202);
    expect(mock.prepareImage).toHaveBeenCalledWith(
      Buffer.from("bytes"),
      "image/webp",
    );
  });
  it("does not start another purchased task for a repeated request UUID", async () => {
    mock.create.mockResolvedValue({ created: false, job });
    expect((await POST(request())).status).toBe(202);
    expect(mock.after).not.toHaveBeenCalled();
  });
  it("rejects an unverified login before processing an image or charging quota", async () => {
    mock.auth.mockRejectedValue(
      new AiError("SESSION_EXPIRED", "Sign in again", 401),
    );
    expect((await POST(request())).status).toBe(401);
    expect(mock.prepareImage).not.toHaveBeenCalled();
    expect(mock.create).not.toHaveBeenCalled();
  });
  it("does not reserve quota or start providers when private storage is unavailable", async () => {
    mock.storage.mockRejectedValue(
      new AiError("STORAGE_UNAVAILABLE", "Finish private storage setup", 503),
    );
    const response = await POST(request());
    expect(response.status).toBe(503);
    expect((await response.json()).code).toBe("STORAGE_UNAVAILABLE");
    expect(mock.storage).toHaveBeenCalledWith("alice");
    expect(mock.create).not.toHaveBeenCalled();
    expect(mock.after).not.toHaveBeenCalled();
    expect(mock.prepareJob).not.toHaveBeenCalled();
  });
  it("rejects a cross-origin request before verifying credentials", async () => {
    expect(
      (await POST(request(payload, { Origin: "https://other.example" })))
        .status,
    ).toBe(403);
    expect(mock.auth).not.toHaveBeenCalled();
  });
  it.each([
    null,
    [],
    { ...payload, requestId: "../attack" },
    { ...payload, roomId: "../other-user" },
    { ...payload, image: "not base64!" },
  ])("rejects malformed input without creating a job", async (value) => {
    expect((await POST(request(value))).status).toBe(400);
    expect(mock.create).not.toHaveBeenCalled();
  });
  it("caps actual streamed input even when Content-Length is absent", async () => {
    const response = await POST(
      request({ ...payload, image: "A".repeat(4 * 1024 * 1024 + 20001) }),
    );
    expect(response.status).toBe(413);
    expect(mock.prepareImage).not.toHaveBeenCalled();
  });
  it("returns sanitized failures and disables response caching", async () => {
    mock.create.mockRejectedValue(new Error("admin private key secret"));
    const response = await POST(request());
    expect(response.status).toBe(502);
    expect(await response.text()).not.toContain("secret");
    expect(response.headers.get("Cache-Control")).toBe("no-store");
  });
  it("resumes only the signed-in user's job and schedules a leased status check", async () => {
    mock.claim.mockResolvedValue(true);
    const response = await GET(
      new Request(
        `https://neuroquest.example/api/anchors/ai-generate?jobId=${id}`,
      ),
    );
    expect(response.status).toBe(200);
    expect(mock.read).toHaveBeenCalledWith("alice", id);
    await mock.after.mock.calls[0][0]();
    expect(mock.advance).toHaveBeenCalledWith("alice", id);
  });
  it("returns no draft for a palace with no previous scan", async () => {
    const response = await GET(
      new Request(
        "https://neuroquest.example/api/anchors/ai-generate?roomId=anatomy",
      ),
    );
    expect(await response.json()).toEqual({ job: null });
    expect(mock.read).not.toHaveBeenCalled();
  });
});
