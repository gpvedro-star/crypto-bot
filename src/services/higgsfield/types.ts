import type { GenerationJob } from "../../core/types";

export interface GenerateVideoOptions {
  durationSeconds?: number;
  aspect?: "16:9" | "9:16";
}

/** Generated-video provider interface. Methods THROW on transport/API errors; job status carries generation outcomes. */
export interface VideoProvider {
  readonly name: string;
  readonly available: boolean;
  /** Environment variables still needed before generation can run. */
  readonly missing: string[];
  /** Create a generation job. This is the call that spends credits. */
  generateVideo(prompt: string, opts?: GenerateVideoOptions): Promise<GenerationJob>;
  /** Poll a job. The returned job carries `status`, and `url` once completed. */
  getGenerationStatus(job: Pick<GenerationJob, "id" | "statusUrl">): Promise<GenerationJob>;
  cancel?(job: Pick<GenerationJob, "id" | "cancelUrl">): Promise<void>;
}
