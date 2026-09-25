import type { ReactNode } from "react";
import Link from "next/link";
import type { ArticleWithMeta } from "@/lib/content";
import { categoryMap } from "@/content/categories";
import { formatDate, formatDateTime, wasUpdated } from "@/lib/dates";
import { Avatar } from "@/components/ui/Avatar";
import { CategoryTag } from "@/components/ui/CategoryTag";
import { ArticleImage } from "@/components/ui/ArticleImage";
import { Breadcrumbs } from "./Breadcrumbs";

/**
 * The article opening. With a real photograph it is a split composition —
 * text on the left (5/12), the photograph on the right (7/12) — collapsing to
 * text-then-photo on phones. Without one it is text-led at full width rather
 * than filled with fallback art.
 *
 * Text never sits on the image. A draft never shows a publication date, since
 * it has none. Share controls arrive only when the caller passes them, which
 * the template does for published articles only.
 */
export function ArticleHeader({ article, share }: { article: ArticleWithMeta; share?: ReactNode }) {
  const cat = categoryMap[article.category];
  const published = article.status === "published";
  const updated = published && wasUpdated(article.publishedAt, article.updatedAt);
  const hero = article.featuredImage.placeholder ? null : article.featuredImage;
  // A long headline in the narrow split column steps down a size rather than
  // running to five or six lines.
  const longTitle = article.title.length > 60;

  const headlineSize = hero
    ? longTitle
      ? "text-[2.1rem] sm:text-[2.6rem] lg:text-[2.6rem] xl:text-[2.85rem]"
      : "text-[2.25rem] sm:text-[2.9rem] lg:text-[3.1rem] xl:text-[3.5rem]"
    : "text-[2.25rem] sm:text-[2.9rem] lg:text-[3.5rem]";

  const text = (
    <div className={hero ? "min-w-0" : "max-w-[920px]"}>
      <div className="flex flex-wrap items-center gap-x-3 gap-y-2">
        <CategoryTag category={article.category} variant="text" />
        {article.sponsored && <span className="eyebrow text-ink-500">Sponsored</span>}
        {article.breaking && <span className="eyebrow text-navy-900">Developing</span>}
      </div>

      <h1 className={`headline mt-4 text-balance leading-[1.05] ${headlineSize}`}>{article.title}</h1>

      <p className="deck mt-5 max-w-[40rem] text-pretty text-[1.125rem] leading-[1.5] text-ink-700 sm:text-[1.25rem] sm:leading-[1.48]">
        {article.subtitle}
      </p>

      <div className="mt-6 flex flex-wrap items-center gap-x-5 gap-y-3 font-sans text-[0.92rem] leading-snug text-ink-500">
        <p className="flex items-center gap-2.5">
          <Avatar author={article.author} size={32} />
          <span>
            By{" "}
            <Link
              href={`/authors/${article.author.slug}`}
              className="relative font-semibold text-ink-900 underline decoration-transparent underline-offset-[3px] transition-colors before:absolute before:inset-x-0 before:-inset-y-[5px] hover:decoration-navy-900"
            >
              {article.author.name}
            </Link>
          </span>
        </p>

        {published && (
          <p className="tabular">
            <time dateTime={article.publishedAt}>{formatDate(article.publishedAt)}</time>
            {updated && (
              <span title={formatDateTime(article.updatedAt)}>
                {" "}· Updated <time dateTime={article.updatedAt}>{formatDate(article.updatedAt)}</time>
              </span>
            )}
          </p>
        )}

        <p className="tabular">{article.readingTime} min read</p>

        {!published && (
          <p>
            <span className="inline-flex items-center rounded-full border border-sky-200 bg-sky-50 px-2.5 py-0.5 text-[0.8rem] font-semibold text-navy-900">
              Draft
            </span>
            <span className="sr-only"> — not yet published</span>
          </p>
        )}

        {share && <div className="lg:hidden">{share}</div>}
      </div>
    </div>
  );

  return (
    <header className="container-x">
      <div className="mx-auto max-w-[1200px]">
        <div className="flex items-start justify-between gap-6">
          <Breadcrumbs items={[{ name: cat.name, href: `/${cat.slug}` }, { name: article.title }]} />
          {share && <div className="hidden shrink-0 pt-4 lg:block">{share}</div>}
        </div>

        {hero ? (
          <div className="mt-7 grid gap-8 sm:mt-9 lg:grid-cols-[minmax(0,5fr)_minmax(0,7fr)] lg:items-center lg:gap-12">
            {text}
            <figure className="min-w-0">
              <div className="-mx-5 sm:mx-0">
                <ArticleImage
                  image={hero}
                  ratio="aspect-[4/3] sm:aspect-[3/2]"
                  sizes="(min-width: 1280px) 680px, (min-width: 1024px) 56vw, 100vw"
                  priority
                  zoom={false}
                  rounded={false}
                  className="sm:rounded-[6px]"
                />
              </div>
              {(hero.caption || hero.credit) && (
                <figcaption className="mt-2.5 font-sans text-[0.82rem] leading-snug text-ink-500 lg:text-right">
                  {hero.caption}
                  {hero.credit && (
                    <>
                      {hero.caption ? " " : ""}
                      <span className="text-ink-500">{hero.credit}</span>
                    </>
                  )}
                </figcaption>
              )}
            </figure>
          </div>
        ) : (
          <div className="mt-7 sm:mt-10">{text}</div>
        )}
      </div>
    </header>
  );
}
