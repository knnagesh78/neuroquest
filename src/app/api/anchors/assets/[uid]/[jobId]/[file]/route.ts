import { Readable } from "node:stream";
import { createHash } from "node:crypto";
import { JOB_ID_PATTERN } from "@/lib/ai-anchor";
import { AiError, aiErrorResponse } from "@/lib/server/ai-errors";
import { requireAiUser } from "@/lib/server/firebase-admin";
import { assetPath, readGeneration } from "@/lib/server/ai-jobs";
import { downloadModel, getMesh } from "@/lib/server/ai-providers";
import { MAX_THUMBNAIL_BYTES } from "@/lib/server/ai-storage-mode";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 120;

function assetResponse(
  stream: Readable,
  uid: string,
  file: string,
  signal: AbortSignal,
) {
  const abort = () => stream.destroy();
  if (signal.aborted) abort();
  else signal.addEventListener("abort", abort, { once: true });
  stream.once("close", () => signal.removeEventListener("abort", abort));
  return new Response(Readable.toWeb(stream) as ReadableStream, {
    headers: {
      "Content-Type": file === "model.glb" ? "model/gltf-binary" : "image/webp",
      "Cache-Control": "private, max-age=86400",
      Vary: "Authorization",
      "X-NeuroQuest-Owner": uid,
      "X-Content-Type-Options": "nosniff",
    },
  });
}

function bufferStream(bytes: Buffer) {
  // Yield small chunks so large models use streaming serverless responses.
  return Readable.from(
    (function* () {
      for (let offset = 0; offset < bytes.length; offset += 65536)
        yield bytes.subarray(offset, offset + 65536);
    })(),
  );
}

export async function GET(
  request: Request,
  context: { params: Promise<{ uid: string; jobId: string; file: string }> },
) {
  try {
    const user = await requireAiUser(request);
    const { uid, jobId, file } = await context.params;
    if (
      uid !== user.uid ||
      !JOB_ID_PATTERN.test(jobId) ||
      !["model.glb", "thumbnail.webp"].includes(file)
    )
      throw new AiError(
        "ASSET_NOT_FOUND",
        "This model is not available in your account.",
        404,
      );
    const job = await readGeneration(uid, jobId);
    if (job.status !== "ready")
      throw new AiError(
        "MODEL_NOT_READY",
        "Your 3D model is still being prepared.",
        409,
      );
    if (job.storageProvider === "provider") {
      if (file === "thumbnail.webp") {
        const encoded = job.thumbnailBase64 || "";
        if (
          !encoded ||
          encoded.length > Math.ceil(MAX_THUMBNAIL_BYTES / 3) * 4 ||
          !/^[A-Za-z0-9+/]*={0,2}$/.test(encoded)
        )
          throw new AiError(
            "ASSET_NOT_FOUND",
            "This image preview could not be found.",
            404,
          );
        const bytes = Buffer.from(encoded, "base64");
        if (
          bytes.length > MAX_THUMBNAIL_BYTES ||
          bytes.toString("ascii", 0, 4) !== "RIFF" ||
          bytes.toString("ascii", 8, 12) !== "WEBP"
        )
          throw new AiError(
            "ASSET_NOT_FOUND",
            "This image preview could not be found.",
            404,
          );
        return assetResponse(bufferStream(bytes), uid, file, request.signal);
      }
      if (!job.taskId || !job.modelSha256)
        throw new AiError(
          "MODEL_UNAVAILABLE",
          "This model is unavailable. Its study notes are still available.",
          502,
        );
      // Query the original task to refresh its short-lived download link, without
      // purchasing a new generation or exposing the provider URL to the client.
      const mesh = await getMesh(job.taskId);
      if (mesh.status !== "success" || !mesh.modelUrl)
        throw new AiError(
          "MODEL_UNAVAILABLE",
          "Tripo no longer has this model available. Its study notes are still available.",
          502,
        );
      const bytes = await downloadModel(mesh.modelUrl, request.signal);
      if (createHash("sha256").update(bytes).digest("hex") !== job.modelSha256)
        throw new AiError(
          "MODEL_CHANGED",
          "This model could not be verified. Its study notes are still available.",
          502,
        );
      return assetResponse(bufferStream(bytes), uid, file, request.signal);
    }
    const object = user.bucket.file(assetPath(uid, jobId, file));
    const [exists] = await object.exists();
    if (!exists)
      throw new AiError(
        "ASSET_NOT_FOUND",
        "This model could not be found. Its study notes are still available.",
        404,
      );
    const stream = object.createReadStream();
    // Stream large GLBs instead of exceeding the serverless buffered-response limit.
    return assetResponse(stream, uid, file, request.signal);
  } catch (error) {
    return aiErrorResponse(error);
  }
}
