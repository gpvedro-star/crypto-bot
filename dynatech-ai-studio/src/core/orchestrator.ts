import fs from "node:fs";
import path from "node:path";
import { architectAgent } from "../agents/architect";
import { brandAgent } from "../agents/brand";
import { copyAgent } from "../agents/copy";
import { creativeAgent } from "../agents/creative";
import { designSystemAgent } from "../agents/design-system";
import { developerAgent } from "../agents/developer";
import { mediaAgent } from "../agents/media";
import { qaAgent, qaPasses } from "../agents/qa";
import { researchAgent } from "../agents/research";
import { strategyAgent } from "../agents/strategy";
import { uxAgent } from "../agents/ux";
import { videoAgent } from "../agents/video";
import type { LLMProvider } from "../services/llm/types";
import type { MediaProvider } from "../services/pexels/types";
import type { VideoProvider } from "../services/higgsfield/types";
import type { EngineRegistry } from "../services/website-engines";
import type { Agent, AgentContext } from "./agent";
import { makeEvent } from "./events";
import { ProjectMemoryStore, slugify } from "./memory";
import type {
  AgentId, BusinessInput, Checkpoint, MemorySection, ProjectMemory, ProjectState, QAIssue, RunMode, StageState,
} from "./types";

export interface OrchestratorDeps { llm: LLMProvider; media: MediaProvider; video: VideoProvider; engines: EngineRegistry; baseDir?: string }
export interface OrchestratorOptions { mode?: RunMode; maxIterations?: number }

interface Node {
  id: AgentId;
  section: MemorySection;
  agent: Agent<unknown>;
  deps: AgentId[];
  gateBefore?: Checkpoint;
  gateAfter?: Checkpoint;
}

/**
 * The pipeline as a dependency graph. Anything whose dependencies are met runs in parallel, e.g.
 * Copy ∥ Media ∥ Design System once UX is done.
 *   research → strategy → brand → creative → ux → (copy ∥ media ∥ design-system) → video ∥ architect → developer → QA loop
 */
export const PIPELINE: Node[] = [
  { id: "research", section: "research", agent: researchAgent as Agent<unknown>, deps: [] },
  { id: "strategy", section: "strategy", agent: strategyAgent as Agent<unknown>, deps: ["research"], gateAfter: "strategy" },
  { id: "brand", section: "brand", agent: brandAgent as Agent<unknown>, deps: ["strategy"] },
  { id: "creative", section: "creative", agent: creativeAgent as Agent<unknown>, deps: ["strategy", "brand"], gateAfter: "creative" },
  { id: "ux", section: "ux", agent: uxAgent as Agent<unknown>, deps: ["creative"] },
  { id: "copy", section: "copy", agent: copyAgent as Agent<unknown>, deps: ["ux"] },
  { id: "media", section: "media", agent: mediaAgent as Agent<unknown>, deps: ["ux"] },
  { id: "design-system", section: "design-system", agent: designSystemAgent as Agent<unknown>, deps: ["creative"] },
  { id: "video", section: "video", agent: videoAgent as Agent<unknown>, deps: ["media"] },
  { id: "architect", section: "architecture", agent: architectAgent as Agent<unknown>, deps: ["ux", "media"] },
  { id: "developer", section: "code", agent: developerAgent as Agent<unknown>, deps: ["copy", "video", "design-system", "architect"], gateBefore: "homepage" },
];

const LABELS: Record<string, string> = { qa: "QA & revision" };

const REVISABLE: Record<string, { section: MemorySection; agent: Agent<unknown> }> = {
  copy: { section: "copy", agent: copyAgent as Agent<unknown> },
  ux: { section: "ux", agent: uxAgent as Agent<unknown> },
  media: { section: "media", agent: mediaAgent as Agent<unknown> },
  developer: { section: "code", agent: developerAgent as Agent<unknown> },
};

