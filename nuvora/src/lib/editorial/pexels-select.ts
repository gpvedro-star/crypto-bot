/**
 * Pure, deterministic parts of the Pexels hero lookup: building the one search
 * query and choosing the one photo. No network, no environment, no imports
 * beyond types — so the selection rules can be tested offline and give the
 * same answer for the same input every time.
 */

export interface PexelsPhoto {
  id: number;
  width: number;
  height: number;
  url: string;
  photographer: string;
  photographer_url?: string;
  alt?: string | null;
  src: { original: string; [size: string]: string };
}

export interface QueryFields {
  final_headline?: string | null;
  summary?: string | null;
  category?: string | null;
  image_brief?: string | null;
  inline_image_brief?: string | null;
}

/** Target width of the stored hero. Photos narrower than this are skipped. */
export const HERO_WIDTH = 1920;
/** Landscape band that suits the article opening's 3:2 / 16:9 crops. */
const MIN_RATIO = 1.3;
const MAX_RATIO = 2.1;
const MAX_QUERY_WORDS = 8;

/**
 * Photos whose own description suggests the imagery NUVORA never uses. Pexels
 * has no negative search filter, so these are excluded after the search.
 */
const EXCLUDED_TERMS = [
  "robot",
  "android",
  "cyborg",
  "humanoid",
  "neon",
  "hologram",
  "holographic",
  "cyberpunk",
  "futuristic",
  "brain",
  "circuit",
  "matrix",
  "logo",
  "screenshot",
  "screen shot",
  "interface",
  "glowing",
];

// Search noise: words that carry no visual meaning, plus "AI" terms, which on
// a stock library pull straight towards robots and glowing brains.
const STOP_WORDS = new Set([
  "a", "an", "and", "the", "of", "to", "in", "on", "for", "with", "at", "by", "from", "as", "is", "are", "was",
  "be", "it", "its", "this", "that", "these", "those", "your", "you", "how", "what", "why", "when", "who",
  "here", "there", "about", "into", "over", "after", "before", "now", "new", "just", "can", "will", "not",
  "ai", "a.i", "artificial", "intelligence", "chatgpt", "gemini", "openai", "copilot", "claude", "llm",
]);

function words(text: string | null | undefined): string[] {
  return (text ?? "")
    .toLowerCase()
    .replace(/[^a-z0-9\s'-]/g, " ")
    .split(/\s+/)
    .map((w) => w.replace(/^['-]+|['-]+$/g, ""))
    .filter((w) => w.length > 1 && !STOP_WORDS.has(w));
}

/** Plain visual scenes for NUVORA's own sections, used only when a draft gives nothing better. */
const CATEGORY_SCENES: Record<string, string> = {
  news: "morning newspaper coffee table",
  tools: "laptop home desk daylight",
  "everyday-ai": "everyday life home kitchen",
  "ai-at-work": "office colleagues working together",
  guides: "notebook planning desk",
  reviews: "laptop desk natural light",
};
const DEFAULT_SCENE = "calm home office desk";

/**
 * The single search query. The image brief is written for exactly this job,
 * so it wins; otherwise the headline, then the summary. Category is used only
 * as a last resort, because a section name like "news" or "tools" is not a
 * picture. At most eight meaningful words — Pexels matches short keyword
 * phrases far better than sentences.
 */
export function buildPexelsQuery(fields: QueryFields): string {
  for (const source of [fields.image_brief, fields.final_headline, fields.summary]) {
    const w = words(source);
    if (w.length >= 2) return w.slice(0, MAX_QUERY_WORDS).join(" ");
  }
  const section = (fields.category ?? "").toLowerCase().trim();
  return CATEGORY_SCENES[section] ?? DEFAULT_SCENE;
}

/**
 * The single search query for the inline photo. The writer's inline brief is
 * written for exactly this job, so it wins; without one the summary comes
 * before the headline, so the search leans towards the body rather than
 * repeating the hero's framing. Never the hero's own brief.
 */
export function buildInlinePexelsQuery(fields: QueryFields): string {
  for (const source of [fields.inline_image_brief, fields.summary, fields.final_headline]) {
    const w = words(source);
    if (w.length >= 2) return w.slice(0, MAX_QUERY_WORDS).join(" ");
  }
  const section = (fields.category ?? "").toLowerCase().trim();
  return CATEGORY_SCENES[section] ?? DEFAULT_SCENE;
}

function isExcluded(photo: PexelsPhoto): boolean {
  const alt = (photo.alt ?? "").toLowerCase();
  return EXCLUDED_TERMS.some((term) => alt.includes(term));
}

/**
 * The first photo, in Pexels' own relevance order, that is wide enough, sits
 * in the landscape band, has a photographer to credit, and whose description
 * doesn't match the excluded imagery. No scoring, no randomness.
 */
export function selectPexelsPhoto(photos: PexelsPhoto[], options: { excludeIds?: number[] } = {}): PexelsPhoto | null {
  const excluded = new Set(options.excludeIds ?? []);
  for (const photo of photos) {
    if (!photo || !photo.src?.original || !photo.url || !photo.photographer?.trim()) continue;
    // Already used on this article (the inline photo is never the hero).
    if (excluded.has(photo.id)) continue;
    if (!(photo.width >= HERO_WIDTH) || !(photo.height > 0)) continue;
    const ratio = photo.width / photo.height;
    if (ratio < MIN_RATIO || ratio > MAX_RATIO) continue;
    if (isExcluded(photo)) continue;
    return photo;
  }
  return null;
}

/** The exact rendition to download, and its resulting dimensions. */
export function heroRendition(photo: PexelsPhoto): { url: string; width: number; height: number } {
  const url = new URL(photo.src.original);
  url.search = "";
  url.searchParams.set("auto", "compress");
  url.searchParams.set("cs", "tinysrgb");
  url.searchParams.set("w", String(HERO_WIDTH));
  return { url: url.toString(), width: HERO_WIDTH, height: Math.round((HERO_WIDTH * photo.height) / photo.width) };
}

/** Truthful credit, in the form Pexels asks for. */
export function pexelsCredit(photo: Pick<PexelsPhoto, "photographer">): string {
  return `Photo by ${photo.photographer.trim()} on Pexels`;
}
