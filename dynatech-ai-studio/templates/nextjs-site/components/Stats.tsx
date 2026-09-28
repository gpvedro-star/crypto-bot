import type { Common } from "../lib/types";
import { Section } from "./Section";

export interface StatsProps { items: { value: string; label: string }[] }

/** Only render with figures the business has verified. The studio never invents statistics. */
export function Stats(p: StatsProps & Common) {
  return (
    <Section {...p}>
      <dl className="stats">
        {p.items.map((s) => (
          <div key={s.label}><dt>{s.label}</dt><dd className="display">{s.value}</dd></div>
        ))}
      </dl>
    </Section>
  );
}
