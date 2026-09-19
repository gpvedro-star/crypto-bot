import type { Metadata } from "next";
import { getMostRead, categories, getAllArticles } from "@/lib/content";
import { buildMetadata } from "@/lib/seo";
import { SearchResults } from "./SearchResults";
import { TrendingItem } from "@/components/cards/TrendingItem";
import { CategoryCard } from "@/components/cards/CategoryCard";
import { getArticlesByCategory } from "@/lib/content";

export const metadata: Metadata = buildMetadata({ title: "Search", description: "Search NUVORA stories, AI tools and guides.", path: "/search", noIndex: true });

export default function SearchPage() {
  const articleMap = Object.fromEntries(getAllArticles().map((a) => [a.slug, a]));
  return (
    <div className="container-x">
      <SearchResults articles={articleMap} />
      <div className="mt-16 grid gap-14 lg:grid-cols-12" data-search-browse>
        <section className="lg:col-span-7" aria-labelledby="popular-searches">
          <div className="rounded-card border border-line bg-white p-6">
            <h2 id="popular-searches" className="flex items-center gap-2 font-sans text-[0.8rem] font-semibold uppercase tracking-[0.12em] text-sky-600"><span className="inline-block h-2 w-2 rounded-full bg-sky-500" aria-hidden="true" />Most read this week</h2>
            <ol className="mt-2">{getMostRead(5).map((a, i) => <TrendingItem key={a.slug} article={a} rank={i + 1} showImage={false} />)}</ol>
          </div>
        </section>
        <section className="lg:col-span-5" aria-labelledby="browse">
          <h2 id="browse" className="flex items-center gap-2 font-sans text-[0.8rem] font-semibold uppercase tracking-[0.12em] text-sky-600"><span className="inline-block h-2 w-2 rounded-full bg-sky-500" aria-hidden="true" />Browse by section</h2>
          <div className="mt-6 grid gap-4 sm:grid-cols-2">
            {categories.map((c) => <CategoryCard key={c.slug} category={c} count={getArticlesByCategory(c.slug).length} />)}
          </div>
        </section>
      </div>
    </div>
  );
}
