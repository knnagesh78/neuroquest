import "server-only";
import {
  applicationDefault,
  cert,
  getApps,
  initializeApp,
} from "firebase-admin/app";
import { getAuth } from "firebase-admin/auth";
import { getAppCheck } from "firebase-admin/app-check";
import { getFirestore } from "firebase-admin/firestore";
import { getStorage } from "firebase-admin/storage";
import { AiError } from "./ai-errors";

export function getAdmin() {
  const projectId =
    process.env.FIREBASE_PROJECT_ID ||
    process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID;
  const storageBucket =
    process.env.FIREBASE_STORAGE_BUCKET ||
    process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET;
  const clientEmail = process.env.FIREBASE_ADMIN_CLIENT_EMAIL;
  const privateKey = process.env.FIREBASE_ADMIN_PRIVATE_KEY?.replace(
    /\\n/g,
    "\n",
  );
  const emulator =
    process.env.NODE_ENV !== "production" &&
    !!process.env.FIREBASE_AUTH_EMULATOR_HOST;
  let app = getApps().find((candidate) => candidate.name === "neuroquest-ai");
  if (!app) {
    if (
      !projectId ||
      !storageBucket ||
      (!emulator &&
        !(clientEmail && privateKey) &&
        !process.env.GOOGLE_APPLICATION_CREDENTIALS)
    )
      throw new AiError(
        "SERVER_SETUP_REQUIRED",
        "AI scans need Firebase server credentials and a Storage bucket. Ask the project owner to finish the AI setup.",
        503,
      );
    app = initializeApp(
      {
        projectId,
        storageBucket,
        credential:
          clientEmail && privateKey
            ? cert({ projectId, clientEmail, privateKey })
            : applicationDefault(),
      },
      "neuroquest-ai",
    );
  }
  return {
    auth: getAuth(app),
    db: getFirestore(app),
    bucket: getStorage(app).bucket(),
    appCheck: getAppCheck(app),
  };
}

export async function requireAiUser(request: Request) {
  const match = /^Bearer (\S+)$/.exec(
    request.headers.get("authorization") || "",
  );
  if (!match)
    throw new AiError(
      "SIGN_IN_REQUIRED",
      "Sign in before creating or loading an AI anchor.",
      401,
    );
  const admin = getAdmin();
  try {
    const token = await admin.auth.verifyIdToken(match[1], true);
    if (!token.uid || token.firebase?.sign_in_provider === "anonymous")
      throw new Error("Invalid account");
    if (process.env.FIREBASE_REQUIRE_APP_CHECK === "true") {
      const appCheckToken = request.headers.get("X-Firebase-AppCheck");
      if (!appCheckToken) throw new Error("Missing App Check");
      await admin.appCheck.verifyToken(appCheckToken);
    }
    return { uid: token.uid, ...admin };
  } catch {
    throw new AiError(
      "SESSION_EXPIRED",
      "Your session could not be verified. Sign in again and retry.",
      401,
    );
  }
}

/** Check private storage before reserving quota or starting a purchased task. */
export async function requireAiStorage(uid: string) {
  try {
    await getAdmin().bucket.getFiles({
      prefix: `users/${uid}/ai-anchors/`,
      maxResults: 1,
      autoPaginate: false,
    });
  } catch {
    throw new AiError(
      "STORAGE_UNAVAILABLE",
      "Private model storage is unavailable. Ask the project owner to check Firebase Storage setup and access, then try again.",
      503,
    );
  }
}

export function requireSameOrigin(request: Request) {
  const origin = request.headers.get("origin");
  if (
    (origin && origin !== new URL(request.url).origin) ||
    request.headers.get("sec-fetch-site") === "cross-site"
  )
    throw new AiError(
      "INVALID_ORIGIN",
      "Open NeuroQuest directly to start a scan.",
      403,
    );
}
