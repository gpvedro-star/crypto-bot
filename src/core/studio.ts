import { createLLM } from "../services/llm";
import { createMediaProvider } from "../services/pexels";
import { createVideoProvider } from "../services/higgsfield";
import { createEngineRegistry } from "../services/website-engines";
import { Orchestrator } from "./orchestrator";

/** Wires the orchestrator to whichever providers the environment configures. */
export function createStudio(baseDir?: string) {
  const llm = createLLM(), media = createMediaProvider(), video = createVideoProvider(), engines = createEngineRegistry();
  return { orchestrator: new Orchestrator({ llm, media, video, engines, baseDir }), llm, media, video, engines };
}

const g = globalThis as unknown as { __dynatechStudio?: ReturnType<typeof createStudio> };
/** Process-wide singleton so Next.js API routes share running projects and pending approvals. */
export function getStudio() {
  return (g.__dynatechStudio ??= createStudio());
}

export function providerStatus() {
  const s = getStudio();
  return {
    llm: { name: s.llm.name, available: s.llm.available },
    media: { name: s.media.name, available: s.media.available },
    video: { name: s.video.name, available: s.video.available },
    engines: s.engines.list(),
  };
}
