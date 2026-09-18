import type { Category, CategorySlug } from "./types";

export const categories: Category[] = [
  {
    slug: "news",
    name: "AI News",
    label: "News",
    description: "The developments that actually change something — explained the day they happen.",
    tagline: "What changed, and what it means for you.",
    seoTitle: "AI News, Explained Simply",
    seoDescription:
      "The latest artificial intelligence news from NUVORA, explained in plain English for people who want to understand what actually matters.",
  },
  {
    slug: "tools",
    name: "AI Tools",
    label: "AI Tools",
    description: "Clear, honest explanations of the AI tools people are actually using.",
    tagline: "What each tool is, who it is for, and whether it is worth your time.",
    seoTitle: "AI Tools Explained for Normal People",
    seoDescription:
      "NUVORA explains ChatGPT, Claude, Gemini, Perplexity and the tools that matter — what they do, who they are for, and how to choose.",
  },
  {
    slug: "everyday-ai",
    name: "Everyday AI",
    label: "Everyday AI",
    description: "Practical ways AI can help with the ordinary parts of life.",
    tagline: "Small, useful ways to put AI to work in your day.",
    seoTitle: "Everyday AI: Practical Uses for Real Life",
    seoDescription:
      "Practical, jargon-free ways to use AI for travel, email, planning, learning and the ordinary parts of life.",
  },
  {
    slug: "ai-at-work",
    name: "AI at Work",
    label: "AI at Work",
    description: "How AI is changing jobs, offices and careers — without the hype or the panic.",
    tagline: "Clear thinking about AI and your working life.",
    seoTitle: "AI at Work: Jobs, Careers and the Office",
    seoDescription:
      "How artificial intelligence is changing work, explained calmly and practically for professionals at every stage of their career.",
  },
  {
    slug: "guides",
    name: "Guides",
    label: "Guides",
    description: "Step-by-step guides that start from zero and assume nothing.",
    tagline: "Start here. We will walk you through it.",
    seoTitle: "NUVORA Guides: Learn AI Step by Step",
    seoDescription:
      "Beginner-friendly guides to understanding and using artificial intelligence, written for people who are new to it.",
  },
  {
    slug: "reviews",
    name: "Reviews",
    label: "Reviews",
    description: "Hands-on, plain-spoken reviews of AI products and features.",
    tagline: "We use it so you can decide whether you should.",
    seoTitle: "AI Product Reviews",
    seoDescription:
      "Honest, hands-on reviews of AI tools, apps and features from the NUVORA editorial team.",
  },
];

export const categoryMap: Record<CategorySlug, Category> = Object.fromEntries(
  categories.map((c) => [c.slug, c]),
) as Record<CategorySlug, Category>;

export function getCategory(slug: string): Category | undefined {
  return categories.find((c) => c.slug === slug);
}

export function categoryHref(slug: CategorySlug): string {
  return `/${slug}`;
}
