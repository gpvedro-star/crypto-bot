import { randomUUID } from "node:crypto";
import { authenticateEditorialRequest, jsonError } from "@/lib/api-auth";
import { getEditorialStore, storeBackend } from "@/lib/editorial/store";
import { getImageStore, inlineImageUrl, type ImageSlot } from "@/lib/editorial/image-store";
import { findInlineImage } from "@/lib/editorial/hero-image";
import type { EditorialInlineImage, EditorialRecord } from "@/lib/editorial/contract";

export const dynamic = "force-dynamic";

const SLOT: ImageSlot = "inline-1";

/**
 * The same stable response contract as the hero route, with the URL under
 * `inline_image_url`. `success` and `image_status` always agree: success is
 * ATTACHED or ALREADY_ATTACHED, every other status is a failure.
 */
type FailureStatus = "INLINE_IMAGE_MISSING" | "PEXELS_NOT_CONFIGURED" | "IMAGE_LOOKUP_FAILED" | "NOT_DRAFT" | "HERO_IMAGE_REQUIRED";

function successBody(opts: {
  requestId: string;
  record: EditorialRecord;
  imageStatus: "ATTACHED" | "ALREADY_ATTACHED";
  image: EditorialInlineImage;
  query?: string;
}) {
  const { requestId, record, imageStatus, image, query } = opts;
  return {
    success: true,
    content_id: record.content_id,
    publish_status: record.publish_status.toUpperCase(),
    image_status: imageStatus,
    inline_image_url: image.src,
    image_credit: image.credit,
    source_page: image.source_page,
    width: image.width,
    height: image.height,
    alt: image.alt,
    placement: image.placement,
    // Only on a call that actually searched Pexels.
    ...(query ? { query } : {}),
    request_id: requestId,
  };
}

function failure(
  status: number,
  opts: { requestId: string; contentId: string; publishStatus?: string; imageStatus: FailureStatus; query?: string },
) {
  const { requestId, contentId, publishStatus, imageStatus, query } = opts;
  return Response.json(
    {
      success: false,
      content_id: contentId,
      ...(publishStatus ? { publish_status: publishStatus.toUpperCase() } : {}),
      image_status: imageStatus,
      inline_image_url: null,
      reason: imageStatus,
      ...(query ? { query } : {}),
      request_id: requestId,
    },
    { status },
  );
}

/** The inline photo this route attached, if both the record and the stored bytes agree it is there. */
async function existingInline(
  record: EditorialRecord,
  images: NonNullable<ReturnType<typeof getImageStore>>,
): Promise<EditorialInlineImage | null> {
  if (!record.inline_image_attached) return null;
  const image = record.inline_images?.find((i) => i?.src === inlineImageUrl(record.content_id, SLOT));
  if (!image) return null;
  const stored = await images.get(record.content_id, SLOT);
  if (!stored || stored.bytes.byteLength === 0) return null;
  return image;
}

function stores() {
  const store = getEditorialStore();
  if (!store) return { error: jsonError(503, "Editorial storage is not configured on this deployment.", { backend: storeBackend() }) };
  const images = getImageStore();
  if (!images) return { error: jsonError(503, "Image storage is not configured on this deployment.") };
  return { store, images };
}

/**
 * GET /api/v1/editorial/articles/{content_id}/inline-image
 *
 * Read-only check of whether this server already attached the inline photo.
 * Never calls Pexels, never writes. Same auth as POST.
 */
export async function GET(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const requestId = randomUUID();
  const auth = authenticateEditorialRequest(request, { allowDraftKey: true });
  if (!auth.ok) return jsonError(auth.status, auth.message);
  const { id } = await params;
  const s = stores();
  if ("error" in s) return s.error;

  try {
    const record = await s.store.get(id);
    if (!record) return jsonError(404, "No draft with that id.", { request_id: requestId });
    const image = await existingInline(record, s.images);
    if (!image) {
      return failure(404, { requestId, contentId: record.content_id, publishStatus: record.publish_status, imageStatus: "INLINE_IMAGE_MISSING" });
    }
    return Response.json(successBody({ requestId, record, imageStatus: "ALREADY_ATTACHED", image }));
  } catch (error) {
    console.error("[inline-image] verify failed", { requestId, id, error: String(error) });
    return jsonError(500, "Could not verify the inline image.", { request_id: requestId });
  }
}

