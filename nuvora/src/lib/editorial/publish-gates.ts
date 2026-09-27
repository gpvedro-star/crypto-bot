import { getAllArticles } from "@/lib/content";
import type { EditorialRecord } from "./contract";
import { isValidContentId, isValidSlug } from "./contract";
import type { EditorialStore } from "./store";
import { safeLinkUrl, safeText, toContentBlocks } from "./body";
import { isKnownCategory } from "./publish-map";

/**
 * The server's automatic publication decision.
 *
 * Deterministic and fail-closed: it reads only the stored record and a slug
 * lookup, and returns PASS only when every gate holds. No model is consulted
 * and nothing in a request can override it. It does not re-check facts; it
 * checks that the workflow's fact check was recorded as a clean PASS.
 */
export type GateReason =
  | "NOT_DRAFT"
  | "NOT_AUTOMATION_SUBMISSION"
  | "INVALID_PROJECT"
  | "INVALID_CONTENT_ID"
  | "MISSING_REQUIRED_FIELD"
  | "UNRENDERABLE_BODY"
  | "INVALID_CATEGORY"
  | "INVALID_SLUG"
  | "DUPLICATE_SLUG"
  | "NO_SOURCES"
  | "ARTICLE_BLOCKED"
  | "FACT_CHECK_MISSING"
  | "FACT_CHECK_NOT_PASSED"
  | "UNRESOLVED_FACT_CHECK_ISSUES"
  | "NEEDS_HUMAN_REVIEW";

export type GateResult = { pass: true } | { pass: false; reason: GateReason; detail: string };

const fail = (reason: GateReason, detail: string): GateResult => ({ pass: false, reason, detail });

export async function evaluatePublicationGates(record: EditorialRecord, store: EditorialStore): Promise<GateResult> {
  // Lifecycle: only a draft can be published, and only once.
  if (record.publish_status !== "draft") {
    return fail("NOT_DRAFT", `publish_status is ${record.publish_status.toUpperCase()}`);
  }
  // Only records the automated workflow submitted. Drafts written or edited
  // with the admin key — including records that predate this field — are
  // the owner's to publish by hand.
  if (record.submitted_via !== "automation") {
    return fail("NOT_AUTOMATION_SUBMISSION", "Only drafts submitted by the automated workflow can publish automatically.");
  }
  if (record.project !== "ai") return fail("INVALID_PROJECT", `project is ${String(record.project).toUpperCase()}`);
  if (!record.content_id || !isValidContentId(record.content_id)) return fail("INVALID_CONTENT_ID", "content_id is missing or malformed");

  // Required content.
  const missing: string[] = [];
  if (!safeText(record.final_headline, 300)) missing.push("final_headline");
  if (!safeText(record.summary, 1200)) missing.push("summary");
  if (record.article_body === undefined || (Array.isArray(record.article_body) ? record.article_body.length === 0 : !safeText(record.article_body))) {
    missing.push("article_body");
  }
  if (!safeText(record.category, 100)) missing.push("category");
  if (!safeText(record.slug, 200)) missing.push("slug");
  if (!safeText(record.seo_title, 200)) missing.push("seo_title");
  if (!safeText(record.seo_description, 320)) missing.push("seo_description");
  if (!Array.isArray(record.sources) || record.sources.length === 0) missing.push("sources");
  if (missing.length) return fail("MISSING_REQUIRED_FIELD", missing.join(", "));

  if (toContentBlocks(record.article_body).length === 0) return fail("UNRENDERABLE_BODY", "article_body produced no renderable content");
  if (!isKnownCategory(record.category)) return fail("INVALID_CATEGORY", `unknown category "${record.category}"`);

  // The slug must be well formed, owned by this record, and not already a
  // repository article (which would win the URL and hide this one).
  if (!isValidSlug(record.slug)) return fail("INVALID_SLUG", record.slug);
  const owner = await store.ownerOfSlug(record.slug);
  if (owner !== record.content_id) return fail("DUPLICATE_SLUG", `slug is held by ${owner ?? "no record"}`);
  if (getAllArticles().some((a) => a.slug === record.slug)) return fail("DUPLICATE_SLUG", "slug belongs to a site article");

  const usableSources = (record.sources ?? []).filter((s) => safeText(s?.title, 300) && safeLinkUrl(s?.url));
  if (usableSources.length === 0) return fail("NO_SOURCES", "no source has both a title and an http(s) URL");

  // Blocking labels from anywhere in the workflow.
  if (record.fact_check_status === "BLOCKED" || /^blocked$/i.test(String(record.status ?? "").trim())) {
    return fail("ARTICLE_BLOCKED", "the workflow marked this article BLOCKED");
  }
  if (record.needs_human_review === true || /^needs[_\s-]?human[_\s-]?review$/i.test(String(record.status ?? "").trim())) {
    return fail("NEEDS_HUMAN_REVIEW", "the workflow asked for a human review");
  }

  // The fact check itself.
  if (!record.fact_check_status) return fail("FACT_CHECK_MISSING", "no fact-check result recorded");
  if (record.fact_check_status !== "PASS") return fail("FACT_CHECK_NOT_PASSED", `fact_check_status is ${record.fact_check_status}`);
  if (record.fact_check_issues_count === undefined || record.fact_check_issues_count === null) {
    return fail("FACT_CHECK_MISSING", "fact_check_issues_count not recorded");
  }
  if (record.fact_check_issues_count !== 0) {
    return fail("UNRESOLVED_FACT_CHECK_ISSUES", `${record.fact_check_issues_count} open issue(s)`);
  }
  const unresolved = (record.verified_facts ?? []).filter((f) => f?.status === "CONFLICTING" || f?.status === "OUTDATED");
  if (unresolved.length) return fail("UNRESOLVED_FACT_CHECK_ISSUES", `${unresolved.length} claim(s) CONFLICTING or OUTDATED`);

  return { pass: true };
}
