import { z } from "zod";
import { env } from "../../core/config";
import { extractJSON } from "./json";
import type { JSONRequest, LLMProvider } from "./types";
import { LLMUnavailableError } from "./types";

export class AnthropicProvider implements LLMProvider {
  readonly name = "anthropic";
  get available() { return !!env("ANTHROPIC_API_KEY"); }

  async completeJSON<T>(req: JSONRequest<T>): Promise<T> {
    const key = env("ANTHROPIC_API_KEY");
    if (!key) throw new LLMUnavailableError("ANTHROPIC_API_KEY not set");
    const schemaHint = JSON.stringify(z.toJSONSchema(req.schema as z.ZodType));
    const res = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: { "content-type": "application/json", "x-api-key": key, "anthropic-version": "2023-06-01" },
      body: JSON.stringify({
        model: env("ANTHROPIC_MODEL") ?? "claude-sonnet-5-5",
        max_tokens: req.maxTokens ?? 8000,
        system: `${req.system}\n\nRespond with ONE JSON object only, no prose, matching this JSON Schema:\n${schemaHint}`,
        messages: [{ role: "user", content: req.prompt }],
      }),
    });
    if (!res.ok) throw new Error(`Anthropic ${res.status}: ${(await res.text()).slice(0, 300)}`);
    const data = (await res.json()) as { content: { type: string; text?: string }[] };
    const text = data.content.filter((c) => c.type === "text").map((c) => c.text).join("");
    return req.schema.parse(extractJSON(text));
  }
}
