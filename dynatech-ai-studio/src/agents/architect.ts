import type { Agent } from "../core/agent";
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
    ctx.report({ usedLLM: "rule-based", summary: `${engine.label}: ${components.length} components, ${flags.length} developer flags` });
    return {
      engine: engine.id,
      framework: "Next.js (App Router) + React + TypeScript",
      rendering: "Static generation for the page; a single server route (/api/lead) for form submissions",
      routes: ["/", "/api/lead", "/robots.txt", "/sitemap.xml"],
      components,
      dataFlow: "content/site.json (copy + media + blueprint) → app/page.tsx composes components → styles from tokens.css generated from the design system",
      performanceBudget: { lcpMs: 2500, jsKb: 120, imageStrategy: "CDN-resized srcset for Pexels, lazy below the fold, explicit dimensions, SVG placeholders" },
      accessibility: ["Semantic landmarks", "Skip link", "Visible focus rings", "44px+ touch targets", "prefers-reduced-motion honored", "AA contrast enforced at token level", "Alt text on every image"],
      seo: ["Metadata API title/description/OG", "JSON-LD LocalBusiness", "robots + sitemap", "Single H1, ordered headings"],
      developerFlags: flags,
    };
  },
};
