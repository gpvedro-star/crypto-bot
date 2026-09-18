import type { Metadata } from "next";
import { site } from "@/content/site";
import { categoryMap } from "@/content/categories";
import type { ArticleWithMeta } from "./content";
import type { AITool, FAQItem } from "@/content/types";

export function absoluteUrl(path: string): string {
  return new URL(path, site.url).toString();
}

interface PageMeta {
  title: string;
  description: string;
  path: string;
  image?: string;
  type?: "website" | "article";
  noIndex?: boolean;
}

export function buildMetadata({ title, description, path, image, type = "website", noIndex }: PageMeta): Metadata {
  const url = absoluteUrl(path);
  const ogImage = image ? absoluteUrl(image) : absoluteUrl("/opengraph-image");
  return {
    title,
    description,
    alternates: { canonical: url },
    openGraph: {
      title,
      description,
      url,
      siteName: site.name,
      locale: site.locale,
      type,
      images: [{ url: ogImage, width: 1200, height: 630, alt: title }],
    },
    twitter: {
      card: "summary_large_image",
      title,
      description,
      images: [ogImage],
      site: "@nuvora",
    },
    robots: noIndex ? { index: false, follow: false } : undefined,
  };
}

/* ---------------- JSON-LD ---------------- */

export function organizationSchema() {
  return {
    "@context": "https://schema.org",
    "@type": "NewsMediaOrganization",
    "@id": `${site.url}/#organization`,
    name: site.name,
    alternateName: site.publisher.name,
    url: site.url,
    slogan: site.tagline,
    logo: { "@type": "ImageObject", url: absoluteUrl("/brand/icon.svg"), width: 512, height: 512 },
    sameAs: Object.values(site.social),
    foundingDate: String(site.foundingYear),
    ethicsPolicy: absoluteUrl("/editorial-standards"),
    correctionsPolicy: absoluteUrl("/corrections"),
    contactPoint: { "@type": "ContactPoint", contactType: "editorial", email: site.publisher.email },
  };
}

export function websiteSchema() {
  return {
    "@context": "https://schema.org",
    "@type": "WebSite",
    "@id": `${site.url}/#website`,
    url: site.url,
    name: site.name,
    description: site.description,
    publisher: { "@id": `${site.url}/#organization` },
    inLanguage: site.language,
    potentialAction: {
      "@type": "SearchAction",
      target: { "@type": "EntryPoint", urlTemplate: `${site.url}/search?q={search_term_string}` },
      "query-input": "required name=search_term_string",
    },
  };
}

export function articleSchema(article: ArticleWithMeta) {
  return {
    "@context": "https://schema.org",
    "@type": "NewsArticle",
    "@id": `${absoluteUrl(article.href)}#article`,
    mainEntityOfPage: absoluteUrl(article.href),
    headline: article.title,
    alternativeHeadline: article.subtitle,
    description: article.seoDescription ?? article.excerpt,
    image: [absoluteUrl(article.featuredImage.src)],
    datePublished: article.publishedAt,
    dateModified: article.updatedAt,
    author: { "@type": "Person", name: article.author.name, url: absoluteUrl(`/authors/${article.author.slug}`) },
    publisher: { "@id": `${site.url}/#organization` },
    articleSection: categoryMap[article.category].name,
    keywords: article.tags.join(", "),
    wordCount: undefined,
    isAccessibleForFree: true,
    inLanguage: site.language,
  };
}

export function breadcrumbSchema(items: { name: string; path: string }[]) {
  return {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: items.map((item, i) => ({
      "@type": "ListItem",
      position: i + 1,
      name: item.name,
      item: absoluteUrl(item.path),
    })),
  };
}

export function faqSchema(items: FAQItem[]) {
  return {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: items.map((i) => ({
      "@type": "Question",
      name: i.question,
      acceptedAnswer: { "@type": "Answer", text: i.answer },
    })),
  };
}

export function toolSchema(tool: AITool) {
  return {
    "@context": "https://schema.org",
    "@type": "SoftwareApplication",
    name: tool.name,
    applicationCategory: "Productivity",
    operatingSystem: "Web, iOS, Android",
    description: tool.description,
    url: tool.officialUrl,
    author: { "@type": "Organization", name: tool.maker },
    offers: tool.pricing.map((p) => ({ "@type": "Offer", name: p.name, price: p.price.replace(/[^0-9.]/g, "") || "0", priceCurrency: "USD" })),
  };
}
