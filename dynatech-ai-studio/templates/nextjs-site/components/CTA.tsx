import type { Common, Link } from "../lib/types";
import { Reveal } from "./Reveal";

export interface CTAProps { headline: string; body: string; button: Link }

export function CTA({ id, tone, layout, headline, body, button }: CTAProps & Common) {
  return (
    <section id={id} className={`section cta tone-${tone}`} data-layout={layout} aria-label="Call to action">
      <div className="container cta-inner">
        <Reveal><h2 className="display display-lg">{headline}</h2></Reveal>
        <Reveal delay={100}><p className="lede">{body}</p></Reveal>
        <Reveal delay={200}><a className="btn btn-inverse" href={button.href}>{button.label}</a></Reveal>
      </div>
    </section>
  );
}
