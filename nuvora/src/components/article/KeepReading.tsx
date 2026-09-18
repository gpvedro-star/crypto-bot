import type { ArticleWithMeta } from "@/lib/content";
import { SectionHeading } from "@/components/ui/SectionHeading";
import { ImageCard } from "@/components/cards/ImageCard";
import { Reveal } from "@/components/ui/Reveal";

export function KeepReading({ articles }: { articles: ArticleWithMeta[] }) {
  if (articles.length === 0) return null;
  return (
    <section aria-labelledby="keep-reading" className="container-x">
      <SectionHeading title="Keep Reading" kicker="Related" href="/latest" linkLabel="All stories" />
      <div className="mt-8 grid gap-8 sm:grid-cols-2 lg:grid-cols-4">
        {articles.slice(0, 4).map((a, i) => (
          <Reveal key={a.slug} delay={i * 70}>
            <ImageCard article={a} showExcerpt />
          </Reveal>
        ))}
      </div>
    </section>
  );
}
