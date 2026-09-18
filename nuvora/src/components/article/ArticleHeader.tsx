import Link from "next/link";
import type { ArticleWithMeta } from "@/lib/content";
import { categoryMap } from "@/content/categories";
import { formatDate, formatDateTime, wasUpdated } from "@/lib/dates";
import { Avatar } from "@/components/ui/Avatar";
import { CategoryTag } from "@/components/ui/CategoryTag";
import { TimeAgo } from "@/components/ui/TimeAgo";
import { ArticleImage } from "@/components/ui/ArticleImage";
import { Breadcrumbs } from "./Breadcrumbs";

export function ArticleHeader({ article }: { article: ArticleWithMeta }) {
  const cat = categoryMap[article.category];
  const updated = wasUpdated(article.publishedAt, article.updatedAt);
  return (
    <header className="container-x">
      <Breadcrumbs items={[{ name: cat.name, href: `/${cat.slug}` }, { name: article.title }]} />
      <div className="mx-auto max-w-4xl pt-8 sm:pt-12">
        <div className="flex flex-wrap items-center gap-2">
          <CategoryTag category={article.category} />
          {article.sponsored && <span className="pill bg-mist text-ink-500">Sponsored</span>}
          {article.breaking && <span className="pill bg-navy-900 text-white">Developing</span>}
        </div>
        <h1 className="headline mt-5 text-[2.3rem] sm:text-[3.2rem] lg:text-[3.8rem]">{article.title}</h1>
        <p className="mt-5 max-w-3xl text-[1.2rem] leading-relaxed text-ink-500 sm:text-[1.35rem]">{article.subtitle}</p>

        <div className="mt-8 flex flex-col gap-4 border-t border-line pt-6 font-sans text-[0.9rem] text-ink-500 sm:flex-row sm:items-center sm:justify-between">
          <Link href={`/authors/${article.author.slug}`} className="flex items-center gap-3">
            <Avatar author={article.author} size={44} />
            <span>
              <span className="block font-semibold text-ink-900">{article.author.name}</span>
              <span className="block text-[0.82rem]">{article.author.role}</span>
            </span>
          </Link>
          <dl className="flex flex-wrap items-center gap-x-5 gap-y-1">
            <div className="flex gap-1.5">
              <dt>Published</dt>
              <dd className="text-ink-900"><time dateTime={article.publishedAt}>{formatDate(article.publishedAt)}</time></dd>
            </div>
            {updated && (
              <div className="flex items-center gap-1.5 font-semibold text-navy-800">
                <span className="inline-block h-1.5 w-1.5 rounded-full bg-sky-500" aria-hidden="true" />
                <dt className="sr-only">Updated</dt>
                <dd title={formatDateTime(article.updatedAt)}><TimeAgo iso={article.updatedAt} prefix="Updated " /></dd>
              </div>
            )}
            <div className="flex gap-1.5 rounded-full bg-mist px-3 py-1">
              <dt className="sr-only">Reading time</dt>
              <dd className="tabular text-ink-900">{article.readingTime} min read</dd>
            </div>
          </dl>
        </div>
      </div>

      <figure className="mx-auto mt-10 max-w-6xl">
        <ArticleImage image={article.featuredImage} ratio="aspect-[16/10] sm:aspect-[2/1]" sizes="(min-width: 1280px) 1152px, 100vw" priority zoom={false} className="rounded-card shadow-card" />
        {(article.featuredImage.caption || article.featuredImage.credit) && (
          <figcaption className="mx-auto mt-3 max-w-4xl font-sans text-[0.85rem] leading-snug text-ink-500">
            {article.featuredImage.caption} {article.featuredImage.credit && <span className="text-ink-400">{article.featuredImage.credit}</span>}
          </figcaption>
        )}
      </figure>
    </header>
  );
}
