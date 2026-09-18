import type { MetadataRoute } from "next";
import { authors, categories, getAllArticles, tools } from "@/lib/content";
import { staticPages } from "@/content/pages";
import { absoluteUrl } from "@/lib/seo";

export default function sitemap(): MetadataRoute.Sitemap {
  const articles = getAllArticles();
  const newest = articles[0]?.updatedAt ?? new Date().toISOString();
  return [
    { url: absoluteUrl("/"), lastModified: newest, changeFrequency: "hourly", priority: 1 },
    { url: absoluteUrl("/latest"), lastModified: newest, changeFrequency: "hourly", priority: 0.9 },
    ...categories.map((c) => ({ url: absoluteUrl(`/${c.slug}`), lastModified: newest, changeFrequency: "daily" as const, priority: 0.8 })),
    ...articles.map((a) => ({
      url: absoluteUrl(a.href),
      lastModified: a.updatedAt,
      changeFrequency: "weekly" as const,
      priority: a.featured ? 0.9 : 0.7,
      images: [absoluteUrl(a.featuredImage.src)],
    })),
    ...tools.map((t) => ({ url: absoluteUrl(`/tools/${t.slug}`), lastModified: t.updatedAt, changeFrequency: "weekly" as const, priority: 0.7 })),
    ...authors.map((a) => ({ url: absoluteUrl(`/authors/${a.slug}`), changeFrequency: "weekly" as const, priority: 0.4 })),
    { url: absoluteUrl("/newsletter"), changeFrequency: "monthly", priority: 0.6 },
    ...staticPages.map((p) => ({ url: absoluteUrl(`/${p.slug}`), lastModified: `${p.updatedAt}T00:00:00Z`, changeFrequency: "monthly" as const, priority: 0.3 })),
  ];
}
