import Link from "next/link";
import type { ArticleWithMeta } from "@/lib/content";
import { absoluteUrl } from "@/lib/seo";
import { resolveAffiliate } from "@/lib/affiliates";
import { ArticleHeader } from "@/components/article/ArticleHeader";
import { ArticleBody } from "@/components/article/ArticleBody";
import { KeyTakeaways } from "@/components/article/EditorialBlocks";
import { ReadingProgress } from "@/components/article/ReadingProgress";
import { ShareBar } from "@/components/article/ShareBar";
import { AuthorCard } from "@/components/article/AuthorCard";
import { KeepReading } from "@/components/article/KeepReading";
import { NewsletterBlock } from "@/components/sections/NewsletterBlock";
import { AdSlot } from "@/components/ads/AdSlot";

interface ArticleViewProps {
  article: ArticleWithMeta;
  related: ArticleWithMeta[];
  /**
   * Draft preview: sharing, newsletter and related reading are dropped, since
   * none of them make sense for a piece that is not published.
   */
  preview?: boolean;
}

/**
 * The article template. One template for every article, whatever its source —
 * repository content, a published editorial record, or a draft under preview.
 */
export function ArticleView({ article, related, preview = false }: ArticleViewProps) {
  const url = absoluteUrl(article.href);
  const hasActiveAffiliate = (article.affiliateLinks ?? []).some((id) => resolveAffiliate(id)?.isAffiliate);

  return (
    <>
      <ReadingProgress targetId="article-content" />
      <article>
        <ArticleHeader article={article} />

        <div className="container-x mt-10 sm:mt-14">
          <div className="mx-auto grid max-w-6xl gap-10 lg:grid-cols-12">
            {/* Left rail: share (sticky on desktop) */}
            <aside className="hidden lg:col-span-2 lg:block">
              {!preview && (
                <div className="sticky top-[calc(var(--header-height)+2rem)]">
                  <ShareBar url={url} title={article.title} image={absoluteUrl(article.featuredImage.src)} orientation="column" />
                </div>
              )}
            </aside>

            {/* Body */}
            <div className="lg:col-span-8">
              <div className="mx-auto max-w-[720px]">
                {article.keyTakeaways && article.keyTakeaways.length > 0 && <KeyTakeaways items={article.keyTakeaways} />}
                <ArticleBody blocks={article.content} id="article-content" />

                {/* Disclose a commission only where a partnership is actually
                    live. With none active, links are plain links and saying
                    otherwise would invent a commercial relationship. */}
                {hasActiveAffiliate && (
                  <p className="mt-10 border-t border-line pt-5 font-sans text-[0.85rem] leading-relaxed text-ink-500">
                    NUVORA may earn a commission when you buy through links on this page. This never affects what we recommend.{" "}
                    <Link href="/affiliate-disclosure" className="underline hover:text-navy-900">How we handle affiliate links.</Link>
                  </p>
                )}

                {article.sources && article.sources.length > 0 && (
                  <section className="mt-10 border-t border-line pt-6" aria-labelledby="article-sources">
                    <h2 id="article-sources" className="eyebrow text-navy-900">
                      Sources
                    </h2>
                    <ol className="mt-4 space-y-2.5">
                      {article.sources.map((s, i) => (
                        <li key={`${s.url}-${i}`} className="font-sans text-[0.9rem] leading-relaxed text-ink-700">
                          <a
                            href={s.url}
                            rel="nofollow noopener noreferrer"
                            target="_blank"
                            className="underline decoration-line underline-offset-2 hover:text-navy-900"
                          >
                            {s.title}
                          </a>
                          {s.publisher && <span className="text-ink-500"> — {s.publisher}</span>}
                        </li>
                      ))}
                    </ol>
                  </section>
                )}

                <div className="mt-8 flex flex-wrap items-center justify-between gap-4 border-t border-line pt-6">
                  <ul className="flex flex-wrap gap-2" aria-label="Topics">
                    {article.tags.map((t) => (
                      <li key={t}>
                        <Link href={`/search?q=${encodeURIComponent(t)}`} className="inline-flex min-h-[36px] items-center rounded-full border border-line px-3.5 font-sans text-[0.85rem] text-ink-700 transition-colors hover:border-navy-900 hover:text-navy-900">
                          {t}
                        </Link>
                      </li>
                    ))}
                  </ul>
                  {!preview && (
                    <div className="lg:hidden">
                      <ShareBar url={url} title={article.title} image={absoluteUrl(article.featuredImage.src)} />
                    </div>
                  )}
                </div>

                <div className="mt-10">
                  <AuthorCard author={article.author} />
                </div>

                <p className="mt-6 font-sans text-[0.85rem] text-ink-500">
                  See something wrong? Read our <Link href="/corrections" className="underline hover:text-navy-900">corrections policy</Link> or{" "}
                  <Link href="/contact" className="underline hover:text-navy-900">contact the editors</Link>.
                </p>
              </div>
            </div>

            {/* Right rail: reserved for future sidebar advertising */}
            <aside className="hidden lg:col-span-2 lg:block" aria-hidden="true">
              <div className="sticky top-[calc(var(--header-height)+2rem)]">
                <AdSlot name="article-sidebar" />
              </div>
            </aside>
          </div>
        </div>

        <AdSlot name="article-end" className="container-x mt-16" />
      </article>

      {!preview && (
        <div className="mt-20 space-y-20 sm:mt-24 sm:space-y-24">
          <KeepReading articles={related} />
          <NewsletterBlock source={`article-${article.slug}`} />
        </div>
      )}
    </>
  );
}
