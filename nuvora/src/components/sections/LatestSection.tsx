import Link from "next/link";
import type { ArticleWithMeta } from "@/lib/content";
import { SectionHeading } from "@/components/ui/SectionHeading";
import { HorizontalCard } from "@/components/cards/HorizontalCard";
import { TrendingItem } from "@/components/cards/TrendingItem";
import { NewsletterForm } from "@/components/forms/NewsletterForm";
import { Reveal } from "@/components/ui/Reveal";
import { site } from "@/content/site";

/** The story feed: a clear, scannable list of the newest articles with a sticky sidebar. */
export function LatestSection({ articles, mostRead }: { articles: ArticleWithMeta[]; mostRead: ArticleWithMeta[] }) {
  return (
    <section aria-labelledby="latest-heading" className="container-x">
      <SectionHeading id="latest-heading" title="Latest stories" kicker="Just published" description="Important developments, explained the day they happen." href="/latest" linkLabel="All stories" />
      <div className="mt-10 grid gap-14 lg:grid-cols-12">
        <div className="lg:col-span-8">
          <ul className="divide-y divide-line">
            {articles.map((a, i) => (
              <Reveal key={a.slug} as="li" delay={(i % 4) * 50} className="py-7 first:pt-0">
                <HorizontalCard article={a} />
              </Reveal>
            ))}
          </ul>
          <Link href="/latest" className="mt-4 inline-flex min-h-[48px] items-center gap-2 rounded-full border border-line-strong px-6 font-sans text-[0.95rem] font-semibold text-navy-900 transition-colors hover:border-navy-900 hover:bg-navy-900 hover:text-white">
            Load more stories <span aria-hidden="true">→</span>
          </Link>
        </div>
        <aside className="lg:col-span-4">
          <div className="sticky top-[calc(var(--header-height)+1.5rem)] space-y-6">
            <div className="rounded-card border border-line bg-white p-6">
              <p className="flex items-center gap-2 font-sans text-[0.8rem] font-semibold uppercase tracking-[0.12em] text-sky-600">
                <span className="inline-block h-2 w-2 rounded-full bg-sky-500" aria-hidden="true" />
                Most read this week
              </p>
              <ol className="mt-2">
                {mostRead.map((a, i) => (
                  <TrendingItem key={a.slug} article={a} rank={i + 1} showImage={false} />
                ))}
              </ol>
            </div>
            <div className="rounded-card bg-navy-900 p-6 text-white">
              <p className="font-sans text-[0.8rem] font-semibold uppercase tracking-[0.12em] text-sky-300">{site.newsletter.name}</p>
              <p className="headline mt-3 text-[1.5rem] text-white">Understand AI. Without the noise.</p>
              <p className="mt-2 text-[0.95rem] text-white/70">{site.newsletter.cadence}. Free. Unsubscribe any time.</p>
              <div className="mt-4"><NewsletterForm compact tone="dark" source="home-sidebar" /></div>
            </div>
          </div>
        </aside>
      </div>
    </section>
  );
}
