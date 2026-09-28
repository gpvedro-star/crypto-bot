import { z } from "zod";
import type { Completion, JSONRequest, LLMProvider } from "./types";
import { ProviderError } from "./types";

/** Extract the first balanced JSON object/array from an LLM response (handles ```json fences and prose). */
export function extractJSON(text: string): unknown {
  const fenced = text.match(/```(?:json)?\s*([\s\S]*?)```/i);
  const candidate = fenced ? fenced[1] : text;
  const start = candidate.search(/[[{]/);
  if (start < 0) throw new Error("No JSON found in model output");
  const open = candidate[start];
  const close = open === "{" ? "}" : "]";
  let depth = 0, inStr = false, esc = false;
  for (let i = start; i < candidate.length; i++) {
    const c = candidate[i];
    if (inStr) { if (esc) esc = false; else if (c === "\\") esc = true; else if (c === '"') inStr = false; continue; }
    if (c === '"') inStr = true;
    else if (c === open) depth++;
    else if (c === close && --depth === 0) return JSON.parse(candidate.slice(start, i + 1));
  }
  throw new Error("Unbalanced JSON in model output");
}

export interface JSONResult<T> { value: T; model: string; attempts: number; usage: { inputTokens: number; outputTokens: number } }

/**
 * Ask for JSON, validate it against the zod schema (plus optional semantic checks), and allow ONE repair round in which
 * the model sees exactly what was wrong. If it is still invalid the error is thrown: there is no silent fallback.
 */
export async function completeJSON<T>(llm: LLMProvider, req: JSONRequest<T>, check?: (v: T) => string[]): Promise<JSONResult<T>> {
  const schemaHint = JSON.stringify(z.toJSONSchema(req.schema as z.ZodType));
  const system = `[task: ${req.task}]\n${req.system}\n\nRespond with ONE JSON object only (no prose, no markdown fences) that validates against this JSON Schema:\n${schemaHint}`;
  const usage = { inputTokens: 0, outputTokens: 0 };
  let prompt = req.prompt;
  let last: Completion | undefined;
  let problems: string[] = [];
  for (let attempt = 1; attempt <= 2; attempt++) {
    last = await llm.complete({ ...req, system, prompt });
    usage.inputTokens += last.usage?.inputTokens ?? 0;
    usage.outputTokens += last.usage?.outputTokens ?? 0;
    try {
      const parsed = req.schema.safeParse(extractJSON(last.text));
      if (parsed.success) {
        problems = check?.(parsed.data) ?? [];
        if (!problems.length) return { value: parsed.data, model: last.model, attempts: attempt, usage };
      } else {
        problems = parsed.error.issues.slice(0, 12).map((i) => `${i.path.join(".") || "(root)"}: ${i.message}`);
      }
    } catch (e) {
      problems = [(e as Error).message];
    }
    prompt = `${req.prompt}\n\nYour previous answer was rejected for these reasons:\n- ${problems.join("\n- ")}\n\nPrevious answer (truncated):\n${last.text.slice(0, 3000)}\n\nReturn the corrected, complete JSON object.`;
  }
  throw new ProviderError(llm.name, "invalid-output", `"${req.task}" returned output that failed validation after a repair attempt: ${problems.join("; ")}`);
}
