import "server-only";
import { createHash } from "node:crypto";
import type { AiGenerationJob, VisionConcept } from "@/lib/ai-anchor";
import { assetUrl } from "@/lib/ai-anchor";
import { getAdmin } from "./firebase-admin";
import { AiError, safeAiError } from "./ai-errors";
import {
  getAiStorageMode,
  MAX_THUMBNAIL_BYTES,
  type AiStorageMode,
} from "./ai-storage-mode";
import {
  analyzeConcept,
  downloadModel,
  getMesh,
  startMesh,
} from "./ai-providers";

export interface StoredAiJob extends AiGenerationJob {
  uid: string;
  createdAt: number;
  taskId?: string;
  storageProvider?: AiStorageMode;
  thumbnailBase64?: string;
  modelSha256?: string;
  leaseUntil: number;
  nextPollAt: number;
}

export const jobRef = (uid: string, id: string) =>
  getAdmin().db.doc(`users/${uid}/ai-jobs/${id}`);
export const assetPath = (uid: string, id: string, file: string) =>
  `users/${uid}/ai-anchors/${id}/${file}`;

export function publicJob(job: StoredAiJob): AiGenerationJob {
  const {
    id,
    roomId,
    status,
    analysisComplete,
    meshComplete,
    progress,
    concept,
    modelUrl,
    thumbnailUrl,
    error,
  } = job;
  return {
    id,
    roomId,
    status,
    analysisComplete,
    meshComplete,
    progress,
    ...(concept ? { concept } : {}),
    ...(modelUrl ? { modelUrl } : {}),
    ...(thumbnailUrl ? { thumbnailUrl } : {}),
    ...(job.storageProvider === "provider"
      ? { modelHosting: "provider" as const }
      : {}),
    ...(error ? { error } : {}),
  };
}

export async function createGeneration(
  uid: string,
  id: string,
  roomId: string,
) {
  const storageProvider = getAiStorageMode();
  const { db } = getAdmin();
  const ref = jobRef(uid, id);
  const day = new Date().toISOString().slice(0, 10);
  const userQuota = db.doc(`users/${uid}/ai-usage/${day}`);
  const globalQuota = db.doc(`ai-usage/${day}`);
  const roomRef = db.doc(`users/${uid}/workspace/room_${roomId}`);
  const pointer = db.doc(`users/${uid}/ai-room-jobs/${roomId}`);
  const perUser = Math.max(
    0,
    Math.min(20, Number(process.env.AI_DAILY_USER_LIMIT || 3)),
  );
  const globalLimit = Math.max(
    0,
    Math.min(1000, Number(process.env.AI_DAILY_GLOBAL_LIMIT || 50)),
  );
  return db.runTransaction(async (transaction) => {
    const existing = await transaction.get(ref);
    if (existing.exists) {
      const job = existing.data() as StoredAiJob;
      if (job.roomId !== roomId)
        throw new AiError(
          "INVALID_JOB",
          "This scan belongs to another palace.",
          409,
        );
      return { created: false, job };
    }
    const [room, user, global] = await Promise.all([
      transaction.get(roomRef),
      transaction.get(userQuota),
      transaction.get(globalQuota),
    ]);
    if (!room.exists)
      throw new AiError(
        "ROOM_NOT_SAVED",
        "Save or create your memory palace before starting a scan.",
        409,
      );
    const count = Number(user.data()?.count || 0),
      globalCount = Number(global.data()?.count || 0);
    if (
      !Number.isFinite(perUser) ||
      !Number.isFinite(globalLimit) ||
      count >= perUser ||
      globalCount >= globalLimit
    )
      throw new AiError(
        "DAILY_LIMIT",
        "Today's AI scan limit has been reached. You can still create manual anchors.",
        429,
      );
    const now = Date.now();
    if (now - Number(user.data()?.lastStartedAt || 0) < 15000)
      throw new AiError(
        "TOO_FAST",
        "Wait a few seconds before starting another scan.",
        429,
      );
    const job: StoredAiJob = {
      uid,
      id,
      roomId,
      createdAt: now,
      status: "preparing",
      analysisComplete: false,
      meshComplete: false,
      progress: 0,
      leaseUntil: 0,
      nextPollAt: 0,
      storageProvider,
    };
    transaction.set(ref, job);
    transaction.set(userQuota, { count: count + 1, lastStartedAt: now });
    transaction.set(globalQuota, { count: globalCount + 1 });
    transaction.set(pointer, { jobId: id });
    return { created: true, job };
  });
}

export async function readGeneration(
  uid: string,
  id: string,
): Promise<StoredAiJob> {
  const snapshot = await jobRef(uid, id).get();
  if (!snapshot.exists)
    throw new AiError(
      "SCAN_NOT_FOUND",
      "This scan could not be found in your account.",
      404,
    );
  return snapshot.data() as StoredAiJob;
}

