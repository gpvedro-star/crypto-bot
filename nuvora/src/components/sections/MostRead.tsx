import type { ArticleWithMeta } from "@/lib/content";
import { TrendingItem } from "@/components/cards/TrendingItem";
import { SectionHeading } from "@/components/ui/SectionHeading";
import { FeatureCard } from "@/components/cards/FeatureCard";
import { Reveal } from "@/components/ui/Reveal";

/** Ranked "Most Read This Week" beside an editor's pick. Used on section pages. */
export function MostRead({ articles, feature }: { articles: ArticleWithMeta[]; feature?: ArticleWithMeta }) {
  return (
    <section aria-labelledby="most-read-heading" className="container-x">
      <div className="grid gap-12 rounded-card bg-navy-900 p-6 text-white sm:p-10 lg:grid-cols-12 lg:gap-16 lg:p-14">
        <div className="lg:col-span-7">
          <SectionHeading id="most-read-heading" title="Most read this week" kicker="Popular" tone="dark" />
          <ol className="mt-4">
            {articles.map((a, i) => (
              <TrendingItem key={a.slug} article={a} rank={i + 1} tone="dark" />
            ))}
          </ol>
        </div>
        {feature && (
          <div className="lg:col-span-5">
            <p className="font-sans text-[0.8rem] font-semibold uppercase tracking-[0.12em] text-sky-300">Editor&apos;s pick</p>
            <Reveal className="mt-5">
              <FeatureCard article={feature} tone="dark" sizes="(min-width: 1024px) 40vw, 100vw" />
            </Reveal>
          </div>
        )}
      </div>
    </section>
  );
}