/**
 * POST /api/v1/editorial/articles/{content_id}/inline-image
 *
 * Attaches the one inline body photo to an existing DRAFT that already has
 * its hero. Draft or admin key; the fact-check key is refused. The body is
 * ignored: the query comes from the stored draft's `inline_image_brief`
 * (then summary, then headline). One Pexels search, one download, no retry,
 * and never the photo already used as the hero. Idempotent: if this route
 * already attached the inline photo, the call is a no-op — no second search.
 * Never publishes and never changes article text or fact-check state.
 *
 *   200  ATTACHED (new) or ALREADY_ATTACHED (no-op)
 *   409  NOT_DRAFT, or HERO_IMAGE_REQUIRED — run the hero step first
 *   422  INLINE_IMAGE_MISSING — no photo met the rules; draft unchanged
 *   502  IMAGE_LOOKUP_FAILED — search or download failed; draft unchanged
 *   503  PEXELS_NOT_CONFIGURED — nothing attempted
 */
export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const requestId = randomUUID();
  const auth = authenticateEditorialRequest(request, { allowDraftKey: true });
  if (!auth.ok) return jsonError(auth.status, auth.message);
  const { id } = await params;
  const s = stores();
  if ("error" in s) return s.error;
  const { store, images } = s;

  try {
    const record = await store.get(id);
    if (!record) return jsonError(404, "No draft with that id.", { request_id: requestId });
    if (record.publish_status !== "draft") {
      return failure(409, { requestId, contentId: record.content_id, publishStatus: record.publish_status, imageStatus: "NOT_DRAFT" });
    }

    const already = await existingInline(record, images);
    if (already) {
      console.log("[inline-image] already attached, no Pexels request made", { requestId, id });
      return Response.json(successBody({ requestId, record, imageStatus: "ALREADY_ATTACHED", image: already }));
    }

    // The hero comes first, so the inline photo can be guaranteed different from it.
    const heroId = record.hero_image_source?.id;
    if (!record.hero_image_attached || typeof heroId !== "number") {
      return failure(409, { requestId, contentId: record.content_id, publishStatus: record.publish_status, imageStatus: "HERO_IMAGE_REQUIRED" });
    }

    const outcome = await findInlineImage(record, [heroId]);
    if (!outcome.ok) {
      const status = outcome.reason === "PEXELS_NOT_CONFIGURED" ? 503 : outcome.reason === "INLINE_IMAGE_MISSING" ? 422 : 502;
      console.log("[inline-image] not attached", { requestId, id, reason: outcome.reason, query: outcome.query ?? null });
      return failure(status, { requestId, contentId: record.content_id, publishStatus: record.publish_status, imageStatus: outcome.reason, query: outcome.query });
    }

    const { image } = outcome;
    if (image.pexelsId === heroId) throw new Error("inline photo matched the hero");

    await images.put(id, { bytes: image.bytes, contentType: image.contentType, width: image.width, height: image.height }, SLOT);
    const stored = await images.get(id, SLOT);
    if (!stored || stored.bytes.byteLength !== image.bytes.byteLength) throw new Error("inline image did not persist");

    const inline: EditorialInlineImage = {
      src: inlineImageUrl(id, SLOT),
      alt: image.alt,
      caption: "Illustrative photo.",
      credit: image.credit,
      source_page: image.sourcePage,
      photographer: image.photographer,
      ...(image.photographerUrl ? { photographer_url: image.photographerUrl } : {}),
      width: image.width,
      height: image.height,
      placement: "middle",
      provider: "pexels",
      pexels_id: image.pexelsId,
      query: image.query,
    };

    const updated = await store.update(id, { inline_images: [inline], inline_image_attached: true });
    const check = updated ? await store.get(id) : null;
    if (!check || check.inline_image_attached !== true || check.inline_images?.[0]?.src !== inline.src) {
      throw new Error("inline image metadata did not persist");
    }

    console.log("[inline-image] attached", { requestId, id, pexelsId: image.pexelsId, query: image.query });
    return Response.json(successBody({ requestId, record: check, imageStatus: "ATTACHED", image: inline, query: image.query }));
  } catch (error) {
    console.error("[inline-image] request failed", { requestId, id, error: String(error) });
    return jsonError(500, "Could not attach the inline image.", { request_id: requestId });
  }
}
