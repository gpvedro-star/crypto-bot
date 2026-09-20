/**
 * Editorial readiness helpers.
 *
 * Parts of the content set are scaffolding written in the NUVORA voice but
 * marked for verification before publication — tool verdicts and pricing notes
 * in particular. Readers should never be shown that scaffolding, and it must
 * not be replaced with invented facts either, so the renderer hides the field
 * until a desk-written value lands.
 */
const PLACEHOLDER = /placeholder/i;

/** True when a content string is scaffolding rather than publishable copy. */
export function isEditorialPlaceholder(value?: string | null): boolean {
  return typeof value === "string" && PLACEHOLDER.test(value);
}

/** Returns the value only when it is safe to show a reader. */
export function publishable(value?: string | null): string | undefined {
  if (!value || isEditorialPlaceholder(value)) return undefined;
  return value;
}
