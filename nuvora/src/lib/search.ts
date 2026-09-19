import { getAllArticles, tools, guides } from "./content";
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
  const guideEntries: SearchEntry[] = guides.map((g) => ({
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

/**
 * Lightweight in-memory search. Fast enough for thousands of entries; swap
 * for a hosted index behind the same signature when the corpus outgrows it.
 */
export function search(query: string, limit = 12): SearchResult[] {
  return rank(getSearchIndex(), query, limit);
}
