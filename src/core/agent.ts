import type { ZodType } from "zod";
import { completeJSON, type LLMImage, type LLMProvider } from "../services/llm";
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
  /** Human feedback from a supervised checkpoint or the QA reviewer, if any. */
  feedback?: string;
  log: (message: string, level?: "info" | "warn" | "error") => void;
  /** Model id the API reported for the most recent LLM call in this stage (set by askLLM). */
  lastModel?: string;
  /** Agents report who produced their output. `provider` is a display name; `model` is the exact model id for LLMs. */
  report: (info: { summary?: string; provider?: string; model?: string }) => void;
}

export interface Agent<O> {
  readonly id: AgentId;
  readonly label: string;
  run(ctx: AgentContext): Promise<O>;
  /** Apply QA-directed fixes. Optional — agents without it are not fixable by the loop. */
  revise?(ctx: AgentContext, actions: { action: string; target?: string }[]): Promise<O>;
}

export const DEMO_PROVIDER = "knowledge-base (demo)";

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

export interface AskOptions<T> {
  task: string;
  system: string;
  prompt: string;
  schema: ZodType<T>;
  images?: LLMImage[];
  /** Semantic checks beyond the schema. Return human-readable problems; the model gets one chance to repair them. */
  check?: (value: T) => string[];
  /** Demo-mode implementation. Only used when NO LLM is configured. */
  fallback: () => T | Promise<T>;
}

/**
 * Run an agent's reasoning step.
 *  - LLM configured  → the LLM must produce valid output. If it fails (API error, refusal, invalid JSON after one repair)
 *    the error propagates and the stage fails with the exact message. There is NO silent fallback to templates.
 *  - No LLM configured → demo mode: the deterministic knowledge-base output, labelled "knowledge-base (demo)".
 */
export async function askLLM<T>(ctx: AgentContext, opts: AskOptions<T>): Promise<T> {
  if (!ctx.llm.available) {
    ctx.report({ provider: DEMO_PROVIDER });
    return opts.fallback();
  }
  const result = await completeJSON(
    ctx.llm,
    {
      task: opts.task,
      system: `${HOUSE_RULES}\n\n${opts.system}\n\nPrior decisions:\n${decisionDigest(ctx)}${ctx.feedback ? `\n\nFeedback to honor (from a human or the QA reviewer):\n${ctx.feedback}` : ""}`,
      prompt: opts.prompt,
      schema: opts.schema,
      images: opts.images,
    },
    opts.check,
  );
  ctx.lastModel = result.model;
  ctx.report({ provider: ctx.llm.name, model: result.model });
  if (result.attempts > 1) ctx.log(`${opts.task}: needed a repair round to satisfy validation`, "warn");
  return result.value;
}
