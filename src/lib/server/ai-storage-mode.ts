import "server-only";
import { AiError } from "./ai-errors";

export type AiStorageMode = "firebase" | "provider";
export const MAX_THUMBNAIL_BYTES = 256 * 1024;

/** Explicit opt-in: an unavailable bucket never silently changes hosting. */
export function getAiStorageMode(): AiStorageMode {
  const mode = process.env.AI_MODEL_STORAGE || "firebase";
  if (mode !== "firebase" && mode !== "provider")
    throw new AiError(
      "INVALID_STORAGE_MODE",
      "AI model hosting needs configuration. Ask the project owner to check the AI setup.",
      503,
    );
  return mode;
}
