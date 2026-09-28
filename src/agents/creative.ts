import { askLLM, type Agent } from "../core/agent";
import { ensureContrast, mix } from "../core/color";
import { CreativeSchema } from "../core/schemas";
import type { CreativeDirection } from "../core/types";
import { cityOf } from "../knowledge";

type Pal = CreativeDirection["palette"];

/** Palette presets per industry × mode. All hex values chosen for AA contrast of ink on ground. */
const PALETTES: Record<string, { dark: Pal; light: Pal }> = {
  landscaping: {
    dark: { name: "Night Garden", mode: "dark", ground: "#0d1410", surface: "#141d18", ink: "#ece6d6", accent: "#c4a668", muted: "#9aa596" },
    light: { name: "Limestone & Fern", mode: "light", ground: "#f3efe6", surface: "#e9e3d4", ink: "#16211b", accent: "#5b6f4a", muted: "#5f6a5c" },
  },
  restaurant: {
    dark: { name: "Candlelight", mode: "dark", ground: "#14100d", surface: "#1d1712", ink: "#f0e6d8", accent: "#d08a4c", muted: "#a89a89" },
    light: { name: "Linen & Ember", mode: "light", ground: "#f6f0e7", surface: "#ebe2d3", ink: "#241a12", accent: "#a5482a", muted: "#6b5a4b" },
  },
  law: {
    dark: { name: "Chambers", mode: "dark", ground: "#0c1220", surface: "#131b2d", ink: "#e9ecf2", accent: "#b7955a", muted: "#98a2b6" },
    light: { name: "Paper & Ink", mode: "light", ground: "#f5f4f0", surface: "#e9e7e0", ink: "#111a2c", accent: "#8a6a2f", muted: "#586074" },
  },
  dental: {
    dark: { name: "Calm Night", mode: "dark", ground: "#0c1618", surface: "#132124", ink: "#e8f1f1", accent: "#6cc4bd", muted: "#93aaad" },
    light: { name: "Clinic Air", mode: "light", ground: "#f4f8f8", surface: "#e5eeee", ink: "#0f2226", accent: "#1f7a78", muted: "#526a6d" },
  },
  generic: {
    dark: { name: "Slate & Brass", mode: "dark", ground: "#10141a", surface: "#181e26", ink: "#eceae4", accent: "#c9a25a", muted: "#9aa1ad" },
    light: { name: "Stone & Ink", mode: "light", ground: "#f4f2ed", surface: "#e9e6de", ink: "#151a22", accent: "#8b6a2c", muted: "#5b6270" },
  },
};

export function chooseDirection(style: string): CreativeDirection["direction"] {
  const s = style.toLowerCase();
  if (/bold|playful|vibrant|loud|graphic|energetic/.test(s)) return "bold-graphic";
  if (/cinematic|dark|dramatic|moody|night/.test(s)) return "cinematic-dark";
  if (/minimal|clean|simple|airy|light|calm/.test(s)) return /warm|organic|natural/.test(s) ? "warm-minimal" : "clean-modern";
  if (/premium|luxur|sophisticated|elegant|editorial|high-end|refined/.test(s)) return "premium-editorial";
  return "clean-modern";
}

const TYPE: Record<CreativeDirection["direction"], CreativeDirection["typography"]> = {
  "cinematic-dark": { display: "Cormorant Garamond", body: "Hanken Grotesk", displayWeight: 500, tracking: "-0.01em", rationale: "A high-contrast serif gives the cinematic hero editorial gravitas; a neutral grotesk keeps body text crisp on dark grounds." },
  "premium-editorial": { display: "Fraunces", body: "Hanken Grotesk", displayWeight: 400, tracking: "-0.015em", rationale: "A soft-serif display face reads as considered and premium without feeling stuffy." },
  "warm-minimal": { display: "Fraunces", body: "Figtree", displayWeight: 400, tracking: "-0.01em", rationale: "Warm serif headlines with a friendly sans keep a minimal layout human." },
  "bold-graphic": { display: "Archivo", body: "Archivo", displayWeight: 800, tracking: "-0.03em", rationale: "A heavy, tight grotesk gives a confident poster-like voice." },
  "clean-modern": { display: "Sora", body: "Manrope", displayWeight: 600, tracking: "-0.025em", rationale: "Geometric sans headlines with a highly legible companion suit a precise, modern identity." },
};

