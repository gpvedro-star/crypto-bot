import { allArticles } from "@/content/articles";
import { authors, getAuthor } from "@/content/authors";
import { categories, getCategory } from "@/content/categories";
import { guides } from "@/content/guides";
import { tools, getTool } from "@/content/tools";
import type { Article, Author, CategorySlug } from "@/content/types";
import { readingTimeMinutes } from "./reading-time";

/**
 * Content data layer.
 *
 * All reads go through these functions so the source (static files today,
 * a database or headless CMS tomorrow) can change without touching pages
 * or components.
 */

export interface ArticleWithMeta extends Article {
  readingTime: number;
  author: Author;
  href: string;
}

function decorate(article: Article): ArticleWithMeta {
  const author = getAuthor(article.authorSlug) ?? authors[authors.length - 1];
  return {
    ...article,
    readingTime: article.readingTime ?? readingTimeMinutes(article.content),
    author,
    href: `/articles/${article.slug}`,
  };
}

const byDateDesc = (a: Article, b: Article) =>
  new Date(b.publishedAt).getTime() - new Date(a.publishedAt).getTime();

const published = allArticles
  .filter((a) => a.status === "published")
  .sort(byDateDesc)
  .map(decorate);

export function getAllArticles(): ArticleWithMeta[] {
  return published;
}

export function getArticle(slug: string): ArticleWithMeta | undefined {
  return published.find((a) => a.slug === slug);
}

export function getArticlesByCategory(slug: CategorySlug): ArticleWithMeta[] {
  return published.filter((a) => a.category === slug);
}

export function getArticlesByAuthor(slug: string): ArticleWithMeta[] {
  return published.filter((a) => a.authorSlug === slug);
}

export function getArticlesByTool(toolSlug: string): ArticleWithMeta[] {
  return published.filter((a) => a.tools?.includes(toolSlug));
}

export function getFeaturedArticles(limit = 5): ArticleWithMeta[] {
  return published.filter((a) => a.featured).slice(0, limit);
}

export function getLeadStory(): ArticleWithMeta {
  return published.find((a) => a.featured) ?? published[0];
}

export function getTrending(limit = 5): ArticleWithMeta[] {
  return published.filter((a) => a.trending).slice(0, limit);
}

/** "Most read" ranking placeholder: analytics will replace this ordering. */
export function getMostRead(limit = 5): ArticleWithMeta[] {
  return published.filter((a) => a.popular).slice(0, limit);
}

export function getLatest(limit = 8, exclude: string[] = []): ArticleWithMeta[] {
  return published.filter((a) => !exclude.includes(a.slug)).slice(0, limit);
}

export function getRelated(article: Article, limit = 4): ArticleWithMeta[] {
  const explicit = (article.relatedArticles ?? [])
    .map((s) => getArticle(s))
    .filter((a): a is ArticleWithMeta => Boolean(a));
  if (explicit.length >= limit) return explicit.slice(0, limit);
  const fill = published.filter(
    (a) =>
      a.slug !== article.slug &&
      !explicit.some((e) => e.slug === a.slug) &&
      (a.category === article.category || a.tags.some((t) => article.tags.includes(t))),
  );
  return [...explicit, ...fill].slice(0, limit);
}

export { categories, getCategory, authors, getAuthor, tools, getTool, guides };
