import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
vi.mock("server-only", () => ({}));
const mocks = vi.hoisted(() => ({
  apps: vi.fn(),
  initialize: vi.fn(),
  auth: { verifyIdToken: vi.fn() },
  appCheck: { verifyToken: vi.fn() },
  bucket: { getFiles: vi.fn() },
}));
vi.mock("firebase-admin/app", () => ({
  getApps: mocks.apps,
  initializeApp: mocks.initialize,
  cert: vi.fn(),
  applicationDefault: vi.fn(),
}));
vi.mock("firebase-admin/auth", () => ({ getAuth: () => mocks.auth }));
vi.mock("firebase-admin/app-check", () => ({
  getAppCheck: () => mocks.appCheck,
}));
vi.mock("firebase-admin/firestore", () => ({ getFirestore: () => ({}) }));
vi.mock("firebase-admin/storage", () => ({
  getStorage: () => ({ bucket: () => mocks.bucket }),
}));
import {
  getAdmin,
  requireAiStorage,
  requireAiUser,
} from "@/lib/server/firebase-admin";

const request = (extra = {}) =>
  new Request("https://neuroquest.example/api/anchors/ai-generate", {
    headers: { Authorization: "Bearer firebase-id-token", ...extra },
  });
beforeEach(() => {
  vi.resetAllMocks();
  mocks.apps.mockReturnValue([{ name: "neuroquest-ai" }]);
  mocks.auth.verifyIdToken.mockResolvedValue({
    uid: "alice",
    firebase: { sign_in_provider: "password" },
  });
  vi.stubEnv("FIREBASE_REQUIRE_APP_CHECK", "false");
});
afterEach(() => vi.unstubAllEnvs());

describe("Firebase server authentication", () => {
  it("verifies the ID token and its revocation status before returning the owner", async () => {
    expect((await requireAiUser(request())).uid).toBe("alice");
    expect(mocks.auth.verifyIdToken).toHaveBeenCalledWith(
      "firebase-id-token",
      true,
    );
  });
  it("rejects missing, anonymous or revoked sessions", async () => {
    await expect(
      requireAiUser(new Request("https://neuroquest.example/")),
    ).rejects.toMatchObject({ code: "SIGN_IN_REQUIRED", status: 401 });
    mocks.auth.verifyIdToken
      .mockResolvedValueOnce({
        uid: "guest",
        firebase: { sign_in_provider: "anonymous" },
      })
      .mockRejectedValueOnce(new Error("raw revoked token"));
    for (let i = 0; i < 2; i++)
      await expect(requireAiUser(request())).rejects.toMatchObject({
        code: "SESSION_EXPIRED",
        status: 401,
      });
  });
  it("requires and verifies App Check when enabled", async () => {
    vi.stubEnv("FIREBASE_REQUIRE_APP_CHECK", "true");
    await expect(requireAiUser(request())).rejects.toMatchObject({
      status: 401,
    });
    expect(
      (
        await requireAiUser(
          request({ "X-Firebase-AppCheck": "app-check-token" }),
        )
      ).uid,
    ).toBe("alice");
    expect(mocks.appCheck.verifyToken).toHaveBeenCalledWith("app-check-token");
  });
  it("explains missing server credentials without attempting provider work", () => {
    mocks.apps.mockReturnValue([]);
    for (const name of [
      "FIREBASE_PROJECT_ID",
      "NEXT_PUBLIC_FIREBASE_PROJECT_ID",
      "FIREBASE_ADMIN_CLIENT_EMAIL",
      "FIREBASE_ADMIN_PRIVATE_KEY",
      "GOOGLE_APPLICATION_CREDENTIALS",
      "FIREBASE_AUTH_EMULATOR_HOST",
    ])
      vi.stubEnv(name, "");
    expect(() => getAdmin()).toThrow("Firebase server credentials");
    expect(mocks.initialize).not.toHaveBeenCalled();
  });
  it("checks storage with only the signed-in owner's model prefix", async () => {
    mocks.bucket.getFiles.mockResolvedValue([[]]);
    await requireAiStorage("alice");
    expect(mocks.bucket.getFiles).toHaveBeenCalledWith({
      prefix: "users/alice/ai-anchors/",
      maxResults: 1,
      autoPaginate: false,
    });
  });
  it("sanitizes missing-bucket and access errors before a scan can reserve quota", async () => {
    mocks.bucket.getFiles.mockRejectedValue(
      new Error("private credential provider response"),
    );
    await expect(requireAiStorage("alice")).rejects.toMatchObject({
      code: "STORAGE_UNAVAILABLE",
      status: 503,
    });
    await expect(requireAiStorage("alice")).rejects.not.toThrow(
      "private credential",
    );
  });
});
