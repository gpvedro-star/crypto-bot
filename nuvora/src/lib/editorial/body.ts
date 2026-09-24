import type { ComparisonTable, ContentBlock, FAQItem, ImageAsset } from "@/content/types";
import type { EditorialImageAsset } from "./contract";

/**
 * Converts an editorial record's `article_body` into the site's typed content
 * blocks.
 *
 * Everything here is a whitelist. Nothing a publishing agent sends is ever
 * rendered as markup: text is stripped of tags and rendered by ArticleBody as
 * React children, block types outside the content model are dropped, and image
 * URLs must survive `safeImageUrl`. There is no path from a stored record to
 * `dangerouslySetInnerHTML`.
 */

const MAX_BLOCKS = 400;
const MAX_TEXT = 20_000;
const MAX_ITEMS = 60;

/** Hosts whose images may be rendered. Must match next.config's remotePatterns. */
export function allowedImageHosts(): string[] {
  return (process.env.NUVORA_IMAGE_HOSTS ?? "")
    .split(",")
    .map((h) => h.trim().toLowerCase())
    .filter(Boolean);
}

/**
 * Plain text from an untrusted value: tags removed, markdown emphasis and link
 * syntax flattened to their visible text, whitespace collapsed, length capped.
 */
export function safeText(value: unknown, max = MAX_TEXT): string {
  if (typeof value !== "string") return "";
  return value
    .replace(/<[^>]*>/g, " ")
    .replace(/\[([^\]]{1,300})\]\(([^)\s]{1,2000})\)/g, "$1")
    .replace(/(\*\*|__)(.*?)\1/g, "$2")
    .replace(/[ \t]*\r?\n[ \t]*/g, " ")
    .replace(/\s{2,}/g, " ")
    .trim()
    .slice(0, max);
}

/**
 * An image URL we are willing to render. Same-origin paths always; remote URLs
 * only over https from a host on the allowlist, because next/image would
 * otherwise be asked to fetch an arbitrary origin.
 */
export function safeImageUrl(value: unknown): string | null {
  if (typeof value !== "string") return null;
  const raw = value.trim();
  if (!raw) return null;
  if (raw.startsWith("//")) return null;
  if (raw.startsWith("/")) return /^\/[A-Za-z0-9._~\-/%]*$/.test(raw) ? raw : null;
  let url: URL;
  try {
    url = new URL(raw);
  } catch {
    return null;
  }
  if (url.protocol !== "https:") return null;
  return allowedImageHosts().includes(url.hostname.toLowerCase()) ? url.toString() : null;
}

