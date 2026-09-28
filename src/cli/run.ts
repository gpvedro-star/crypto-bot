import fs from "node:fs";
import path from "node:path";
import type { BusinessInput, RunMode } from "../core/types";
import { PreflightError, preflight, probeConnectivity } from "../core/preflight";
import { createStudio } from "../core/studio";
import { loadEnvFile } from "./env";

loadEnvFile(path.resolve(process.cwd(), ".env.local"));
loadEnvFile(path.resolve(process.cwd(), ".env"));

const FIRST_TEST: BusinessInput = {
  business: "Luxury Landscaping Company",
  location: "Miami, Florida",
  targetAudience: "High-income homeowners",
  style: "Premium, cinematic, sophisticated",
  goal: "Generate qualified leads for high-end landscaping projects.",
};

function arg(name: string): string | undefined {
  const i = process.argv.indexOf(`--${name}`);
  return i >= 0 ? process.argv[i + 1] : undefined;
}
const flag = (name: string) => process.argv.includes(`--${name}`);

const ENV_HELP = `Put keys in ${path.resolve(process.cwd(), ".env.local")} (copy .env.example). Never commit that file.
  ANTHROPIC_API_KEY=...            (LLM; default provider; optional ANTHROPIC_MODEL, default claude-opus-5-5)
  or LLM_PROVIDER=openai + OPENAI_API_KEY=... + OPENAI_MODEL=...
  PEXELS_API_KEY=...               (real photos/videos)
  Optional, for generated video: HIGGSFIELD_API_KEY=... HIGGSFIELD_API_SECRET=... HIGGSFIELD_MODEL_PATH=...`;

async function printPreflight(studio: ReturnType<typeof createStudio>) {
  const pf = preflight(studio);
  const p = pf.providers;
  console.log(`Mode: ${p.mode.toUpperCase()}`);
  console.log(`  LLM:   ${p.llm.available ? `${p.llm.provider} / ${p.llm.model}` : `NOT CONFIGURED (${p.llm.provider}) — missing ${p.llm.missing.join(", ") || "n/a"}`}`);
  console.log(`  Media: ${p.media.available ? "Pexels" : `NOT CONFIGURED — missing ${p.media.missing.join(", ")}`}`);
  console.log(`  Video: ${p.video.available ? "Higgsfield (generation is approval-gated)" : `not configured (optional) — missing ${p.video.missing.join("; ")}`}`);
  console.log("Connectivity from this machine:");
  const probes = await probeConnectivity(studio);
  for (const pr of probes) console.log(`  ${pr.reachable ? "✓" : "✗"} ${pr.service} (${pr.url}): ${pr.detail}`);
  return { pf, probes };
}

