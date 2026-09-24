import type { ArticleWithMeta } from "@/lib/content";
import { absoluteUrl } from "@/lib/seo";
import { categoryMap } from "@/content/categories";

/** Public, automation-friendly article representation (no content blocks). */
export function serializeArticleSummary(a: ArticleWithMeta) {
  return {
    id: a.id,
    slug: a.slug,
    url: absoluteUrl(a.href),
    title: a.title,
    subtitle: a.subtitle,
    excerpt: a.excerpt,
    shortSummary: a.shortSummary,
    category: { slug: a.category, name: categoryMap[a.category].name },
    tags: a.tags,
    author: { slug: a.author.slug, name: a.author.name, role: a.author.role },
    publishedAt: a.publishedAt,
    updatedAt: a.updatedAt,
    readingTime: a.readingTime,
    featuredImage: { ...a.featuredImage, src: absoluteUrl(a.featuredImage.src) },
    flags: { featured: !!a.featured, trending: !!a.trending, popular: !!a.popular, breaking: !!a.breaking, sponsored: !!a.sponsored },
    seo: { title: a.seoTitle ?? a.title, description: a.seoDescription ?? a.excerpt },
    social: { summary: a.socialSummary ?? a.shortSummary, captions: a.socialCaptions ?? {}, hashtags: a.hashtags ?? [] },
    keyPoints: a.keyPoints ?? a.keyTakeaways ?? [],
    tools: a.tools ?? [],
  };
}

export function serializeArticleFull(a: ArticleWithMeta) {
  return {
    ...serializeArticleSummary(a),
    content: a.content,
    images: (a.images ?? []).map((img) => ({ ...img, src: absoluteUrl(img.src) })),
    relatedArticles: a.relatedArticles ?? [],
    affiliateLinks: a.affiliateLinks ?? [],
  };
}

/**
 * Shared cache header for the public read API. Sixty seconds matches the
 * revalidation window the pages use, so an automation client never sees
 * content much older than a reader does. A CDN copy is not dropped by
 * on-demand revalidation, so this window is the real worst case for the JSON
 * API after a publish; pages update on the next request.
 */
export const publicCache = { "Cache-Control": "public, s-maxage=60, stale-while-revalidate=300" };
