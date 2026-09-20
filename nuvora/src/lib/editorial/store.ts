import type { EditorialRecord, EditorialSubmission, PublishStatus } from "./contract";
import { DRAFT_FIRST } from "./contract";
import { site } from "@/content/site";

/**
 * Persistence boundary for editorial records.
 *
 * No database is provisioned for this deployment, so `getEditorialStore()`
 * returns null and the routes answer 501 with the normalized record they
 * would have written. The contract above it is final, so the publishing agent
 * can be built and tested against the real request/response shapes today; the
 * only thing left is to implement this interface once storage exists.
 */
export interface EditorialStore {
  create(input: EditorialSubmission): Promise<EditorialRecord>;
  get(id: string): Promise<EditorialRecord | null>;
  update(id: string, patch: Partial<EditorialSubmission>): Promise<EditorialRecord | null>;
  setStatus(id: string, status: PublishStatus): Promise<EditorialRecord | null>;
}

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

/**
 * Returns the configured store, or null when persistence is not enabled.
 * Wire a real implementation here (database, CMS client) and every route
 * below starts working without further changes.
 */
export function getEditorialStore(): EditorialStore | null {
  return null;
}
