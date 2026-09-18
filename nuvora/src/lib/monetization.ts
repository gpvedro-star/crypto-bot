/**
 * Monetization architecture.
 *
 * Ad and sponsorship slots exist in layouts today as named, empty
 * placeholders. Turning a slot on later is a configuration change here —
 * no page or component needs redesigning.
 */
export type AdSlotName =
  | "home-after-hero"
  | "home-mid"
  | "article-inline"
  | "article-sidebar"
  | "article-end"
  | "category-top"
  | "newsletter-sponsor";

export interface AdSlotConfig {
  enabled: boolean;
  /** Reserved height keeps layout stable when the slot is live (CLS-safe). */
  minHeight: number;
  label: string;
}

export const adSlots: Record<AdSlotName, AdSlotConfig> = {
  "home-after-hero": { enabled: false, minHeight: 120, label: "Advertisement" },
  "home-mid": { enabled: false, minHeight: 250, label: "Advertisement" },
  "article-inline": { enabled: false, minHeight: 250, label: "Advertisement" },
  "article-sidebar": { enabled: false, minHeight: 600, label: "Advertisement" },
  "article-end": { enabled: false, minHeight: 250, label: "Advertisement" },
  "category-top": { enabled: false, minHeight: 120, label: "Advertisement" },
  "newsletter-sponsor": { enabled: false, minHeight: 0, label: "Presented by" },
};

export const monetization = {
  /** Show "Sponsored" treatment on articles flagged as sponsored. */
  sponsoredStoriesEnabled: true,
  /** Sponsored placements in the tool directory. */
  sponsoredToolPlacementsEnabled: false,
};
