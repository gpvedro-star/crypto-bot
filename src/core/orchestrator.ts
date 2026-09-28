import fs from "node:fs";
import path from "node:path";
import { architectAgent } from "../agents/architect";
import { brandAgent } from "../agents/brand";
import { copyAgent } from "../agents/copy";
import { creativeAgent } from "../agents/creative";
import { designSystemAgent } from "../agents/design-system";
import { developerAgent } from "../agents/developer";
import { mediaAgent } from "../agents/media";
import { qaAgent } from "../agents/qa";
import { researchAgent } from "../agents/research";
import { strategyAgent } from "../agents/strategy";
import { uxAgent } from "../agents/ux";
import { inspectVideo } from "../agents/video-qa";
import { videoAgent } from "../agents/video";
import type { LLMProvider } from "../services/llm/types";
import type { MediaProvider } from "../services/pexels/types";
import type { VideoProvider } from "../services/higgsfield/types";
import type { EngineRegistry } from "../services/website-engines";
import { downloadFile } from "../services/media/download";
import type { Agent, AgentContext } from "./agent";
import { env } from "./config";
import { makeEvent } from "./events";
import { ProjectMemoryStore, slugify } from "./memory";
import { describeProviders, preflight, requireReal } from "./preflight";
import type {
  AgentId, Asset, BusinessInput, Checkpoint, MemorySection, ProjectState, QAIssue, QAReport, RunMode, StageState, VideoPlan,
} from "./types";

export interface OrchestratorDeps {
  llm: LLMProvider; media: MediaProvider; video: VideoProvider; engines: EngineRegistry; baseDir?: string;
  /** Video job polling cadence / limit (env HIGGSFIELD_POLL_INTERVAL_MS, HIGGSFIELD_TIMEOUT_MS by default). */
  videoPollMs?: number; videoTimeoutMs?: number;
}
export interface OrchestratorOptions { mode?: RunMode; maxIterations?: number; requireReal?: boolean }

interface Node {
  id: AgentId;
  section: MemorySection;
  agent: Agent<unknown>;
  deps: AgentId[];
  gateBefore?: Checkpoint;
  gateAfter?: Checkpoint;
}

/**
 * The pipeline as a dependency graph. Anything whose dependencies are met runs in parallel.
 *   research → strategy → brand → creative → ux → (copy ∥ media ∥ design-system) → video ∥ architect → developer → QA loop
 * Media runs after UX because the story/gallery slots come from the UX plan; Video (planning only) runs after Media.
 */
