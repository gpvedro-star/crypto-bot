/**
 * Pure search scoring shared by the server API and the browser (static index).
 */
export type SearchResultType = "article" | "tool" | "guide";

export interface SearchEntry {
  type: SearchResultType;
  title: string;
  description: string;
  href: string;
  category?: string;
  /** Normalized title for prefix matching. */
  t: string;
  /** Normalized haystack of all searchable text. */
  h: string;
}

export interface SearchResult {
  type: SearchResultType;
  title: string;
  description: string;
  href: string;
  category?: string;
  score: number;
}

export function normalize(s: string): string {
  return s.toLowerCase().normalize("NFKD").replace(/[̀-ͯ]/g, "");
}

export function rank(entries: SearchEntry[], query: string, limit = 12): SearchResult[] {
  const q = normalize(query.trim());
  if (q.length < 2) return [];
  const terms = q.split(/\s+/).filter(Boolean);
  const results: SearchResult[] = [];
  for (const e of entries) {
    let score = 0;
    for (const term of terms) {
      if (e.t.includes(term)) score += e.t.startsWith(term) ? 6 : 4;
      else if (e.h.includes(term)) score += 1;
      else { score = 0; break; }
    }
    if (score > 0) {
      if (e.type === "tool") score += 1;
      results.push({ type: e.type, title: e.title, description: e.description, href: e.href, category: e.category, score });
    }
  }
  return results.sort((a, b) => b.score - a.score).slice(0, limit);
}
