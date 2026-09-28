import { randomUUID } from "node:crypto";
import { authenticateEditorialRequest, jsonError } from "@/lib/api-auth";
import { getEditorialStore, storeBackend } from "@/lib/editorial/store";
import { getImageStore, heroImageUrl } from "@/lib/editorial/image-store";
import { findHeroImage } from "@/lib/editorial/hero-image";

export const dynamic = "force-dynamic";

/**
 * POST /api/v1/editorial/articles/{content_id}/generate-image
 *
 * Finds and attaches the one hero image for an existing DRAFT, from Pexels.
 * Authenticated with NUVORA_GROK_DRAFT_KEY (or the admin key); the fact-check
 * key is refused. The request body is ignored — the server builds the one
 * search query from the stored draft's image_brief / headline / summary, so
 * nothing supplied in the request is ever used as a query.
 *
 * One Pexels search and one download per call, no retry. This route never
 * publishes, never changes article text or fact-check state, and never
 * touches any draft other than the one in the URL.
 *
 *   200  attached
 *   422  HERO_IMAGE_MISSING — no photo met the selection rules; draft unchanged
 *   502  IMAGE_LOOKUP_FAILED — Pexels search or download failed; draft unchanged
 *   503  PEXELS_NOT_CONFIGURED — no PEXELS_API_KEY; nothing was attempted
 */
export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const requestId = randomUUID();
  const auth = authenticateEditorialRequest(request, { allowDraftKey: true });
  if (!auth.ok) return jsonError(auth.status, auth.message);

  const { id } = await params;

  const store = getEditorialStore();
  if (!store) return jsonError(503, "Editorial storage is not configured on this deployment.", { backend: storeBackend() });
  const images = getImageStore();
  if (!images) return jsonError(503, "Image storage is not configured on this deployment.");

  try {
    const record = await store.get(id);
    if (!record) return jsonError(404, "No draft with that id.", { request_id: requestId });
    if (record.publish_status !== "draft") {
      return Response.json(
        { success: false, content_id: record.content_id, reason: "NOT_DRAFT", request_id: requestId },
        { status: 409 },
      );
    }

    const outcome = await findHeroImage(record);
    if (!outcome.ok) {
      const status = outcome.reason === "PEXELS_NOT_CONFIGURED" ? 503 : outcome.reason === "HERO_IMAGE_MISSING" ? 422 : 502;
      console.log("[hero-image] not attached", { requestId, id, reason: outcome.reason, query: outcome.query ?? null });
      return Response.json(
        {
          success: false,
          content_id: record.content_id,
          publish_status: record.publish_status.toUpperCase(),
          reason: outcome.reason,
          ...(outcome.query ? { query: outcome.query } : {}),
          request_id: requestId,
        },
        { status },
      );
    }

    const { image } = outcome;
    await images.put(id, { bytes: image.bytes, contentType: image.contentType, width: image.width, height: image.height });
    const stored = await images.get(id);
    if (!stored || stored.bytes.byteLength !== image.bytes.byteLength) throw new Error("hero image did not persist");

    const url = heroImageUrl(id);
    const heroAsset = {
      url,
      alt: image.alt,
      caption: "Illustrative photo.",
      credit: image.credit,
      width: image.width,
      height: image.height,
      source_page: image.sourcePage,
      photographer: image.photographer,
      ...(image.photographerUrl ? { photographer_url: image.photographerUrl } : {}),
    };
    // Keep any image an editor attached by hand; replace only a previous
    // server-attached hero, so a second call doesn't pile up stale copies.
    const kept = (record.image_assets ?? []).filter((a) => !a?.url?.startsWith("/media/articles/"));

    const updated = await store.update(id, {
      image_assets: [heroAsset, ...kept],
      hero_image_attached: true,
      hero_image_source: { provider: "pexels", id: image.pexelsId, query: image.query },
    });
    const check = updated ? await store.get(id) : null;
    if (!check || check.hero_image_attached !== true || check.image_assets?.[0]?.url !== url) {
      throw new Error("hero image metadata did not persist");
    }

    console.log("[hero-image] attached", { requestId, id, pexelsId: image.pexelsId, query: image.query });

    return Response.json({
      success: true,
      content_id: check.content_id,
      publish_status: check.publish_status.toUpperCase(),
      image: {
        url,
        width: image.width,
        height: image.height,
        content_type: image.contentType,
        alt: image.alt,
        credit: image.credit,
        source_page: image.sourcePage,
      },
      query: image.query,
      request_id: requestId,
    });
  } catch (error) {
    console.error("[hero-image] request failed", { requestId, id, error: String(error) });
    return jsonError(500, "Could not attach the hero image.", { request_id: requestId });
  }
}
