"use client";
import { useState, type CSSProperties } from "react";
import type { Common, Img as ImgData } from "../lib/types";
import { Img } from "./Img";
import { Section, SectionHead } from "./Section";

export interface BeforeAfterProps {
  eyebrow: string; headline: string; body: string;
  before: ImgData & { label: string }; after: ImgData & { label: string };
}

/** Comparison slider built on a native range input: keyboard, touch and screen-reader support for free. */
export function BeforeAfter(p: BeforeAfterProps & Common) {
  const [pos, setPos] = useState(50);
  return (
    <Section {...p}>
      <SectionHead eyebrow={p.eyebrow} headline={p.headline} intro={p.body} />
      <div className="ba" style={{ "--pos": `${pos}%` } as CSSProperties}>
        <Img img={p.after} sizes="(min-width: 1200px) 1200px, 100vw" className="ba-after" />
        <div className="ba-before-clip"><Img img={p.before} sizes="(min-width: 1200px) 1200px, 100vw" className="ba-before" /></div>
        <span className="ba-label ba-label-before">{p.before.label}</span>
        <span className="ba-label ba-label-after">{p.after.label}</span>
        <input className="ba-range" type="range" min={0} max={100} step={1} value={pos} aria-label={`Compare ${p.before.label} and ${p.after.label}`} onChange={(e) => setPos(Number(e.target.value))} />
        <span className="ba-handle" aria-hidden="true" />
      </div>
    </Section>
  );
}
