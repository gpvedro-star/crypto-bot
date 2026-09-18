import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { categories, getAllArticles, getArticlesByCategory, getCategory, getMostRead, guides, tools } from "@/lib/content";
import type { ArticleWithMeta } from "@/lib/content";
import type { CategorySlug } from "@/content/types";
import { buildMetadata, breadcrumbSchema } from "@/lib/seo";
import { JsonLd } from "@/components/ui/JsonLd";
import { Breadcrumbs } from "@/components/article/Breadcrumbs";
import { FeatureCard } from "@/components/cards/FeatureCard";
import { HorizontalCard } from "@/components/cards/HorizontalCard";
import { ImageCard } from "@/components/cards/ImageCard";
import { TrendingItem } from "@/components/cards/TrendingItem";
import { ToolCard } from "@/components/cards/ToolCard";
import { GuideCard } from "@/components/cards/GuideCard";
import { CategoryCard } from "@/components/cards/CategoryCard";
import { SectionHeading } from "@/components/ui/SectionHeading";
import { NewsletterBlock } from "@/components/sections/NewsletterBlock";
import { AdSlot } from "@/components/ads/AdSlot";
import { Reveal } from "@/components/ui/Reveal";

interface Params {
  category: string;
}

const LATEST = {
  slug: "latest",
  name: "Latest",
  label: "Latest",
  description: "Every story, newest first.",
  tagline: "Everything we have published, in order.",
  seoTitle: "Latest AI Stories",
  seoDescription: "The newest stories from NUVORA, the magazine that explains artificial intelligence for normal people.",
};

function resolve(slug: string) {
  if (slug === "latest") return { meta: LATEST, articles: getAllArticles(), isLatest: true };
  const cat = getCategory(slug);
  if (!cat) return null;
  return { meta: cat, articles: getArticlesByCategory(cat.slug as CategorySlug), isLatest: false };
}

export function generateStaticParams(): Params[] {
  return [{ category: "latest" }, ...categories.map((c) => ({ category: c.slug }))];
}

export const dynamicParams = false;

export async function generateMetadata({ params }: { params: Promise<Params> }): Promise<Metadata> {
  const { category } = await params;
  const r = resolve(category);
  if (!r) return {};
  return buildMetadata({ title: r.meta.seoTitle, description: r.meta.seoDescription, path: `/${category}` });
}

export default async function CategoryPage({ params }: { params: Promise<Params> }) {
  const { category } = await params;
  const r = resolve(category);
  if (!r) notFound();
  const { meta, articles, isLatest } = r;
  const [lead, ...rest] = articles;
  const popular = getMostRead(8).filter((a) => isLatest || a.category === category).slice(0, 5);
  const showTools = category === "tools";
  const showGuides = category === "guides";

  return (
    <>
      <JsonLd data={breadcrumbSchema([{ name: "Home", path: "/" }, { name: meta.name, path: `/${category}` }])} />
      <div className="container-x">
        <Breadcrumbs items={[{ name: meta.name }]} />
        <header className="pb-6 pt-8 sm:pt-12">
          <p className="flex items-center gap-2 font-sans text-[0.8rem] font-semibold uppercase tracking-[0.12em] text-sky-500">
            <span className="inline-block h-2 w-2 rounded-full bg-sky-500" aria-hidden="true" />
            {isLatest ? "All stories" : "Section"} · {articles.length} {articles.length === 1 ? "story" : "stories"}
          </p>
          <h1 className="headline mt-3 text-[2.8rem] sm:text-[4rem]">{meta.name}</h1>
          <p className="mt-4 max-w-2xl text-[1.2rem] leading-relaxed text-ink-500 sm:text-[1.3rem]">{meta.tagline}</p>
        </header>
      </div>

      <AdSlot name="category-top" className="container-x mt-8" />

      {showTools && (
        <section className="container-x mt-12" aria-labelledby="tool-directory">
          <SectionHeading title="The Tool Directory" kicker="Explained, one by one" description="Each tool gets its own plain-English page: what it is, who it is for, and what it costs." />
          <div className="mt-8 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {tools.map((t, i) => (
              <Reveal key={t.slug} delay={i * 50}><ToolCard tool={t} /></Reveal>
            ))}
          </div>
        </section>
      )}

      {showGuides && (
        <section className="container-x mt-12" aria-labelledby="guide-library">
          <SectionHeading title="Start With a Guide" kicker="Step by step" description="Four guides that begin from zero." />
          <div className="mt-8 grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
            {guides.map((g, i) => (
              <Reveal key={g.slug} delay={i * 60}><GuideCard guide={g} index={i} /></Reveal>
            ))}
          </div>
        </section>
      )}

      {lead && (
        <section className="container-x mt-12" aria-label="Featured story">
          <div className="grid gap-10 lg:grid-cols-12 lg:gap-14">
            <div className="lg:col-span-8">
              <FeatureCard article={lead} size="lg" sizes="(min-width: 1024px) 66vw, 100vw" priority />
            </div>
            <aside className="lg:col-span-4">
              <div className="rounded-card border border-line bg-white p-6">
              <p className="flex items-center gap-2 font-sans text-[0.8rem] font-semibold uppercase tracking-[0.12em] text-sky-600"><span className="inline-block h-2 w-2 rounded-full bg-sky-500" aria-hidden="true" />Popular in {meta.name}</p>
              <ol className="mt-2">
                {(popular.length ? popular : rest.slice(0, 5)).map((a, i) => (
                  <TrendingItem key={a.slug} article={a} rank={i + 1} />
                ))}
              </ol>
              </div>
            </aside>
          </div>
        </section>
      )}

      {rest.length > 0 && (
        <section className="container-x mt-20" aria-labelledby="latest-in-section">
          <SectionHeading title={`Latest in ${meta.name}`} kicker="Newest first" />
          <div className="mt-8 grid gap-10 lg:grid-cols-2 lg:gap-12">
            {rest.slice(0, 2).map((a, i) => (
              <Reveal key={a.slug} delay={i * 70}><HorizontalCard article={a} /></Reveal>
            ))}
          </div>
          {rest.length > 2 && (
            <div className="mt-12 grid gap-8 border-t border-line pt-10 sm:grid-cols-2 lg:grid-cols-3">
              {rest.slice(2).map((a: ArticleWithMeta, i: number) => (
                <Reveal key={a.slug} delay={(i % 3) * 70}><ImageCard article={a} showExcerpt sizes="(min-width: 1024px) 33vw, (min-width: 640px) 50vw, 100vw" /></Reveal>
              ))}
            </div>
          )}
        </section>
      )}

      {isLatest && (
        <section className="container-x mt-20" aria-labelledby="browse-sections">
          <SectionHeading title="Browse by Section" kicker="Sections" />
          <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {categories.map((c) => (
              <CategoryCard key={c.slug} category={c} count={getArticlesByCategory(c.slug).length} />
            ))}
          </div>
        </section>
      )}

      <div className="mt-20">
        <NewsletterBlock source={`category-${category}`} />
      </div>
    </>
  );
}
