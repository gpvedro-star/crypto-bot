import fs from "node:fs";
import path from "node:path";
import { projectsDir } from "./config";
import type { Decision, MemorySection, ProjectMemory, ProjectState, StudioEvent } from "./types";
import { MEMORY_SECTIONS } from "./types";

/**
 * File-backed project memory. Layout:
 *   projects/<id>/memory/<section>.json   one file per memory section
 *   projects/<id>/state.json              stage status, mode, iteration
 *   projects/<id>/decisions.json          append-only decision log
 *   projects/<id>/events.jsonl            activity log
 *   projects/<id>/site/                   generated website
 */
export class ProjectMemoryStore {
  readonly root: string;
  constructor(public readonly id: string, baseDir = projectsDir()) {
    if (!/^[a-z0-9][a-z0-9-]{0,80}$/.test(id)) throw new Error(`Invalid project id: ${id}`);
    this.root = path.join(baseDir, id);
    fs.mkdirSync(path.join(this.root, "memory"), { recursive: true });
  }

  get siteDir() { return path.join(this.root, "site"); }
  private file(section: MemorySection) { return path.join(this.root, "memory", `${section}.json`); }

  has(section: MemorySection): boolean { return fs.existsSync(this.file(section)); }

  get<K extends MemorySection>(section: K): ProjectMemory[K] | undefined {
    try { return JSON.parse(fs.readFileSync(this.file(section), "utf8")); } catch { return undefined; }
  }

  require<K extends MemorySection>(section: K): ProjectMemory[K] {
    const v = this.get(section);
    if (v === undefined) throw new Error(`Memory section "${section}" has not been produced yet`);
    return v;
  }

  set<K extends MemorySection>(section: K, value: ProjectMemory[K]): void {
    if (!MEMORY_SECTIONS.includes(section)) throw new Error(`Unknown memory section ${section}`);
    fs.writeFileSync(this.file(section), JSON.stringify(value, null, 2));
  }

  clear(section: MemorySection) { fs.rmSync(this.file(section), { force: true }); }

  // ── decisions: agents must not silently contradict earlier approved decisions ──
  decisions(): Decision[] {
    try { return JSON.parse(fs.readFileSync(path.join(this.root, "decisions.json"), "utf8")); } catch { return []; }
  }

  recordDecision(d: Omit<Decision, "at">): Decision {
    const all = this.decisions();
    const previous = [...all].reverse().find((x) => x.key === d.key);
    if (previous && previous.value !== d.value && !d.overrides) {
      throw new Error(
        `Decision conflict on "${d.key}": ${previous.agent} chose "${previous.value}", ${d.agent} proposes "${d.value}" without an explicit override rationale.`,
      );
    }
    const full: Decision = { ...d, at: new Date().toISOString() };
    all.push(full);
    fs.writeFileSync(path.join(this.root, "decisions.json"), JSON.stringify(all, null, 2));
    return full;
  }

  decisionValue(key: string): string | undefined {
    return [...this.decisions()].reverse().find((x) => x.key === key)?.value;
  }

  // ── state + events ──
  getState(): ProjectState | undefined {
    try { return JSON.parse(fs.readFileSync(path.join(this.root, "state.json"), "utf8")); } catch { return undefined; }
  }
  setState(s: ProjectState) {
    s.updatedAt = new Date().toISOString();
    fs.writeFileSync(path.join(this.root, "state.json"), JSON.stringify(s, null, 2));
  }
  appendEvent(e: StudioEvent) {
    fs.appendFileSync(path.join(this.root, "events.jsonl"), JSON.stringify(e) + "\n");
  }
  events(): StudioEvent[] {
    try {
      return fs.readFileSync(path.join(this.root, "events.jsonl"), "utf8").trim().split("\n").filter(Boolean).map((l) => JSON.parse(l));
    } catch { return []; }
  }
}

export function listProjectIds(baseDir = projectsDir()): string[] {
  try {
    return fs.readdirSync(baseDir, { withFileTypes: true }).filter((d) => d.isDirectory() && fs.existsSync(path.join(baseDir, d.name, "state.json"))).map((d) => d.name);
  } catch { return []; }
}

export function slugify(input: string): string {
  return input.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "").slice(0, 48) || "project";
}
