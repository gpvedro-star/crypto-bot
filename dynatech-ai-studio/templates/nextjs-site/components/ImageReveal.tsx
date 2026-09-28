"use client";
import { useEffect, useRef, useState } from "react";
import type { Img as ImgData } from "../lib/types";
import { Img } from "./Img";

/** Image unveils with a clip-path wipe the first time it scrolls into view. */
export function ImageReveal({ img, sizes = "(min-width: 900px) 45vw, 100vw", caption }: { img: ImgData; sizes?: string; caption?: string }) {
  const ref = useRef<HTMLElement | null>(null);
  const [seen, setSeen] = useState(false);
  useEffect(() => {
    const el = ref.current;
    if (!el || typeof IntersectionObserver === "undefined") { setSeen(true); return; }
    const io = new IntersectionObserver(([e]) => { if (e.isIntersecting) { setSeen(true); io.disconnect(); } }, { threshold: 0.15 });
    io.observe(el);
    return () => io.disconnect();
  }, []);
  return (
    <figure ref={ref} className={`image-reveal ${seen ? "is-visible" : ""}`}>
      <Img img={img} sizes={sizes} />
      {caption && <figcaption className="caption">{caption}</figcaption>}
      {img.credit && <figcaption className="credit">Photo: <a href={img.credit.url} rel="noopener noreferrer">{img.credit.name}</a> / Pexels</figcaption>}
    </figure>
  );
}
