import { NextResponse } from "next/server";
import { z } from "zod";
import { getStudio } from "@/core/studio";

const Body = z.object({ action: z.enum(["generate", "skip"]) });

/**
 * The video cost gate. "generate" is the only call in the whole app that spends Higgsfield credits, and it is
 * only reachable through this explicit request. It returns as soon as the job is created; polling runs in the background.
 */
export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const body = Body.safeParse(await req.json().catch(() => null));
  if (!body.success) return NextResponse.json({ error: "action must be 'generate' or 'skip'" }, { status: 422 });
  try {
    const plan = await getStudio().orchestrator.videoAction(id, body.data.action);
    return NextResponse.json({ ok: true, phase: plan.phase, detail: plan.phaseDetail });
  } catch (e) { return NextResponse.json({ error: (e as Error).message }, { status: 409 }); }
}
