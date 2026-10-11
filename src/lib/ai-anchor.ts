export const MAX_SCAN_BYTES = 3 * 1024 * 1024;
export const SCAN_MIME_TYPES = ["image/jpeg", "image/png", "image/webp"];
export const JOB_ID_PATTERN = /^[a-f0-9-]{36}$/i;
export const ASSET_URL_PATTERN =
  /^\/api\/anchors\/assets\/[a-zA-Z0-9_-]{1,128}\/[a-f0-9-]{36}\/(model\.glb|thumbnail\.webp)$/i;

export interface VisionConcept {
  conceptTitle: string;
  category: string;
  studyNotes: string;
  recallPrompt: string;
}

export interface AiGenerationJob {
  id: string;
  roomId: string;
  status: "preparing" | "generating" | "finalizing" | "ready" | "failed";
  analysisComplete: boolean;
  meshComplete: boolean;
  progress: number;
  concept?: VisionConcept;
  modelUrl?: string;
  thumbnailUrl?: string;
  modelHosting?: "provider";
  error?: string;
}

export function parseVisionConcept(value: unknown): VisionConcept {
  if (!value || typeof value !== "object" || Array.isArray(value))
    throw new Error("The visual analysis did not return a study concept.");
  const data = value as Record<string, unknown>;
  const fields = {
    conceptTitle: 80,
    category: 50,
    studyNotes: 10000,
    recallPrompt: 500,
  };
  for (const [key, max] of Object.entries(fields)) {
    if (
      typeof data[key] !== "string" ||
      !data[key].trim() ||
      data[key].length > max
    )
      throw new Error(
        "The visual analysis returned incomplete or oversized study material.",
      );
  }
  return {
    conceptTitle: (data.conceptTitle as string).trim(),
    category: (data.category as string).trim(),
    studyNotes: (data.studyNotes as string).trim(),
    recallPrompt: (data.recallPrompt as string).trim(),
  };
}

export function assetUrl(
  uid: string,
  jobId: string,
  file: "model.glb" | "thumbnail.webp",
) {
  return `/api/anchors/assets/${encodeURIComponent(uid)}/${jobId}/${file}`;
}
