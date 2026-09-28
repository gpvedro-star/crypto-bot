import assert from "node:assert/strict";
import path from "node:path";
import { after, before, test } from "node:test";
import { createLLM } from "../src/services/llm";
import { AnthropicProvider, DEFAULT_ANTHROPIC_MODEL } from "../src/services/llm/anthropic";
import { OpenAIProvider } from "../src/services/llm/openai";
import { OfflineProvider } from "../src/services/llm/offline";
import { NoMediaProvider, PexelsError, PexelsProvider } from "../src/services/pexels";
import { DisabledVideoProvider } from "../src/services/higgsfield";
import { describeProviders, preflight, probeConnectivity } from "../src/core/preflight";
import { anthropicAt, LANDSCAPING, makeOrchestrator, makeRealOrchestrator, pexelsAt } from "./helpers";
import { golden, makeAnswer, type Golden } from "./mock-llm";
import { startAnthropicMock, startPexelsMock } from "./mocks";

let g: Golden;
before(async () => { g = await golden(); });

const KEYS = ["LLM_PROVIDER", "ANTHROPIC_API_KEY", "ANTHROPIC_AUTH_TOKEN", "ANTHROPIC_MODEL", "OPENAI_API_KEY", "OPENAI_MODEL", "PEXELS_API_KEY", "STUDIO_REQUIRE_REAL", "HIGGSFIELD_API_KEY", "HF_KEY", "HIGGSFIELD_MODEL_PATH"];
async function withEnv(vars: Record<string, string | undefined>, fn: () => Promise<void> | void) {
  const saved = Object.fromEntries(KEYS.map((k) => [k, process.env[k]]));
  for (const k of KEYS) delete process.env[k];
  for (const [k, v] of Object.entries(vars)) if (v !== undefined) process.env[k] = v;
  try { await fn(); } finally { for (const k of KEYS) { if (saved[k] === undefined) delete process.env[k]; else process.env[k] = saved[k]; } }
}

test("provider selection via environment: Anthropic is the default and is never silently swapped", async () => {
  await withEnv({}, () => { const l = createLLM(); assert.equal(l.name, "anthropic"); assert.equal(l.available, false); assert.deepEqual(l.missing, ["ANTHROPIC_API_KEY"]); });
  await withEnv({ ANTHROPIC_API_KEY: "a" }, () => { const l = createLLM(); assert.equal(l.name, "anthropic"); assert.equal(l.available, true); assert.equal(l.model, DEFAULT_ANTHROPIC_MODEL); assert.equal(DEFAULT_ANTHROPIC_MODEL, "claude-opus-5-5"); });
  await withEnv({ ANTHROPIC_API_KEY: "a", ANTHROPIC_MODEL: "claude-sonnet-5-5" }, () => assert.equal(createLLM().model, "claude-sonnet-5-5"));
  await withEnv({ ANTHROPIC_API_KEY: "a", OPENAI_API_KEY: "o", OPENAI_MODEL: "m" }, () => assert.equal(createLLM().name, "anthropic", "Anthropic wins when both are configured"));
  await withEnv({ OPENAI_API_KEY: "o", OPENAI_MODEL: "m" }, () => assert.equal(createLLM().name, "openai", "OpenAI used when it is the only complete provider"));
  await withEnv({ LLM_PROVIDER: "openai", ANTHROPIC_API_KEY: "a", OPENAI_API_KEY: "o", OPENAI_MODEL: "gpt-x" }, () => { const l = createLLM(); assert.equal(l.name, "openai"); assert.equal(l.model, "gpt-x"); });
  await withEnv({ LLM_PROVIDER: "openai", ANTHROPIC_API_KEY: "a" }, () => { const l = createLLM(); assert.equal(l.name, "openai"); assert.equal(l.available, false, "explicit openai is not replaced by anthropic"); assert.deepEqual(l.missing, ["OPENAI_API_KEY", "OPENAI_MODEL"]); });
  await withEnv({ LLM_PROVIDER: "offline", ANTHROPIC_API_KEY: "a" }, () => assert.ok(createLLM() instanceof OfflineProvider));
  await withEnv({ LLM_PROVIDER: "gemini" }, () => assert.throws(() => createLLM(), /Unknown LLM_PROVIDER "gemini"/));
  assert.equal(new OpenAIProvider({ apiKey: "k", model: "" }).available, false, "OpenAI needs an explicit model");
});

