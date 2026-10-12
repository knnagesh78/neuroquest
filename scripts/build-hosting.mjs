import { spawnSync } from "node:child_process";
import { createRequire } from "node:module";
const require = createRequire(import.meta.url);
const result = spawnSync(
  process.execPath,
  [require.resolve("next/dist/bin/next"), "build"],
  {
    stdio: "inherit",
    env: { ...process.env, NEUROQUEST_STATIC_EXPORT: "true" },
  },
);
if (result.error) throw result.error;
process.exitCode = result.status ?? 1;
