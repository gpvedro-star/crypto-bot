import type { Common } from "../lib/types";

export interface MarqueeProps { items: string[] }

/** Slow ticker of service terms. Duplicated once for a seamless loop; the copy is aria-hidden. */
export function Marquee({ items, id, tone }: MarqueeProps & Common) {
  const row = (hidden: boolean) => (
    <ul className="marquee-row" aria-hidden={hidden || undefined}>
      {items.map((t) => <li key={t + hidden}>{t}</li>)}
    </ul>
  );
  return (
    <div id={id} className={`marquee tone-${tone}`}>
      <div className="marquee-track">{row(false)}{row(true)}</div>
    </div>
  );
}
