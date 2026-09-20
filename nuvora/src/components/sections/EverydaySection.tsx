import Link from "next/link";
import type { ArticleWithMeta } from "@/lib/content";
import { ArticleImage } from "@/components/ui/ArticleImage";
import { ArticleMeta } from "@/components/ui/ArticleMeta";
import { CategoryTag } from "@/components/ui/CategoryTag";

/**
 * The department that carries the brand promise: practical AI for normal life.
 *
 * Mirrored against the rest of the page — the feature sits on the right and the
 * service list on the left — so it reads as its own department rather than as a
 * repeat of the newsroom sections above it. DOM order keeps the feature first,
 * so mobile still opens on the picture and headline.
 *
 * The supporting stories lead with each piece's promise rather than a thumbnail:
 * "Shorter, kinder, clearer" says more here than another small blue square.
 */
export function EverydaySection({ articles }: { articles: ArticleWithMeta[] }) {
  const [feature, ...rest] = articles;
  const supporting = rest.slice(0, 4);

  return (
    <section aria-labelledby="everyday-heading" className="bg-sky-50 section-pad">
      <div className="container-x">
        <header className="border-t-2 border-navy-900 pt-4">
          <p className="eyebrow text-navy-700">Everyday AI</p>
          <div className="mt-2 flex flex-wrap items-end justify-between gap-x-8 gap-y-3">
            <div className="max-w-2xl">
              <h2 id="everyday-heading" className="headline text-[2rem] sm:text-[2.5rem]">
                AI for everyday life
              </h2>
              <p className="mt-2 text-[1.02rem] leading-relaxed text-ink-500">
                Small, useful ways to put AI to work on the ordinary parts of your day.
              </p>
            </div>
            <Link
              href="/everyday-ai"
              className="eyebrow inline-flex items-center gap-2 text-navy-900 hover:text-navy-700"
            >
              All everyday stories <span aria-hidden="true">→</span>
            </Link>
          </div>
        </header>

        <div className="mt-10 grid gap-12 lg:grid-cols-12 lg:gap-x-14">
          {/* ---- Feature (right on desktop, first on mobile) ------------- */}
          {feature && (
            <article className="lg:order-2 lg:col-span-7">
              <Link href={feature.href} tabIndex={-1} aria-hidden="true" className="block">
                <ArticleImage
                  image={feature.featuredImage}
                  ratio="aspect-[3/2]"
                  sizes="(min-width: 1024px) 56vw, 100vw"
                  rounded={false}
                />
              </Link>
              <CategoryTag category={feature.category} variant="text" className="mt-5" />
              <h3 className="headline mt-2 text-[1.7rem] sm:text-[2rem] lg:text-[2.15rem]">
                <Link href={feature.href} className="transition-colors hover:text-navy-700">
                  {feature.title}
                </Link>
              </h3>
              <p className="deck mt-3 max-w-[54ch] text-[1.05rem] text-ink-700 sm:text-[1.1rem]">{feature.excerpt}</p>
              <ArticleMeta article={feature} className="mt-4" />
            </article>
          )}

          {/* ---- Service list ------------------------------------------- */}
          {supporting.length > 0 && (
            <div className="lg:order-1 lg:col-span-5">
              <h3 className="eyebrow border-b border-navy-900 pb-3 text-navy-900">More practical stories</h3>
              <ul>
                {supporting.map((article) => (
                  <li key={article.slug} className="border-b border-line-strong/60 py-6">
                    <article className="relative">
                      <h4 className="title text-[1.12rem] sm:text-[1.2rem]">
                        <Link href={article.href} className="after:absolute after:inset-0 hover:text-navy-700">
                          {article.title}
                        </Link>
                      </h4>
                      <p className="deck mt-2 text-[1rem] leading-relaxed text-ink-700">{article.subtitle}</p>
                      <ArticleMeta article={article} showAuthor={false} className="relative z-10 mt-2.5" />
                    </article>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      </div>
    </section>
  );
}
