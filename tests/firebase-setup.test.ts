import { generateKeyPairSync } from "node:crypto";
import { execFileSync, spawnSync } from "node:child_process";
import {
  mkdtempSync,
  mkdirSync,
  readFileSync,
  writeFileSync,
  rmSync,
} from "node:fs";
import { tmpdir } from "node:os";
import { basename, dirname, join, resolve } from "node:path";
import { afterEach, describe, expect, it } from "vitest";

const importer = resolve("scripts/import-firebase-admin.mjs");
const fixtureRoots: string[] = [];
const privateKey = generateKeyPairSync("rsa", {
  modulusLength: 2048,
  privateKeyEncoding: { type: "pkcs8", format: "pem" },
  publicKeyEncoding: { type: "spki", format: "pem" },
}).privateKey;

function fixture(project = "demo-neuroquest") {
  const root = mkdtempSync(join(tmpdir(), "neuroquest-import-test-"));
  fixtureRoots.push(root);
  const workspace = join(root, "workspace");
  mkdirSync(workspace);
  execFileSync("git", ["init", "--quiet"], { cwd: workspace });
  writeFileSync(join(workspace, ".gitignore"), ".env*\n");
  const existing =
    "GEMINI_API_KEY=test-only-provider-value\n# Keep this comment\n";
  writeFileSync(join(workspace, ".env.local"), existing);
  const source = join(root, "test-account.json");
  writeFileSync(
    source,
    JSON.stringify({
      type: "service_account",
      project_id: project,
      client_email: `neuroquest-ai-server@${project}.iam.gserviceaccount.com`,
      private_key: privateKey,
    }),
  );
  const run = (path = source) =>
    spawnSync(process.execPath, [importer, path], {
      cwd: workspace,
      encoding: "utf8",
      env: {
        ...process.env,
        NEXT_PUBLIC_FIREBASE_PROJECT_ID: "demo-neuroquest",
        NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET:
          "demo-neuroquest.firebasestorage.app",
        FIREBASE_STORAGE_BUCKET: "demo-neuroquest.firebasestorage.app",
      },
    });
  return {
    workspace,
    source,
    existing,
    run,
    read: () => readFileSync(join(workspace, ".env.local"), "utf8"),
  };
}

afterEach(() => {
  for (const root of fixtureRoots.splice(0)) {
    const target = resolve(root);
    if (
      dirname(target) !== resolve(tmpdir()) ||
      !basename(target).startsWith("neuroquest-import-test-")
    )
      throw new Error(
        "Refusing to remove a directory outside the temporary test fixtures.",
      );
    rmSync(target, { recursive: true, force: true });
  }
});

describe("Firebase server credential import safeguards", () => {
  it("preserves existing settings, stores escaped newlines and never prints the key", () => {
    const f = fixture();
    const result = f.run();
    expect(result.status).toBe(0);
    expect(f.read()).toContain(f.existing.trimEnd());
    expect(f.read()).toContain(
      `FIREBASE_ADMIN_PRIVATE_KEY=${JSON.stringify(privateKey)}`,
    );
    expect(result.stdout + result.stderr).not.toContain("BEGIN PRIVATE KEY");
    expect(f.run().status).toBe(0);
    expect(
      f.read().match(/# BEGIN NeuroQuest Firebase server configuration/g),
    ).toHaveLength(1);
  });

  it("refuses another project's credential without changing the environment file", () => {
    const f = fixture("another-project");
    expect(f.run().status).toBe(1);
    expect(f.read()).toBe(f.existing);
  });

  it("refuses a credential source inside the Git workspace", () => {
    const f = fixture();
    const inside = join(f.workspace, "account.json");
    writeFileSync(inside, readFileSync(f.source));
    expect(f.run(inside).status).toBe(1);
    expect(f.read()).toBe(f.existing);
  });

  it("refuses to write an environment file tracked by Git", () => {
    const f = fixture();
    execFileSync("git", ["add", "--force", ".env.local"], { cwd: f.workspace });
    expect(f.run().status).toBe(1);
    expect(f.read()).toBe(f.existing);
  });
});
