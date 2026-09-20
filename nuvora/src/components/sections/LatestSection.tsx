import Link from "next/link";
import type { ArticleWithMeta } from "@/lib/content";
import { ArticleImage } from "@/components/ui/ArticleImage";
import { ArticleMeta } from "@/components/ui/ArticleMeta";
import { CategoryTag } from "@/components/ui/CategoryTag";

/**
 * The story feed, composed rather than listed: one section lead, two stories
 * of middle weight, then the rest as a ruled two-column index. Three descending
 * weights so the eye is told where to start.
 *
 * Built from primitives instead of the shared card components because those are
 * used by the category, author, tool and search pages, which this phase leaves
 * untouched.
 */
export function LatestSection({ articles }: { articles: ArticleWithMeta[] }) {
  const [featured, ...rest] = articles;
  const secondary = rest.slice(0, 2);
  const index = rest.slice(2);

  return (
    <section aria-labelledby="latest-heading" className="container-x">
      <header className="border-t-2 border-navy-900 pt-4">
        <p className="eyebrow text-navy-700">Just published</p>
        <div className="mt-2 flex flex-wrap items-end justify-between gap-x-8 gap-y-3">
          <div className="max-w-2xl">
            <h2 id="latest-heading" className="headline text-[2rem] sm:text-[2.5rem]">
              Latest stories
            </h2>
            <p className="mt-2 text-[1.02rem] leading-relaxed text-ink-500">
              Important developments, explained the day they happen.
            </p>
          </div>
          <Link href="/latest" className="eyebrow inline-flex items-center gap-2 text-navy-900 hover:text-navy-700">
            All stories <span aria-hidden="true">→</span>
          </Link>
        </div>
      </header>

      <div className="mt-10">
        <div>
          {/* Section lead */}
          {/* Horizontal, so the section lead does not restate the cover's
              shape directly beneath it. */}
          {featured && (
            <article className="grid gap-5 sm:grid-cols-12 sm:items-center sm:gap-8">
              <div className="sm:col-span-6 lg:col-span-5">
                <Link href={featured.href} tabIndex={-1} aria-hidden="true" className="block">
                  <ArticleImage
                    image={featured.featuredImage}
                    ratio="aspect-[4/3]"
                    sizes="(min-width: 1024px) 40vw, 100vw"
                    rounded={false}
                  />
                </Link>
              </div>
              <div className="sm:col-span-6 lg:col-span-7">
                <CategoryTag category={featured.category} variant="text" />
                <h3 className="headline mt-2 text-[1.65rem] sm:text-[1.8rem] lg:text-[1.9rem]">
                  <Link href={featured.href} className="transition-colors hover:text-navy-700">
                    {featured.title}
                  </Link>
                </h3>
                <p className="deck mt-3 text-[1.02rem] text-ink-700">{featured.excerpt}</p>
                <ArticleMeta article={featured} className="mt-4" />
              </div>
            </article>
          )}

          {/* Middle weight. Two stories in a three-column track at desktop: at
              half the full-width container their images would match the lead's. */}
          {secondary.length > 0 && (
            <div className="mt-10 grid gap-x-8 gap-y-9 border-t border-line pt-9 sm:grid-cols-2 lg:grid-cols-3">
              {secondary.map((article) => (
                <article key={article.slug} className="relative">
                  <Link href={article.href} tabIndex={-1} aria-hidden="true" className="block">
                    <ArticleImage
                      image={article.featuredImage}
                      ratio="aspect-[2/1]"
                      sizes="(min-width: 1024px) 31vw, (min-width: 640px) 45vw, 100vw"
                      rounded={false}
                    />
                  </Link>
                  <CategoryTag category={article.category} variant="text" className="relative z-10 mt-4" />
                  <h3 className="title mt-2 text-[1.18rem] sm:text-[1.24rem]">
                    <Link href={article.href} className="after:absolute after:inset-0 hover:text-navy-700">
                      {article.title}
                    </Link>
                  </h3>
                  <ArticleMeta article={article} showAuthor={false} className="relative z-10 mt-2" />
                </article>
              ))}
            </div>
          )}

          {/* Index: the rest of the week, ruled rather than boxed */}
          {index.length > 0 && (
            <div className="mt-10 border-t border-line pt-6">
              <p className="eyebrow text-ink-400">More from this week</p>
              <ol className="mt-1 grid sm:grid-cols-2 sm:gap-x-10">
                {index.map((article) => (
                  <li key={article.slug} className="border-b border-line">
                    <article className="relative flex items-start gap-4 py-5">
                      <div className="min-w-0 flex-1">
                        <CategoryTag category={article.category} variant="text" className="relative z-10" />
                        <h3 className="title mt-1.5 text-[1.05rem] sm:text-[1.08rem]">
                          <Link href={article.href} className="after:absolute after:inset-0 hover:text-navy-700">
                            {article.title}
                          </Link>
                        </h3>
                        <ArticleMeta article={article} showAuthor={false} className="relative z-10 mt-1.5" />
                      </div>
                      <div className="w-[84px] shrink-0 sm:w-[92px]">
                        <ArticleImage
                          image={article.featuredImage}
                          ratio="aspect-[4/3]"
                          sizes="92px"
                          rounded={false}
                          zoom={false}
                        />
                      </div>
                    </article>
                  </li>
                ))}
              </ol>
            </div>
          )}

          <Link href="/latest" className="eyebrow mt-7 inline-flex items-center gap-2 text-navy-900 hover:text-navy-700">
            Load more stories <span aria-hidden="true">→</span>
          </Link>
        </div>
      </div>
    </section>
  );
}