export class Orchestrator {
  private gates = new Map<string, (r: { approved: boolean; feedback?: string }) => void>();
  private running = new Map<string, Promise<ProjectState>>();

  constructor(private deps: OrchestratorDeps) {}

  /** Create a project and persist the input. Returns its id. */
  create(input: BusinessInput, opts: OrchestratorOptions = {}): ProjectState {
    const base = slugify(`${input.location.split(",")[0]} ${input.business}`);
    let id = base, n = 1;
    const exists = (x: string) => fs.existsSync(path.join(this.deps.baseDir ?? path.resolve(process.env.STUDIO_PROJECTS_DIR ?? "projects"), x));
    while (exists(id)) id = `${base}-${++n}`;
    const mem = new ProjectMemoryStore(id, this.deps.baseDir);
    mem.set("business", input);
    const state: ProjectState = {
      id, name: `${input.location.split(",")[0]} ${input.business}`, mode: opts.mode ?? "autonomous", status: "created",
      createdAt: new Date().toISOString(), updatedAt: new Date().toISOString(), iteration: 0, approvals: [],
      stages: [...PIPELINE.map((n): StageState => ({ id: n.id, label: n.agent.label, status: "pending" })), { id: "qa", label: LABELS.qa, status: "pending" }],
    };
    mem.setState(state);
    return state;
  }

  store(id: string) { return new ProjectMemoryStore(id, this.deps.baseDir); }

  /** Start (or resume) a project. Concurrent calls for the same project share one run. */
  run(id: string, opts: OrchestratorOptions = {}): Promise<ProjectState> {
    const existing = this.running.get(id);
    if (existing) return existing;
    const p = this.execute(id, opts).finally(() => this.running.delete(id));
    this.running.set(id, p);
    return p;
  }

  isRunning(id: string) { return this.running.has(id); }

  /** Resolve a supervised checkpoint. */
  approve(id: string, checkpoint: Checkpoint, approved = true, feedback?: string) {
    const gate = this.gates.get(`${id}:${checkpoint}`);
    if (!gate) throw new Error(`Project ${id} is not waiting at checkpoint "${checkpoint}"`);
    gate({ approved, feedback });
  }

  // ───────────────────────── internals ─────────────────────────

