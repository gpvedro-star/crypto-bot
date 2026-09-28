import { NextJsEngine } from "./nextjs";
import type { EngineInput, EngineResult, WebsiteEngine } from "./types";

export * from "./types";

/** Placeholder for platforms on the roadmap. Registering them now keeps the abstraction honest. */
class PlannedEngine implements WebsiteEngine {
  readonly status = "planned" as const;
  constructor(readonly id: string, readonly label: string) {}
  async generate(_input: EngineInput): Promise<EngineResult> {
    throw new Error(`The ${this.label} engine is not implemented yet. Implement WebsiteEngine.generate() in src/services/website-engines.`);
  }
}

export class EngineRegistry {
  private engines = new Map<string, WebsiteEngine>();
  register(e: WebsiteEngine) { this.engines.set(e.id, e); return this; }
  get(id: string): WebsiteEngine {
    const e = this.engines.get(id);
    if (!e) throw new Error(`Unknown website engine "${id}". Available: ${[...this.engines.keys()].join(", ")}`);
    return e;
  }
  list() { return [...this.engines.values()].map((e) => ({ id: e.id, label: e.label, status: e.status })); }
}

export function createEngineRegistry(): EngineRegistry {
  return new EngineRegistry()
    .register(new NextJsEngine())
    .register(new PlannedEngine("react", "React (Vite SPA)"))
    .register(new PlannedEngine("webflow", "Webflow"))
    .register(new PlannedEngine("framer", "Framer"))
    .register(new PlannedEngine("wordpress", "WordPress"))
    .register(new PlannedEngine("shopify", "Shopify"));
}
