import type { NextConfig } from "next";

const staticExport = process.env.NEUROQUEST_STATIC_EXPORT === "true";
const nextConfig: NextConfig = {
  output: staticExport ? "export" : undefined,
  reactStrictMode: true,
  poweredByHeader: false,
  turbopack: { root: process.cwd() },
  ...(staticExport
    ? {}
    : {
        async headers() {
          return [
            {
              source: "/:path*",
              headers: [
                { key: "X-Content-Type-Options", value: "nosniff" },
                { key: "X-Frame-Options", value: "DENY" },
                {
                  key: "Referrer-Policy",
                  value: "strict-origin-when-cross-origin",
                },
              ],
            },
            {
              source: "/sw.js",
              headers: [
                {
                  key: "Cache-Control",
                  value: "no-cache, no-store, must-revalidate",
                },
              ],
            },
          ];
        },
      }),
};

export default nextConfig;
