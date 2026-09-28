import { env } from "../../core/config";
import { AnthropicProvider } from "./anthropic";
import { OfflineProvider } from "./offline";
import { OpenAIProvider } from "./openai";
import type { LLMProvider } from "./types";

export * from "./types";
export { completeJSON, extractJSON } from "./json";

/**
 * Provider selection (environment only):
 *   LLM_PROVIDER=anthropic (default) | openai | offline
 * With LLM_PROVIDER unset, Anthropic is preferred; OpenAI is used only if Anthropic has no key but OpenAI is fully configured.
 * An explicitly requested provider is never swapped for another one: if its key is missing it reports `available=false`.
 */
export function createLLM(): LLMProvider {
  const pref = env("LLM_PROVIDER")?.toLowerCase();
  if (pref === "offline" || pref === "demo") return new OfflineProvider();
  if (pref === "openai") return new OpenAIProvider();
  if (pref === "anthropic") return new AnthropicProvider();
  if (pref) throw new Error(`Unknown LLM_PROVIDER "${pref}". Use anthropic, openai or offline.`);
  const anthropic = new AnthropicProvider();
  if (anthropic.available) return anthropic;
  const openai = new OpenAIProvider();
  if (openai.available) return openai;
  // Nothing configured: report Anthropic as the (unavailable) default so the missing key named is ANTHROPIC_API_KEY.
  return anthropic;
}
