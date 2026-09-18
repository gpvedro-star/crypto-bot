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

/** Image-first standard card for grids and rails. */
export function ImageCard({ article, showExcerpt = false, sizes = "(min-width: 1024px) 25vw, (min-width: 640px) 50vw, 100vw" }: ImageCardProps) {
  return (
    <article className="group flex h-full flex-col">
      <Link href={article.href} className="block" aria-label={article.title} tabIndex={-1}>
        <ArticleImage image={article.featuredImage} sizes={sizes} />
      </Link>
      <div className="flex flex-1 flex-col pt-3">
        <CategoryTag category={article.category} />
        <h3 className="headline mt-2 text-[1.2rem] sm:text-[1.3rem]">
          <Link href={article.href} className="link-underline">
            {article.title}
          </Link>
        </h3>
        {showExcerpt && <p className="mt-2 line-clamp-2 text-[0.95rem] leading-relaxed text-ink-700">{article.excerpt}</p>}
        <ArticleMeta article={article} showAuthor={false} className="mt-auto pt-3" />
      </div>
    </article>
  );
}
