import type { Common } from "../lib/types";
import { Section, SectionHead } from "./Section";

export interface InteractiveCardsProps { eyebrow: string; headline: string; intro?: string; items: { title: string; body: string; href?: string }[] }

/** Available in the library; the UX agent only selects it when a card grid is genuinely the right pattern. */
export function InteractiveCards(p: InteractiveCardsProps & Common) {
  return (
    <Section {...p}>
      <SectionHead eyebrow={p.eyebrow} headline={p.headline} intro={p.intro} />
      <ul className="cards">
        {p.items.map((c) => (
          <li key={c.title} className="card">
            <h3 className="display">{c.title}</h3>
            <p>{c.body}</p>
            {c.href && <a className="link-arrow" href={c.href}>Learn more</a>}
          </li>
        ))}
      </ul>
    </Section>
  );
}
