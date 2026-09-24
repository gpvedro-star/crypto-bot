import { authors, getAuthor } from "@/content/authors";
import { guides } from "@/content/guides";
import type { Article, CategorySlug } from "@/content/types";
import { getAllArticles, type ArticleWithMeta } from "./content";
import { readingTimeMinutes } from "./reading-time";
import { getEditorialStore } from "./editorial/store";
import type { EditorialRecord } from "./editorial/contract";
import { isRenderable, recordToArticle } from "./editorial/publish-map";

/**
 * The live content layer: file-based articles plus PUBLISHED editorial records
 * from Netlify Blobs.
 *
 * Only `publish_status === "published"` records are ever returned here, and
 * this module is the only way Blobs content reaches a public page. Drafts,
 * in-review and scheduled records are filtered out at the source, so there is
 * no public route — page, feed, sitemap, search or API — that can surface one.
 *
 * Reads are deduplicated per request and pages cache their render (see each
 * route's `revalidate`), so a page view costs at most one Blobs list per
 * revalidation window rather than one per visitor.
 */

function decorate(article: Article): ArticleWithMeta {
  const author = getAuthor(article.authorSlug) ?? authors[authors.length - 1];
  return {
    ...article,
    readingTime: article.readingTime ?? readingTimeMinutes(article.content),
    author,
    href: `/articles/${article.slug}`,
  };
}

const byDateDesc = (a: Article, b: Article) =>
  new Date(b.publishedAt).getTime() - new Date(a.publishedAt).getTime();

/** Published records only. Never throws: Blobs being unavailable degrades to file content. */
async function publishedRecords(): Promise<EditorialRecord[]> {
  const store = getEditorialStore();
  if (!store) return [];
  try {
    const all = await store.list();
    return all.filter(isRenderable);
  } catch (error) {
    console.error("[live-content] could not read editorial store", error);
    return [];
  }
}

let inflight: Promise<ArticleWithMeta[]> | null = null;

/**
 * Every article the public site may show, newest first.
 *
 * File-based content wins a slug collision: a published record cannot take
 * over a URL the repository already owns.
 */
export function getLiveArticles(): Promise<ArticleWithMeta[]> {
  // One fetch per render pass, shared by every section on the page.
  if (inflight) return inflight;
  const run = (async () => {
    const statics = getAllArticles();
    const taken = new Set(statics.map((a) => a.slug));
    const live = (await publishedRecords())
      .filter((r) => !taken.has(r.slug))
      .map((r) => decorate(recordToArticle(r)));
    return [...statics, ...live].sort(byDateDesc);
  })();
  inflight = run;
  // Hold it only for the current tick: each render pass gets fresh data.
  run.finally(() => {
    if (inflight === run) inflight = null;
  });
  return run;
}

export async function getLiveArticle(slug: string): Promise<ArticleWithMeta | undefined> {
  return (await getLiveArticles()).find((a) => a.slug === slug);
}

export async function getLiveByCategory(slug: CategorySlug): Promise<ArticleWithMeta[]> {
  return (await getLiveArticles()).filter((a) => a.category === slug);
}

export async function getLiveByAuthor(slug: string): Promise<ArticleWithMeta[]> {
  return (await getLiveArticles()).filter((a) => a.authorSlug === slug);
}

export async function getLiveByTool(toolSlug: string): Promise<ArticleWithMeta[]> {
  return (await getLiveArticles()).filter((a) => a.tools?.includes(toolSlug));
}

export async function getLiveLead(): Promise<ArticleWithMeta | undefined> {
  const all = await getLiveArticles();
  return all.find((a) => a.featured) ?? all[0];
}

export async function getLiveFeatured(limit = 5): Promise<ArticleWithMeta[]> {
  return (await getLiveArticles()).filter((a) => a.featured).slice(0, limit);
}

export async function getLiveTrending(limit = 5): Promise<ArticleWithMeta[]> {
  return (await getLiveArticles()).filter((a) => a.trending).slice(0, limit);
}

/**
 * "Most read" stays flag-driven. The site has no readership data, and an
 * editorial submission cannot assert one, so records never populate it.
 */
export async function getLiveMostRead(limit = 5): Promise<ArticleWithMeta[]> {
  return (await getLiveArticles()).filter((a) => a.popular).slice(0, limit);
}

export async function getLiveLatest(limit = 8, exclude: string[] = []): Promise<ArticleWithMeta[]> {
  return (await getLiveArticles()).filter((a) => !exclude.includes(a.slug)).slice(0, limit);
}

export async function getLiveRelated(article: Article, limit = 4): Promise<ArticleWithMeta[]> {
  const all = await getLiveArticles();
  const explicit = (article.relatedArticles ?? [])
    .map((s) => all.find((a) => a.slug === s))
    .filter((a): a is ArticleWithMeta => Boolean(a));
  if (explicit.length >= limit) return explicit.slice(0, limit);
  const fill = all.filter(
    (a) =>
      a.slug !== article.slug &&
      !explicit.some((e) => e.slug === a.slug) &&
      (a.category === article.category || a.tags.some((t) => article.tags.includes(t))),
  );
  return [...explicit, ...fill].slice(0, limit);
}

/** Guides whose target article is published — including records published live. */
export async function getLiveGuides() {
  const all = await getLiveArticles();
  return guides.filter((g) => all.some((a) => a.slug === g.articleSlug));
}
