"use client";

import { useEffect, useState } from "react";
import { rank, type SearchEntry, type SearchResult } from "./search-core";

let cache: Promise<SearchEntry[]> | null = null;
const EMPTY: SearchResult[] = [];

function loadIndex(): Promise<SearchEntry[]> {
  cache ??= fetch("/search-index.json").then((r) => r.json() as Promise<SearchEntry[]>).catch(() => {
    cache = null;
    return [];
  });
  return cache;
}

/** Client-side search over the static index: instant, and independent of any server. */
export function useSearch(query: string, limit = 10): { results: SearchResult[]; loading: boolean } {
  const [results, setResults] = useState<SearchResult[]>(EMPTY);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const q = query.trim();
    if (q.length < 2) return;
    let cancelled = false;
    const t = window.setTimeout(async () => {
      setLoading(true);
      const entries = await loadIndex();
      if (cancelled) return;
      setResults(rank(entries, q, limit));
      setLoading(false);
    }, 80);
    return () => {
      cancelled = true;
      window.clearTimeout(t);
    };
  }, [query, limit]);

  // A stable empty array keeps consumers that compare by identity from re-rendering forever.
  return { results: query.trim().length < 2 ? EMPTY : results, loading };
}