export const creativeAgent: Agent<CreativeDirection> = {
  id: "creative",
  label: "Creative Direction",
  async run(ctx) {
    const { input } = ctx;
    const research = ctx.memory.require("research");
    const strategy = ctx.memory.require("strategy");
    const brand = ctx.memory.require("brand");
    const city = cityOf(input.location);

    const fallback = (): CreativeDirection => {
      const brandLed = brand.provided && brand.colors.length > 0;
      const direction = brandLed ? "clean-modern" : chooseDirection(input.style);
      const dark = brandLed ? true : direction === "cinematic-dark" || direction === "premium-editorial" || /dark/i.test(input.style);
      const preset = PALETTES[research.industryKey] ?? PALETTES.generic;
      let palette: Pal = { ...(dark ? preset.dark : preset.light) };
      if (brandLed) {
        const bg = brand.colors.find((c) => c.role === "background");
        const ac = brand.colors.find((c) => c.role === "accent");
        const tx = brand.colors.find((c) => c.role === "text/neutral");
        palette = {
          name: "Brand Extension", mode: "dark",
          ground: bg?.hex ?? palette.ground, surface: mix(bg?.hex ?? palette.ground, palette.ink, 0.07),
          ink: tx?.hex ?? palette.ink, accent: ac?.hex ?? palette.accent, muted: palette.muted,
        };
      }
      palette.accent = ensureContrast(palette.accent, palette.ground, 4.5);
      palette.ink = ensureContrast(palette.ink, palette.ground, 7);
      palette.muted = ensureContrast(palette.muted, palette.ground, 4.5);
      const isCinematic = direction === "cinematic-dark";
      return {
        concept: isCinematic
          ? `${strategy.mainMessage} Told like a short film: restrained, high-contrast, image-led, with the scroll as the camera.`
          : `An intentional, image-led identity for ${city}: quiet confidence, generous space, one clear action.`,
        direction,
        visualLanguage: [
          "Large, uncropped photography with generous negative space",
          "Hairline rules and small-caps labels instead of boxes and shadows",
          "One accent color used only for actions and key emphasis",
          "Asymmetric split layouts alternating with full-bleed statements",
        ],
        photographyStyle: `${research.industry}: ${dark ? "golden-hour and dusk lighting, deep shadows, natural materials" : "soft daylight, natural materials, calm compositions"}; no staged stock-smiles, no heavy filters`,
        animationStyle: "Slow, eased reveals (opacity + 24px rise), one scroll-driven story, subtle hover states. No parallax gimmicks. Everything respects prefers-reduced-motion.",
        layoutPersonality: isCinematic ? "Cinematic and spacious: wide frames, tall sections, big type" : "Editorial and composed: strong grid, clear hierarchy",
        heroConcept: `Full-bleed ${dark ? "dusk" : "daylight"} imagery${strategy.sections.some((s) => s.component === "VideoHero") ? " or video" : ""} with a single headline set large in ${TYPE[direction].display}, one primary CTA, no clutter.`,
        sectionTransitions: "Tonal shifts between deep and paper sections create rhythm; no gradients, no wave dividers.",
        palette,
        typography: TYPE[direction],
        avoid: ["Purple/blue AI gradients", "Glassmorphism cards", "Icon-in-a-circle feature grids", "Stock-photo smiles", "Bouncing or spinning motion", "Fake testimonials and invented statistics"],
      };
    };

    const out = await askLLM(ctx, {
      task: "creative-direction",
      check: (v) => (v.visualLanguage.length < 2 ? ["visualLanguage needs at least 2 items"] : []),
      system: "You are the Creative Director. Define a distinctive, intentional visual identity. Palette hex values must give AA contrast (ink on ground >= 7:1, accent on ground >= 4.5:1). If a brand profile is provided, preserve its colors and extend the brand.",
      prompt: `Business: ${input.business} in ${input.location}\nStyle requested: ${input.style}\nAudience: ${input.targetAudience}\nBrand profile: ${JSON.stringify(brand)}\nStrategy: ${JSON.stringify({ mainMessage: strategy.mainMessage, sections: strategy.sections.map((s) => s.component) })}`,
      schema: CreativeSchema,
      fallback,
    });
    // Enforce accessibility regardless of source.
    out.palette.accent = ensureContrast(out.palette.accent, out.palette.ground, 4.5);
    out.palette.ink = ensureContrast(out.palette.ink, out.palette.ground, 7);
    out.palette.muted = ensureContrast(out.palette.muted, out.palette.ground, 4.5);
    ctx.memory.recordDecision({ agent: "creative", key: "direction", value: out.direction, rationale: out.concept.slice(0, 140) });
    ctx.memory.recordDecision({ agent: "creative", key: "palette-mode", value: out.palette.mode, rationale: out.palette.name });
    ctx.report({ summary: `${out.direction}, ${out.palette.name} palette, ${out.typography.display} / ${out.typography.body}` });
    return out;
  },
};
