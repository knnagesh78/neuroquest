import { createRequire } from "node:module";
import { spawnSync } from "node:child_process";
const require = createRequire(import.meta.url);
if (process.env.NEXT_PUBLIC_USE_FIREBASE_EMULATORS === "true") {
  throw new Error(
    "Disable Firebase emulators before building a public deployment.",
  );
}
const result = spawnSync(
  process.execPath,
  [require.resolve("next/dist/bin/next"), "build"],
  {
    stdio: "inherit",
    env: { ...process.env, NEUROQUEST_STATIC_EXPORT: "true" },
  },
);
process.exit(result.status ?? 1);
