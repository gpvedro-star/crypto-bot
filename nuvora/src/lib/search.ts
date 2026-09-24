import { getAllArticles, tools, getPublishedGuides } from "./content";
import { getLiveArticles, getLiveGuides } from "./live-content";
import { normalize, rank, type SearchEntry, type SearchResult } from "./search-core";

export type { SearchResult, SearchResultType } from "./search-core";

let index: SearchEntry[] | null = null;

/** Builds the search index once per process. Also served statically at /search-index.json. */
export function getSearchIndex(): SearchEntry[] {
  if (index) return index;
  const articles: SearchEntry[] = getAllArticles().map((a) => ({
    type: "article",
    title: a.title,
    description: a.excerpt,
    href: a.href,
    category: a.category,
    t: normalize(a.title),
    h: normalize([a.title, a.subtitle, a.excerpt, a.tags.join(" "), a.category, a.author.name, (a.tools ?? []).join(" ")].join(" ")),
  }));
  const toolEntries: SearchEntry[] = tools.map((t) => ({
    type: "tool",
    title: t.name,
    description: t.tagline,
    href: `/tools/${t.slug}`,
    t: normalize(t.name),
    h: normalize([t.name, t.maker, t.tagline, t.description, t.bestUses.join(" ")].join(" ")),
  }));
  // A guide whose article is unpublished would be a search result leading to a
  // 404, so only guides with a live target are indexed.
  const guideEntries: SearchEntry[] = getPublishedGuides().map((g) => ({
    type: "guide",
    title: g.title,
    description: g.description,
    href: `/articles/${g.articleSlug}`,
    t: normalize(g.title),
    h: normalize([g.title, g.description, g.level].join(" ")),
  }));
  index = [...toolEntries, ...guideEntries, ...articles];
  return index;
}

function articleEntry(a: {
  title: string;
  excerpt: string;
  href: string;
  category: string;
  subtitle: string;
  tags: string[];
  author: { name: string };
  tools?: string[];
}): SearchEntry {
  return {
    type: "article",
    title: a.title,
    description: a.excerpt,
    href: a.href,
    category: a.category,
    t: normalize(a.title),
    h: normalize([a.title, a.subtitle, a.excerpt, a.tags.join(" "), a.category, a.author.name, (a.tools ?? []).join(" ")].join(" ")),
  };
}

/**
 * Search index including editorial records published to Blobs. Not memoised:
 * the routes that serve it cache their own output, and a stale module-level
 * cache would keep a newly published story out of search until a rebuild.
 */
export async function getLiveSearchIndex(): Promise<SearchEntry[]> {
  const base = getSearchIndex();
  const nonArticles = base.filter((e) => e.type !== "article");
  const articles = (await getLiveArticles()).map(articleEntry);
  const guideHrefs = new Set((await getLiveGuides()).map((g) => `/articles/${g.articleSlug}`));
  const guides = nonArticles.filter((e) => e.type !== "guide" || guideHrefs.has(e.href));
  return [...guides, ...articles];
}

/**
 * Lightweight in-memory search. Fast enough for thousands of entries; swap
 * for a hosted index behind the same signature when the corpus outgrows it.
 */
export function search(query: string, limit = 12): SearchResult[] {
  return rank(getSearchIndex(), query, limit);
}

/** Server-side search across published content, including live records. */
export async function liveSearch(query: string, limit = 12): Promise<SearchResult[]> {
  return rank(await getLiveSearchIndex(), query, limit);
}
