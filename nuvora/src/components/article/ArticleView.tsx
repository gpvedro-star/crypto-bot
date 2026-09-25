import Link from "next/link";
import type { ArticleWithMeta } from "@/lib/content";
import { absoluteUrl } from "@/lib/seo";
import { resolveAffiliate } from "@/lib/affiliates";
import { articleOutline } from "@/lib/article-outline";
import { ArticleHeader } from "@/components/article/ArticleHeader";
import { ArticleBody } from "@/components/article/ArticleBody";
import { ContentsDisclosure, ContentsRail } from "@/components/article/ArticleContents";
import { AtAGlance } from "@/components/article/AtAGlance";
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

/** A contents list earns its place only in an article with real sections. */
const MIN_SECTIONS_FOR_CONTENTS = 4;

function sourceHost(url: string): string | null {
  try {
    return new URL(url).hostname.replace(/^www\./, "");
  } catch {
    return null;
  }
}

/**
 * The article template. One template for every article, whatever its source —
 * repository content, a published editorial record, or a draft under preview.
 */
export function ArticleView({ article, related, preview = false }: ArticleViewProps) {
  // Share links only ever carry the canonical public URL, and only for a
  // published piece: never a preview URL, never a token.
  const canShare = !preview && article.status === "published";
  const url = absoluteUrl(article.href);
  const shareImage = article.featuredImage.placeholder ? undefined : absoluteUrl(article.featuredImage.src);
  const hasActiveAffiliate = (article.affiliateLinks ?? []).some((id) => resolveAffiliate(id)?.isAffiliate);
  const sections = articleOutline(article.content);
  const hasSources = Boolean(article.sources && article.sources.length > 0);
  const showContents = sections.length >= MIN_SECTIONS_FOR_CONTENTS;
  const outline = hasSources ? [...sections, { id: "article-sources", text: "Sources", level: 2 as const }] : sections;

  return (
    <>
      <ReadingProgress targetId="article-content" />
      <article>
        <ArticleHeader
          article={article}
          share={canShare ? <ShareBar url={url} title={article.title} image={shareImage} /> : undefined}
        />

        {article.keyTakeaways && article.keyTakeaways.length > 0 && (
          <div className="container-x mt-10 sm:mt-12">
            <div className="mx-auto max-w-[1200px]">
              <AtAGlance items={article.keyTakeaways} />
            </div>
          </div>
        )}

        <div className="container-x">
          <div className="article-grid mx-auto mt-10 max-w-[1200px] sm:mt-14">
            <div className="article-grid-main">
              {showContents && <ContentsDisclosure outline={outline} />}

              <ArticleBody blocks={article.content} id="article-content" />

              {/* Disclose a commission only where a partnership is actually
                  live. With none active, links are plain links and saying
                  otherwise would invent a commercial relationship. */}
              {hasActiveAffiliate && (
                <p className="mt-12 border-t border-line pt-5 font-sans text-[0.85rem] leading-relaxed text-ink-500">
                  NUVORA may earn a commission when you buy through links on this page. This never affects what we recommend.{" "}
                  <Link href="/affiliate-disclosure" className="underline hover:text-navy-900">How we handle affiliate links.</Link>
                </p>
              )}

              {article.sources && article.sources.length > 0 && (
                <section className="mt-14 border-t-2 border-navy-900 pt-5" aria-labelledby="article-sources">
                  <h2 id="article-sources" className="scroll-mt-[calc(var(--header-height)+1.5rem)] font-serif text-[1.35rem] font-semibold text-navy-900">
                    Sources
                  </h2>
                  <ol className="mt-5 space-y-4">
                    {article.sources.map((s, i) => {
                      const host = sourceHost(s.url);
                      return (
                        <li key={`${s.url}-${i}`} className="grid grid-cols-[1.6rem_minmax(0,1fr)] font-sans text-[0.95rem] leading-snug">
                          <span className="tabular text-ink-500">{i + 1}.</span>
                          <span>
                            <a
                              href={s.url}
                              rel="nofollow noopener noreferrer"
                              target="_blank"
                              className="block min-h-[24px] py-px font-medium text-navy-900 underline decoration-line underline-offset-[3px] transition-colors hover:decoration-navy-900"
                            >
                              {s.title}
                            </a>
                            <span className="mt-0.5 block text-[0.85rem] text-ink-500">
                              {[s.publisher, host].filter(Boolean).join(" · ")}
                            </span>
                          </span>
                        </li>
                      );
                    })}
                  </ol>
                </section>
              )}

              {article.tags.length > 0 && (
                <div className="mt-10 flex flex-wrap items-baseline gap-x-4 gap-y-1 font-sans text-[0.9rem]">
                  <span className="eyebrow text-ink-500">Topics</span>
                  <ul className="flex flex-wrap gap-x-4 gap-y-1" aria-label="Topics">
                    {article.tags.map((t) => (
                      <li key={t}>
                        <Link
                          href={`/search?q=${encodeURIComponent(t)}`}
                          className="inline-flex min-h-[32px] items-center text-navy-800 underline decoration-line underline-offset-[3px] hover:decoration-navy-800"
                        >
                          {t}
                        </Link>
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {canShare && (
                <div className="mt-8 flex items-center gap-4">
                  <span className="eyebrow text-ink-500">Share</span>
                  <ShareBar url={url} title={article.title} image={shareImage} />
                </div>
              )}

              <div className="mt-10">
                <AuthorCard author={article.author} />
              </div>

              <p className="mt-6 font-sans text-[0.85rem] text-ink-500">
                See something wrong? Read our <Link href="/corrections" className="underline hover:text-navy-900">corrections policy</Link> or{" "}
                <Link href="/contact" className="underline hover:text-navy-900">contact the editors</Link>.
              </p>
            </div>

            {/* Margin rail from 1280px: contents, then reserved ad space. */}
            <aside className="article-grid-rail" aria-label="Article navigation">
              <div className="sticky top-[calc(var(--header-height)+2rem)] ml-auto max-w-[19rem]">
                {showContents && <ContentsRail outline={outline} />}
                <AdSlot name="article-sidebar" className="mt-10" />
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
