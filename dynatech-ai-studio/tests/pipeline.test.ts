import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { test } from "node:test";
import { scoreAsset } from "../src/agents/media";
import { PIPELINE } from "../src/core/orchestrator";
import { MEMORY_SECTIONS, type Asset } from "../src/core/types";
import type { MediaProvider } from "../src/services/pexels";
import { LANDSCAPING, makeOrchestrator } from "./helpers";

test("autonomous pipeline produces every memory section and a complete site", async () => {
  const { orch } = makeOrchestrator();
  const state = orch.create(LANDSCAPING);
  const final = await orch.run(state.id);
  assert.equal(final.status, "completed", JSON.stringify(final.stages.filter((s) => s.status !== "done")));
  const mem = orch.store(state.id);
  for (const s of MEMORY_SECTIONS) assert.ok(mem.has(s), `memory section ${s}`);

  const site = JSON.parse(fs.readFileSync(path.join(mem.siteDir, "content/site.json"), "utf8"));
  const comps: string[] = site.sections.map((s: { component: string }) => s.component);
  for (const c of ["Hero", "Services", "ScrollStory", "BeforeAfter", "ImageGallery", "Process", "Trust", "CTA", "Contact", "Footer"]) assert.ok(comps.includes(c), c);
  assert.equal(site.sections.find((s: { component: string }) => s.component === "ScrollStory").props.stages.length, 6);
  assert.ok(site.seo.title.length <= 60);
  for (const f of ["app/page.tsx", "app/tokens.css", "app/layout.tsx", "app/api/lead/route.ts", "design-system.json"]) assert.ok(fs.existsSync(path.join(mem.siteDir, f)), f);
  // Never invented: testimonials are placeholders, and no business claims leak into copy.
  const copy = mem.require("copy");
  assert.ok(copy.testimonials.slots.every((s) => /Add a real/.test(s.hint)));
  assert.ok(copy.placeholders.some((p) => p.field === "testimonials"));
  assert.equal(mem.require("final").status, "approved");
  // No API key strings ended up in generated output.
  const blob = fs.readdirSync(path.join(mem.siteDir, "content")).map((f) => fs.readFileSync(path.join(mem.siteDir, "content", f), "utf8")).join("");
  assert.ok(!/API_KEY|sk-ant|Bearer /.test(blob));
});

test("independent stages run in parallel (Copy ∥ Media)", async () => {
  const { orch } = makeOrchestrator();
  const state = orch.create(LANDSCAPING);
  await orch.run(state.id);
  const ev = orch.store(state.id).events().map((e) => e.message);
  assert.ok(ev.some((m) => /Running in parallel: Copy ∥ Media|Running in parallel: Media ∥ Copy/.test(m)), ev.join("\n"));
});

test("revision loop: QA finds injected defects, agents fix them, QA passes (≤ 3 iterations)", async () => {
  const { orch } = makeOrchestrator();
  const copyNode = PIPELINE.find((n) => n.id === "copy")!;
  const uxNode = PIPELINE.find((n) => n.id === "ux")!;
  const origCopy = copyNode.agent.run, origUx = uxNode.agent.run;
  copyNode.agent.run = async (ctx) => {
    const c = (await origCopy.call(copyNode.agent, ctx)) as { hero: { sub: string }; intro: { body: string[] } };
    c.hero.sub = "Welcome to our website. We deliver world-class results.";
    c.intro.body.push("Over 20 years of experience and award-winning projects.");
    return c;
  };
  uxNode.agent.run = async (ctx) => {
    const u = (await origUx.call(uxNode.agent, ctx)) as { homepageFlow: { tone: string; layout: string }[] };
    // Force two adjacent sections to be identical.
    u.homepageFlow[5].tone = u.homepageFlow[4].tone;
    u.homepageFlow[5].layout = u.homepageFlow[4].layout;
    return u;
  };
  try {
    const state = orch.create(LANDSCAPING);
    const final = await orch.run(state.id);
    const mem = orch.store(state.id);
    const history = fs.readFileSync(path.join(mem.root, "qa-history.jsonl"), "utf8").trim().split("\n").map((l) => JSON.parse(l));
    assert.ok(history[0].score < 100 && history[0].issues.some((i: string) => /banned|Generic|claims|Repetitive/i.test(i)), JSON.stringify(history[0]));
    assert.ok(history.length >= 2 && history.length <= 4, `iterations ${history.length}`);
    assert.equal(final.status, "completed");
    const copy = JSON.stringify(mem.require("copy"));
    assert.ok(!/world-class|Welcome to our website|20 years/i.test(copy), "defects were removed from copy");
    assert.ok(final.iteration <= 3);
  } finally {
    copyNode.agent.run = origCopy; uxNode.agent.run = origUx;
  }
});

