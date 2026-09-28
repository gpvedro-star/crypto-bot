import type { Asset } from "../../core/types";

export interface SearchOptions {
  orientation?: "landscape" | "portrait" | "square";
  minWidth?: number;
  perPage?: number;
}

/** Stock media provider interface. Swap Pexels for anything else by implementing this. */
export interface MediaProvider {
  readonly name: string;
  readonly available: boolean;
  searchImages(query: string, opts?: SearchOptions): Promise<Asset[]>;
  searchVideos(query: string, opts?: SearchOptions): Promise<Asset[]>;
}
