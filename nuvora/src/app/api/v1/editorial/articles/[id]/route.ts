import { randomUUID } from "node:crypto";
import { authenticateEditorialRequest, jsonError } from "@/lib/api-auth";
import { getEditorialStore, storeBackend } from "@/lib/editorial/store";
import { draftResponse } from "@/lib/editorial/response";
import { revalidateForRecord } from "@/lib/editorial/revalidate";

export const dynamic = "force-dynamic";

/**
 * GET /api/v1/editorial/articles/{id}
 *
 * Reads a draft back by its content_id: current publish_status, slug and the
 * URL it will occupy once published. `full=1` returns the stored record so
 * the desk can review the submitted copy.
 */
export async function GET(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const requestId = randomUUID();
  const auth = authenticateEditorialRequest(request, { allowDraftKey: true });
  if (!auth.ok) return jsonError(auth.status, auth.message);

  const { id } = await params;
  const store = getEditorialStore();
  if (!store) {
    console.log("[editorial] read: no store configured", { requestId, id, backend: storeBackend() });
    return jsonError(503, "Editorial storage is not configured on this deployment.", { backend: storeBackend(), request_id: requestId });
  }

  try {
    const record = await store.get(id);
    console.log("[editorial] read", { requestId, id, backend: storeBackend(), found: Boolean(record) });
    if (!record) return jsonError(404, "No draft with that id.", { request_id: requestId });
    if (auth.role === "draft" && record.publish_status !== "draft") {
      return jsonError(403, "This credential can only read drafts.", { request_id: requestId });
    }
    const full = new URL(request.url).searchParams.get("full") === "1";
    return Response.json(
      { ...draftResponse(record, false), ...(full ? { record } : {}) },
      { headers: { "X-Request-Id": requestId } },
    );
  } catch (error) {
    console.error("[editorial] read failed", { requestId, id, backend: storeBackend(), error: String(error) });
    return jsonError(500, "Could not read the draft from storage.", { request_id: requestId });
  }
}

/**
 * DELETE /api/v1/editorial/articles/{id}
 *
 * Removes a record and releases its slug. Used to clear test submissions;
 * deleting a published record also takes it off the public site immediately.
 */
export async function DELETE(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const auth = authenticateEditorialRequest(request);
  if (!auth.ok) return jsonError(auth.status, auth.message);

  const { id } = await params;
  const store = getEditorialStore();
  if (!store) {
    return jsonError(503, "Editorial storage is not configured on this deployment.", { backend: storeBackend() });
  }

  try {
    const existing = await store.get(id);
    if (!existing) return jsonError(404, "No draft with that id.");
    await store.remove(id);
    const revalidated = revalidateForRecord(existing);
    return Response.json({ success: true, deleted: true, content_id: id, slug: existing.slug, revalidated });
  } catch (error) {
    console.error("[editorial] delete failed", { id, error: String(error) });
    return jsonError(500, "Could not delete the record from storage.");
  }
}
