import Link from "next/link";
import type { ArticleWithMeta } from "@/lib/content";
import { ArticleMeta } from "@/components/ui/ArticleMeta";
import { CategoryTag } from "@/components/ui/CategoryTag";

/** Text-only card for breaking or developing stories. */
export function TextCard({ article, tone = "light" }: { article: ArticleWithMeta; tone?: "light" | "dark" }) {
  const dark = tone === "dark";
  return (
    <article className={`flex h-full flex-col rounded-card border p-5 sm:p-6 ${dark ? "border-navy-700 bg-navy-900 text-white" : "border-line bg-white"}`}>
      <div className="flex items-center gap-3">
        {article.breaking && (
          <span className={`eyebrow inline-flex items-center gap-1.5 ${dark ? "text-sky-300" : "text-navy-800"}`}>
            <span className="relative flex h-2 w-2">
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-sky-400 opacity-75" />
              <span className="relative inline-flex h-2 w-2 rounded-full bg-sky-500" />
            </span>
            Developing
          </span>
        )}
        <CategoryTag category={article.category} tone={tone} />
      </div>
      <h3 className={`headline mt-3 text-[1.35rem] sm:text-[1.5rem] ${dark ? "text-white" : ""}`}>
        <Link href={article.href} className="link-underline">
          {article.title}
        </Link>
      </h3>
      <p className={`mt-3 text-[0.98rem] leading-relaxed ${dark ? "text-white/80" : "text-ink-700"}`}>{article.excerpt}</p>
      <ArticleMeta article={article} tone={tone} className="mt-auto pt-4" />
    </article>
  );
}
