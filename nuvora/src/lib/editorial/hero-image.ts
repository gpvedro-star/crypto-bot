import type { EditorialRecord } from "./contract";
import { safeText } from "./body";
import { buildInlinePexelsQuery, buildPexelsQuery, heroRendition, pexelsCredit, selectPexelsPhoto, type PexelsPhoto } from "./pexels-select";

/**
 * One hero image per article, from Pexels.
 *
 * Deterministic and low-cost: exactly one search request, built by the server
 * from the draft's own fields (never from anything in a request), then one
 * download of the single photo chosen by `selectPexelsPhoto`. No retries, no
 * variants, no random choice. The photo is downloaded and stored by NUVORA, so
 * readers never load anything from Pexels and a photo later removed from
 * Pexels doesn't break a published article.
 *
 * `PEXELS_API_KEY` is read from the server environment only. It is never put
 * in a response, a log line or anything sent to the browser or to Grok.
 */

const SEARCH_URL = "https://api.pexels.com/v1/search";
const RESULTS_PER_SEARCH = 30;
const MAX_IMAGE_BYTES = 8 * 1024 * 1024;

export type HeroImageFailure = "PEXELS_NOT_CONFIGURED" | "IMAGE_LOOKUP_FAILED" | "HERO_IMAGE_MISSING";
export type InlineImageFailure = "PEXELS_NOT_CONFIGURED" | "IMAGE_LOOKUP_FAILED" | "INLINE_IMAGE_MISSING";

export interface HeroImageResult {
  bytes: ArrayBuffer;
  contentType: string;
  width: number;
  height: number;
  alt: string;
  credit: string;
  photographer: string;
  photographerUrl?: string;
  sourcePage: string;
  pexelsId: number;
  query: string;
}

export type HeroImageOutcome = { ok: true; image: HeroImageResult } | { ok: false; reason: HeroImageFailure; query?: string };
export type InlineImageOutcome = { ok: true; image: HeroImageResult } | { ok: false; reason: InlineImageFailure; query?: string };

type Fields = Pick<EditorialRecord, "final_headline" | "summary" | "category" | "image_brief" | "inline_image_brief">;

export async function findHeroImage(record: Fields): Promise<HeroImageOutcome> {
  return findPexelsImage(record, buildPexelsQuery(record), [], "HERO_IMAGE_MISSING");
}

/**
 * The one inline body photo: its own single search, from the writer's
 * `inline_image_brief`, and never the photo already used as this article's
 * hero (`excludeIds`). Same download, storage and attribution as the hero.
 */
export async function findInlineImage(record: Fields, excludeIds: number[]): Promise<InlineImageOutcome> {
  return findPexelsImage(record, buildInlinePexelsQuery(record), excludeIds, "INLINE_IMAGE_MISSING");
}

async function findPexelsImage<M extends "HERO_IMAGE_MISSING" | "INLINE_IMAGE_MISSING">(
  record: Fields,
  query: string,
  excludeIds: number[],
  missing: M,
): Promise<{ ok: true; image: HeroImageResult } | { ok: false; reason: "PEXELS_NOT_CONFIGURED" | "IMAGE_LOOKUP_FAILED" | M; query?: string }> {
  const apiKey = process.env.PEXELS_API_KEY?.trim();
  if (!apiKey) return { ok: false, reason: "PEXELS_NOT_CONFIGURED" };

  const url = new URL(SEARCH_URL);
  url.searchParams.set("query", query);
  url.searchParams.set("orientation", "landscape");
  url.searchParams.set("size", "large");
  url.searchParams.set("per_page", String(RESULTS_PER_SEARCH));
  url.searchParams.set("page", "1");

  let photos: PexelsPhoto[];
  try {
    const res = await fetch(url, { headers: { Authorization: apiKey }, cache: "no-store", signal: AbortSignal.timeout(20_000) });
    if (!res.ok) {
      console.error("[hero-image] Pexels search failed", { status: res.status });
      return { ok: false, reason: "IMAGE_LOOKUP_FAILED", query };
    }
    const json = (await res.json()) as { photos?: PexelsPhoto[] };
    photos = Array.isArray(json.photos) ? json.photos : [];
  } catch (error) {
    console.error("[hero-image] Pexels search error", { error: String(error) });
    return { ok: false, reason: "IMAGE_LOOKUP_FAILED", query };
  }

  const photo = selectPexelsPhoto(photos, { excludeIds });
  if (!photo) return { ok: false, reason: missing, query };

  const rendition = heroRendition(photo);
  let bytes: ArrayBuffer;
  let contentType: string;
  try {
    // Image CDN, not the API: no credential is sent with this request.
    const res = await fetch(rendition.url, { cache: "no-store", signal: AbortSignal.timeout(30_000) });
    contentType = (res.headers.get("content-type") ?? "").split(";")[0].trim();
    if (!res.ok || !contentType.startsWith("image/")) {
      console.error("[hero-image] Pexels download failed", { status: res.status, contentType, pexelsId: photo.id });
      return { ok: false, reason: "IMAGE_LOOKUP_FAILED", query };
    }
    bytes = await res.arrayBuffer();
  } catch (error) {
    console.error("[hero-image] Pexels download error", { error: String(error), pexelsId: photo.id });
    return { ok: false, reason: "IMAGE_LOOKUP_FAILED", query };
  }
  if (bytes.byteLength === 0 || bytes.byteLength > MAX_IMAGE_BYTES) {
    return { ok: false, reason: "IMAGE_LOOKUP_FAILED", query };
  }

  const title = safeText(record.final_headline, 300);
  return {
    ok: true,
    image: {
      bytes,
      contentType,
      width: rendition.width,
      height: rendition.height,
      // Pexels' own description of what is in the photo; the headline only if it has none.
      alt: safeText(photo.alt ?? "", 300) || title || "Illustrative photo.",
      credit: pexelsCredit(photo),
      photographer: photo.photographer.trim(),
      photographerUrl: photo.photographer_url,
      sourcePage: photo.url,
      pexelsId: photo.id,
      query,
    },
  };
}
