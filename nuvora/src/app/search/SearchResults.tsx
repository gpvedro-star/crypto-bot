"use client";

import Link from "next/link";
import { Suspense } from "react";
import { useSearchParams } from "next/navigation";
import type { ArticleWithMeta } from "@/lib/content";
import { useSearch } from "@/lib/use-search";
import { SearchForm } from "./SearchForm";
import { HorizontalCard } from "@/components/cards/HorizontalCard";

const typeLabel = { article: "Story", tool: "AI Tool", guide: "Guide" } as const;

function Inner({ articles }: { articles: Record<string, ArticleWithMeta> }) {
  const params = useSearchParams();
  const query = (params.get("q") ?? "").trim();
  const { results, loading } = useSearch(query, 30);

  return (
    <>
      <header className="mx-auto max-w-3xl pt-12 text-center sm:pt-16">
        <p className="flex items-center justify-center gap-2 font-sans text-[0.8rem] font-semibold uppercase tracking-[0.12em] text-sky-500">
          <span className="inline-block h-2 w-2 rounded-full bg-sky-500" aria-hidden="true" />
          Search
        </p>
        <h1 className="headline mt-3 text-[2.4rem] sm:text-[3rem]">{query ? `Results for “${query}”` : "What would you like to understand?"}</h1>
        <div className="mt-8"><SearchForm key={query} initial={query} /></div>
        {query && (
          <p className="mt-4 font-sans text-[0.95rem] text-ink-500" role="status">
            {loading ? "Searching…" : `${results.length} ${results.length === 1 ? "result" : "results"}`}
          </p>
        )}
      </header>

      {query && !loading && (
        <section className="mx-auto mt-12 max-w-4xl" aria-label="Search results">
          {results.length === 0 ? (
            <div className="rounded-card border border-line bg-white p-8 text-center">
              <p className="font-serif text-[1.4rem] font-semibold text-navy-900">No results for “{query}”.</p>
              <p className="mt-2 text-ink-700">Try a tool name like “ChatGPT”, or a topic like “email” or “safety”.</p>
            </div>
          ) : (
            <ul className="divide-y divide-line">
              {results.map((r) => {
                const article = r.type === "article" ? articles[r.href.replace("/articles/", "")] : undefined;
                return (
                  <li key={r.href} className="py-8">
                    {article ? (
                      <HorizontalCard article={article} />
                    ) : (
                      <Link href={r.href} className="group block">
                        <span className="pill bg-sky-100 text-navy-800">{typeLabel[r.type]}</span>
                        <span className="title mt-3 block text-[1.4rem]">{r.title}</span>
                        <span className="mt-2 block text-ink-500">{r.description}</span>
                      </Link>
                    )}
                  </li>
                );
              })}
            </ul>
          )}
        </section>
      )}
    </>
  );
}

export function SearchResults({ articles }: { articles: Record<string, ArticleWithMeta> }) {
  return (
    <Suspense fallback={<div className="mx-auto max-w-3xl pt-16 text-center"><h1 className="headline text-[2.4rem] sm:text-[3rem]">Search</h1></div>}>
      <Inner articles={articles} />
    </Suspense>
  );
}