test("unfixable serious issues stop after max iterations and demand human approval", async () => {
  const { orch } = makeOrchestrator();
  const copyNode = PIPELINE.find((n) => n.id === "copy")!;
  const orig = copyNode.agent.run;
  // A claim the revise step is explicitly told to fix but that keeps coming back: simulate by overriding revise.
  const origRevise = copyNode.agent.revise;
  copyNode.agent.run = async (ctx) => { const c = (await orig.call(copyNode.agent, ctx)) as { intro: { body: string[] } }; c.intro.body.push("Award-winning team."); return c; };
  copyNode.agent.revise = async (ctx) => ctx.memory.require("copy");
  try {
    const state = orch.create(LANDSCAPING);
    const final = await orch.run(state.id, { maxIterations: 3 });
    assert.equal(final.status, "needs_human_approval");
    assert.equal(final.iteration, 3);
    assert.equal(orch.store(state.id).require("final").status, "needs_human_approval");
  } finally { copyNode.agent.run = orig; copyNode.agent.revise = origRevise; }
});

test("supervised mode pauses at every checkpoint until approved", async () => {
  const { orch } = makeOrchestrator();
  const state = orch.create(LANDSCAPING, { mode: "supervised" });
  const done = orch.run(state.id);
  const seen: string[] = [];
  for (const cp of ["strategy", "creative", "homepage", "final"] as const) {
    for (let i = 0; i < 400; i++) { const s = orch.store(state.id).getState()!; if (s.status === "awaiting_approval" && s.awaiting === cp) break; await new Promise((r) => setTimeout(r, 25)); }
    const s = orch.store(state.id).getState()!;
    assert.equal(s.awaiting, cp, `should pause at ${cp}`);
    seen.push(cp);
    orch.approve(state.id, cp, true);
  }
  const final = await done;
  assert.equal(final.status, "completed");
  assert.deepEqual(seen, ["strategy", "creative", "homepage", "final"]);
  assert.deepEqual(final.approvals, ["strategy", "creative", "homepage", "final"]);
});

test("media agent: intelligent queries, scored selection, no duplicate photos, Pexels credit kept", async () => {
  const photo = (id: number, slug: string, w = 3200, h = 2000): Asset => ({
    id: `pexels-photo-${id}`, type: "image", source: "pexels", url: `https://images.pexels.com/photos/${id}/${slug}-${id}.jpeg`, width: w, height: h,
    usage: "gallery", slot: "", description: slug.replace(/-/g, " "), alt: slug.replace(/-/g, " "), credit: { name: "Jane Doe", url: "https://www.pexels.com/@jane" }, status: "candidate",
  });
  const queries: string[] = [];
  const fake: MediaProvider = {
    name: "pexels", available: true,
    searchImages: async (q) => { queries.push(q); return [photo(1, "luxury-modern-backyard-landscaping-miami-sunset"), photo(2, "cartoon-illustration-garden"), photo(3, "garden-landscape-luxury-terrace-dusk"), photo(4, "empty-green-lot-land-open-field"), photo(5, "tropical-garden-palm-trees-planting")]; },
    searchVideos: async () => [],
  };
  const { orch } = makeOrchestrator({ media: fake });
  const state = orch.create(LANDSCAPING);
  await orch.run(state.id);
  const media = orch.store(state.id).require("media");
  assert.ok(queries.every((q) => q.split(" ").length >= 4), "queries are descriptive, never a single noun");
  assert.ok(queries.some((q) => /Miami/.test(q)), "queries include location");
  const stock = media.assets.filter((a) => a.source === "pexels");
  assert.equal(new Set(stock.map((a) => a.id)).size, stock.length, "no duplicate photos across slots");
  assert.ok(!stock.some((a) => /cartoon/.test(a.description)), "illustrations rejected");
  assert.ok(stock.every((a) => a.credit && a.status === "approved"));
  const hero = media.assets.find((a) => a.slot === "hero")!;
  assert.equal(hero.id, "pexels-photo-1");
});

test("scoreAsset prefers relevant landscape images and penalizes rejects", () => {
  const slot = { slot: "hero", usage: "hero", type: "image", orientation: "landscape", minWidth: 1920, brief: "", query: "luxury modern backyard landscaping Miami sunset", alt: "" } as const;
  const mk = (d: string, w: number, h: number): Asset => ({ id: d, type: "image", source: "pexels", url: `https://x/${d.replace(/ /g, "-")}-1`, width: w, height: h, usage: "hero", slot: "", description: d, alt: d, status: "candidate" });
  const good = scoreAsset(mk("luxury modern backyard landscaping miami sunset", 4000, 2500), slot);
  const portrait = scoreAsset(mk("luxury modern backyard landscaping miami sunset", 2000, 3000), slot);
  const bad = scoreAsset(mk("cartoon vector garden", 4000, 2500), slot);
  assert.ok(good > 0.8 && good > portrait && portrait > bad, `${good} ${portrait} ${bad}`);
});

test("engine registry: Next.js ready, other platforms registered as planned and refuse to generate", async () => {
  const { createEngineRegistry } = await import("../src/services/website-engines");
  const reg = createEngineRegistry();
  assert.equal(reg.get("nextjs").status, "ready");
  for (const id of ["react", "webflow", "framer", "wordpress", "shopify"]) {
    assert.equal(reg.get(id).status, "planned");
    await assert.rejects(reg.get(id).generate({} as never), /not implemented/);
  }
  assert.throws(() => reg.get("nope"), /Unknown website engine/);
});
