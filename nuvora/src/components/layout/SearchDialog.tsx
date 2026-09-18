"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useRef, useState } from "react";
import type { SearchResult } from "@/lib/search";

interface SearchDialogProps {
  open: boolean;
  onClose: () => void;
}

const suggestions = ["ChatGPT", "Claude vs. ChatGPT", "AI agents", "AI safety", "Write better emails", "Plan a vacation"];
const typeLabel: Record<SearchResult["type"], string> = { article: "Story", tool: "AI Tool", guide: "Guide" };

export function SearchDialog({ open, onClose }: SearchDialogProps) {
  const router = useRouter();
  const inputRef = useRef<HTMLInputElement>(null);
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<SearchResult[]>([]);
  const [active, setActive] = useState(0);
  const [loading, setLoading] = useState(false);
  const abortRef = useRef<AbortController | null>(null);

  useEffect(() => {
    if (!open) return;
    const t = window.setTimeout(() => inputRef.current?.focus(), 30);
    document.body.style.overflow = "hidden";
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    document.addEventListener("keydown", onKey);
    return () => {
      window.clearTimeout(t);
      document.body.style.overflow = "";
      document.removeEventListener("keydown", onKey);
    };
  }, [open, onClose]);

  useEffect(() => {
    if (!open) return;
    const q = query.trim();
    if (q.length < 2) return;
    abortRef.current?.abort();
    const controller = new AbortController();
    abortRef.current = controller;
    const t = window.setTimeout(async () => {
      setLoading(true);
      try {
        const res = await fetch(`/api/v1/search?q=${encodeURIComponent(q)}&limit=8`, { signal: controller.signal });
        const data = (await res.json()) as { results: SearchResult[] };
        setResults(data.results);
        setActive(0);
      } catch {
        /* aborted or offline */
      } finally {
        if (!controller.signal.aborted) setLoading(false);
      }
    }, 120);
    return () => window.clearTimeout(t);
  }, [query, open]);

  const submit = useCallback(() => {
    const q = query.trim();
    const hit = query.trim().length >= 2 ? results[active] : undefined;
    if (hit) {
      router.push(hit.href);
      onClose();
    } else if (q) {
      router.push(`/search?q=${encodeURIComponent(q)}`);
      onClose();
    }
  }, [query, results, active, router, onClose]);

  const visible = query.trim().length < 2 ? [] : results;

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center bg-navy-950/60 p-3 pt-[8vh] backdrop-blur-[2px] sm:p-6 sm:pt-[12vh]" onClick={onClose}>
      <div
        role="dialog"
        aria-modal="true"
        aria-label="Search NUVORA"
        className="w-full max-w-2xl overflow-hidden rounded-[8px] bg-white shadow-lift"
        onClick={(e) => e.stopPropagation()}
      >
        <form
          className="flex items-center gap-3 border-b border-line px-4 sm:px-5"
          onSubmit={(e) => {
            e.preventDefault();
            submit();
          }}
        >
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" className="shrink-0 text-navy-700" aria-hidden="true">
            <circle cx="11" cy="11" r="7" />
            <path d="m20 20-3.5-3.5" />
          </svg>
          <input
            ref={inputRef}
            type="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "ArrowDown") { e.preventDefault(); setActive((a) => Math.min(a + 1, visible.length - 1)); }
              if (e.key === "ArrowUp") { e.preventDefault(); setActive((a) => Math.max(a - 1, 0)); }
            }}
            placeholder="Search stories, tools and guides"
            aria-label="Search"
            aria-controls="search-results"
            autoComplete="off"
            className="h-16 w-full bg-transparent font-sans text-[1.1rem] text-ink-900 outline-none placeholder:text-ink-400"
          />
          <button type="button" onClick={onClose} className="rounded px-2 py-1 font-sans text-[0.8rem] font-semibold text-ink-500 hover:bg-mist" aria-label="Close search">
            Esc
          </button>
        </form>

        <div id="search-results" className="max-h-[60vh] overflow-y-auto" aria-live="polite">
          {query.trim().length < 2 ? (
            <div className="px-5 py-5">
              <p className="eyebrow text-ink-500">Try searching for</p>
              <ul className="mt-3 flex flex-wrap gap-2">
                {suggestions.map((s) => (
                  <li key={s}>
                    <button
                      type="button"
                      onClick={() => setQuery(s)}
                      className="min-h-[40px] rounded-full border border-line px-4 font-sans text-[0.9rem] text-ink-700 transition-colors hover:border-navy-900 hover:text-navy-900"
                    >
                      {s}
                    </button>
                  </li>
                ))}
              </ul>
            </div>
          ) : visible.length === 0 ? (
            <p className="px-5 py-8 text-center font-sans text-ink-500">{loading ? "Searching…" : `No results for “${query}”.`}</p>
          ) : (
            <ul>
              {visible.map((r, i) => (
                <li key={r.href}>
                  <Link
                    href={r.href}
                    onClick={onClose}
                    onMouseEnter={() => setActive(i)}
                    className={`flex items-start gap-4 px-5 py-4 transition-colors ${i === active ? "bg-sky-50" : "hover:bg-mist"}`}
                  >
                    <span className="eyebrow mt-1.5 w-16 shrink-0 text-navy-700">{typeLabel[r.type]}</span>
                    <span className="min-w-0">
                      <span className="block font-serif text-[1.15rem] font-semibold leading-snug text-navy-900">{r.title}</span>
                      <span className="mt-0.5 line-clamp-1 block font-sans text-[0.9rem] text-ink-500">{r.description}</span>
                    </span>
                  </Link>
                </li>
              ))}
              <li className="border-t border-line px-5 py-3 font-sans text-[0.85rem] text-ink-500">
                Press Enter to open, or{" "}
                <Link href={`/search?q=${encodeURIComponent(query)}`} onClick={onClose} className="font-semibold text-navy-800 underline">
                  see all results
                </Link>
                .
              </li>
            </ul>
          )}
        </div>
      </div>
    </div>
  );
}
