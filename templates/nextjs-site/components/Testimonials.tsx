import type { Common } from "../lib/types";
import { Section, SectionHead } from "./Section";

export interface TestimonialsProps { eyebrow: string; headline: string; slots: { hint: string }[] }

/** Real testimonials only. Until provided, slots are visibly marked placeholders. */
export function Testimonials(p: TestimonialsProps & Common) {
  return (
    <Section {...p}>
      <SectionHead eyebrow={p.eyebrow} headline={p.headline} />
      <ul className="quotes">
        {p.slots.map((s, i) => (
          <li key={i} className="placeholder" data-placeholder>
            <blockquote>“Client testimonial goes here.”</blockquote>
            <p>{s.hint}</p>
            <em>Placeholder: replace before launch</em>
          </li>
        ))}
      </ul>
    </Section>
  );
}
