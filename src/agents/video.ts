import { askLLM, type Agent } from "../core/agent";
import { VideoPlanSchema } from "../core/schemas";
import type { VideoPlan } from "../core/types";
import { cityOf, matchIndustry } from "../knowledge";

export function buildVideoPrompt(subject: string, location: string, style: string): string {
  const city = cityOf(location);
  const golden = /cinematic|dark|dusk|night/i.test(style) ? "at golden hour" : "in soft natural daylight";
  return `Create a cinematic 8-second slow tracking shot of ${subject} in ${city} ${golden}, realistic architecture and materials, premium commercial photography, subtle camera movement, shallow depth of field, natural color grading, no people talking, no text, no logos.`;
}

const REQUIRED_PHRASES = ["no text", "no logos"];

/**
 * VIDEO PLANNING only. This agent never spends credits: for a generated clip it stops at `awaiting_approval`.
 * The website continues immediately using the fallback (stock clip or still); generation happens later, after
 * an explicit human approval (see Orchestrator.requestVideo).
 */
export const videoAgent: Agent<VideoPlan> = {
  id: "video",
  label: "Video",
  async run(ctx) {
    const { input } = ctx;
    const profile = matchIndustry(`${input.business} ${input.notes ?? ""}`);
    const creative = ctx.memory.require("creative");
    const ux = ctx.memory.require("ux");
    const media = ctx.memory.require("media");
    const stock = media.assets.find((a) => a.type === "video" && a.status === "approved");
    const heroVideoWanted = ux.decisions.some((d) => d.technique === "cinematic-video" && d.used);

    const fallbackPlan = () => {
      if (!heroVideoWanted) return { decision: "none" as const, reasoning: "The UX plan uses a still hero; ambient video would not support the message.", concept: "", prompt: "", durationSeconds: 8 };
      if (stock) return { decision: "stock" as const, reasoning: "A vetted stock clip matches the brief, so generation is unnecessary.", concept: `Ambient stock footage of ${profile.media.subject}.`, prompt: buildVideoPrompt(profile.media.subject, input.location, input.style), durationSeconds: 8 };
      return { decision: "generate" as const, reasoning: "No suitable stock clip was found; a bespoke clip would strengthen the hero.", concept: `A single slow tracking shot: ${profile.media.subject}, restrained motion, no cuts.`, prompt: buildVideoPrompt(profile.media.subject, input.location, input.style), durationSeconds: 8 };
    };

    const plan = await askLLM(ctx, {
      task: "video-plan",
      system: `You are the Video Agent, thinking like a commercial director. Decide: "stock" (a vetted stock clip already exists and is good enough), "generate" (a bespoke AI-generated clip is worth the external generation credits), or "none" (the site is better with stills). Then write the cinematic concept and a production-grade generation prompt: shot type, subject, place, time of day/light, camera movement, materials, lens/depth of field, grade, duration, and ALWAYS end with "no text, no logos". Never write "make a cool video". Choose "generate" only if it materially improves the hero AND the UX plan wants a hero video. Duration 5-10 seconds.`,
      prompt: `Business: ${input.business} in ${input.location}. Style: ${input.style}.\nCreative direction: ${JSON.stringify({ direction: creative.direction, heroConcept: creative.heroConcept, photographyStyle: creative.photographyStyle, animationStyle: creative.animationStyle })}\nUX plan wants a hero video: ${heroVideoWanted}\nStock video found and approved: ${stock ? `yes — ${stock.description}` : "no"}\nHigher-level subject: ${profile.media.subject}`,
      schema: VideoPlanSchema,
      check: (v) => [
        ...(v.decision === "stock" && !stock ? ['decision "stock" is impossible: no stock video was found'] : []),
        ...(v.decision === "generate" && !heroVideoWanted ? ['decision "generate" conflicts with the UX plan (no hero video wanted)'] : []),
        ...(v.decision === "generate" && v.prompt.trim().split(/\s+/).length < 25 ? ["generation prompt must be a detailed commercial-director brief (25+ words)"] : []),
      ],
      fallback: fallbackPlan,
    });
    let prompt = plan.prompt;
    if (plan.decision === "generate") for (const ph of REQUIRED_PHRASES) if (!prompt.toLowerCase().includes(ph)) prompt = `${prompt.replace(/[.\s]+$/, "")}, ${ph}.`;

    const base: VideoPlan = { decision: plan.decision, reasoning: plan.reasoning, concept: plan.concept, prompt: plan.decision === "generate" ? prompt : plan.prompt, durationSeconds: plan.durationSeconds, aspect: "16:9", phase: "not_needed" };
    const fallback: VideoPlan["fallback"] = stock ? "stock-video" : "still-image";
    if (plan.decision === "none") {
      ctx.report({ summary: "No hero video: still imagery is the better choice here" });
      return { ...base, fallback: "still-image", phaseDetail: "No video planned." };
    }
    if (plan.decision === "stock") {
      ctx.report({ summary: "Vetted Pexels stock video approved; no generation needed" });
      return { ...base, asset: stock, fallback: "stock-video", phaseDetail: "Using the downloaded Pexels stock clip." };
    }
    if (!ctx.video.available) {
      ctx.report({ summary: `Generation planned but Higgsfield is not configured (missing ${ctx.video.missing.join(", ")}); prompt saved` });
      return { ...base, phase: "unavailable", fallback, phaseDetail: `Video generation is not configured. Missing: ${ctx.video.missing.join(", ")}. The site uses the ${fallback === "stock-video" ? "stock clip" : "still image"}.` };
    }
    ctx.report({ summary: "Generation planned; waiting for your approval (uses external generation credits)" });
    return { ...base, phase: "awaiting_approval", fallback, phaseDetail: "Video generation will use external generation credits. Approve to generate, or skip." };
  },
};
