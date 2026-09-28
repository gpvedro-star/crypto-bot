import type { Agent } from "../core/agent";
import type { Asset, VideoPlan } from "../core/types";
import { cityOf, matchIndustry } from "../knowledge";

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

export function buildVideoPrompt(business: string, location: string, subject: string, style: string): string {
  const city = cityOf(location);
  const golden = /cinematic|dark|dusk|night/i.test(style) ? "at golden hour" : "in soft natural daylight";
  return `Create a cinematic 8-second slow tracking shot of ${subject} in ${city} ${golden}, realistic architecture and materials, premium commercial photography, subtle camera movement, shallow depth of field, natural color grading, no people talking, no text, no logos.`;
}

export const videoAgent: Agent<VideoPlan> = {
  id: "video",
  label: "Video",
  async run(ctx) {
    const { input } = ctx;
    const profile = matchIndustry(`${input.business} ${input.notes ?? ""}`);
    const media = ctx.memory.require("media");
    const stock = media.assets.find((a) => a.type === "video" && a.status === "approved");
    const prompt = buildVideoPrompt(input.business, input.location, profile.media.subject, input.style);

    if (!profile.media.video) {
      ctx.report({ usedLLM: "knowledge-base", summary: "No hero video for this industry" });
      return { decision: "none", reasoning: "Static imagery communicates this category better than ambient footage.", concept: "", prompt: "", durationSeconds: 0, aspect: "16:9" };
    }
    const concept = `A single slow tracking shot: ${profile.media.subject} ${/cinematic/i.test(input.style) ? "at golden hour" : "in daylight"}, restrained motion, no cuts.`;

    // Decision: generated video is only worth the cost/latency when the provider is live and no vetted stock clip exists.
    if (stock) {
      ctx.report({ usedLLM: "knowledge-base", summary: "Vetted Pexels stock video approved; no generation needed" });
      return { decision: "stock", reasoning: "A vetted stock clip matches the brief, so generation is unnecessary.", concept, prompt, durationSeconds: 8, aspect: "16:9", asset: stock };
    }
    if (!ctx.video.available) {
      ctx.report({ usedLLM: "knowledge-base", summary: "Higgsfield not configured; prompt stored for later generation" });
      return {
        decision: "generate",
        reasoning: "No suitable stock clip and video generation is not configured. The prompt is saved; the hero uses a still image until a clip is generated.",
        concept, prompt, durationSeconds: 8, aspect: "16:9",
        job: { id: "", provider: "higgsfield", status: "disabled", prompt },
      };
    }

    const job = await ctx.video.generateVideo(prompt, { durationSeconds: 8, aspect: "16:9" });
    ctx.log(`Higgsfield job ${job.id || "(none)"}: ${job.status}`);
    let last = job;
    for (let i = 0; i < 60 && last.id && (last.status === "queued" || last.status === "running"); i++) {
      await sleep(5000);
      last = await ctx.video.getGenerationStatus(job.id);
    }
    let asset: Asset | undefined;
    if (last.status === "completed" && last.url) {
      // Review gate: automated checks only (URL present + job completed). Human review recommended before launch.
      asset = { id: `higgsfield-${last.id}`, type: "video", source: "higgsfield", url: last.url, posterUrl: last.posterUrl, usage: "hero-video", slot: "hero-video", description: concept, alt: concept, prompt, requestId: last.id, status: "approved" };
    }
    return { decision: "generate", reasoning: "No suitable stock footage; generated a bespoke clip.", concept, prompt, durationSeconds: 8, aspect: "16:9", job: { ...last, prompt }, asset };
  },
};
