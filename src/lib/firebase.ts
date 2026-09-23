import { getApp, getApps, initializeApp } from "firebase/app";
import {
  connectAuthEmulator,
  getAuth,
  setPersistence,
  browserSessionPersistence,
} from "firebase/auth";
import { connectFirestoreEmulator, getFirestore } from "firebase/firestore";
import { getStorage } from "firebase/storage";

// Firebase web configuration identifies the project; access is enforced by Auth and Rules.
const firebaseConfig = {
  apiKey:
    process.env.NEXT_PUBLIC_FIREBASE_API_KEY ||
    "AIzaSyA4109bavkXHue_Z8kZYM8MaVqHhPtNAyk",
  authDomain:
    process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN ||
    "neuroquest-c0cf0.firebaseapp.com",
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID || "neuroquest-c0cf0",
  storageBucket:
    process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET ||
    "neuroquest-c0cf0.firebasestorage.app",
  messagingSenderId: "166029371548",
  appId:
    process.env.NEXT_PUBLIC_FIREBASE_APP_ID ||
    "1:166029371548:web:3d0916e7787e993d7a6559",
};

let services: ReturnType<typeof initializeServices> | undefined;
function initializeServices() {
  if (typeof window === "undefined")
    throw new Error("Firebase sessions run in the browser.");
  const app = getApps().length ? getApp() : initializeApp(firebaseConfig);
  const auth = getAuth(app);
  const db = getFirestore(app); // Memory-only cache: notes are not persisted to browser disk.
  const storage = getStorage(app);
  if (process.env.NEXT_PUBLIC_USE_FIREBASE_EMULATORS === "true") {
    connectAuthEmulator(auth, "http://127.0.0.1:9099", {
      disableWarnings: true,
    });
    connectFirestoreEmulator(db, "127.0.0.1", 8080);
  }
  // A college/shared computer should not remain logged in after the tab is closed.
  const ready = setPersistence(auth, browserSessionPersistence);
  return { auth, db, storage, ready };
}

export function getFirebase() {
  services ??= initializeServices();
  return services;
}
