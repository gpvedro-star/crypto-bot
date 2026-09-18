import Link from "next/link";
import type { ArticleWithMeta } from "@/lib/content";
import { formatDate, wasUpdated } from "@/lib/dates";
import { TimeAgo } from "./TimeAgo";

interface ArticleMetaProps {
  article: ArticleWithMeta;
  tone?: "light" | "dark";
  showAuthor?: boolean;
  showUpdated?: boolean;
  className?: string;
}

/** Author · Date · Reading time. Shows "Updated …" when the story was revised. */
export function ArticleMeta({ article, tone = "light", showAuthor = true, showUpdated = true, className = "" }: ArticleMetaProps) {
  const updated = showUpdated && wasUpdated(article.publishedAt, article.updatedAt);
  const muted = tone === "dark" ? "text-white/70" : "text-ink-500";
  const strong = tone === "dark" ? "text-white" : "text-ink-700";
  return (
    <p className={`flex flex-wrap items-center gap-x-2 gap-y-1 font-sans text-[0.85rem] leading-snug ${muted} ${className}`}>
      {showAuthor && (
        <>
          <span className={`font-semibold ${strong}`}>
            <Link href={`/authors/${article.author.slug}`} className="hover:underline">
              {article.author.name}
            </Link>
          </span>
          <span aria-hidden="true">·</span>
        </>
      )}
      {updated ? (
        <span className={`inline-flex items-center gap-1.5 font-medium ${tone === "dark" ? "text-sky-300" : "text-navy-700"}`}>
          <span className="inline-block h-1.5 w-1.5 rounded-full bg-sky-500" aria-hidden="true" />
          <TimeAgo iso={article.updatedAt} prefix="Updated " />
        </span>
      ) : (
        <time dateTime={article.publishedAt}>{formatDate(article.publishedAt)}</time>
      )}
      <span aria-hidden="true">·</span>
      <span className="tabular">{article.readingTime} min read</span>
    </p>
  );
}
