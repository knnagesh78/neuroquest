# NeuroQuest

A 3D spatial memory palace for education. Place an idea inside a distinctive artifact, explore its location, then practice remembering it before revealing the note.

NeuroQuest starts with three furnished palaces: Computer Science, Human Anatomy, and World History. Create additional subject palaces from the sidebar, each with its own name, description, color, icon, and memory anchors. The interface pairs a quiet workspace with an illuminated architectural vault, floating artifacts, a spatial map, and a glass study drawer.

## Run locally

Requirements: **Node.js 20.9 or newer**, npm, and a modern browser. A WebGL-capable browser with hardware acceleration provides the 3D experience; the app also has a usable study fallback when 3D is unavailable.

1. Open a terminal in this project folder.
2. Install the locked dependencies:

   ```sh
   npm ci
   ```

3. Start the development server:

   ```sh
   npm run dev
   ```

4. Open [localhost:3000](http://localhost:3000).

The supplied Firebase web project is configured. Enable Firebase Authentication and Firestore and publish the included security rules before registering real accounts. Follow [FIREBASE_SETUP.md](./FIREBASE_SETUP.md) for setup, local emulator tests, and HTTPS deployment. Fonts are bundled locally; no build-time Google Fonts request is needed.

To create and serve a production build:

```sh
npm run build
npm start
```

Run these commands in order; `npm start` serves an existing production build. If port 3000 is in use, use `npm run dev -- --port 3001` and open [localhost:3001](http://localhost:3001).

## Explore and study

First sign in or create an account with a username and password. To add a subject, select **Create palace** under **Your palaces** (open navigation first on mobile). Enter a name, optionally add a description, choose an icon and color, then select **Create palace**. The new empty room opens immediately; select **Add memory anchor** to add your first concept. Palaces and notes save privately to your account. Wait for **Saved to your account** before closing the app. Names must be unique, with a limit of 48 characters and 50 total palaces per account.

| Action                      | Control                                                             |
| --------------------------- | ------------------------------------------------------------------- |
| Orbit the palace            | Drag with a mouse or swipe with one finger                          |
| Zoom                        | Scroll or pinch with two fingers                                    |
| Focus an anchor             | Select its artifact, floating label, list item, or map dot          |
| Return to the room view     | Select the reset-camera button                                      |
| Read notes                  | Select an anchor in Explore mode                                    |
| Add a concept               | Select **Add memory anchor** or **Place a new memory**              |
| Edit or remove a concept    | Open its drawer in Explore mode; deletion asks for confirmation     |
| Search all palaces          | Select search, or press **Ctrl+K / Cmd+K** with study panels closed |
| Close a panel               | Press **Escape** or use its close button                            |
| Change palace               | Select a room in the sidebar                                        |
| Adjust atmosphere or export | Open workspace settings or scene settings                           |

New anchors support Markdown study material, a category, six artifact shapes, six colors, and editable coordinates. The form suggests an unoccupied position. X and Z must be between -6 and 6, and Y between 0 and 3. The store limits the collection to 300 anchors. Markdown renders headings, lists, tables, links, and fenced code blocks; raw HTML execution is not enabled.

### Recall challenge

1. Switch to **Recall challenge**. Lighting dims, titles are hidden, and scene labels become `???`. Search results are unavailable during the challenge.
2. Select an artifact and recall the concept associated with its location.
3. Select **Reveal concept**, compare it with your answer, and rate yourself **Easy**, **Hard**, or **Failed**.
4. Continue with **Next anchor** until the room is complete. Return to Explore or start another challenge.

**Easy** marks an anchor mastered. **Hard** and **Failed** mark it learning. Each rating increments its review count and records its latest review time. An anchor can be rated once per recall session. Changing rooms or modes clears the current session; saved mastery and review counts remain.

Mastery is self-reported, not an automatically graded score or a spaced-repetition schedule. Initial examples include demonstration mastery states; their review counts start at zero. Learning insights show current totals and room progress.

## Stack

| Area        | Implementation                                                                 |
| ----------- | ------------------------------------------------------------------------------ |
| Application | Next.js 16 App Router, React 19, TypeScript                                    |
| Styling     | Tailwind CSS 4, custom responsive CSS, Lucide icons                            |
| 3D          | Three.js, React Three Fiber 9, Drei                                            |
| Effects     | React Three Postprocessing: Bloom, Vignette, ChromaticAberration               |
| Motion      | GSAP camera transitions, frame-based artifact animation, CSS panel transitions |
| State       | Zustand 5, account isolation and validated cloud persistence                   |
| Backend     | Firebase Authentication and Cloud Firestore with per-user security rules       |
| Install     | PWA manifest, install wizard, icons and public offline fallback                |
| Notes       | React Markdown and remark-gfm                                                  |
| Fonts       | Locally bundled DM Sans and Space Grotesk                                      |
| Checks      | ESLint 9, TypeScript, Vitest 4, Prettier 3                                     |

Exact dependencies and scripts are in `package.json`; reproducible resolutions are in `package-lock.json`.

## Project structure

```text
neuroquest/
├── src/
│   ├── app/
│   │   ├── layout.tsx              # Metadata, local fonts, global styles
│   │   ├── page.tsx                # App Router entry point
│   │   ├── globals.css             # Workspace, scene HUD, responsive styling
│   │   └── icon.svg
│   ├── components/
│   │   ├── NeuroQuest.tsx          # Workspace, map, insights, search, settings
│   │   ├── three/
│   │   │   ├── Scene.tsx           # Canvas, architecture, lights, fallback
│   │   │   ├── CameraController.tsx
│   │   │   ├── MemoryAnchor.tsx
│   │   │   └── PostProcessing.tsx
│   │   └── ui/
│   │       ├── Navigation.tsx
│   │       ├── ModeSwitcher.tsx
│   │       ├── AnchorDrawer.tsx    # Markdown, editing, recall, ratings
│   │       ├── AddAnchorModal.tsx
│   │       ├── AddRoomModal.tsx
│   │       ├── RoomIcon.tsx
│   │       ├── Dialog.tsx         # Focus containment, restoration, exit motion
│   │       └── study-panels.css
│   ├── lib/
│   │   ├── data.ts                # Rooms and example study material
│   │   └── types.ts               # Domain types
│   └── store/
│       └── usePalaceStore.ts       # Shared state, actions, validation, storage
├── tests/
│   └── store.test.ts
├── AGENTS.md                      # Installed Next.js documentation guidance
├── CLAUDE.md
├── package.json
├── package-lock.json
├── next.config.ts
├── next-env.d.ts
├── postcss.config.mjs
├── eslint.config.mjs
├── tsconfig.json
├── vitest.config.ts
└── README.md
```

### Architecture

`AccountGate` initializes Firebase in the browser, observes the login session, and loads the signed-in UID's workspace before mounting `NeuroQuest`. The workspace dynamically imports `Scene` with server rendering disabled. Forms keep unsaved inputs in component state. Selective Zustand subscriptions keep form inputs and cloud-status changes from rebuilding the scene.

`usePalaceStore` owns anchors, room and mode selection, camera targets, recall ratings, and display preferences. Its actions validate additions and edits, reject cross-room selections, and clear stale focus and session state after changes. `createPalaceStore` accepts a storage adapter for isolated tests.

`Scene` constructs procedural architecture and lighting. Recall mode lowers ambient, hemisphere, and directional light intensity. `MemoryAnchor` renders six geometric artifact types on illuminated pedestals, animates hover and rotation through `useFrame`, and provides pointer and keyboard-accessible labels. React Three Fiber manages disposal of declarative geometry and material resources when they unmount.

`CameraController` uses a 1.35-second GSAP `power3.out` tween to interpolate camera position and orbit target outside React state. Tweens are killed when an orbit starts, a target or reset replaces them, or the effect unmounts. Reduced-motion and initial framing apply immediately. OrbitControls keeps damping, bounded zoom, and polar-angle limits of 24–78 degrees. Panning is disabled to keep navigation within the room. Framing adapts to the canvas aspect ratio.

`PostProcessing` supplies Bloom with `luminanceThreshold={0.6}` and `intensity={1.2}`, plus a vignette and subtle chromatic aberration. It can be disabled in settings. Rendering caps pixel ratio at 1.5 on fine-pointer devices and 1.25 on coarse-pointer devices, uses 1024px shadow maps, and disables multisampling for the effect composer.

The HUD exposes scene controls, progress, room navigation, and a map. Decorative overlay containers allow pointer events through to the canvas; interactive controls receive input. The study drawer and add form use a shared portaled dialog with keyboard focus containment, focus restoration, scroll locking, Escape handling, and entry/exit transitions.

## Persistence and data boundaries

Data is saved to **Cloud Firestore** under `users/{uid}/workspace`, with separate documents for anchors and rooms. `workspace-cloud.ts` validates loaded state and performs atomic, revision-checked saves. `SaveQueue` debounces and serializes updates; only changed documents are written. A stale browser session cannot silently overwrite newer data. Saved work loads on login or refresh; this is not live collaborative editing.

Persisted fields include rooms, anchors, retention status, review counts and timestamps, active room, study mode, sound and effects preferences. Individual historical ratings are not stored. Panels, selection, camera and in-progress recall-session ratings are transient and cleared on account changes. Unsaved edits remain in the open tab after save failures; the UI offers retry and export and requests an unload warning when supported.

Firebase Auth handles usernames through deterministic internal email aliases and manages passwords. Students provide only a username and password. Username-only accounts cannot receive password-reset emails. The account panel supports **Save & sign out**, exporting notes, installation, and an explicit import of older anonymous device notes. Old `neuroquest-palace` localStorage data is preserved. Signed-in notes are never written to that shared key or a persistent Firestore cache.

**Install NeuroQuest** opens the PWA guide. Supported browsers install the published HTTPS site; Safari users get home-screen instructions. A connection is required for login and cloud notes. The production-only service worker caches a generic offline page, never private content. See [FIREBASE_SETUP.md](./FIREBASE_SETUP.md) for deployment and platform details.

New account/install files include `src/components/account/`, `src/components/pwa/InstallWizard.tsx`, `src/app/manifest.ts`, `src/lib/firebase.ts`, `src/lib/account.ts`, `src/lib/workspace-cloud.ts`, `src/lib/save-queue.ts`, `src/store/useAccountStore.ts`, `public/sw.js`, `public/offline.html`, `public/icons/`, `firestore.rules`, `storage.rules`, `firebase.json`, and `.env.example`.

## Mobile, motion, and fallback behavior

- Responsive navigation, panels, and camera framing support smaller screens. Use one finger to orbit and two to zoom.
- With `prefers-reduced-motion: reduce`, idle floating/rotation stop and camera focus jumps directly to its destination; CSS motion is reduced.
- If WebGL initialization fails or the context is lost, an HTML anchor grid keeps exploration and recall available. **Retry 3D view** recreates the scene.
- Keyboard users can select anchors through the list, map, and scene labels. All study operations remain available outside canvas gestures.
- Ambient audio is generated locally and starts only when enabled; browsers may require an additional interaction before playback. Its audio resources are closed when disabled or unmounted.

## Verification

```sh
npm run format:check
npm run lint
npm run typecheck
npm test
npm run build
```

Run `npm run format` to apply Prettier formatting to the source, tests, configuration files, and this README.

Unit tests cover study operations, validation, legacy persistence, usernames, account cleanup, document changes, serialized saves and retries. `npm run test:rules` adds isolated Firebase emulator checks for registration, login, per-user access rules and concurrent-save protection. See the setup guide for Java requirements. These tests do not substitute for browser or graphics checks.

Use this manual smoke-test matrix when changing the interface or scene:

| Area              | Expected result                                                                                      |
| ----------------- | ---------------------------------------------------------------------------------------------------- |
| Explore           | Drag and zoom remain bounded; selecting an artifact focuses it and opens its Markdown note           |
| Add/edit/remove   | Custom content appears, edits are retained, and confirmed removal clears the anchor                  |
| Recall            | Titles stay hidden until reveal; one rating per anchor updates progress and mastery                  |
| Room switching    | Each room shows its own anchors and clears the previous room's selection                             |
| Refresh           | Notes, mastery, room, and preferences survive; open dialogs and recall-session progress reset        |
| Keyboard          | Tab reaches controls, Escape closes panels, focus returns after closing, and Ctrl/Cmd+K opens search |
| Small screen      | Navigation remains usable, dialogs fit, and the room stays framed                                    |
| Reduced motion    | Idle artifact movement stops and camera transitions are immediate                                    |
| Graphics fallback | An unavailable or lost WebGL context displays study controls and a retry action                      |
| Settings/export   | Effects toggle works; JSON export contains the current notes and progress                            |

For further development, follow the installed Next.js guides under `node_modules/next/dist/docs/` as directed by `AGENTS.md`. Official references: [Next.js App Router](https://nextjs.org/docs/app), [React Three Fiber](https://r3f.docs.pmnd.rs/getting-started/introduction), and [Zustand persistence](https://zustand.docs.pmnd.rs/integrations/persisting-store-data).
