import type { BusinessInput, ProjectMemory } from "../src/core/types";
import type { AnthropicRequestInfo } from "./mocks";
import { LANDSCAPING, makeOrchestrator } from "./helpers";

export type Golden = Pick<ProjectMemory, "research" | "strategy" | "creative" | "ux" | "copy" | "brand">;

/** Baseline structured outputs: produced once by running the demo pipeline. The mock LLM serves them (with marked edits). */
let cache: Golden | undefined;
export async function golden(input: BusinessInput = LANDSCAPING): Promise<Golden> {
  if (cache) return cache;
  const { orch } = makeOrchestrator();
  const st = orch.create(input);
  await orch.run(st.id);
  const m = orch.store(st.id);
  cache = { research: m.require("research"), strategy: m.require("strategy"), creative: m.require("creative"), ux: m.require("ux"), copy: m.require("copy"), brand: m.require("brand") };
  return cache;
}

export const MOCK_HEADLINE = "Gardens built to be lived in.";

export interface AnswerOptions {
  videoDecision?: "generate" | "stock" | "none";
  qaIssues?: { category: string; severity: string; message: string; copyFix: string | null }[];
  /** Called for every request (lets a test count or fail specific tasks). */
  intercept?: (r: AnthropicRequestInfo) => string | { refusal: true } | { truncated: true } | undefined;
}

const LONG_PROMPT = "Cinematic slow tracking shot of a luxury modern backyard garden with a stone terrace, pool and layered tropical planting in Miami at golden hour, realistic architecture and natural materials, premium commercial photography, subtle camera movement, shallow depth of field, warm natural grade, 8 seconds, no text, no logos";

export function makeAnswer(g: Golden, opts: AnswerOptions = {}) {
  return (r: AnthropicRequestInfo): string | { refusal: true } | { truncated: true } => {
    const custom = opts.intercept?.(r);
    if (custom !== undefined) return custom;
    const t = r.task;
    if (t === "research") return JSON.stringify(g.research);
    if (t === "strategy") return JSON.stringify(g.strategy);
    if (t === "creative-direction") return JSON.stringify(g.creative);
    if (t === "ux") return JSON.stringify({ decisions: g.ux.decisions, story: g.ux.story && { title: g.ux.story.title, stages: g.ux.story.stages.map((s) => ({ label: s.label, caption: s.caption })) }, homepageFlow: g.ux.homepageFlow, mobileRules: g.ux.mobileRules, reducedMotion: g.ux.reducedMotion });
    if (t === "copy") return JSON.stringify({ ...g.copy, hero: { ...g.copy.hero, headline: MOCK_HEADLINE } });
    if (t === "brand-vision") return JSON.stringify({ personality: ["precise", "technical"], tone: "confident", shapes: ["bold geometric D"], typographyCharacter: "geometric sans-serif", notes: ["vision-derived"] });
    if (t === "media-plan") {
      const m = /Slots to rewrite \(keep ids\): (\[.*\])/.exec(r.prompt);
      const slots = JSON.parse(m![1]) as { slot: string; query: string; brief: string }[];
      return JSON.stringify({ slots: slots.map((s) => ({ slot: s.slot, query: `${s.query} luxury estate`, altQueries: [`${s.query} garden`], brief: s.brief, alt: `Photograph for ${s.slot}` })), rules: ["mock-plan"] });
    }
    if (t.startsWith("media-curation:")) {
      const id = /Image 1: id=([^;\s]+);/.exec(r.prompt)![1];
      return JSON.stringify({ chosen: id, score: 0.9, reason: "best composition and light for the direction" });
    }
    if (t === "design-system") return JSON.stringify({ radius: { sm: "2px", md: "6px" }, shadowSoft: "0 24px 60px -24px rgba(0,0,0,0.45)", button: { tracking: "0.14em", transform: "uppercase" }, displayTracking: "-0.02em", displayLeading: "1.05", animations: { fast: "160ms", base: "480ms", slow: "1000ms", hero: "1800ms", revealDistance: "20px" }, sectionPadding: "clamp(5rem, 11vw, 9.5rem)", rationale: "Slow, cinematic motion with sharp corners." });
    if (t === "video-plan") return JSON.stringify({ decision: opts.videoDecision ?? "generate", reasoning: "A bespoke golden-hour clip strengthens the hero.", concept: "One slow tracking shot", prompt: LONG_PROMPT, durationSeconds: 8 });
    if (t === "architecture") return JSON.stringify({ performanceBudget: { lcpMs: 2400, jsKb: 110, imageStrategy: "local responsive variants" }, accessibility: ["skip link"], seo: ["JSON-LD"], developerFlags: ["Story scroll uses sticky positioning; verify on iOS Safari."] });
    if (t === "qa-review") return JSON.stringify({ issues: opts.qaIssues ?? [], summary: "Coherent, restrained and specific." });
    throw new Error(`mock LLM has no answer for task "${t}"`);
  };
}
