import type { Agent } from "../core/agent";
import { contrast, ensureContrast, mix } from "../core/color";
import type { CreativeDirection, DesignSystem } from "../core/types";

export function buildDesignSystem(c: CreativeDirection): DesignSystem {
  const p = c.palette;
  const dark = p.mode === "dark";
  // Two tonal sets. "Deep" sections use the dark ground; "Paper" sections invert it. Every pairing is contrast-checked.
  const deep = dark
    ? { bg: p.ground, surface: p.surface, ink: p.ink, muted: p.muted }
    : { bg: mix(p.ink, "#000000", 0.35), surface: mix(p.ink, "#ffffff", 0.08), ink: p.ground, muted: mix(p.ground, p.ink, 0.35) };
  const paper = dark
    ? { bg: mix(p.ink, "#ffffff", 0.35), surface: mix(p.ink, p.ground, 0.12), ink: p.ground, muted: mix(p.ground, p.ink, 0.35) }
    : { bg: p.ground, surface: p.surface, ink: p.ink, muted: p.muted };
  deep.muted = ensureContrast(deep.muted, deep.bg, 4.5);
  paper.muted = ensureContrast(paper.muted, paper.bg, 4.5);
  deep.ink = ensureContrast(deep.ink, deep.bg, 7);
  paper.ink = ensureContrast(paper.ink, paper.bg, 7);
  const accentDeep = ensureContrast(p.accent, deep.bg, 4.5);
  const accentPaper = ensureContrast(p.accent, paper.bg, 4.5);
  // Text on an accent-filled button: whichever of ground/ink reads best.
  const onAccent = contrast(deep.bg, accentDeep) >= contrast("#ffffff", accentDeep) ? deep.bg : "#ffffff";

  const weights = [...new Set([400, 500, 600, 700, c.typography.displayWeight])].sort((a, b) => a - b).join(";");
  const fam = (n: string) => `family=${n.replace(/ /g, "+")}:wght@${weights}`;
  const families = c.typography.display === c.typography.body ? fam(c.typography.display) : `${fam(c.typography.display)}&${fam(c.typography.body)}`;
  const serif = /Cormorant|Fraunces|Playfair/.test(c.typography.display);

  return {
    colors: {
      "bg-deep": deep.bg, "surface-deep": deep.surface, "ink-deep": deep.ink, "muted-deep": deep.muted, "line-deep": mix(deep.bg, deep.ink, 0.18), "accent-deep": accentDeep,
      "bg-paper": paper.bg, "surface-paper": paper.surface, "ink-paper": paper.ink, "muted-paper": paper.muted, "line-paper": mix(paper.bg, paper.ink, 0.18), "accent-paper": accentPaper,
      "accent": p.accent, "on-accent": onAccent, "focus": accentDeep,
      "overlay": mix(deep.bg, "#000000", 0.4),
    },
    typography: {
      fontDisplay: `"${c.typography.display}", ${serif ? "Georgia, 'Times New Roman', serif" : "system-ui, sans-serif"}`,
      fontBody: `"${c.typography.body}", system-ui, -apple-system, "Segoe UI", sans-serif`,
      googleFontsHref: `https://fonts.googleapis.com/css2?${families}&display=swap`,
      displayWeight: c.typography.displayWeight,
      displayTracking: c.typography.tracking,
      displayLeading: serif ? "1.02" : "1.06",
      scale: {
        "step--1": "clamp(0.8125rem, 0.79rem + 0.1vw, 0.875rem)",
        "step-0": "clamp(1.0625rem, 1rem + 0.25vw, 1.1875rem)",
        "step-1": "clamp(1.25rem, 1.1rem + 0.6vw, 1.5rem)",
        "step-2": "clamp(1.625rem, 1.3rem + 1.3vw, 2.25rem)",
        "step-3": "clamp(2.25rem, 1.6rem + 2.6vw, 3.5rem)",
        "step-4": "clamp(2.75rem, 1.7rem + 4.4vw, 5.25rem)",
        "step-5": "clamp(3rem, 1.4rem + 7vw, 7.5rem)",
      },
    },
    spacing: { "1": "0.25rem", "2": "0.5rem", "3": "0.75rem", "4": "1rem", "5": "1.5rem", "6": "2rem", "7": "3rem", "8": "4.5rem", "9": "7rem", "10": "10rem" },
    radius: { none: "0", sm: "2px", md: "4px", pill: "999px" },
    shadows: { none: "none", soft: "0 24px 60px -24px rgb(0 0 0 / 0.45)" },
    layout: { maxWidth: "1320px", gutter: "clamp(1.25rem, 4vw, 3rem)", sectionPadding: "clamp(5rem, 11vw, 9.5rem)" },
    components: {
      button: { padding: "1rem 1.75rem", radius: "var(--radius-sm)", fontSize: "var(--step--1)", tracking: "0.12em", transform: "uppercase", minHeight: "48px" },
      card: { padding: "var(--space-6)", radius: "var(--radius-sm)", borderWidth: "1px" },
      nav: { height: "76px", blur: "0" },
      section: { paddingBlock: "var(--section-padding)" },
      input: { padding: "0.9rem 1rem", radius: "var(--radius-sm)", minHeight: "48px" },
    },
    animations: {
      durations: { fast: "180ms", base: "420ms", slow: "900ms", hero: "1600ms" },
      easings: { standard: "cubic-bezier(0.22, 0.61, 0.36, 1)", emphasized: "cubic-bezier(0.16, 1, 0.3, 1)" },
      revealDistance: "24px",
      storyScrollLength: "130vh",
    },
    breakpoints: { sm: "640px", md: "900px", lg: "1200px" },
  };
}

export const designSystemAgent: Agent<DesignSystem> = {
  id: "design-system",
  label: "Design System",
  async run(ctx) {
    const creative = ctx.memory.require("creative");
    const ds = buildDesignSystem(creative);
    ctx.report({ usedLLM: "rule-based", summary: `${Object.keys(ds.colors).length} color tokens, ${Object.keys(ds.typography.scale).length} type steps` });
    return ds;
  },
};