/** A link URL safe to put in an href: http(s) or same-origin only. */
export function safeLinkUrl(value: unknown): string | null {
  if (typeof value !== "string") return null;
  const raw = value.trim();
  if (!raw || raw.startsWith("//")) return null;
  if (raw.startsWith("/")) return /^\/[^\s"'<>]*$/.test(raw) ? raw : null;
  try {
    const url = new URL(raw);
    return url.protocol === "https:" || url.protocol === "http:" ? url.toString() : null;
  } catch {
    return null;
  }
}

export function toImageAsset(input: unknown, fallbackAlt = ""): ImageAsset | null {
  if (!input || typeof input !== "object") return null;
  const a = input as Partial<EditorialImageAsset> & { src?: string };
  const src = safeImageUrl(a.url ?? a.src);
  if (!src) return null;
  const width = typeof a.width === "number" && a.width > 0 ? Math.min(Math.round(a.width), 6000) : 1600;
  const height = typeof a.height === "number" && a.height > 0 ? Math.min(Math.round(a.height), 6000) : 1000;
  return {
    src,
    alt: safeText(a.alt, 300) || safeText(fallbackAlt, 300),
    width,
    height,
    caption: safeText(a.caption, 400) || undefined,
    credit: safeText(a.credit, 200) || undefined,
  };
}

function strings(value: unknown, max = MAX_ITEMS): string[] {
  if (!Array.isArray(value)) return [];
  return value
    .map((v) => safeText(v, 600))
    .filter(Boolean)
    .slice(0, max);
}

/** One already-structured block, accepted only if it matches the content model. */
function normalizeBlock(input: unknown): ContentBlock | null {
  if (typeof input === "string") {
    const text = safeText(input);
    return text ? { type: "paragraph", text } : null;
  }
  if (!input || typeof input !== "object") return null;
  const b = input as Record<string, unknown>;
  const type = typeof b.type === "string" ? b.type.trim() : "";
  // Common alternative shapes from upstream tooling.
  const text = safeText(b.text ?? b.content ?? b.value ?? b.body);

  switch (type) {
    case "paragraph":
    case "text":
    case "p":
      return text ? { type: "paragraph", text } : null;

    case "heading":
    case "h2":
    case "h3": {
      if (!text) return null;
      const raw = b.level ?? (type === "h3" ? 3 : 2);
      const level = Number(raw) === 3 ? 3 : 2;
      return { type: "heading", level, text: safeText(text, 200) };
    }

    case "quote":
    case "blockquote": {
      if (!text) return null;
      const cite = safeText(b.cite ?? b.attribution, 200);
      return { type: "quote", text, ...(cite ? { cite } : {}) };
    }

    case "list":
    case "bullets":
    case "ul":
    case "ol": {
      const items = strings(b.items ?? b.values);
      if (!items.length) return null;
      const style = b.style === "number" || b.ordered === true || type === "ol" ? "number" : "bullet";
      return { type: "list", style, items };
    }

    case "image": {
      const image = toImageAsset(b.image ?? b);
      if (!image) return null;
      return { type: "image", image, size: b.size === "wide" ? "wide" : "body" };
    }

    case "gallery": {
      const images = (Array.isArray(b.images) ? b.images : [])
        .map((i) => toImageAsset(i))
        .filter((i): i is ImageAsset => Boolean(i))
        .slice(0, 12);
      if (!images.length) return null;
      const caption = safeText(b.caption, 400);
      return { type: "gallery", images, ...(caption ? { caption } : {}) };
    }

    case "table": {
      const t = (b.table ?? b) as Record<string, unknown>;
      const columns = strings(t.columns ?? t.headers, 8);
      const rawRows = Array.isArray(t.rows) ? t.rows : [];
      const rows = rawRows
        .map((r) => strings(r, 8))
        .filter((r) => r.length > 0)
        .slice(0, 40);
      if (!columns.length || !rows.length) return null;
      const caption = safeText(t.caption, 300);
      const table: ComparisonTable = { columns, rows, ...(caption ? { caption } : {}) };
      return { type: "table", table };
    }

    case "callout":
    case "note": {
      if (!text) return null;
      const title = safeText(b.title, 200);
      return {
        type: "callout",
        text,
        ...(title ? { title } : {}),
        tone: b.tone === "important" ? "important" : "neutral",
      };
    }

    case "explains":
    case "definition": {
      const term = safeText(b.term ?? b.title, 200);
      if (!term || !text) return null;
      return { type: "explains", term, text };
    }

    case "whyItMatters":
    case "why_it_matters":
      return text ? { type: "whyItMatters", text } : null;

    case "bottomLine":
    case "bottom_line":
      return text ? { type: "bottomLine", text } : null;

    case "keyTakeaways":
    case "key_takeaways": {
      const items = strings(b.items ?? b.takeaways);
      return items.length ? { type: "keyTakeaways", items } : null;
    }

    case "faq": {
      const raw = Array.isArray(b.items) ? b.items : [];
      const items = raw
        .map((i): FAQItem | null => {
          const q = safeText((i as Record<string, unknown>)?.question, 300);
          const a = safeText((i as Record<string, unknown>)?.answer, 2000);
          return q && a ? { question: q, answer: a } : null;
        })
        .filter((i): i is FAQItem => Boolean(i))
        .slice(0, 20);
      return items.length ? { type: "faq", items } : null;
    }

    case "divider":
    case "hr":
      return { type: "divider" };

    // `toolRecommendation` is deliberately not accepted: it renders a NUVORA
    // recommendation of a specific tool, which is an editorial judgement the
    // desk makes, not something an automated submission can assert.
    default:
      return text ? { type: "paragraph", text } : null;
  }
}

/**
 * Markdown-lite for records whose body is plain copy: ATX headings, `-`/`*`
 * bullets, `1.` numbers, `>` quotes, `---` rules, blank-line paragraphs.
 */
function fromPlainText(body: string): ContentBlock[] {
  const blocks: ContentBlock[] = [];
  const lines = body.replace(/\r\n/g, "\n").split("\n");
  let paragraph: string[] = [];
  let list: { style: "bullet" | "number"; items: string[] } | null = null;

  const flushParagraph = () => {
    const text = safeText(paragraph.join(" "));
    paragraph = [];
    if (text) blocks.push({ type: "paragraph", text });
  };
  const flushList = () => {
    if (list && list.items.length) blocks.push({ type: "list", style: list.style, items: list.items });
    list = null;
  };
  const flush = () => {
    flushParagraph();
    flushList();
  };

  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed) {
      flush();
      continue;
    }
    const heading = /^(#{2,4})\s+(.*)$/.exec(trimmed);
    if (heading) {
      flush();
      const text = safeText(heading[2], 200);
      if (text) blocks.push({ type: "heading", level: heading[1].length >= 3 ? 3 : 2, text });
      continue;
    }
    if (/^(-{3,}|\*{3,}|_{3,})$/.test(trimmed)) {
      flush();
      blocks.push({ type: "divider" });
      continue;
    }
    const quote = /^>\s?(.*)$/.exec(trimmed);
    if (quote) {
      flush();
      const text = safeText(quote[1]);
      if (text) blocks.push({ type: "quote", text });
      continue;
    }
    const bullet = /^[-*•]\s+(.*)$/.exec(trimmed);
    const numbered = /^\d{1,3}[.)]\s+(.*)$/.exec(trimmed);
    if (bullet || numbered) {
      flushParagraph();
      const style = bullet ? "bullet" : "number";
      if (!list || list.style !== style) {
        flushList();
        list = { style, items: [] };
      }
      const item = safeText((bullet ?? numbered)![1], 600);
      if (item) list.items.push(item);
      continue;
    }
    flushList();
    paragraph.push(trimmed);
  }
  flush();
  return blocks;
}

/** The whole conversion. Always returns blocks the site can render. */
export function toContentBlocks(body: unknown): ContentBlock[] {
  let blocks: ContentBlock[] = [];
  if (typeof body === "string") {
    blocks = fromPlainText(body);
  } else if (Array.isArray(body)) {
    blocks = body.map(normalizeBlock).filter((b): b is ContentBlock => Boolean(b));
  } else if (body && typeof body === "object") {
    const inner = (body as Record<string, unknown>).blocks ?? (body as Record<string, unknown>).content;
    if (Array.isArray(inner)) blocks = inner.map(normalizeBlock).filter((b): b is ContentBlock => Boolean(b));
  }
  return blocks.slice(0, MAX_BLOCKS);
}
