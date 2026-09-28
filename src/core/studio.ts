import { createLLM } from "../services/llm";
import { createMediaProvider } from "../services/pexels";
import { createVideoProvider } from "../services/higgsfield";
import { createEngineRegistry } from "../services/website-engines";
import { Orchestrator } from "./orchestrator";

/** Wires the orchestrator to whichever providers the environment configures. */
export function createStudio(baseDir?: string) {
  const llm = createLLM(), media = createMediaProvider(), video = createVideoProvider(), engines = createEngineRegistry();
  const orchestrator = new Orchestrator({ llm, media, video, engines, baseDir });
  return { orchestrator, llm, media, video, engines };
}

const g = globalThis as unknown as { __dynatechStudio?: ReturnType<typeof createStudio> };
/** Process-wide singleton so Next.js API routes share running projects and pending approvals. */
export function getStudio() {
  if (!g.__dynatechStudio) {
    g.__dynatechStudio = createStudio();
    g.__dynatechStudio.orchestrator.resumeAllVideos(); // continue any generation that was in flight when the server stopped
  }
  return g.__dynatechStudio;
}

/** Booleans, names and model ids only. API keys are never returned. */
export function providerStatus() {
  const s = getStudio();
  return { ...s.orchestrator.providers(), engines: s.engines.list() };
}
