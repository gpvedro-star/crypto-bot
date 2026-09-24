import { PREVIEW_COOKIE, previewTokenValid } from "@/lib/api-auth";

export const dynamic = "force-dynamic";

/**
 * GET /preview/enter?token=…&id=… — exchanges a preview token for a session
 * cookie and redirects to the draft. The point is that the token then leaves
 * the address bar, so a reviewer sharing their screen or their browser history
 * does not also share the credential.
 *
 * An invalid token gets the same 404 the preview page gives, so this endpoint
 * cannot confirm whether preview is configured.
 */
export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url);
  const token = searchParams.get("token") ?? undefined;
  const id = (searchParams.get("id") ?? "").trim();

  if (!previewTokenValid(token) || !/^[A-Za-z0-9][A-Za-z0-9._-]{0,127}$/.test(id)) {
    return new Response("Not found", { status: 404, headers: { "X-Robots-Tag": "noindex, nofollow" } });
  }

  const secure = new URL(origin).protocol === "https:";
  return new Response(null, {
    status: 303,
    headers: {
      Location: `/preview/articles/${encodeURIComponent(id)}`,
      "X-Robots-Tag": "noindex, nofollow",
      "Cache-Control": "no-store",
      "Set-Cookie": [
        `${PREVIEW_COOKIE}=${encodeURIComponent(token!)}`,
        "Path=/preview",
        "HttpOnly",
        "SameSite=Lax",
        "Max-Age=28800",
        ...(secure ? ["Secure"] : []),
      ].join("; "),
    },
  });
}
