import Link from "next/link";
import type { ArticleWithMeta } from "@/lib/content";
import { ArticleImage } from "@/components/ui/ArticleImage";
import { ArticleMeta } from "@/components/ui/ArticleMeta";
import { CategoryTag } from "@/components/ui/CategoryTag";
import { formatDate, formatShortDate } from "@/lib/dates";
import { site } from "@/content/site";

interface HeroSectionProps {
  lead: ArticleWithMeta;
  topStories: ArticleWithMeta[];
}

/** Thin vertical rule used between byline items. */
function MetaRule() {
  return <span aria-hidden="true" className="h-3 w-px shrink-0 bg-line-strong" />;
}

/**
 * Front page, print register: a single cover feature carrying most of the
 * visual weight, with a ruled rail of supporting stories beside it on desktop
 * and stacked beneath it on mobile.
 *
 * Deliberately quiet — no reveal animation above the fold (it would delay the
 * LCP headline) and no breaking/developing flags, which read as sensational on
 * a lead that is explanatory rather than urgent.
 */
export function HeroSection({ lead, topStories }: HeroSectionProps) {
  const [secondary, ...rest] = topStories;
  const minor = rest.slice(0, 2);

  return (
    <section aria-labelledby="lead-story" className="border-b border-line bg-white">
      <div className="container-x pb-14 pt-6 sm:pt-8 lg:pb-20">
        {/* Dateline rule */}
        <div className="flex items-baseline justify-between gap-4 border-t-2 border-navy-900 pt-3">
          <p className="eyebrow text-navy-900">The Lead</p>
          <p className="eyebrow text-ink-400 xl:hidden">{site.tagline}</p>
        </div>

        <div className="mt-7 grid gap-10 lg:mt-8 lg:grid-cols-12 lg:gap-0">
          {/* ---- Cover feature ---------------------------------------- */}
          <article className="lg:col-span-8 lg:pr-8 xl:pr-14">
            <Link href={lead.href} tabIndex={-1} aria-hidden="true" className="block">
              <ArticleImage
                image={lead.featuredImage}
                ratio="aspect-[3/2] lg:aspect-[2/1] xl:aspect-[2.2/1]"
                sizes="(min-width: 1024px) 66vw, 100vw"
                priority
                rounded={false}
              />
            </Link>

            <CategoryTag category={lead.category} variant="text" className="mt-6" />

            <h1 id="lead-story" className="headline mt-3 text-[2.3rem] sm:text-[2.9rem] lg:text-[3rem] xl:text-[3.4rem]">
              <Link href={lead.href} className="transition-colors hover:text-navy-700">
                {lead.title}
              </Link>
            </h1>

            <p className="deck mt-5 max-w-[46ch] text-[1.12rem] text-ink-700 sm:text-[1.2rem]">{lead.subtitle}</p>

            <p className="mt-6 flex flex-wrap items-center gap-x-3 gap-y-1.5 font-sans text-[0.9rem] text-ink-500">
              <span className="text-ink-900">
                By{" "}
                <Link href={`/authors/${lead.author.slug}`} className="font-semibold hover:underline">
                  {lead.author.name}
                </Link>
                <span className="hidden text-ink-500 sm:inline">, {lead.author.role}</span>
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
          </article>

          {/* ---- Supporting rail -------------------------------------- */}
          <aside aria-labelledby="also-this-week" className="lg:col-span-4 lg:border-l lg:border-line lg:pl-8 xl:pl-14">
            <h2 id="also-this-week" className="eyebrow border-b border-navy-900 pb-3 text-navy-900">
              Also this week
            </h2>

            {secondary && (
              <article className="border-b border-line py-7">
                <Link href={secondary.href} tabIndex={-1} aria-hidden="true" className="block">
                  <ArticleImage
                    image={secondary.featuredImage}
                    ratio="aspect-[16/9]"
                    sizes="(min-width: 1024px) 30vw, 100vw"
                    rounded={false}
                  />
                </Link>
                <CategoryTag category={secondary.category} variant="text" className="mt-4" />
                <h3 className="headline mt-2 text-[1.5rem] sm:text-[1.65rem] lg:text-[1.5rem]">
                  <Link href={secondary.href} className="transition-colors hover:text-navy-700">
                    {secondary.title}
                  </Link>
                </h3>
                <ArticleMeta article={secondary} showAuthor={false} className="mt-3" />
              </article>
            )}

            <ol className="divide-y divide-line">
              {minor.map((article) => (
                <li key={article.slug}>
                  <article className="relative flex items-start gap-4 py-6">
                    <div className="min-w-0 flex-1">
                      <CategoryTag category={article.category} variant="text" className="relative z-10" />
                      <h3 className="title mt-2 text-[1.05rem] sm:text-[1.1rem]">
                        <Link href={article.href} className="after:absolute after:inset-0 hover:text-navy-700">
                          {article.title}
                        </Link>
                      </h3>
                      <ArticleMeta article={article} showAuthor={false} className="relative z-10 mt-2" />
                    </div>
                    <div className="w-[80px] shrink-0 sm:w-[96px]">
                      <ArticleImage
                        image={article.featuredImage}
                        ratio="aspect-[4/3]"
                        sizes="96px"
                        rounded={false}
                        zoom={false}
                      />
                    </div>
                  </article>
                </li>
              ))}
            </ol>

            <Link
              href="/latest"
              className="eyebrow flex items-center gap-2 border-t border-line pt-5 text-navy-900 hover:text-navy-700"
            >
              More top stories <span aria-hidden="true">→</span>
            </Link>
          </aside>
        </div>
      </div>
    </section>
  );
}
