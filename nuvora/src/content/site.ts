export const site = {
  name: "NUVORA",
  tagline: "AI for Normal People",
  description:
    "NUVORA is an American digital magazine that explains artificial intelligence clearly, calmly, and practically — for people who want to understand it, not build it.",
  url: process.env.NEXT_PUBLIC_SITE_URL ?? "https://nuvora.com",
  locale: "en_US",
  language: "en-US",
  foundingYear: 2026,
  publisher: {
    name: "NUVORA Media",
    legalName: "NUVORA Media, Inc.",
    email: "hello@nuvora.com",
    address: "New York, NY",
  },
  social: {
    x: "https://x.com/nuvora",
    facebook: "https://facebook.com/nuvora",
    instagram: "https://instagram.com/nuvora",
    linkedin: "https://linkedin.com/company/nuvora",
    pinterest: "https://pinterest.com/nuvora",
    tiktok: "https://tiktok.com/@nuvora",
    youtube: "https://youtube.com/@nuvora",
  },
  newsletter: {
    name: "The NUVORA Brief",
    cadence: "Twice a week",
  },
} as const;

export const primaryNav = [
  { label: "Latest", href: "/latest" },
  { label: "AI Tools", href: "/tools" },
  { label: "AI at Work", href: "/ai-at-work" },
  { label: "Everyday AI", href: "/everyday-ai" },
  { label: "Guides", href: "/guides" },
  { label: "News", href: "/news" },
  { label: "Reviews", href: "/reviews" },
] as const;

export const footerNav = {
  explore: [
    { label: "Latest", href: "/latest" },
    { label: "AI Tools", href: "/tools" },
    { label: "Everyday AI", href: "/everyday-ai" },
    { label: "AI at Work", href: "/ai-at-work" },
    { label: "Guides", href: "/guides" },
    { label: "News", href: "/news" },
    { label: "Reviews", href: "/reviews" },
  ],
  company: [
    { label: "About NUVORA", href: "/about" },
    { label: "Editorial Standards", href: "/editorial-standards" },
    { label: "AI Usage Policy", href: "/ai-usage-policy" },
    { label: "Corrections", href: "/corrections" },
    { label: "Contact", href: "/contact" },
  ],
  legal: [
    { label: "Privacy Policy", href: "/privacy" },
    { label: "Terms of Use", href: "/terms" },
    { label: "Affiliate Disclosure", href: "/affiliate-disclosure" },
  ],
} as const;
