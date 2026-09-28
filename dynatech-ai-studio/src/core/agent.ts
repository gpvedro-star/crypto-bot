import type { ZodType } from "zod";
import type { LLMProvider } from "../services/llm/types";
import { LLMUnavailableError } from "../services/llm/types";
import type { MediaProvider } from "../services/pexels/types";
import type { VideoProvider } from "../services/higgsfield/types";
import type { EngineRegistry } from "../services/website-engines";
import type { ProjectMemoryStore } from "./memory";
import type { AgentId, BusinessInput } from "./types";

export interface AgentContext {
  input: BusinessInput;
  memory: ProjectMemoryStore;
  llm: LLMProvider;
  media: MediaProvider;
  video: VideoProvider;
  engines: EngineRegistry;
  /** 0 on first build, 1..3 during revision. */
  iteration: number;
  /** Human feedback from a supervised checkpoint, if any. */
  feedback?: string;
  log: (message: string, level?: "info" | "warn" | "error") => void;
  /** Agents report which brain produced their output (provider name or "knowledge-base"). */
  report: (info: { summary?: string; usedLLM?: string }) => void;
}

export interface Agent<O> {
  readonly id: AgentId;
  readonly label: string;
  run(ctx: AgentContext): Promise<O>;
  /** Apply QA-directed fixes. Optional — agents without it are not fixable by the loop. */
  revise?(ctx: AgentContext, actions: { action: string; target?: string }[]): Promise<O>;
}

/** Compact digest of prior decisions, injected into every LLM prompt so agents never contradict earlier work. */
export function decisionDigest(ctx: AgentContext): string {
  const ds = ctx.memory.decisions();
  if (!ds.length) return "No prior decisions.";
  const latest = new Map<string, string>();
  for (const d of ds) latest.set(d.key, `${d.key}: ${d.value} (${d.agent}: ${d.rationale})`);
  return [...latest.values()].join("\n");
}

export const HOUSE_RULES = `You are part of DynaTech AI Studio, an AI creative agency. Rules:
- Never invent facts about the business (years in business, project counts, awards, licences, testimonials, prices). Use clearly marked placeholders instead.
- Avoid generic AI website patterns, filler like "Welcome to our website", excess gradients/glassmorphism, and cards everywhere.
- Never contradict previously approved decisions unless you explicitly explain why.
- Write native-quality American English with premium, specific, conversion-minded copy.`;

/**
 * Try the configured LLM with a validated schema; fall back to the deterministic knowledge-base
 * implementation if no LLM is configured OR the model output fails validation.
 */
export async function askOrFallback<T>(
  ctx: AgentContext,
  opts: { task: string; system: string; prompt: string; schema: ZodType<T>; fallback: () => T | Promise<T> },
): Promise<T> {
  if (ctx.llm.available) {
    try {
      const value = await ctx.llm.completeJSON({
        task: opts.task,
        system: `${HOUSE_RULES}\n\n${opts.system}\n\nPrior decisions:\n${decisionDigest(ctx)}${ctx.feedback ? `\n\nHuman feedback to honor:\n${ctx.feedback}` : ""}`,
        prompt: opts.prompt,
        schema: opts.schema,
      });
      ctx.report({ usedLLM: ctx.llm.name });
      return value;
    } catch (err) {
      if (!(err instanceof LLMUnavailableError)) ctx.log(`${opts.task}: LLM output rejected (${(err as Error).message.slice(0, 160)}); using knowledge base`, "warn");
    }
  }
  ctx.report({ usedLLM: "knowledge-base" });
  return opts.fallback();
}
