/**
 * NUVORA content model.
 *
 * Every article is a structured document: metadata + an ordered list of
 * typed content blocks. Nothing is stored as raw HTML, so automation agents
 * (social carousels, newsletters, syndication) can read individual fields and
 * blocks without parsing markup.
 */

export type CategorySlug =
  | "news"
  | "tools"
  | "everyday-ai"
  | "ai-at-work"
  | "guides"
  | "reviews";

export interface Category {
  slug: CategorySlug;
  name: string;
  /** Short navigation label. */
  label: string;
  description: string;
  /** One-line editorial promise shown on the category page. */
  tagline: string;
  seoTitle: string;
  seoDescription: string;
}

export interface Author {
  slug: string;
  name: string;
  role: string;
  bio: string;
  /** Initials used when no portrait is available. */
  initials: string;
  portrait?: ImageAsset;
  social?: { x?: string; linkedin?: string; email?: string };
}

export interface ImageAsset {
  src: string;
  alt: string;
  width: number;
  height: number;
  caption?: string;
  credit?: string;
  /** Tiny inline placeholder while the full image loads. */
  blurDataURL?: string;
}

export interface FAQItem {
  question: string;
  answer: string;
}

export interface ComparisonTable {
  caption?: string;
  columns: string[];
  rows: string[][];
}

/** Ordered, typed content blocks. Add new block types here and in ArticleBody. */
export type ContentBlock =
  | { type: "paragraph"; text: string }
  | { type: "heading"; level: 2 | 3; text: string; id?: string }
  | { type: "quote"; text: string; cite?: string }
  | { type: "list"; style: "bullet" | "number"; items: string[] }
  | { type: "image"; image: ImageAsset; size?: "body" | "wide" }
  | { type: "gallery"; images: ImageAsset[]; caption?: string }
  | { type: "table"; table: ComparisonTable }
  | { type: "callout"; title?: string; text: string; tone?: "neutral" | "important" }
  | { type: "explains"; term: string; text: string }
  | { type: "whyItMatters"; text: string }
  | { type: "bottomLine"; text: string }
  | { type: "keyTakeaways"; items: string[] }
  | { type: "faq"; items: FAQItem[] }
  | { type: "toolRecommendation"; toolSlug: string; note: string }
  | { type: "divider" };

export interface SocialCaptions {
  instagram?: string;
  facebook?: string;
  pinterest?: string;
  x?: string;
  tiktok?: string;
  linkedin?: string;
}

export type ArticleStatus = "draft" | "scheduled" | "published" | "archived";

export interface Article {
  id: string;
  slug: string;
  title: string;
  /** Deck / standfirst shown under the headline. */
  subtitle: string;
  /** Card-length summary (1–2 sentences). */
  excerpt: string;
  /** Very short summary for tight layouts and social previews. */
  shortSummary: string;
  content: ContentBlock[];
  category: CategorySlug;
  tags: string[];
  authorSlug: string;
  status: ArticleStatus;
  publishedAt: string; // ISO 8601
  updatedAt: string; // ISO 8601
  /** Minutes. Computed at build time if omitted. */
  readingTime?: number;
  featuredImage: ImageAsset;
  images?: ImageAsset[];
  featured?: boolean;
  trending?: boolean;
  popular?: boolean;
  /** Editorial flag for breaking / developing stories. */
  breaking?: boolean;
  sponsored?: { partner: string; disclosure: string } | null;
  seoTitle?: string;
  seoDescription?: string;
  socialSummary?: string;
  socialCaptions?: SocialCaptions;
  hashtags?: string[];
  keyPoints?: string[];
  keyTakeaways?: string[];
  relatedArticles?: string[]; // slugs
  /** IDs from content/affiliates.ts — never raw URLs. */
  affiliateLinks?: string[];
  /** Tools this article discusses (slugs from content/tools.ts). */
  tools?: string[];
}

export interface ToolPricingTier {
  name: string;
  price: string;
  note?: string;
}

export interface AITool {
  slug: string;
  name: string;
  maker: string;
  /** One short sentence. */
  tagline: string;
  description: string;
  /** Two-letter mark used until the official logo asset is supplied. */
  monogram: string;
  category: "assistant" | "search" | "writing" | "images" | "productivity";
  whoItsFor: string[];
  bestUses: string[];
  pricing: ToolPricingTier[];
  pros: string[];
  cons: string[];
  /** Editorial placeholder until a full NUVORA verdict is written. */
  verdict: string;
  officialUrl: string;
  /** ID from content/affiliates.ts, resolved centrally. */
  affiliateId?: string;
  updatedAt: string;
  featured?: boolean;
}

export interface Guide {
  slug: string;
  title: string;
  description: string;
  /** Article slug the guide currently points to. */
  articleSlug: string;
  level: "Beginner" | "Everyday" | "Practical" | "Safety";
  image: ImageAsset;
}

export interface AffiliateLink {
  id: string;
  label: string;
  /** Destination. Managed here only — never hard-coded in components. */
  url: string;
  partner: string;
  /** Set false to switch a link off site-wide without touching content. */
  active: boolean;
  /** Optional plain (non-affiliate) fallback when inactive. */
  fallbackUrl?: string;
}
