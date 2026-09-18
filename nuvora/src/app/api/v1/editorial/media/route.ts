import { authenticateEditorialRequest, jsonError } from "@/lib/api-auth";

/** POST /api/v1/editorial/media — multipart image upload (authenticated). */
export async function POST(request: Request) {
  const auth = authenticateEditorialRequest(request);
  if (!auth.ok) return jsonError(auth.status, auth.message);
  const type = request.headers.get("content-type") ?? "";
  if (!type.startsWith("multipart/form-data")) return jsonError(415, "Send images as multipart/form-data.");
  return jsonError(501, "Media storage is not enabled on this deployment.", { by: auth.actor });
}
