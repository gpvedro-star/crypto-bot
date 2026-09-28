import type { Store } from "@netlify/blobs";
import { openScopedBlobStore, resolveBlobScope } from "./blob-scope";
import type { EditorialRecord, EditorialSubmission, PublishStatus } from "./contract";
import { DRAFT_FIRST } from "./contract";
import { site } from "@/content/site";

/**
 * Persistence for editorial records, on Netlify Blobs.
 *
 * Two behaviours, deliberately:
 *   production            → a site-wide store that survives every deploy.
 *   previews / branches   → a per-deploy store, so a draft submitted against
 *                           a preview can never appear in, or overwrite,
 *                           production editorial data.
 *
 * Keys:
 *   record/<content_id>   → the record itself. `content_id` is the editorial
 *                           office's own identity, so re-submitting one
 *                           updates in place instead of duplicating.
 *   slug/<slug>           → the content_id that owns that slug, so two
 *                           different records cannot claim the same URL.
 *   index/published       → the ids the public site may render. Blobs `list`
 *                           is eventually consistent, so the site would
 *                           otherwise sometimes miss a story it had just
 *                           published; this index is written on every status
 *                           change and read back with strong consistency.
 */
export interface EditorialStore {
  create(input: EditorialSubmission): Promise<EditorialRecord>;
  get(id: string): Promise<EditorialRecord | null>;
  update(id: string, patch: Partial<EditorialSubmission>): Promise<EditorialRecord | null>;
  setStatus(id: string, status: PublishStatus): Promise<EditorialRecord | null>;
  /** content_id currently holding this slug, if any. */
  ownerOfSlug(slug: string): Promise<string | null>;
  /** Every stored record. Callers filter by publish_status. */
  list(): Promise<EditorialRecord[]>;
  /** Published records, read through the published index (see below). */
  listPublished(): Promise<EditorialRecord[]>;
  /** Removes a record and its slug claim. */
  remove(id: string): Promise<boolean>;
}

export const STORE_NAME = "nuvora-editorial";

/** Where a record will live on the site once it is published. */
export function recordUrl(slug: string): string {
  return new URL(`/articles/${slug}`, site.url).toString();
}

/**
 * Shapes a submission into the record NUVORA would store. Always `draft`:
 * a `publish_status` in the payload is recorded as the agent's intent but
 * never applied here.
 */
export function toDraftRecord(input: EditorialSubmission): EditorialRecord {
  const now = new Date().toISOString();
  const { publish_status: _requested, ...rest } = input;
  void _requested;
  return {
    ...rest,
    id: input.content_id,
    publish_status: DRAFT_FIRST,
    created_at: input.created_at ?? now,
    updated_at: now,
    url: recordUrl(input.slug),
  };
}

const recordKey = (id: string) => `record/${id}`;
const slugKey = (slug: string) => `slug/${slug}`;
const PUBLISHED_INDEX = "index/published";

class BlobsEditorialStore implements EditorialStore {
  constructor(private readonly store: Store) {}

  async get(id: string): Promise<EditorialRecord | null> {
    return ((await this.store.get(recordKey(id), { type: "json" })) as EditorialRecord | null) ?? null;
  }

  async ownerOfSlug(slug: string): Promise<string | null> {
    const entry = (await this.store.get(slugKey(slug), { type: "json" })) as { content_id: string } | null;
    return entry?.content_id ?? null;
  }

  /** Create or update by content_id. Re-submission is an update, never a duplicate. */
  async create(input: EditorialSubmission): Promise<EditorialRecord> {
    const existing = await this.get(input.content_id);
    const record = toDraftRecord(input);
    if (existing) {
      // Preserve the original creation time and the record's current status:
      // a re-submission is an edit, not a way to reset an approved record.
      record.created_at = existing.created_at;
      record.publish_status = existing.publish_status;
      record.published_at = existing.published_at;
      if (existing.slug !== record.slug) await this.store.delete(slugKey(existing.slug));
    }
    await this.store.setJSON(recordKey(record.id), record);
    await this.store.setJSON(slugKey(record.slug), { content_id: record.id });
    return record;
  }

