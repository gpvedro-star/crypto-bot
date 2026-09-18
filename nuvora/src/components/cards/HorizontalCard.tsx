import Link from "next/link";
import type { ArticleWithMeta } from "@/lib/content";
import { ArticleImage } from "@/components/ui/ArticleImage";
import { ArticleMeta } from "@/components/ui/ArticleMeta";
import { CategoryTag } from "@/components/ui/CategoryTag";

interface HorizontalCardProps {
  article: ArticleWithMeta;
  showExcerpt?: boolean;
}

/** Horizontal card: cover beside text. Stacks on small screens. */
export function HorizontalCard({ article, showExcerpt = true }: HorizontalCardProps) {
  return (
    <article className="group relative grid gap-4 sm:grid-cols-12 sm:items-center sm:gap-6">
      <div className="sm:col-span-5">
        <ArticleImage image={article.featuredImage} sizes="(min-width: 1024px) 30vw, (min-width: 640px) 40vw, 100vw" />
      </div>
      <div className="sm:col-span-7">
        <CategoryTag category={article.category} />
        <h3 className="title mt-3 text-[1.3rem] sm:text-[1.45rem]">
          <Link href={article.href} className="after:absolute after:inset-0 after:rounded-card">
            {article.title}
          </Link>
        </h3>
        {showExcerpt && <p className="mt-2 line-clamp-2 text-[0.98rem] leading-relaxed text-ink-500">{article.excerpt}</p>}
        <ArticleMeta article={article} className="relative z-10 mt-3" />
      </div>
    </article>
  );
}
