import { liveSearch } from "@/lib/search";

/** GET /api/v1/search?q=&limit= — powers the search dialog. */
export const revalidate = 60;

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const q = (searchParams.get("q") ?? "").slice(0, 100);
  const limit = Math.min(Math.max(Number(searchParams.get("limit") ?? 10), 1), 30);
  const results = await liveSearch(q, limit);
  return Response.json({ query: q, results }, { headers: { "Cache-Control": "public, s-maxage=60, stale-while-revalidate=600" } });
}