  async update(id: string, patch: Partial<EditorialSubmission>): Promise<EditorialRecord | null> {
    const existing = await this.get(id);
    if (!existing) return null;
    const next: EditorialRecord = {
      ...existing,
      ...patch,
      id: existing.id,
      content_id: existing.content_id,
      publish_status: existing.publish_status,
      created_at: existing.created_at,
      updated_at: new Date().toISOString(),
    };
    if (patch.slug && patch.slug !== existing.slug) {
      next.slug = patch.slug;
      next.url = recordUrl(patch.slug);
      await this.store.delete(slugKey(existing.slug));
      await this.store.setJSON(slugKey(patch.slug), { content_id: id });
    }
    await this.store.setJSON(recordKey(id), next);
    return next;
  }

  async setStatus(id: string, status: PublishStatus): Promise<EditorialRecord | null> {
    const existing = await this.get(id);
    if (!existing) return null;
    const next: EditorialRecord = {
      ...existing,
      publish_status: status,
      updated_at: new Date().toISOString(),
      published_at: status === "published" ? (existing.published_at ?? new Date().toISOString()) : existing.published_at,
    };
    await this.store.setJSON(recordKey(id), next);
    await this.setIndexed(id, status === "published");
    return next;
  }

  async list(): Promise<EditorialRecord[]> {
    const { blobs } = await this.store.list({ prefix: "record/" });
    const records = await Promise.all(
      blobs.map((b) => this.store.get(b.key, { type: "json" }) as Promise<EditorialRecord | null>),
    );
    return records.filter((r): r is EditorialRecord => Boolean(r));
  }

  /** The published index, rebuilt from a full listing the first time it is missing. */
  private async publishedIds(): Promise<string[]> {
    const stored = (await this.store.get(PUBLISHED_INDEX, { type: "json" })) as { ids?: unknown } | null;
    if (stored && Array.isArray(stored.ids)) {
      return stored.ids.filter((id): id is string => typeof id === "string");
    }
    const ids = (await this.list()).filter((r) => r.publish_status === "published").map((r) => r.id);
    await this.store.setJSON(PUBLISHED_INDEX, { ids });
    return ids;
  }

  private async setIndexed(id: string, published: boolean): Promise<void> {
    const ids = await this.publishedIds();
    const has = ids.includes(id);
    if (published === has) return;
    const next = published ? [...ids, id] : ids.filter((i) => i !== id);
    await this.store.setJSON(PUBLISHED_INDEX, { ids: next });
  }

  async listPublished(): Promise<EditorialRecord[]> {
    const ids = await this.publishedIds();
    const records = await Promise.all(ids.map((id) => this.get(id)));
    // A record can leave `published` between the index write and this read;
    // the record itself, read with strong consistency, is the authority.
    return records.filter((r): r is EditorialRecord => Boolean(r) && r!.publish_status === "published");
  }

  async remove(id: string): Promise<boolean> {
    const existing = await this.get(id);
    if (!existing) return false;
    await this.store.delete(recordKey(id));
    await this.store.delete(slugKey(existing.slug));
    await this.setIndexed(id, false);
    return true;
  }
}

/**
 * Filesystem-backed stand-in used only when Blobs has no platform context —
 * i.e. `next dev` outside the Netlify CLI. It exists so the API can be
 * exercised locally; on Netlify the context is always present, so this branch
 * is never taken in production or in previews.
 */
class LocalEditorialStore implements EditorialStore {
  private dir = ".netlify/editorial-dev";

  private async fs() {
    const [fs, path] = await Promise.all([import("node:fs/promises"), import("node:path")]);
    await fs.mkdir(this.dir, { recursive: true });
    return { fs, path };
  }

  private file(key: string) {
    return `${this.dir}/${key.replace(/\//g, "__")}.json`;
  }

  private async read<T>(key: string): Promise<T | null> {
    const { fs } = await this.fs();
    try {
      return JSON.parse(await fs.readFile(this.file(key), "utf8")) as T;
    } catch {
      return null;
    }
  }

  private async write(key: string, value: unknown) {
    const { fs } = await this.fs();
    await fs.writeFile(this.file(key), JSON.stringify(value, null, 2), "utf8");
  }

