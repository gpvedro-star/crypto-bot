import type { ProjectMemory } from "../../core/types";

export interface EngineInput {
  memory: Pick<ProjectMemory, "business" | "research" | "strategy" | "brand" | "creative" | "ux" | "design-system" | "copy" | "media" | "video" | "architecture">;
  outputDir: string;
  /** Applied by the revision loop: developer-level fixes. */
  developerFixes: string[];
}

export interface EngineResult {
  files: string[];
  installCommand: string;
  runCommand: string;
  buildCommand: string;
}

/** Abstraction over target platforms. V1 implements Next.js; others are registered stubs. */
export interface WebsiteEngine {
  readonly id: string;
  readonly label: string;
  readonly status: "ready" | "planned";
  generate(input: EngineInput): Promise<EngineResult>;
}
