import Link from "next/link";
import type { ArticleWithMeta } from "@/lib/content";
import { categoryMap } from "@/content/categories";
import { formatDate, formatDateTime, wasUpdated } from "@/lib/dates";
import { Avatar } from "@/components/ui/Avatar";
import { TimeAgo } from "@/components/ui/TimeAgo";
import { ArticleImage } from "@/components/ui/ArticleImage";
import { Breadcrumbs } from "./Breadcrumbs";

export function ArticleHeader({ article }: { article: ArticleWithMeta }) {
  const cat = categoryMap[article.category];
  const updated = wasUpdated(article.publishedAt, article.updatedAt);
  return (
    <header className="container-x">
      <Breadcrumbs items={[{ name: cat.name, href: `/${cat.slug}` }, { name: article.title }]} />
      <div className="mx-auto max-w-4xl pt-6 text-center sm:pt-10">
        <div className="flex items-center justify-center gap-3">
          <Link href={`/${cat.slug}`} className="eyebrow link-underline pb-0.5 text-[0.8rem] text-navy-700">
            {cat.name}
          </Link>
          {article.sponsored && <span className="eyebrow text-ink-400">Sponsored</span>}
          {article.breaking && <span className="eyebrow text-sky-500">Developing</span>}
        </div>
        <h1 className="headline mt-4 text-[2.2rem] leading-[1.05] sm:text-[3rem] lg:text-[3.6rem]">{article.title}</h1>
        <p className="deck mx-auto mt-5 max-w-3xl text-[1.2rem] text-ink-700 sm:text-[1.4rem]">{article.subtitle}</p>

        <div className="mt-8 flex flex-col items-center justify-center gap-4 border-y border-line py-5 font-sans text-[0.9rem] text-ink-500 sm:flex-row sm:gap-6">
          <Link href={`/authors/${article.author.slug}`} className="flex items-center gap-3 text-left">
            <Avatar author={article.author} size={44} />
            <span>
              <span className="block font-semibold text-ink-900">{article.author.name}</span>
              <span className="block text-[0.82rem]">{article.author.role}</span>
            </span>
          </Link>
          <span className="hidden h-8 w-px bg-line sm:block" aria-hidden="true" />
          <dl className="flex flex-wrap items-center justify-center gap-x-5 gap-y-1">
            <div className="flex gap-1.5">
              <dt>Published</dt>
              <dd className="text-ink-900"><time dateTime={article.publishedAt}>{formatDate(article.publishedAt)}</time></dd>
            </div>
            {updated && (
              <div className="flex items-center gap-1.5 font-medium text-navy-800">
                <span className="inline-block h-1.5 w-1.5 rounded-full bg-sky-500" aria-hidden="true" />
                <dt className="sr-only">Updated</dt>
                <dd title={formatDateTime(article.updatedAt)}><TimeAgo iso={article.updatedAt} prefix="Updated " /></dd>
              </div>
            )}
            <div className="flex gap-1.5">
              <dt className="sr-only">Reading time</dt>
              <dd className="tabular">{article.readingTime} min read</dd>
            </div>
          </dl>
        </div>
      </div>

      <figure className="mx-auto mt-8 max-w-6xl sm:mt-10">
        <ArticleImage image={article.featuredImage} ratio="aspect-[16/10] sm:aspect-[2/1]" sizes="(min-width: 1280px) 1152px, 100vw" priority zoom={false} />
        {(article.featuredImage.caption || article.featuredImage.credit) && (
          <figcaption className="mx-auto mt-3 max-w-3xl font-sans text-[0.85rem] leading-snug text-ink-500">
            {article.featuredImage.caption} {article.featuredImage.credit && <span className="text-ink-400">{article.featuredImage.credit}</span>}
          </figcaption>
        )}
      </figure>
    </header>
  );
}
