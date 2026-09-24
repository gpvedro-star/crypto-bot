import { categories } from "@/lib/content";
import { getLiveArticles } from "@/lib/live-content";
import { absoluteUrl } from "@/lib/seo";
import { publicCache } from "../_lib";

export const revalidate = 60;

export async function GET() {
  const articles = await getLiveArticles();
  const data = categories.map((c) => ({
    slug: c.slug,
    name: c.name,
    description: c.description,
    url: absoluteUrl(`/${c.slug}`),
    count: articles.filter((a) => a.category === c.slug).length,
  }));
  return Response.json({ data }, { headers: publicCache });
}
