import { randomUUID } from "node:crypto";
import { authenticateEditorialRequest, jsonError } from "@/lib/api-auth";
import { getEditorialStore, storeBackend } from "@/lib/editorial/store";
import { getImageStore, heroImageUrl } from "@/lib/editorial/image-store";
import { findHeroImage } from "@/lib/editorial/hero-image";
import type { EditorialImageAsset, EditorialRecord } from "@/lib/editorial/contract";

export const dynamic = "force-dynamic";

/**
 * One stable response shape for both verbs on this route, so a caller reads
 * `image_status` and `hero_url` the same way whether it just attached a
 * photo, found one already there, or hit a failure. `success` and
 * `image_status` always agree: success is ATTACHED or ALREADY_ATTACHED,
 * failure is every other status.
 */
type ImageStatus = "ATTACHED" | "ALREADY_ATTACHED" | "HERO_IMAGE_MISSING" | "PEXELS_NOT_CONFIGURED" | "IMAGE_LOOKUP_FAILED" | "NOT_DRAFT";

function heroResponse(opts: {
  requestId: string;
  contentId: string;
  publishStatus: string;
  imageStatus: "ATTACHED" | "ALREADY_ATTACHED";
  asset: EditorialImageAsset;
  query?: string;
}) {
  const { requestId, contentId, publishStatus, imageStatus, asset, query } = opts;
  return {
    success: true,
    content_id: contentId,
    publish_status: publishStatus.toUpperCase(),
    image_status: imageStatus,
    hero_url: asset.url,
    image_credit: asset.credit ?? null,
    source_page: asset.source_page ?? null,
    width: asset.width ?? null,
    height: asset.height ?? null,
    alt: asset.alt ?? null,
    ...(query ? { query } : {}),
    request_id: requestId,
  };
}

function failureResponse(
  status: number,
  opts: { requestId: string; contentId: string; publishStatus?: string; imageStatus: Exclude<ImageStatus, "ATTACHED" | "ALREADY_ATTACHED">; query?: string },
) {
  const { requestId, contentId, publishStatus, imageStatus, query } = opts;
  return Response.json(
    {
      success: false,
      content_id: contentId,
      ...(publishStatus ? { publish_status: publishStatus.toUpperCase() } : {}),
      image_status: imageStatus,
      hero_url: null,
      // Kept alongside image_status for any existing reader of the older field.
      reason: imageStatus,
      ...(query ? { query } : {}),
      request_id: requestId,
    },
    { status },
  );
}

/** The image this route itself attached, if the record's own metadata and the stored bytes both agree it's there. */
async function existingServerHero(
  record: EditorialRecord,
  images: NonNullable<ReturnType<typeof getImageStore>>,
): Promise<EditorialImageAsset | null> {
  if (!record.hero_image_attached) return null;
  const asset = record.image_assets?.find((a) => a?.url === heroImageUrl(record.content_id));
  if (!asset) return null;
  const stored = await images.get(record.content_id);
  if (!stored || stored.bytes.byteLength === 0) return null;
  return asset;
}

/**
 * GET /api/v1/editorial/articles/{content_id}/generate-image
 *
 * Read-only verification: reports whether this server has already attached a
 * hero image, without calling Pexels or touching the record. Same auth as
 * POST. Use this before POSTing to confirm a prior call already succeeded —
 * for example after a response was lost to a network or parsing error.
 */
export async function GET(request: Request, { params }: { params: Promise<{ id: string }> }) {
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

    const asset = await existingServerHero(record, images);
    if (!asset) {
      return failureResponse(404, { requestId, contentId: record.content_id, publishStatus: record.publish_status, imageStatus: "HERO_IMAGE_MISSING" });
    }
    return Response.json(
      heroResponse({ requestId, contentId: record.content_id, publishStatus: record.publish_status, imageStatus: "ALREADY_ATTACHED", asset }),
    );
  } catch (error) {
    console.error("[hero-image] verify failed", { requestId, id, error: String(error) });
    return jsonError(500, "Could not verify the hero image.", { request_id: requestId });
  }
}

/**
 * POST /api/v1/editorial/articles/{content_id}/generate-image
 *
 * Finds and attaches the one hero image for an existing DRAFT, from Pexels.
 * Authenticated with NUVORA_GROK_DRAFT_KEY (or the admin key); the fact-check
 * key is refused. The request body is ignored — the server builds the one
 * search query from the stored draft's image_brief / headline / summary, so
 * nothing supplied in the request is ever used as a query.
 *
 * If this route already attached a hero to this draft, that call is skipped
 * entirely: no second Pexels search, no replacement. Call GET first to check
 * without risking a POST at all, or just call POST again — either way Pexels
 * is only ever searched once per draft.
 *
 *   200  ATTACHED (new) or ALREADY_ATTACHED (no-op, nothing re-fetched)
 *   409  NOT_DRAFT — record has left DRAFT; unchanged
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
      return failureResponse(409, { requestId, contentId: record.content_id, publishStatus: record.publish_status, imageStatus: "NOT_DRAFT" });
    }

    // Idempotent: a hero this route already attached is never re-fetched.
    const already = await existingServerHero(record, images);
    if (already) {
      console.log("[hero-image] already attached, no Pexels request made", { requestId, id });
      return Response.json(
        heroResponse({ requestId, contentId: record.content_id, publishStatus: record.publish_status, imageStatus: "ALREADY_ATTACHED", asset: already }),
      );
    }

    const outcome = await findHeroImage(record);
    if (!outcome.ok) {
      const status = outcome.reason === "PEXELS_NOT_CONFIGURED" ? 503 : outcome.reason === "HERO_IMAGE_MISSING" ? 422 : 502;
      console.log("[hero-image] not attached", { requestId, id, reason: outcome.reason, query: outcome.query ?? null });
      return failureResponse(status, {
        requestId,
        contentId: record.content_id,
        publishStatus: record.publish_status,
        imageStatus: outcome.reason,
        query: outcome.query,
      });
    }

    const { image } = outcome;
    await images.put(id, { bytes: image.bytes, contentType: image.contentType, width: image.width, height: image.height });
    const stored = await images.get(id);
    if (!stored || stored.bytes.byteLength !== image.bytes.byteLength) throw new Error("hero image did not persist");

    const url = heroImageUrl(id);
    const heroAsset: EditorialImageAsset = {
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

    return Response.json(
      heroResponse({
        requestId,
        contentId: check.content_id,
        publishStatus: check.publish_status,
        imageStatus: "ATTACHED",
        asset: heroAsset,
        query: image.query,
      }),
    );
  } catch (error) {
    console.error("[hero-image] request failed", { requestId, id, error: String(error) });
    return jsonError(500, "Could not attach the hero image.", { request_id: requestId });
  }
}