  private async execute(id: string, opts: OrchestratorOptions): Promise<ProjectState> {
    const mem = this.store(id);
    const state = mem.getState();
    if (!state) throw new Error(`Unknown project ${id}`);
    const maxIterations = opts.maxIterations ?? 3;
    const input = mem.require("business");
    state.status = "running";
    mem.setState(state);

    const save = () => mem.setState(state);
    const stage = (sid: AgentId) => state.stages.find((s) => s.id === sid)!;
    const event = (level: "info" | "warn" | "error", message: string, agent?: AgentId | "orchestrator") => mem.appendEvent(makeEvent(level, message, agent));
    const mkCtx = (sid: AgentId, feedback?: string): AgentContext => ({
      input, memory: mem, llm: this.deps.llm, media: this.deps.media, video: this.deps.video, engines: this.deps.engines,
      iteration: state.iteration, feedback,
      log: (m, level = "info") => event(level, m, sid),
      report: (info) => { const s = stage(sid); if (info.summary) s.summary = info.summary; if (info.usedLLM) s.usedLLM = info.usedLLM; save(); },
    });

    const runNode = async (n: Node) => {
      const st = stage(n.id);
      if (st.status === "done" && mem.has(n.section)) return;
      if (n.gateBefore) await this.gate(id, n.gateBefore, state, mem, save, event, async (fb) => this.redo(["ux", "copy"], mkCtx, mem, state, fb));
      st.status = "running"; st.startedAt = new Date().toISOString(); st.error = undefined; save();
      event("info", `${n.agent.label} started`, n.id);
      try {
        const out = await n.agent.run(mkCtx(n.id));
        mem.set(n.section, out as never);
        st.status = "done"; st.finishedAt = new Date().toISOString(); save();
        event("info", `${n.agent.label} finished${st.summary ? `: ${st.summary}` : ""}`, n.id);
      } catch (e) {
        st.status = "failed"; st.error = (e as Error).message; st.finishedAt = new Date().toISOString(); save();
        event("error", `${n.agent.label} failed: ${(e as Error).message}`, n.id);
        throw e;
      }
      if (n.gateAfter) await this.gate(id, n.gateAfter, state, mem, save, event, async (fb) => this.redo([n.id], mkCtx, mem, state, fb));
    };

    try {
      // Reset stale "running" flags from a crashed process.
      for (const s of state.stages) if (s.status === "running" || s.status === "awaiting_approval") s.status = mem.has(PIPELINE.find((n) => n.id === s.id)?.section ?? "qa") ? "done" : "pending";
      save();

      const done = new Set<AgentId>(PIPELINE.filter((n) => stage(n.id).status === "done" && mem.has(n.section)).map((n) => n.id));
      while (done.size < PIPELINE.length) {
        const ready = PIPELINE.filter((n) => !done.has(n.id) && n.deps.every((d) => done.has(d)));
        if (!ready.length) throw new Error("Pipeline deadlock: unresolved dependencies");
        if (ready.length > 1) event("info", `Running in parallel: ${ready.map((n) => n.agent.label).join(" ∥ ")}`, "orchestrator");
        const results = await Promise.allSettled(ready.map(runNode));
        const failed = results.find((r) => r.status === "rejected") as PromiseRejectedResult | undefined;
        if (failed) throw failed.reason;
        ready.forEach((n) => done.add(n.id));
      }

      await this.qaLoop(id, state, mem, mkCtx, save, event, maxIterations);
      return mem.getState()!;
    } catch (e) {
      state.status = "failed"; save();
      event("error", `Project failed: ${(e as Error).message}`, "orchestrator");
      return state;
    }
  }

  /** BUILD → QA → CRITIQUE → FIX → QA again → FINAL APPROVAL (max N automatic iterations). */
  private async qaLoop(
    id: string, state: ProjectState, mem: ProjectMemoryStore, mkCtx: (s: AgentId, fb?: string) => AgentContext,
    save: () => void, event: (l: "info" | "warn" | "error", m: string, a?: AgentId | "orchestrator") => void, maxIterations: number,
  ) {
    const st = state.stages.find((s) => s.id === "qa")!;
    st.status = "running"; st.startedAt = new Date().toISOString(); save();
    let qa!: ProjectMemory["qa"];
    for (let i = 0; ; i++) {
      state.iteration = i; save();
      const ctx = mkCtx("qa");
      qa = await qaAgent.run(ctx);
      mem.set("qa", qa);
      fs.appendFileSync(path.join(mem.root, "qa-history.jsonl"), JSON.stringify({ iteration: i, score: qa.score, issues: qa.recommendedChanges }) + "\n");
      event("info", `QA iteration ${i}: score ${qa.score}, ${qa.criticalIssues.length} critical`, "qa");
      if (qaPasses(qa)) break;
      if (i >= maxIterations) { event("warn", `Reached ${maxIterations} automatic revisions with issues remaining; human approval required`, "orchestrator"); break; }
      const all = [...qa.criticalIssues, ...qa.designIssues, ...qa.uxIssues, ...qa.technicalIssues].filter((x) => x.severity !== "minor");
      const fixable = all.filter((x): x is QAIssue & { fix: NonNullable<QAIssue["fix"]> } => !!x.fix);
      if (!fixable.length) { event("warn", "Remaining issues need a human (no automatic fix available)", "orchestrator"); break; }

      state.iteration = i + 1; save();
      event("info", `Revision ${i + 1}: fixing ${fixable.length} issue(s)`, "orchestrator");
      const byAgent = new Map<string, { action: string; target?: string }[]>();
      for (const f of fixable) byAgent.set(f.fix.agent, [...(byAgent.get(f.fix.agent) ?? []), { action: f.fix.action, target: f.fix.target }]);
      for (const [agentId, actions] of byAgent) {
        const target = REVISABLE[agentId];
        if (!target?.agent.revise || agentId === "developer") continue;
        const out = await target.agent.revise(mkCtx(agentId as AgentId), actions);
        mem.set(target.section, out as never);
        event("info", `${target.agent.label} applied: ${actions.map((a) => a.action).join(", ")}`, agentId as AgentId);
      }
      // Whatever changed, the developer regenerates the site from memory.
      const dctx = mkCtx("developer");
      mem.set("code", await developerAgent.run(dctx));
    }

    const remaining = [...qa.criticalIssues, ...qa.designIssues, ...qa.uxIssues, ...qa.technicalIssues];
    const approved = qaPasses(qa);
    const copy = mem.require("copy");
    mem.set("final", {
      status: approved ? "approved" : "needs_human_approval",
      score: qa.score, iterations: state.iteration, outputDir: mem.siteDir,
      openItems: remaining.map((r) => `[${r.severity}] ${r.message}`),
      placeholdersToFill: copy.placeholders,
      summary: approved
        ? `Approved by QA after ${state.iteration} revision(s) with score ${qa.score}/100.`
        : `Stopped after ${state.iteration} revision(s); serious issues remain. Human approval required.`,
    });
    st.status = "done"; st.finishedAt = new Date().toISOString(); st.summary = `Score ${qa.score}/100 after ${state.iteration} revision(s)`; save();

    if (!approved) { state.status = "needs_human_approval"; save(); return; }
    if (state.mode === "supervised") await this.gate(id, "final", state, mem, save, event, async () => { /* final feedback recorded; QA loop already ran */ });
    state.status = "completed"; state.awaiting = undefined; save();
    event("info", "Project completed", "orchestrator");
  }

