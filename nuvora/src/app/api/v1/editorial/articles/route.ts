import { authenticateEditorialRequest, jsonError } from "@/lib/api-auth";
import { DRAFT_FIRST, validateSubmission } from "@/lib/editorial/contract";
import { getEditorialStore, toDraftRecord } from "@/lib/editorial/store";

/**
 * Editorial write API (authenticated).
 *
 * POST  /api/v1/editorial/articles        create a DRAFT
 * PATCH /api/v1/editorial/articles?id=…   update a draft
 *
 * Draft-first: a `publish_status` in the payload is never honoured here.
 * Publication is a separate call to /api/v1/editorial/articles/{id}/publish,
 * so automation cannot put copy in front of readers on its own.
 */
export async function POST(request: Request) {
  const auth = authenticateEditorialRequest(request);
  if (!auth.ok) return jsonError(auth.status, auth.message);

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return jsonError(400, "Invalid JSON body.");
  }

  const parsed = validateSubmission(body);
  if (!parsed.ok) return jsonError(422, "Submission failed validation.", { errors: parsed.errors });

  const record = toDraftRecord(parsed.value);
  const store = getEditorialStore();

  if (!store) {
    return jsonError(501, "Draft persistence is not enabled on this deployment.", {
      would_create: record,
      publish_status: DRAFT_FIRST,
      by: auth.actor,
    });
  }

  const created = await store.create(parsed.value);
  return Response.json({ data: created }, { status: 201 });
}

export async function PATCH(request: Request) {
  const auth = authenticateEditorialRequest(request);
  if (!auth.ok) return jsonError(auth.status, auth.message);

  const id = new URL(request.url).searchParams.get("id");
  if (!id) return jsonError(422, "An id query parameter is required.");

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return jsonError(400, "Invalid JSON body.");
  }
  if (typeof body !== "object" || body === null || Array.isArray(body)) {
    return jsonError(422, "Expected a JSON object.");
  }
  if ("publish_status" in (body as Record<string, unknown>)) {
    return jsonError(409, "publish_status cannot be changed here. Use the publish endpoint.");
  }

  const store = getEditorialStore();
  if (!store) {
    return jsonError(501, "Draft persistence is not enabled on this deployment.", { id, by: auth.actor });
  }

  const updated = await store.update(id, body as Record<string, never>);
  if (!updated) return jsonError(404, "No draft with that id.");
  return Response.json({ data: updated });
}
