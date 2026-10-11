import { after } from "next/server";
import { JOB_ID_PATTERN, MAX_SCAN_BYTES } from "@/lib/ai-anchor";
import { AiError, aiErrorResponse } from "@/lib/server/ai-errors";
import {
  requireAiStorage,
  requireAiUser,
  requireSameOrigin,
} from "@/lib/server/firebase-admin";
import {
  prepareScanImage,
  requireProviderKeys,
  requireMeshCredits,
} from "@/lib/server/ai-providers";
import {
  advanceGeneration,
  claimGenerationPoll,
  createGeneration,
  prepareGeneration,
  publicJob,
  readGeneration,
} from "@/lib/server/ai-jobs";

export const runtime = "nodejs";
export const maxDuration = 120;
export const dynamic = "force-dynamic";
const headers = { "Cache-Control": "no-store" };

async function boundedBody(request: Request) {
  const limit = (MAX_SCAN_BYTES * 4) / 3 + 20000;
  if (!request.body || Number(request.headers.get("content-length")) > limit)
    throw new AiError(
      "IMAGE_TOO_LARGE",
      "Choose an image smaller than 3 MB.",
      413,
    );
  const chunks: Uint8Array[] = [];
  let length = 0;
  const reader = request.body.getReader();
  try {
    for (;;) {
      const { done, value } = await reader.read();
      if (done) break;
      length += value.length;
      if (length > limit)
        throw new AiError(
          "IMAGE_TOO_LARGE",
          "Choose an image smaller than 3 MB.",
          413,
        );
      chunks.push(value);
    }
  } finally {
    await reader.cancel().catch(() => {});
  }
  return new Request(request.url, {
    method: "POST",
    headers: { "Content-Type": request.headers.get("content-type") || "" },
    body: Buffer.concat(chunks),
  });
}

export async function POST(request: Request) {
  try {
    requireSameOrigin(request);
    const { uid } = await requireAiUser(request);
    requireProviderKeys();
    const body = await boundedBody(request);
    let image: Buffer, mime: string, roomId: unknown, requestId: unknown;
    if (body.headers.get("content-type")?.startsWith("multipart/form-data")) {
      const form = await body.formData();
      const file = form.get("image");
      if (!(file instanceof File))
        throw new AiError("INVALID_IMAGE", "Choose an image to scan.");
      image = Buffer.from(await file.arrayBuffer());
      mime = file.type;
      roomId = form.get("roomId");
      requestId = form.get("requestId");
    } else if (body.headers.get("content-type")?.includes("application/json")) {
      const data = await body.json().catch(() => null);
      if (!data || typeof data !== "object" || Array.isArray(data))
        throw new AiError(
          "INVALID_REQUEST",
          "Provide a valid image upload or JSON object.",
        );
      const match =
        typeof data.image === "string"
          ? /^data:(image\/(?:jpeg|png|webp));base64,([A-Za-z0-9+/=]+)$/.exec(
              data.image,
            )
          : null;
      const encoded = match?.[2] || data.image;
      if (
        typeof encoded !== "string" ||
        !/^[A-Za-z0-9+/]+={0,2}$/.test(encoded)
      )
        throw new AiError(
          "INVALID_IMAGE",
          "Provide a valid base64 JPEG, PNG or WebP image.",
        );
      image = Buffer.from(encoded, "base64");
      mime = match?.[1] || data.mimeType;
      roomId = data.roomId;
      requestId = data.requestId;
    } else
      throw new AiError(
        "INVALID_FORMAT",
        "Use an image upload or base64 image.",
        415,
      );
    if (
      typeof roomId !== "string" ||
      !/^[a-zA-Z0-9][a-zA-Z0-9_-]{0,199}$/.test(roomId) ||
      typeof requestId !== "string" ||
      !JOB_ID_PATTERN.test(requestId)
    )
      throw new AiError(
        "INVALID_REQUEST",
        "Choose a palace and a valid scan request.",
      );
    const prepared = await prepareScanImage(image, mime);
    await requireAiStorage(uid);
    // A lost POST can resume its original job even when its task used the last
    // credits. Only a new request needs an availability check before quota.
    try {
      await readGeneration(uid, requestId);
    } catch (error) {
      if (!(error instanceof AiError) || error.code !== "SCAN_NOT_FOUND")
        throw error;
      await requireMeshCredits();
    }
    const result = await createGeneration(uid, requestId, roomId);
    if (result.created)
      after(() =>
        prepareGeneration(uid, requestId, prepared.image, prepared.thumbnail),
      );
    return Response.json(
      { job: publicJob(result.job) },
      { status: 202, headers },
    );
  } catch (error) {
    return aiErrorResponse(error);
  }
}

export async function GET(request: Request) {
  try {
    const { uid, db } = await requireAiUser(request);
    const url = new URL(request.url);
    let id = url.searchParams.get("jobId");
    if (!id) {
      const roomId = url.searchParams.get("roomId");
      if (!roomId || !/^[a-zA-Z0-9][a-zA-Z0-9_-]{0,199}$/.test(roomId))
        throw new AiError(
          "INVALID_REQUEST",
          "Choose a palace to resume a scan.",
        );
      const pointer = await db.doc(`users/${uid}/ai-room-jobs/${roomId}`).get();
      id = pointer.data()?.jobId;
      if (!id) return Response.json({ job: null }, { headers });
    }
    if (!JOB_ID_PATTERN.test(id))
      throw new AiError("INVALID_REQUEST", "This scan request is not valid.");
    if (await claimGenerationPoll(uid, id)) {
      const jobId = id;
      after(() => advanceGeneration(uid, jobId));
    }
    return Response.json(
      { job: publicJob(await readGeneration(uid, id)) },
      { headers },
    );
  } catch (error) {
    return aiErrorResponse(error);
  }
}
