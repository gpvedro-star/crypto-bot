import { NextResponse } from "next/server";
import { getStudio } from "@/core/studio";

/** Resume a project whose process restarted mid-run. Finished stages are skipped. */
export async function POST(_: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const { orchestrator } = getStudio();
  const state = orchestrator.store(id).getState();
  if (!state) return NextResponse.json({ error: "Not found" }, { status: 404 });
  void orchestrator.run(id, { mode: state.mode });
  return NextResponse.json({ ok: true });
}
