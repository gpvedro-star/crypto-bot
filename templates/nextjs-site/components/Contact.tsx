"use client";
import { useState, type FormEvent } from "react";
import type { Common, Img as ImgData } from "../lib/types";
import { Img } from "./Img";
import { Section, SectionHead } from "./Section";

export interface ContactProps {
  eyebrow: string; headline: string; body: string; submitLabel: string; privacyNote: string;
  fields: { name: string; label: string; type: string; required: boolean; options?: string[] }[];
  contact: { phone?: string; email?: string; address?: string };
  image?: ImgData;
}

type Status = { state: "idle" | "sending" | "done" | "error"; message?: string };

export function Contact(p: ContactProps & Common) {
  const [status, setStatus] = useState<Status>({ state: "idle" });

  async function onSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = e.currentTarget;
    setStatus({ state: "sending" });
    try {
      const res = await fetch("/api/lead", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(Object.fromEntries(new FormData(form))) });
      const data = (await res.json().catch(() => ({}))) as { ok?: boolean; error?: string };
      if (!res.ok || !data.ok) throw new Error(data.error ?? "Something went wrong.");
      form.reset();
      setStatus({ state: "done", message: "Thank you. Your inquiry has been sent." });
    } catch (err) {
      setStatus({ state: "error", message: (err as Error).message });
    }
  }

  return (
    <Section {...p}>
      {p.image && <div className="contact-bg" aria-hidden="true"><Img img={p.image} sizes="100vw" /></div>}
      <div className="contact">
        <div>
          <SectionHead eyebrow={p.eyebrow} headline={p.headline} intro={p.body} />
          <ul className="contact-lines">
            {p.contact.phone && <li><a href={`tel:${p.contact.phone.replace(/[^+\d]/g, "")}`}>{p.contact.phone}</a></li>}
            {p.contact.email && <li><a href={`mailto:${p.contact.email}`}>{p.contact.email}</a></li>}
            {p.contact.address && <li>{p.contact.address}</li>}
          </ul>
        </div>
        <form className="form" onSubmit={onSubmit} noValidate={false} aria-describedby="form-status">
          {p.fields.map((f) => (
            <div key={f.name} className="field">
              <label htmlFor={`f-${f.name}`}>{f.label}{f.required && <span aria-hidden="true"> *</span>}</label>
              {f.type === "textarea" ? (
                <textarea id={`f-${f.name}`} name={f.name} rows={4} required={f.required} />
              ) : f.type === "select" ? (
                <select id={`f-${f.name}`} name={f.name} required={f.required} defaultValue="">
                  <option value="" disabled>Select…</option>
                  {f.options?.map((o) => <option key={o}>{o}</option>)}
                </select>
              ) : (
                <input id={`f-${f.name}`} name={f.name} type={f.type} required={f.required} autoComplete={f.name === "email" ? "email" : f.name === "name" ? "name" : f.name === "phone" ? "tel" : "off"} />
              )}
            </div>
          ))}
          <div className="hp" aria-hidden="true"><label>Company<input name="company" tabIndex={-1} autoComplete="off" /></label></div>
          <button className="btn" type="submit" disabled={status.state === "sending"}>{status.state === "sending" ? "Sending…" : p.submitLabel}</button>
          <p id="form-status" role="status" aria-live="polite" className={`form-status ${status.state}`}>{status.message}</p>
          <p className="muted small">{p.privacyNote}</p>
        </form>
      </div>
    </Section>
  );
}