  /** Supervised checkpoint. Autonomous mode passes straight through. */
  private async gate(
    id: string, cp: Checkpoint, state: ProjectState, mem: ProjectMemoryStore, save: () => void,
    event: (l: "info" | "warn" | "error", m: string, a?: AgentId | "orchestrator") => void,
    onChanges: (feedback: string) => Promise<void>,
  ) {
    if (state.mode !== "supervised" || state.approvals.includes(cp)) return;
    for (;;) {
      state.status = "awaiting_approval"; state.awaiting = cp; save();
      event("info", `Waiting for your approval: ${cp}`, "orchestrator");
      const res = await new Promise<{ approved: boolean; feedback?: string }>((resolve) => this.gates.set(`${id}:${cp}`, resolve));
      this.gates.delete(`${id}:${cp}`);
      state.status = "running"; state.awaiting = undefined;
      if (res.approved) { state.approvals.push(cp); save(); event("info", `Checkpoint approved: ${cp}`, "orchestrator"); return; }
      state.feedback = { ...state.feedback, [cp]: res.feedback ?? "" }; save();
      event("info", `Changes requested at ${cp}: ${res.feedback ?? "(no text)"}`, "orchestrator");
      await onChanges(res.feedback ?? "");
    }
  }

  /** Re-run agents with human feedback (only LLM-backed agents can interpret free text). */
  private async redo(ids: AgentId[], mkCtx: (s: AgentId, fb?: string) => AgentContext, mem: ProjectMemoryStore, state: ProjectState, feedback: string) {
    for (const aid of ids) {
      const node = PIPELINE.find((n) => n.id === aid);
      if (!node) continue;
      const ctx = mkCtx(aid, feedback);
      if (!ctx.llm.available) mem.appendEvent(makeEvent("warn", "Feedback recorded, but no LLM is configured: knowledge-base agents cannot interpret free-text feedback. Configure ANTHROPIC_API_KEY or OPENAI_API_KEY.", aid));
      const out = await node.agent.run(ctx);
      mem.set(node.section, out as never);
    }
    void state;
  }
}
