import type { Article, ImageAsset } from "@/content/types";
import { BRAND_BYLINE_SLUG } from "@/content/authors";
import type { EditorialRecord, EditorialSource } from "./contract";
import { resolveCategory } from "./contract";
import { safeImageUrl, safeLinkUrl, safeText, toContentBlocks, toImageAsset } from "./body";

/**
 * Maps a stored editorial record onto the site's `Article` shape, so published
 * records render through the same components as file-based content. Nothing
 * here invents editorial signals: no `featured`, `trending` or `popular` flag
 * is ever set from a submission, because those are desk judgements and, in the
 * case of "most read", readership data the site does not have.
 *
 * The byline is always the publication. A submission's `author` string is kept
 * in the record for the desk but never presented as a person on the site.
 */

// Category resolution lives in ./contract.ts (single source of truth for
// both submission validation and the auto-publish gate).

const FALLBACK_IMAGE: ImageAsset = {
  src: "/images/editorial/placeholder.svg",
  alt: "",
  width: 1600,
  height: 1000,
  // Cards still need something in the frame; the article opening does not,
  // and shows no hero rather than presenting fallback art as a photograph.
  placeholder: true,
};

/** Record lifecycle onto the site's article status. Anything short of published is a draft. */
function siteStatus(record: EditorialRecord): Article["status"] {
  if (record.publish_status === "published") return "published";
  if (record.publish_status === "scheduled") return "scheduled";
  return "draft";
}

/**
 * Focal point from the image asset, as "x% y%". Accepts 0–1 fractions or
 * percentages under `focal_point`/`focalPoint`/`focal`, as {x, y} or "x y".
 */
function focalFrom(input: unknown): string | undefined {
  if (!input || typeof input !== "object") return undefined;
  const a = input as Record<string, unknown>;
  const raw = a.focal_point ?? a.focalPoint ?? a.focal;
  let x: number | undefined;
  let y: number | undefined;
  if (raw && typeof raw === "object") {
    x = Number((raw as Record<string, unknown>).x);
    y = Number((raw as Record<string, unknown>).y);
  } else if (typeof raw === "string") {
    const m = /^\s*(-?[\d.]+)%?\s*[ ,]\s*(-?[\d.]+)%?\s*$/.exec(raw);
    if (m) {
      x = Number(m[1]);
      y = Number(m[2]);
    }
  }
  if (x === undefined || y === undefined || !Number.isFinite(x) || !Number.isFinite(y)) return undefined;
  const pct = (v: number) => Math.min(100, Math.max(0, v <= 1 ? v * 100 : v));
  return `${pct(x).toFixed(0)}% ${pct(y).toFixed(0)}%`;
}

function shorten(text: string, max: number): string {
  if (text.length <= max) return text;
  const cut = text.slice(0, max);
  const lastSpace = cut.lastIndexOf(" ");
  return `${(lastSpace > max * 0.6 ? cut.slice(0, lastSpace) : cut).replace(/[,;:.\s]+$/, "")}…`;
}

function mapSources(value: unknown): Article["sources"] {
  if (!Array.isArray(value)) return undefined;
  const out = value
    .map((s) => {
      const src = s as Partial<EditorialSource>;
      const url = safeLinkUrl(src?.url);
      const title = safeText(src?.title, 300);
      if (!url || !title) return null;
      const publisher = safeText(src?.publisher, 160);
      return { title, url, ...(publisher ? { publisher } : {}) };
    })
    .filter((s): s is NonNullable<typeof s> => Boolean(s))
    .slice(0, 30);
  return out.length ? out : undefined;
}

function isoOr(value: unknown, fallback: string): string {
  if (typeof value !== "string") return fallback;
  const t = Date.parse(value);
  return Number.isNaN(t) ? fallback : new Date(t).toISOString();
}

/** A published record as site content. */
export function recordToArticle(record: EditorialRecord): Article {
  const title = safeText(record.final_headline ?? record.working_headline, 300) || "Untitled";
  const summary = safeText(record.summary, 1200);
  const content = toContentBlocks(record.article_body);

  const rawAssets = Array.isArray(record.image_assets) ? record.image_assets : [];
  const assets = rawAssets
    .map((a) => {
      const image = toImageAsset(a, title);
      if (!image) return null;
      const focal = focalFrom(a);
      return focal ? { ...image, focal } : image;
    })
    .filter((a): a is ImageAsset => Boolean(a));
  const featuredImage = assets[0] ?? FALLBACK_IMAGE;

  const created = isoOr(record.created_at, new Date(0).toISOString());
  const publishedAt = isoOr(record.published_at, isoOr(record.updated_at, created));

  const takeaways = (Array.isArray(record.key_takeaways) ? record.key_takeaways : [])
    .map((t) => safeText(t, 400))
    .filter(Boolean)
    .slice(0, 8);

  const keywords = (Array.isArray(record.keywords) ? record.keywords : [])
    .map((k) => safeText(k, 60))
    .filter(Boolean)
    .slice(0, 12);

  return {
    id: record.id,
    slug: record.slug,
    title,
    subtitle: summary,
    excerpt: shorten(summary, 220),
    shortSummary: shorten(summary, 130),
    content,
    category: resolveCategory(record.category),
    tags: keywords,
    authorSlug: BRAND_BYLINE_SLUG,
    // Public routes only ever receive published records (see isRenderable);
    // the preview needs the real state so it never shows a draft as published.
    status: siteStatus(record),
    publishedAt,
    updatedAt: isoOr(record.updated_at, publishedAt),
    featuredImage,
    images: assets.slice(1),
    seoTitle: safeText(record.seo_title, 200) || undefined,
    seoDescription: safeText(record.seo_description, 320) || undefined,
    keyTakeaways: takeaways.length ? takeaways : undefined,
    sources: mapSources(record.sources),
  };
}

/** Guards against a record whose body did not survive conversion. */
export function isRenderable(record: EditorialRecord): boolean {
  if (record.publish_status !== "published") return false;
  if (!record.slug || !/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(record.slug)) return false;
  if (!safeText(record.final_headline, 300)) return false;
  return toContentBlocks(record.article_body).length > 0;
}

/** Exposed for the preview route, which renders drafts for authenticated eyes only. */
export { safeImageUrl };
