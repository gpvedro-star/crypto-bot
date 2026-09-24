import { randomUUID } from "node:crypto";
import { authenticateEditorialRequest, jsonError } from "@/lib/api-auth";
import { DRAFT_FIRST, MAX_PAYLOAD_BYTES, validateSubmission, wireStatus } from "@/lib/editorial/contract";
import { getEditorialStore, storeBackend } from "@/lib/editorial/store";
import { draftResponse } from "@/lib/editorial/response";
import { revalidateForRecord } from "@/lib/editorial/revalidate";

/**
 * A write is not "succeeded" until it reads back. Blobs' own promise
 * resolving is not proof of a durable write — this closes that gap by
 * re-reading the record before the caller is told it exists, so a storage
 * fault becomes a 500 the caller can see and retry, never a false 201/200.
 * Logged fields never include the token, headers, cookies or article body.
 */
async function verifyWritten(
  store: ReturnType<typeof getEditorialStore>,
  id: string,
  requestId: string,
  stage: "create" | "update",
) {
  const verify = await store!.get(id);
  const ok = Boolean(verify);
  console.log("[editorial] write verification", { requestId, stage, content_id: id, backend: storeBackend(), verified: ok });
  if (!ok) {
    throw new Error(`Write to storage did not persist for content_id ${id} (backend: ${storeBackend()}).`);
  }
  return verify!;
}

export const dynamic = "force-dynamic";

/**
 * Editorial write API (authenticated).
 *
 * POST  /api/v1/editorial/articles        create or update a DRAFT
 * PATCH /api/v1/editorial/articles?id=…   partial update of a draft
 *
 * Draft-first: `publish_status` in the payload is recorded as the agent's
 * intent and never applied. Publication is a separate call to
 * /api/v1/editorial/articles/{id}/publish, so submitting copy and putting it
 * in front of readers can never be the same request.
 *
 * Idempotent on `content_id`: re-submitting the same id updates that draft
 * rather than creating a second one.
 */
async function readJson(request: Request): Promise<{ ok: true; body: unknown } | { ok: false; response: Response }> {
  const declared = Number(request.headers.get("content-length") ?? 0);
  if (declared > MAX_PAYLOAD_BYTES) {
    return { ok: false, response: jsonError(413, "Payload too large.", { max_bytes: MAX_PAYLOAD_BYTES }) };
  }
  const text = await request.text();
  if (Buffer.byteLength(text, "utf8") > MAX_PAYLOAD_BYTES) {
    return { ok: false, response: jsonError(413, "Payload too large.", { max_bytes: MAX_PAYLOAD_BYTES }) };
  }
  try {
    return { ok: true, body: JSON.parse(text) };
  } catch {
    return { ok: false, response: jsonError(400, "Invalid JSON body.") };
  }
}

export async function POST(request: Request) {
  const requestId = randomUUID();
  const auth = authenticateEditorialRequest(request);
  if (!auth.ok) return jsonError(auth.status, auth.message);

  const parsedBody = await readJson(request);
  if (!parsedBody.ok) return parsedBody.response;

  const parsed = validateSubmission(parsedBody.body);
  if (!parsed.ok) return jsonError(400, "Submission failed validation.", { errors: parsed.errors });

  const store = getEditorialStore();
  if (!store) {
    return jsonError(503, "Editorial storage is not configured on this deployment.", { backend: storeBackend() });
  }

  try {
    // Two different records must not claim the same public URL.
    const slugOwner = await store.ownerOfSlug(parsed.value.slug);
    if (slugOwner && slugOwner !== parsed.value.content_id) {
      return jsonError(409, "That slug already belongs to another draft.", {
        slug: parsed.value.slug,
        owned_by_content_id: slugOwner,
      });
    }

    const existing = await store.get(parsed.value.content_id);
    const record = await store.create(parsed.value);
    // Do not trust the write until it reads back.
    await verifyWritten(store, record.id, requestId, "create");
    const requested = parsed.value.publish_status;
    // An edit to an already-published record should reach readers too.
    if (record.publish_status === "published") revalidateForRecord(record);

    return Response.json(
      {
        ...draftResponse(record, !existing),
        // Say plainly that a publish request was declined rather than ignoring it.
        ...(requested && requested !== DRAFT_FIRST
          ? {
              note: `publish_status ${wireStatus(requested)} was not applied. Submissions are always drafts; publish separately.`,
            }
          : {}),
      },
      { status: existing ? 200 : 201, headers: { "X-Request-Id": requestId } },
    );
  } catch (error) {
    console.error("[editorial] create failed", { requestId, content_id: parsed.value.content_id, backend: storeBackend(), error: String(error) });
    return jsonError(500, "Could not write the draft to storage.", { request_id: requestId });
  }
}

export async function PATCH(request: Request) {
  const requestId = randomUUID();
  const auth = authenticateEditorialRequest(request);
  if (!auth.ok) return jsonError(auth.status, auth.message);

  const id = new URL(request.url).searchParams.get("id");
  if (!id) return jsonError(400, "An id query parameter is required.");

  const parsedBody = await readJson(request);
  if (!parsedBody.ok) return parsedBody.response;
  const body = parsedBody.body;
  if (typeof body !== "object" || body === null || Array.isArray(body)) {
    return jsonError(400, "Expected a JSON object.");
  }
  if ("publish_status" in (body as Record<string, unknown>)) {
    return jsonError(409, "publish_status cannot be changed here. Use the publish endpoint.");
  }

  const store = getEditorialStore();
  if (!store) {
    return jsonError(503, "Editorial storage is not configured on this deployment.", { backend: storeBackend() });
  }

  try {
    const patch = body as Record<string, never>;
    const nextSlug = (body as { slug?: string }).slug;
    if (nextSlug) {
      const owner = await store.ownerOfSlug(nextSlug);
      if (owner && owner !== id) {
        return jsonError(409, "That slug already belongs to another draft.", { slug: nextSlug, owned_by_content_id: owner });
      }
    }
    const updated = await store.update(id, patch);
    if (!updated) return jsonError(404, "No draft with that id.");
    await verifyWritten(store, id, requestId, "update");
    if (updated.publish_status === "published") revalidateForRecord(updated);
    return Response.json(draftResponse(updated, false), { headers: { "X-Request-Id": requestId } });
  } catch (error) {
    console.error("[editorial] update failed", { requestId, id, backend: storeBackend(), error: String(error) });
    return jsonError(500, "Could not write the draft to storage.", { request_id: requestId });
  }
}
