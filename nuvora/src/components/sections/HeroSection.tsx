import Link from "next/link";
import type { ArticleWithMeta } from "@/lib/content";
import { ArticleImage } from "@/components/ui/ArticleImage";
import { ArticleMeta } from "@/components/ui/ArticleMeta";
import { CategoryTag } from "@/components/ui/CategoryTag";
import { CompactCard } from "@/components/cards/CompactCard";
import { TextCard } from "@/components/cards/TextCard";
import { FeatureCard } from "@/components/cards/FeatureCard";
import { Reveal } from "@/components/ui/Reveal";

interface HeroSectionProps {
  lead: ArticleWithMeta;
  /** 3–5 supporting stories; the first gets a medium feature treatment. */
  topStories: ArticleWithMeta[];
}

/**
 * Front-page lead: an asymmetric cover story with a rail of top stories.
 * Card treatments are deliberately mixed: one feature, compact rows, and a
 * text-only developing story when one exists.
 */
export function HeroSection({ lead, topStories }: HeroSectionProps) {
  const [feature, ...rest] = topStories;
  const developing = rest.find((a) => a.breaking);
  const compact = rest.filter((a) => a !== developing).slice(0, 3);

  return (
    <section aria-labelledby="lead-story" className="container-x pt-6 sm:pt-8">
      <div className="grid gap-10 lg:grid-cols-12 lg:gap-12">
        {/* Lead story */}
        <article className="group lg:col-span-8">
          <Link href={lead.href} className="block" aria-label={lead.title} tabIndex={-1}>
            <ArticleImage image={lead.featuredImage} ratio="aspect-[16/10] sm:aspect-[16/9]" sizes="(min-width: 1024px) 66vw, 100vw" priority />
          </Link>
          <div className="mt-5 max-w-3xl sm:mt-6">
            <div className="flex items-center gap-3">
              <CategoryTag category={lead.category} size="md" />
              {lead.breaking && <span className="eyebrow text-sky-500">Developing</span>}
            </div>
            <h1 id="lead-story" className="headline mt-3 text-[2.1rem] leading-[1.05] sm:text-[2.9rem] lg:text-[3.4rem]">
              <Link href={lead.href} className="link-underline">
                {lead.title}
              </Link>
            </h1>
            <p className="deck mt-4 max-w-2xl text-[1.15rem] text-ink-700 sm:text-[1.3rem]">{lead.subtitle}</p>
            <ArticleMeta article={lead} className="mt-4 text-[0.9rem]" />
            <Link
              href={lead.href}
              className="mt-5 inline-flex min-h-[46px] items-center gap-2 rounded-[4px] bg-navy-900 px-5 font-sans text-[0.95rem] font-semibold text-white transition-colors hover:bg-navy-800"
            >
              Read the story <span aria-hidden="true">→</span>
            </Link>
          </div>
        </article>

        {/* Top stories rail */}
        <aside className="lg:col-span-4" aria-label="Top stories">
          <div className="rule-navy pt-4">
            <p className="eyebrow text-navy-900">Top Stories</p>
          </div>
          <div className="mt-5 space-y-6">
            {feature && (
              <Reveal>
                <FeatureCard article={feature} sizes="(min-width: 1024px) 33vw, 100vw" showExcerpt={false} />
              </Reveal>
            )}
            {developing && (
              <Reveal delay={80}>
                <TextCard article={developing} tone="dark" />
              </Reveal>
            )}
            <ul className="divide-y divide-line border-t border-line">
              {compact.map((a, i) => (
                <Reveal key={a.slug} as="li" delay={120 + i * 60} className="py-5">
                  <CompactCard article={a} showImage={false} />
                </Reveal>
              ))}
            </ul>
          </div>
        </aside>
      </div>
    </section>
  );
}
