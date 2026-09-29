import type { ContentBlock, ImageAsset } from "@/content/types";

/**
 * Where the one "middle" inline photo goes: after a paragraph, as close as
 * possible to the point 47.5% of the way through the article's text (the
 * middle of the 40–55% band). Deterministic — the same body always gets the
 * same position.
 *
 * Candidates are the gaps directly after a paragraph, excluding:
 * - the first paragraph (too close to the hero and the opening),
 * - the last block (it would sit against the end matter / Sources),
 * - a gap followed by a list, quote or table, which reads as interrupting it.
 * Headings, lists, quotes and other blocks are atomic, so the image can
 * never land inside one. If no gap qualifies — a very short piece — the photo
 * is simply not shown rather than forced somewhere awkward.
 */
export const INLINE_TARGET = 0.475;

const WEIGHTED: Record<string, (b: ContentBlock) => number> = {
  paragraph: (b) => (b as { text: string }).text.length,
  heading: (b) => (b as { text: string }).text.length,
  quote: (b) => (b as { text: string }).text.length,
  list: (b) => (b as { items: string[] }).items.join(" ").length,
};

function weight(block: ContentBlock): number {
  const w = WEIGHTED[block.type];
  // Structured blocks (tables, prompts, FAQs…) still take room on the page.
  return w ? Math.max(1, w(block)) : 200;
}

const AWKWARD_NEXT = new Set<ContentBlock["type"]>(["list", "quote", "table", "image", "gallery"]);

/** Index to insert at (the image goes before `blocks[index]`), or -1 when no gap qualifies. */
export function inlineInsertIndex(blocks: ContentBlock[]): number {
  const firstParagraph = blocks.findIndex((b) => b.type === "paragraph");
  if (firstParagraph < 0) return -1;
  const total = blocks.reduce((sum, b) => sum + weight(b), 0);
  if (total <= 0) return -1;

  let running = 0;
  let best = -1;
  let bestDistance = Infinity;
  for (let i = 0; i < blocks.length; i++) {
    running += weight(blocks[i]);
    if (blocks[i].type !== "paragraph") continue;
    if (i <= firstParagraph) continue;
    if (i >= blocks.length - 1) continue;
    if (AWKWARD_NEXT.has(blocks[i + 1].type)) continue;
    const distance = Math.abs(running / total - INLINE_TARGET);
    // Strictly closer wins, so ties keep the earlier gap.
    if (distance < bestDistance) {
      best = i + 1;
      bestDistance = distance;
    }
  }
  return best;
}

/** The body with the middle inline photo in place (unchanged when there is none or no gap qualifies). */
export function withInlineImage(blocks: ContentBlock[], image: ImageAsset | null): ContentBlock[] {
  if (!image) return blocks;
  const at = inlineInsertIndex(blocks);
  if (at < 0) return blocks;
  return [...blocks.slice(0, at), { type: "image", image, size: "body" }, ...blocks.slice(at)];
}
