import { tools } from "@/lib/content";
import { absoluteUrl } from "@/lib/seo";
import { publicCache } from "../_lib";

export function GET() {
  const data = tools.map((t) => ({ slug: t.slug, name: t.name, maker: t.maker, tagline: t.tagline, url: absoluteUrl(`/tools/${t.slug}`), officialUrl: t.officialUrl, updatedAt: t.updatedAt }));
  return Response.json({ data }, { headers: publicCache });
}
