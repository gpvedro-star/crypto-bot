import { affiliateLinks } from "@/content/affiliates";
import type { AffiliateLink } from "@/content/types";

export interface ResolvedLink {
  href: string;
  label: string;
  partner: string;
  /** True when the destination is a tracked partner link. */
  isAffiliate: boolean;
  rel: string;
}

/**
 * Resolve an affiliate ID to a destination. This is the only place partner
 * URLs are turned into anchors, which keeps disclosure and rel attributes
 * consistent and lets partnerships be switched on or off centrally.
 */
export function resolveAffiliate(id: string | undefined, fallbackUrl?: string): ResolvedLink | null {
  const link: AffiliateLink | undefined = id ? affiliateLinks.find((l) => l.id === id) : undefined;
  if (!link) {
    return fallbackUrl
      ? { href: fallbackUrl, label: "Visit website", partner: "", isAffiliate: false, rel: "noopener" }
      : null;
  }
  if (link.active) {
    return { href: link.url, label: link.label, partner: link.partner, isAffiliate: true, rel: "sponsored noopener" };
  }
  const href = link.fallbackUrl ?? fallbackUrl;
  return href ? { href, label: link.label, partner: link.partner, isAffiliate: false, rel: "noopener" } : null;
}
