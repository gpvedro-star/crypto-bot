import type { CSSProperties } from "react";
import type { Img as ImgData } from "../lib/types";

/** Responsive image. Every image is a local file; `variants` are same-image renditions at several widths. */
export function Img({ img, eager = false, sizes = "100vw", className, style }: { img: ImgData; eager?: boolean; sizes?: string; className?: string; style?: CSSProperties }) {
  const srcSet = img.variants && img.variants.length > 1 ? img.variants.map((v) => `${v.url} ${v.width}w`).join(", ") : undefined;
  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      className={className}
      style={style}
      src={img.src}
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
