import { authenticateEditorialRequest, jsonError } from "@/lib/api-auth";

/** GET /api/v1/analytics?range=7d — aggregated readership for editors and agents (authenticated). */
export function GET(request: Request) {
  const auth = authenticateEditorialRequest(request);
  if (!auth.ok) return jsonError(auth.status, auth.message);
  return jsonError(501, "Analytics are not connected on this deployment.");
}
