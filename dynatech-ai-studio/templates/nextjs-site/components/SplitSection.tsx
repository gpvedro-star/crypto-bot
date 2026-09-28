import type { Common, Img } from "../lib/types";
import { ImageReveal } from "./ImageReveal";
import { Reveal } from "./Reveal";
import { Section } from "./Section";

export interface SplitSectionProps { eyebrow: string; headline: string; body: string[]; image?: Img }

export function SplitSection(p: SplitSectionProps & Common) {
  const reverse = p.layout.startsWith("split-left");
  return (
    <Section {...p}>
      <div className={`split ${reverse ? "split-reverse" : ""}`}>
        <div className="split-copy">
          <Reveal>
            <p className="eyebrow">{p.eyebrow}</p>
            <h2 className="display">{p.headline}</h2>
          </Reveal>
          {p.body.map((b, i) => <Reveal key={i} delay={80 * (i + 1)}><p className="lede">{b}</p></Reveal>)}
        </div>
        {p.image && <ImageReveal img={p.image} />}
      </div>
    </Section>
  );
}
