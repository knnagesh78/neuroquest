# NeuroQuest accounts, cloud saves and installation

The code is connected to the supplied **neuroquest-c0cf0** Firebase web project. The public web configuration does not grant administrative access. Authentication and Firestore must be enabled and the security rules deployed before real users can register and save notes.

## 1. Enable accounts

1. Open [Firebase Console](https://console.firebase.google.com/project/neuroquest-c0cf0/overview) using the project owner's Google account.
2. Select **Build → Authentication → Get started → Sign-in method**.
3. Enable **Email/Password**. Leave email-link sign-in disabled. The included `firebase.json` also declares this provider for `firebase deploy --only auth`; this still requires a project administrator to log into the Firebase CLI first.
4. Under Authentication settings, set the password policy to **Require**, with a minimum length of **8**. Consider requiring uppercase, lowercase, numbers and symbols. The interface also handles Firebase's stronger-password errors.
5. Add the deployed website's domain to **Authorized domains**. Add `localhost` when testing locally, if it is not already present.

Students see only **Username** and **Password**, with a separate **Create account** option. Usernames are case-insensitive, 3–24 ASCII letters, numbers or underscores, beginning with a letter or number. Internally `student_one` maps to `student_one@users.neuroquest.invalid`, because Firebase's built-in password provider requires an email-shaped identifier. This address is not an inbox, is never displayed in the login form, and is not used for email.

**Recovery limitation:** username-only accounts cannot receive password-reset or verification emails. Users must retain their password. Do not enable mandatory email verification for these accounts. An administrator-assisted recovery process needs a separate way to verify ownership before resetting an account; no insecure recovery bypass is included. Passwords are handled by the Firebase Auth SDK and never written to Firestore, exports, logs, or application state outside the sign-in form.

The login lasts for the current browser tab session. Closing the tab normally ends it; signing out explicitly is best on shared college computers. No “remember me” option is enabled.

## 2. Create the cloud database

1. Select **Build → Firestore Database → Create database**.
2. Use the **Standard edition**, database ID **`(default)`**, in **production mode**.
3. Choose a location suitable for your college before creation; this is a project-owner decision because the database location is not freely changeable later.
4. Publish the complete contents of [firestore.rules](./firestore.rules) in the **Rules** tab, or deploy using the commands below. Do not use public test-mode rules.

Data is organized as:

```text
users/{firebase-auth-uid}/workspace/
  meta                  # schema version + optimistic concurrency revision
  preferences           # active room, mode, sound and effects preferences
  room_{room-id}        # one document per palace
  anchor_{anchor-id}    # one document per note, including recall progress
```

Rules allow reads and writes only when the signed-in UID matches the owner path. They validate supported fields, lengths, shapes, colors, coordinate bounds and review counts. Each write must advance the workspace revision atomically. Other database paths are denied. A stale device cannot overwrite a newer save: the app offers a download of current notes and a deliberate reload of the cloud version.

Notes use **Cloud Firestore**, not file/object storage. The supplied Firebase Storage bucket is initialized for future extensions, but this release has no attachments or upload control. `storage.rules` denies all file access; deploy it only to a bucket dedicated to this app, after reviewing any existing files and integrations. Cloud Storage may require a billing-plan upgrade; do not enable billing just to use text anchors in Firestore. Consult [Firebase's current Storage requirements](https://firebase.google.com/docs/storage/faqs-storage-changes-announced-sept-2024).

## 3. Run locally

Requirements: Node.js 20.9+ for Next.js; the installed Firebase CLI may require a newer supported Node release. Node 24 is used for this project’s checks.

```sh
npm ci
npm run dev
```

Open [localhost:3000](http://localhost:3000). Choose **Create account**, enter a username and password, and create a palace or anchor. Wait for **Saved to your account** before closing the page. To switch users, open the avatar at the top right and choose **Save & sign out**.

The supplied public configuration is already included. For another project, copy `.env.example` to `.env.local`, fill in the `NEXT_PUBLIC_FIREBASE_*` values, and restart the server. Never put a service-account JSON key or admin credential into a `NEXT_PUBLIC_` variable.

The older anonymous `neuroquest-palace` browser backup is not overwritten or silently uploaded. A signed-in user can open the account panel, inspect/download the old backup, and choose **Import my device notes**. This adds copies, keeps the old backup, and enforces the existing workspace limits. On a shared device, import only notes you own.

## 4. Publish an installable website

Firebase Hosting serves the static Next.js export over HTTPS. This app uses the Firebase client SDK and does not require a paid Node server or Cloud Function for its current features.

From a terminal authenticated as the Firebase project owner:

```sh
npx firebase login
npm run build:hosting
npx firebase deploy --only auth,hosting,firestore --project neuroquest-c0cf0
```

Or use `npm run deploy` after logging in. Review the rules first if this Firebase project already serves another app: deploying this rules file denies unrelated Firestore paths. The Hosting URL is printed by Firebase after a successful deployment. Add that domain to Authentication's authorized domains if needed.

For local production preview, use `npm run build` followed by `npm start`. A Hosting build writes `out/`; a normal build prepares the Next.js server. Use the matching command for your hosting approach. `build:hosting` refuses an emulator-enabled environment, and no live deployment was performed automatically.

Students open the published HTTPS address and select **Install NeuroQuest** from the sign-in screen, sidebar, or account panel:

- Chrome/Edge: the wizard uses the browser's native install prompt when available, otherwise explains its menu option.
- iPhone/iPad: open in Safari, choose Share → Add to Home Screen → Add. Enable “Open as Web App” if offered.
- Other browsers: the wizard explains the fallback; support depends on the browser and device. Embedded previews may not offer installation.

The manifest includes regular and maskable icons, a home-screen name and standalone display mode. The service worker is registered **only in production** and caches just a generic offline page. It never caches private notes, Firebase responses or account HTML. An internet connection is required to sign in and load or save cloud data. This is an installable online app, not a full offline study database.

## 5. Test without touching production

Unit and state tests:

```sh
npm test
npm run lint
npm run typecheck
```

Security and Auth tests use an isolated `demo-neuroquest` emulator project:

```sh
npm run test:rules
```

The Firestore emulator needs Java 21+ on PATH. If Android Studio is installed on Windows, its bundled runtime may be used for the current terminal:

```powershell
$env:JAVA_HOME = 'C:\Program Files\Android\Android Studio\jbr'
$env:PATH = "$env:JAVA_HOME\bin;$env:PATH"
npm run test:rules
```

To use the app against emulators, start `npm run emulators`, set `NEXT_PUBLIC_USE_FIREBASE_EMULATORS=true` and `NEXT_PUBLIC_FIREBASE_PROJECT_ID=demo-neuroquest` in your development environment, then restart Next.js. Use a separate browser tab/origin from the real app. Emulator data is disposable and never sent to the live project. Remove these overrides before a live build. These tests exercise username registration/login, private reads/writes, cross-user denial, invalid data rejection, note deletion, empty workspaces, and concurrent-save protection.

## Storage and synchronization behavior

- The interface retains its current limits: **300 anchors and 50 palaces per account**, and **10,000 characters per note in the editor**. The schema accepts up to 30,000 characters for compatibility with older notes. These are app limits, not a promise of unlimited free Firebase storage.
- Each note is a separate Firestore document; all notes are not squeezed into one document. Firebase plan quotas and costs still apply.
- Save operations are debounced, serialized, and acknowledged before the UI reports success. On failure, the unsaved work stays in memory, a clear banner appears, and the user can retry or export it. Closing or refreshing before saving can lose unsaved work; the page requests the browser’s unload warning when possible.
- A second device loads the latest saved workspace on sign-in or refresh. Concurrent edits trigger an explicit conflict; there is no automatic merge or live collaboration.
- Signed-in notes are not copied to shared localStorage or a persistent Firestore cache. Account transitions clear transient study state. Firebase session credentials are managed by its SDK in browser session storage; access rules still protect the cloud.
- Analytics tracking is not enabled by default.

References: [Firebase password authentication](https://firebase.google.com/docs/auth/web/password-auth), [Firestore rules](https://firebase.google.com/docs/firestore/security/rules-conditions), [Firebase Emulator Suite](https://firebase.google.com/docs/emulator-suite), and the installed Next.js PWA guide under `node_modules/next/dist/docs/01-app/02-guides/progressive-web-apps.md`.
