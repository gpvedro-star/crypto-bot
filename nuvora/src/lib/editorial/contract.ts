/**
 * NUVORA Editorial API contract.
 *
 * The shape a publishing agent submits. Deliberately independent of the
 * site's own `Article` type: the agent speaks this contract, and the desk
 * maps an approved record into site content. Keeping them apart is what lets
 * a second project (travel) submit through the same endpoint without the AI
 * publication's content model leaking into it.
 *
 * Enums are accepted case-insensitively — the editorial office works in
 * upper case ("AI", "DRAFT") and this store keeps them lower case — and are
 * echoed back in upper case so the agent sees what it sent.
 */

/** Projects the content model can carry. */
export const EDITORIAL_PROJECTS = ["ai", "travel"] as const;
export type EditorialProject = (typeof EDITORIAL_PROJECTS)[number];

/**
 * Projects accepted today. `travel` stays in the model so a second
 * publication can be switched on without reshaping the contract, but nothing
 * renders it yet, so submissions for it are refused rather than silently
 * stored somewhere no one will look.
 */
export const ENABLED_PROJECTS: EditorialProject[] = ["ai"];

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
  /** The fact-check verdict for this claim, when the workflow records one. */
  status?: VerifiedFactStatus;
}

/**
 * Fact-check verdicts produced by the editorial workflow. The server never
 * re-checks facts; it only refuses to auto-publish unless the recorded result
 * is a clean PASS. Anything else keeps the article in DRAFT.
 */
export const FACT_CHECK_STATUSES = ["PASS", "BLOCKED", "PARTIAL", "CONFLICTING", "OUTDATED"] as const;
export type FactCheckStatus = (typeof FACT_CHECK_STATUSES)[number];

export const VERIFIED_FACT_STATUSES = ["VERIFIED", "PARTIAL", "CONFLICTING", "OUTDATED"] as const;
export type VerifiedFactStatus = (typeof VERIFIED_FACT_STATUSES)[number];

/** The only fields the fact-check credential may write. */
export const FACT_CHECK_FIELDS = [
  "fact_check_status",
  "fact_check_issues_count",
  "fact_check_completed_at",
  "verified_facts",
  "needs_human_review",
] as const;
export type FactCheckField = (typeof FACT_CHECK_FIELDS)[number];

/** Who submitted a record. Set by the server from the credential, never from the payload. */
export type SubmittedVia = "automation" | "admin";

export interface EditorialSubmission {
  content_id: string;
  project: EditorialProject;
  /** Upstream workflow label from the editorial office. Free text. */
  status?: string;
  priority?: string;
  topic?: string;
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
  /** Per-platform captions prepared upstream. Free-form object. */
  social_content?: Record<string, unknown>;
  seo_title?: string;
  seo_description?: string;
  slug: string;
  keywords?: string[];
  author: string;
  notes?: string;
  created_at?: string;
  updated_at?: string;
  published_at?: string;
  /** Overall fact-check result from the workflow's Fact Check Agent. */
  fact_check_status?: FactCheckStatus;
  /** Unresolved fact-check issues. Auto-publish requires exactly 0. */
  fact_check_issues_count?: number;
  /** When the fact check finished (ISO 8601). */
  fact_check_completed_at?: string;
  /** Set by the workflow when a person must look before publication. */
  needs_human_review?: boolean;
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
  /** Server-set provenance: only automation-submitted records can be auto-published. */
  submitted_via?: SubmittedVia;
  /** Where the article will live once published. */
  url: string;
}

/**
 * Draft-first rule. Automation cannot publish: submissions are forced to
 * `draft` regardless of what the payload asks for, and publication is a
 * separate authenticated call against a specific record.
 */
export const DRAFT_FIRST: PublishStatus = "draft";

/** Upper-case form for API responses, matching the editorial office's vocabulary. */
export function wireStatus(status: PublishStatus): string {
  return status.toUpperCase();
}

const SLUG_RE = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;
const CONTENT_ID_RE = /^[A-Za-z0-9][A-Za-z0-9._-]{0,127}$/;