test("preflight names EXACTLY what is missing, and real mode refuses to run without it", async () => {
  await withEnv({}, async () => {
    const set = { llm: createLLM(), media: new NoMediaProvider(), video: new DisabledVideoProvider() };
    const pf = preflight(set);
    assert.equal(pf.ok, false);
    assert.equal(pf.providers.mode, "demo");
    assert.match(pf.problems[0], /LLM \(Anthropic\): set ANTHROPIC_API_KEY in \.env\.local/);
    assert.match(pf.problems[1], /Pexels: set PEXELS_API_KEY in \.env\.local/);
    // Real mode refuses to start: no stage runs, nothing is substituted.
    const { orch } = makeOrchestrator();
    const st = orch.create(LANDSCAPING);
    const final = await orch.run(st.id, { requireReal: true });
    assert.equal(final.status, "failed");
    assert.ok(final.stages.every((s) => s.status === "pending"), "no agent ran");
    const err = orch.store(st.id).events().find((e) => e.level === "error")!;
    assert.match(err.message, /Real-provider mode is required but not ready/);
  });
  await withEnv({ ANTHROPIC_API_KEY: "a" }, () => { const pf = preflight({ llm: createLLM(), media: new NoMediaProvider(), video: new DisabledVideoProvider() }); assert.equal(pf.providers.mode, "partial"); assert.equal(pf.problems.length, 1); });
  const ready = describeProviders({ llm: new AnthropicProvider({ apiKey: "a", model: "claude-opus-5-5" }), media: new PexelsProvider({ apiKey: "p" }), video: new DisabledVideoProvider() });
  assert.equal(ready.mode, "real");
  assert.equal(ready.llm.model, "claude-opus-5-5");
  assert.ok(!JSON.stringify(ready).includes('"a"'), "no secrets in the provider description");
});

test("connectivity probe distinguishes reachable hosts from blocked ones with the exact error", async () => {
  const pexels = await startPexelsMock();
  try {
    const probes = await probeConnectivity({ llm: createLLM(), media: new NoMediaProvider(), video: new DisabledVideoProvider() }, { llm: pexels.url, media: pexels.url, mediaCdn: pexels.url, video: "http://127.0.0.1:1/" });
    assert.equal(probes.find((p) => p.service === "Pexels API")!.reachable, true);
    const hf = probes.find((p) => p.service === "Higgsfield API")!;
    assert.equal(hf.reachable, false);
    assert.match(hf.detail, /fetch failed|ECONNREFUSED/);
  } finally { await pexels.close(); }
  // An egress proxy that answers 403 "Host not in allowlist" must be reported as BLOCKED, not as reachable.
  const { createServer } = await import("node:http");
  const proxy = createServer((_q, r) => { r.writeHead(403, { "x-deny-reason": "host_not_allowed", "content-type": "text/plain" }); r.end("Host not in allowlist: api.pexels.com. Add this host to your network egress settings to allow access."); });
  await new Promise<void>((r) => proxy.listen(0, "127.0.0.1", r));
  try {
    const u = `http://127.0.0.1:${(proxy.address() as import("node:net").AddressInfo).port}/`;
    const [blocked] = await probeConnectivity({ llm: createLLM(), media: new NoMediaProvider(), video: new DisabledVideoProvider() }, { llm: u, media: u, mediaCdn: u, video: u });
    assert.equal(blocked.reachable, false);
    assert.match(blocked.detail, /BLOCKED by network policy: Host not in allowlist/);
  } finally { proxy.close(); }
});

