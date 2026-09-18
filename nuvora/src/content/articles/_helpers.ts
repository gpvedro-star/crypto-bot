import type { ImageAsset } from "../types";

/**
 * Featured-image container helper.
 * Placeholder artwork lives at /public/images/articles/<slug>.svg and is
 * designed to be replaced 1:1 by the image-generation pipeline (same path,
 * same 16:10 ratio) without touching article data.
 */
export function featured(slug: string, alt: string, caption?: string, credit?: string): ImageAsset {
  return {
    src: `/images/articles/${slug}.svg`,
    alt,
    width: 1600,
    height: 1000,
    caption,
    credit: credit ?? "Illustration: NUVORA",
  };
}
