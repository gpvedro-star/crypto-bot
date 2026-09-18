import { authenticateEditorialRequest, jsonError } from "@/lib/api-auth";

/**
 * Editorial write API (authenticated).
 *
 * POST  /api/v1/editorial/articles         create a draft
 * PATCH /api/v1/editorial/articles?slug=…  update content / status / category
 *
 * Bodies follow the Article type in content/types.ts. Persistence is not
 * wired yet: requests are authenticated and validated, then acknowledged with
 * 501 so agents can be built against the final contract today.
 */
const REQUIRED = ["title", "slug", "category", "authorSlug", "content"] as const;

export async function POST(request: Request) {
  const auth = authenticateEditorialRequest(request);
  if (!auth.ok) return jsonError(auth.status, auth.message);
  let body: Record<string, unknown>;
  try {
    body = await request.json();
  } catch {
    return jsonError(400, "Invalid JSON body.");
  }
  const missing = REQUIRED.filter((k) => !(k in body));
  if (missing.length) return jsonError(422, "Missing required fields.", { missing });
  return jsonError(501, "Draft persistence is not enabled on this deployment.", { accepted: { status: "draft", by: auth.actor } });
}

export async function PATCH(request: Request) {
  const auth = authenticateEditorialRequest(request);
  if (!auth.ok) return jsonError(auth.status, auth.message);
  const slug = new URL(request.url).searchParams.get("slug");
  if (!slug) return jsonError(422, "A slug query parameter is required.");
  return jsonError(501, "Article updates are not enabled on this deployment.", { slug, by: auth.actor });
}
