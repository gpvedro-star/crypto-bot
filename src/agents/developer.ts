import type { Agent } from "../core/agent";
import type { CodeManifest } from "../core/types";

export const developerAgent: Agent<CodeManifest> = {
  id: "developer",
  label: "Developer",
  async run(ctx) {
    const architecture = ctx.memory.require("architecture");
    const engine = ctx.engines.get(architecture.engine);
    const m = {
      business: ctx.memory.require("business"),
      research: ctx.memory.require("research"),
      strategy: ctx.memory.require("strategy"),
      brand: ctx.memory.require("brand"),
      creative: ctx.memory.require("creative"),
      ux: ctx.memory.require("ux"),
      "design-system": ctx.memory.require("design-system"),
      copy: ctx.memory.require("copy"),
      media: ctx.memory.require("media"),
      video: ctx.memory.get("video") ?? { decision: "none" as const, reasoning: "", concept: "", prompt: "", durationSeconds: 0, aspect: "16:9" as const, phase: "not_needed" as const },
      architecture,
    };
    // The developer challenges the design rather than following it blindly.
    for (const flag of architecture.developerFlags) ctx.log(`Developer flag: ${flag}`, "warn");
    const result = await engine.generate({ memory: m, outputDir: ctx.memory.siteDir, developerFixes: [] });
    ctx.report({ provider: "template-engine", summary: `${engine.label}: ${result.files.length} files written (iteration ${ctx.iteration})` });
    return {
      engine: engine.id,
      outputDir: ctx.memory.siteDir,
      files: result.files,
      builtAt: new Date().toISOString(),
      iteration: ctx.iteration,
      installCommand: result.installCommand,
      runCommand: result.runCommand,
    };
  },
  async revise(ctx) { return developerAgent.run(ctx); },
};
