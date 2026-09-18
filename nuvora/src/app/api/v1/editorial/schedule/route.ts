import { authenticateEditorialRequest, jsonError } from "@/lib/api-auth";

/** POST /api/v1/editorial/schedule { slug, publishAt } — schedule or publish (authenticated). */
export async function POST(request: Request) {
  const auth = authenticateEditorialRequest(request);
  if (!auth.ok) return jsonError(auth.status, auth.message);
  return jsonError(501, "Scheduling is not enabled on this deployment.", { by: auth.actor });
}
