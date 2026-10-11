import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import sharp from "sharp";
vi.mock("server-only", () => ({}));
const mocks = vi.hoisted(() => ({ generate: vi.fn() }));
vi.mock("@google/genai", () => ({
  GoogleGenAI: class {
    models = { generateContent: mocks.generate };
  },
  Type: { OBJECT: "OBJECT", STRING: "STRING" },
}));
import {
  analyzeConcept,
  downloadModel,
  getMesh,
  MAX_MODEL_BYTES,
  prepareScanImage,
  startMesh,
  validateGlb,
  validateProviderAssetUrl,
} from "@/lib/server/ai-providers";
import { aiErrorResponse } from "@/lib/server/ai-errors";

function glb(
  value: unknown = { asset: { version: "2.0" }, buffers: [{ byteLength: 0 }] },
) {
  const json = Buffer.from(JSON.stringify(value));
  const padded = Buffer.alloc(Math.ceil(json.length / 4) * 4, " ");
  json.copy(padded);
  const header = Buffer.alloc(20);
  header.write("glTF");
  header.writeUInt32LE(2, 4);
  header.writeUInt32LE(20 + padded.length, 8);
  header.writeUInt32LE(padded.length, 12);
  header.writeUInt32LE(0x4e4f534a, 16);
  return Buffer.concat([header, padded]);
}

beforeEach(() => {
  vi.clearAllMocks();
  vi.stubEnv("GEMINI_API_KEY", "test-only");
  vi.stubEnv("TRIPO_API_KEY", "test-only");
});
afterEach(() => {
  vi.unstubAllGlobals();
  vi.unstubAllEnvs();
});

describe("image validation and structured vision", () => {
  it("decodes real bytes, resizes and generates a small metadata-free thumbnail", async () => {
    const source = await sharp({
      create: { width: 2000, height: 800, channels: 4, background: "#d97442" },
    })
      .png()
      .toBuffer();
    const result = await prepareScanImage(source, "image/png");
    expect((await sharp(result.image).metadata()).width).toBe(1536);
    const meta = await sharp(result.thumbnail).metadata();
    expect(meta.width).toBe(512);
    expect(meta.format).toBe("webp");
    expect(meta.exif).toBeUndefined();
  });
  it.each([
    [Buffer.from("not an image"), "image/png"],
    [Buffer.alloc(0), "image/png"],
    [Buffer.alloc(3 * 1024 * 1024 + 1), "image/jpeg"],
    [Buffer.from("<svg/>"), "image/svg+xml"],
  ])("rejects invalid or unsupported images", async (bytes, mime) => {
    await expect(
      prepareScanImage(bytes as Buffer, mime as string),
    ).rejects.toMatchObject({ code: "INVALID_IMAGE" });
  });
  it("uses inline image data and schema-constrained notes", async () => {
    const concept = {
      conceptTitle: "Circuit",
      category: "Electronics",
      studyNotes: "# Circuit\n\nA simple circuit.",
      recallPrompt: "What completes the circuit?",
    };
    mocks.generate.mockResolvedValue({ text: JSON.stringify(concept) });
    expect(await analyzeConcept(Buffer.from("png bytes"))).toEqual(concept);
    expect(mocks.generate.mock.calls[0][0]).toMatchObject({
      model: "gemini-2.5-flash",
      config: {
        responseMimeType: "application/json",
        responseSchema: { required: Object.keys(concept) },
      },
    });
  });
  it("hides malformed provider responses and credentials in errors", async () => {
    mocks.generate.mockRejectedValue(new Error("provider echoed test-secret"));
    await expect(analyzeConcept(Buffer.alloc(1))).rejects.toMatchObject({
      code: "VISION_FAILED",
      status: 502,
    });
    const response = aiErrorResponse(new Error("private key test-secret"));
    expect(await response.text()).not.toContain("test-secret");
    expect(response.headers.get("Cache-Control")).toBe("no-store");
  });
});

describe("Tripo contracts and model safety", () => {
  it("uploads first, then creates one image-to-model task with the uploaded token", async () => {
    const fetcher = vi
      .fn()
      .mockResolvedValueOnce(
        Response.json({ code: 0, data: { image_token: "uploaded-image" } }),
      )
      .mockResolvedValueOnce(
        Response.json({ code: 0, data: { task_id: "task-123" } }),
      );
    vi.stubGlobal("fetch", fetcher);
    expect(await startMesh(Buffer.from("image"))).toBe("task-123");
    expect(fetcher.mock.calls[0][0]).toContain("/upload");
    expect(JSON.parse(fetcher.mock.calls[1][1].body)).toMatchObject({
      type: "image_to_model",
      file: { type: "png", file_token: "uploaded-image" },
      pbr: true,
      texture: true,
    });
    expect(fetcher.mock.calls[1][1].headers.Authorization).toBe(
      "Bearer test-only",
    );
  });
  it("prefers the textured PBR GLB and makes temporary provider failures retryable", async () => {
    vi.stubGlobal(
      "fetch",
      vi
        .fn()
        .mockResolvedValueOnce(
          Response.json({
            code: 0,
            data: {
              status: "success",
              progress: 200,
              output: { pbr_model: "pbr", model: "plain" },
            },
          }),
        )
        .mockResolvedValueOnce(
          Response.json({ error: "do not expose" }, { status: 503 }),
        ),
    );
    expect(await getMesh("task-123")).toEqual({
      status: "success",
      progress: 100,
      modelUrl: "pbr",
    });
    await expect(getMesh("task-123")).rejects.toMatchObject({
      code: "MESH_RETRYABLE",
    });
  });
  it.each([
    "http://assets.tripo3d.ai/a.glb",
    "https://tripo3d.ai.evil.example/a.glb",
    "https://localhost/a.glb",
    "https://user:password@tripo3d.ai/a.glb",
    "not a URL",
  ])("rejects untrusted download addresses", (value) => {
    expect(() => validateProviderAssetUrl(value)).toThrow();
  });
  it("downloads without forwarding provider authorization and blocks redirects", async () => {
    const fetcher = vi.fn().mockResolvedValue(new Response(glb()));
    vi.stubGlobal("fetch", fetcher);
    expect(await downloadModel("https://assets.tripo3d.ai/model.glb")).toEqual(
      glb(),
    );
    expect(fetcher.mock.calls[0][1]).toMatchObject({
      redirect: "error",
      cache: "no-store",
    });
    expect(fetcher.mock.calls[0][1].headers).toBeUndefined();
  });
  it("accepts only valid, self-contained GLB resources", () => {
    expect(() => validateGlb(glb())).not.toThrow();
    for (const value of [
      null,
      { buffers: "bad" },
      { images: [null] },
      { images: [{ uri: 42 }] },
      { images: [{ uri: "https://outside.example/texture.png" }] },
    ])
      expect(() => validateGlb(glb(value))).toThrow();
    expect(() =>
      validateGlb(glb({ images: [{ uri: "data:image/png;base64,AA==" }] })),
    ).not.toThrow();
    const incomplete = glb().subarray(0, 22);
    expect(() => validateGlb(incomplete)).toThrow();
  });
  it("rejects a declared oversized download before reading it", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(
        new Response("huge", {
          headers: { "Content-Length": String(MAX_MODEL_BYTES + 1) },
        }),
      ),
    );
    await expect(
      downloadModel("https://assets.tripo3d.ai/huge.glb"),
    ).rejects.toMatchObject({ code: "DOWNLOAD_FAILED" });
  });
});
