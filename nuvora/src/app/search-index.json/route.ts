import { getLiveSearchIndex } from "@/lib/search";

/** Search index consumed by the browser. Rebuilt when editorial content changes. */
export const revalidate = 60;

export async function GET() {
  return Response.json(await getLiveSearchIndex(), {
    headers: { "Cache-Control": "public, max-age=60, stale-while-revalidate=3600" },
  });
}
