import { env } from "../../core/config";
import { AnthropicProvider } from "./anthropic";
import { OfflineProvider } from "./offline";
import { OpenAIProvider } from "./openai";
import type { LLMProvider } from "./types";

export * from "./types";

export function createLLM(): LLMProvider {
  const pref = env("LLM_PROVIDER");
  const anthropic = new AnthropicProvider();
  const openai = new OpenAIProvider();
  if (pref === "offline") return new OfflineProvider();
  if (pref === "openai" && openai.available) return openai;
  if (pref === "anthropic" && anthropic.available) return anthropic;
  if (anthropic.available) return anthropic;
  if (openai.available) return openai;
  return new OfflineProvider();
}
