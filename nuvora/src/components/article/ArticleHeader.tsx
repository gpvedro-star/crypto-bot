import type { ReactNode } from "react";
import Link from "next/link";
import type { ArticleWithMeta } from "@/lib/content";
import { categoryMap } from "@/content/categories";
import { formatDate, formatDateTime, wasUpdated } from "@/lib/dates";
import { CategoryTag } from "@/components/ui/CategoryTag";
import { ArticleImage } from "@/components/ui/ArticleImage";
import { Breadcrumbs } from "./Breadcrumbs";

/**
 * The article opening: section, headline, dek, byline, then the photograph.
 *
 * Text never sits on the image. A draft never shows a publication date, since
 * it has none. When the story has no real photograph the opening is text-led
 * rather than filled with fallback art.
 */
export function ArticleHeader({ article, share }: { article: ArticleWithMeta; share?: ReactNode }) {
  const cat = categoryMap[article.category];
  const published = article.status === "published";
  const updated = published && wasUpdated(article.publishedAt, article.updatedAt);
  const hero = article.featuredImage.placeholder ? null : article.featuredImage;

  return (
    <header className="container-x">
      <div className="article-grid mx-auto max-w-[1200px]">
        <div className="article-grid-wide">
          <Breadcrumbs items={[{ name: cat.name, href: `/${cat.slug}` }, { name: article.title }]} />
          <div className="mt-7 flex flex-wrap items-center gap-x-3 gap-y-2 sm:mt-10">
            <CategoryTag category={article.category} variant="text" />
            {article.sponsored && <span className="eyebrow text-ink-500">Sponsored</span>}
            {article.breaking && <span className="eyebrow text-navy-900">Developing</span>}
          </div>

          <h1 className="headline mt-4 text-balance text-[2.25rem] leading-[1.06] sm:text-[2.9rem] lg:text-[3.5rem] lg:leading-[1.04]">
            {article.title}
          </h1>

          <p className="deck mt-5 max-w-[40rem] text-pretty text-[1.125rem] leading-[1.5] text-ink-700 sm:text-[1.3rem] sm:leading-[1.45]">
            {article.subtitle}
          </p>

          <div className="mt-7 flex flex-wrap items-center gap-x-6 gap-y-3 border-t border-line pt-4 font-sans text-[0.92rem] leading-snug text-ink-500">
            <p>
              By{" "}
              <Link
                href={`/authors/${article.author.slug}`}
                className="relative before:absolute before:inset-x-0 before:-inset-y-[5px] font-semibold text-ink-900 underline decoration-transparent underline-offset-[3px] transition-colors hover:decoration-navy-900"
              >
                {article.author.name}
              </Link>
            </p>

            {published ? (
              <p className="tabular">
                <time dateTime={article.publishedAt}>{formatDate(article.publishedAt)}</time>
                {updated && (
                  <>
                    <span aria-hidden="true" className="mx-2 text-line">|</span>
                    <span title={formatDateTime(article.updatedAt)}>
                      Updated <time dateTime={article.updatedAt}>{formatDate(article.updatedAt)}</time>
                    </span>
                  </>
                )}
                <span aria-hidden="true" className="mx-2 text-line">|</span>
                {article.readingTime} min read
              </p>
            ) : (
              <p className="tabular">
                <span className="font-semibold text-navy-900">Draft</span>
                <span aria-hidden="true" className="mx-2 text-line">|</span>
                Not yet published
                <span aria-hidden="true" className="mx-2 text-line">|</span>
                {article.readingTime} min read
              </p>
            )}

            {share && <div className="sm:ml-auto">{share}</div>}
          </div>
        </div>

        {hero && (
          <figure className="article-grid-full mt-9 sm:mt-11 lg:grid lg:grid-cols-subgrid">
            <div className="-mx-5 sm:mx-0 lg:col-span-full">
              <ArticleImage
                image={hero}
                ratio="aspect-[4/3] sm:aspect-[3/2] lg:aspect-[16/9]"
                sizes="(min-width: 1280px) 1200px, 100vw"
                priority
                zoom={false}
                rounded={false}
              />
            </div>
            {(hero.caption || hero.credit) && (
              <figcaption className="mt-3 font-sans text-[0.85rem] leading-snug text-ink-500 lg:col-start-2">
                {hero.caption}
                {hero.credit && (
                  <span className="text-ink-500">
                    {hero.caption ? " " : ""}
                    <span className="uppercase tracking-[0.06em] text-[0.75rem]">{hero.credit}</span>
                  </span>
                )}
              </figcaption>
            )}
          </figure>
        )}
      </div>
    </header>
  );
}
