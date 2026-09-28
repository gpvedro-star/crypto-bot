import type { Completion, CompletionRequest, LLMProvider } from "./types";
import { LLMUnavailableError } from "./types";

/** Demo mode: no model. Agents use their deterministic knowledge-base path and label the output as demo. */
export class OfflineProvider implements LLMProvider {
  readonly name = "knowledge-base";
  readonly model = "";
  readonly available = false;
  readonly missing: string[] = [];
  async complete(_req: CompletionRequest): Promise<Completion> {
    throw new LLMUnavailableError(this.name, "No LLM provider configured (demo mode)");
  }
}