async function main() {
  if (flag("help")) {
    console.log(`Usage:
  npm run preflight                                   check providers + network reachability (no spending)
  npm run first-test                                  Miami luxury landscaping brief (uses whatever is configured; demo if nothing)
  npm run first-test -- --real                        same brief, but REFUSES to run unless real LLM + Pexels are ready
  npm run studio -- --business "..." --location "..." --audience "..." --style "..." [--goal ...] [--notes ...] [--name "Real Name"] [--logo file.png] [--mode supervised] [--real] [--browser-qa]
  npm run video -- <project-id> generate|skip         answer the video cost gate (generate SPENDS Higgsfield credits)`);
    return;
  }

  const studio = createStudio();

  if (flag("check")) {
    const { pf, probes } = await printPreflight(studio);
    if (!pf.ok) console.log(`\nNot ready for a real run:\n- ${pf.problems.join("\n- ")}\n\n${ENV_HELP}`);
    process.exit(pf.ok && probes.every((x) => x.reachable || x.service.startsWith("Higgsfield")) ? 0 : 2);
  }

  if (flag("video-action")) {
    const [id, action] = [process.argv[process.argv.indexOf("--video-action") + 1], process.argv[process.argv.indexOf("--video-action") + 2]];
    if (!id || !["generate", "skip"].includes(action)) { console.error("Usage: npm run video -- <project-id> generate|skip"); process.exit(1); }
    if (action === "generate") console.log("Video generation will use external generation credits. Creating the Higgsfield job…");
    const plan = await studio.orchestrator.videoAction(id, action as "generate" | "skip");
    console.log(`Video phase: ${plan.phase} — ${plan.phaseDetail}`);
    if (action === "generate") {
      const timer = setInterval(() => { const v = studio.orchestrator.store(id).get("video"); console.log(`  … ${v?.phase}${v?.job ? ` (job ${v.job.id}: ${v.job.status})` : ""}`); }, 15000);
      await studio.orchestrator.idle(id);
      clearInterval(timer);
      const v = studio.orchestrator.store(id).require("video");
      console.log(`Final video phase: ${v.phase} — ${v.phaseDetail}`);
      process.exit(v.phase === "completed" ? 0 : 1);
    }
    await studio.orchestrator.idle(id);
    return;
  }

  const real = flag("real");
  if (real) { process.env.STUDIO_REQUIRE_REAL = "1"; process.env.STUDIO_BROWSER_QA = "1"; }
  if (flag("browser-qa")) process.env.STUDIO_BROWSER_QA = "1";

  const input: BusinessInput = flag("first-test") ? FIRST_TEST : {
    business: arg("business") ?? "", location: arg("location") ?? "", targetAudience: arg("audience") ?? "", style: arg("style") ?? "",
    goal: arg("goal"), notes: arg("notes"), businessName: arg("name"), logoPath: arg("logo") ? path.resolve(arg("logo")!) : undefined,
  };
  if (!input.business || !input.location || !input.targetAudience || !input.style) { console.error("Missing input. Run with --help, or use --first-test."); process.exit(1); }
  const mode = (arg("mode") ?? "autonomous") as RunMode;

  console.log("DynaTech AI Studio");
  const { pf, probes } = await printPreflight(studio);
  if (real) {
    const unreachable = probes.filter((x) => !x.reachable && !x.service.startsWith("Higgsfield") && !(x.service.startsWith("LLM") && !pf.providers.llm.available) && !(x.service.startsWith("Pexels") && !pf.providers.media.available));
    if (!pf.ok || unreachable.length) {
      console.error("\n✗ REAL MODE CANNOT START. Nothing was generated and no placeholders or templates were substituted.");
      if (!pf.ok) console.error(`\nMissing configuration:\n- ${new PreflightError(pf.problems).problems.join("\n- ")}\n\n${ENV_HELP}`);
      if (unreachable.length) console.error(`\nUnreachable hosts (network/egress policy on this machine must allow them):\n${unreachable.map((x) => `- ${x.url}: ${x.detail}`).join("\n")}`);
      process.exit(2);
    }
  }

  const state = studio.orchestrator.create(input, { mode });
  const mem = studio.orchestrator.store(state.id);
  console.log(`\nProject: ${state.id}  (${mode})`);

  let seen = 0;
  const timer = setInterval(() => { const ev = mem.events(); ev.slice(seen).forEach((e) => console.log(`  [${e.agent ?? "-"}] ${e.message}`)); seen = ev.length; }, 300);
  const final = await studio.orchestrator.run(state.id, { requireReal: real });
  clearInterval(timer);
  mem.events().slice(seen).forEach((e) => console.log(`  [${e.agent ?? "-"}] ${e.message}`));

  console.log(`\nStatus: ${final.status}${final.verdict ? `  (QA verdict: ${final.verdict})` : ""}`);
  const secs = (s: { startedAt?: string; finishedAt?: string }) => (s.startedAt && s.finishedAt ? `${((Date.parse(s.finishedAt) - Date.parse(s.startedAt)) / 1000).toFixed(1)}s` : "-");
  console.log(final.stages.map((s) => `${s.status === "done" ? "✓" : s.status === "failed" ? "✗" : "○"} ${s.label.padEnd(20)} ${(s.provider ?? "-").padEnd(34)} ${(s.model ?? "").padEnd(18)} ${secs(s).padStart(7)}  ${s.error ? `ERROR: ${s.error}` : s.summary ?? ""}`).join("\n"));
  const report = mem.get("final");
  const video = mem.get("video");
  if (report) {
    console.log(`\n${report.summary}`);
    console.log(`Site: ${report.outputDir}`);
    console.log(`Assets: ${report.assetCounts.real} real, ${report.assetCounts.placeholders} placeholders, ${report.assetCounts.failed} failed`);
    if (report.openItems.length) console.log("Open items:\n" + report.openItems.map((o) => `  - ${o}`).join("\n"));
    console.log("Placeholders to fill:\n" + report.placeholdersToFill.map((p) => `  - ${p.field}: ${p.note}`).join("\n"));
  }
  if (video) {
    console.log(`\nVideo: ${video.phase} — ${video.phaseDetail ?? ""}`);
    if (video.phase === "awaiting_approval") console.log(`  Video generation will use external generation credits.\n  [Generate] npm run video -- ${state.id} generate     [Skip video] npm run video -- ${state.id} skip   (or use the dashboard)`);
  }
  fs.writeFileSync(path.join(mem.root, "SUMMARY.json"), JSON.stringify({ state: final, final: report, video }, null, 2));
  process.exit(final.status === "failed" ? 1 : final.status === "blocked" ? 3 : 0);
}
main().catch((e) => { console.error(e); process.exit(1); });
