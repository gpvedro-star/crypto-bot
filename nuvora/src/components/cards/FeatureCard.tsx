import Link from "next/link";
import type { ArticleWithMeta } from "@/lib/content";
import { ArticleImage } from "@/components/ui/ArticleImage";
import { ArticleMeta } from "@/components/ui/ArticleMeta";
import { CategoryTag } from "@/components/ui/CategoryTag";

interface FeatureCardProps {
  article: ArticleWithMeta;
  /** Headline scale. */
  size?: "md" | "lg";
  sizes?: string;
  priority?: boolean;
  showExcerpt?: boolean;
  tone?: "light" | "dark";
}

/** Large feature card: image on top, generous headline, excerpt and meta. */
export function FeatureCard({ article, size = "md", sizes = "(min-width: 1024px) 50vw, 100vw", priority, showExcerpt = true, tone = "light" }: FeatureCardProps) {
  return (
    <article className="group flex flex-col">
      <Link href={article.href} className="block" aria-label={article.title} tabIndex={-1}>
        <ArticleImage image={article.featuredImage} sizes={sizes} priority={priority} />
      </Link>
      <div className="pt-4">
        <CategoryTag category={article.category} tone={tone} />
        <h3 className={`headline mt-2 ${size === "lg" ? "text-[1.7rem] sm:text-[2.1rem]" : "text-[1.4rem] sm:text-[1.6rem]"} ${tone === "dark" ? "text-white" : ""}`}>
          <Link href={article.href} className="link-underline">
            {article.title}
          </Link>
        </h3>
        {showExcerpt && <p className={`mt-3 max-w-prose text-[1rem] leading-relaxed ${tone === "dark" ? "text-white/80" : "text-ink-700"}`}>{article.excerpt}</p>}
        <ArticleMeta article={article} tone={tone} className="mt-3" />
      </div>
    </article>
  );
}
