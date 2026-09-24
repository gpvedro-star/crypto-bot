import { getDeployStore, getStore, type Store } from "@netlify/blobs";
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
 */
export interface EditorialStore {
  create(input: EditorialSubmission): Promise<EditorialRecord>;
  get(id: string): Promise<EditorialRecord | null>;
  update(id: string, patch: Partial<EditorialSubmission>): Promise<EditorialRecord | null>;
  setStatus(id: string, status: PublishStatus): Promise<EditorialRecord | null>;
  /** content_id currently holding this slug, if any. */
  ownerOfSlug(slug: string): Promise<string | null>;
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
      published_at: status === "published" ? new Date().toISOString() : existing.published_at,
    };
    await this.store.setJSON(recordKey(id), next);
    return next;
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

  private async remove(key: string) {
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
      if (existing.slug !== record.slug) await this.remove(slugKey(existing.slug));
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
      await this.remove(slugKey(existing.slug));
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
      published_at: status === "published" ? new Date().toISOString() : existing.published_at,
    };
    await this.write(recordKey(id), next);
    return next;
  }
}

let cached: EditorialStore | null | undefined;

/**
 * The configured store. Netlify supplies Blobs credentials through platform
 * context — nothing is hard-coded and no site ID or token lives in the repo.
 */
export function getEditorialStore(): EditorialStore | null {
  if (cached !== undefined) return cached;
  const isProduction = process.env.CONTEXT === "production";
  try {
    const store = isProduction
      ? getStore({ name: STORE_NAME, consistency: "strong" })
      : getDeployStore({ name: `${STORE_NAME}-preview`, consistency: "strong" });
    cached = new BlobsEditorialStore(store);
  } catch {
    // No Blobs context: local `next dev`. Never the case on Netlify.
    cached = process.env.NETLIFY ? null : new LocalEditorialStore();
  }
  return cached;
}

/** Which backend answered, for the API's diagnostics. */
export function storeBackend(): "netlify-blobs" | "local-dev" | "none" {
  const store = getEditorialStore();
  if (!store) return "none";
  return store instanceof BlobsEditorialStore ? "netlify-blobs" : "local-dev";
}
