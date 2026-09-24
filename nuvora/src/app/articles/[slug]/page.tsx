import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { getAllArticles } from "@/lib/content";
import { getLiveArticle, getLiveRelated } from "@/lib/live-content";
import { categoryMap } from "@/content/categories";
import { absoluteUrl, articleSchema, breadcrumbSchema, buildMetadata, faqSchema } from "@/lib/seo";
import { JsonLd } from "@/components/ui/JsonLd";
import { ArticleView } from "@/components/article/ArticleView";

interface Params {
  slug: string;
}

/**
 * Repository articles are prerendered at build. Editorial records published
 * later are rendered on first request and then cached — `dynamicParams` is
 * what lets a new publication appear without a rebuild.
 */
export function generateStaticParams(): Params[] {
  return getAllArticles().map((a) => ({ slug: a.slug }));
}

export const dynamicParams = true;
export const revalidate = 60;

export async function generateMetadata({ params }: { params: Promise<Params> }): Promise<Metadata> {
  const { slug } = await params;
  const article = await getLiveArticle(slug);
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
  const article = await getLiveArticle(slug);
  if (!article) notFound();
  const related = await getLiveRelated(article, 4);
  const faq = article.content.find((b) => b.type === "faq");
  const cat = categoryMap[article.category];

  return (
    <>
      <JsonLd
        data={[
          articleSchema(article),
          breadcrumbSchema([
            { name: "Home", path: "/" },
            { name: cat.name, path: `/${cat.slug}` },
            { name: article.title, path: article.href },
          ]),
          ...(faq && faq.type === "faq" ? [faqSchema(faq.items)] : []),
        ]}
      />
      <ArticleView article={article} related={related} />
    </>
  );
}
