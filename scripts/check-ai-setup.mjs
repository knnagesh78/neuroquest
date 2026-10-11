import { createRequire } from "node:module";
import {
  applicationDefault,
  cert,
  deleteApp,
  initializeApp,
} from "firebase-admin/app";
import { getAuth } from "firebase-admin/auth";
import { getFirestore } from "firebase-admin/firestore";
import { getStorage } from "firebase-admin/storage";
const require = createRequire(import.meta.url);
require("@next/env").loadEnvConfig(process.cwd(), true, {
  info() {},
  error() {},
});

const needed = [
  "GEMINI_API_KEY",
  "TRIPO_API_KEY",
  "FIREBASE_ADMIN_CLIENT_EMAIL",
  "FIREBASE_ADMIN_PRIVATE_KEY",
];
const adc = !!process.env.GOOGLE_APPLICATION_CREDENTIALS;
for (const name of needed) {
  const configured = !!process.env[name];
  console.log(
    `${name}: ${configured ? "configured" : adc && name.startsWith("FIREBASE_ADMIN_") ? "using application default credentials" : "missing"}`,
  );
  if (!configured && !(adc && name.startsWith("FIREBASE_ADMIN_")))
    process.exitCode = 1;
}
const projectId =
  process.env.FIREBASE_PROJECT_ID ||
  process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID;
const storageBucket =
  process.env.FIREBASE_STORAGE_BUCKET ||
  process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET;
if (!projectId || !storageBucket) {
  console.log("Firebase project / Storage bucket: missing");
  process.exitCode = 1;
} else if (projectId !== process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID) {
  console.log("Firebase server project: does not match the browser app");
  process.exitCode = 1;
} else console.log("Firebase project / Storage bucket: configured");
if (!process.argv.includes("--offline")) {
  const checks = [
    [
      "Gemini",
      "https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash",
      { "x-goog-api-key": process.env.GEMINI_API_KEY || "" },
    ],
    [
      "Tripo",
      "https://api.tripo3d.ai/v2/openapi/user/balance",
      { Authorization: `Bearer ${process.env.TRIPO_API_KEY || ""}` },
    ],
  ];
  await Promise.all(
    checks.map(async ([name, url, headers]) => {
      try {
        const response = await fetch(url, {
          headers,
          signal: AbortSignal.timeout(15000),
        });
        console.log(
          `${name}: HTTP ${response.status}${response.ok ? " (credential check passed)" : " (check API key, API access and account configuration)"}`,
        );
        if (!response.ok) process.exitCode = 1;
      } catch {
        console.log(`${name}: could not reach the provider`);
        process.exitCode = 1;
      }
    }),
  );
  if (
    projectId &&
    storageBucket &&
    (adc ||
      (process.env.FIREBASE_ADMIN_CLIENT_EMAIL &&
        process.env.FIREBASE_ADMIN_PRIVATE_KEY))
  ) {
    let app;
    let db;
    try {
      app = initializeApp(
        {
          projectId,
          storageBucket,
          credential:
            process.env.FIREBASE_ADMIN_CLIENT_EMAIL &&
            process.env.FIREBASE_ADMIN_PRIVATE_KEY
              ? cert({
                  projectId,
                  clientEmail: process.env.FIREBASE_ADMIN_CLIENT_EMAIL,
                  privateKey: process.env.FIREBASE_ADMIN_PRIVATE_KEY.replace(
                    /\\n/g,
                    "\n",
                  ),
                })
              : applicationDefault(),
        },
        "neuroquest-setup-check",
      );
      db = getFirestore(app);
      db.settings({ preferRest: true });
      const checks = [
        [
          "Firebase Authentication read access",
          async () => {
            try {
              await getAuth(app).getUser("neuroquest-setup-permission-probe");
            } catch (error) {
              if (error.code !== "auth/user-not-found") throw error;
            }
          },
        ],
        [
          "Firestore read access",
          () =>
            db.doc(`ai-usage/${new Date().toISOString().slice(0, 10)}`).get(),
        ],
        [
          "Private Storage read access",
          () =>
            getStorage(app)
              .bucket()
              .getFiles({ maxResults: 1, autoPaginate: false }),
        ],
      ];
      await Promise.all(
        checks.map(async ([name, run]) => {
          try {
            await run();
            console.log(`${name}: passed`);
          } catch {
            console.log(
              `${name}: failed (check credentials, service availability and IAM roles)`,
            );
            process.exitCode = 1;
          }
        }),
      );
      console.log(
        "No student records or files were changed. Write permissions and paid generation still need a live scan test.",
      );
    } catch {
      console.log("Firebase server credential: invalid or unavailable");
      process.exitCode = 1;
    } finally {
      if (db) await db.terminate().catch(() => {});
      if (app) await deleteApp(app).catch(() => {});
    }
  } else
    console.log(
      "Firebase permission checks: skipped until server credentials are configured",
    );
}
// This script never prints credentials and never purchases a 3D task.
