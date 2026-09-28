import type { Asset } from "../../core/types";

export interface SearchOptions {
  orientation?: "landscape" | "portrait" | "square";
  minWidth?: number;
  perPage?: number;
}

/** Stock media provider interface. Swap Pexels for anything else by implementing this. Search methods THROW on failure. */
export interface MediaProvider {
  readonly name: string;
  readonly available: boolean;
  readonly missing: string[];
  searchImages(query: string, opts?: SearchOptions): Promise<Asset[]>;
  searchVideos(query: string, opts?: SearchOptions): Promise<Asset[]>;
  /** URL of a resized rendition of an image asset (used for thumbnails and responsive variants). */
  renditionUrl(asset: Asset, width: number): string;
}
