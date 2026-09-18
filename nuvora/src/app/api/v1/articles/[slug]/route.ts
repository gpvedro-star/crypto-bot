import { getArticle } from "@/lib/content";
import { jsonError } from "@/lib/api-auth";
import { serializeArticleFull, publicCache } from "../../_lib";

/** GET /api/v1/articles/:slug — full structured article for automation. */
export async function GET(_request: Request, { params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const article = getArticle(slug);
  if (!article) return jsonError(404, "Article not found.");
  return Response.json({ data: serializeArticleFull(article) }, { headers: publicCache });
}
