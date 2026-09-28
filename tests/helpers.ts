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
