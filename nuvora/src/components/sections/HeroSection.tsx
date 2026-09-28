import Link from "next/link";
import type { ArticleWithMeta } from "@/lib/content";
import { ArticleImage } from "@/components/ui/ArticleImage";
import { ArticleMeta } from "@/components/ui/ArticleMeta";
import { CategoryTag } from "@/components/ui/CategoryTag";
import { Button } from "@/components/ui/Button";
import { formatDate, formatShortDate } from "@/lib/dates";

interface HeroSectionProps {
  lead: ArticleWithMeta;
  topStories: ArticleWithMeta[];
}

/** Thin vertical rule used between byline items. */
function MetaRule() {
  return <span aria-hidden="true" className="h-3 w-px shrink-0 bg-line-strong" />;
}

/**
 * Front page, print register: one cover composition carrying most of the
 * visual weight — image and story text as a single piece, roughly 60/40 —
 * with a ruled strip of supporting stories beneath it when there is more to
 * show. On mobile the reading order is text first, image last: the same
 * order a reader follows in the composition above 1024px, just stacked.
 *
 * Deliberately quiet — no reveal animation above the fold (it would delay the
 * LCP headline) and no breaking/developing flags, which read as sensational on
 * a lead that is explanatory rather than urgent.
 */
export function HeroSection({ lead, topStories }: HeroSectionProps) {
  const rail = topStories.slice(0, 3);
  const hasRail = rail.length > 0;

  return (
    <section aria-labelledby="lead-story" className="border-b border-line bg-white">
      <div className="container-x pb-14 pt-6 sm:pt-8 lg:pb-20">
        {/* Section rule. The slogan lives in the masthead, not here — beside the
            lead headline it competed with it. */}
        <p className="eyebrow border-t-2 border-navy-900 pt-2.5 text-navy-900">The Lead</p>

        {/* ---- Cover composition: one piece, ~60/40 image to text -------- */}
        <article className="mt-6 grid grid-cols-1 gap-5 lg:mt-9 lg:grid-cols-[3fr_2fr] lg:items-center lg:gap-12 xl:gap-16">
          <div className="order-2 lg:order-1">
            <Link href={lead.href} tabIndex={-1} aria-hidden="true" className="block">
              <ArticleImage
                image={lead.featuredImage}
                ratio="aspect-[16/11] lg:aspect-[4/3] xl:aspect-[16/12]"
                sizes="(min-width: 1024px) 58vw, 100vw"
                priority
                rounded={false}
              />
            </Link>
          </div>

          <div className="order-1 lg:order-2">
            <CategoryTag category={lead.category} variant="text" />

            <h1 id="lead-story" className="headline mt-3 text-[2.15rem] sm:text-[2.6rem] lg:text-[2.5rem] xl:text-[2.9rem]">
              <Link href={lead.href} className="transition-colors hover:text-navy-700">
                {lead.title}
              </Link>
            </h1>

            <p className="deck mt-4 text-[1.1rem] text-ink-700 sm:text-[1.16rem]">{lead.subtitle}</p>

            <p className="mt-5 flex flex-wrap items-center gap-x-3 gap-y-1.5 font-sans text-[0.9rem] text-ink-500">
              <span className="text-ink-900">
                By{" "}
                <Link href={`/authors/${lead.author.slug}`} className="font-semibold hover:underline">
                  {lead.author.name}
                </Link>
                {lead.author.role && <span className="hidden text-ink-500 sm:inline">, {lead.author.role}</span>}
              </span>
              <MetaRule />
              {/* Short date on phones keeps the byline to a single line. */}
              <time dateTime={lead.publishedAt}>
                <span className="sm:hidden">{formatShortDate(lead.publishedAt)}</span>
                <span className="hidden sm:inline">{formatDate(lead.publishedAt)}</span>
              </time>
              <MetaRule />
              <span className="tabular">{lead.readingTime} min read</span>
            </p>

            <Button href={lead.href} variant="secondary" size="md" className="mt-7">
              Read the full story <span aria-hidden="true">→</span>
            </Button>
          </div>
        </article>

        {/* ---- Supporting strip -------------------------------------- */}
        {hasRail && (
          <div className="mt-14 border-t border-line pt-9 lg:mt-16 lg:pt-10">
            <h2 id="also-this-week" className="eyebrow text-navy-900">
              Also this week
            </h2>
            <ol className="mt-6 grid gap-x-8 gap-y-9 sm:grid-cols-2 lg:grid-cols-3">
              {rail.map((article) => (
                <li key={article.slug}>
                  <article className="group relative">
                    <Link href={article.href} tabIndex={-1} aria-hidden="true" className="block">
                      <ArticleImage image={article.featuredImage} ratio="aspect-[3/2]" sizes="(min-width: 1024px) 30vw, (min-width: 640px) 45vw, 100vw" rounded={false} />
                    </Link>
                    <CategoryTag category={article.category} variant="text" className="relative z-10 mt-4" />
                    <h3 className="title mt-2 text-[1.1rem] sm:text-[1.14rem]">
                      <Link href={article.href} className="link-underline after:absolute after:inset-0">
                        {article.title}
                      </Link>
                    </h3>
                    <ArticleMeta article={article} showAuthor={false} className="relative z-10 mt-2" />
                  </article>
                </li>
              ))}
            </ol>

            <Link
              href="/latest"
              className="eyebrow mt-9 flex items-center gap-2 border-t border-line pt-6 text-navy-900 hover:text-navy-700"
            >
              More top stories <span aria-hidden="true">→</span>
            </Link>
          </div>
        )}
      </div>
    </section>
  );
}
