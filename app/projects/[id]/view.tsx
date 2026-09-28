"use client";
import { useCallback, useEffect, useState } from "react";
import { summarize } from "./summary";

interface Stage { id: string; label: string; status: string; summary?: string; provider?: string; model?: string; error?: string; startedAt?: string; finishedAt?: string }
interface Providers {
  mode: "real" | "partial" | "demo";
  llm: { provider: string; model?: string; available: boolean; missing: string[] };
  media: { provider: string; available: boolean; missing: string[] };
  video: { provider: string; available: boolean; missing: string[] };
}
interface Data {
  state: { id: string; name: string; mode: string; status: string; verdict?: string; awaiting?: string; iteration: number; stages: Stage[]; providers?: Providers };
  sections: Record<string, any>; // eslint-disable-line @typescript-eslint/no-explicit-any
  events: { at: string; level: string; agent?: string; message: string }[];
  decisions: { agent: string; key: string; value: string; rationale: string }[];
  running: boolean;
  polling: boolean;
  screenshots: string[];
}

const STAGE_SECTIONS: Record<string, string[]> = {
  research: ["research"], strategy: ["strategy"], brand: ["brand"], creative: ["creative"], ux: ["ux"], copy: ["copy"],
  media: ["media-plan", "media"], "design-system": ["design-system"], video: ["video"], architect: ["architecture"], developer: ["code"], qa: ["qa", "final"],
};
const ICON: Record<string, string> = { done: "✓", running: "⟳", failed: "✗", awaiting_approval: "⏸", pending: "○", skipped: "–" };
const CHECKPOINT_LABEL: Record<string, string> = { strategy: "Strategy", creative: "Creative Direction", homepage: "Homepage Concept", final: "Final Website" };
const secs = (s: Stage) => (s.startedAt && s.finishedAt ? `${((Date.parse(s.finishedAt) - Date.parse(s.startedAt)) / 1000).toFixed(1)}s` : s.status === "running" ? "…" : "—");
const pretty = (s: string) => s.replace(/_/g, " ");

