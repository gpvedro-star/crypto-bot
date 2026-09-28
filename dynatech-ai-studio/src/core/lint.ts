/** Copy linting shared by the Copy Agent (to avoid) and the QA Agent (to detect). */

export const BANNED_PHRASES: { re: RegExp; label: string; replacement: string }[] = [
  { re: /welcome to (our|my|the) (website|site|page)/gi, label: "welcome to our website", replacement: "" },
  { re: /\bworld[- ]class\b/gi, label: "world-class", replacement: "exceptional" },
  { re: /\bcutting[- ]edge\b/gi, label: "cutting-edge", replacement: "modern" },
  { re: /\bstate[- ]of[- ]the[- ]art\b/gi, label: "state-of-the-art", replacement: "modern" },
  { re: /\bseamless(ly)?\b/gi, label: "seamless", replacement: "smooth" },
  { re: /\bunlock (the )?(power|potential)\b/gi, label: "unlock the potential", replacement: "use" },
  { re: /\belevate your\b/gi, label: "elevate your", replacement: "improve your" },
  { re: /\bleverage\b/gi, label: "leverage", replacement: "use" },
  { re: /\bone[- ]stop[- ]shop\b/gi, label: "one-stop shop", replacement: "single team" },
  { re: /\bsecond to none\b/gi, label: "second to none", replacement: "exacting" },
  { re: /\bwe pride ourselves\b/gi, label: "we pride ourselves", replacement: "we focus" },
  { re: /\bpassionate about\b/gi, label: "passionate about", replacement: "focused on" },
  { re: /\bbest[- ]in[- ]class\b/gi, label: "best-in-class", replacement: "high-standard" },
  { re: /\bgame[- ]chang(er|ing)\b/gi, label: "game-changing", replacement: "meaningful" },
];

/** Claims that would be facts about the business; never allowed unless supplied by the user. */
export const CLAIM_PATTERNS: { re: RegExp; label: string }[] = [
  { re: /\b\d{1,4}\+?\s*(years?|projects?|clients?|homes?|customers?|reviews?|five[- ]star)\b/i, label: "numeric track-record claim" },
  { re: /\baward[- ]winning\b/i, label: "award claim" },
  { re: /\b(#1|number one|top[- ]rated|best in (the )?(city|state|miami|florida|america))\b/i, label: "ranking claim" },
  { re: /\b(fully )?licensed (and|&) insured\b/i, label: "licensing claim" },
  { re: /\bguarantee[ds]?\b/i, label: "guarantee claim" },
  { re: /\b(family[- ]owned|since \d{4}|founded in)\b/i, label: "history claim" },
];

export function findBanned(text: string): string[] {
  return BANNED_PHRASES.filter((b) => { b.re.lastIndex = 0; return b.re.test(text); }).map((b) => b.label);
}
export function findClaims(text: string): string[] {
  return CLAIM_PATTERNS.filter((c) => c.re.test(text)).map((c) => c.label);
}
export function scrubBanned(text: string): string {
  let out = text;
  for (const b of BANNED_PHRASES) out = out.replace(b.re, b.replacement);
  return out.replace(/\s{2,}/g, " ").replace(/\s+([.,;:!?])/g, "$1").trim();
}

/** Walk any JSON value and apply fn to every string. */
export function mapStrings<T>(value: T, fn: (s: string, path: string) => string, path = ""): T {
  if (typeof value === "string") return fn(value, path) as unknown as T;
  if (Array.isArray(value)) return value.map((v, i) => mapStrings(v, fn, `${path}[${i}]`)) as unknown as T;
  if (value && typeof value === "object") {
    return Object.fromEntries(Object.entries(value).map(([k, v]) => [k, mapStrings(v, fn, path ? `${path}.${k}` : k)])) as T;
  }
  return value;
}
export function collectStrings(value: unknown, path = ""): { path: string; text: string }[] {
  if (typeof value === "string") return [{ path, text: value }];
  if (Array.isArray(value)) return value.flatMap((v, i) => collectStrings(v, `${path}[${i}]`));
  if (value && typeof value === "object") return Object.entries(value).flatMap(([k, v]) => collectStrings(v, path ? `${path}.${k}` : k));
  return [];
}
