import fs from "node:fs";
import path from "node:path";
import jpeg from "jpeg-js";
import { PNG } from "pngjs";
import type { Agent } from "../core/agent";
import type { BrandProfile } from "../core/types";
import { hexToHsl, rgbToHex } from "../core/color";

interface Pixels { data: Uint8Array | Buffer; width: number; height: number }

function decode(file: string): Pixels {
  const buf = fs.readFileSync(file);
  const ext = path.extname(file).toLowerCase();
  if (ext === ".png") { const p = PNG.sync.read(buf); return { data: p.data, width: p.width, height: p.height }; }
  if (ext === ".jpg" || ext === ".jpeg") { const j = jpeg.decode(buf, { useTArray: true, maxMemoryUsageInMB: 512 }); return { data: j.data, width: j.width, height: j.height }; }
  throw new Error(`Unsupported logo format ${ext} (use png or jpg)`);
}

/** Quantize to 4 bits/channel and rank buckets. Pure-JS so it runs anywhere. */
export function extractPalette(px: Pixels, maxColors = 6) {
  const buckets = new Map<number, { r: number; g: number; b: number; n: number }>();
  const step = Math.max(1, Math.floor(Math.sqrt((px.width * px.height) / 60000)));
  let total = 0;
  for (let y = 0; y < px.height; y += step) {
    for (let x = 0; x < px.width; x += step) {
      const i = (y * px.width + x) * 4;
      const r = px.data[i], g = px.data[i + 1], b = px.data[i + 2];
      if (px.data[i + 3] < 128) continue;
      // Pure-black letterbox bars are common in exported logos; they are not a brand color.
      if (r < 10 && g < 10 && b < 10) continue;
      const key = ((r >> 4) << 8) | ((g >> 4) << 4) | (b >> 4);
      const cur = buckets.get(key) ?? { r: 0, g: 0, b: 0, n: 0 };
      cur.r += r; cur.g += g; cur.b += b; cur.n++;
      buckets.set(key, cur);
      total++;
    }
  }
  return [...buckets.values()]
    .sort((a, b) => b.n - a.n)
    .map((v) => ({ hex: rgbToHex(v.r / v.n, v.g / v.n, v.b / v.n), share: v.n / total }))
    .reduce<{ hex: string; share: number }[]>((acc, c) => {
      // merge near-duplicates so six distinct colors surface
      const near = acc.find((a) => colorDistance(a.hex, c.hex) < 48);
      if (near) near.share += c.share; else acc.push({ ...c });
      return acc;
    }, [])
    .sort((a, b) => b.share - a.share)
    .slice(0, maxColors);
}

function colorDistance(a: string, b: string): number {
  const p = (h: string) => [1, 3, 5].map((i) => parseInt(h.slice(i, i + 2), 16));
  const [r1, g1, b1] = p(a), [r2, g2, b2] = p(b);
  return Math.hypot(r1 - r2, g1 - g2, b1 - b2);
}

function hueName(h: number): string {
  if (h < 15 || h >= 345) return "red";
  if (h < 45) return "orange";
  if (h < 70) return "yellow/gold";
  if (h < 165) return "green";
  if (h < 200) return "teal";
  if (h < 260) return "blue";
  if (h < 300) return "purple";
  return "magenta";
}

const HUE_PERSONALITY: Record<string, string[]> = {
  blue: ["technological", "precise", "trustworthy"],
  teal: ["fresh", "modern", "calm"],
  green: ["natural", "grounded", "growth-oriented"],
  "yellow/gold": ["optimistic", "premium-warm", "energetic"],
  orange: ["energetic", "friendly", "bold"],
  red: ["urgent", "passionate", "bold"],
  purple: ["creative", "luxurious", "imaginative"],
  magenta: ["expressive", "playful", "distinctive"],
};

/** Saturated, mid-lightness colors with real presence make the best brand accent (highlights and glows rank lower). */
function accentScore(c: { share: number; hsl: { s: number; l: number } }) { return c.hsl.s * Math.sqrt(c.share) * (1 - Math.abs(c.hsl.l - 0.5)); }

export const brandAgent: Agent<BrandProfile> = {
  id: "brand",
  label: "Brand",
  async run(ctx) {
    const logo = ctx.input.logoPath;
    if (!logo || !fs.existsSync(logo)) {
      ctx.report({ usedLLM: "knowledge-base", summary: "No brand assets provided; creative direction is free" });
      return { provided: false, colors: [], personality: [], tone: "", shapes: [], typographyCharacter: "", notes: ["No logo provided; the Creative Director defines the identity."] };
    }
    const px = decode(logo);
    const palette = extractPalette(px);
    const withHsl = palette.map((c) => ({ ...c, hsl: hexToHsl(c.hex) }));
    const background = withHsl[0];
    // Brand accent: the most saturated color that occupies a meaningful share of non-background pixels.
    const accent = [...withHsl].filter((c) => c.hsl.s > 0.45 && c.hsl.l > 0.2 && c.hsl.l < 0.8)
      .sort((a, b) => accentScore(b) - accentScore(a))[0];
    const light = [...withHsl].filter((c) => c.hsl.l > 0.6 && c.hsl.s < 0.25).sort((a, b) => b.share - a.share)[0];

    const colors = withHsl.map((c) => ({
      hex: c.hex, share: Math.round(c.share * 1000) / 1000,
      role: c === background ? "background" : c === accent ? "accent" : c === light ? "text/neutral" : "supporting",
    }));
    const personality = [
      background.hsl.l < 0.25 ? "dark, high-contrast presentation" : "light, open presentation",
      ...(accent ? HUE_PERSONALITY[hueName(accent.hsl.h)] ?? [] : []),
    ];
    const profile: BrandProfile = {
      provided: true,
      colors,
      personality,
      tone: accent && accent.hsl.s > 0.6 ? "confident, technical, forward-looking" : "measured, established",
      shapes: [],
      typographyCharacter: "Not detectable by pixel analysis; enable an Anthropic key for vision-based typography and shape analysis. The Creative Director should choose clean geometric sans-serif faces if the logo wordmark looks geometric.",
      notes: [
        `Dominant ${hueName(accent?.hsl.h ?? 0)} accent ${accent?.hex ?? "n/a"} on ${background.hex} ground extracted from ${path.basename(logo)}.`,
        "Existing brand colors are preserved by the Creative Director; the brand is extended, not redesigned.",
      ],
    };
    // Publish the logo so the site can use it.
    const destDir = path.join(ctx.memory.siteDir, "public", "brand");
    fs.mkdirSync(destDir, { recursive: true });
    const dest = `logo${path.extname(logo).toLowerCase()}`;
    fs.copyFileSync(logo, path.join(destDir, dest));
    profile.logoUrl = `/brand/${dest}`;
    ctx.memory.recordDecision({ agent: "brand", key: "brand-accent", value: accent?.hex ?? "none", rationale: "Extracted from provided logo" });
    ctx.report({ usedLLM: "pixel-analysis", summary: `Extracted ${colors.length} colors; accent ${accent?.hex}` });
    return profile;
  },
};
