export const dynamic = "force-static";

import { getAllArticles } from "@/lib/content";
import { categoryMap } from "@/content/categories";
import { absoluteUrl } from "@/lib/seo";
import { site } from "@/content/site";

/** Escapes the five XML entities. Feed values are plain text, never markup. */
function xml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
}

/**
 * RSS 2.0 feed. `layout.tsx` has always advertised /feed.xml in
 * `alternates.types`; this makes that link resolve.
 */
export function GET() {
  const articles = getAllArticles().slice(0, 30);
  const updated = articles[0]?.updatedAt ?? new Date().toISOString();

  const items = articles
    .map((article) => {
      const url = absoluteUrl(article.href);
      return `    <item>
      <title>${xml(article.title)}</title>
      <link>${xml(url)}</link>
      <guid isPermaLink="true">${xml(url)}</guid>
      <description>${xml(article.excerpt)}</description>
      <category>${xml(categoryMap[article.category].name)}</category>
      <dc:creator>${xml(article.author.name)}</dc:creator>
      <pubDate>${new Date(article.publishedAt).toUTCString()}</pubDate>
    </item>`;
    })
    .join("\n");

  const body = `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0" xmlns:atom="http://www.w3.org/2005/Atom" xmlns:dc="http://purl.org/dc/elements/1.1/">
  <channel>
    <title>${xml(`${site.name} — ${site.tagline}`)}</title>
    <link>${xml(site.url)}</link>
    <atom:link href="${xml(absoluteUrl("/feed.xml"))}" rel="self" type="application/rss+xml" />
    <description>${xml(site.description)}</description>
    <language>${xml(site.language)}</language>
    <lastBuildDate>${new Date(updated).toUTCString()}</lastBuildDate>
    <copyright>${xml(`© ${new Date().getFullYear()} ${site.publisher.legalName}`)}</copyright>
${items}
  </channel>
</rss>
`;

  return new Response(body, {
    headers: {
      "Content-Type": "application/rss+xml; charset=utf-8",
      "Cache-Control": "public, max-age=0, must-revalidate",
    },
  });
}
