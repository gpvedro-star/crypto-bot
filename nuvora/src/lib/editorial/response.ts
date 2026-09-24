import type { EditorialRecord } from "./contract";
import { wireStatus } from "./contract";
import { absoluteUrl } from "@/lib/seo";

/**
 * The response the publishing agent reads.
 *
 * `draft_url` points at this API's own record endpoint — the draft is not on
 * the site, so returning a public article URL for it would be a lie.
 * `published_url` is where the piece will live once someone publishes it.
 */
export function draftResponse(record: EditorialRecord, created: boolean) {
  return {
    success: true,
    created,
    content_id: record.content_id,
    draft_id: record.id,
    status: (record.status ?? "RECEIVED").toUpperCase(),
    publish_status: wireStatus(record.publish_status),
    slug: record.slug,
    draft_url: absoluteUrl(`/api/v1/editorial/articles/${encodeURIComponent(record.id)}`),
    published_url: record.url,
    created_at: record.created_at,
    updated_at: record.updated_at,
    published_at: record.published_at,
  };
}
