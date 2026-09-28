import { getDeployStore, getStore, type Store } from "@netlify/blobs";

/**
 * Persistent storage for article hero images, on Netlify Blobs. The photo is
 * downloaded once and served by NUVORA, never hotlinked from its source.
 *
 * Same production/preview split as the editorial record store: production
 * gets one site-wide store so an image survives every deploy; previews get a
 * per-deploy store, so an image attached against a preview can never
 * overwrite the production hero for the same content_id.
 *
 * Key: articles/<content_id> — one hero per article, content_id is already
 * unique, so no separate slug index is needed.
 */
export const IMAGE_STORE_NAME = "nuvora-editorial-images";

export interface StoredImage {
  bytes: ArrayBuffer;
  contentType: string;
  width: number;
  height: number;
}

export interface ImageStore {
  put(contentId: string, image: StoredImage): Promise<void>;
  get(contentId: string): Promise<StoredImage | null>;
}

const imageKey = (contentId: string) => `articles/${contentId}`;
const metaKey = (contentId: string) => `articles/${contentId}.meta`;

class BlobsImageStore implements ImageStore {
  constructor(private readonly store: Store) {}

  async put(contentId: string, image: StoredImage): Promise<void> {
    await this.store.set(imageKey(contentId), image.bytes, { metadata: { contentType: image.contentType } });
    await this.store.setJSON(metaKey(contentId), { contentType: image.contentType, width: image.width, height: image.height });
  }

  async get(contentId: string): Promise<StoredImage | null> {
    const [bytes, meta] = await Promise.all([
      this.store.get(imageKey(contentId), { type: "arrayBuffer" }) as Promise<ArrayBuffer | null>,
      this.store.get(metaKey(contentId), { type: "json" }) as Promise<{ contentType: string; width: number; height: number } | null>,
    ]);
    if (!bytes || !meta) return null;
    return { bytes, contentType: meta.contentType, width: meta.width, height: meta.height };
  }
}

/**
 * Filesystem-backed stand-in for `next dev` outside the Netlify CLI, matching
 * store.ts's LocalEditorialStore. Never the case on Netlify itself.
 */
class LocalImageStore implements ImageStore {
  private dir = ".netlify/editorial-images-dev";

  private async fs() {
    const [fs] = await Promise.all([import("node:fs/promises")]);
    await fs.mkdir(this.dir, { recursive: true });
    return fs;
  }

  private file(contentId: string, ext: string) {
    return `${this.dir}/${contentId.replace(/[^A-Za-z0-9._-]/g, "_")}.${ext}`;
  }

  async put(contentId: string, image: StoredImage): Promise<void> {
    const fs = await this.fs();
    await fs.writeFile(this.file(contentId, "bin"), Buffer.from(image.bytes));
    await fs.writeFile(
      this.file(contentId, "json"),
      JSON.stringify({ contentType: image.contentType, width: image.width, height: image.height }),
    );
  }

  async get(contentId: string): Promise<StoredImage | null> {
    const fs = await this.fs();
    try {
      const [bytes, metaRaw] = await Promise.all([
        fs.readFile(this.file(contentId, "bin")),
        fs.readFile(this.file(contentId, "json"), "utf8"),
      ]);
      const meta = JSON.parse(metaRaw) as { contentType: string; width: number; height: number };
      return { bytes: bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength), contentType: meta.contentType, width: meta.width, height: meta.height };
    } catch {
      return null;
    }
  }
}

let cached: ImageStore | null | undefined;

export function getImageStore(): ImageStore | null {
  if (cached !== undefined) return cached;
  const isProduction = process.env.CONTEXT === "production";
  try {
    const store = isProduction
      ? getStore({ name: IMAGE_STORE_NAME, consistency: "strong" })
      : getDeployStore({ name: `${IMAGE_STORE_NAME}-preview`, consistency: "strong" });
    cached = new BlobsImageStore(store);
  } catch {
    cached = process.env.NETLIFY ? null : new LocalImageStore();
  }
  return cached;
}

/** Public URL for a stored hero image. Same-origin, so it needs no allowlisted host. */
export function heroImageUrl(contentId: string): string {
  return `/media/articles/${encodeURIComponent(contentId)}`;
}
