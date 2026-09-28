"use client";
import { useEffect, useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";

interface Status { llm: { name: string; available: boolean }; media: { name: string; available: boolean }; video: { name: string; available: boolean }; engines: { id: string; label: string; status: string }[] }
interface ProjectSummary { id: string; name: string; status: string; mode: string; createdAt: string }

export default function Home() {
  const router = useRouter();
  const [status, setStatus] = useState<Status | null>(null);
  const [projects, setProjects] = useState<ProjectSummary[]>([]);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [mode, setMode] = useState<"autonomous" | "supervised">("autonomous");

  useEffect(() => {
    fetch("/api/status").then((r) => r.json()).then(setStatus).catch(() => {});
    fetch("/api/projects").then((r) => r.json()).then((d) => setProjects(d.projects ?? [])).catch(() => {});
  }, []);

  async function onSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setBusy(true); setError("");
    const fd = new FormData(e.currentTarget);
    const file = fd.get("logo") as File | null;
    let logo: { name: string; dataBase64: string } | undefined;
    if (file && file.size > 0) {
      const buf = new Uint8Array(await file.arrayBuffer());
      let bin = ""; buf.forEach((b) => (bin += String.fromCharCode(b)));
      logo = { name: file.name, dataBase64: btoa(bin) };
    }
    const val = (k: string) => (String(fd.get(k) ?? "").trim() || undefined);
    const res = await fetch("/api/projects", {
      method: "POST", headers: { "content-type": "application/json" },
      body: JSON.stringify({ business: val("business"), location: val("location"), targetAudience: val("targetAudience"), style: val("style"), goal: val("goal"), notes: val("notes"), businessName: val("businessName"), mode, logo }),
    });
    const data = await res.json();
    if (!res.ok) { setError((data.issues ?? [data.error]).join("; ")); setBusy(false); return; }
    router.push(`/projects/${data.id}`);
  }

  return (
    <main className="wrap">
      <header className="top">
        <p className="kicker">DYNATECH AI STUDIO</p>
        <h1>What are we building?</h1>
        <p className="sub">Describe the business. The agent team researches, plans, designs, writes, builds, reviews and improves the website.</p>
      </header>

      <form className="panel form" onSubmit={onSubmit}>
        <label>Business<input name="business" required placeholder="Luxury Landscaping Company" defaultValue="Luxury Landscaping Company" /></label>
        <label>Location<input name="location" required placeholder="Miami, Florida" defaultValue="Miami, Florida" /></label>
        <label>Target audience<input name="targetAudience" required placeholder="High-income homeowners" defaultValue="High-income homeowners" /></label>
        <label>Style<input name="style" required placeholder="Premium, cinematic, sophisticated" defaultValue="Premium, cinematic, sophisticated" /></label>
        <label>Goal <span className="opt">optional</span><input name="goal" placeholder="Generate leads for high-end landscaping projects" /></label>
        <label>Notes <span className="opt">optional</span><input name="notes" placeholder="Focus on outdoor transformations" /></label>
        <label>Business name <span className="opt">optional; leave blank and a placeholder is used</span><input name="businessName" /></label>
        <label>Logo <span className="opt">optional PNG/JPG; the Brand agent extends your identity</span><input name="logo" type="file" accept="image/png,image/jpeg" /></label>
        <fieldset className="modes">
          <legend>Mode</legend>
          <label className="radio"><input type="radio" checked={mode === "autonomous"} onChange={() => setMode("autonomous")} /> Autonomous <span className="opt">the AI decides everything</span></label>
          <label className="radio"><input type="radio" checked={mode === "supervised"} onChange={() => setMode("supervised")} /> Supervised <span className="opt">approve Strategy, Creative Direction, Homepage Concept, Final</span></label>
        </fieldset>
        {error && <p className="err" role="alert">{error}</p>}
        <button className="primary" disabled={busy}>{busy ? "Starting…" : "BUILD WEBSITE"}</button>
      </form>

      <section className="panel">
        <h2>Providers</h2>
        {status ? (
          <ul className="providers">
            <li><span className={status.llm.available ? "dot on" : "dot"} />LLM: {status.llm.available ? status.llm.name : "knowledge base (no API key)"}</li>
            <li><span className={status.media.available ? "dot on" : "dot"} />Media: {status.media.available ? "Pexels" : "placeholders (set PEXELS_API_KEY)"}</li>
            <li><span className={status.video.available ? "dot on" : "dot"} />Video: {status.video.available ? "Higgsfield" : "disabled (set HIGGSFIELD_*)"}</li>
            {status.engines.map((e) => <li key={e.id}><span className={e.status === "ready" ? "dot on" : "dot"} />Engine: {e.label} ({e.status})</li>)}
          </ul>
        ) : <p className="sub">Loading…</p>}
      </section>

      {projects.length > 0 && (
        <section className="panel">
          <h2>Projects</h2>
          <ul className="list">
            {projects.map((p) => <li key={p.id}><a href={`/projects/${p.id}`}>{p.name}</a><span className={`pill ${p.status}`}>{p.status.replace(/_/g, " ")}</span></li>)}
          </ul>
        </section>
      )}
    </main>
  );
}
