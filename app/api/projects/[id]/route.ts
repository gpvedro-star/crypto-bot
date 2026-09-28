import fs from "node:fs";
import path from "node:path";
import { NextResponse } from "next/server";
import { getStudio } from "@/core/studio";
import { MEMORY_SECTIONS } from "@/core/types";

export const dynamic = "force-dynamic";

export async function GET(_: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const { orchestrator } = getStudio();
  let mem;
  try { mem = orchestrator.store(id); } catch { return NextResponse.json({ error: "Not found" }, { status: 404 }); }
  const state = mem.getState();
  if (!state) return NextResponse.json({ error: "Not found" }, { status: 404 });
  const sections = Object.fromEntries(MEMORY_SECTIONS.filter((s) => mem.has(s)).map((s) => [s, mem.get(s)]));
  const shotsDir = path.join(mem.root, "qa");
  const screenshots = fs.existsSync(shotsDir) ? fs.readdirSync(shotsDir).filter((f) => f.endsWith(".png")) : [];
  return NextResponse.json({ state, sections, events: mem.events().slice(-200), decisions: mem.decisions(), running: orchestrator.isRunning(id), screenshots });
}
