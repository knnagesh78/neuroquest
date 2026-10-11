# AI Vision to 3D Memory Anchors

Students can open **Add a memory anchor → AI 3D Scan**, upload or photograph an object, wait for a textured 3D model and an educational draft, then edit the title, Markdown notes and recall question before choosing **Add to palace**. Existing manual artifacts continue to work.

An image can be ambiguous. Generated meshes are visual study cues, not precise reconstructions of hidden anatomy, electronic connections or engineering dimensions. Review the draft before relying on it.

## Configure the server

1. Install dependencies with `npm ci`. Use Node.js 22 or 24 for development and hosting.
2. Keep the browser Firebase values from `.env.example` in `.env.local`.
3. Add the server variables from `.env.local.example`. Use valid Gemini and Tripo keys. Replace keys that were shared in chat or committed elsewhere. Never give server keys a `NEXT_PUBLIC_` prefix.
4. Set `FIREBASE_ADMIN_CLIENT_EMAIL` and `FIREBASE_ADMIN_PRIVATE_KEY` from a dedicated Firebase/Google Cloud service account in the **same project** as the browser app. The server account needs Firebase Authentication read access (including revoked-token/user checks), Firestore access and access to the configured Storage bucket. Use least-privilege IAM roles suitable for these operations; never put the credential JSON in the repository. The private-key value supports escaped `\n` newlines. On Google infrastructure, Application Default Credentials are supported instead.
5. Enable Cloud Storage and configure the bucket. Firebase billing and each AI provider's credits/quota must support the selected services. Files stay private; no public bucket or token download URLs are used.
6. Deploy the new Firestore rules using `npx firebase-tools deploy --only firestore:rules,storage --project YOUR_PROJECT_ID`. Rules deny direct client access to AI jobs and quotas and validate the new workspace fields. Admin operations bypass rules, so the API verifies the Firebase ID token and owner on every request.
7. If App Check is configured, set `FIREBASE_REQUIRE_APP_CHECK=true` after verifying the web app's App Check configuration. Both generation requests and model loading send its token.
8. Run `node scripts/check-ai-setup.mjs`. It checks configuration, provider credentials, and read access to Firebase Authentication, Firestore and the private Storage bucket. It prints results, never keys or student data, and does not change cloud records or purchase a mesh. `--offline` skips network checks. A failed or incomplete setup returns a nonzero exit code. Write permissions still need the live scan test below.

Run `npm run dev`. Use a real signed-in account and create/save a palace before scanning. The Gemini and Tripo keys alone do not grant the server permission to verify accounts or store files; Firebase server credentials are also required.

### Firebase service account, step by step

In Google Cloud Console, select your Firebase project and open **IAM & Admin → Service Accounts → Create service account**. Name it `neuroquest-ai-server`. Grant **Firebase Authentication Viewer** (`roles/firebaseauth.viewer`) and **Cloud Datastore User** (`roles/datastore.user`) on this project. On the configured Storage bucket's **Permissions** page, grant that service account **Storage Object User** (`roles/storage.objectUser`). If you enable required App Check, also grant **Firebase App Check Token Verifier** (`roles/firebaseappcheck.tokenVerifier`). These permissions allow the operations the routes perform; avoid general Owner/Editor access.

Open that account's **Keys → Add key → Create new key → JSON**. Keep the downloaded file outside this repository. Copy its `client_email` into `FIREBASE_ADMIN_CLIENT_EMAIL`, its `private_key` into `FIREBASE_ADMIN_PRIVATE_KEY`, and verify `project_id` matches the web app. In `.env.local`, surround the private key with quotes and retain its `\n` escapes as shown in the example. In Vercel, enter the same values in Environment Variables and redeploy. Do not send the JSON file or private key in chat, GitHub or screenshots. Delete unused keys in IAM when rotating credentials.

To avoid copying the private key manually, run `npm run setup:firebase -- "C:\\path\\outside-repository\\service-account.json"` with the downloaded file's actual location. The importer checks that the account belongs to the browser app's project, verifies the RSA key, refuses files inside the repository, and preserves your other settings. It writes only to Git-ignored `.env.local` and never prints the credential. This imports an existing account; it does not grant cloud permissions or upload settings to Vercel.

