import type { Agent } from "../core/agent";
import type { ExperiencePlan, MotionKind, SectionPlan } from "../core/types";
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
    const profile = matchIndustry(`${ctx.input.business} ${ctx.input.notes ?? ""}`);
    const has = (c: string) => strategy.sections.some((s) => s.component === c);
    const t = profile.transformation;

    const d = (technique: MotionKind, used: boolean, purpose: string) => ({ technique, used, purpose });
    const decisions = [
      d("scroll-story", t && has("ScrollStory"), t ? "The service IS a transformation, so scroll progress drives the stages of that change. Motion carries meaning." : "Rejected: this business does not sell a visible before→after change; a scroll story would be decoration."),
      d("before-after", t && has("BeforeAfter"), t ? "Direct proof of change is the strongest persuasion for this category." : "Rejected: no visual before/after exists for this service."),
      d("progressive-reveal", true, "Content rises gently as it enters view to pace reading. Small distance, short duration."),
      d("interactive-gallery", has("ImageGallery"), has("ImageGallery") ? "Work is the proof; a lightbox lets visitors inspect images at full size." : "Rejected: no gallery in this blueprint."),
      d("cinematic-video", ctx.memory.has("video") ? false : true, "A muted background video in the hero is used only when a vetted clip is available; otherwise a still image with a slow scale-in."),
      d("micro-interactions", true, "Hover/focus states on links and buttons confirm interactivity and improve accessibility."),
      d("sticky-sections", t, t ? "The story stage stays pinned while captions change, keeping one focal image on screen." : "Rejected: nothing needs to stay pinned."),
      d("parallax", false, "Rejected: parallax adds jank on mobile and does not support the message."),
      d("interactive-cards", false, "Rejected: services are shown as an index list; card grids would look generic."),
    ];

    const flow = varyRhythm(strategy.sections);
    const plan: ExperiencePlan = {
      decisions,
      story: t ? { title: profile.storyTitle, stages: profile.stages.map((s, i) => ({ label: s.label, caption: s.caption, art: ART_KEYS[i] ?? "finish" })) } : null,
      homepageFlow: flow,
      mobileRules: [
        "Story stage switches to a stacked sequence with the image pinned at the top of the viewport",
        "Minimum 44px tap targets; primary CTA visible in the sticky bottom bar after the hero",
        "Body copy 17px+, headline clamps to a two- to four-line block",
        "Before/after slider supports touch drag and keyboard arrows",
        "Video is replaced by the poster image on small screens and slow connections",
      ],
      reducedMotion: "Under prefers-reduced-motion: reveals appear instantly, the story shows all stages stacked, video is not autoplayed.",
    };
    ctx.memory.recordDecision({ agent: "ux", key: "story-driven", value: String(t), rationale: t ? "Transformation service" : "No visual transformation" });
    ctx.report({ usedLLM: "knowledge-base", summary: `${decisions.filter((x) => x.used).length} techniques used, ${decisions.filter((x) => !x.used).length} rejected; direction ${creative.direction}` });
    return plan;
  },

  async revise(ctx, actions) {
    const plan = ctx.memory.require("ux");
    if (actions.some((a) => a.action === "vary-layouts")) {
      // Force alternation, then verify; layouts get suffixes so adjacent sections can never match.
      plan.homepageFlow = varyRhythm(plan.homepageFlow);
    }
    ctx.report({ usedLLM: "rule-based-revision", summary: `Applied ${actions.length} UX fixes` });
    return plan;
  },
};
