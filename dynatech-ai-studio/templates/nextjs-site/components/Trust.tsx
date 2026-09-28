import type { Common } from "../lib/types";
import { Reveal } from "./Reveal";
import { Section, SectionHead } from "./Section";

export interface TrustProps {
  eyebrow: string; headline: string; intro: string;
  checklist: { title: string; body: string }[];
  proofSlots: { label: string; hint: string }[];
}

/** Left: honest, verifiable guidance. Right: labelled slots for the business's real proof. Nothing is invented. */
export function Trust(p: TrustProps & Common) {
  return (
    <Section {...p}>
      <div className="trust">
        <div>
          <SectionHead eyebrow={p.eyebrow} headline={p.headline} intro={p.intro} />
          <ol className="checklist">
            {p.checklist.map((c) => (
              <li key={c.title}><Reveal><h3>{c.title}</h3><p>{c.body}</p></Reveal></li>
            ))}
          </ol>
        </div>
        <ul className="proof-slots" aria-label="Credentials to be added by the business">
          {p.proofSlots.map((s) => (
            <li key={s.label} className="placeholder" data-placeholder>
              <strong>{s.label}</strong>
              <span>{s.hint}</span>
              <em>Placeholder: replace before launch</em>
            </li>
          ))}
        </ul>
      </div>
    </Section>
  );
}
