import { mix } from "../../../core/color";
import type { CreativeDirection } from "../../../core/types";

function rng(seedStr: string) {
  let h = 1779033703 ^ seedStr.length;
  for (let i = 0; i < seedStr.length; i++) { h = Math.imul(h ^ seedStr.charCodeAt(i), 3432918353); h = (h << 13) | (h >>> 19); }
  let a = h >>> 0;
  return () => { a |= 0; a = (a + 0x6d2b79f5) | 0; let t = Math.imul(a ^ (a >>> 15), 1 | a); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
}

/**
 * Flat, tonal placeholder scene. Deliberately abstract and labelled: it cannot be mistaken for real project photography.
 * "before" slots render bare ground; every other slot adds hills and vegetation.
 */
export function renderPlaceholderSvg(slot: string, palette: CreativeDirection["palette"], size: { w: number; h: number }): string {
  const { w, h } = size;
  const r = rng(slot);
  const dark = palette.mode === "dark";
  const sky = dark ? mix(palette.ground, palette.surface, 0.9) : palette.surface;
  const ground = palette.ground;
  const tone = (t: number) => mix(ground, palette.ink, t * (dark ? 1 : 0.9));
  const bare = slot === "before";
  const horizon = Math.round(h * (0.52 + r() * 0.08));
  const parts: string[] = [];
  parts.push(`<rect width="${w}" height="${h}" fill="${sky}"/>`);
  if (!bare) parts.push(`<circle cx="${Math.round(w * (0.2 + r() * 0.6))}" cy="${Math.round(horizon * 0.5)}" r="${Math.round(h * 0.06)}" fill="${palette.accent}" opacity="0.55"/>`);
  const hill = (base: number, amp: number, fill: string) => {
    const pts = [`M0 ${h}`, `L0 ${base}`];
    for (let x = 0; x <= w; x += w / 8) pts.push(`L${Math.round(x)} ${Math.round(base - r() * amp)}`);
    pts.push(`L${w} ${h}Z`);
    return `<path d="${pts.join(" ")}" fill="${fill}"/>`;
  };
  if (!bare) { parts.push(hill(horizon - h * 0.04, h * 0.1, tone(0.1))); parts.push(hill(horizon, h * 0.06, tone(0.16))); }
  parts.push(`<rect y="${horizon}" width="${w}" height="${h - horizon}" fill="${tone(bare ? 0.12 : 0.2)}"/>`);
  if (!bare) {
    // Slender cypress/palm-like silhouettes read as landscaping without pretending to be a photograph.
    const n = 9 + Math.floor(r() * 5);
    for (let i = 0; i < n; i++) {
      const x = Math.round(w * (0.04 + (i / n) * 0.92 + r() * 0.02));
      const base = Math.round(horizon + r() * (h - horizon) * 0.35);
      const ht = Math.round(h * (0.16 + r() * 0.2));
      parts.push(`<ellipse cx="${x}" cy="${base - ht / 2}" rx="${Math.round(ht * 0.09)}" ry="${Math.round(ht / 2)}" fill="${tone(0.22 + r() * 0.16)}"/>`);
    }
  }
  const label = "PLACEHOLDER · replace with project photography";
  parts.push(`<text x="${Math.round(w * 0.03)}" y="${h - Math.round(h * 0.035)}" font-family="system-ui, sans-serif" font-size="${Math.round(h * 0.022)}" letter-spacing="2" fill="${palette.muted}">${label}</text>`);
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${w} ${h}" width="${w}" height="${h}" role="img"><title>Placeholder image</title>${parts.join("")}</svg>\n`;
}
