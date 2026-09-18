import Link from "next/link";
import Image from "next/image";
import type { ArticleWithMeta } from "@/lib/content";
import { ArticleMeta } from "@/components/ui/ArticleMeta";
import { CategoryTag } from "@/components/ui/CategoryTag";

/** Compact story: small thumbnail, headline, meta. For lists and sidebars. */
export function CompactCard({ article, showImage = true }: { article: ArticleWithMeta; showImage?: boolean }) {
  return (
    <article className="group flex gap-4">
      {showImage && (
        <Link href={article.href} className="image-zoom relative block h-[84px] w-[112px] shrink-0 overflow-hidden rounded-image bg-mist" aria-label={article.title} tabIndex={-1}>
          <Image src={article.featuredImage.src} alt="" fill sizes="112px" className="object-cover" />
        </Link>
      )}
      <div className="min-w-0">
        <CategoryTag category={article.category} />
        <h3 className="headline mt-1 text-[1.08rem] leading-snug">
          <Link href={article.href} className="link-underline">
            {article.title}
          </Link>
        </h3>
        <ArticleMeta article={article} showAuthor={false} className="mt-1.5 text-[0.8rem]" />
      </div>
    </article>
  );
}