export const PIPELINE: Node[] = [
  { id: "research", section: "research", agent: researchAgent as Agent<unknown>, deps: [] },
  { id: "strategy", section: "strategy", agent: strategyAgent as Agent<unknown>, deps: ["research"], gateAfter: "strategy" },
  { id: "brand", section: "brand", agent: brandAgent as Agent<unknown>, deps: ["strategy"] },
  { id: "creative", section: "creative", agent: creativeAgent as Agent<unknown>, deps: ["strategy", "brand"], gateAfter: "creative" },
  { id: "ux", section: "ux", agent: uxAgent as Agent<unknown>, deps: ["creative"] },
  { id: "copy", section: "copy", agent: copyAgent as Agent<unknown>, deps: ["ux"] },
  { id: "media", section: "media", agent: mediaAgent as Agent<unknown>, deps: ["ux"] },
  { id: "design-system", section: "design-system", agent: designSystemAgent as Agent<unknown>, deps: ["ux"] },
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

type Event = (l: "info" | "warn" | "error", m: string, a?: AgentId | "orchestrator") => void;
interface Runtime {
  state: ProjectState; mem: ProjectMemoryStore; save: () => void; event: Event;
  mkCtx: (s: AgentId, fb?: string) => AgentContext;
}

const sleepMs = (ms: number) => new Promise((r) => setTimeout(r, ms));

export class Orchestrator {
  private gates = new Map<string, (r: { approved: boolean; feedback?: string }) => void>();
  private running = new Map<string, Promise<ProjectState>>();
  private polls = new Map<string, Promise<void>>();
  private rebuilds = new Map<string, Promise<void>>();

  constructor(private deps: OrchestratorDeps) {}

  private baseDir() { return this.deps.baseDir ?? path.resolve(env("STUDIO_PROJECTS_DIR") ?? "projects"); }
  store(id: string) { return new ProjectMemoryStore(id, this.deps.baseDir); }
  isRunning(id: string) { return this.running.has(id); }
  providers() { return describeProviders(this.deps); }

  /** Create a project and persist the input. */
  create(input: BusinessInput, opts: OrchestratorOptions = {}): ProjectState {
    const base = slugify(`${input.location.split(",")[0]} ${input.business}`);
    let id = base, n = 1;
    while (fs.existsSync(path.join(this.baseDir(), id))) id = `${base}-${++n}`;
    const mem = new ProjectMemoryStore(id, this.deps.baseDir);
    mem.set("business", input);
    const state: ProjectState = {
      id, name: `${input.location.split(",")[0]} ${input.business}`, mode: opts.mode ?? "autonomous", status: "created",
      createdAt: new Date().toISOString(), updatedAt: new Date().toISOString(), iteration: 0, approvals: [],
      providers: this.providers(),
      stages: [...PIPELINE.map((n): StageState => ({ id: n.id, label: n.agent.label, status: "pending" })), { id: "qa", label: LABELS.qa, status: "pending" }],
    };
    mem.setState(state);
    return state;
  }

  /** Start (or resume) a project. Concurrent calls for the same project share one run. */
  run(id: string, opts: OrchestratorOptions = {}): Promise<ProjectState> {
    const existing = this.running.get(id);
    if (existing) return existing;
    const p = this.execute(id, opts).finally(() => this.running.delete(id));
    this.running.set(id, p);
    return p;
  }

  /** Resolve a supervised checkpoint. */
  approve(id: string, checkpoint: Checkpoint, approved = true, feedback?: string) {
    const gate = this.gates.get(`${id}:${checkpoint}`);
    if (!gate) throw new Error(`Project ${id} is not waiting at checkpoint "${checkpoint}"`);
    gate({ approved, feedback });
  }

  // ───────────────────────── runtime plumbing ─────────────────────────

  private runtime(id: string): Runtime {
    const mem = this.store(id);
    const state = mem.getState();
    if (!state) throw new Error(`Unknown project ${id}`);
    const input = mem.require("business");
    const save = () => mem.setState(state);
    const stage = (sid: AgentId) => state.stages.find((s) => s.id === sid)!;
    const event: Event = (level, message, agent) => mem.appendEvent(makeEvent(level, message, agent));
    const mkCtx = (sid: AgentId, feedback?: string): AgentContext => ({
      input, memory: mem, llm: this.deps.llm, media: this.deps.media, video: this.deps.video, engines: this.deps.engines,
      iteration: state.iteration, feedback,
      log: (m, level = "info") => event(level, m, sid),
      report: (info) => {
        const s = stage(sid);
        if (info.summary) s.summary = info.summary;
        if (info.provider) s.provider = info.provider;
        if (info.model) s.model = info.model;
        save();
      },
    });
    return { state, mem, save, event, mkCtx };
  }

  // ───────────────────────── the pipeline ─────────────────────────

  private async execute(id: string, opts: OrchestratorOptions): Promise<ProjectState> {
    const rt = this.runtime(id);
    const { state, mem, save, event, mkCtx } = rt;
    const maxIterations = opts.maxIterations ?? 3;
    const stage = (sid: AgentId) => state.stages.find((s) => s.id === sid)!;

    state.providers = this.providers();
    const pf = preflight(this.deps);
    if ((opts.requireReal ?? requireReal()) && !pf.ok) {
      state.status = "failed"; save();
      event("error", `Real-provider mode is required but not ready: ${pf.problems.join(" | ")}`, "orchestrator");
      return state;
    }
    state.status = "running"; save();
    event("info", `Providers: LLM=${state.providers.llm.provider}${state.providers.llm.model ? ` (${state.providers.llm.model})` : ""}, media=${state.providers.media.provider}, video=${state.providers.video.provider}; mode=${state.providers.mode}`, "orchestrator");

    const runNode = async (n: Node) => {
      const st = stage(n.id);
      if (st.status === "done" && mem.has(n.section)) return;
      if (n.gateBefore) await this.gate(id, n.gateBefore, rt, async (fb) => this.redo(["ux", "copy"], rt, fb));
      st.status = "running"; st.startedAt = new Date().toISOString(); st.finishedAt = undefined; st.error = undefined; st.provider = undefined; st.model = undefined; save();
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
      if (n.gateAfter) await this.gate(id, n.gateAfter, rt, async (fb) => this.redo([n.id], rt, fb));
    };

    try {
      // Reset stale flags from a crashed process.
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

      // The website is buildable now; a paid video job, if approved, continues in the background.
      await this.qaLoop(id, rt, maxIterations);
      this.resumeVideo(id);
      return mem.getState()!;
    } catch (e) {
      state.status = "failed"; save();
      event("error", `Project failed: ${(e as Error).message}`, "orchestrator");
      return state;
    }
  }

  /** BUILD → QA → CRITIQUE → FIX → QA again → verdict (max N automatic revisions). */
  private async qaLoop(id: string, rt: Runtime, maxIterations: number) {
    const { state, mem, save, event, mkCtx } = rt;
    const st = state.stages.find((s) => s.id === "qa")!;
    st.status = "running"; st.startedAt = new Date().toISOString(); save();
    let qa!: QAReport;
    for (let i = 0; ; i++) {
      state.iteration = i; save();
      qa = await qaAgent.run(mkCtx("qa"));
      mem.set("qa", qa);
      fs.appendFileSync(path.join(mem.root, "qa-history.jsonl"), JSON.stringify({ iteration: i, verdict: qa.verdict, score: qa.score, issues: qa.recommendedChanges }) + "\n");
      event("info", `QA iteration ${i}: ${qa.verdict}, score ${qa.score}, ${qa.blockers.length} blockers, ${qa.warnings.length} warnings`, "qa");
      const all = [...qa.criticalIssues, ...qa.designIssues, ...qa.uxIssues, ...qa.technicalIssues];
      const serious = all.filter((x) => x.severity !== "minor");
      if (!serious.length) break; // PASS or PASS_WITH_WARNINGS with only minor warnings
      if (i >= maxIterations) { event("warn", `Reached ${maxIterations} automatic revisions with serious issues remaining; human approval required`, "orchestrator"); break; }
      const fixable = serious.filter((x): x is QAIssue & { fix: NonNullable<QAIssue["fix"]> } => !!x.fix);
      if (!fixable.length) { event("warn", "Remaining serious issues need a human (no automatic fix available)", "orchestrator"); break; }

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
      mem.set("code", await developerAgent.run(mkCtx("developer")));
    }

    const remaining = [...qa.criticalIssues, ...qa.designIssues, ...qa.uxIssues, ...qa.technicalIssues];
    const seriousLeft = remaining.filter((r) => r.severity !== "minor");
    const copy = mem.require("copy");
    const media = mem.require("media");
    const assetCounts = {
      real: media.assets.filter((a) => a.status === "approved" && a.source !== "placeholder").length,
      placeholders: media.assets.filter((a) => a.source === "placeholder").length,
      failed: media.assets.filter((a) => a.status === "failed").length,
    };
    const blocked = qa.verdict === "BLOCKED";
    const needsHuman = blocked || seriousLeft.length > 0;
    const status = blocked ? "blocked" : needsHuman ? "needs_human_approval" : qa.verdict === "PASS" ? "approved" : "approved_with_warnings";
    mem.set("final", {
      verdict: qa.verdict, status, assetCounts,
      score: qa.score, iterations: state.iteration, outputDir: mem.siteDir,
      openItems: remaining.map((r) => `[${r.severity}] ${r.message}`),
      placeholdersToFill: copy.placeholders,
      summary: blocked ? `BLOCKED: ${qa.blockers[0]}` : needsHuman ? `Stopped after ${state.iteration} revision(s); ${seriousLeft.length} serious issue(s) need a human.` : `${qa.verdict} after ${state.iteration} revision(s) with score ${qa.score}/100.`,
    });
    st.status = "done"; st.finishedAt = new Date().toISOString(); st.summary = `${qa.verdict} · score ${qa.score}/100 after ${state.iteration} revision(s)`; state.verdict = qa.verdict; save();

    if (blocked) { state.status = "blocked"; save(); return; }
    if (needsHuman) { state.status = "needs_human_approval"; save(); return; }
    if (state.mode === "supervised") await this.gate(id, "final", rt, async () => { /* final feedback recorded; QA loop already ran */ });
    state.status = qa.verdict === "PASS" ? "completed" : "completed_with_warnings"; state.awaiting = undefined; save();
    event("info", `Project ${state.status.replace(/_/g, " ")}`, "orchestrator");
  }

  /** Supervised checkpoint. Autonomous mode passes straight through. */
  private async gate(id: string, cp: Checkpoint, rt: Runtime, onChanges: (feedback: string) => Promise<void>) {
    const { state, save, event } = rt;
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

  /** Re-run agents with human feedback (only an LLM can interpret free text). */
  private async redo(ids: AgentId[], rt: Runtime, feedback: string) {
    for (const aid of ids) {
      const node = PIPELINE.find((n) => n.id === aid);
      if (!node) continue;
      const ctx = rt.mkCtx(aid, feedback);
      if (!ctx.llm.available) rt.event("warn", "Feedback recorded, but no LLM is configured: knowledge-base agents cannot interpret free-text feedback. Set ANTHROPIC_API_KEY.", aid);
      const out = await node.agent.run(ctx);
      rt.mem.set(node.section, out as never);
    }
  }

  // ───────────────────────── video lifecycle (asynchronous, cost-gated) ─────────────────────────

  private setVideo(id: string, patch: Partial<VideoPlan>): VideoPlan {
    const mem = this.store(id);
    const next = { ...mem.require("video"), ...patch };
    mem.set("video", next);
    return next;
  }

  /**
   * The human answered the cost gate. `generate` is the ONLY path that spends Higgsfield credits.
   * It creates the job and returns immediately; polling, download, Video QA and the site rebuild run in the background.
   */
  async videoAction(id: string, action: "generate" | "skip"): Promise<VideoPlan> {
    const mem = this.store(id);
    const plan = mem.require("video");
    if (plan.phase !== "awaiting_approval") throw new Error(`Video is not awaiting approval (current phase: ${plan.phase})`);
    const event: Event = (l, m, a) => mem.appendEvent(makeEvent(l, m, a));
    if (action === "skip") {
      event("info", "Video generation skipped by the user; the site keeps the fallback", "video");
      const next = this.setVideo(id, { phase: "skipped", phaseDetail: `Skipped by you. The site uses the ${plan.fallback === "stock-video" ? "stock clip" : "still image"}.`, finishedAt: new Date().toISOString() });
      this.rebuildInBackground(id);
      return next;
    }
    if (!this.deps.video.available) throw new Error(`Higgsfield is not configured. Missing: ${this.deps.video.missing.join(", ")}`);
    event("info", "Video generation approved by the user; creating the Higgsfield job (uses generation credits)", "video");
    try {
      const job = await this.deps.video.generateVideo(plan.prompt, { durationSeconds: plan.durationSeconds, aspect: plan.aspect });
      const next = this.setVideo(id, { phase: "generating", phaseDetail: `Higgsfield job ${job.id} created; generating in the background. The website is not blocked.`, job: { ...job, prompt: plan.prompt }, requestedAt: new Date().toISOString() });
      event("info", `Higgsfield job created: ${job.id}`, "video");
      this.startPolling(id);
      return next;
    } catch (e) {
      const message = (e as Error).message;
      event("error", `Higgsfield job could not be created: ${message}`, "video");
      const next = this.setVideo(id, { phase: "failed", phaseDetail: `Could not create the generation job: ${message}`, finishedAt: new Date().toISOString() });
      this.rebuildInBackground(id);
      return next;
    }
  }

  /** Restart background work for a project whose process was restarted mid-video. */
  resumeVideo(id: string) {
    const mem = this.store(id);
    const plan = mem.get("video");
    if (!plan) return;
    if (plan.phase === "generating") this.startPolling(id);
    else if ((plan.phase === "downloading" || plan.phase === "reviewing") && plan.job?.url) void this.completeVideo(id, plan.job.url);
  }

  resumeAllVideos() {
    try {
      for (const name of fs.readdirSync(this.baseDir())) if (fs.existsSync(path.join(this.baseDir(), name, "state.json"))) this.resumeVideo(name);
    } catch { /* no projects yet */ }
  }

  isPolling(id: string) { return this.polls.has(id); }
  /** Resolves when background video work for the project has finished (used by tests and shutdown). */
  async idle(id: string) { await this.polls.get(id); await this.rebuilds.get(id); }

  private startPolling(id: string) {
    if (this.polls.has(id)) return;
    const p = this.pollLoop(id)
      .catch((e) => this.failVideo(id, `Unexpected error while polling: ${(e as Error).message}`))
      .finally(() => this.polls.delete(id));
    this.polls.set(id, p);
  }

  private async pollLoop(id: string) {
    const mem = this.store(id);
    const interval = this.deps.videoPollMs ?? Number(env("HIGGSFIELD_POLL_INTERVAL_MS") ?? 10000);
    const timeout = this.deps.videoTimeoutMs ?? Number(env("HIGGSFIELD_TIMEOUT_MS") ?? 15 * 60 * 1000);
    let transient = 0;
    for (;;) {
      const plan = mem.require("video");
      if (plan.phase !== "generating" || !plan.job) return;
      const started = Date.parse(plan.requestedAt ?? new Date().toISOString());
      if (Date.now() - started > timeout) {
        try { await this.deps.video.cancel?.(plan.job); } catch { /* cannot cancel once processing has started */ }
        await this.failVideo(id, `Timed out after ${Math.round(timeout / 60000)} min waiting for Higgsfield job ${plan.job.id} (last status: ${plan.job.status}). The job may still finish on Higgsfield's side; the site uses the fallback.`);
        return;
      }
      try {
        const job = await this.deps.video.getGenerationStatus(plan.job);
        transient = 0;
        this.setVideo(id, { job: { ...plan.job, ...job, prompt: plan.job.prompt } });
        if (job.status === "completed") { await this.completeVideo(id, job.url!); return; }
        if (job.status === "failed" || job.status === "nsfw" || job.status === "cancelled") {
          await this.failVideo(id, `Higgsfield job ${plan.job.id} ${job.status}${job.error ? `: ${job.error}` : ""}`);
          return;
        }
      } catch (e) {
        if (++transient >= 5) { await this.failVideo(id, `Status polling failed ${transient} times in a row. Last error: ${(e as Error).message}`); return; }
        mem.appendEvent(makeEvent("warn", `Video status check failed (${transient}/5): ${(e as Error).message}`, "video"));
      }
      await sleepMs(interval);
    }
  }

  /** download finished video → Video QA → replace the fallback → rebuild the site. */
  private async completeVideo(id: string, url: string) {
    const mem = this.store(id);
    const event: Event = (l, m, a) => mem.appendEvent(makeEvent(l, m, a));
    const dir = path.join(mem.siteDir, "public", "media");
    const file = path.join(dir, "hero-generated.mp4");
    try {
      this.setVideo(id, { phase: "downloading", phaseDetail: "Job finished; downloading the video." });
      const maxBytes = Number(env("VIDEO_MAX_MB") ?? 25) * 1048576;
      await downloadFile(url, file, { maxBytes, timeoutMs: 180000, expectTypes: ["video/", "application/octet-stream"] });
      this.setVideo(id, { phase: "reviewing", phaseDetail: "Downloaded; running Video QA." });
      const qa = await inspectVideo(file);
      if (!qa.passed) {
        fs.rmSync(file, { force: true });
        this.setVideo(id, { qa });
        await this.failVideo(id, `Video QA failed: ${qa.checks.filter((c) => !c.passed).map((c) => `${c.name} (${c.detail})`).join("; ")}`);
        return;
      }
      const plan = mem.require("video");
      const asset: Asset = {
        id: `higgsfield-${plan.job?.id}`, type: "video", source: "higgsfield", url: "/media/hero-generated.mp4", localPath: "public/media/hero-generated.mp4",
        posterUrl: undefined, width: qa.info.width, height: qa.info.height, bytes: qa.info.bytes, usage: "hero-video", slot: "hero-video-generated",
        description: plan.concept, alt: plan.concept, prompt: plan.prompt, requestId: plan.job?.id, status: "approved",
      };
      const media = mem.require("media");
      mem.set("media", { ...media, assets: [...media.assets.filter((a) => a.slot !== "hero-video-generated"), asset] });
      this.setVideo(id, { phase: "completed", phaseDetail: `Generated clip downloaded and verified (${qa.info.durationSeconds}s, ${qa.info.width}x${qa.info.height}, ${((qa.info.bytes ?? 0) / 1048576).toFixed(1)} MB). It replaces the fallback in the site.`, asset, qa, finishedAt: new Date().toISOString() });
      event("info", "Generated video passed Video QA and replaces the fallback; rebuilding the site", "video");
      await this.rebuildSite(id);
    } catch (e) {
      fs.rmSync(file, { force: true });
      await this.failVideo(id, `Could not download the generated video: ${(e as Error).message}`);
    }
  }

  private async failVideo(id: string, message: string) {
    const mem = this.store(id);
    mem.appendEvent(makeEvent("error", `Video generation failed: ${message}`, "video"));
    this.setVideo(id, { phase: "failed", phaseDetail: message, finishedAt: new Date().toISOString() });
    await this.rebuildSite(id); // the website still completes with the fallback, and QA records the failure
  }

  private rebuildInBackground(id: string) { void this.rebuildSite(id).catch(() => {}); }

  /** Regenerate the site from memory and re-run QA (serialised per project; waits for a running pipeline first). */
  private rebuildSite(id: string): Promise<void> {
    const prev = this.rebuilds.get(id) ?? Promise.resolve();
    const next = prev.catch(() => {}).then(async () => {
      await this.running.get(id)?.catch(() => {});
      const rt = this.runtime(id);
      if (!rt.mem.has("code")) return; // pipeline has not produced a site yet
      rt.mem.set("code", await developerAgent.run(rt.mkCtx("developer")));
      await this.qaLoop(id, rt, 3);
    });
    this.rebuilds.set(id, next);
    return next;
  }
}
