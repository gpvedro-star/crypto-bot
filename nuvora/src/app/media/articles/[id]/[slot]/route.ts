import { getImageStore, isImageSlot } from "@/lib/editorial/image-store";

export const dynamic = "force-dynamic";

/**
 * GET /media/articles/{content_id}/{slot} — a stored inline body photo's
 * bytes (slot "inline-1", …). Same rules as the hero route beside it: public,
 * serves only bytes already stored, never triggers a lookup, and unknown slot
 * names are a plain 404.
 */
export async function GET(_request: Request, { params }: { params: Promise<{ id: string; slot: string }> }) {
  const { id, slot } = await params;
  if (!isImageSlot(slot)) return new Response("Not found", { status: 404 });
  const store = getImageStore();
  const image = store ? await store.get(id, slot) : null;
  if (!image) return new Response("Not found", { status: 404 });

  return new Response(image.bytes, {
    headers: {
      "Content-Type": image.contentType,
      "Content-Length": String(image.bytes.byteLength),
      "Cache-Control": "public, max-age=3600, stale-while-revalidate=86400",
    },
  });
}
