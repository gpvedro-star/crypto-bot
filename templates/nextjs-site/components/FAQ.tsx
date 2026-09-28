import type { Common } from "../lib/types";
import { Section, SectionHead } from "./Section";

export interface FAQProps { eyebrow: string; headline: string; items: { q: string; a: string }[] }

/** Native <details>: accessible and functional without JavaScript. */
export function FAQ(p: FAQProps & Common) {
  return (
    <Section {...p}>
      <div className="faq">
        <SectionHead eyebrow={p.eyebrow} headline={p.headline} />
        <div className="faq-list">
          {p.items.map((f, i) => (
            <details key={f.q} open={i === 0}>
              <summary><span>{f.q}</span><span className="index-plus" aria-hidden="true" /></summary>
              <p>{f.a}</p>
            </details>
          ))}
        </div>
      </div>
    </Section>
  );
}
