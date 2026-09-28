import type { GenerationJob } from "../../core/types";

export interface GenerateVideoOptions {
  durationSeconds?: number;
  aspect?: "16:9" | "9:16";
}

/** Generated-video provider interface. */
export interface VideoProvider {
  readonly name: string;
  readonly available: boolean;
  generateVideo(prompt: string, opts?: GenerateVideoOptions): Promise<GenerationJob>;
  getGenerationStatus(id: string): Promise<GenerationJob>;
}
