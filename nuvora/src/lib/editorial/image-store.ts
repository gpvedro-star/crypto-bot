import type { Store } from "@netlify/blobs";
import { openScopedBlobStore } from "./blob-scope";

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

const blobStores = new WeakMap<Store, BlobsImageStore>();
let localStore: LocalImageStore | null = null;

/** Same resolver as the record store (blob-scope.ts): global in production, never a silent fallback. */
export function getImageStore(): ImageStore | null {
  const { scope, store } = openScopedBlobStore(IMAGE_STORE_NAME);
  if (store) {
    let wrapped = blobStores.get(store);
    if (!wrapped) {
      wrapped = new BlobsImageStore(store);
      blobStores.set(store, wrapped);
    }
    return wrapped;
  }
  if (scope === "local") return (localStore ??= new LocalImageStore());
  return null;
}

/** Public URL for a stored hero image. Same-origin, so it needs no allowlisted host. */
export function heroImageUrl(contentId: string): string {
  return `/media/articles/${encodeURIComponent(contentId)}`;
}
