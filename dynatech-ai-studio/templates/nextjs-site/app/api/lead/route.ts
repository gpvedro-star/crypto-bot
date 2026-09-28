import { NextResponse } from "next/server";

/** Very small in-memory rate limit (per instance). Replace with a shared store for multi-instance deploys. */
const hits = new Map<string, number[]>();
function limited(ip: string) {
  const now = Date.now();
  const recent = (hits.get(ip) ?? []).filter((t) => now - t < 60_000);
  recent.push(now);
  hits.set(ip, recent);
  return recent.length > 5;
}

const clean = (v: unknown, max: number) => (typeof v === "string" ? v.trim().slice(0, max) : "");

export async function POST(req: Request) {
  const ip = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? "unknown";
  if (limited(ip)) return NextResponse.json({ ok: false, error: "Too many requests" }, { status: 429 });

  let body: Record<string, unknown>;
  try { body = await req.json(); } catch { return NextResponse.json({ ok: false, error: "Invalid request" }, { status: 400 }); }

  // Honeypot: real users never fill this field.
  if (clean(body.company, 100)) return NextResponse.json({ ok: true });

  const lead = {
    name: clean(body.name, 120),
    email: clean(body.email, 200),
    phone: clean(body.phone, 40),
    projectType: clean(body.projectType, 120),
    message: clean(body.message, 4000),
    receivedAt: new Date().toISOString(),
  };
  if (!lead.name || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(lead.email)) {
    return NextResponse.json({ ok: false, error: "Name and a valid email are required" }, { status: 422 });
  }

  const hook = process.env.LEAD_WEBHOOK_URL;
  if (!hook) {
    // Not configured: surface clearly in server logs instead of silently dropping the lead.
    console.warn("[lead] LEAD_WEBHOOK_URL is not set. Lead was NOT delivered:", lead.email);
    return NextResponse.json({ ok: false, error: "Inquiries are not connected yet. Please contact us directly." }, { status: 503 });
  }
  try {
    const res = await fetch(hook, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(lead) });
    if (!res.ok) throw new Error(`Webhook ${res.status}`);
    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("[lead] delivery failed", err);
    return NextResponse.json({ ok: false, error: "Could not send your inquiry. Please try again." }, { status: 502 });
  }
}
