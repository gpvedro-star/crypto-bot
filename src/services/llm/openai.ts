import OpenAI from "openai";
import { env } from "../../core/config";
import type { Completion, CompletionRequest, LLMProvider } from "./types";
import { LLMUnavailableError, ProviderError } from "./types";

export interface OpenAIOptions { apiKey?: string; baseURL?: string; model?: string }

/** OpenAI has no default model here on purpose: model ids change, so OPENAI_MODEL must be set explicitly. */
export class OpenAIProvider implements LLMProvider {
  readonly name = "openai";
  readonly model: string;
  private readonly apiKey?: string;
  private readonly baseURL?: string;

  constructor(opts: OpenAIOptions = {}) {
    this.apiKey = opts.apiKey ?? env("OPENAI_API_KEY");
    this.baseURL = opts.baseURL;
    this.model = opts.model ?? env("OPENAI_MODEL") ?? "";
  }

  get available() { return !!this.apiKey && !!this.model; }
  get missing() { return [...(this.apiKey ? [] : ["OPENAI_API_KEY"]), ...(this.model ? [] : ["OPENAI_MODEL"])]; }

  async complete(req: CompletionRequest): Promise<Completion> {
    if (!this.available) throw new LLMUnavailableError(this.name, `${this.missing.join(" and ")} not set`);
    const client = new OpenAI({ apiKey: this.apiKey, ...(this.baseURL ? { baseURL: this.baseURL } : {}), maxRetries: 2 });
    const userContent: OpenAI.Chat.ChatCompletionContentPart[] = [
      ...(req.images ?? []).map((img): OpenAI.Chat.ChatCompletionContentPart => ({ type: "image_url", image_url: { url: img.url ?? `data:${img.mediaType ?? "image/jpeg"};base64,${img.base64}` } })),
      { type: "text", text: req.prompt },
    ];
    try {
      const res = await client.chat.completions.create({
        model: this.model,
        response_format: { type: "json_object" },
        messages: [{ role: "system", content: req.system }, { role: "user", content: userContent }],
      });
      const choice = res.choices[0];
      if (choice?.finish_reason === "length") throw new ProviderError(this.name, "truncated", `Output for "${req.task}" was truncated`);
      if (choice?.finish_reason === "content_filter") throw new ProviderError(this.name, "refusal", "Response blocked by the content filter");
      return { text: choice?.message?.content ?? "", model: res.model, usage: { inputTokens: res.usage?.prompt_tokens, outputTokens: res.usage?.completion_tokens } };
    } catch (e) {
      if (e instanceof ProviderError) throw e;
      if (e instanceof OpenAI.AuthenticationError) throw new ProviderError(this.name, "auth", `Authentication failed (401): ${e.message}. Check OPENAI_API_KEY.`, 401);
      if (e instanceof OpenAI.RateLimitError) throw new ProviderError(this.name, "rate-limit", `Rate limited (429): ${e.message}`, 429);
      if (e instanceof OpenAI.APIConnectionError) throw new ProviderError(this.name, "network", `Could not reach the OpenAI API: ${e.message}`);
      if (e instanceof OpenAI.APIError) throw new ProviderError(this.name, "http", `API error ${e.status}: ${e.message}`, e.status);
      throw new ProviderError(this.name, "http", (e as Error).message);
    }
  }
}
