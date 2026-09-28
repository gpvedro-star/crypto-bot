"use client";
import { useEffect, useRef, useState, type CSSProperties } from "react";
import type { Common, Img as ImgData } from "../lib/types";
import { Img } from "./Img";
import { SectionHead } from "./Section";
import { StageArt } from "./StageArt";

export interface ScrollStoryProps {
  eyebrow: string; headline: string; intro: string;
  stages: { label: string; caption: string; art: string; image?: ImgData }[];
}

/**
 * Scroll-driven transformation. The track is N viewport-lengths tall; a pinned frame crossfades stage images
 * as scroll progress advances. One passive listener + rAF; only opacity/transform change. Under
 * prefers-reduced-motion the CSS un-pins the frame and stacks every stage as an ordinary figure.
 */
export function ScrollStory({ id, tone, layout, eyebrow, headline, intro, stages }: ScrollStoryProps & Common) {
  const track = useRef<HTMLDivElement | null>(null);
  const [active, setActive] = useState(0);
  const [progress, setProgress] = useState(0);

  useEffect(() => {
    const el = track.current;
    if (!el) return;
    let raf = 0;
    const update = () => {
      raf = 0;
      const r = el.getBoundingClientRect();
      const total = r.height - window.innerHeight;
      const p = total > 0 ? Math.min(1, Math.max(0, -r.top / total)) : 0;
      setProgress(p);
      setActive(Math.min(stages.length - 1, Math.floor(p * stages.length)));
    };
    const onScroll = () => { if (!raf) raf = requestAnimationFrame(update); };
    update();
    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", onScroll);
    return () => { window.removeEventListener("scroll", onScroll); window.removeEventListener("resize", onScroll); if (raf) cancelAnimationFrame(raf); };
  }, [stages.length]);

  return (
    <section id={id} className={`story tone-${tone}`} data-layout={layout} aria-label={headline}>
      <div className="container story-head"><SectionHead eyebrow={eyebrow} headline={headline} intro={intro} /></div>
      <div ref={track} className="story-track" style={{ "--stages": stages.length } as CSSProperties}>
        <div className="story-sticky">
          <div className="story-frame">
            {stages.map((s, i) => (
              <figure key={s.label} className={`story-layer ${i === active ? "is-active" : ""}`} aria-hidden={undefined}>
                <div className="story-media">
                  {s.image ? <Img img={s.image} sizes="100vw" /> : <StageArt stage={i} />}
                </div>
                <figcaption className="story-caption">
                  <span className="story-count">{String(i + 1).padStart(2, "0")} / {String(stages.length).padStart(2, "0")}</span>
                  <strong className="display">{s.label}</strong>
                  <span>{s.caption}</span>
                  {s.image?.credit && <span className="credit">Photo: <a href={s.image.credit.url} rel="noopener noreferrer">{s.image.credit.name}</a> / Pexels</span>}
                </figcaption>
              </figure>
            ))}
            <div className="story-progress" aria-hidden="true"><span style={{ transform: `scaleX(${progress})` }} /></div>
          </div>
        </div>
      </div>
    </section>
  );
}
