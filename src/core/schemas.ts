import { z } from "zod";
import { COMPONENT_NAMES } from "./types";

const str = z.string().min(1);
const strs = z.array(str);
const component = z.enum(COMPONENT_NAMES);

export const ResearchSchema = z.object({
  industry: str, industryKey: str, targetAudience: str,
  customerProblems: strs, services: strs, positioning: strs, websitePatterns: strs, recommendations: strs,
});

export const SectionPlanSchema = z.object({
  id: str, component, purpose: str, layout: str, tone: z.enum(["dark", "light", "accent"]),
});

export const StrategySchema = z.object({
  mainMessage: str,
  primaryCTA: z.object({ label: str, target: str }),
  secondaryCTA: z.object({ label: str, target: str }),
  conversionStrategy: strs, customerJourney: strs, trustStrategy: strs, contentHierarchy: strs,
  pages: z.array(z.object({ path: str, purpose: str })),
  sections: z.array(SectionPlanSchema).min(6),
});

export const CreativeSchema = z.object({
  concept: str,
  direction: z.enum(["premium-editorial", "cinematic-dark", "warm-minimal", "bold-graphic", "clean-modern"]),
  visualLanguage: strs, photographyStyle: str, animationStyle: str, layoutPersonality: str, heroConcept: str, sectionTransitions: str,
  palette: z.object({
    name: str, mode: z.enum(["dark", "light"]),
    ground: z.string().regex(/^#[0-9a-fA-F]{6}$/), surface: z.string().regex(/^#[0-9a-fA-F]{6}$/),
    ink: z.string().regex(/^#[0-9a-fA-F]{6}$/), accent: z.string().regex(/^#[0-9a-fA-F]{6}$/), muted: z.string().regex(/^#[0-9a-fA-F]{6}$/),
  }),
  typography: z.object({ display: str, body: str, displayWeight: z.number(), tracking: str, rationale: str }),
  avoid: strs,
});

const heading = z.object({ eyebrow: str, headline: str });
export const CopySchema = z.object({
  brandName: str, brandNameIsPlaceholder: z.boolean(),
  hero: z.object({ eyebrow: str, headline: str, sub: str, primaryCta: str, secondaryCta: str }),
  intro: heading.extend({ body: strs }),
  services: heading.extend({ intro: str, items: z.array(z.object({ title: str, body: str, detail: str })).min(3) }),
  story: heading.extend({ intro: str, stages: z.array(z.object({ label: str, caption: str })) }),
  gallery: heading.extend({ intro: str, captions: z.array(z.string()) }),
  beforeAfter: heading.extend({ body: str, beforeLabel: str, afterLabel: str }),
  process: heading.extend({ intro: str, steps: z.array(z.object({ title: str, body: str })).min(3) }),
  trust: heading.extend({
    intro: str, checklist: z.array(z.object({ title: str, body: str })),
    proofSlots: z.array(z.object({ label: str, hint: str })),
  }),
  testimonials: heading.extend({ slots: z.array(z.object({ hint: str })) }),
  faq: heading.extend({ items: z.array(z.object({ q: str, a: str })).min(3) }),
  cta: z.object({ headline: str, body: str, button: str }),
  contact: heading.extend({
    body: str, submitLabel: str, privacyNote: str,
    fields: z.array(z.object({ name: str, label: str, type: str, required: z.boolean(), options: z.array(z.string()).optional() })),
  }),
  footer: z.object({ tagline: str, note: z.string() }),
  marquee: strs,
  seo: z.object({ title: str, description: str, keywords: strs, ogTitle: str, ogDescription: str, localBusinessType: str }),
  placeholders: z.array(z.object({ field: str, note: str })),
});
