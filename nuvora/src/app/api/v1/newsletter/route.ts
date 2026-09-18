import { jsonError } from "@/lib/api-auth";

const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

/**
 * POST /api/v1/newsletter { email, source }
 * Validates and hands off to the email provider. The provider integration is
 * behind NEWSLETTER_PROVIDER_URL so the form works in every environment.
 */
export async function POST(request: Request) {
  let body: { email?: string; source?: string };
  try {
    body = await request.json();
  } catch {
    return jsonError(400, "Invalid request body.");
  }
  const email = (body.email ?? "").trim().toLowerCase();
  if (!EMAIL.test(email) || email.length > 254) return jsonError(422, "Please enter a valid email address.");

  const providerUrl = process.env.NEWSLETTER_PROVIDER_URL;
  if (providerUrl) {
    try {
      const res = await fetch(providerUrl, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${process.env.NEWSLETTER_PROVIDER_KEY ?? ""}` },
        body: JSON.stringify({ email, source: body.source ?? "site", tags: ["nuvora-brief"] }),
      });
      if (!res.ok) return jsonError(502, "We couldn't reach the newsletter service. Please try again in a moment.");
    } catch {
      return jsonError(502, "We couldn't reach the newsletter service. Please try again in a moment.");
    }
  }
  return Response.json({ ok: true, message: "You're on the list. Welcome to NUVORA." });
}