async function failJob(uid: string, id: string, error: unknown) {
  const safe = safeAiError(error);
  await jobRef(uid, id).update({
    status: "failed",
    error: safe.message,
    leaseUntil: 0,
  });
}

export async function prepareGeneration(
  uid: string,
  id: string,
  image: Buffer,
  thumbnail: Buffer,
) {
  const ref = jobRef(uid, id);
  try {
    const job = await readGeneration(uid, id);
    if (job.storageProvider === "provider") {
      // A bounded thumbnail fits safely below Firestore's document size limit.
      if (thumbnail.length > MAX_THUMBNAIL_BYTES)
        throw new AiError(
          "THUMBNAIL_TOO_LARGE",
          "The image preview is too large. Crop to one object and retry.",
          413,
        );
      await ref.update({ thumbnailBase64: thumbnail.toString("base64") });
    } else {
      await getAdmin()
        .bucket.file(assetPath(uid, id, "thumbnail.webp"))
        .save(thumbnail, {
          resumable: false,
          metadata: {
            contentType: "image/webp",
            cacheControl: "private, max-age=86400",
          },
        });
    }
    // Both requests start together; each independently records real progress.
    const results = await Promise.allSettled([
      analyzeConcept(image).then(async (concept: VisionConcept) => {
        await ref.update({ concept, analysisComplete: true });
      }),
      startMesh(image).then(async (taskId) => {
        await ref.update({ taskId });
      }),
    ]);
    const failed = results.find((result) => result.status === "rejected");
    if (failed?.status === "rejected") throw failed.reason;
    await ref.update({ status: "generating" });
  } catch (error) {
    await failJob(uid, id, error).catch(() => {});
  }
}

/** A Firestore lease stops concurrent tabs from repeatedly polling/downloading one model. */
export async function claimGenerationPoll(uid: string, id: string) {
  const { db } = getAdmin();
  const ref = jobRef(uid, id);
  return db.runTransaction(async (transaction) => {
    const snapshot = await transaction.get(ref);
    if (!snapshot.exists) return false;
    const job = snapshot.data() as StoredAiJob;
    const now = Date.now();
    if (
      job.status === "ready" ||
      job.status === "failed" ||
      job.leaseUntil > now ||
      job.nextPollAt > now
    )
      return false;
    if (
      (job.status === "preparing" && now - job.createdAt > 180000) ||
      now - job.createdAt > 20 * 60 * 1000
    ) {
      transaction.update(ref, {
        status: "failed",
        error:
          "This scan timed out. Start a new scan when the AI service is available.",
      });
      return false;
    }
    if (job.status === "preparing") return false;
    transaction.update(ref, {
      leaseUntil: now + 90000,
      nextPollAt: now + 5000,
    });
    return true;
  });
}

export async function advanceGeneration(uid: string, id: string) {
  const ref = jobRef(uid, id);
  try {
    const job = await readGeneration(uid, id);
    if (!job.taskId)
      throw new AiError(
        "INVALID_TASK",
        "The scan could not start a 3D task.",
        502,
      );
    const mesh = await getMesh(job.taskId);
    if (
      ["failed", "cancelled", "banned", "expired", "unknown"].includes(
        mesh.status,
      )
    )
      throw new AiError(
        "MESH_FAILED",
        "The 3D service could not turn this image into a model. Try a clear photo of one object.",
        502,
      );
    if (mesh.status !== "success") {
      await ref.update({ progress: mesh.progress, leaseUntil: 0 });
      return;
    }
    if (!job.analysisComplete || !job.concept)
      throw new AiError(
        "VISION_FAILED",
        "The study notes could not be finalized.",
        502,
      );
    await ref.update({
      status: "finalizing",
      meshComplete: true,
      progress: 100,
    });
    const bytes = await downloadModel(mesh.modelUrl);
    if (job.storageProvider === "provider") {
      await ref.update({
        modelSha256: createHash("sha256").update(bytes).digest("hex"),
      });
    } else {
      await getAdmin()
        .bucket.file(assetPath(uid, id, "model.glb"))
        .save(bytes, {
          resumable: false,
          metadata: {
            contentType: "model/gltf-binary",
            cacheControl: "private, max-age=86400",
          },
        });
    }
    await ref.update({
      status: "ready",
      modelUrl: assetUrl(uid, id, "model.glb"),
      thumbnailUrl: assetUrl(uid, id, "thumbnail.webp"),
      leaseUntil: 0,
    });
  } catch (error) {
    // Network outages are retryable without purchasing a second mesh generation.
    if (
      (error instanceof AiError && error.code === "MESH_RETRYABLE") ||
      error instanceof TypeError ||
      (error instanceof Error &&
        ["AbortError", "TimeoutError"].includes(error.name))
    )
      await ref
        .update({ leaseUntil: 0, nextPollAt: Date.now() + 15000 })
        .catch(() => {});
    else await failJob(uid, id, error).catch(() => {});
  }
}
