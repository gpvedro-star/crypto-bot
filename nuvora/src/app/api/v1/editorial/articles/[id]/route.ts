import { authenticateEditorialRequest, jsonError } from "@/lib/api-auth";
import { getEditorialStore, recordUrl } from "@/lib/editorial/store";

/**
 * GET /api/v1/editorial/articles/{id}
 *
 * Lets a publishing agent read back the record it created — its id, current
 * publish_status and the URL the article will occupy once published.
 */
export async function GET(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const auth = authenticateEditorialRequest(request);
  if (!auth.ok) return jsonError(auth.status, auth.message);

  const { id } = await params;
  const store = getEditorialStore();
  if (!store) {
    return jsonError(501, "Draft persistence is not enabled on this deployment.", {
      id,
      url_pattern: recordUrl("{slug}"),
    });
  }

  const record = await store.get(id);
  if (!record) return jsonError(404, "No draft with that id.");
  return Response.json({ data: record });
}
