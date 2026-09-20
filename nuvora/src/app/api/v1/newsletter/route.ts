import { jsonError } from "@/lib/api-auth";

const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

/**
 * POST /api/v1/newsletter { email, source }
 *
 * Validates and hands off to the email provider. Until NEWSLETTER_PROVIDER_URL
 * is configured there is nowhere to store an address, so the endpoint says so
 * rather than reporting a subscription that did not happen.
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
  if (!providerUrl) {
    // No list exists yet, so the address cannot be stored. Telling the reader
    // "You're on the list" here would be a promise the site cannot keep.
    return jsonError(503, "Newsletter signup isn't available just yet. Please try again soon.");
  }
  {
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
