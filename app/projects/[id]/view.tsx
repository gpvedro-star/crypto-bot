"use client";
import { useCallback, useEffect, useState } from "react";
import { summarize } from "./summary";

interface Stage { id: string; label: string; status: string; summary?: string; usedLLM?: string; error?: string; startedAt?: string; finishedAt?: string }
interface Status { llm: { available: boolean }; media: { available: boolean }; video: { available: boolean } }
interface Data {
  state: { id: string; name: string; mode: string; status: string; awaiting?: string; iteration: number; stages: Stage[] };
  sections: Record<string, unknown>;
  events: { at: string; level: string; agent?: string; message: string }[];
  decisions: { agent: string; key: string; value: string; rationale: string }[];
  running: boolean;
  screenshots: string[];
}

const STAGE_SECTIONS: Record<string, string[]> = {
  research: ["research"], strategy: ["strategy"], brand: ["brand"], creative: ["creative"], ux: ["ux"], copy: ["copy"],
  media: ["media-plan", "media"], "design-system": ["design-system"], video: ["video"], architect: ["architecture"], developer: ["code"], qa: ["qa", "final"],
};
const ICON: Record<string, string> = { done: "✓", running: "⟳", failed: "✗", awaiting_approval: "⏸", pending: "○", skipped: "–" };
const CHECKPOINT_LABEL: Record<string, string> = { strategy: "Strategy", creative: "Creative Direction", homepage: "Homepage Concept", final: "Final Website" };

const secs = (s: Stage) => (s.startedAt && s.finishedAt ? `${((Date.parse(s.finishedAt) - Date.parse(s.startedAt)) / 1000).toFixed(1)}s` : "");

