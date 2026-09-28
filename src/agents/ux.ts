import { askLLM, type Agent } from "../core/agent";
import { UxSchema } from "../core/schemas";
import { SUPPORTED_SECTION_COMPONENTS, type ExperiencePlan, type MotionKind, type SectionPlan } from "../core/types";
import { matchIndustry } from "../knowledge";

const ART_KEYS = ["land", "plan", "build", "plant", "light", "finish"];

/** Guarantee rhythm: no two neighbouring sections share the same tone AND layout family. */
export function varyRhythm(sections: SectionPlan[]): SectionPlan[] {
  const out = sections.map((s) => ({ ...s }));
  for (let i = 1; i < out.length; i++) {
    const prev = out[i - 1], cur = out[i];
    if (prev.tone === cur.tone && prev.layout === cur.layout) cur.layout = cur.layout.endsWith("-alt") ? cur.layout.replace(/-alt$/, "") : `${cur.layout}-alt`;
  }
  return out;
}

export const uxAgent: Agent<ExperiencePlan> = {
  id: "ux",
  label: "UX / Experience",
  async run(ctx) {
    const strategy = ctx.memory.require("strategy");
    const creative = ctx.memory.require("creative");
    const research = ctx.memory.require("research");
    const profile = matchIndustry(`${ctx.input.business} ${ctx.input.notes ?? ""}`);
    const has = (c: string) => strategy.sections.some((s) => s.component === c);
    const t = profile.transformation;

    const fallback = (): ExperiencePlan => {
      const d = (technique: MotionKind, used: boolean, purpose: string) => ({ technique, used, purpose });
      const decisions = [
        d("scroll-story", t && has("ScrollStory"), t ? "The service IS a transformation, so scroll progress drives the stages of that change. Motion carries meaning." : "Rejected: this business does not sell a visible before→after change; a scroll story would be decoration."),
        d("before-after", t && has("BeforeAfter"), t ? "Direct proof of change is the strongest persuasion for this category." : "Rejected: no visual before/after exists for this service."),
        d("progressive-reveal", true, "Content rises gently as it enters view to pace reading. Small distance, short duration."),
        d("interactive-gallery", has("ImageGallery"), has("ImageGallery") ? "Work is the proof; a lightbox lets visitors inspect images at full size." : "Rejected: no gallery in this blueprint."),
        d("cinematic-video", !!profile.media.video, "A muted background video in the hero is used only when a vetted clip is available; otherwise a still image with a slow scale-in."),
        d("micro-interactions", true, "Hover/focus states on links and buttons confirm interactivity and improve accessibility."),
        d("sticky-sections", t, t ? "The story stage stays pinned while captions change, keeping one focal image on screen." : "Rejected: nothing needs to stay pinned."),
        d("parallax", false, "Rejected: parallax adds jank on mobile and does not support the message."),
        d("interactive-cards", false, "Rejected: services are shown as an index list; card grids would look generic."),
      ];
      return {
        decisions,
        story: t ? { title: profile.storyTitle, stages: profile.stages.map((s, i) => ({ label: s.label, caption: s.caption, art: ART_KEYS[i] ?? "finish" })) } : null,
        homepageFlow: strategy.sections,
        mobileRules: [
          "Story stage switches to a stacked sequence with the image pinned at the top of the viewport",
          "Minimum 44px tap targets; primary CTA visible in the sticky bottom bar after the hero",
          "Body copy 17px+, headline clamps to a two- to four-line block",
          "Before/after slider supports touch drag and keyboard arrows",
          "Video is replaced by the poster image on small screens and slow connections",
        ],
        reducedMotion: "Under prefers-reduced-motion: reveals appear instantly, the story shows all stages stacked, video is not autoplayed.",
      };
    };

    const out = await askLLM(ctx, {
      task: "ux",
      system: `You are the UX / Experience Agent. Decide which interaction techniques this website should use and which to reject; every technique must have a purpose tied to the business (no effects for their own sake). Then finalize the homepage flow: keep EVERY section of the strategy (same ids and components, same order for Navbar/Hero/Contact/Footer), and vary tone (dark|light|accent) and layout so adjacent sections never look identical. If the service is a visible transformation and the strategy contains ScrollStory, provide a "story" with 4-8 stages (each a label + one-sentence caption) that describe the transformation in order; otherwise "story" must be null and ScrollStory must not exist. Return decisions for all nine techniques exactly once: ${["scroll-story", "parallax", "before-after", "interactive-gallery", "cinematic-video", "micro-interactions", "sticky-sections", "progressive-reveal", "interactive-cards"].join(", ")}. Components allowed: ${SUPPORTED_SECTION_COMPONENTS.join(", ")}.`,
      prompt: `Business: ${ctx.input.business} in ${ctx.input.location}\nAudience: ${ctx.input.targetAudience}\nGoal: ${ctx.input.goal ?? "generate leads"}\nCreative direction: ${JSON.stringify({ direction: creative.direction, concept: creative.concept, animationStyle: creative.animationStyle, layoutPersonality: creative.layoutPersonality, heroConcept: creative.heroConcept })}\nResearch positioning: ${research.positioning.join("; ")}\nStrategy sections (keep all): ${JSON.stringify(strategy.sections)}`,
      schema: UxSchema,
      check: (v) => {
        const p: string[] = [];
        const want = strategy.sections.map((s) => s.id).sort().join(",");
        const got = v.homepageFlow.map((s) => s.id).sort().join(",");
        if (want !== got) p.push(`homepageFlow must contain exactly the strategy section ids [${want}], got [${got}]`);
        const comps = new Map(strategy.sections.map((s) => [s.id, s.component]));
        for (const s of v.homepageFlow) if (comps.get(s.id) && comps.get(s.id) !== s.component) p.push(`section "${s.id}" must keep component ${comps.get(s.id)}`);
        if (v.homepageFlow[0]?.component !== "Navbar" || !["Hero", "VideoHero"].includes(v.homepageFlow[1]?.component)) p.push("homepageFlow must start with Navbar then Hero");
        const seen = new Set(v.decisions.map((x) => x.technique));
        if (seen.size !== 9 || v.decisions.length !== 9) p.push("decisions must contain each of the nine techniques exactly once");
        const wantsStory = strategy.sections.some((s) => s.component === "ScrollStory");
        if (wantsStory && !v.story) p.push("strategy has a ScrollStory, so story must be provided");
        if (!wantsStory && v.story) p.push("story must be null because the strategy has no ScrollStory");
        return p;
      },
      fallback,
    });
    const flow = varyRhythm(out.homepageFlow);
    const plan: ExperiencePlan = {
      ...out,
      homepageFlow: flow,
      story: out.story ? { title: out.story.title, stages: out.story.stages.map((s, i) => ({ ...s, art: ART_KEYS[Math.min(i, ART_KEYS.length - 1)] })) } : null,
    };
    ctx.memory.recordDecision({ agent: "ux", key: "story-driven", value: String(!!plan.story), rationale: plan.story ? "Transformation service" : "No visual transformation" });
    ctx.report({ summary: `${plan.decisions.filter((x) => x.used).length} techniques used, ${plan.decisions.filter((x) => !x.used).length} rejected; direction ${creative.direction}` });
    return plan;
  },
  async revise(ctx, actions) {
    const plan = ctx.memory.require("ux");
    if (actions.some((a) => a.action === "vary-layouts")) plan.homepageFlow = varyRhythm(plan.homepageFlow);
    ctx.report({ provider: "rules", summary: `Applied ${actions.length} UX fixes` });
    return plan;
  },
};
