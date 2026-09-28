import fs from "node:fs";
import path from "node:path";
import { NextResponse } from "next/server";
import { z } from "zod";
import { projectsDir } from "@/core/config";
import { listProjectIds } from "@/core/memory";
import { getStudio } from "@/core/studio";

export const dynamic = "force-dynamic";

const Body = z.object({
  business: z.string().trim().min(2).max(160),
  location: z.string().trim().min(2).max(160),
  targetAudience: z.string().trim().min(2).max(240),
  style: z.string().trim().min(2).max(240),
  goal: z.string().trim().max(400).optional(),
  notes: z.string().trim().max(1000).optional(),
  businessName: z.string().trim().max(120).optional(),
  mode: z.enum(["autonomous", "supervised"]).default("autonomous"),
  logo: z.object({ name: z.string().max(200), dataBase64: z.string().max(7_000_000) }).optional(),
});

export function GET() {
  const { orchestrator } = getStudio();
  const projects = listProjectIds().map((id) => orchestrator.store(id).getState()).filter(Boolean);
  projects.sort((a, b) => b!.createdAt.localeCompare(a!.createdAt));
  return NextResponse.json({ projects });
}

export async function POST(req: Request) {
  const parsed = Body.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "Invalid input", issues: parsed.error.issues.map((i) => `${i.path.join(".")}: ${i.message}`) }, { status: 422 });
  const { mode, logo, ...input } = parsed.data;
  const { orchestrator } = getStudio();
  const state = orchestrator.create(input, { mode });
  const mem = orchestrator.store(state.id);
  if (logo) {
    const ext = path.extname(logo.name).toLowerCase();
    if (![".png", ".jpg", ".jpeg"].includes(ext)) return NextResponse.json({ error: "Logo must be PNG or JPG" }, { status: 422 });
    const dir = path.join(mem.root, "uploads");
    fs.mkdirSync(dir, { recursive: true });
    const file = path.join(dir, `logo${ext}`);
    fs.writeFileSync(file, Buffer.from(logo.dataBase64, "base64"));
    mem.set("business", { ...mem.require("business"), logoPath: file });
  }
  void projectsDir;
  void orchestrator.run(state.id, { mode });
  return NextResponse.json({ id: state.id }, { status: 201 });
}
