import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { after, before, test } from "node:test";
import { golden, makeAnswer, MOCK_HEADLINE, type Golden } from "./mock-llm";
import { anthropicAt, higgsfieldAt, LANDSCAPING, makeRealOrchestrator, pexelsAt } from "./helpers";
import { startAnthropicMock, startHiggsfieldMock, startPexelsMock, startOpenAIMock } from "./mocks";
import { OpenAIProvider } from "../src/services/llm/openai";

let g: Golden;
before(async () => { g = await golden(); });

const siteJson = (site: string) => JSON.parse(fs.readFileSync(path.join(site, "content/site.json"), "utf8"));

test("REAL MODE (mock servers): every agent uses the LLM, Pexels assets are downloaded, no placeholders, video is gated", async () => {
  const pexels = await startPexelsMock();
  const hf = await startHiggsfieldMock("success");
  const llm = await startAnthropicMock(makeAnswer(g, { videoDecision: "generate" }));
  try {
    const { orch } = makeRealOrchestrator({ llm: anthropicAt(llm.url), media: pexelsAt(pexels.url), video: higgsfieldAt(hf.url) });
    const st = orch.create(LANDSCAPING);
    const final = await orch.run(st.id);
    const mem = orch.store(st.id);
    assert.ok(["completed", "completed_with_warnings"].includes(final.status), `status ${final.status}; ${JSON.stringify(final.stages.filter((s) => s.error))}`);
    assert.equal(final.providers?.mode, "real");

    // 1) The LLM produced the content — the headline only the mock LLM writes is on the site.
    const site = siteJson(mem.siteDir);
    const hero = site.sections.find((s: { component: string }) => s.component === "Hero");
    assert.equal(hero.props.headline, MOCK_HEADLINE);

    // 2) Each requested agent called the LLM (real SDK → SSE), and the dashboard data records provider + model per stage.
    const tasks = new Set(llm.requests.map((r) => r.task.split(":")[0]));
    for (const t of ["research", "strategy", "creative-direction", "ux", "copy", "media-plan", "media-curation", "design-system", "video-plan", "architecture", "qa-review"]) assert.ok(tasks.has(t), `LLM task ${t} was requested; got ${[...tasks]}`);
    for (const id of ["research", "strategy", "creative", "ux", "copy", "design-system", "video", "architect", "qa"]) {
      const s = final.stages.find((x) => x.id === id)!;
      assert.equal(s.provider, id === "qa" ? "anthropic" : "anthropic", `${id} provider`);
      assert.equal(s.model, "claude-mock-model", `${id} model`);
    }
    assert.match(final.stages.find((s) => s.id === "media")!.provider!, /pexels \+ anthropic curation/);
    assert.ok(llm.requests.some((r) => r.task.startsWith("media-curation") && r.imageCount >= 2), "curation sends candidate images to the model");
    assert.ok(llm.requests.every((r) => r.beta && r.headers["anthropic-beta"]?.toString().includes("server-side-fallback-2026-07-01")), "refusal fallback opt-in is sent");
    assert.equal(llm.requests[0].body.model, "claude-opus-5-5");

    // 3) Real assets, all downloaded locally; nothing depends on a remote URL; attribution kept.
    const media = mem.require("media");
    assert.equal(media.errors.length, 0, JSON.stringify(media.errors));
    assert.equal(media.usedPlaceholders, false);
    assert.ok(media.assets.every((a) => a.status === "approved" && a.source === "pexels"), "no placeholders or failures");
    for (const a of media.assets) {
      assert.ok(a.localPath && fs.existsSync(path.join(mem.siteDir, a.localPath)), `${a.slot} file exists`);
      assert.ok(a.credit?.name && a.sourceUrl?.startsWith("https://www.pexels.com/"), `${a.slot} attribution`);
      assert.ok(a.reason, `${a.slot} curation reason recorded`);
    }
    assert.ok(media.assets.find((a) => a.slot === "hero")!.variants!.length === 3, "hero has three local widths");
    assert.ok(media.assets.some((a) => a.type === "video" && a.url === "/media/hero-video.mp4"), "stock hero video downloaded");
    assert.equal((JSON.stringify(site).match(/"(?:src|poster)":\s*"https?:/g) ?? []).length, 0, "no remote media URLs in the site");
    assert.match(JSON.stringify(site.sections.find((s: { component: string }) => s.component === "Footer")), /Photographer/);

    // 4) QA verdict: no placeholders; the pending video decision is a warning, never a silent pass or a block.
    const qa = mem.require("qa");
    assert.equal(qa.verdict, "PASS_WITH_WARNINGS", JSON.stringify(qa.blockers.concat(qa.warnings)));
    assert.ok(qa.review?.model === "claude-mock-model");
    assert.equal(mem.require("final").assetCounts.placeholders, 0);

    // 5) Higgsfield was NOT touched: cost gate is waiting for a human.
    const video = mem.require("video");
    assert.equal(video.phase, "awaiting_approval");
    assert.equal(hf.submits, 0, "no credits spent before approval");
    assert.match(video.phaseDetail!, /external generation credits/);
    assert.match(video.prompt, /no text, no logos/);
  } finally { await Promise.all([pexels.close(), hf.close(), llm.close()]); }
});

test("VIDEO after approval: job created, website already done, background poll → download → Video QA → site updated", async () => {
  const pexels = await startPexelsMock();
  const hf = await startHiggsfieldMock("success");
  const llm = await startAnthropicMock(makeAnswer(g, { videoDecision: "generate" }));
  try {
    const { orch } = makeRealOrchestrator({ llm: anthropicAt(llm.url), media: pexelsAt(pexels.url), video: higgsfieldAt(hf.url) });
    const st = orch.create(LANDSCAPING);
    await orch.run(st.id);
    const mem = orch.store(st.id);
    const before = siteJson(mem.siteDir).sections.find((s: { component: string }) => s.component === "Hero").props.video;
    assert.equal(before.src, "/media/hero-video.mp4", "stock clip is the interim hero video");

    const t0 = Date.now();
    const plan = await orch.videoAction(st.id, "generate");
    assert.ok(Date.now() - t0 < 2000, "generate returns as soon as the job exists");
    assert.equal(plan.phase, "generating");
    assert.equal(hf.submits, 1);
    assert.match(hf.authHeaders[0], /^Key hfkey:hfsecret$/);
    assert.ok(orch.isPolling(st.id));

    await orch.idle(st.id);
    const done = mem.require("video");
    assert.equal(done.phase, "completed", done.phaseDetail);
    assert.ok(done.qa?.passed);
    assert.equal(done.qa?.frameAnalysis.status, "not_implemented");
    assert.ok(fs.existsSync(path.join(mem.siteDir, "public/media/hero-generated.mp4")));
    const gen = mem.require("media").assets.find((a) => a.slot === "hero-video-generated")!;
    assert.equal(gen.source, "higgsfield");
    assert.equal(gen.requestId, "req-1");
    assert.match(gen.prompt!, /no text, no logos/);
    const after = siteJson(mem.siteDir).sections.find((s: { component: string }) => s.component === "Hero").props.video;
    assert.equal(after.src, "/media/hero-generated.mp4", "generated clip replaced the stock clip");
    assert.ok(["completed", "completed_with_warnings"].includes(mem.getState()!.status));
    assert.ok(hf.statusCalls >= 3);
  } finally { await Promise.all([pexels.close(), hf.close(), llm.close()]); }
});

test("VIDEO failure paths never break the website: failed job, NSFW, timeout, bad file, missing URL", async () => {
  for (const scenario of ["failed", "nsfw", "never", "bad-video", "no-url"] as const) {
    const pexels = await startPexelsMock();
    const hf = await startHiggsfieldMock(scenario);
    const llm = await startAnthropicMock(makeAnswer(g, { videoDecision: "generate" }));
    try {
      const { orch } = makeRealOrchestrator({ llm: anthropicAt(llm.url), media: pexelsAt(pexels.url), video: higgsfieldAt(hf.url), videoPollMs: 10, videoTimeoutMs: scenario === "never" ? 400 : 5000 });
      const st = orch.create(LANDSCAPING);
      await orch.run(st.id);
      await orch.videoAction(st.id, "generate");
      await orch.idle(st.id);
      const mem = orch.store(st.id);
      const v = mem.require("video");
      assert.equal(v.phase, "failed", `${scenario}: ${v.phaseDetail}`);
      const expect = { failed: /model crashed/, nsfw: /NSFW/, never: /Timed out after/, "bad-video": /Video QA failed/, "no-url": /no video URL/ }[scenario];
      assert.match(v.phaseDetail!, expect, scenario);
      if (scenario === "never") assert.ok(hf.cancels >= 1, "timeout attempts to cancel the job");
      // The site is intact and still uses the fallback clip.
      assert.equal(siteJson(mem.siteDir).sections.find((s: { component: string }) => s.component === "Hero").props.video.src, "/media/hero-video.mp4", scenario);
      assert.ok(!fs.existsSync(path.join(mem.siteDir, "public/media/hero-generated.mp4")), `${scenario}: rejected file removed`);
      const qa = mem.require("qa");
      assert.notEqual(qa.verdict, "BLOCKED", scenario);
      assert.ok(qa.warnings.some((w) => /Video generation failed/.test(w)), `${scenario}: QA records the failure`);
      assert.match(JSON.stringify(mem.events()), /Video generation failed/);
    } finally { await Promise.all([pexels.close(), hf.close(), llm.close()]); }
  }
});

test("VIDEO skip: no job is created and the site keeps the fallback", async () => {
  const pexels = await startPexelsMock();
  const hf = await startHiggsfieldMock("success");
  const llm = await startAnthropicMock(makeAnswer(g, { videoDecision: "generate" }));
  try {
    const { orch } = makeRealOrchestrator({ llm: anthropicAt(llm.url), media: pexelsAt(pexels.url), video: higgsfieldAt(hf.url) });
    const st = orch.create(LANDSCAPING);
    await orch.run(st.id);
    const plan = await orch.videoAction(st.id, "skip");
    await orch.idle(st.id);
    assert.equal(plan.phase, "skipped");
    assert.equal(hf.submits, 0);
    await assert.rejects(orch.videoAction(st.id, "generate"), /not awaiting approval/);
  } finally { await Promise.all([pexels.close(), hf.close(), llm.close()]); }
});

test("NO SILENT FALLBACK: a bad Anthropic key fails the stage with the exact error and produces no template output", async () => {
  const llm = await startAnthropicMock(makeAnswer(g), "right-key");
  try {
    const { orch } = makeRealOrchestrator({ llm: anthropicAt(llm.url, "wrong-key") });
    const st = orch.create(LANDSCAPING);
    const final = await orch.run(st.id);
    assert.equal(final.status, "failed");
    const research = final.stages.find((s) => s.id === "research")!;
    assert.equal(research.status, "failed");
    assert.match(research.error!, /\[anthropic\] Authentication failed \(401\).*invalid x-api-key/);
    assert.ok(!orch.store(st.id).has("research"), "no template research was substituted");
    assert.equal(final.stages.find((s) => s.id === "strategy")!.status, "pending");
  } finally { await llm.close(); }
});

test("NO SILENT FALLBACK: invalid model output gets exactly one repair round, then fails loudly; a repaired answer is accepted", async () => {
  // (a) never valid
  let llm = await startAnthropicMock(() => "this is not json at all");
  try {
    const { orch } = makeRealOrchestrator({ llm: anthropicAt(llm.url) });
    const st = orch.create(LANDSCAPING);
    const final = await orch.run(st.id);
    assert.equal(final.status, "failed");
    assert.match(final.stages.find((s) => s.id === "research")!.error!, /"research" returned output that failed validation after a repair attempt/);
    assert.equal(llm.requests.length, 2, "one attempt + one repair");
    assert.match(llm.requests[1].prompt, /previous answer was rejected/);
  } finally { await llm.close(); }
  // (b) invalid first, valid second
  let calls = 0;
  const answer = makeAnswer(g);
  llm = await startAnthropicMock((r) => (r.task === "research" && calls++ === 0 ? '{"industry": ""}' : answer(r)));
  const pexels = await startPexelsMock();
  try {
    const { orch } = makeRealOrchestrator({ llm: anthropicAt(llm.url), media: pexelsAt(pexels.url) });
    const st = orch.create(LANDSCAPING);
    const final = await orch.run(st.id);
    assert.notEqual(final.status, "failed", JSON.stringify(final.stages.filter((s) => s.error)));
    assert.equal(llm.requests.filter((r) => r.task === "research").length, 2);
    assert.match(JSON.stringify(orch.store(st.id).events()), /repair round/);
  } finally { await Promise.all([llm.close(), pexels.close()]); }
});

test("NO SILENT FALLBACK: a model refusal and a truncated answer surface as exact stage errors", async () => {
  for (const [out, re] of [[{ refusal: true as const }, /refused the request \(category: cyber: test refusal\)/], [{ truncated: true as const }, /hit max_tokens/]] as const) {
    const llm = await startAnthropicMock(() => out);
    try {
      const { orch } = makeRealOrchestrator({ llm: anthropicAt(llm.url) });
      const st = orch.create(LANDSCAPING);
      const final = await orch.run(st.id);
      assert.equal(final.status, "failed");
      assert.match(final.stages.find((s) => s.id === "research")!.error!, re);
    } finally { await llm.close(); }
  }
});

test("Pexels failure is shown, never hidden behind placeholders: 401 → every slot failed, hero missing → BLOCKED", async () => {
  const pexels = await startPexelsMock("right-key");
  const llm = await startAnthropicMock(makeAnswer(g, { videoDecision: "none" }));
  try {
    const { orch } = makeRealOrchestrator({ llm: anthropicAt(llm.url), media: pexelsAt(pexels.url, "wrong-key") });
    const st = orch.create(LANDSCAPING);
    const final = await orch.run(st.id);
    const mem = orch.store(st.id);
    assert.equal(final.status, "blocked");
    assert.equal(final.verdict, "BLOCKED");
    const media = mem.require("media");
    assert.ok(media.errors.length > 5);
    assert.match(media.errors[0].message, /\[pexels\] HTTP 401: Unauthorized Check PEXELS_API_KEY\./);
    assert.ok(media.assets.every((a) => a.status === "failed" && a.source === "pexels"), "no placeholders were substituted");
    assert.equal(mem.require("final").assetCounts.placeholders, 0);
    assert.match(mem.require("qa").blockers.join(" "), /Required hero media is missing/);
  } finally { await Promise.all([pexels.close(), llm.close()]); }
});

test("Pexels partial failure: one slot finds nothing → exact error on that slot, other assets fine, human review required", async () => {
  const pexels = await startPexelsMock();
  pexels.emptyFor = "kitchen"; // gallery-6 ("outdoor living kitchen patio luxury") and its alt query find nothing
  const llm = await startAnthropicMock(makeAnswer(g, { videoDecision: "none" }));
  try {
    const { orch } = makeRealOrchestrator({ llm: anthropicAt(llm.url), media: pexelsAt(pexels.url) });
    const st = orch.create(LANDSCAPING);
    const final = await orch.run(st.id);
    const media = orch.store(st.id).require("media");
    const bad = media.errors.find((e) => e.slot === "gallery-6");
    assert.ok(bad, JSON.stringify(media.errors));
    assert.match(bad!.message, /no acceptable image/);
    assert.ok(media.assets.filter((a) => a.status === "approved").length >= 12);
    assert.notEqual(final.verdict, "BLOCKED");
    assert.equal(final.status, "needs_human_approval");
  } finally { await Promise.all([pexels.close(), llm.close()]); }
});

test("Pexels download problems are exact: a CDN that returns HTML instead of an image fails that slot", async () => {
  const pexels = await startPexelsMock();
  const llm = await startAnthropicMock(makeAnswer(g, { videoDecision: "none" }));
  try {
    const { orch } = makeRealOrchestrator({ llm: anthropicAt(llm.url), media: pexelsAt(pexels.url) });
    // Make every CDN image a non-image response.
    const orig = pexels.server.listeners("request")[0] as (...a: unknown[]) => void;
    pexels.server.removeAllListeners("request");
    pexels.server.on("request", (req: import("node:http").IncomingMessage, res: import("node:http").ServerResponse) => {
      if (req.url?.startsWith("/cdn/photos/") && !req.url.includes("w=512")) { res.writeHead(200, { "content-type": "text/html" }); return res.end("<html>blocked</html>"); }
      orig(req, res);
    });
    const st = orch.create(LANDSCAPING);
    const final = await orch.run(st.id);
    const media = orch.store(st.id).require("media");
    assert.ok(media.errors.length > 0);
    assert.match(media.errors[0].message, /unexpected content-type "text\/html"/);
    assert.equal(final.verdict, "BLOCKED");
  } finally { await Promise.all([pexels.close(), llm.close()]); }
});

test("OpenAI provider can be selected instead of Anthropic and is reported with its model", async () => {
  const pexels = await startPexelsMock();
  const answer = makeAnswer(g, { videoDecision: "none" });
  const oa = await startOpenAIMock((sys, prompt) => answer({ task: /^\[task: ([^\]]+)\]/.exec(sys)![1], system: sys, prompt, imageCount: 0, model: "", beta: false, headers: {}, body: {} }) as string);
  try {
    const llm = new OpenAIProvider({ apiKey: oa.key, baseURL: `${oa.url}/v1`, model: "my-openai-model" });
    const { orch } = makeRealOrchestrator({ llm, media: pexelsAt(pexels.url) });
    const st = orch.create(LANDSCAPING);
    const final = await orch.run(st.id);
    assert.notEqual(final.status, "failed", JSON.stringify(final.stages.filter((s) => s.error)));
    const research = final.stages.find((s) => s.id === "research")!;
    assert.equal(research.provider, "openai");
    assert.equal(research.model, "mock-openai-model");
    assert.equal(oa.requests[0].model, "my-openai-model");
    assert.equal(final.providers?.llm.provider, "openai");
  } finally { await Promise.all([pexels.close(), oa.close()]); }
});
