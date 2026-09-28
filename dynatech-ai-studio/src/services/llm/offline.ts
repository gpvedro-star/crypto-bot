import type { JSONRequest, LLMProvider } from "./types";
import { LLMUnavailableError } from "./types";

/** No-model provider. Agents catch LLMUnavailableError and use their deterministic knowledge-base path. */
export class OfflineProvider implements LLMProvider {
  readonly name = "knowledge-base";
  readonly available = false;
  async completeJSON<T>(_req: JSONRequest<T>): Promise<T> {
    throw new LLMUnavailableError("No LLM provider configured");
  }
}
