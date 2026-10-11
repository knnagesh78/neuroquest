"use client";
import { useEffect, useState } from "react";
import { authenticatedFetch } from "@/lib/ai-client";
import { ASSET_URL_PATTERN } from "@/lib/ai-anchor";
import { ImageIcon } from "lucide-react";

export default function PrivateThumbnail({
  url,
  alt,
  className = "",
}: {
  url: string;
  alt: string;
  className?: string;
}) {
  const [source, setSource] = useState("");
  useEffect(() => {
    const controller = new AbortController();
    let objectUrl = "";
    if (!ASSET_URL_PATTERN.test(url)) return;
    void authenticatedFetch(url, { signal: controller.signal })
      .then(async (response) => {
        if (!response.ok) return;
        const blob = await response.blob();
        if (controller.signal.aborted) return;
        objectUrl = URL.createObjectURL(blob);
        setSource(objectUrl);
      })
      .catch(() => {});
    return () => {
      controller.abort();
      if (objectUrl) URL.revokeObjectURL(objectUrl);
    };
  }, [url]);
  return source ? (
    // Private authenticated blobs cannot be fetched through Next's public image optimizer.
    // eslint-disable-next-line @next/next/no-img-element
    <img src={source} alt={alt} className={className} />
  ) : (
    <span className={className} aria-label={alt}>
      <ImageIcon size={28} aria-hidden="true" />
    </span>
  );
}
