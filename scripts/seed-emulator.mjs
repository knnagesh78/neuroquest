// Disposable browser-test login. Hard-coded demo project + emulator cannot create live accounts.
import { initializeApp, deleteApp } from "firebase/app";
import {
  getAuth,
  connectAuthEmulator,
  createUserWithEmailAndPassword,
} from "firebase/auth";
const app = initializeApp({
  projectId: "demo-neuroquest",
  apiKey: "fake-emulator-key",
});
const auth = getAuth(app);
connectAuthEmulator(auth, "http://127.0.0.1:9099", { disableWarnings: true });
try {
  await createUserWithEmailAndPassword(
    auth,
    "preview_student@users.neuroquest.invalid",
    "PreviewOnly-Study-26!",
  );
  console.log("Disposable local preview account created.");
} finally {
  await deleteApp(app);
}
