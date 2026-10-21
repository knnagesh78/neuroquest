# NeuroQuest

A 3D spatial memory palace for education. Students create subject palaces, attach Markdown notes to distinctive geometric artifacts, and practice recalling ideas by their location.

## Run locally

Use Node.js 22.12+ or 24 and npm.

1. Run `npm ci`.
2. Copy `.env.example` to `.env.local` and fill in the public Firebase web configuration. Existing local configuration can be kept.
3. Run `npm run dev` and open http://localhost:3000.
4. For a production preview, run `npm run build`, then `npm start`.

## Features

- Username/password registration and login through Firebase Authentication.
- New accounts start empty; each account owns its palaces and anchors.
- Six animated 3D shapes, vivid colors, editable positions and smooth camera focus.
- Markdown notes, optional recall questions, editing, search and note export.
- Explore and Recall modes with self-rated Easy, Hard and Failed responses.
- Learning insights, account profile, mobile controls and an accessible fallback when WebGL is unavailable.
- Installable PWA with a public offline page. Internet is required for login and cloud saves.

Create a palace, choose **Add memory anchor**, write your notes, choose a shape and color, and save. Wait for **Saved to your account** before closing the app. Drag to orbit, scroll or pinch to zoom, and select an artifact to study. Recall mode hides the title until you reveal it.

Login stays active on this device when you return from the phone home screen or reopen the app. Use **Save & sign out** on shared computers. The phone/browser Back button dismisses an open panel first, then returns through your previous screens and palaces. At the first screen, Back can leave the app normally.

Limits: 50 palaces and 300 anchors per account. Palace names must be unique and at most 48 characters. Anchor coordinates use X/Z from -6 to 6 and Y from 0 to 3. Mastery is self-rated; the app does not automatically grade answers.

## Stack and structure

| Area     | Implementation                                                  |
| -------- | --------------------------------------------------------------- |
| Frontend | Next.js App Router, React 19, TypeScript                        |
| Styling  | Tailwind CSS, responsive CSS, Lucide icons, bundled local fonts |
| 3D       | Three.js, React Three Fiber, Drei, Bloom and GSAP               |
| State    | Selective Zustand subscriptions and validated workspace data    |
| Backend  | Firebase Authentication and Cloud Firestore security rules      |
| Hosting  | GitHub-connected Vercel, with static application routes         |
| Checks   | TypeScript, ESLint, Vitest and Firebase emulators               |

`src/app` contains the entry page, layout and manifest. `src/components/account` handles login and saving; `src/components/ui` contains study forms and drawers; `src/components/three` renders the palace. `src/store` owns study state. `src/lib/workspace-cloud.ts` loads and saves owner-scoped Firestore documents. `public/sw.js` supplies the offline fallback.

## Performance and privacy

The account screen defers loading the workspace, Firestore and 3D code. Forms keep drafts locally. Camera and panel changes do not serialize all notes or trigger saves. Debounced saves write only changed documents and check a revision to prevent stale tabs overwriting newer work. Workspace fields are not indexed because the app loads an owner's collection and does not query individual fields.

The 3D renderer pauses when hidden or off screen. Touch devices use a lower pixel ratio and smaller shadow maps. Large palaces limit local lights to highlighted anchors. Reflections are generated locally once; no remote 3D assets are downloaded.

Signed-in notes stay in memory and Firestore, not shared localStorage. The service worker caches only a generic offline page and clears retired model caches on upgrade. Older scan anchors are read as geometric artifacts while preserving notes, location, recall questions and review history.

## Deployment

Use Vercel's Next.js preset with `npm run build`. Keep only the public Firebase variables from `.env.example` in the app's environment. No AI provider key, Firebase Admin credential, Storage bucket access, server function or special Node option is required. The existing Firebase Storage bucket name is only a public config identifier; the app does not use Storage.

Deploy Firestore rules and index exemptions with `npm run deploy:rules`. Never deploy emulator settings to production. For optional plain Firebase Hosting, `npm run build:hosting` creates static files in `out`; then deploy hosting separately. See [FIREBASE_SETUP.md](./FIREBASE_SETUP.md).

The paid image-to-3D scan integration has been removed. Firebase Auth and Firestore remain required. Free-plan quotas still apply; removing paid AI services does not make hosting or database capacity unlimited.

## Validation

`npm run typecheck`, `npm run lint`, `npm test`, `npm run build`.
Run `npm run test:rules` with Java 21+ for account isolation, validation and conflict checks against local Firebase emulators. Test fixtures do not use the production database.
