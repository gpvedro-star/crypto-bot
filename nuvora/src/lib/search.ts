import { getAllArticles, tools, guides } from "./content";
import type { ArticleWithMeta } from "./content";

export type SearchResultType = "article" | "tool" | "guide";

export interface SearchResult {
  type: SearchResultType;
  title: string;
  description: string;
  href: string;
  category?: string;
  score: number;
}

interface IndexEntry extends Omit<SearchResult, "score"> {
  haystack: string;
  titleText: string;
}

let index: IndexEntry[] | null = null;

function normalize(s: string): string {
  return s.toLowerCase().normalize("NFKD").replace(/[̀-ͯ]/g, "");
}

function buildIndex(): IndexEntry[] {
  const articles: IndexEntry[] = getAllArticles().map((a: ArticleWithMeta) => ({
    type: "article",
    title: a.title,
    description: a.excerpt,
    href: a.href,
    category: a.category,
    titleText: normalize(a.title),
    haystack: normalize([a.title, a.subtitle, a.excerpt, a.tags.join(" "), a.category, a.author.name, (a.tools ?? []).join(" ")].join(" ")),
  }));
  const toolEntries: IndexEntry[] = tools.map((t) => ({
    type: "tool",
    title: t.name,
    description: t.tagline,
    href: `/tools/${t.slug}`,
    titleText: normalize(t.name),
    haystack: normalize([t.name, t.maker, t.tagline, t.description, t.bestUses.join(" ")].join(" ")),
  }));
  const guideEntries: IndexEntry[] = guides.map((g) => ({
    type: "guide",
    title: g.title,
    description: g.description,
    href: `/articles/${g.articleSlug}`,
    titleText: normalize(g.title),
    haystack: normalize([g.title, g.description, g.level].join(" ")),
  }));
  return [...toolEntries, ...guideEntries, ...articles];
}

/**
 * Lightweight in-memory search. Fast enough for thousands of entries; swap
 * for a hosted index (Algolia, Typesense, Postgres FTS) behind the same
 * function signature when the corpus outgrows it.
 */
export function search(query: string, limit = 12): SearchResult[] {
  const q = normalize(query.trim());
  if (q.length < 2) return [];
  index ??= buildIndex();
  const terms = q.split(/\s+/).filter(Boolean);
  const results: SearchResult[] = [];
  for (const entry of index) {
    let score = 0;
    for (const term of terms) {
      if (entry.titleText.includes(term)) score += entry.titleText.startsWith(term) ? 6 : 4;
      else if (entry.haystack.includes(term)) score += 1;
      else { score = 0; break; }
    }
    if (score > 0) {
      if (entry.type === "tool") score += 1;
      results.push({ ...entry, score });
    }
  }
  return results.sort((a, b) => b.score - a.score).slice(0, limit);
}
