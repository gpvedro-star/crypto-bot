import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { getAllArticles, getArticle, getRelated } from "@/lib/content";
import { categoryMap } from "@/content/categories";
import { absoluteUrl, articleSchema, breadcrumbSchema, buildMetadata, faqSchema } from "@/lib/seo";
import { JsonLd } from "@/components/ui/JsonLd";
import { ArticleHeader } from "@/components/article/ArticleHeader";
import { ArticleBody } from "@/components/article/ArticleBody";
import { KeyTakeaways } from "@/components/article/EditorialBlocks";
import { ReadingProgress } from "@/components/article/ReadingProgress";
import { ShareBar } from "@/components/article/ShareBar";
import { AuthorCard } from "@/components/article/AuthorCard";
import { KeepReading } from "@/components/article/KeepReading";
import { NewsletterBlock } from "@/components/sections/NewsletterBlock";
import { AdSlot } from "@/components/ads/AdSlot";
import Link from "next/link";

interface Params {
  slug: string;
}

export function generateStaticParams(): Params[] {
  return getAllArticles().map((a) => ({ slug: a.slug }));
}

export const dynamicParams = false;

export async function generateMetadata({ params }: { params: Promise<Params> }): Promise<Metadata> {
  const { slug } = await params;
  const article = getArticle(slug);
  if (!article) return {};
  const meta = buildMetadata({
    title: article.seoTitle ?? article.title,
    description: article.seoDescription ?? article.excerpt,
    path: article.href,
    image: `${article.href}/opengraph-image`,
    type: "article",
  });
  return {
    ...meta,
    authors: [{ name: article.author.name, url: absoluteUrl(`/authors/${article.author.slug}`) }],
    keywords: article.tags,
    openGraph: {
      ...meta.openGraph,
      type: "article",
      publishedTime: article.publishedAt,
      modifiedTime: article.updatedAt,
      authors: [absoluteUrl(`/authors/${article.author.slug}`)],
      section: categoryMap[article.category].name,
      tags: article.tags,
    },
  };
}

export default async function ArticlePage({ params }: { params: Promise<Params> }) {
  const { slug } = await params;
  const article = getArticle(slug);
  if (!article) notFound();
  const related = getRelated(article, 4);
  const url = absoluteUrl(article.href);
  const faq = article.content.find((b) => b.type === "faq");
  const cat = categoryMap[article.category];

  return (
    <>
      <JsonLd
        data={[
          articleSchema(article),
          breadcrumbSchema([{ name: "Home", path: "/" }, { name: cat.name, path: `/${cat.slug}` }, { name: article.title, path: article.href }]),
          ...(faq && faq.type === "faq" ? [faqSchema(faq.items)] : []),
        ]}
      />
      <ReadingProgress targetId="article-content" />
      <article>
        <ArticleHeader article={article} />

        <div className="container-x mt-10 sm:mt-14">
          <div className="mx-auto grid max-w-6xl gap-10 lg:grid-cols-12">
            {/* Left rail: share (sticky on desktop) */}
            <aside className="hidden lg:col-span-2 lg:block">
              <div className="sticky top-[calc(var(--header-height)+2rem)]">
                <ShareBar url={url} title={article.title} image={absoluteUrl(article.featuredImage.src)} orientation="column" />
              </div>
            </aside>

            {/* Body */}
            <div className="lg:col-span-8">
              <div className="mx-auto max-w-[720px]">
                {article.keyTakeaways && article.keyTakeaways.length > 0 && <KeyTakeaways items={article.keyTakeaways} />}
                <ArticleBody blocks={article.content} id="article-content" />

                {article.affiliateLinks && article.affiliateLinks.length > 0 && (
                  <p className="mt-10 border-t border-line pt-5 font-sans text-[0.85rem] leading-relaxed text-ink-500">
                    NUVORA may earn a commission when you buy through links on this page. This never affects what we recommend.{" "}
                    <Link href="/affiliate-disclosure" className="underline hover:text-navy-900">How we handle affiliate links.</Link>
                  </p>
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
                  <div className="lg:hidden">
                    <ShareBar url={url} title={article.title} image={absoluteUrl(article.featuredImage.src)} />
                  </div>
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

      <div className="mt-20 space-y-20 sm:mt-24 sm:space-y-24">
        <KeepReading articles={related} />
        <NewsletterBlock source={`article-${article.slug}`} />
      </div>
    </>
  );
}
