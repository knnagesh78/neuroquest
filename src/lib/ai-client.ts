"use client";
import { getToken } from "firebase/app-check";
import { getFirebase } from "./firebase";
import {
  MAX_SCAN_BYTES,
  SCAN_MIME_TYPES,
  type AiGenerationJob,
} from "./ai-anchor";
import { syncModelCacheUser } from "./model-cache-session";

export async function authenticatedFetch(url: string, init: RequestInit = {}) {
  const { auth, appCheck, ready } = getFirebase();
  await ready;
  const user = auth.currentUser;
  if (!user) throw new Error("Sign in before starting an AI scan.");
  if (url.startsWith("/api/anchors/assets/"))
    await syncModelCacheUser(user.uid);
  for (let attempt = 0; attempt < 2; attempt++) {
    const token = await user.getIdToken(attempt === 1);
    if (auth.currentUser?.uid !== user.uid)
      throw new Error("Your account changed. Open the scan again.");
    const headers = new Headers(init.headers);
    headers.set("Authorization", `Bearer ${token}`);
    if (appCheck) {
      const check = await getToken(appCheck).catch(() => null);
      if (check) headers.set("X-Firebase-AppCheck", check.token);
    }
    const response = await fetch(url, { ...init, cache: "no-store", headers });
    if (response.status !== 401 || attempt === 1) return response;
  }
  throw new Error("Your session has expired. Sign in again.");
}

export async function requestAiJob(
  url: string,
  init?: RequestInit,
): Promise<AiGenerationJob | null> {
  const response = await authenticatedFetch(url, init);
  const data = await response.json().catch(() => null);
  if (!response.ok)
    throw new Error(
      data?.error ||
        "The scan could not connect. Check your connection and retry.",
    );
  return data?.job ?? null;
}

export async function resizeScanPhoto(file: File): Promise<File> {
  if (!SCAN_MIME_TYPES.includes(file.type))
    throw new Error("Use a JPEG, PNG or WebP image.");
  if (file.size > 12 * 1024 * 1024)
    throw new Error(
      "Choose a photo smaller than 12 MB. It will be resized before upload.",
    );
  const bitmap = await createImageBitmap(file).catch(() => {
    throw new Error("This photo could not be read. Try another image.");
  });
  try {
    if (bitmap.width * bitmap.height > 36_000_000)
      throw new Error("Choose an image with fewer than 36 million pixels.");
    const scale = Math.min(1, 1536 / Math.max(bitmap.width, bitmap.height));
    const canvas = document.createElement("canvas");
    canvas.width = Math.max(1, Math.round(bitmap.width * scale));
    canvas.height = Math.max(1, Math.round(bitmap.height * scale));
    const context = canvas.getContext("2d");
    if (!context) throw new Error("This browser could not prepare your image.");
    context.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
    const blob = await new Promise<Blob>((resolve, reject) =>
      canvas.toBlob(
        (value) =>
          value
            ? resolve(value)
            : reject(new Error("Image preparation failed.")),
        "image/webp",
        0.86,
      ),
    );
    if (blob.size > MAX_SCAN_BYTES)
      throw new Error(
        "This image is still too large. Crop to one object and retry.",
      );
    return new File(
      [blob],
      blob.type === "image/png" ? "scan.png" : "scan.webp",
      { type: blob.type },
    );
  } finally {
    bitmap.close();
  }
}
