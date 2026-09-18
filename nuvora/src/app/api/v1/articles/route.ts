import { getAllArticles } from "@/lib/content";
import { serializeArticleSummary, publicCache } from "../_lib";

/**
 * GET /api/v1/articles?category=&limit=&offset=&flag=trending|popular|featured
 * Public read endpoint for automation (social agents, newsletters, syndication).
 */
export function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const category = searchParams.get("category");
  const flag = searchParams.get("flag");
  const limit = Math.min(Math.max(Number(searchParams.get("limit") ?? 20), 1), 100);
  const offset = Math.max(Number(searchParams.get("offset") ?? 0), 0);

  let items = getAllArticles();
  if (category) items = items.filter((a) => a.category === category);
  if (flag === "trending") items = items.filter((a) => a.trending);
  if (flag === "popular") items = items.filter((a) => a.popular);
  if (flag === "featured") items = items.filter((a) => a.featured);

  const page = items.slice(offset, offset + limit).map(serializeArticleSummary);
  return Response.json({ data: page, meta: { total: items.length, limit, offset } }, { headers: publicCache });
}
