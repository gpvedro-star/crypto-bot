/**
 * NUVORA Editorial API contract.
 *
 * The shape a publishing agent submits. Deliberately independent of the
 * site's own `Article` type: the agent speaks this contract, and the desk
 * maps an approved record into site content. Keeping them apart is what lets
 * a second project (travel) submit through the same endpoint without the AI
 * publication's content model leaking into it.
 */

/** Projects the pipeline can carry. The frontend renders `ai` only. */
export const EDITORIAL_PROJECTS = ["ai", "travel"] as const;
export type EditorialProject = (typeof EDITORIAL_PROJECTS)[number];

/**
 * Lifecycle of a record inside NUVORA. External automation may only ever
 * create `draft`; every later transition is an explicit, separate call.
 */
export const PUBLISH_STATUSES = ["draft", "in_review", "scheduled", "published"] as const;
export type PublishStatus = (typeof PUBLISH_STATUSES)[number];

export interface EditorialSource {
  title: string;
  url: string;
  publisher?: string;
  retrievedAt?: string;
}

export interface EditorialImageAsset {
  url: string;
  alt: string;
  caption?: string;
  credit?: string;
  width?: number;
  height?: number;
}

export interface EditorialVerifiedFact {
  claim: string;
  source: string;
  verifiedAt?: string;
}

export interface EditorialSubmission {
  content_id: string;
  project: EditorialProject;
  /** Upstream workflow label from the editorial office. Free text. */
  status?: string;
  category: string;
  working_headline?: string;
  final_headline: string;
  summary: string;
  /** Typed blocks matching the site content model, or raw copy for the desk. */
  article_body: unknown[] | string;
  key_takeaways?: string[];
  sources?: EditorialSource[];
  verified_facts?: EditorialVerifiedFact[];
  image_brief?: string;
  image_assets?: EditorialImageAsset[];
  seo_title?: string;
  seo_description?: string;
  slug: string;
  keywords?: string[];
  author: string;
  created_at?: string;
  updated_at?: string;
  published_at?: string;
  /** Accepted but never honoured on create — see DRAFT_FIRST below. */
  publish_status?: PublishStatus;
}

/** A stored record. `id` and `publish_status` are owned by NUVORA, not the agent. */
export interface EditorialRecord extends Omit<EditorialSubmission, "publish_status"> {
  id: string;
  publish_status: PublishStatus;
  created_at: string;
  updated_at: string;
  published_at?: string;
  /** Where the article will live once published. */
  url: string;
}

/**
 * Draft-first rule. Automation cannot publish: submissions are forced to
 * `draft` regardless of what the payload asks for, and publication is a
 * separate authenticated call against a specific record.
 */
export const DRAFT_FIRST: PublishStatus = "draft";

const SLUG_RE = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

export interface ValidationFailure {
  field: string;
  message: string;
}

function isNonEmptyString(v: unknown): v is string {
  return typeof v === "string" && v.trim().length > 0;
}

/**
 * Validates an agent submission. Returns the normalized record input on
 * success, or the full list of problems so an agent can fix them in one pass.
 */
export function validateSubmission(
  body: unknown,
): { ok: true; value: EditorialSubmission } | { ok: false; errors: ValidationFailure[] } {
  const errors: ValidationFailure[] = [];
  if (typeof body !== "object" || body === null || Array.isArray(body)) {
    return { ok: false, errors: [{ field: "body", message: "Expected a JSON object." }] };
  }
  const b = body as Record<string, unknown>;

  for (const field of ["content_id", "final_headline", "summary", "slug", "author", "category"] as const) {
    if (!isNonEmptyString(b[field])) errors.push({ field, message: "Required, must be a non-empty string." });
  }

  if (isNonEmptyString(b.slug) && !SLUG_RE.test(b.slug)) {
    errors.push({ field: "slug", message: "Must be lowercase words separated by single hyphens." });
  }

  if (!EDITORIAL_PROJECTS.includes(b.project as EditorialProject)) {
    errors.push({ field: "project", message: `Must be one of: ${EDITORIAL_PROJECTS.join(", ")}.` });
  }

  const bodyValue = b.article_body;
  const bodyOk = Array.isArray(bodyValue) ? bodyValue.length > 0 : isNonEmptyString(bodyValue);
  if (!bodyOk) {
    errors.push({ field: "article_body", message: "Required. Provide content blocks or non-empty copy." });
  }

  for (const field of ["key_takeaways", "keywords"] as const) {
    const v = b[field];
    if (v !== undefined && (!Array.isArray(v) || v.some((i) => !isNonEmptyString(i)))) {
      errors.push({ field, message: "Must be an array of non-empty strings." });
    }
  }

  if (b.sources !== undefined) {
    if (!Array.isArray(b.sources)) {
      errors.push({ field: "sources", message: "Must be an array." });
    } else {
      b.sources.forEach((s, i) => {
        const src = s as Record<string, unknown>;
        if (!isNonEmptyString(src?.title) || !isNonEmptyString(src?.url)) {
          errors.push({ field: `sources[${i}]`, message: "Each source needs a title and a url." });
        }
      });
    }
  }

  if (b.image_assets !== undefined) {
    if (!Array.isArray(b.image_assets)) {
      errors.push({ field: "image_assets", message: "Must be an array." });
    } else {
      b.image_assets.forEach((a, i) => {
        const asset = a as Record<string, unknown>;
        if (!isNonEmptyString(asset?.url) || typeof asset?.alt !== "string") {
          errors.push({ field: `image_assets[${i}]`, message: "Each asset needs a url and alt text." });
        }
      });
    }
  }

  if (b.publish_status !== undefined && !PUBLISH_STATUSES.includes(b.publish_status as PublishStatus)) {
    errors.push({ field: "publish_status", message: `Must be one of: ${PUBLISH_STATUSES.join(", ")}.` });
  }

  if (errors.length) return { ok: false, errors };
  return { ok: true, value: b as unknown as EditorialSubmission };
}
