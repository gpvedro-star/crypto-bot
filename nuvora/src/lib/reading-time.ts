import type { ContentBlock } from "@/content/types";

const WORDS_PER_MINUTE = 220;

function blockText(block: ContentBlock): string {
  switch (block.type) {
    case "paragraph":
    case "whyItMatters":
    case "bottomLine":
      return block.text;
    case "heading":
      return block.text;
    case "quote":
      return block.text;
    case "list":
    case "keyTakeaways":
      return block.items.join(" ");
    case "callout":
      return `${block.title ?? ""} ${block.text}`;
    case "explains":
      return `${block.term} ${block.text}`;
    case "faq":
      return block.items.map((i) => `${i.question} ${i.answer}`).join(" ");
    case "table":
      return block.table.rows.flat().join(" ");
    case "toolRecommendation":
      return block.note;
    default:
      return "";
  }
}

export function countWords(blocks: ContentBlock[]): number {
  return blocks
    .map(blockText)
    .join(" ")
    .split(/\s+/)
    .filter(Boolean).length;
}

export function readingTimeMinutes(blocks: ContentBlock[]): number {
  return Math.max(1, Math.round(countWords(blocks) / WORDS_PER_MINUTE));
}
