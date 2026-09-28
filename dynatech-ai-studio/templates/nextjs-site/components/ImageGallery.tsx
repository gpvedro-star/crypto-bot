"use client";
import { useRef, useState } from "react";
import type { Common, Img as ImgData } from "../lib/types";
import { Img } from "./Img";
import { Reveal } from "./Reveal";
import { Section, SectionHead } from "./Section";

export interface ImageGalleryProps { eyebrow: string; headline: string; intro: string; items: (ImgData & { caption: string })[] }

export function ImageGallery(p: ImageGalleryProps & Common) {
  const dlg = useRef<HTMLDialogElement | null>(null);
  const [idx, setIdx] = useState(0);
  const n = p.items.length;
  const open = (i: number) => { setIdx(i); dlg.current?.showModal(); };
  const step = (d: number) => setIdx((i) => (i + d + n) % n);
  const cur = p.items[idx];
  return (
    <Section {...p}>
      <SectionHead eyebrow={p.eyebrow} headline={p.headline} intro={p.intro} />
      <div className="gallery">
        {p.items.map((it, i) => (
          <Reveal key={it.src + i} as="div" className={`gallery-item g-${i % 6}`} delay={(i % 3) * 80}>
            <button onClick={() => open(i)} aria-label={`Open image: ${it.caption || it.alt}`}>
              <Img img={it} sizes="(min-width: 900px) 40vw, 100vw" />
              <span className="gallery-cap">{it.caption}</span>
            </button>
          </Reveal>
        ))}
      </div>
      <dialog ref={dlg} className="lightbox" aria-label="Image viewer" onClick={(e) => { if (e.target === dlg.current) dlg.current?.close(); }}>
        {cur && (
          <div className="lightbox-inner">
            <Img img={cur} sizes="90vw" />
            <p className="caption">{cur.caption}{cur.credit && <> · Photo: <a href={cur.credit.url} rel="noopener noreferrer">{cur.credit.name}</a> / Pexels</>}</p>
            <div className="lightbox-actions">
              <button className="btn btn-ghost btn-sm" onClick={() => step(-1)}>Previous</button>
              <button className="btn btn-ghost btn-sm" onClick={() => step(1)}>Next</button>
              <button className="btn btn-sm" onClick={() => dlg.current?.close()}>Close</button>
            </div>
          </div>
        )}
      </dialog>
    </Section>
  );
}
