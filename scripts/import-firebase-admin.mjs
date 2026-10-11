import { createPrivateKey, randomUUID } from "node:crypto";
import { execFileSync } from "node:child_process";
import { readFile, writeFile, rename, unlink, lstat } from "node:fs/promises";
import { resolve, relative, isAbsolute } from "node:path";
import { createRequire } from "node:module";

const require = createRequire(import.meta.url);
require("@next/env").loadEnvConfig(process.cwd(), true, {
  info() {},
  error() {},
});

// Import an explicitly selected administrator file. Never search for credentials
// or print their values. The source must remain outside the Git workspace.
const source = process.argv[2];
if (!source) {
  console.error(
    'Usage: npm run setup:firebase -- "C:\\path\\outside-repository\\service-account.json"',
  );
  process.exitCode = 1;
} else {
  let temporary;
  try {
    const sourcePath = resolve(source);
    const within = relative(process.cwd(), sourcePath);
    if (
      !isAbsolute(within) &&
      within !== ".." &&
      !within.startsWith("..\\") &&
      !within.startsWith("../")
    )
      throw new Error("Keep the service-account JSON outside this repository.");
    const destination = resolve(".env.local");
    try {
      execFileSync("git", ["check-ignore", "-q", "--", destination], {
        stdio: "ignore",
      });
    } catch {
      throw new Error(
        ".env.local must be ignored by Git before importing a key.",
      );
    }
    const credential = JSON.parse(await readFile(sourcePath, "utf8"));
    const project = process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID;
    if (
      !project ||
      credential.type !== "service_account" ||
      credential.project_id !== project ||
      typeof credential.client_email !== "string" ||
      !credential.client_email.endsWith(
        `@${project}.iam.gserviceaccount.com`,
      ) ||
      !/^[a-z0-9@.\-]+$/.test(credential.client_email) ||
      typeof credential.private_key !== "string"
    )
      throw new Error(
        "Select a service account from the same project as the web app.",
      );
    if (createPrivateKey(credential.private_key).asymmetricKeyType !== "rsa")
      throw new Error(
        "The service-account file does not contain a valid RSA key.",
      );
    const bucket =
      process.env.FIREBASE_STORAGE_BUCKET ||
      process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET;
    if (!bucket || !/^[a-z0-9.\-_]+$/.test(bucket))
      throw new Error(
        "Configure the Firebase Storage bucket before importing.",
      );
    let existing = "";
    try {
      if ((await lstat(destination)).isSymbolicLink())
        throw new Error(
          "Refusing to replace an environment-file symbolic link.",
        );
      existing = await readFile(destination, "utf8");
    } catch (error) {
      if (error.code !== "ENOENT") throw error;
    }
    const entries = {
      FIREBASE_PROJECT_ID: project,
      FIREBASE_STORAGE_BUCKET: bucket,
      FIREBASE_ADMIN_CLIENT_EMAIL: credential.client_email,
      FIREBASE_ADMIN_PRIVATE_KEY: credential.private_key,
    };
    const block = [
      "# BEGIN NeuroQuest Firebase server configuration",
      ...Object.entries(entries).map(
        ([key, value]) => `${key}=${JSON.stringify(value)}`,
      ),
      "# END NeuroQuest Firebase server configuration",
    ].join("\n");
    const marker =
      /# BEGIN NeuroQuest Firebase server configuration[\s\S]*?# END NeuroQuest Firebase server configuration/g;
    const updated = marker.test(existing)
      ? existing.replace(marker, () => block)
      : `${existing.trimEnd()}\n\n${block}\n`;
    temporary = `${destination}.${randomUUID()}.tmp`;
    await writeFile(temporary, updated, { flag: "wx", mode: 0o600 });
    await rename(temporary, destination);
    temporary = undefined;
    console.log("Firebase server credential imported into ignored .env.local.");
    console.log(
      "Existing browser and AI settings were preserved. Run npm run check:ai.",
    );
  } catch (error) {
    // Only controlled messages are emitted; SDK/JSON/crypto errors can contain
    // input fragments, paths or credential material.
    const safeMessages = new Set([
      "Keep the service-account JSON outside this repository.",
      ".env.local must be ignored by Git before importing a key.",
      "Select a service account from the same project as the web app.",
      "The service-account file does not contain a valid RSA key.",
      "Configure the Firebase Storage bucket before importing.",
      "Refusing to replace an environment-file symbolic link.",
    ]);
    console.error(
      safeMessages.has(error.message)
        ? error.message
        : "Import failed. Check the selected JSON file and local file permissions.",
    );
    process.exitCode = 1;
  } finally {
    if (temporary) await unlink(temporary).catch(() => {});
  }
}
