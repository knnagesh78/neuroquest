import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
const mocks = vi.hoisted(() => ({
  firebase: vi.fn(),
  cacheSession: vi.fn(),
  appCheck: vi.fn(),
}));
vi.mock("@/lib/firebase", () => ({ getFirebase: mocks.firebase }));
vi.mock("@/lib/model-cache-session", () => ({
  syncModelCacheUser: mocks.cacheSession,
}));
vi.mock("firebase/app-check", () => ({ getToken: mocks.appCheck }));
import { authenticatedFetch, resizeScanPhoto } from "@/lib/ai-client";

beforeEach(() => vi.resetAllMocks());
afterEach(() => vi.unstubAllGlobals());
describe("authenticated AI requests", () => {
  it("refreshes a rejected ID token once and establishes the model cache session", async () => {
    const user = {
      uid: "alice",
      getIdToken: vi
        .fn()
        .mockResolvedValueOnce("old-token")
        .mockResolvedValueOnce("fresh-token"),
    };
    mocks.firebase.mockReturnValue({
      auth: { currentUser: user },
      ready: Promise.resolve(),
      appCheck: {},
    });
    mocks.appCheck.mockResolvedValue({ token: "app-check" });
    const fetcher = vi
      .fn()
      .mockResolvedValueOnce(new Response("expired", { status: 401 }))
      .mockResolvedValueOnce(new Response("model"));
    vi.stubGlobal("fetch", fetcher);
    expect(
      await (
        await authenticatedFetch("/api/anchors/assets/alice/job/model.glb")
      ).text(),
    ).toBe("model");
    expect(user.getIdToken.mock.calls).toEqual([[false], [true]]);
    expect(mocks.cacheSession).toHaveBeenCalledWith("alice");
    expect(fetcher.mock.calls[1][1].headers.get("Authorization")).toBe(
      "Bearer fresh-token",
    );
    expect(fetcher.mock.calls[1][1].headers.get("X-Firebase-AppCheck")).toBe(
      "app-check",
    );
  });
  it("stops requests when an account changes during token retrieval", async () => {
    const auth: {
      currentUser: { uid: string; getIdToken: () => Promise<string> } | null;
    } = { currentUser: null };
    auth.currentUser = {
      uid: "alice",
      getIdToken: async () => {
        auth.currentUser = null;
        return "old-token";
      },
    };
    mocks.firebase.mockReturnValue({ auth, ready: Promise.resolve() });
    const fetcher = vi.fn();
    vi.stubGlobal("fetch", fetcher);
    await expect(
      authenticatedFetch("/api/anchors/ai-generate"),
    ).rejects.toThrow("account changed");
    expect(fetcher).not.toHaveBeenCalled();
  });
});

describe("camera image preparation", () => {
  it("fits large photos, preserves the browser's output format and releases the bitmap", async () => {
    const close = vi.fn();
    const bitmap = { width: 4000, height: 2000, close };
    vi.stubGlobal("createImageBitmap", vi.fn().mockResolvedValue(bitmap));
    const drawImage = vi.fn();
    const canvas = {
      width: 0,
      height: 0,
      getContext: () => ({ drawImage }),
      toBlob: (done: (blob: Blob) => void) =>
        done(new Blob(["resized"], { type: "image/png" })),
    };
    vi.stubGlobal("document", { createElement: () => canvas });
    const file = await resizeScanPhoto(
      new File(["photo"], "photo.jpg", { type: "image/jpeg" }),
    );
    expect(canvas.width).toBe(1536);
    expect(canvas.height).toBe(768);
    expect(file.type).toBe("image/png");
    expect(file.name).toBe("scan.png");
    expect(close).toHaveBeenCalledOnce();
    expect(drawImage).toHaveBeenCalledOnce();
  });
  it("rejects overly large decoded images and still closes the bitmap", async () => {
    const close = vi.fn();
    vi.stubGlobal(
      "createImageBitmap",
      vi.fn().mockResolvedValue({ width: 10000, height: 10000, close }),
    );
    await expect(
      resizeScanPhoto(new File(["image"], "huge.png", { type: "image/png" })),
    ).rejects.toThrow("36 million pixels");
    expect(close).toHaveBeenCalledOnce();
  });
  it("rejects unsupported formats before attempting to decode", async () => {
    const decode = vi.fn();
    vi.stubGlobal("createImageBitmap", decode);
    await expect(
      resizeScanPhoto(
        new File(["svg"], "vector.svg", { type: "image/svg+xml" }),
      ),
    ).rejects.toThrow("JPEG, PNG or WebP");
    expect(decode).not.toHaveBeenCalled();
  });
});
