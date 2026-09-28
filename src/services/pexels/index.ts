import { env } from "../../core/config";
import type { Asset } from "../../core/types";
import type { MediaProvider, SearchOptions } from "./types";

export * from "./types";

interface PexelsPhoto {
  id: number; width: number; height: number; url: string; photographer: string; photographer_url: string; alt?: string;
  src: { original: string; large2x: string };
}
interface PexelsVideo {
  id: number; width: number; height: number; url: string; image: string; duration: number;
  user: { name: string; url: string };
  video_files: { quality: string; file_type: string; width: number; height: number; link: string }[];
}

/** A Pexels failure with the exact HTTP status and upstream message. */
export class PexelsError extends Error {
  constructor(message: string, public readonly status?: number) { super(`[pexels] ${message}`); this.name = "PexelsError"; }
}

/** Last URL path segment of a Pexels page URL carries a human description: "modern-house-with-pool-1234". */
export function slugWords(pageUrl: string): string {
  const seg = pageUrl.replace(/\/$/, "").split("/").pop() ?? "";
  return seg.replace(/-\d+$/, "").replace(/-/g, " ");
}

/** Resized rendition of a Pexels photo URL (Pexels image CDN supports auto=compress&w=). */
export function pexelsRendition(url: string, width: number): string {
  return `${url}?auto=compress&cs=tinysrgb&w=${width}`;
}

export interface PexelsOptions { apiKey?: string; baseURL?: string }

export class PexelsProvider implements MediaProvider {
  readonly name = "pexels";
  private readonly apiKey?: string;
  private readonly baseURL: string;
  constructor(opts: PexelsOptions = {}) {
    this.apiKey = opts.apiKey ?? env("PEXELS_API_KEY");
    this.baseURL = (opts.baseURL ?? env("PEXELS_BASE_URL") ?? "https://api.pexels.com").replace(/\/$/, "");
  }
  get available() { return !!this.apiKey; }
  get missing() { return this.available ? [] : ["PEXELS_API_KEY"]; }

  private async get<T>(pathAndQuery: string): Promise<T> {
    if (!this.apiKey) throw new PexelsError("PEXELS_API_KEY is not set");
    let res: Response;
    try {
      res = await fetch(`${this.baseURL}${pathAndQuery}`, { headers: { Authorization: this.apiKey }, signal: AbortSignal.timeout(20000) });
    } catch (e) {
      throw new PexelsError(`Could not reach ${this.baseURL} (${(e as Error).message}). Check network access to api.pexels.com.`);
    }
    if (!res.ok) {
      const body = (await res.text()).slice(0, 200);
      const remaining = res.headers.get("x-ratelimit-remaining");
      const reset = res.headers.get("x-ratelimit-reset");
      const hint = res.status === 401 || res.status === 403 ? " Check PEXELS_API_KEY." : res.status === 429 ? ` Rate limit hit (remaining ${remaining ?? "?"}, resets at ${reset ?? "?"}).` : "";
      throw new PexelsError(`HTTP ${res.status}: ${body}${hint}`, res.status);
    }
    return res.json() as Promise<T>;
  }

  renditionUrl(asset: Asset, width: number): string { return pexelsRendition(asset.url, width); }

  async searchImages(query: string, opts: SearchOptions = {}): Promise<Asset[]> {
    const q = new URLSearchParams({ query, per_page: String(opts.perPage ?? 15), size: "large" });
    if (opts.orientation) q.set("orientation", opts.orientation);
    const data = await this.get<{ photos: PexelsPhoto[] }>(`/v1/search?${q}`);
    return data.photos.map((p): Asset => ({
      id: `pexels-photo-${p.id}`,
      type: "image",
      source: "pexels",
      url: p.src.original.split("?")[0],
      width: p.width, height: p.height,
      usage: "gallery", slot: "",
      description: [p.alt, slugWords(p.url)].filter(Boolean).join(" — "),
      alt: p.alt || slugWords(p.url),
      query,
      credit: { name: p.photographer, url: p.photographer_url },
      sourceUrl: p.url,
      license: "Pexels License",
      status: "candidate",
    }));
  }

  async searchVideos(query: string, opts: SearchOptions = {}): Promise<Asset[]> {
    const q = new URLSearchParams({ query, per_page: String(opts.perPage ?? 10), size: "medium" });
    if (opts.orientation) q.set("orientation", opts.orientation);
    const data = await this.get<{ videos: PexelsVideo[] }>(`/videos/search?${q}`);
    return data.videos.flatMap((v): Asset[] => {
      const files = v.video_files.filter((f) => f.file_type === "video/mp4" && f.width >= 1280 && f.width <= 1920).sort((a, b) => b.width - a.width);
      if (!files.length) return [];
      return [{
        id: `pexels-video-${v.id}`,
        type: "video", source: "pexels", url: files[0].link, posterUrl: v.image,
        width: files[0].width, height: files[0].height,
        usage: "hero-video", slot: "",
        description: `${slugWords(v.url)} (${v.duration}s)`, alt: slugWords(v.url), query,
        credit: { name: v.user.name, url: v.user.url },
        sourceUrl: v.url,
        license: "Pexels License",
        // Alternative renditions, best first; the downloader picks the largest that fits the size cap.
        variants: files.map((f) => ({ width: f.width, url: f.link })),
        status: "candidate",
      }];
    });
  }
}

/** Used when no key is configured (demo). Reports itself unavailable; never pretends to search. */
export class NoMediaProvider implements MediaProvider {
  readonly name = "none";
  readonly available = false;
  readonly missing = ["PEXELS_API_KEY"];
  async searchImages(): Promise<Asset[]> { return []; }
  async searchVideos(): Promise<Asset[]> { return []; }
  renditionUrl(asset: Asset): string { return asset.url; }
}

export function createMediaProvider(): MediaProvider {
  const p = new PexelsProvider();
  return p.available ? p : new NoMediaProvider();
}
