import { Readable } from "node:stream";
import { JOB_ID_PATTERN } from "@/lib/ai-anchor";
import { AiError, aiErrorResponse } from "@/lib/server/ai-errors";
import { requireAiUser } from "@/lib/server/firebase-admin";
import { assetPath, readGeneration } from "@/lib/server/ai-jobs";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 60;

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
    const object = user.bucket.file(assetPath(uid, jobId, file));
    const [exists] = await object.exists();
    if (!exists)
      throw new AiError(
        "ASSET_NOT_FOUND",
        "This model could not be found. Its study notes are still available.",
        404,
      );
    const stream = object.createReadStream();
    request.signal.addEventListener("abort", () => stream.destroy(), {
      once: true,
    });
    // Stream large GLBs instead of exceeding the serverless buffered-response limit.
    return new Response(Readable.toWeb(stream) as ReadableStream, {
      headers: {
        "Content-Type":
          file === "model.glb" ? "model/gltf-binary" : "image/webp",
        "Cache-Control": "private, max-age=86400",
        Vary: "Authorization",
        "X-NeuroQuest-Owner": uid,
        "X-Content-Type-Options": "nosniff",
      },
    });
  } catch (error) {
    return aiErrorResponse(error);
  }
}
