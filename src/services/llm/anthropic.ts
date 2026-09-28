import Anthropic from "@anthropic-ai/sdk";
import { env } from "../../core/config";
import type { Completion, CompletionRequest, LLMProvider } from "./types";
import { LLMUnavailableError, ProviderError } from "./types";

/** Default follows the Claude API guidance for this SDK generation; override with ANTHROPIC_MODEL. */
export const DEFAULT_ANTHROPIC_MODEL = "claude-opus-5-5";

export interface AnthropicOptions { apiKey?: string; baseURL?: string; model?: string }

export class AnthropicProvider implements LLMProvider {
  readonly name = "anthropic";
  readonly model: string;
  private readonly apiKey?: string;
  private readonly baseURL?: string;

  constructor(opts: AnthropicOptions = {}) {
    this.apiKey = opts.apiKey ?? env("ANTHROPIC_API_KEY");
    this.baseURL = opts.baseURL;
    this.model = opts.model ?? env("ANTHROPIC_MODEL") ?? DEFAULT_ANTHROPIC_MODEL;
  }

  get available() { return !!this.apiKey || !!env("ANTHROPIC_AUTH_TOKEN"); }
  get missing() { return this.available ? [] : ["ANTHROPIC_API_KEY"]; }

  private client() {
    return new Anthropic({ ...(this.apiKey ? { apiKey: this.apiKey } : {}), ...(this.baseURL ? { baseURL: this.baseURL } : {}), maxRetries: 2 });
  }

  async complete(req: CompletionRequest): Promise<Completion> {
    if (!this.available) throw new LLMUnavailableError(this.name, "ANTHROPIC_API_KEY is not set");
    const content: Anthropic.ContentBlockParam[] = [
      ...(req.images ?? []).map((img): Anthropic.ContentBlockParam =>
        img.url
          ? { type: "image", source: { type: "url", url: img.url } }
          : { type: "image", source: { type: "base64", media_type: img.mediaType ?? "image/jpeg", data: img.base64 ?? "" } }),
      { type: "text", text: req.prompt },
    ];
    // Effort is supported by the current Opus/Sonnet generation; not sent for Haiku-class models.
    const effort = env("ANTHROPIC_EFFORT") ?? "high";
    const supportsEffort = !/haiku/i.test(this.model) && effort !== "off";
    const params = {
      model: this.model,
      max_tokens: req.maxTokens ?? Number(env("ANTHROPIC_MAX_TOKENS") ?? 32000),
      system: req.system,
      messages: [{ role: "user" as const, content }],
      ...(supportsEffort ? { output_config: { effort: effort as "low" | "medium" | "high" | "xhigh" | "max" } } : {}),
    };
    const fallbacks = (env("ANTHROPIC_REFUSAL_FALLBACK") ?? "on") !== "off";
    try {
      // Streaming: long outputs at high max_tokens would otherwise risk HTTP timeouts.
      const message = fallbacks
        ? await this.client().beta.messages.stream({ ...params, betas: ["server-side-fallback-2026-07-01"], fallbacks: "default" }).finalMessage()
        : await this.client().messages.stream(params).finalMessage();
      if (message.stop_reason === "refusal") {
        const details = (message as { stop_details?: { category?: string | null; explanation?: string } }).stop_details;
        throw new ProviderError(this.name, "refusal", `Model refused the request (category: ${details?.category ?? "unknown"}${details?.explanation ? `: ${details.explanation}` : ""})`);
      }
      if (message.stop_reason === "max_tokens") throw new ProviderError(this.name, "truncated", `Output for "${req.task}" hit max_tokens (${params.max_tokens}); raise ANTHROPIC_MAX_TOKENS`);
      const text = (message.content as { type: string; text?: string }[]).filter((b) => b.type === "text").map((b) => b.text ?? "").join("");
      return { text, model: message.model, usage: { inputTokens: message.usage.input_tokens, outputTokens: message.usage.output_tokens } };
    } catch (e) {
      if (e instanceof ProviderError) throw e;
      if (e instanceof Anthropic.AuthenticationError) throw new ProviderError(this.name, "auth", `Authentication failed (401): ${e.message}. Check ANTHROPIC_API_KEY.`, 401);
      if (e instanceof Anthropic.PermissionDeniedError) throw new ProviderError(this.name, "auth", `Permission denied (403): ${e.message}`, 403);
      if (e instanceof Anthropic.RateLimitError) throw new ProviderError(this.name, "rate-limit", `Rate limited (429): ${e.message}`, 429);
      if (e instanceof Anthropic.APIConnectionError) throw new ProviderError(this.name, "network", `Could not reach the Anthropic API: ${e.message}`);
      if (e instanceof Anthropic.APIError) throw new ProviderError(this.name, "http", `API error ${e.status}: ${e.message}`, e.status);
      throw new ProviderError(this.name, "http", (e as Error).message);
    }
  }
}
