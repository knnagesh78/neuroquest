"use client";
import { useContext, useEffect, useRef, useState } from "react";
import dynamic from "next/dynamic";
import {
  Camera,
  Check,
  ImagePlus,
  LoaderCircle,
  ScanLine,
  UploadCloud,
} from "lucide-react";
import { requestAiJob, resizeScanPhoto } from "@/lib/ai-client";
import type { AiGenerationJob } from "@/lib/ai-anchor";
import { usePalaceStore } from "@/store/usePalaceStore";
import { useAccountStore } from "@/store/useAccountStore";
import { SessionContext } from "../account/AccountControls";

const AiModelPreview = dynamic(() => import("../three/AiModelPreview"), {
  ssr: false,
  loading: () => (
    <div className="ai-model-preview ai-preview-loading">
      Preparing model preview…
    </div>
  ),
});

export default function AiScan({
  roomId,
  color,
  onReady,
  onReset,
}: {
  roomId: string;
  color: string;
  onReady: (job: AiGenerationJob) => void;
  onReset: () => void;
}) {
  const session = useContext(SessionContext);
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState("");
  const [job, setJob] = useState<AiGenerationJob | null>(null);
  const [preparing, setPreparing] = useState(false);
  const [error, setError] = useState("");
  const [dragging, setDragging] = useState(false);
  const uploadInput = useRef<HTMLInputElement>(null);
  const controller = useRef<AbortController | null>(null);
  const requestId = useRef("");
  const delivered = useRef("");
  const previewUrl = useRef("");
  const mounted = useRef(true);
  const working = !!job && job.status !== "ready" && job.status !== "failed";
  const busy = preparing || working;

  useEffect(() => {
    const abort = new AbortController();
    void requestAiJob(
      `/api/anchors/ai-generate?roomId=${encodeURIComponent(roomId)}`,
      { signal: abort.signal },
    )
      .then((result) => {
        if (
          abort.signal.aborted ||
          requestId.current ||
          !result ||
          result.status === "failed"
        )
          return;
        if (
          result.modelUrl &&
          usePalaceStore
            .getState()
            .anchors.some((anchor) => anchor.modelUrl === result.modelUrl)
        )
          return;
        setJob(result);
        requestId.current = result.id;
      })
      .catch(() => {
        /* A missing server configuration is explained when starting a scan. */
      });
    return () => {
      abort.abort();
      controller.current?.abort();
    };
  }, [roomId]);

  useEffect(() => {
    if (!job || job.status !== "ready" || delivered.current === job.id) return;
    delivered.current = job.id;
    onReady(job);
  }, [job, onReady]);

  const jobId = job?.id;
  useEffect(() => {
    if (!jobId || !working) return;
    const abort = new AbortController();
    let timer: ReturnType<typeof setTimeout>;
    let failures = 0;
    async function poll() {
      try {
        const result = await requestAiJob(
          `/api/anchors/ai-generate?jobId=${jobId}`,
          { signal: abort.signal },
        );
        if (abort.signal.aborted) return;
        if (result) setJob(result);
        failures = 0;
        setError("");
        if (result?.status === "ready" || result?.status === "failed") return;
      } catch (failure) {
        if (abort.signal.aborted) return;
        failures++;
        setError(
          failure instanceof Error
            ? failure.message
            : "Connection interrupted. Your scan can resume when you reconnect.",
        );
      }
      timer = setTimeout(poll, Math.min(30000, 5000 * Math.max(1, failures)));
    }
    timer = setTimeout(poll, 4000);
    return () => {
      abort.abort();
      clearTimeout(timer);
    };
  }, [jobId, working]);

  useEffect(() => {
    mounted.current = true;
    return () => {
      mounted.current = false;
      if (previewUrl.current) URL.revokeObjectURL(previewUrl.current);
    };
  }, []);

  async function chooseFile(value?: File) {
    if (!value || busy) return;
    setPreparing(true);
    setError("");
    try {
      const resized = await resizeScanPhoto(value);
      if (!mounted.current) return;
      if (previewUrl.current) URL.revokeObjectURL(previewUrl.current);
      previewUrl.current = URL.createObjectURL(resized);
      setPreview(previewUrl.current);
      setFile(resized);
      setJob(null);
      requestId.current = crypto.randomUUID();
      delivered.current = "";
      onReset();
    } catch (failure) {
      if (mounted.current)
        setError(
          failure instanceof Error
            ? failure.message
            : "This image could not be opened.",
        );
    } finally {
      if (mounted.current) setPreparing(false);
    }
  }

  async function generate() {
    if (!file || busy) return;
    const abort = new AbortController();
    controller.current = abort;
    setPreparing(true);
    setError("");
    onReset();
    try {
      if (useAccountStore.getState().conflict)
        throw new Error(
          "Resolve the cloud saving conflict before starting a scan.",
        );
      await session?.retry(); // Flush a just-created room before the server verifies ownership.
      const form = new FormData();
      form.append("image", file);
      form.append("roomId", roomId);
      if (!requestId.current || job?.status === "failed")
        requestId.current = crypto.randomUUID();
      form.append("requestId", requestId.current);
      const result = await requestAiJob("/api/anchors/ai-generate", {
        method: "POST",
        body: form,
        signal: abort.signal,
      });
      if (!abort.signal.aborted) setJob(result);
    } catch (failure) {
      if (!abort.signal.aborted) {
        setError(
          failure instanceof Error
            ? failure.message
            : "The scan could not start.",
        );
        // A lost POST response must not accidentally purchase a duplicate task.
        const recovered = await requestAiJob(
          `/api/anchors/ai-generate?jobId=${requestId.current}`,
          { signal: abort.signal },
        ).catch(() => null);
        if (recovered && !abort.signal.aborted) setJob(recovered);
      }
    } finally {
      if (!abort.signal.aborted) setPreparing(false);
    }
  }

  const steps = [
    {
      label: "Analyzing the visual concept",
      detail: "Gemini finds the idea and writes study notes.",
      done: job?.analysisComplete,
    },
    {
      label: "Synthesizing 3D geometry",
      detail: job?.progress
        ? `Tripo · ${Math.round(job.progress)}%`
        : "Tripo turns your image into a textured model.",
      done: job?.meshComplete,
    },
    {
      label: "Finalizing your memory anchor",
      detail: "Saving the model privately to your account.",
      done: job?.status === "ready",
    },
  ];
  return (
    <section className="ai-scan" aria-label="AI 3D image scan">
      <div className="ai-scan-heading">
        <ScanLine size={19} />
        <div>
          <strong>From a photo to a memory.</strong>
          <p>Choose one object, organ or circuit. A clear image works best.</p>
        </div>
      </div>
      {!job && (
        <>
          <input
            ref={uploadInput}
            id="ai-image-upload"
            type="file"
            accept="image/jpeg,image/png,image/webp"
            className="sr-only"
            disabled={busy}
            onChange={(event) => {
              void chooseFile(event.target.files?.[0]);
              event.target.value = "";
            }}
          />
          <div
            className={`ai-dropzone ${dragging ? "ai-dropzone--active" : ""}`}
            onDragOver={(event) => {
              event.preventDefault();
              if (!busy) setDragging(true);
            }}
            onDragLeave={() => setDragging(false)}
            onDrop={(event) => {
              event.preventDefault();
              setDragging(false);
              void chooseFile(event.dataTransfer.files[0]);
            }}
          >
            {file && preview ? (
              <>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={preview} alt="Selected image for AI scan" />
                <span>Image ready · {(file.size / 1024).toFixed(0)} KB</span>
              </>
            ) : (
              <>
                <UploadCloud size={32} />
                <strong>Drop your image here</strong>
                <span>JPEG, PNG or WebP · photos are resized for you</span>
              </>
            )}
            <div className="ai-upload-actions">
              <button
                type="button"
                className="drawer-secondary"
                disabled={busy}
                onClick={() => uploadInput.current?.click()}
              >
                <ImagePlus size={16} />
                {file ? "Change image" : "Choose image"}
              </button>
              <label className={`ai-camera-button ${busy ? "disabled" : ""}`}>
                <Camera size={16} />
                Take a photo
                <input
                  type="file"
                  accept="image/jpeg,image/png,image/webp"
                  capture="environment"
                  className="sr-only"
                  disabled={busy}
                  onChange={(event) => {
                    void chooseFile(event.target.files?.[0]);
                    event.target.value = "";
                  }}
                />
              </label>
            </div>
          </div>
          <button
            type="button"
            className="drawer-primary ai-generate-button"
            disabled={!file || busy}
            onClick={() => void generate()}
          >
            {preparing ? (
              <LoaderCircle size={17} className="spin" />
            ) : (
              <ScanLine size={17} />
            )}
            {preparing ? "Preparing your image…" : "Generate 3D memory"}
          </button>
          <p className="ai-upload-note">
            This sends your image to Gemini and Tripo. Review the model and
            notes before adding them.
          </p>
        </>
      )}
      {job && (
        <div className="ai-progress" role="status" aria-live="polite">
          <div className="ai-progress-title">
            <strong>
              {job.status === "ready"
                ? "Your 3D memory is ready"
                : job.status === "failed"
                  ? "This scan needs another try"
                  : "Building your 3D memory…"}
            </strong>
            <span>{job.status === "ready" ? "READY" : "AI SCAN"}</span>
          </div>
          <ol>
            {steps.map((step, index) => (
              <li key={step.label} className={step.done ? "complete" : ""}>
                <span className="ai-step-icon">
                  {step.done ? (
                    <Check size={15} />
                  ) : working && (index < 2 || job.status === "finalizing") ? (
                    <LoaderCircle className="spin" size={15} />
                  ) : (
                    index + 1
                  )}
                </span>
                <div>
                  <strong>{step.label}</strong>
                  <small>{step.detail}</small>
                </div>
              </li>
            ))}
          </ol>
          {working && (
            <p>
              Your scan continues if you close this window. Open AI 3D Scan in
              this palace to resume.
            </p>
          )}
          {job.status === "ready" && job.modelUrl && (
            <AiModelPreview modelUrl={job.modelUrl} color={color} />
          )}
          {(job.status === "ready" || job.status === "failed") && (
            <button
              className="drawer-secondary"
              type="button"
              onClick={() => {
                setJob(null);
                setFile(null);
                setPreview("");
                requestId.current = "";
                delivered.current = "";
                setError("");
                onReset();
              }}
            >
              Scan another image
            </button>
          )}
        </div>
      )}
      {(error || job?.error) && (
        <p className="add-error" role="alert">
          {job?.error || error}
        </p>
      )}
    </section>
  );
}
