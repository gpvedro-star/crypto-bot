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

/** Last URL path segment of a Pexels page URL carries a human description: "modern-house-with-pool-1234". */
export function slugWords(pageUrl: string): string {
  const seg = pageUrl.replace(/\/$/, "").split("/").pop() ?? "";
  return seg.replace(/-\d+$/, "").replace(/-/g, " ");
}

export class PexelsProvider implements MediaProvider {
  readonly name = "pexels";
  get available() { return !!env("PEXELS_API_KEY"); }

  private async get<T>(url: string): Promise<T> {
    const key = env("PEXELS_API_KEY");
    if (!key) throw new Error("PEXELS_API_KEY not set");
    const res = await fetch(url, { headers: { Authorization: key } });
    if (!res.ok) throw new Error(`Pexels ${res.status}: ${(await res.text()).slice(0, 200)}`);
    return res.json() as Promise<T>;
  }

  async searchImages(query: string, opts: SearchOptions = {}): Promise<Asset[]> {
    const q = new URLSearchParams({ query, per_page: String(opts.perPage ?? 15), size: "large" });
    if (opts.orientation) q.set("orientation", opts.orientation);
    const data = await this.get<{ photos: PexelsPhoto[] }>(`https://api.pexels.com/v1/search?${q}`);
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
      status: "candidate",
    }));
  }

  async searchVideos(query: string, opts: SearchOptions = {}): Promise<Asset[]> {
    const q = new URLSearchParams({ query, per_page: String(opts.perPage ?? 10), size: "medium" });
    if (opts.orientation) q.set("orientation", opts.orientation);
    const data = await this.get<{ videos: PexelsVideo[] }>(`https://api.pexels.com/videos/search?${q}`);
    return data.videos.flatMap((v): Asset[] => {
      const file = v.video_files
        .filter((f) => f.file_type === "video/mp4" && f.width <= 1920 && f.width >= 1280)
        .sort((a, b) => b.width - a.width)[0];
      if (!file) return [];
      return [{
        id: `pexels-video-${v.id}`,
        type: "video", source: "pexels", url: file.link, posterUrl: v.image,
        width: file.width, height: file.height,
        usage: "hero-video", slot: "",
        description: slugWords(v.url), alt: slugWords(v.url), query,
        credit: { name: v.user.name, url: v.user.url },
        status: "candidate",
      }];
    });
  }
}

/** Provider used when no key is configured. Returns nothing, so the Media Agent falls back to placeholders. */
export class NoMediaProvider implements MediaProvider {
  readonly name = "none";
  readonly available = false;
  async searchImages(): Promise<Asset[]> { return []; }
  async searchVideos(): Promise<Asset[]> { return []; }
}

export function createMediaProvider(): MediaProvider {
  const p = new PexelsProvider();
  return p.available ? p : new NoMediaProvider();
}
