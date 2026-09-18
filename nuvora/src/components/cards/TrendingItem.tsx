import Link from "next/link";
import type { ArticleWithMeta } from "@/lib/content";
import { CategoryTag } from "@/components/ui/CategoryTag";

/** Ranked "Most Read" row with a large editorial numeral. */
export function TrendingItem({ article, rank, tone = "light" }: { article: ArticleWithMeta; rank: number; tone?: "light" | "dark" }) {
  const dark = tone === "dark";
  return (
    <li className={`group flex gap-5 border-t py-6 first:border-t-0 sm:gap-7 ${dark ? "border-white/15" : "border-line"}`}>
      <span
        aria-hidden="true"
        className={`w-12 shrink-0 font-serif text-[2.6rem] font-semibold leading-none tabular sm:w-16 sm:text-[3.2rem] ${dark ? "text-sky-300" : "text-sky-500"}`}
      >
        {String(rank).padStart(2, "0")}
      </span>
      <div className="min-w-0 pt-1">
        <span className="sr-only">Rank {rank}.</span>
        <CategoryTag category={article.category} tone={tone} />
        <h3 className={`headline mt-1.5 text-[1.3rem] sm:text-[1.5rem] ${dark ? "text-white" : ""}`}>
          <Link href={article.href} className="link-underline">
            {article.title}
          </Link>
        </h3>
        <p className={`mt-1.5 font-sans text-[0.85rem] ${dark ? "text-white/65" : "text-ink-500"}`}>
          {article.author.name} · {article.readingTime} min read
        </p>
      </div>
    </li>
  );
}
