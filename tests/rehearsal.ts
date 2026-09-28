/**
 * REHEARSAL — not a real-provider test. Runs the full production code path (Anthropic SDK over SSE, Pexels search/curation/download,
 * Higgsfield lifecycle, next build, headless-browser QA) against LOCAL MOCK SERVERS, so every integration is exercised end to end
 * without keys or outbound network access. Output is labelled accordingly.
 */
import fs from "node:fs";
import path from "node:path";
import { anthropicAt, higgsfieldAt, LANDSCAPING, makeRealOrchestrator, pexelsAt } from "./helpers";
import { golden, makeAnswer } from "./mock-llm";
import { startAnthropicMock, startHiggsfieldMock, startPexelsMock } from "./mocks";

async function main() {
  process.env.STUDIO_BROWSER_QA = "1";
  const g = await golden();
  const pexels = await startPexelsMock();
  const hf = await startHiggsfieldMock("success");
  const llm = await startAnthropicMock(makeAnswer(g, { videoDecision: "generate" }));
  const baseDir = path.resolve(process.argv.includes("--stop-before-video") ? "projects-rehearsal-gate" : "projects-rehearsal");
  fs.rmSync(baseDir, { recursive: true, force: true });
  const { orch } = makeRealOrchestrator({ llm: anthropicAt(llm.url), media: pexelsAt(pexels.url), video: higgsfieldAt(hf.url), baseDir, videoPollMs: 500, videoTimeoutMs: 60000 });
  const st = orch.create(LANDSCAPING);
  const final = await orch.run(st.id);
  const mem = orch.store(st.id);
  console.log(`REHEARSAL (mock providers) — status ${final.status}, verdict ${final.verdict}`);
  for (const s of final.stages) console.log(`  ${s.status.padEnd(6)} ${s.label.padEnd(18)} ${(s.provider ?? "-").padEnd(28)} ${(s.model ?? "").padEnd(18)} ${s.summary ?? s.error ?? ""}`);
  console.log(`video phase before approval: ${mem.require("video").phase}; higgsfield submits: ${hf.submits}`);
  if (process.argv.includes("--stop-before-video")) { console.log("stopped at the video cost gate (no credits spent)"); await Promise.all([pexels.close(), hf.close(), llm.close()]); return; }
  await orch.videoAction(st.id, "generate");
  await orch.idle(st.id);
  console.log(`video phase after approval: ${mem.require("video").phase}; higgsfield submits: ${hf.submits}`);
  const q = mem.require("qa");
  console.log(`final verdict ${q.verdict}, score ${q.score}, browser QA ${q.browserQa}, failed checks: ${JSON.stringify(q.checks.filter((c) => !c.passed).map((c) => c.name))}`);
  console.log(`site: ${mem.siteDir}`);
  await Promise.all([pexels.close(), hf.close(), llm.close()]);
}
main().catch((e) => { console.error(e); process.exit(1); });
