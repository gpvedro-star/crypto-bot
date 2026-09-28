import fs from "node:fs";
import path from "node:path";
import { NextResponse } from "next/server";
import { getStudio } from "@/core/studio";

/** Serves QA screenshots (whitelisted file names only). */
export async function GET(_: Request, { params }: { params: Promise<{ id: string; name: string }> }) {
  const { id, name } = await params;
  if (!/^(desktop|mobile)-(full|hero)\.png$/.test(name)) return NextResponse.json({ error: "Not found" }, { status: 404 });
  const file = path.join(getStudio().orchestrator.store(id).root, "qa", name);
  if (!fs.existsSync(file)) return NextResponse.json({ error: "Not found" }, { status: 404 });
  return new NextResponse(fs.readFileSync(file), { headers: { "content-type": "image/png", "cache-control": "no-store" } });
}
