import Link from "next/link";
import Image from "next/image";
import type { ArticleWithMeta } from "@/lib/content";
import { categoryMap } from "@/content/categories";

/** Ranked "Most Read" row with a large numeral and thumbnail. */
export function TrendingItem({ article, rank, tone = "light", showImage = true }: { article: ArticleWithMeta; rank: number; tone?: "light" | "dark"; showImage?: boolean }) {
  const dark = tone === "dark";
  return (
    <li className={`group relative flex items-center gap-4 border-t py-5 first:border-t-0 sm:gap-6 ${dark ? "border-white/12" : "border-line"}`}>
      <span aria-hidden="true" className={`w-9 shrink-0 font-serif text-[2.2rem] font-semibold leading-none tabular sm:w-12 sm:text-[2.6rem] ${dark ? "text-sky-300" : "text-sky-500"}`}>
        {String(rank).padStart(2, "0")}
      </span>
      {showImage && (
        <div className="relative hidden h-[72px] w-[96px] shrink-0 overflow-hidden rounded-[10px] bg-mist sm:block">
          <Image src={article.featuredImage.src} alt="" fill sizes="96px" className="object-cover" />
        </div>
      )}
      <div className="min-w-0">
        <span className="sr-only">Rank {rank}.</span>
        <p className={`font-sans text-[0.72rem] font-semibold uppercase tracking-[0.1em] ${dark ? "text-sky-300" : "text-sky-600"}`}>{categoryMap[article.category].name}</p>
        <h3 className={`title mt-1 text-[1.1rem] sm:text-[1.25rem] ${dark ? "text-white" : ""}`}>
          <Link href={article.href} className="after:absolute after:inset-0">
            {article.title}
          </Link>
        </h3>
        <p className={`mt-1 font-sans text-[0.82rem] ${dark ? "text-white/60" : "text-ink-500"}`}>{article.author.name} · {article.readingTime} min read</p>
      </div>
    </li>
  );
}
