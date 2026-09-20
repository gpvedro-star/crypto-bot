import { authenticateEditorialRequest, jsonError } from "@/lib/api-auth";
import { PUBLISH_STATUSES, type PublishStatus } from "@/lib/editorial/contract";
import { getEditorialStore } from "@/lib/editorial/store";

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

  const requested = (body as Record<string, unknown>)?.publish_status ?? "published";
  if (!ALLOWED.includes(requested as PublishStatus)) {
    return jsonError(422, "Invalid publish_status.", { allowed: ALLOWED });
  }

  const store = getEditorialStore();
  if (!store) {
    return jsonError(501, "Publishing is not enabled on this deployment.", {
      id,
      requested_status: requested,
      by: auth.actor,
    });
  }

  const updated = await store.setStatus(id, requested as PublishStatus);
  if (!updated) return jsonError(404, "No draft with that id.");
  return Response.json({ data: updated });
}
