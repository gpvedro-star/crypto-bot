import type { Metadata } from "next";
import Link from "next/link";
import { search } from "@/lib/search";
import { getArticle, getMostRead, categories } from "@/lib/content";
import { buildMetadata } from "@/lib/seo";
import { SearchForm } from "./SearchForm";
import { HorizontalCard } from "@/components/cards/HorizontalCard";
import { TrendingItem } from "@/components/cards/TrendingItem";
import { CategoryCard } from "@/components/cards/CategoryCard";
import { getArticlesByCategory } from "@/lib/content";

export const metadata: Metadata = buildMetadata({ title: "Search", description: "Search NUVORA stories, AI tools and guides.", path: "/search", noIndex: true });

export default async function SearchPage({ searchParams }: { searchParams: Promise<{ q?: string }> }) {
  const { q = "" } = await searchParams;
  const query = q.trim();
  const results = query ? search(query, 30) : [];
  const typeLabel = { article: "Story", tool: "AI Tool", guide: "Guide" } as const;

  return (
    <div className="container-x">
      <header className="mx-auto max-w-3xl pt-12 text-center sm:pt-16">
        <p className="eyebrow text-navy-700">Search</p>
        <h1 className="headline mt-2 text-[2.4rem] sm:text-[3rem]">{query ? `Results for “${query}”` : "What would you like to understand?"}</h1>
        <div className="mt-8"><SearchForm initial={query} /></div>
        {query && <p className="mt-4 font-sans text-[0.95rem] text-ink-500" role="status">{results.length} {results.length === 1 ? "result" : "results"}</p>}
      </header>

      {query ? (
        <section className="mx-auto mt-12 max-w-4xl" aria-label="Search results">
          {results.length === 0 ? (
            <div className="rounded-card border border-line bg-white p-8 text-center">
              <p className="font-serif text-[1.4rem] font-semibold text-navy-900">No results for “{query}”.</p>
              <p className="mt-2 text-ink-700">Try a tool name like “ChatGPT”, or a topic like “email” or “safety”.</p>
            </div>
          ) : (
            <ul className="divide-y divide-line">
              {results.map((r) => {
                const article = r.type === "article" ? getArticle(r.href.replace("/articles/", "")) : undefined;
                return (
                  <li key={r.href} className="py-8">
                    {article ? (
                      <HorizontalCard article={article} />
                    ) : (
                      <Link href={r.href} className="group block">
                        <span className="eyebrow text-navy-700">{typeLabel[r.type]}</span>
                        <span className="headline link-underline mt-2 block text-[1.4rem]">{r.title}</span>
                        <span className="mt-2 block text-ink-700">{r.description}</span>
                      </Link>
                    )}
                  </li>
                );
              })}
            </ul>
          )}
        </section>
      ) : (
        <div className="mt-16 grid gap-14 lg:grid-cols-12">
          <section className="lg:col-span-7" aria-labelledby="popular-searches">
            <div className="rule-navy pt-4"><h2 id="popular-searches" className="eyebrow text-navy-900">Most read this week</h2></div>
            <ol>{getMostRead(5).map((a, i) => <TrendingItem key={a.slug} article={a} rank={i + 1} />)}</ol>
          </section>
          <section className="lg:col-span-5" aria-labelledby="browse">
            <div className="rule-navy pt-4"><h2 id="browse" className="eyebrow text-navy-900">Browse by section</h2></div>
            <div className="mt-6 grid gap-4 sm:grid-cols-2">
              {categories.map((c) => <CategoryCard key={c.slug} category={c} count={getArticlesByCategory(c.slug).length} />)}
            </div>
          </section>
        </div>
      )}
    </div>
  );
}
