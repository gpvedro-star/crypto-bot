import { authenticateEditorialRequest, jsonError } from "@/lib/api-auth";
import { PUBLISH_STATUSES, type PublishStatus } from "@/lib/editorial/contract";
import { getEditorialStore, storeBackend } from "@/lib/editorial/store";
import { draftResponse } from "@/lib/editorial/response";

export const dynamic = "force-dynamic";

/**
 * POST /api/v1/editorial/articles/{id}/publish
 *
 * The explicit, separate transition out of draft. Deliberately its own route
 * and its own call so that submitting copy and putting it in front of readers
 * can never be the same request — and so publication can later be gated behind
 * a stricter scope than submission without touching the write API.
 *
 * Body: { "publish_status": "in_review" | "scheduled" | "published" }
 */
const ALLOWED: PublishStatus[] = PUBLISH_STATUSES.filter((s) => s !== "draft");

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const auth = authenticateEditorialRequest(request);
  if (!auth.ok) return jsonError(auth.status, auth.message);

  const { id } = await params;

  let body: unknown = {};
  try {
    const text = await request.text();
    if (text) body = JSON.parse(text);
  } catch {
    return jsonError(400, "Invalid JSON body.");
  }

  const raw = (body as Record<string, unknown>)?.publish_status ?? "published";
  const requested = typeof raw === "string" ? raw.trim().toLowerCase() : "";
  if (!ALLOWED.includes(requested as PublishStatus)) {
    return jsonError(400, "Invalid publish_status.", { allowed: ALLOWED.map((s) => s.toUpperCase()) });
  }

  const store = getEditorialStore();
  if (!store) {
    return jsonError(503, "Editorial storage is not configured on this deployment.", { backend: storeBackend() });
  }

  try {
    const updated = await store.setStatus(id, requested as PublishStatus);
    if (!updated) return jsonError(404, "No draft with that id.");
    return Response.json(draftResponse(updated, false));
  } catch (error) {
    console.error("[editorial] status change failed", { id, error: String(error) });
    return jsonError(500, "Could not update the draft in storage.");
  }
}