export default function ProjectView({ id }: { id: string }) {
  const [data, setData] = useState<Data | null>(null);
  const [selected, setSelected] = useState<string>("research");
  const [feedback, setFeedback] = useState("");
  const [missing, setMissing] = useState(false);
  const [providers, setProviders] = useState<Status | null>(null);

  const load = useCallback(async () => {
    const r = await fetch(`/api/projects/${id}`);
    if (r.status === 404) { setMissing(true); return; }
    setData(await r.json());
  }, [id]);

  useEffect(() => { fetch("/api/status").then((r) => r.json()).then(setProviders).catch(() => {}); }, []);
  useEffect(() => { void load(); const t = setInterval(load, 1500); return () => clearInterval(t); }, [load]);

  async function approve(approved: boolean) {
    if (!data?.state.awaiting) return;
    await fetch(`/api/projects/${id}/approve`, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ checkpoint: data.state.awaiting, approved, feedback: feedback || undefined }) });
    setFeedback(""); void load();
  }

  if (missing) return <main className="wrap"><p>Project not found. <a href="/">Back</a></p></main>;
  if (!data) return <main className="wrap"><p className="sub">Loading…</p></main>;
  const { state } = data;
  const sel = STAGE_SECTIONS[selected] ?? [];
  const final = data.sections.final as { status: string; summary: string; outputDir: string; openItems: string[]; placeholdersToFill: { field: string; note: string }[] } | undefined;
  const stalled = !data.running && (state.status === "running" || state.status === "awaiting_approval");

  return (
    <main className="wrap wide">
      <a className="back" href="/">← New project</a>
      <header className="top">
        <p className="kicker">PROJECT · {state.mode.toUpperCase()}</p>
        <h1>{state.name}</h1>
        <p className="sub"><span className={`pill ${state.status}`}>{state.status.replace(/_/g, " ")}</span> {state.iteration > 0 && `· revision ${state.iteration} of 3`}</p>
      </header>

      {providers && (!providers.llm.available || !providers.media.available || !providers.video.available) && (
        <section className="panel notice">
          <strong>Running in limited mode.</strong>
          <ul>
            {!providers.llm.available && <li>No LLM key: Research, Strategy, Creative and Copy come from the built-in industry knowledge base, not a language model. Set <code>ANTHROPIC_API_KEY</code> in <code>.env.local</code>.</li>}
            {!providers.media.available && <li>No Pexels key: images are labelled placeholders. Set <code>PEXELS_API_KEY</code>.</li>}
            {!providers.video.available && <li>Video generation is off. Set <code>HIGGSFIELD_API_KEY</code> and <code>HIGGSFIELD_MODEL_PATH</code>.</li>}
          </ul>
        </section>
      )}

      {state.status === "awaiting_approval" && state.awaiting && (
        <section className="panel approve">
          <h2>Approval needed: {CHECKPOINT_LABEL[state.awaiting]}</h2>
          <p className="sub">Review the output in the stage panel, then approve or request changes. Free-text feedback is interpreted only when an LLM provider is configured.</p>
          <textarea value={feedback} onChange={(e) => setFeedback(e.target.value)} placeholder="Optional: what should change?" rows={3} />
          <div className="row"><button className="primary" onClick={() => approve(true)}>Approve</button><button onClick={() => approve(false)}>Request changes</button></div>
        </section>
      )}
      {stalled && <section className="panel"><p>This run is not active (server restarted?). <button onClick={() => fetch(`/api/projects/${id}/resume`, { method: "POST" }).then(load)}>Resume</button></p></section>}

      <div className="grid">
        <section className="panel">
          <h2>Agents</h2>
          <ul className="stages">
            {state.stages.map((s) => (
              <li key={s.id}>
                <button className={`stage ${s.status} ${selected === s.id ? "sel" : ""}`} onClick={() => setSelected(s.id)}>
                  <span className="icon" aria-hidden>{ICON[s.status] ?? "○"}</span>
                  <span className="label">{s.label}<small>{s.summary ?? s.error ?? ""}</small></span>
                  <span className="meta">{s.usedLLM && <span className="tag">{s.usedLLM}</span>}<small>{secs(s)}</small></span>
                </button>
              </li>
            ))}
          </ul>
        </section>

        <section className="panel out">
          <h2>{state.stages.find((s) => s.id === selected)?.label} output</h2>
          {summarize(selected, data.sections).length > 0 && <ul className="produced">{summarize(selected, data.sections).map((l, i) => <li key={i}>{l}</li>)}</ul>}
          {state.stages.find((s) => s.id === selected)?.error && <p className="err">{state.stages.find((s) => s.id === selected)?.error}</p>}
          {sel.map((k) => data.sections[k] !== undefined ? (
            <details key={k}><summary>Raw {k} JSON</summary><pre>{JSON.stringify(data.sections[k], null, 2)}</pre></details>
          ) : <p key={k} className="sub">{k}: not produced yet.</p>)}
          {selected === "qa" && data.screenshots.length > 0 && (
            <div className="shots">{data.screenshots.filter((s) => s.endsWith("hero.png")).map((s) => <figure key={s}><img src={`/api/projects/${id}/qa/${s}`} alt={s} /><figcaption>{s}</figcaption></figure>)}</div>
          )}
        </section>
      </div>

      {final && (
        <section className="panel">
          <h2>Final</h2>
          <p><strong>{final.status.replace(/_/g, " ")}</strong>: {final.summary}</p>
          <p className="sub">Site directory: <code>{final.outputDir}</code></p>
          <p className="sub">Run: <code>cd {final.outputDir} && npm install && npm run dev</code></p>
          {final.openItems.length > 0 && <><h3>Open items</h3><ul>{final.openItems.map((o) => <li key={o}>{o}</li>)}</ul></>}
          <h3>Placeholders to fill before launch</h3>
          <ul>{final.placeholdersToFill.map((p) => <li key={p.field}><code>{p.field}</code> {p.note}</li>)}</ul>
        </section>
      )}

      <div className="grid">
        <section className="panel"><h2>Decisions</h2><ul className="log">{data.decisions.map((d, i) => <li key={i}><strong>{d.agent}</strong> {d.key}: {d.value}</li>)}</ul></section>
        <section className="panel"><h2>Activity</h2><ul className="log">{[...data.events].reverse().map((e, i) => <li key={i} className={e.level}><small>{e.agent}</small> {e.message}</li>)}</ul></section>
      </div>
    </main>
  );
}
