/**
 * Site identity.
 *
 * Only facts that are actually known about NUVORA belong here. There is no
 * verified legal entity, registered address, founding date or contact mailbox
 * on record, so none is asserted — inventing them would manufacture
 * credibility the publication has not earned.
 *
 * Contact and social handles are read from the environment and are simply
 * absent until configured. Every consumer treats them as optional.
 */
function fromEnv(value: string | undefined): string | undefined {
  const v = value?.trim();
  return v ? v : undefined;
}

/** Public contact address. Unset until a real mailbox is configured. */
export const contactEmail = fromEnv(process.env.NEXT_PUBLIC_NUVORA_CONTACT_EMAIL);

/** Social profiles. Only configured handles are linked or declared to search engines. */
export const socialProfiles: { label: string; href: string }[] = [
  { label: "X", href: fromEnv(process.env.NEXT_PUBLIC_NUVORA_SOCIAL_X) },
  { label: "Facebook", href: fromEnv(process.env.NEXT_PUBLIC_NUVORA_SOCIAL_FACEBOOK) },
  { label: "Instagram", href: fromEnv(process.env.NEXT_PUBLIC_NUVORA_SOCIAL_INSTAGRAM) },
  { label: "LinkedIn", href: fromEnv(process.env.NEXT_PUBLIC_NUVORA_SOCIAL_LINKEDIN) },
  { label: "YouTube", href: fromEnv(process.env.NEXT_PUBLIC_NUVORA_SOCIAL_YOUTUBE) },
].flatMap((s) => (s.href ? [{ label: s.label, href: s.href }] : []));

export const site = {
  name: "NUVORA",
  tagline: "AI for Normal People",
  description:
    "NUVORA is an American digital magazine that explains artificial intelligence clearly, calmly, and practically — for people who want to understand it, not build it.",
  /**
   * Canonical origin. Set NEXT_PUBLIC_SITE_URL to the production domain; on
   * Netlify, URL (the site's primary address) is the fallback. There is no
   * hard-coded brand domain: nuvora.com is not known to be NUVORA's, and
   * canonicals pointing at it would hand ranking to whoever owns it.
   */
  url: process.env.NEXT_PUBLIC_SITE_URL ?? process.env.URL ?? "http://localhost:3000",
  locale: "en_US",
  language: "en-US",
  publisher: {
    /** No legal entity is on record; the publication is referred to by name. */
    name: "NUVORA",
    email: contactEmail,
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
  nuvora: [
    { label: "About NUVORA", href: "/about" },
    { label: "Contact", href: "/contact" },
    { label: "Newsletter", href: "/newsletter" },
  ],
  explore: [
    { label: "Latest", href: "/latest" },
    { label: "AI News", href: "/news" },
    { label: "Everyday AI", href: "/everyday-ai" },
    { label: "AI Tools", href: "/tools" },
    { label: "Guides", href: "/guides" },
  ],
  information: [
    { label: "Editorial Standards", href: "/editorial-standards" },
    { label: "Corrections", href: "/corrections" },
    { label: "AI Usage Policy", href: "/ai-usage-policy" },
    { label: "Affiliate Disclosure", href: "/affiliate-disclosure" },
    { label: "Privacy Policy", href: "/privacy" },
    { label: "Terms of Use", href: "/terms" },
  ],
} as const;
