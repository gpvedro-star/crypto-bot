import Link from "next/link";
import type { ArticleWithMeta } from "@/lib/content";
import { ArticleImage } from "@/components/ui/ArticleImage";
import { ArticleMeta } from "@/components/ui/ArticleMeta";
import { CategoryTag } from "@/components/ui/CategoryTag";

interface FeatureCardProps {
  article: ArticleWithMeta;
  size?: "md" | "lg";
  sizes?: string;
  priority?: boolean;
  showExcerpt?: boolean;
  tone?: "light" | "dark";
}

/** Large feature card: rounded cover, category pill over the image, serif headline. */
export function FeatureCard({ article, size = "md", sizes = "(min-width: 1024px) 50vw, 100vw", priority, showExcerpt = true, tone = "light" }: FeatureCardProps) {
  const dark = tone === "dark";
  return (
    <article className="group relative flex flex-col">
      <div className="relative">
        <ArticleImage image={article.featuredImage} sizes={sizes} priority={priority} className="shadow-card" />
        <div className="absolute left-4 top-4">
          <CategoryTag category={article.category} tone="overlay" />
        </div>
      </div>
      <div className="pt-5">
        <h3 className={`headline ${size === "lg" ? "text-[1.8rem] sm:text-[2.3rem]" : "text-[1.45rem] sm:text-[1.7rem]"} ${dark ? "text-white" : ""}`}>
          <Link href={article.href} className="after:absolute after:inset-0 after:rounded-card">
            {article.title}
          </Link>
        </h3>
        {showExcerpt && <p className={`mt-3 max-w-prose text-[1.02rem] leading-relaxed ${dark ? "text-white/75" : "text-ink-500"}`}>{article.excerpt}</p>}
        <ArticleMeta article={article} tone={tone} className="relative z-10 mt-4" />
      </div>
    </article>
  );
}
