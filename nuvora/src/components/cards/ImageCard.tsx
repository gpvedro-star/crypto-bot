import Link from "next/link";
import type { ArticleWithMeta } from "@/lib/content";
import { ArticleImage } from "@/components/ui/ArticleImage";
import { ArticleMeta } from "@/components/ui/ArticleMeta";
import { CategoryTag } from "@/components/ui/CategoryTag";

interface ImageCardProps {
  article: ArticleWithMeta;
  showExcerpt?: boolean;
  sizes?: string;
}

/** Standard image-first card for grids. */
export function ImageCard({ article, showExcerpt = false, sizes = "(min-width: 1024px) 25vw, (min-width: 640px) 50vw, 100vw" }: ImageCardProps) {
  return (
    <article className="group relative flex h-full flex-col">
      <div className="relative">
        <ArticleImage image={article.featuredImage} sizes={sizes} />
        <div className="absolute left-3 top-3">
          <CategoryTag category={article.category} tone="overlay" />
        </div>
      </div>
      <div className="flex flex-1 flex-col pt-4">
        <h3 className="title text-[1.15rem] sm:text-[1.22rem]">
          <Link href={article.href} className="after:absolute after:inset-0 after:rounded-card">
            {article.title}
          </Link>
        </h3>
        {showExcerpt && <p className="mt-2 line-clamp-2 text-[0.95rem] leading-relaxed text-ink-500">{article.excerpt}</p>}
        <ArticleMeta article={article} showAuthor={false} className="relative z-10 mt-auto pt-3" />
      </div>
    </article>
  );
}
