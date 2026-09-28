import { NextResponse } from "next/server";
import { z } from "zod";
import { getStudio } from "@/core/studio";

const Body = z.object({ checkpoint: z.enum(["strategy", "creative", "homepage", "final"]), approved: z.boolean(), feedback: z.string().max(2000).optional() });

export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const body = Body.safeParse(await req.json().catch(() => null));
  if (!body.success) return NextResponse.json({ error: "Invalid input" }, { status: 422 });
  try {
    getStudio().orchestrator.approve(id, body.data.checkpoint, body.data.approved, body.data.feedback);
    return NextResponse.json({ ok: true });
  } catch (e) { return NextResponse.json({ error: (e as Error).message }, { status: 409 }); }
}
