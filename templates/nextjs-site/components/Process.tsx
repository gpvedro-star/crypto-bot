import type { Common } from "../lib/types";
import { Reveal } from "./Reveal";
import { Section, SectionHead } from "./Section";

export interface ProcessProps { eyebrow: string; headline: string; intro: string; steps: { title: string; body: string }[] }

export function Process(p: ProcessProps & Common) {
  return (
    <Section {...p}>
      <SectionHead eyebrow={p.eyebrow} headline={p.headline} intro={p.intro} />
      <ol className="steps">
        {p.steps.map((s, i) => (
          <li key={s.title}>
            <Reveal delay={80 * i}>
              <span className="step-num display" aria-hidden="true">{String(i + 1).padStart(2, "0")}</span>
              <h3>{s.title}</h3>
              <p>{s.body}</p>
            </Reveal>
          </li>
        ))}
      </ol>
    </Section>
  );
}
