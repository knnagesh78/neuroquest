import { afterAll, describe, expect, it } from "vitest";
import { initializeApp, deleteApp } from "firebase/app";
import {
  connectAuthEmulator,
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signOut,
  deleteUser,
  getAuth,
} from "firebase/auth";
import { usernameEmail } from "@/lib/account";

const app = initializeApp(
  { projectId: "demo-neuroquest", apiKey: "fake-emulator-api-key" },
  "auth-test",
);
const auth = getAuth(app);
connectAuthEmulator(auth, "http://127.0.0.1:9099", { disableWarnings: true });
afterAll(async () => {
  if (auth.currentUser) await deleteUser(auth.currentUser);
  await deleteApp(app);
});

describe("username/password registration", () => {
  it("registers, signs out and signs back in with a case-insensitive username", async () => {
    const username = `test_${Date.now().toString(36)}`;
    const password = "TestOnly-Password-84!";
    const first = await createUserWithEmailAndPassword(
      auth,
      usernameEmail(username),
      password,
    );
    const uid = first.user.uid;
    await signOut(auth);
    expect(auth.currentUser).toBeNull();
    await expect(
      signInWithEmailAndPassword(
        auth,
        usernameEmail(username),
        "incorrect-password",
      ),
    ).rejects.toBeDefined();
    const again = await signInWithEmailAndPassword(
      auth,
      usernameEmail(username.toUpperCase()),
      password,
    );
    expect(again.user.uid).toBe(uid);
    await expect(
      createUserWithEmailAndPassword(
        auth,
        usernameEmail(username.toUpperCase()),
        password,
      ),
    ).rejects.toMatchObject({ code: "auth/email-already-in-use" });
  });
});