export default function ProjectView({ id }: { id: string }) {
  const [data, setData] = useState<Data | null>(null);
  const [selected, setSelected] = useState<string>("research");
  const [feedback, setFeedback] = useState("");
  const [missing, setMissing] = useState(false);
  const [videoErr, setVideoErr] = useState("");

  const load = useCallback(async () => {
    const r = await fetch(`/api/projects/${id}`);
    if (r.status === 404) { setMissing(true); return; }
    setData(await r.json());
  }, [id]);
  useEffect(() => { void load(); const t = setInterval(load, 1500); return () => clearInterval(t); }, [load]);

  async function approve(approved: boolean) {
    if (!data?.state.awaiting) return;
    await fetch(`/api/projects/${id}/approve`, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ checkpoint: data.state.awaiting, approved, feedback: feedback || undefined }) });
    setFeedback(""); void load();
  }
  async function videoAction(action: "generate" | "skip") {
    setVideoErr("");
    const r = await fetch(`/api/projects/${id}/video`, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ action }) });
    if (!r.ok) setVideoErr((await r.json()).error ?? "Request failed");
    void load();
  }

  if (missing) return <main className="wrap"><p>Project not found. <a href="/">Back</a></p></main>;
  if (!data) return <main className="wrap"><p className="sub">Loading…</p></main>;
  const { state, sections } = data;
  const p = state.providers;
  const sel = STAGE_SECTIONS[selected] ?? [];
  const final = sections.final;
  const video = sections.video;
  const media = sections.media;
  const stalled = !data.running && !data.polling && (state.status === "running" || state.status === "awaiting_approval");
  const selStage = state.stages.find((s) => s.id === selected);
  const failedStage = state.stages.find((s) => s.status === "failed");
  const llmStage = state.stages.find((s) => s.model);

  return (
    <main className="wrap wide">
      <a className="back" href="/">← New project</a>
      <header className="top">
        <p className="kicker">PROJECT · {state.mode.toUpperCase()}{p ? ` · ${p.mode.toUpperCase()} PROVIDERS` : ""}</p>
        <h1>{state.name}</h1>
        <p className="sub"><span className={`pill ${state.status}`}>{pretty(state.status)}</span> {state.verdict && <span className={`pill v-${state.verdict}`}>{pretty(state.verdict)}</span>} {state.iteration > 0 && `· revision ${state.iteration} of 3`}</p>
      </header>

      {p && (
        <section className="panel facts">
          <div><small>Provider</small><strong>{p.llm.available ? p.llm.provider : "Knowledge base (demo)"}</strong></div>
          <div><small>Model</small><strong>{llmStage?.model ?? p.llm.model ?? "—"}</strong></div>
          <div><small>Media</small><strong>{p.media.available ? "Pexels" : "Placeholders (demo)"}</strong></div>
          <div><small>Video</small><strong>{video?.phase === "completed" ? "Higgsfield (generated)" : video?.phase === "generating" || video?.phase === "downloading" || video?.phase === "reviewing" ? "Higgsfield (generating…)" : p.video.available ? "Higgsfield / Not generated" : "Not generated"}</strong></div>
        </section>
      )}

      {p && p.mode !== "real" && (
        <section className="panel notice">
          <strong>{p.mode === "demo" ? "DEMO MODE: no real providers are configured." : "PARTIAL MODE: a required provider is missing."}</strong>
          <ul>
            {!p.llm.available && <li>No LLM: the agents used the built-in knowledge base, not a language model. Set <code>{p.llm.missing.join("</code> and <code>") || "ANTHROPIC_API_KEY"}</code> in <code>.env.local</code>.</li>}
            {!p.media.available && <li>No Pexels: images are labelled placeholders. Set <code>PEXELS_API_KEY</code>.</li>}
          </ul>
        </section>
      )}

      {failedStage && (
        <section className="panel failure">
          <strong>{failedStage.label} failed</strong>
          <pre>{failedStage.error}</pre>
        </section>
      )}
      {(media?.errors?.length ?? 0) > 0 && (
        <section className="panel failure">
          <strong>Pexels / media errors ({media.errors.length})</strong>
          <ul>{media.errors.map((e: { slot: string; message: string }) => <li key={e.slot}><code>{e.slot}</code> {e.message}</li>)}</ul>
        </section>
      )}

      {video?.phase === "awaiting_approval" && (
        <section className="panel approve">
          <h2>Video generation</h2>
          <p><strong>Video generation will use external generation credits.</strong></p>
          <p className="sub">The website is already built and works without it. If you generate, the job runs in the background; the finished clip is downloaded, checked (duration, resolution, format, size) and only then replaces the {video.fallback === "stock-video" ? "stock clip" : "still image"}.</p>
          <p className="sub">Prompt: {video.prompt}</p>
          <div className="row"><button className="primary" onClick={() => videoAction("generate")}>Generate</button><button onClick={() => videoAction("skip")}>Skip video</button></div>
          {videoErr && <p className="err">{videoErr}</p>}
        </section>
      )}
      {video && !["awaiting_approval", "not_needed"].includes(video.phase) && (
        <section className={`panel ${video.phase === "failed" ? "failure" : ""}`}>
          <h2>Video · {pretty(video.phase)}</h2>
          <p className="sub">{video.phaseDetail}</p>
          {video.job && <p className="sub">Job <code>{video.job.id}</code> · {video.job.status}</p>}
        </section>
      )}

      {state.status === "awaiting_approval" && state.awaiting && (
        <section className="panel approve">
          <h2>Approval needed: {CHECKPOINT_LABEL[state.awaiting]}</h2>
          <p className="sub">Review the output in the stage panel, then approve or request changes. Free-text feedback is interpreted only when an LLM is configured.</p>
          <textarea value={feedback} onChange={(e) => setFeedback(e.target.value)} placeholder="Optional: what should change?" rows={3} />
          <div className="row"><button className="primary" onClick={() => approve(true)}>Approve</button><button onClick={() => approve(false)}>Request changes</button></div>
        </section>
      )}
      {stalled && <section className="panel"><p>This run is not active (server restarted?). <button onClick={() => fetch(`/api/projects/${id}/resume`, { method: "POST" }).then(load)}>Resume</button></p></section>}

      <section className="panel">
        <h2>Agents</h2>
        <div className="tablewrap">
          <table className="agents">
            <thead><tr><th>Agent</th><th>Status</th><th>Provider</th><th>Duration</th><th>Output summary</th></tr></thead>
            <tbody>
              {state.stages.map((s) => (
                <tr key={s.id} className={`${selected === s.id ? "sel" : ""} ${s.status}`} onClick={() => setSelected(s.id)} tabIndex={0} onKeyDown={(e) => e.key === "Enter" && setSelected(s.id)}>
                  <td><strong>{s.label}</strong></td>
                  <td><span className={`st ${s.status}`}>{ICON[s.status] ?? "○"} {pretty(s.status)}</span></td>
                  <td>{s.provider ?? "—"}{s.model && <small className="model">{s.model}</small>}</td>
                  <td>{secs(s)}</td>
                  <td className="sumcell">{s.error ? <span className="err">ERROR: {s.error}</span> : s.summary ?? ""}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      <section className="panel out">
        <h2>{selStage?.label} output</h2>
        {summarize(selected, sections).length > 0 && <ul className="produced">{summarize(selected, sections).map((l, i) => <li key={i} className={/^(FAILED|BLOCKER|Video QA — FAIL|Failed)/.test(l) ? "bad" : ""}>{l}</li>)}</ul>}
        {selStage?.error && <p className="err">{selStage.error}</p>}
        {selected === "media" && media?.assets && (
          <div className="tablewrap"><table className="agents">
            <thead><tr><th>Slot</th><th>Source</th><th>Status</th><th>File</th><th>Credit</th></tr></thead>
            <tbody>{media.assets.map((a: any) => ( // eslint-disable-line @typescript-eslint/no-explicit-any
              <tr key={a.slot}><td>{a.slot}</td><td>{a.source}</td><td><span className={`st ${a.status === "approved" ? "done" : a.status === "failed" ? "failed" : "pending"}`}>{a.status}</span></td>
                <td>{a.localPath ?? "—"}{a.bytes ? <small className="model">{(a.bytes / 1024).toFixed(0)} KB</small> : null}</td>
                <td>{a.credit ? <a href={a.sourceUrl ?? a.credit.url}>{a.credit.name}</a> : a.error ? <span className="err">{a.error}</span> : "—"}</td></tr>
            ))}</tbody>
          </table></div>
        )}
        {sel.map((k) => sections[k] !== undefined ? (
          <details key={k}><summary>Raw {k} JSON</summary><pre>{JSON.stringify(sections[k], null, 2)}</pre></details>
        ) : <p key={k} className="sub">{k}: not produced yet.</p>)}
        {selected === "qa" && data.screenshots.length > 0 && (
          <div className="shots">{data.screenshots.filter((s) => s.endsWith("hero.png")).map((s) => <figure key={s}><img src={`/api/projects/${id}/qa/${s}`} alt={s} /><figcaption>{s}</figcaption></figure>)}</div>
        )}
      </section>

      {final && (
        <section className="panel">
          <h2>Final</h2>
          <p><strong>{pretty(final.verdict ?? final.status)}</strong>: {final.summary}</p>
          <p className="sub">Assets: {final.assetCounts?.real ?? 0} real · {final.assetCounts?.placeholders ?? 0} placeholders · {final.assetCounts?.failed ?? 0} failed</p>
          <p className="sub">Site directory: <code>{final.outputDir}</code></p>
          <p className="sub">Run: <code>cd {final.outputDir} && npm install && npm run dev</code></p>
          {final.openItems.length > 0 && <><h3>Open items</h3><ul>{final.openItems.map((o: string) => <li key={o}>{o}</li>)}</ul></>}
          <h3>Placeholders to fill before launch</h3>
          <ul>{final.placeholdersToFill.map((x: { field: string; note: string }) => <li key={x.field}><code>{x.field}</code> {x.note}</li>)}</ul>
        </section>
      )}

      <div className="grid">
        <section className="panel"><h2>Decisions</h2><ul className="log">{data.decisions.map((d, i) => <li key={i}><strong>{d.agent}</strong> {d.key}: {d.value}</li>)}</ul></section>
        <section className="panel"><h2>Activity</h2><ul className="log">{[...data.events].reverse().map((e, i) => <li key={i} className={e.level}><small>{e.agent}</small> {e.message}</li>)}</ul></section>
      </div>
    </main>
  );
}
