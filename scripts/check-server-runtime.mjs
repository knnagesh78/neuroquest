// Load the real runtime dependencies, without credentials or cloud operations.
try {
  await Promise.all([
    import("firebase-admin/auth"),
    import("firebase-admin/firestore"),
    import("firebase-admin/storage"),
    import("@google/genai"),
    import("sharp"),
  ]);
  console.log("Firebase and AI server modules loaded successfully.");
} catch {
  console.error(
    "Server modules could not load. Use Node 22.12+ or 24 and enable require-module support as described in AI_3D_SETUP.md.",
  );
  process.exitCode = 1;
}
