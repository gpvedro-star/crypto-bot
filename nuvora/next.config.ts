import type { NextConfig } from "next";

/**
 * NUVORA_STATIC=1 produces a fully static export (out/) for static hosts.
 * In that mode dynamic API routes are excluded by scripts/build-static.sh and
 * search runs in the browser against /search-index.json.
 */
const isStatic = process.env.NUVORA_STATIC === "1";

const nextConfig: NextConfig = {
  reactStrictMode: true,
  poweredByHeader: false,
  ...(isStatic ? { output: "export" as const } : {}),
  images: {
    unoptimized: isStatic,
    formats: ["image/avif", "image/webp"],
    deviceSizes: [360, 640, 768, 1024, 1280, 1536, 1920],
    imageSizes: [96, 160, 240, 320, 480, 640],
    // Remote image hosts are added here when the image pipeline goes live.
    remotePatterns: [],
  },
  async headers() {
    if (isStatic) return [];
    return [
      {
        source: "/(.*)",
        headers: [
          { key: "X-Content-Type-Options", value: "nosniff" },
          { key: "X-Frame-Options", value: "SAMEORIGIN" },
          { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
          { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=()" },
        ],
      },
    ];
  },
};

export default nextConfig;
