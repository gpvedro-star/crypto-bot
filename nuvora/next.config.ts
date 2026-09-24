import type { NextConfig } from "next";

/**
 * NUVORA_STATIC=1 produces a fully static export (out/) for static hosts.
 * In that mode dynamic API routes are excluded by scripts/build-static.sh and
 * search runs in the browser against /search-index.json.
 */
const isStatic = process.env.NUVORA_STATIC === "1";

/**
 * Hosts allowed to serve editorial images, from NUVORA_IMAGE_HOSTS. Kept in an
 * env var so a new image provider does not need a code change, and empty by
 * default so next/image is never asked to fetch an arbitrary origin.
 */
const imageHosts = (process.env.NUVORA_IMAGE_HOSTS ?? "")
  .split(",")
  .map((h) => h.trim())
  .filter(Boolean);

const nextConfig: NextConfig = {
  reactStrictMode: true,
  poweredByHeader: false,
  ...(isStatic ? { output: "export" as const } : {}),
  images: {
    unoptimized: isStatic,
    formats: ["image/avif", "image/webp"],
    deviceSizes: [360, 640, 768, 1024, 1280, 1536, 1920],
    imageSizes: [96, 160, 240, 320, 480, 640],
    remotePatterns: imageHosts.map((hostname) => ({ protocol: "https" as const, hostname })),
  },
  /** Retired fictional author routes now point at the publication byline. */
  async redirects() {
    if (isStatic) return [];
    return ["margaret-hale", "daniel-reyes", "priya-natarajan", "thomas-whitfield", "nuvora-staff"].map((slug) => ({
      source: `/authors/${slug}`,
      destination: "/authors/nuvora",
      permanent: true,
    }));
  },
  async headers() {
    if (isStatic) return [];
    return [
      {
        // Draft previews must never be indexed, whatever links to them.
        source: "/preview/:path*",
        headers: [
          { key: "X-Robots-Tag", value: "noindex, nofollow, noarchive" },
          { key: "Cache-Control", value: "no-store" },
          { key: "Referrer-Policy", value: "no-referrer" },
        ],
      },
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