/** Largest accepted payload. Keeps a runaway agent from filling the store. */
export const MAX_PAYLOAD_BYTES = 512 * 1024;

export interface ValidationFailure {
  field: string;
  message: string;
}

function isNonEmptyString(v: unknown): v is string {
  return typeof v === "string" && v.trim().length > 0;
}

/** Derives a slug from a headline when the agent does not supply one. */
export function slugify(input: string): string {
  return input
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/['’]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 80)
    .replace(/-+$/g, "");
}

/**
 * Rejects executable markup anywhere in the payload.
 *
 * Article bodies are rendered as text by the site's typed blocks, so markup
 * has no legitimate use here. Refusing it at the boundary means a compromised
 * or confused agent cannot park a script tag in the store waiting for someone
 * to render it.
 */
const DANGEROUS = /<\s*(script|iframe|object|embed|style|link|meta|svg)\b|<\s*\/\s*(script|iframe)\b|javascript\s*:|data\s*:\s*text\/html|\son[a-z]+\s*=/i;

function findMarkup(value: unknown, path: string, out: ValidationFailure[]): void {
  if (out.length > 5) return;
  if (typeof value === "string") {
    if (DANGEROUS.test(value)) out.push({ field: path, message: "Executable markup is not accepted." });
    return;
  }
  if (Array.isArray(value)) {
    value.forEach((v, i) => findMarkup(v, `${path}[${i}]`, out));
    return;
  }
  if (value && typeof value === "object") {
    for (const [k, v] of Object.entries(value as Record<string, unknown>)) {
      findMarkup(v, path ? `${path}.${k}` : k, out);
    }
  }
}

/**
 * Validates and normalizes an agent submission. Returns the record input on
 * success, or the full list of problems so an agent can fix them in one pass.
 */
export function validateSubmission(
  body: unknown,
): { ok: true; value: EditorialSubmission } | { ok: false; errors: ValidationFailure[] } {
  const errors: ValidationFailure[] = [];
  if (typeof body !== "object" || body === null || Array.isArray(body)) {
    return { ok: false, errors: [{ field: "body", message: "Expected a JSON object." }] };
  }
  const b = { ...(body as Record<string, unknown>) };

  // Required by the editorial office's content object.
  for (const field of ["content_id", "final_headline", "summary", "category"] as const) {
    if (!isNonEmptyString(b[field])) errors.push({ field, message: "Required, must be a non-empty string." });
  }

  if (isNonEmptyString(b.content_id) && !CONTENT_ID_RE.test(b.content_id.trim())) {
    errors.push({
      field: "content_id",
      message: "Letters, digits, dot, underscore and hyphen only; 128 characters max.",
    });
  }

  const project = isNonEmptyString(b.project) ? b.project.trim().toLowerCase() : "";
  if (!EDITORIAL_PROJECTS.includes(project as EditorialProject)) {
    errors.push({ field: "project", message: `Must be one of: ${EDITORIAL_PROJECTS.join(", ")}.` });
  } else if (!ENABLED_PROJECTS.includes(project as EditorialProject)) {
    errors.push({ field: "project", message: `Not accepted yet. Currently enabled: ${ENABLED_PROJECTS.join(", ")}.` });
  }

  const bodyValue = b.article_body;
  const bodyOk = Array.isArray(bodyValue) ? bodyValue.length > 0 : isNonEmptyString(bodyValue);
  if (!bodyOk) {
    errors.push({ field: "article_body", message: "Required. Provide content blocks or non-empty copy." });
  }

  // Slug is optional: derived from the headline when absent.
  let slug = isNonEmptyString(b.slug) ? b.slug.trim().toLowerCase() : "";
  if (!slug && isNonEmptyString(b.final_headline)) slug = slugify(b.final_headline);
  if (!slug) {
    errors.push({ field: "slug", message: "Could not derive a slug; supply one." });
  } else if (!SLUG_RE.test(slug)) {
    errors.push({ field: "slug", message: "Must be lowercase words separated by single hyphens." });
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

  if (b.social_content !== undefined && (typeof b.social_content !== "object" || b.social_content === null || Array.isArray(b.social_content))) {
    errors.push({ field: "social_content", message: "Must be an object keyed by platform." });
  }

  // Server-owned: never accepted from a payload.
  delete b.submitted_via;

  let factCheckStatus: FactCheckStatus | undefined;
  if (b.fact_check_status !== undefined && b.fact_check_status !== null) {
    const v = isNonEmptyString(b.fact_check_status) ? b.fact_check_status.trim().toUpperCase().replace(/[\s-]+/g, "_") : "";
    if (!FACT_CHECK_STATUSES.includes(v as FactCheckStatus)) {
      errors.push({ field: "fact_check_status", message: `Must be one of: ${FACT_CHECK_STATUSES.join(", ")}.` });
    } else {
      factCheckStatus = v as FactCheckStatus;
    }
  }
  if (
    b.fact_check_issues_count !== undefined &&
    b.fact_check_issues_count !== null &&
    !(Number.isInteger(b.fact_check_issues_count) && (b.fact_check_issues_count as number) >= 0)
  ) {
    errors.push({ field: "fact_check_issues_count", message: "Must be a whole number, 0 or more." });
  }
  if (
    b.fact_check_completed_at !== undefined &&
    b.fact_check_completed_at !== null &&
    !(isNonEmptyString(b.fact_check_completed_at) && !Number.isNaN(Date.parse(b.fact_check_completed_at)))
  ) {
    errors.push({ field: "fact_check_completed_at", message: "Must be an ISO 8601 date-time." });
  }
  if (b.needs_human_review !== undefined && b.needs_human_review !== null && typeof b.needs_human_review !== "boolean") {
    errors.push({ field: "needs_human_review", message: "Must be true or false." });
  }
  if (b.verified_facts !== undefined) {
    if (!Array.isArray(b.verified_facts)) {
      errors.push({ field: "verified_facts", message: "Must be an array." });
    } else {
      b.verified_facts = b.verified_facts.map((f, i) => {
        const fact = (f && typeof f === "object" ? { ...(f as Record<string, unknown>) } : {}) as Record<string, unknown>;
        if (fact.status !== undefined && fact.status !== null) {
          const v = isNonEmptyString(fact.status) ? fact.status.trim().toUpperCase() : "";
          if (!VERIFIED_FACT_STATUSES.includes(v as VerifiedFactStatus)) {
            errors.push({ field: `verified_facts[${i}].status`, message: `Must be one of: ${VERIFIED_FACT_STATUSES.join(", ")}.` });
          } else {
            fact.status = v;
          }
        }
        return fact;
      });
    }
  }

  const publishStatus = isNonEmptyString(b.publish_status) ? b.publish_status.trim().toLowerCase() : undefined;
  if (publishStatus !== undefined && !PUBLISH_STATUSES.includes(publishStatus as PublishStatus)) {
    errors.push({ field: "publish_status", message: `Must be one of: ${PUBLISH_STATUSES.join(", ")}.` });
  }

  findMarkup(b, "", errors);

  if (errors.length) return { ok: false, errors };

  return {
    ok: true,
    value: {
      ...(b as unknown as EditorialSubmission),
      content_id: (b.content_id as string).trim(),
      project: project as EditorialProject,
      slug,
      // The publication byline. The site has no per-person author records.
      author: isNonEmptyString(b.author) ? b.author.trim() : "NUVORA",
      publish_status: publishStatus as PublishStatus | undefined,
      ...(factCheckStatus ? { fact_check_status: factCheckStatus } : {}),
    },
  };
}

/**
 * A fact-check update. Only the five fact-check fields are accepted; any other
 * key fails the whole request, so the credential cannot touch article content
 * even by accident.
 */
export type FactCheckUpdate = Partial<Pick<EditorialSubmission, FactCheckField>>;

export function validateFactCheckUpdate(
  body: unknown,
): { ok: true; value: FactCheckUpdate } | { ok: false; errors: ValidationFailure[] } {
  if (typeof body !== "object" || body === null || Array.isArray(body)) {
    return { ok: false, errors: [{ field: "body", message: "Expected a JSON object." }] };
  }
  const b = body as Record<string, unknown>;
  const errors: ValidationFailure[] = [];

  const unknownKeys = Object.keys(b).filter((k) => !FACT_CHECK_FIELDS.includes(k as FactCheckField));
  for (const k of unknownKeys) errors.push({ field: k, message: "Not a fact-check field; this credential cannot change it." });

  const value: FactCheckUpdate = {};
  if (b.fact_check_status === undefined) {
    errors.push({ field: "fact_check_status", message: `Required. One of: ${FACT_CHECK_STATUSES.join(", ")}.` });
  } else {
    const v = isNonEmptyString(b.fact_check_status) ? b.fact_check_status.trim().toUpperCase() : "";
    if (!FACT_CHECK_STATUSES.includes(v as FactCheckStatus)) {
      errors.push({ field: "fact_check_status", message: `Must be one of: ${FACT_CHECK_STATUSES.join(", ")}.` });
    } else value.fact_check_status = v as FactCheckStatus;
  }

  if (b.fact_check_issues_count === undefined) {
    errors.push({ field: "fact_check_issues_count", message: "Required. A whole number, 0 or more." });
  } else if (!(Number.isInteger(b.fact_check_issues_count) && (b.fact_check_issues_count as number) >= 0)) {
    errors.push({ field: "fact_check_issues_count", message: "Must be a whole number, 0 or more." });
  } else value.fact_check_issues_count = b.fact_check_issues_count as number;

  if (b.fact_check_completed_at !== undefined) {
    if (!(isNonEmptyString(b.fact_check_completed_at) && !Number.isNaN(Date.parse(b.fact_check_completed_at)))) {
      errors.push({ field: "fact_check_completed_at", message: "Must be an ISO 8601 date-time." });
    } else value.fact_check_completed_at = new Date(Date.parse(b.fact_check_completed_at)).toISOString();
  }

  if (b.needs_human_review !== undefined) {
    if (typeof b.needs_human_review !== "boolean") errors.push({ field: "needs_human_review", message: "Must be true or false." });
    else value.needs_human_review = b.needs_human_review;
  }

  if (b.verified_facts !== undefined) {
    if (!Array.isArray(b.verified_facts)) {
      errors.push({ field: "verified_facts", message: "Must be an array." });
    } else {
      value.verified_facts = b.verified_facts.map((f, i) => {
        const fact = (f && typeof f === "object" ? f : {}) as Record<string, unknown>;
        if (!isNonEmptyString(fact.claim) || !isNonEmptyString(fact.source)) {
          errors.push({ field: `verified_facts[${i}]`, message: "Each fact needs a claim and a source." });
        }
        let status: VerifiedFactStatus | undefined;
        if (fact.status !== undefined) {
          const v = isNonEmptyString(fact.status) ? fact.status.trim().toUpperCase() : "";
          if (!VERIFIED_FACT_STATUSES.includes(v as VerifiedFactStatus)) {
            errors.push({ field: `verified_facts[${i}].status`, message: `Must be one of: ${VERIFIED_FACT_STATUSES.join(", ")}.` });
          } else status = v as VerifiedFactStatus;
        }
        return {
          claim: String(fact.claim ?? ""),
          source: String(fact.source ?? ""),
          ...(isNonEmptyString(fact.verifiedAt) ? { verifiedAt: fact.verifiedAt } : {}),
          ...(status ? { status } : {}),
        };
      });
    }
  }

  findMarkup(b, "", errors);
  return errors.length ? { ok: false, errors } : { ok: true, value };
}

/** Exposed for the auto-publish gates, which re-check stored values independently. */
export function isValidContentId(id: string): boolean {
  return CONTENT_ID_RE.test(id);
}

export function isValidSlug(slug: string): boolean {
  return SLUG_RE.test(slug);
}
