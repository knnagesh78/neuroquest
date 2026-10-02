import type { MetadataRoute } from "next";

export const dynamic = "force-static";

export default function manifest(): MetadataRoute.Manifest {
  return {
    id: "/",
    name: "NeuroQuest — Your Memory Palace",
    short_name: "NeuroQuest",
    description:
      "A private 3D home for your study notes. Explore ideas and practice remembering them.",
    start_url: "/",
    scope: "/",
    display: "standalone",
    background_color: "#2d1d17",
    theme_color: "#2d1d17",
    orientation: "any",
    categories: ["education", "productivity"],
    icons: [
      {
        src: "/icons/icon-192.png",
        sizes: "192x192",
        type: "image/png",
        purpose: "any",
      },
      {
        src: "/icons/icon-512.png",
        sizes: "512x512",
        type: "image/png",
        purpose: "any",
      },
      {
        src: "/icons/maskable-512.png",
        sizes: "512x512",
        type: "image/png",
        purpose: "maskable",
      },
    ],
  };
}