  private async remove_(key: string) {
    const { fs } = await this.fs();
    await fs.rm(this.file(key), { force: true });
  }

  get(id: string) {
    return this.read<EditorialRecord>(recordKey(id));
  }

  async ownerOfSlug(slug: string) {
    const entry = await this.read<{ content_id: string }>(slugKey(slug));
    return entry?.content_id ?? null;
  }

  async create(input: EditorialSubmission): Promise<EditorialRecord> {
    const existing = await this.get(input.content_id);
    const record = toDraftRecord(input);
    if (existing) {
      record.created_at = existing.created_at;
      record.publish_status = existing.publish_status;
      record.published_at = existing.published_at;
      if (existing.slug !== record.slug) await this.remove_(slugKey(existing.slug));
    }
    await this.write(recordKey(record.id), record);
    await this.write(slugKey(record.slug), { content_id: record.id });
    return record;
  }

  async update(id: string, patch: Partial<EditorialSubmission>): Promise<EditorialRecord | null> {
    const existing = await this.get(id);
    if (!existing) return null;
    const next: EditorialRecord = {
      ...existing,
      ...patch,
      id: existing.id,
      content_id: existing.content_id,
      publish_status: existing.publish_status,
      created_at: existing.created_at,
      updated_at: new Date().toISOString(),
    };
    if (patch.slug && patch.slug !== existing.slug) {
      next.slug = patch.slug;
      next.url = recordUrl(patch.slug);
      await this.remove_(slugKey(existing.slug));
      await this.write(slugKey(patch.slug), { content_id: id });
    }
    await this.write(recordKey(id), next);
    return next;
  }

  async setStatus(id: string, status: PublishStatus): Promise<EditorialRecord | null> {
    const existing = await this.get(id);
    if (!existing) return null;
    const next: EditorialRecord = {
      ...existing,
      publish_status: status,
      updated_at: new Date().toISOString(),
      published_at: status === "published" ? (existing.published_at ?? new Date().toISOString()) : existing.published_at,
    };
    await this.write(recordKey(id), next);
    return next;
  }

  async list(): Promise<EditorialRecord[]> {
    const { fs } = await this.fs();
    const names = await fs.readdir(this.dir).catch(() => [] as string[]);
    const out: EditorialRecord[] = [];
    for (const n of names) {
      if (!n.startsWith("record__")) continue;
      const r = await this.read<EditorialRecord>(n.replace("record__", "record/").replace(/\.json$/, ""));
      if (r) out.push(r);
    }
    return out;
  }

  async listPublished(): Promise<EditorialRecord[]> {
    return (await this.list()).filter((r) => r.publish_status === "published");
  }

  async remove(id: string): Promise<boolean> {
    const existing = await this.get(id);
    if (!existing) return false;
    await this.remove_(recordKey(id));
    await this.remove_(slugKey(existing.slug));
    return true;
  }
}

const blobStores = new WeakMap<Store, BlobsEditorialStore>();
let localStore: LocalEditorialStore | null = null;

/**
 * The configured store, resolved per request through blob-scope.ts: the
 * site-wide store in production, an isolated deploy store in previews, the
 * filesystem only under plain `next dev`. Null — fail closed — when running
 * on Netlify and the scope or store can't be established. Netlify supplies
 * Blobs credentials through platform context; nothing is hard-coded.
 */
export function getEditorialStore(): EditorialStore | null {
  const { scope, store } = openScopedBlobStore(STORE_NAME);
  if (store) {
    let wrapped = blobStores.get(store);
    if (!wrapped) {
      wrapped = new BlobsEditorialStore(store);
      blobStores.set(store, wrapped);
    }
    return wrapped;
  }
  if (scope === "local") return (localStore ??= new LocalEditorialStore());
  return null;
}

/** Which backend answered, for the API's diagnostics. */
export function storeBackend(): string {
  const store = getEditorialStore();
  if (!store) return `none (${resolveBlobScope()})`;
  return store instanceof BlobsEditorialStore ? `netlify-blobs (${resolveBlobScope()})` : "local-dev";
}
