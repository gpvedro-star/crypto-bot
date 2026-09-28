import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import type { BusinessInput } from "../src/core/types";
import { Orchestrator } from "../src/core/orchestrator";
import { OfflineProvider } from "../src/services/llm/offline";
import { NoMediaProvider } from "../src/services/pexels";
import { DisabledVideoProvider } from "../src/services/higgsfield";
import { createEngineRegistry } from "../src/services/website-engines";
import type { MediaProvider } from "../src/services/pexels";

export const LANDSCAPING: BusinessInput = {
  business: "Luxury Landscaping Company",
  location: "Miami, Florida",
  targetAudience: "High-income homeowners",
  style: "Premium, cinematic, sophisticated",
  goal: "Generate qualified leads for high-end landscaping projects.",
};

export function tmpDir(): string { return fs.mkdtempSync(path.join(os.tmpdir(), "dynatech-test-")); }

export function makeOrchestrator(opts: { media?: MediaProvider; baseDir?: string } = {}) {
  const baseDir = opts.baseDir ?? tmpDir();
  const engines = createEngineRegistry();
  const orch = new Orchestrator({ llm: new OfflineProvider(), media: opts.media ?? new NoMediaProvider(), video: new DisabledVideoProvider(), engines, baseDir });
  return { orch, baseDir };
}

import { AnthropicProvider } from "../src/services/llm/anthropic";
import { PexelsProvider } from "../src/services/pexels";
import { HiggsfieldProvider } from "../src/services/higgsfield";
import type { LLMProvider } from "../src/services/llm/types";
import type { VideoProvider } from "../src/services/higgsfield/types";

export interface RealSetup {
  llm?: LLMProvider; media?: MediaProvider; video?: VideoProvider; baseDir?: string; videoPollMs?: number; videoTimeoutMs?: number;
}
/** Orchestrator wired like production, but every provider points at a local mock server. */
export function makeRealOrchestrator(o: RealSetup) {
  const baseDir = o.baseDir ?? tmpDir();
  const orch = new Orchestrator({
    llm: o.llm ?? new OfflineProvider(), media: o.media ?? new NoMediaProvider(), video: o.video ?? new DisabledVideoProvider(),
    engines: createEngineRegistry(), baseDir, videoPollMs: o.videoPollMs ?? 20, videoTimeoutMs: o.videoTimeoutMs ?? 5000,
  });
  return { orch, baseDir };
}
export const anthropicAt = (url: string, key = "test-anthropic-key") => new AnthropicProvider({ apiKey: key, baseURL: url, model: "claude-opus-5-5" });
export const pexelsAt = (url: string, key = "test-pexels-key") => new PexelsProvider({ apiKey: key, baseURL: url });
export const higgsfieldAt = (url: string, credentials = "hfkey:hfsecret", modelPath = "vendor/video-model/v1/text-to-video") => new HiggsfieldProvider({ credentials, baseURL: url, modelPath, retryDelayMs: 1, timeoutMs: 3000 });
