import { getImageStore } from "@/lib/editorial/image-store";

export const dynamic = "force-dynamic";

/**
 * GET /media/articles/{content_id} — the stored hero image's bytes.
 *
 * Public and unauthenticated, like any other static asset: the URL leaks
 * nothing (no content_id enumeration risk beyond a 404), and a draft's hero
 * is no more sensitive than its headline, which the preview route already
 * requires a token to see. This route only serves image bytes it already
 * has — it never triggers a lookup.
 */
export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const store = getImageStore();
  const image = store ? await store.get(id) : null;
  if (!image) return new Response("Not found", { status: 404 });

  return new Response(image.bytes, {
    headers: {
      "Content-Type": image.contentType,
      "Content-Length": String(image.bytes.byteLength),
      // Moderate, not immutable: a hero can be replaced by an explicit
      // new workflow run, and the URL does not change when that happens.
      "Cache-Control": "public, max-age=3600, stale-while-revalidate=86400",
    },
  });
}
