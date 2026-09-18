import type { ArticleWithMeta } from "@/lib/content";
import { SectionHeading } from "@/components/ui/SectionHeading";
import { HorizontalCard } from "@/components/cards/HorizontalCard";
import { ImageCard } from "@/components/cards/ImageCard";
import { Reveal } from "@/components/ui/Reveal";

/** Latest developments: two horizontal leads, then a row of image cards. */
export function LatestSection({ articles }: { articles: ArticleWithMeta[] }) {
  const [a, b, ...rest] = articles;
  return (
    <section aria-labelledby="latest-heading" className="container-x">
      <SectionHeading title="Latest in AI" kicker="Today" description="Important developments, explained the day they happen." href="/latest" />
      <div className="mt-8 grid gap-10 lg:grid-cols-2 lg:gap-12">
        {a && <Reveal><HorizontalCard article={a} /></Reveal>}
        {b && <Reveal delay={80}><HorizontalCard article={b} /></Reveal>}
      </div>
      {rest.length > 0 && (
        <div className="mt-12 grid gap-8 border-t border-line pt-10 sm:grid-cols-2 lg:grid-cols-4">
          {rest.slice(0, 4).map((article, i) => (
            <Reveal key={article.slug} delay={i * 70}>
              <ImageCard article={article} showExcerpt />
            </Reveal>
          ))}
        </div>
      )}
    </section>
  );
}
