import { askLLM, type Agent } from "../core/agent";
import { ArchitectureNotesSchema } from "../core/schemas";
import type { ArchitecturePlan } from "../core/types";

export const architectAgent: Agent<ArchitecturePlan> = {
  id: "architect",
  label: "Website Architect",
  async run(ctx) {
    const strategy = ctx.memory.require("strategy");
    const ux = ctx.memory.require("ux");
    const media = ctx.memory.get("media");
    const creative = ctx.memory.require("creative");
    const engine = ctx.engines.get("nextjs");
    const components = [...new Set(ux.homepageFlow.map((s) => s.component))];
    const flags: string[] = [];
    if (media?.assets.some((a) => a.type === "video")) flags.push("Hero video: ship a poster, preload='none', and skip the video entirely on mobile/reduced-motion to protect LCP.");
    if ((media?.assets.filter((a) => a.type === "image").length ?? 0) > 8) flags.push("More than 8 images: only the hero is eager; all others lazy with explicit width/height to avoid layout shift.");
    if (ux.story) flags.push("Scroll story: driven by one passive scroll listener + requestAnimationFrame, only transforming opacity — no layout thrash.");
    if (creative.typography.display !== creative.typography.body) flags.push("Two font families are loaded with display=swap and system fallbacks; no third family allowed.");
    if (media?.usedPlaceholders) flags.push("Some slots use generated placeholders; replace with real photography before launch.");
    if (media?.errors?.length) flags.push(`Media errors: ${media.errors.map((e) => `${e.slot}: ${e.message}`).join(" | ")}`);
    const base = {
      performanceBudget: { lcpMs: 2500, jsKb: 120, imageStrategy: "Local responsive variants (srcset), lazy below the fold, explicit dimensions" },
      accessibility: ["Semantic landmarks", "Skip link", "Visible focus rings", "44px+ touch targets", "prefers-reduced-motion honored", "AA contrast enforced at token level", "Alt text on every image"],
      seo: ["Metadata API title/description/OG", "JSON-LD LocalBusiness", "robots + sitemap", "Single H1, ordered headings"],
      developerFlags: flags,
    };
    const notes = await askLLM(ctx, {
      task: "architecture",
      system: "You are the Website Architect. The engine is fixed (Next.js App Router, static page + one server route). Review the design and media plan and critique it as the developer would: performance budget for this specific site, accessibility and SEO measures that matter, and concrete developer flags (risks to usability/performance in the design: heavy media, motion on mobile, contrast, font loading). Be specific and brief; do not restate generic advice.",
      prompt: `Components: ${components.join(", ")}\nMedia: ${JSON.stringify(media ? { assets: media.assets.map((a) => ({ slot: a.slot, type: a.type, source: a.source, width: a.width, height: a.height, bytes: a.bytes })), errors: media.errors } : null)}\nUX story: ${ux.story ? `${ux.story.stages.length} stages (scroll-driven, sticky)` : "none"}\nCreative: ${JSON.stringify({ direction: creative.direction, typography: creative.typography, animationStyle: creative.animationStyle })}\nDeterministic flags so far: ${JSON.stringify(flags)}`,
      schema: ArchitectureNotesSchema,
      fallback: () => ({ ...base }),
    });
    ctx.report({ summary: `${engine.label}: ${components.length} components, ${notes.developerFlags.length} developer flags` });
    return {
      engine: engine.id,
      framework: "Next.js (App Router) + React + TypeScript",
      rendering: "Static generation for the page; a single server route (/api/lead) for form submissions",
      routes: ["/", "/api/lead", "/robots.txt", "/sitemap.xml"],
      components,
      dataFlow: "content/site.json (copy + media + blueprint) → app/page.tsx composes components → styles from tokens.css generated from the design system",
      performanceBudget: notes.performanceBudget,
      accessibility: notes.accessibility,
      seo: notes.seo,
      developerFlags: [...new Set([...flags, ...notes.developerFlags])],
    };
  },
};
