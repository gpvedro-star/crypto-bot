import data from "../content/site.json";
import type { Common, SiteContent } from "./types";

const raw = data as unknown as SiteContent;
export const site: SiteContent = { ...raw, siteUrl: process.env.NEXT_PUBLIC_SITE_URL ?? raw.siteUrl };

/** Section data by id, merged with the common section props. */
export function sec<T>(id: string): T & Common {
  const s = site.sections.find((x) => x.id === id);
  if (!s) throw new Error(`Unknown section "${id}"`);
  return { id: s.id, tone: s.tone, layout: s.layout, ...s.props } as T & Common;
}
