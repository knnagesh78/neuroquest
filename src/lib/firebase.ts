import { getApp, getApps, initializeApp } from "firebase/app";
import { initializeAppCheck, ReCaptchaV3Provider } from "firebase/app-check";
import {
  connectAuthEmulator,
  getAuth,
  setPersistence,
  browserSessionPersistence,
} from "firebase/auth";
import { connectFirestoreEmulator, getFirestore } from "firebase/firestore";
import { getStorage } from "firebase/storage";

function requiredPublicConfig(name: string, value: string | undefined): string {
  if (!value) {
    throw new Error(`Missing public Firebase configuration: ${name}`);
  }
  return value;
}

// Firebase browser configuration is public; authorization comes from Auth, Rules, and App Check.
const firebaseConfig = {
  apiKey: requiredPublicConfig(
    "NEXT_PUBLIC_FIREBASE_API_KEY",
    process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  ),
  authDomain: requiredPublicConfig(
    "NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN",
    process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  ),
  projectId: requiredPublicConfig(
    "NEXT_PUBLIC_FIREBASE_PROJECT_ID",
    process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  ),
  storageBucket: requiredPublicConfig(
    "NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET",
    process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
  ),
  messagingSenderId: requiredPublicConfig(
    "NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID",
    process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  ),
  appId: requiredPublicConfig(
    "NEXT_PUBLIC_FIREBASE_APP_ID",
    process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
  ),
};

let services: ReturnType<typeof initializeServices> | undefined;
function initializeServices() {
  if (typeof window === "undefined")
    throw new Error("Firebase sessions run in the browser.");
  const app = getApps().length ? getApp() : initializeApp(firebaseConfig);
  const appCheckSiteKey = process.env.NEXT_PUBLIC_FIREBASE_APPCHECK_SITE_KEY;
  if (appCheckSiteKey) {
    initializeAppCheck(app, {
      provider: new ReCaptchaV3Provider(appCheckSiteKey),
      isTokenAutoRefreshEnabled: true,
    });
  }
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