See the official [Admin SDK setup](https://firebase.google.com/docs/admin/setup), [Authentication IAM roles](https://docs.cloud.google.com/iam/docs/roles-permissions/firebaseauth) and [Storage IAM roles](https://docs.cloud.google.com/storage/docs/access-control/iam-roles).

## Deploy with Vercel

Use the normal Next.js preset, `npm run build`, and the repository's lock file. Configure all browser Firebase and private server variables in Vercel's Environment Variables, select the appropriate production/preview environments, then redeploy. Configure Firebase authorized domains for your deployed host. Server routes use the Node runtime; generation routes allow up to 120 seconds for bounded preparation/download work. Mesh generation itself runs at Tripo and can take several minutes. Verify that your Vercel plan supports the configured duration.

Plain static Firebase Hosting cannot run these server routes. `build:hosting` explains this limitation instead of publishing a nonfunctional AI feature. Use Vercel, a Next.js Node server or Firebase App Hosting. Deploy Firestore/Storage rules separately from the web application.

## Processing and data flow

1. The browser resizes JPEG/PNG/WebP photos to at most 1536 pixels per side and less than 3 MB. Original files up to 12 MB can be selected. The server independently decodes the image, rejects invalid/animated/oversized input and strips metadata.
2. `POST /api/anchors/ai-generate` verifies a Firebase ID token, checks private Storage access, validates the palace owner and atomically reserves a durable daily quota. Missing or inaccessible Storage returns a clear error before quota is consumed or a paid task starts. A client-generated request UUID makes retrying a lost POST idempotent.
3. A persistent job is created under `users/{uid}/ai-jobs/{jobId}`. Next.js `after()` runs Gemini analysis and Tripo upload/task creation concurrently. Each branch records actual completion.
4. `GET /api/anchors/ai-generate?jobId=…` returns progress and schedules a bounded status check. A Firestore lease prevents concurrent tabs from downloading the same result. Closing the dialog does not buy another task; reopening AI Scan in that palace resumes the latest unfinished draft. Startup and overall timeouts become explicit errors.
5. The server validates a self-contained GLB, including embedded textures, with a 25 MB maximum, then writes it and a thumbnail beneath `users/{uid}/ai-anchors/{jobId}/` in Storage. Provider responses and keys never enter the client store.
6. Owner-only asset routes stream files to the authenticated browser. Workspace anchors store stable relative model/thumbnail URLs, `artifactType`, an optional generation flag and an optional recall question. Existing anchors without `artifactType` migrate to `preset` when loaded.
7. Confirmation adds the anchor using the existing Zustand actions and serialized Firestore save queue. AI drafts do not insert anchors automatically. New accounts still start empty.
8. React Three Fiber loads the model with authenticated `useGLTF` requests. A bounding box fits it within 1.5 units and centers it. Each instance owns cloned materials, so recall dimming and highlights do not alter another anchor's texture. Cached source resources are released after the final mounted instance unmounts.

The defaults allow **3 scans per user per UTC day**, **50 scans per project per UTC day** and at least 15 seconds between starts. Configure these limits in server environment variables; zero disables scans. Failed attempts consume the reserved quota because an upstream provider may already have accepted/charged a task. They never erase existing notes. Model failures are not retried by automatically purchasing another model. A dedicated queue/worker would be appropriate for larger deployments.

## PWA model cache and privacy

The production service worker caches at most eight successfully loaded GLBs per signed-in user. Entries contain only model buffers; tokens, notes, thumbnails, account pages, Gemini/Tripo requests and Firebase responses are not cached. A per-client session and matching unexpired token claims are required for a cache hit; network misses still undergo full server token verification. Each URL includes the owner and generation ID. Sign-out/account changes clear the model caches, including checks on in-flight downloads.

This improves model revisits in an active signed-in session. Full offline sign-in and offline workspace editing remain unavailable. Private model bytes exist on the device while signed in; use **Save & sign out** on shared computers to remove them. Offline cached graphics cannot perform a live server revocation check.

## Verification

Run `npm run typecheck`, `npm run lint`, `npm test`, `npm run test:rules`, and `npm run build`. Rules tests require Java 21+ for the Firestore emulator. Additions cover structured vision validation, image/GLB safety, legacy and AI anchor persistence, ownership rules, API failure handling, normalization and PWA cache boundaries.

For a live smoke test: sign in, create a palace, scan a clear image, close/reopen while generating, review/edit the notes, confirm, rotate/focus the model, enter Recall, reveal/rate it, refresh, and sign out. Check a second account cannot load the first account's model. Use a failing provider configuration to confirm useful errors and preservation of manual anchors. A mocked test suite does not establish live provider credit availability or visual mesh quality.

Provider references: [Gemini structured outputs](https://ai.google.dev/gemini-api/docs/structured-output), [Tripo official SDK/API contracts](https://github.com/VAST-AI-Research/tripo-python-sdk), [Firebase token verification](https://firebase.google.com/docs/auth/admin/verify-id-tokens).

## Dependency audit

The production dependency audit passed with no known advisories on 11 October 2026. Compatible fixes include Next.js 16.4 and patched gRPC/FTP resolutions. The full development dependency audit still reports the unpatched `braces` advisory through Next.js linting and Firebase CLI tools. [The advisory lists no patched release](https://github.com/advisories/GHSA-vfj7-8cjw-p6xm). These tools process repository-controlled patterns, not uploaded images or student inputs. Keep build/CLI patterns trusted and update when an upstream fix is released; do not downgrade Next.js or Firebase to old major versions to conceal the warning.
