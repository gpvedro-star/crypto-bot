import type { ZodType } from "zod";

export interface JSONRequest<T> {
  system: string;
  prompt: string;
  schema: ZodType<T>;
  /** Short name used in logs. */
  task: string;
  maxTokens?: number;
}

/** Standardised LLM interface. Agents never call vendor APIs directly. */
export interface LLMProvider {
  readonly name: string;
  readonly available: boolean;
  completeJSON<T>(req: JSONRequest<T>): Promise<T>;
}

export class LLMUnavailableError extends Error {}
