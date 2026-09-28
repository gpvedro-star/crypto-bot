"use client";
import { useState } from "react";
import type { Common } from "../lib/types";
import { Reveal } from "./Reveal";
import { Section, SectionHead } from "./Section";

export interface ServicesProps { eyebrow: string; headline: string; intro: string; items: { title: string; body: string; detail: string }[] }

/** Index-style list: one row open at a time. Deliberately not a card grid. */
export function Services(p: ServicesProps & Common) {
  const [open, setOpen] = useState<number>(0);
  return (
    <Section {...p}>
      <div className="services">
        <SectionHead eyebrow={p.eyebrow} headline={p.headline} intro={p.intro} />
        <ol className="index-list">
          {p.items.map((s, i) => {
            const isOpen = open === i;
            return (
              <li key={s.title} className={`index-row ${isOpen ? "is-open" : ""}`}>
                <Reveal delay={60 * i}>
                  <h3>
                    <button aria-expanded={isOpen} aria-controls={`svc-${i}`} onClick={() => setOpen(isOpen ? -1 : i)}>
                      <span className="index-num">{String(i + 1).padStart(2, "0")}</span>
                      <span className="index-title display">{s.title}</span>
                      <span className="index-plus" aria-hidden="true" />
                    </button>
                  </h3>
                  <div id={`svc-${i}`} className="index-body" hidden={!isOpen}>
                    <p>{s.body}</p>
                    <p className="muted">{s.detail}</p>
                  </div>
                </Reveal>
              </li>
            );
          })}
        </ol>
      </div>
    </Section>
  );
}
