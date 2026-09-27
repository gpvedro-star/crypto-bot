import { timingSafeEqual } from "node:crypto";

/**
 * Editorial API authentication.
 *
 * Two bearer credentials, both compared in constant time:
 *
 *   NUVORA_EDITORIAL_API_KEY  owner/admin — every editorial action.
 *   NUVORA_GROK_DRAFT_KEY     the Grok bot — submit and re-submit DRAFTs, and
 *                             read a draft back. Nothing else.
 *
 * Admin-only is the default: a route accepts the draft key only when it
 * passes `{ allowDraftKey: true }`, so any route added later is closed to it
 * unless someone opens it deliberately. A draft-key request to any other
 * route gets 403. With neither key set the API is off (503); there is no
 * default credential.
 */
export type EditorialRole = "admin" | "draft";

export type AuthResult =
  | { ok: true; actor: string; role: EditorialRole }
  | { ok: false; status: 401 | 403 | 503; message: string };

function matches(token: string, expected: string | undefined): boolean {
  if (!expected) return false;
  const a = Buffer.from(token);
  const b = Buffer.from(expected);
  return a.length === b.length && timingSafeEqual(a, b);
}

export function authenticateEditorialRequest(
  request: Request,
  options: { allowDraftKey?: boolean } = {},
): AuthResult {
  const adminKey = process.env.NUVORA_EDITORIAL_API_KEY;
  const draftKey = process.env.NUVORA_GROK_DRAFT_KEY;
  if (!adminKey && !draftKey) {
    return { ok: false, status: 503, message: "Editorial API is not enabled on this deployment." };
  }
  // One value in both variables would make every draft-key request an admin
  // request. Refuse to run in that state rather than guess.
  if (adminKey && draftKey && matches(adminKey, draftKey)) {
    console.error("[editorial] NUVORA_GROK_DRAFT_KEY must differ from NUVORA_EDITORIAL_API_KEY");
    return { ok: false, status: 503, message: "Editorial API is misconfigured on this deployment." };
  }
  const header = request.headers.get("authorization") ?? "";
  const token = header.startsWith("Bearer ") ? header.slice(7).trim() : "";
  if (!token) return { ok: false, status: 401, message: "Missing bearer token." };

  // Evaluate both comparisons so the response time does not reveal which
  // credential a token was closer to.
  const isAdmin = matches(token, adminKey);
  const isDraft = matches(token, draftKey);
  const actor = request.headers.get("x-nuvora-agent") ?? "api-client";

  if (isAdmin) return { ok: true, actor, role: "admin" };
  if (isDraft) {
    if (!options.allowDraftKey) {
      return { ok: false, status: 403, message: "This credential can only submit and read drafts." };
    }
    return { ok: true, actor, role: "draft" };
  }
  return { ok: false, status: 401, message: "Invalid credentials." };
}

export function jsonError(status: number, message: string, extra?: Record<string, unknown>) {
  return Response.json({ error: { status, message, ...extra } }, { status });
}

/** Constant-time comparison for short secrets. */
export function secretMatches(candidate: string | undefined, expected: string | undefined): boolean {
  if (!candidate || !expected) return false;
  const a = Buffer.from(candidate);
  const b = Buffer.from(expected);
  return a.length === b.length && timingSafeEqual(a, b);
}

/**
 * Draft preview credential. Separate from the write API key so a preview link
 * can be handed to a reviewer without granting publishing rights, and absent
 * by default — with no token configured, preview is off.
 */
export function previewTokenValid(candidate: string | undefined): boolean {
  return secretMatches(candidate, process.env.NUVORA_PREVIEW_TOKEN);
}

export const PREVIEW_COOKIE = "nuvora_preview";
