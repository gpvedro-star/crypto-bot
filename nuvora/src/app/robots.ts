export const dynamic = "force-static";

import type { MetadataRoute } from "next";
import { absoluteUrl } from "@/lib/seo";
import { site } from "@/content/site";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [{ userAgent: "*", allow: "/", disallow: ["/api/", "/search", "/preview"] }],
    sitemap: absoluteUrl("/sitemap.xml"),
    host: site.url,
  };
}
