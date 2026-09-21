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

No API keys, environment variables, database setup, or accounts are required. Fonts are bundled locally through Fontsource; the app does not fetch fonts from Google at build time.

To create and serve a production build:

```sh
npm run build
npm start
```

Run these commands in order; `npm start` serves an existing production build. If port 3000 is in use, use `npm run dev -- --port 3001` and open [localhost:3001](http://localhost:3001).

## Explore and study

To add a subject, select **Create palace** under **Your palaces** (open the navigation menu first on mobile). Enter a name, optionally add a description, choose an icon and color, then select **Create palace**. The new empty room opens immediately; select **Add memory anchor** to add your first concept. Palaces and their notes survive refreshes in the same browser. Names must be unique, with a limit of 48 characters and 50 total palaces.

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
| State       | Zustand 5 with validated local persistence                                     |
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

`NeuroQuest` is the client workspace, mounted by the App Router page. It dynamically imports `Scene` with server rendering disabled so WebGL is initialized only in the browser. Forms keep unsaved inputs in component state. Components subscribe to individual Zustand values or actions so typing into a note form does not update the canvas store subscriptions.

`usePalaceStore` owns anchors, room and mode selection, camera targets, recall ratings, and display preferences. Its actions validate additions and edits, reject cross-room selections, and clear stale focus and session state after changes. `createPalaceStore` accepts a storage adapter for isolated tests.

`Scene` constructs procedural architecture and lighting. Recall mode lowers ambient, hemisphere, and directional light intensity. `MemoryAnchor` renders six geometric artifact types on illuminated pedestals, animates hover and rotation through `useFrame`, and provides pointer and keyboard-accessible labels. React Three Fiber manages disposal of declarative geometry and material resources when they unmount.

`CameraController` uses a 1.35-second GSAP `power3.out` tween to interpolate camera position and orbit target outside React state. Tweens are killed when an orbit starts, a target or reset replaces them, or the effect unmounts. Reduced-motion and initial framing apply immediately. OrbitControls keeps damping, bounded zoom, and polar-angle limits of 24–78 degrees. Panning is disabled to keep navigation within the room. Framing adapts to the canvas aspect ratio.

`PostProcessing` supplies Bloom with `luminanceThreshold={0.6}` and `intensity={1.2}`, plus a vignette and subtle chromatic aberration. It can be disabled in settings. Rendering caps pixel ratio at 1.5 on fine-pointer devices and 1.25 on coarse-pointer devices, uses 1024px shadow maps, and disables multisampling for the effect composer.

The HUD exposes scene controls, progress, room navigation, and a map. Decorative overlay containers allow pointer events through to the canvas; interactive controls receive input. The study drawer and add form use a shared portaled dialog with keyboard focus containment, focus restoration, scroll locking, Escape handling, and entry/exit transitions.

## Persistence and data boundaries

Data is saved in this browser's `localStorage` under **`neuroquest-palace`**, storage schema **version 2**. Version 1 data migrates automatically, preserving existing notes and review progress. Hydration runs after client mount. Custom rooms are validated before their anchors; validation checks names, icons, coordinates, colors, IDs, duplicates, and room references. Invalid entries are discarded; wholly invalid nonempty anchor collections fall back to the examples. Intentional empty collections and newly created empty palaces are preserved.

Persisted fields include rooms, anchors, their retention status, review counts and latest review timestamps, active room, study mode, ambient sound preference, and effects preference. Individual historical ratings are not stored. Open panels, selected anchors, camera position, and in-progress recall-session ratings are transient. Disabled or full storage does not prevent the current in-memory study session.

This version has **no backend, authentication, accounts, or cloud sync**. Data is specific to the browser and origin. Clearing site data removes saved notes. **Export all palaces** downloads a JSON snapshot of rooms, anchors, and review data; an import interface is not included.

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

The 19 store tests cover rating behavior, duplicate recall prevention, room transitions, camera resets, anchor creation/editing/deletion, coordinate bounds, persistence, migration, malformed JSON, duplicate IDs, unsafe persisted keys, custom palace creation and validation, custom-room anchors, and preservation of older data. These are state-level tests; they do not substitute for browser or graphics checks.

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
