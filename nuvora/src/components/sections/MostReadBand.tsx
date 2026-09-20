import Link from "next/link";
import type { ArticleWithMeta } from "@/lib/content";
import { categoryMap } from "@/content/categories";

/**
 * "Most read / This week" as a navy band rather than a sidebar widget: the
 * page's one dark break, carrying an open ranked list.
 *
 * Rank 01 is emphasised with a larger headline and a dek rather than a
 * thumbnail — its image is already the cover at the top of the page, so
 * repeating it here would read as a duplicate rather than as emphasis.
 */
export function MostReadBand({ articles }: { articles: ArticleWithMeta[] }) {
  if (articles.length === 0) return null;

  return (
    <section aria-labelledby="most-read-heading" className="bg-navy-900 text-white">
      <div className="container-x py-16 sm:py-20 lg:py-24">
        <header className="border-b border-white/25 pb-5">
          <p className="eyebrow text-sky-300">Most read</p>
          <h2 id="most-read-heading" className="headline mt-2 text-[2rem] text-white sm:text-[2.5rem]">
            This week
          </h2>
        </header>

        <ol>
          {articles.map((article, i) => {
            const lead = i === 0;
            return (
              <li key={article.slug} className={`border-b border-white/12 ${lead ? "py-8 sm:py-11" : "py-7 sm:py-9"}`}>
                <article className="relative sm:flex sm:gap-8 lg:gap-14">
                  <span
                    aria-hidden="true"
                    className={`tabular block font-serif font-normal leading-none text-sky-500 sm:shrink-0 ${
                      lead ? "text-[2.4rem] sm:w-24 sm:text-[5rem]" : "text-[1.9rem] sm:w-24 sm:text-[3.4rem]"
                    }`}
                  >
                    {String(i + 1).padStart(2, "0")}
                  </span>

                  <div className="mt-3 min-w-0 flex-1 sm:mt-0 sm:max-w-[60ch]">
                    <span className="sr-only">Rank {i + 1}.</span>
                    <h3
                      className={`headline text-white ${
                        lead ? "text-[1.6rem] sm:text-[2.15rem]" : "text-[1.22rem] sm:text-[1.45rem]"
                      }`}
                    >
                      <Link href={article.href} className="link-underline after:absolute after:inset-0">
                        {article.title}
                      </Link>
                    </h3>

                    {lead && (
                      <p className="deck mt-3 text-[1.02rem] text-white/75 sm:text-[1.08rem]">{article.excerpt}</p>
                    )}

                    <p className="mt-3 flex flex-wrap items-center gap-x-2.5 gap-y-1 font-sans text-[0.88rem] text-white/65">
                      <span className="font-semibold uppercase tracking-[0.1em] text-sky-300">
                        {categoryMap[article.category].name}
                      </span>
                      <span aria-hidden="true" className="opacity-40">·</span>
                      <span>{article.author.name}</span>
                      <span aria-hidden="true" className="opacity-40">·</span>
                      <span className="tabular">{article.readingTime} min read</span>
                    </p>
                  </div>
                </article>
              </li>
            );
          })}
        </ol>
      </div>
    </section>
  );
}
