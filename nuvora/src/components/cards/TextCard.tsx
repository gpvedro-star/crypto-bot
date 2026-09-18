import Link from "next/link";
import type { ArticleWithMeta } from "@/lib/content";
import { ArticleMeta } from "@/components/ui/ArticleMeta";
import { CategoryTag } from "@/components/ui/CategoryTag";

/** Text-only card for breaking or developing stories. */
export function TextCard({ article, tone = "light" }: { article: ArticleWithMeta; tone?: "light" | "dark" }) {
  const dark = tone === "dark";
  return (
    <article className={`group relative flex h-full flex-col rounded-card p-6 ${dark ? "bg-navy-900 text-white" : "border border-line bg-white"}`}>
      <div className="flex flex-wrap items-center gap-2">
        {article.breaking && (
          <span className={`pill ${dark ? "bg-sky-500 text-navy-950" : "bg-navy-900 text-white"}`}>
            <span className="relative flex h-1.5 w-1.5">
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-current opacity-60" />
              <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-current" />
            </span>
            Developing
          </span>
        )}
        <CategoryTag category={article.category} tone={dark ? "dark" : "light"} />
      </div>
      <h3 className={`headline mt-4 text-[1.5rem] sm:text-[1.7rem] ${dark ? "text-white" : ""}`}>
        <Link href={article.href} className="after:absolute after:inset-0 after:rounded-card">
          {article.title}
        </Link>
      </h3>
      <p className={`mt-3 text-[0.98rem] leading-relaxed ${dark ? "text-white/75" : "text-ink-500"}`}>{article.excerpt}</p>
      <ArticleMeta article={article} tone={tone} className="relative z-10 mt-auto pt-5" />
    </article>
  );
}
