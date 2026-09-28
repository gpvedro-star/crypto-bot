import type { CSSProperties } from "react";
import type { Img as ImgData } from "../lib/types";

const PEXELS = "images.pexels.com";

/** Responsive image. Pexels CDN URLs get a resized srcset; local SVG placeholders pass through untouched. */
export function Img({ img, eager = false, sizes = "100vw", className, style }: { img: ImgData; eager?: boolean; sizes?: string; className?: string; style?: CSSProperties }) {
  const isPexels = img.src.includes(PEXELS);
  const base = `${img.src}?auto=compress&cs=tinysrgb`;
  const srcSet = isPexels ? [640, 1024, 1600, 2200].map((w) => `${base}&w=${w} ${w}w`).join(", ") : undefined;
  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      className={className}
      style={style}
      src={isPexels ? `${base}&w=1600` : img.src}
      srcSet={srcSet}
      sizes={srcSet ? sizes : undefined}
      alt={img.alt}
      width={img.width}
      height={img.height}
      loading={eager ? "eager" : "lazy"}
      fetchPriority={eager ? "high" : "auto"}
      decoding="async"
    />
  );
}
