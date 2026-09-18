import { categories, getArticlesByCategory } from "@/lib/content";
import { absoluteUrl } from "@/lib/seo";
import { publicCache } from "../_lib";

export function GET() {
  const data = categories.map((c) => ({ slug: c.slug, name: c.name, description: c.description, url: absoluteUrl(`/${c.slug}`), count: getArticlesByCategory(c.slug).length }));
  return Response.json({ data }, { headers: publicCache });
}
