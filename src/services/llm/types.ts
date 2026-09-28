import type { ZodType } from "zod";

export interface LLMImage {
  /** Provide either base64 data (with mediaType) or a public URL. */
  base64?: string;
  mediaType?: "image/png" | "image/jpeg" | "image/webp" | "image/gif";
  url?: string;
}

export interface CompletionRequest {
  system: string;
  prompt: string;
  /** Short name used in logs and errors, e.g. "copy". */
  task: string;
  images?: LLMImage[];
  maxTokens?: number;
}

export interface Completion {
  text: string;
  /** The model id the API reports it actually used. */
  model: string;
  usage?: { inputTokens?: number; outputTokens?: number };
}

export interface JSONRequest<T> extends CompletionRequest {
  schema: ZodType<T>;
}

/** Standardised LLM interface. Agents never call vendor SDKs directly. */
export interface LLMProvider {
  readonly name: string;
  /** Configured model id (what we ask for). */
  readonly model: string;
  /** True only when every required credential is present. */
  readonly available: boolean;
  /** Environment variables that must be set for this provider to be available. */
  readonly missing: string[];
  complete(req: CompletionRequest): Promise<Completion>;
}

export type ProviderErrorKind = "auth" | "rate-limit" | "refusal" | "truncated" | "invalid-output" | "network" | "http" | "unavailable";

/** A provider failure with the exact upstream detail. Agents surface it; they never paper over it. */
export class ProviderError extends Error {
  constructor(public readonly provider: string, public readonly kind: ProviderErrorKind, message: string, public readonly status?: number) {
    super(`[${provider}] ${message}`);
    this.name = "ProviderError";
  }
}

export class LLMUnavailableError extends ProviderError {
  constructor(provider: string, message: string) { super(provider, "unavailable", message); }
}
