import path from "node:path";
import { createStudio } from "../core/studio";
import { loadEnvFile } from "./env";

loadEnvFile(path.resolve(process.cwd(), ".env.local"));

/** Rebuild an existing project's website from stored memory (no agents re-run except the Developer). */
async function main() {
  const id = process.argv[2];
  if (!id) { console.error("Usage: npm run regen -- <project-id>"); process.exit(1); }
  const studio = createStudio();
  const mem = studio.orchestrator.store(id);
  const { developerAgent } = await import("../agents/developer");
  const state = mem.getState();
  const code = await developerAgent.run({
    input: mem.require("business"), memory: mem, llm: studio.llm, media: studio.media, video: studio.video, engines: studio.engines,
    iteration: state?.iteration ?? 0, log: console.log, report: () => {},
  });
  mem.set("code", code);
  console.log(`Regenerated ${code.files.length} files in ${code.outputDir}`);
}
main().catch((e) => { console.error(e); process.exit(1); });
