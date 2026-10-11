import "server-only";

export class AiError extends Error {
  constructor(
    public code: string,
    message: string,
    public status = 400,
  ) {
    super(message);
    this.name = "AiError";
  }
}

export function safeAiError(error: unknown): AiError {
  if (error instanceof AiError) return error;
  if (
    error instanceof Error &&
    (error.name === "AbortError" || error.name === "TimeoutError")
  )
    return new AiError(
      "TIMEOUT",
      "The AI service took too long. Your existing anchors are safe. Try again later.",
      504,
    );
  return new AiError(
    "GENERATION_FAILED",
    "The scan could not be completed. Please try again later.",
    502,
  );
}

export function aiErrorResponse(error: unknown) {
  const safe = safeAiError(error);
  // Do not return provider bodies, signed URLs, stack traces or credentials.
  return Response.json(
    { error: safe.message, code: safe.code },
    {
      status: safe.status,
      headers: { "Cache-Control": "no-store" },
    },
  );
}
