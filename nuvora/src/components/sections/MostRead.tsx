import type { ArticleWithMeta } from "@/lib/content";
import { TrendingItem } from "@/components/cards/TrendingItem";
import { SectionHeading } from "@/components/ui/SectionHeading";
import { FeatureCard } from "@/components/cards/FeatureCard";
import { Reveal } from "@/components/ui/Reveal";

/** Ranked "Most Read This Week" on a navy field with an accompanying feature. */
export function MostRead({ articles, feature }: { articles: ArticleWithMeta[]; feature?: ArticleWithMeta }) {
  return (
    <section aria-labelledby="most-read-heading" className="bg-navy-900 py-16 text-white sm:py-20">
      <div className="container-x">
        <div className="grid gap-12 lg:grid-cols-12 lg:gap-16">
          <div className="lg:col-span-7">
            <SectionHeading title="Most Read This Week" kicker="Popular" tone="dark" />
            <ol className="mt-2">
              {articles.map((a, i) => (
                <TrendingItem key={a.slug} article={a} rank={i + 1} tone="dark" />
              ))}
            </ol>
          </div>
          {feature && (
            <div className="lg:col-span-5">
              <div className="border-t-2 border-white/80 pt-4">
                <p className="eyebrow text-sky-300">Editor&apos;s Pick</p>
              </div>
              <Reveal className="mt-6">
                <FeatureCard article={feature} tone="dark" sizes="(min-width: 1024px) 40vw, 100vw" />
              </Reveal>
            </div>
          )}
        </div>
      </div>
    </section>
  );
}
