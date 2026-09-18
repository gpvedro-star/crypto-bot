import Link from "next/link";
import type { ArticleWithMeta } from "@/lib/content";
import { ArticleImage } from "@/components/ui/ArticleImage";
import { ArticleMeta } from "@/components/ui/ArticleMeta";
import { CategoryTag } from "@/components/ui/CategoryTag";

interface HorizontalCardProps {
  article: ArticleWithMeta;
  showExcerpt?: boolean;
  imageSide?: "left" | "right";
}

/** Horizontal editorial card: image beside text. Stacks on small screens. */
export function HorizontalCard({ article, showExcerpt = true, imageSide = "left" }: HorizontalCardProps) {
  return (
    <article className={`group grid gap-4 sm:grid-cols-12 sm:gap-6 ${imageSide === "right" ? "sm:[&>a]:order-2" : ""}`}>
      <Link href={article.href} className="block sm:col-span-5" aria-label={article.title} tabIndex={-1}>
        <ArticleImage image={article.featuredImage} sizes="(min-width: 1024px) 30vw, (min-width: 640px) 40vw, 100vw" />
      </Link>
      <div className="sm:col-span-7">
        <CategoryTag category={article.category} />
        <h3 className="headline mt-2 text-[1.3rem] sm:text-[1.45rem]">
          <Link href={article.href} className="link-underline">
            {article.title}
          </Link>
        </h3>
        {showExcerpt && <p className="mt-2 line-clamp-3 text-[0.98rem] leading-relaxed text-ink-700">{article.excerpt}</p>}
        <ArticleMeta article={article} className="mt-3" />
      </div>
    </article>
  );
}