test("Pexels provider failures are exact: 401, 429 with rate-limit info, unreachable host", async () => {
  const mock = await startPexelsMock("k");
  try {
    await assert.rejects(new PexelsProvider({ apiKey: "bad", baseURL: mock.url }).searchImages("garden"), (e: Error) => e instanceof PexelsError && /\[pexels\] HTTP 401: Unauthorized Check PEXELS_API_KEY/.test(e.message));
    mock.failSearch = { status: 429, times: 1, body: "Too many requests" };
    await assert.rejects(new PexelsProvider({ apiKey: "k", baseURL: mock.url }).searchImages("garden"), /HTTP 429: Too many requests Rate limit hit \(remaining 0, resets at 1700000000\)/);
    const ok = await new PexelsProvider({ apiKey: "k", baseURL: mock.url }).searchImages("luxury garden", { orientation: "landscape" });
    assert.equal(ok.length, 5);
    assert.deepEqual([ok[0].source, ok[0].license, ok[0].credit?.name, ok[0].status], ["pexels", "Pexels License", "Photographer 0", "candidate"]);
    assert.match(ok[0].sourceUrl!, /^https:\/\/www\.pexels\.com\/photo\/luxury-garden-/);
    const vids = await new PexelsProvider({ apiKey: "k", baseURL: mock.url }).searchVideos("luxury garden");
    assert.equal(vids[0].variants!.length, 2);
  } finally { await mock.close(); }
  await assert.rejects(new PexelsProvider({ apiKey: "k", baseURL: "http://127.0.0.1:1" }).searchImages("x"), /Could not reach http:\/\/127\.0\.0\.1:1.*Check network access to api\.pexels\.com/);
  await assert.rejects(new PexelsProvider({ apiKey: undefined }).searchImages("x"), /PEXELS_API_KEY is not set/);
});

test("Brand agent sends the actual logo to the vision model and merges its analysis with pixel colors", async () => {
  const llm = await startAnthropicMock(makeAnswer(g));
  const pexels = await startPexelsMock();
  try {
    const { orch } = makeRealOrchestrator({ llm: anthropicAt(llm.url), media: pexelsAt(pexels.url) });
    const st = orch.create({ ...LANDSCAPING, logoPath: path.resolve("assets/dynatech/dynatech-logo.jpg"), businessName: "DynaTech" });
    await orch.run(st.id);
    const brandReq = llm.requests.find((r) => r.task === "brand-vision")!;
    assert.equal(brandReq.imageCount, 1, "logo image attached");
    const brand = orch.store(st.id).require("brand");
    assert.equal(brand.typographyCharacter, "geometric sans-serif");
    assert.ok(brand.colors.some((c) => c.role === "accent"), "pixel-derived colors retained");
    assert.ok(brand.personality.includes("precise"));
  } finally { await Promise.all([llm.close(), pexels.close()]); }
});

test("LLM QA reviewer finds a real problem → copy is rewritten by the LLM with that feedback → next review is clean", async () => {
  const pexels = await startPexelsMock();
  let reviews = 0;
  const base = makeAnswer(g, { videoDecision: "none" });
  const llm = await startAnthropicMock((r) => {
    if (r.task === "qa-review") return JSON.stringify({ issues: reviews++ === 0 ? [{ category: "content", severity: "major", message: "The hero sub-headline is vague about who this is for.", copyFix: "Make the hero sub-headline explicitly name high-income Miami homeowners." }] : [], summary: "ok" });
    return base(r);
  });
  try {
    const { orch } = makeRealOrchestrator({ llm: anthropicAt(llm.url), media: pexelsAt(pexels.url) });
    const st = orch.create(LANDSCAPING);
    const final = await orch.run(st.id);
    const copyCalls = llm.requests.filter((r) => r.task === "copy");
    assert.equal(copyCalls.length, 2, "copy regenerated once");
    assert.match(copyCalls[1].system, /Feedback to honor.*explicitly name high-income Miami homeowners/s);
    assert.equal(final.iteration, 1);
    assert.equal(orch.store(st.id).require("qa").verdict, "PASS");
    assert.equal(final.status, "completed");
  } finally { await Promise.all([pexels.close(), llm.close()]); }
});
