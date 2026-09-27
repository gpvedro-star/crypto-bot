import { randomUUID } from "node:crypto";
import { authenticateEditorialRequest, jsonError } from "@/lib/api-auth";
import { MAX_PAYLOAD_BYTES, validateFactCheckUpdate, wireStatus } from "@/lib/editorial/contract";
import { getEditorialStore, storeBackend } from "@/lib/editorial/store";
import { evaluatePublicationGates } from "@/lib/editorial/publish-gates";
import { revalidateForRecord } from "@/lib/editorial/revalidate";

export const dynamic = "force-dynamic";

/**
 * POST /api/v1/editorial/articles/{content_id}/fact-check
 *
 * Records the Fact Check Agent's result on an existing DRAFT. Accepts only
 * the five fact-check fields; anything else fails the request. Authenticated
 * with NUVORA_FACTCHECK_KEY (or the admin key). The draft key is refused.
 *
 * When the recorded result is PASS, the server runs its own publication gate
 * (lib/editorial/publish-gates.ts) and publishes only if every gate holds.
 * The caller cannot ask for publication and cannot override the gate; a
 * failed gate leaves the record as DRAFT and says why.
 */
export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const requestId = randomUUID();
  const auth = authenticateEditorialRequest(request, { allowFactCheckKey: true });
  if (!auth.ok) return jsonError(auth.status, auth.message);

  const { id } = await params;

  const text = await request.text();
  if (Buffer.byteLength(text, "utf8") > MAX_PAYLOAD_BYTES) return jsonError(413, "Payload too large.");
  let body: unknown;
  try {
    body = JSON.parse(text || "{}");
  } catch {
    return jsonError(400, "Invalid JSON body.");
  }
  const parsed = validateFactCheckUpdate(body);
  if (!parsed.ok) return jsonError(400, "Fact-check update failed validation.", { errors: parsed.errors });

  const store = getEditorialStore();
  if (!store) return jsonError(503, "Editorial storage is not configured on this deployment.", { backend: storeBackend() });

  try {
    const existing = await store.get(id);
    if (!existing) return jsonError(404, "No draft with that id.", { request_id: requestId });
    if (existing.publish_status !== "draft") {
      // Includes a repeated PASS after publication: nothing changes.
      return Response.json(
        {
          success: false,
          content_id: existing.content_id,
          publish_status: wireStatus(existing.publish_status),
          reason: "NOT_DRAFT",
          request_id: requestId,
        },
        { status: 409 },
      );
    }

    const updated = await store.update(id, parsed.value);
    const recorded = updated ? await store.get(id) : null;
    if (!recorded || recorded.fact_check_status !== parsed.value.fact_check_status) {
      throw new Error("fact-check result did not persist");
    }
    console.log("[editorial] fact check recorded", { requestId, id, role: auth.role, status: recorded.fact_check_status });

    const base = {
      success: true,
      content_id: recorded.content_id,
      fact_check_status: recorded.fact_check_status,
      fact_check_issues_count: recorded.fact_check_issues_count,
      request_id: requestId,
    };

    if (recorded.fact_check_status !== "PASS") {
      return Response.json({
        ...base,
        publish_status: wireStatus(recorded.publish_status),
        auto_publish: { attempted: false, published: false, reason: recorded.fact_check_status === "BLOCKED" ? "ARTICLE_BLOCKED" : "FACT_CHECK_NOT_PASSED" },
      });
    }

    const gate = await evaluatePublicationGates(recorded, store);
    if (!gate.pass) {
      console.log("[editorial] auto-publish declined", { requestId, id, reason: gate.reason });
      return Response.json({
        ...base,
        publish_status: wireStatus(recorded.publish_status),
        auto_publish: { attempted: true, published: false, reason: gate.reason, detail: gate.detail },
      });
    }

    const published = await store.setStatus(id, "published");
    const check = published ? await store.get(id) : null;
    if (!check || check.publish_status !== "published") throw new Error("publication did not persist");
    const revalidated = revalidateForRecord(check);
    console.log("[editorial] auto-published", { requestId, id, slug: check.slug });

    return Response.json({
      ...base,
      publish_status: wireStatus(check.publish_status),
      slug: check.slug,
      published_url: check.url,
      published_at: check.published_at,
      auto_publish: { attempted: true, published: true },
      revalidated,
    });
  } catch (error) {
    console.error("[editorial] fact-check update failed", { requestId, id, error: String(error) });
    return jsonError(500, "Could not record the fact-check result.", { request_id: requestId });
  }
}
