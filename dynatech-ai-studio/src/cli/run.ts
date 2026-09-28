import fs from "node:fs";
import path from "node:path";
import type { BusinessInput, RunMode } from "../core/types";
import { createStudio, providerStatus } from "../core/studio";
import { loadEnvFile } from "./env";

loadEnvFile(path.resolve(process.cwd(), ".env.local"));
loadEnvFile(path.resolve(process.cwd(), ".env"));

const FIRST_TEST: BusinessInput = {
  business: "Luxury Landscaping Company",
  location: "Miami, Florida",
  targetAudience: "High-income homeowners",
  style: "Premium, cinematic, sophisticated",
  goal: "Generate leads for high-end landscaping projects.",
  notes: "Focus on outdoor transformations",
};

function arg(name: string): string | undefined {
  const i = process.argv.indexOf(`--${name}`);
  return i >= 0 ? process.argv[i + 1] : undefined;
}
const flag = (name: string) => process.argv.includes(`--${name}`);

async function main() {
  if (flag("help")) {
    console.log(`Usage: npm run studio -- --business "Luxury Landscaping Company" --location "Miami, Florida" --audience "High-income homeowners" --style "Premium, cinematic" [--goal ...] [--notes ...] [--name "Real Business Name"] [--logo path.png] [--mode autonomous|supervised] [--browser-qa]\n       npm run first-test`);
    return;
  }
  const input: BusinessInput = flag("first-test") ? FIRST_TEST : {
    business: arg("business") ?? "", location: arg("location") ?? "", targetAudience: arg("audience") ?? "", style: arg("style") ?? "",
    goal: arg("goal"), notes: arg("notes"), businessName: arg("name"), logoPath: arg("logo") ? path.resolve(arg("logo")!) : undefined,
  };
  if (!input.business || !input.location || !input.targetAudience || !input.style) {
    console.error("Missing input. Run with --help, or use --first-test."); process.exit(1);
  }
  if (flag("browser-qa")) process.env.STUDIO_BROWSER_QA = "1";
  const mode = (arg("mode") ?? "autonomous") as RunMode;

  const studio = createStudio();
  console.log("DynaTech AI Studio");
  console.log("Providers:", JSON.stringify(providerStatus()));
  const state = studio.orchestrator.create(input, { mode });
  const mem = studio.orchestrator.store(state.id);
  console.log(`Project: ${state.id}  (${mode})`);

  let seen = 0;
  const timer = setInterval(() => { const ev = mem.events(); ev.slice(seen).forEach((e) => console.log(`  [${e.agent ?? "-"}] ${e.message}`)); seen = ev.length; }, 300);
  const final = await studio.orchestrator.run(state.id);
  clearInterval(timer);
  mem.events().slice(seen).forEach((e) => console.log(`  [${e.agent ?? "-"}] ${e.message}`));

  console.log(`\nStatus: ${final.status}`);
  console.log(final.stages.map((s) => `${s.status === "done" ? "✓" : s.status === "failed" ? "✗" : "○"} ${s.label}${s.summary ? ` — ${s.summary}` : ""}${s.usedLLM ? ` [${s.usedLLM}]` : ""}`).join("\n"));
  const report = mem.get("final");
  if (report) {
    console.log(`\n${report.summary}`);
    console.log(`Site: ${report.outputDir}`);
    if (report.openItems.length) console.log("Open items:\n" + report.openItems.map((o) => `  - ${o}`).join("\n"));
    console.log("Placeholders to fill:\n" + report.placeholdersToFill.map((p) => `  - ${p.field}: ${p.note}`).join("\n"));
  }
  fs.writeFileSync(path.join(mem.root, "SUMMARY.json"), JSON.stringify({ state: final, final: report }, null, 2));
  process.exit(final.status === "failed" ? 1 : 0);
}
main().catch((e) => { console.error(e); process.exit(1); });
