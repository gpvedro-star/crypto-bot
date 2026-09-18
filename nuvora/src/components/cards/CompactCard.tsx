import Link from "next/link";
import Image from "next/image";
import type { ArticleWithMeta } from "@/lib/content";
import { ArticleMeta } from "@/components/ui/ArticleMeta";
import { categoryMap } from "@/content/categories";

/** Compact story row: square thumbnail, category, sans headline, meta. */
export function CompactCard({ article, showImage = true, tone = "light" }: { article: ArticleWithMeta; showImage?: boolean; tone?: "light" | "dark" }) {
  const dark = tone === "dark";
  return (
    <article className="group relative flex items-start gap-4">
      {showImage && (
        <div className="image-zoom relative h-[88px] w-[88px] shrink-0 overflow-hidden rounded-[10px] bg-mist sm:h-[96px] sm:w-[128px]">
          <Image src={article.featuredImage.src} alt="" fill sizes="128px" className="object-cover" />
        </div>
      )}
      <div className="min-w-0 flex-1">
        <p className={`font-sans text-[0.74rem] font-semibold uppercase tracking-[0.1em] ${dark ? "text-sky-300" : "text-sky-600"}`}>{categoryMap[article.category].name}</p>
        <h3 className={`title mt-1 text-[1.05rem] sm:text-[1.1rem] ${dark ? "text-white" : ""}`}>
          <Link href={article.href} className="after:absolute after:inset-0">
            {article.title}
          </Link>
        </h3>
        <ArticleMeta article={article} tone={tone} showAuthor={false} className="relative z-10 mt-1.5 text-[0.8rem]" />
      </div>
    </article>
  );
}
