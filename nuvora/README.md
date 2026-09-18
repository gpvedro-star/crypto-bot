# NUVORA — AI for Normal People

Premium editorial website for NUVORA, an American digital magazine that explains
artificial intelligence clearly, calmly and practically.

Built with **Next.js 16 (App Router) · React 19 · TypeScript · Tailwind CSS 4**.

```bash
cd nuvora
npm install
npm run dev       # http://localhost:3000
npm run build && npm run start
npm run lint && npm run typecheck
```

Copy `.env.example` to `.env.local` to configure the site URL, the editorial
API key and the newsletter provider.

## Brand

The official NUVORA logo is reproduced as vector assets in `public/brand/` and as
a React component (`src/components/brand/Logo.tsx`) with `full`, `wordmark` and
`mark` variants. Stems and wordmark inherit `currentColor`; the swoosh is always
brand blue `#5BA9E6`. Colors, type and spacing tokens live in
`src/app/globals.css` under `@theme`.

| Token | Value | Use |
| --- | --- | --- |
| `navy-900` | `#0B2D5B` | Authority: headlines, buttons, dark bands |
| `sky-500` | `#5BA9E6` | Single accent: rules, numerals, progress |
| `paper` | `#F8F9FB` | Page background |
| `cream` | `#FBFAF7` | Warm section background |

Typography: **Newsreader** (editorial serif, optical sizes) for headlines and
article body; **Inter** for navigation, metadata and UI. Base body size is 17–18px,
article body 19–21px with generous leading, tuned for readers aged 45+.

## Structure

```
src/
  app/                     Routes (App Router)
    page.tsx               Front page
    [category]/            /latest, /news, /tools, /everyday-ai, /ai-at-work, /guides, /reviews
    articles/[slug]/       Article template + per-article Open Graph image
    tools/[slug]/          AI tool pages (/tools/chatgpt, /tools/claude …)
    authors/[slug]/        Author pages
    search/                Search results page
    newsletter/            Newsletter landing
    about, editorial-standards, ai-usage-policy, corrections,
    contact, privacy, terms, affiliate-disclosure
    api/v1/                JSON API (see below)
    sitemap.ts robots.ts manifest.ts opengraph-image.tsx icon.svg
  components/
    brand/                 Logo
    layout/                Header, MobileNav, SearchDialog, Footer, Masthead
    cards/                 FeatureCard, HorizontalCard, ImageCard, TextCard, CompactCard,
                           TrendingItem, GuideCard, ToolCard, CategoryCard
    sections/              HeroSection, LatestSection, EverydaySection, ToolsSection,
                           MostRead, GuidesSection, NewsletterBlock
    article/               ArticleHeader, ArticleBody, EditorialBlocks (NUVORA Explains,
                           Why This Matters, The Bottom Line, Key Takeaways, Callout, FAQ,
                           ComparisonTable, ToolRecommendation), ReadingProgress, ShareBar,
                           AuthorCard, KeepReading, Breadcrumbs
    forms/                 NewsletterForm
    ads/                   AdSlot (monetization placeholders)
    ui/                    ArticleImage, ArticleMeta, TimeAgo, Reveal, SectionHeading, …
  content/                 Content model and sample editorial data
    types.ts               Article, ContentBlock, AITool, Author, Category, Guide, AffiliateLink
    articles/              19 sample stories grouped by desk
    tools.ts authors.ts categories.ts guides.ts affiliates.ts pages.ts site.ts
  lib/
    content.ts             Data layer — the only module pages import content from
    seo.ts                 Metadata builder + JSON-LD (Organization, WebSite, NewsArticle,
                           BreadcrumbList, FAQPage, SoftwareApplication)
    search.ts              In-memory search index (swap for a hosted index behind the same API)
    affiliates.ts          Central affiliate resolution (no partner URLs in components)
    monetization.ts        Ad slot registry (all disabled by default)
    api-auth.ts            Bearer-token auth for the editorial API
    dates.ts reading-time.ts
public/
  brand/                   Logo SVGs, app icons
  images/articles/         Placeholder featured artwork, 16:10, one per story slug
  images/guides/           Guide artwork
```

## Content model

Articles are typed documents: metadata plus an ordered list of **content
blocks** (`paragraph`, `heading`, `quote`, `list`, `image`, `gallery`, `table`,
`callout`, `explains`, `whyItMatters`, `bottomLine`, `keyTakeaways`, `faq`,
`toolRecommendation`, `divider`). Nothing is stored as HTML, so automation can read
any field directly. Every article also carries `shortSummary`, `socialSummary`,
`socialCaptions`, `hashtags`, `keyPoints`, `seoTitle` and `seoDescription` for the
social-content pipeline.

Replacing the static files with a database or headless CMS means changing
`src/lib/content.ts` only.

### Featured images

`ArticleImage` reserves a fixed aspect ratio (no layout shift) and reads
`article.featuredImage.src`. The image-generation agent replaces
`public/images/articles/<slug>.svg` (or points `src` at a remote host added to
`next.config.ts › images.remotePatterns`) without touching components.

## API

Public, cached, read-only:

| Endpoint | Purpose |
| --- | --- |
| `GET /api/v1/articles?category=&flag=&limit=&offset=` | Article summaries with social fields |
| `GET /api/v1/articles/:slug` | Full structured article incl. content blocks |
| `GET /api/v1/tools` · `GET /api/v1/categories` | Directory listings |
| `GET /api/v1/search?q=` | Powers the search dialog |
| `POST /api/v1/newsletter` | Validates and forwards sign-ups to the provider |

Authenticated (`Authorization: Bearer <NUVORA_EDITORIAL_API_KEY>`, constant-time
compare; disabled entirely when the key is unset):

| Endpoint | Purpose |
| --- | --- |
| `POST /api/v1/editorial/articles` | Create draft (validated; persistence returns 501 until storage is connected) |
| `PATCH /api/v1/editorial/articles?slug=` | Update content / status / category |
| `POST /api/v1/editorial/media` | Image upload |
| `POST /api/v1/editorial/schedule` | Schedule or publish |
| `GET /api/v1/analytics` | Aggregated readership |

## Monetization

`src/lib/monetization.ts` registers named slots (`home-after-hero`,
`article-inline`, `article-sidebar`, …). All are **disabled**; the site shows no
advertising. Enabling a slot reserves stable space and labels it. Affiliate links
are managed in `src/content/affiliates.ts` and resolved through `resolveAffiliate`,
which sets `rel="sponsored"` only when a partnership is active. Sponsored
stories are flagged on the article record and labelled in the header.

## Quality checks performed

- Every sitemap URL, homepage link and referenced image returns 200
- Desktop (1440), tablet (834) and mobile (390) renders with no horizontal overflow
- No console errors; `npm run lint` and `tsc` clean
- Keyboard: skip link first, ⌘/Ctrl+K opens search, arrow keys + Enter navigate results, Esc closes
- Semantic landmarks, one `h1` per page, alt text on every image, 44px+ touch targets
- JSON-LD for organization, website, article, breadcrumbs, FAQ and tools
- Reduced-motion preference disables all animation

## Editorial placeholders

Sample stories, tool pricing, verdicts and legal pages are labelled placeholders
for the editorial and legal teams to replace before launch.
