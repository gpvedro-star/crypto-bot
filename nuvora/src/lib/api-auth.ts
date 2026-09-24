import { timingSafeEqual } from "node:crypto";

/**
 * Editorial API authentication.
 *
 * Automation agents authenticate with a bearer token compared in constant
 * time against NUVORA_EDITORIAL_API_KEY. When the key is unset, the write
 * API is disabled entirely — there is no default credential.
 */
export type AuthResult = { ok: true; actor: string } | { ok: false; status: 401 | 503; message: string };

export function authenticateEditorialRequest(request: Request): AuthResult {
  const expected = process.env.NUVORA_EDITORIAL_API_KEY;
  if (!expected) {
    return { ok: false, status: 503, message: "Editorial API is not enabled on this deployment." };
  }
  const header = request.headers.get("authorization") ?? "";
  const token = header.startsWith("Bearer ") ? header.slice(7).trim() : "";
  if (!token) return { ok: false, status: 401, message: "Missing bearer token." };
  const a = Buffer.from(token);
  const b = Buffer.from(expected);
  if (a.length !== b.length || !timingSafeEqual(a, b)) {
    return { ok: false, status: 401, message: "Invalid credentials." };
  }
  return { ok: true, actor: request.headers.get("x-nuvora-agent") ?? "api-client" };
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
