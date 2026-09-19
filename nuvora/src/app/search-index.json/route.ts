import { getSearchIndex } from "@/lib/search";

/** Static search index consumed by the browser (works on static hosting too). */
export const dynamic = "force-static";

export function GET() {
  return Response.json(getSearchIndex(), { headers: { "Cache-Control": "public, max-age=300, stale-while-revalidate=3600" } });
}
