import { z } from "zod";
import { env } from "../../core/config";
import { extractJSON } from "./json";
import type { JSONRequest, LLMProvider } from "./types";
import { LLMUnavailableError } from "./types";

export class OpenAIProvider implements LLMProvider {
  readonly name = "openai";
  get available() { return !!env("OPENAI_API_KEY") && !!env("OPENAI_MODEL"); }

  async completeJSON<T>(req: JSONRequest<T>): Promise<T> {
    const key = env("OPENAI_API_KEY");
    const model = env("OPENAI_MODEL");
    if (!key || !model) throw new LLMUnavailableError("OPENAI_API_KEY / OPENAI_MODEL not set");
    const schemaHint = JSON.stringify(z.toJSONSchema(req.schema as z.ZodType));
    const res = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: { "content-type": "application/json", authorization: `Bearer ${key}` },
      body: JSON.stringify({
        model,
        response_format: { type: "json_object" },
        messages: [
          { role: "system", content: `${req.system}\n\nReturn ONE JSON object matching this JSON Schema:\n${schemaHint}` },
          { role: "user", content: req.prompt },
        ],
      }),
    });
    if (!res.ok) throw new Error(`OpenAI ${res.status}: ${(await res.text()).slice(0, 300)}`);
    const data = (await res.json()) as { choices: { message: { content: string } }[] };
    return req.schema.parse(extractJSON(data.choices[0].message.content));
  }
}
