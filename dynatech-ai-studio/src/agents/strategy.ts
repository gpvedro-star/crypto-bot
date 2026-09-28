import { askOrFallback, type Agent } from "../core/agent";
import { StrategySchema } from "../core/schemas";
import type { SectionPlan, StrategyBlueprint } from "../core/types";
import { cityOf, matchIndustry } from "../knowledge";

export const strategyAgent: Agent<StrategyBlueprint> = {
  id: "strategy",
  label: "Strategy",
  async run(ctx) {
    const { input } = ctx;
    const research = ctx.memory.require("research");
    const profile = matchIndustry(`${input.business} ${input.notes ?? ""}`);
    const city = cityOf(input.location);

    const fallback = (): StrategyBlueprint => {
      const s = (id: string, component: SectionPlan["component"], purpose: string, layout: string, tone: SectionPlan["tone"]): SectionPlan => ({ id, component, purpose, layout, tone });
      const sections: SectionPlan[] = [
        s("nav", "Navbar", "Orient and keep the primary CTA one click away", "fixed-transparent", "dark"),
        s("hero", "Hero", "State the offer in one sentence and set the emotional tone", "full-bleed", "dark"),
        s("marquee", "Marquee", "Communicate scope of services at a glance without extra reading", "ticker", "dark"),
        s("intro", "SplitSection", "Explain the differentiating approach", "split-right", "light"),
        s("services", "Services", "Show what is offered and let visitors self-select", "list-index", "light"),
        ...(profile.transformation
          ? [
              s("story", "ScrollStory", "Make the transformation tangible: the scroll is the story", "sticky-stage", "dark"),
              s("compare", "BeforeAfter", "Prove the difference with a direct visual comparison", "slider", "light"),
            ]
          : []),
        ...(profile.media.gallery.length ? [s("gallery", "ImageGallery", "Let the work carry the brand: large, uncropped imagery", "editorial-grid", "dark")] : []),
        s("process", "Process", "Remove fear of the unknown by showing exactly what happens next", "numbered-rail", "light"),
        s("trust", "Trust", "Build credibility with verifiable proof, never invented claims", "checklist-split", "light"),
        s("testimonials", "Testimonials", "Reserve space for real client voices", "quote-slots", "light"),
        s("faq", "FAQ", "Answer objections before they become reasons not to inquire", "accordion", "light"),
        s("cta", "CTA", "Ask for the conversion after the case has been made", "full-bleed-statement", "accent"),
        s("contact", "Contact", "Capture the lead with the fewest fields that qualify it", "form-split", "dark"),
        s("footer", "Footer", "Provide navigation, legal and local-business signals", "columns", "dark"),
      ];
      return {
        mainMessage: `${input.business} in ${city}: ${profile.introHeadline}`,
        primaryCTA: { label: profile.primaryCta, target: "#contact" },
        secondaryCTA: { label: profile.secondaryCta, target: profile.transformation ? "#story" : "#services" },
        conversionStrategy: [
          `One primary conversion action: "${profile.primaryCta}". Never compete with it.`,
          "Repeat the CTA at emotional peaks: hero, after the transformation/proof, and closing statement.",
          "Keep the form short: name, contact method, project type, message.",
          input.goal ? `Success metric: ${input.goal}` : "Success metric: qualified inquiries",
        ],
        customerJourney: [
          "Arrive: understand what this business does in under five seconds",
          "Feel: see the quality of the work",
          "Understand: what is offered and how the process works",
          "Trust: verify credibility using honest proof",
          "Act: request a consultation",
        ],
        trustStrategy: [
          "Show a 'how to choose a provider' checklist — educational and honest.",
          "Provide labeled slots for real licenses, insurance, reviews and awards. Nothing fabricated.",
          "Testimonials remain placeholders until real ones exist.",
        ],
        contentHierarchy: research.recommendations.slice(0, 4),
        pages: [
          { path: "/", purpose: "Single-page conversion journey (V1)" },
          { path: "/api/lead", purpose: "Server-side lead capture endpoint" },
        ],
        sections,
      };
    };

    const out = await askOrFallback(ctx, {
      task: "strategy",
      system: "You are the Strategy Agent. Turn research into a website blueprint: message, CTA, conversion strategy, journey, trust strategy, hierarchy, and ordered sections. Each section needs a purpose. Sections must start with Navbar and Hero and end with Contact then Footer, use ids without spaces, and vary layouts.",
      prompt: `Research:\n${JSON.stringify(research, null, 2)}\n\nBusiness: ${input.business} in ${input.location}\nGoal: ${input.goal ?? "generate leads"}\nAllowed components: Navbar, Hero, VideoHero, Marquee, SplitSection, Services, InteractiveCards, ScrollStory, BeforeAfter, ImageGallery, Process, Stats, Trust, Testimonials, FAQ, CTA, Contact, Footer, ImageReveal, VideoReveal.`,
      schema: StrategySchema,
      fallback,
    });
    ctx.memory.recordDecision({ agent: "strategy", key: "primary-cta", value: out.primaryCTA.label, rationale: "Single conversion action" });
    ctx.report({ summary: `${out.sections.length} sections; primary CTA "${out.primaryCTA.label}"` });
    return out;
  },
};
