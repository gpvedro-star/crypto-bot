import type { ContentBlock } from "@/content/types";

export interface OutlineEntry {
  id: string;
  text: string;
  level: 2 | 3;
}

function slugify(text: string): string {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");
}

/**
 * Stable, unique anchor ids for every heading in an article, keyed by block
 * index. The body and the table of contents both read from this, so a link in
 * the contents always lands on the heading it names — including when two
 * headings share the same text.
 */
export function headingIds(blocks: ContentBlock[]): Map<number, string> {
  const ids = new Map<number, string>();
  const used = new Map<string, number>();
  blocks.forEach((block, i) => {
    if (block.type !== "heading") return;
    const base = block.id ?? (slugify(block.text) || "section");
    const n = used.get(base) ?? 0;
    used.set(base, n + 1);
    ids.set(i, n === 0 ? base : `${base}-${n + 1}`);
  });
  return ids;
}

/** Top-level sections, for the table of contents. */
export function articleOutline(blocks: ContentBlock[]): OutlineEntry[] {
  const ids = headingIds(blocks);
  const out: OutlineEntry[] = [];
  blocks.forEach((block, i) => {
    if (block.type === "heading" && block.level === 2) out.push({ id: ids.get(i)!, text: block.text, level: 2 });
    if (block.type === "faq") out.push({ id: "faq-heading", text: "Common questions", level: 2 });
  });
  return out;
}
