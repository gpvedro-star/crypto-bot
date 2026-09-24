import type { Article, CategorySlug, ImageAsset } from "@/content/types";
import { categories } from "@/content/categories";
import { BRAND_BYLINE_SLUG } from "@/content/authors";
import type { EditorialRecord, EditorialSource } from "./contract";
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

const CATEGORY_SLUGS = new Set<string>(categories.map((c) => c.slug));

/** Common ways the editorial office might name a section. */
const CATEGORY_ALIASES: Record<string, CategorySlug> = {
  "ai-news": "news",
  news: "news",
  "breaking-news": "news",
  tools: "tools",
  "tool-reviews": "reviews",
  "ai-tools": "tools",
  reviews: "reviews",
  review: "reviews",
  "everyday-ai": "everyday-ai",
  everyday: "everyday-ai",
  "ai-for-everyday-life": "everyday-ai",
  "ai-at-work": "ai-at-work",
  work: "ai-at-work",
  business: "ai-at-work",
  guides: "guides",
  guide: "guides",
  "how-to": "guides",
  explainers: "guides",
};

function slugifyLoose(value: string): string {
  return value
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

/** Never throws: an unrecognised section falls back to News rather than 404ing. */
export function resolveCategory(value: unknown): CategorySlug {
  const key = slugifyLoose(typeof value === "string" ? value : "");
  if (CATEGORY_SLUGS.has(key)) return key as CategorySlug;
  return CATEGORY_ALIASES[key] ?? "news";
}

const FALLBACK_IMAGE: ImageAsset = {
  src: "/images/editorial/placeholder.svg",
  alt: "",
  width: 1600,
  height: 1000,
};

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

  const assets = (Array.isArray(record.image_assets) ? record.image_assets : [])
    .map((a) => toImageAsset(a, title))
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
    status: "published",
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
