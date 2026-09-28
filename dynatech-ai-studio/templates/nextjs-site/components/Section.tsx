import type { ReactNode } from "react";
import type { Common } from "../lib/types";
import { Reveal } from "./Reveal";

export function SectionHead({ eyebrow, headline, intro, as: H = "h2" }: { eyebrow?: string; headline: string; intro?: string; as?: "h1" | "h2" }) {
  return (
    <Reveal className="section-head">
      {eyebrow && <p className="eyebrow">{eyebrow}</p>}
      <H className="display">{headline}</H>
      {intro && <p className="lede">{intro}</p>}
    </Reveal>
  );
}

export function Section({ id, tone, layout, children, label }: Common & { children: ReactNode; label?: string }) {
  return (
    <section id={id} className={`section tone-${tone}`} data-layout={layout} aria-label={label}>
      <div className="container">{children}</div>
    </section>
  );
}
