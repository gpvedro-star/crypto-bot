import type { MetadataRoute } from "next";
import { site } from "@/content/site";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: site.name,
    short_name: site.name,
    description: site.description,
    start_url: "/",
    display: "standalone",
    background_color: "#F8F9FB",
    theme_color: "#0B2D5B",
    icons: [{ src: "/brand/icon.svg", sizes: "any", type: "image/svg+xml", purpose: "any" }],
  };
}
