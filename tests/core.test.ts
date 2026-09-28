import assert from "node:assert/strict";
import path from "node:path";
import { test } from "node:test";
import { z } from "zod";
import { askLLM, type AgentContext } from "../src/core/agent";
import { contrast, ensureContrast } from "../src/core/color";
import { findBanned, findClaims } from "../src/core/lint";
import { ProjectMemoryStore } from "../src/core/memory";
import { extractJSON } from "../src/services/llm/json";
import { ProviderError, type LLMProvider } from "../src/services/llm/types";
import { brandAgent } from "../src/agents/brand";
import { tmpDir, LANDSCAPING } from "./helpers";

test("contrast helpers enforce WCAG ratios", () => {
  assert.ok(contrast("#000000", "#ffffff") > 20);
  const fixed = ensureContrast("#777777", "#808080", 4.5);
  assert.ok(contrast(fixed, "#808080") >= 4.5);
});

test("lint finds banned phrases and invented claims", () => {
  assert.deepEqual(findBanned("Welcome to our website. We are world-class."), ["welcome to our website", "world-class"]);
  assert.ok(findClaims("Over 20 years of experience").length > 0);
  assert.ok(findClaims("Award-winning, licensed and insured").length >= 2);
  assert.equal(findClaims("Design-build landscapes in Miami").length, 0);
});

test("extractJSON handles fences and surrounding prose", () => {
  assert.deepEqual(extractJSON('Sure!\n```json\n{"a":{"b":[1,2]}}\n```'), { a: { b: [1, 2] } });
  assert.deepEqual(extractJSON('text {"x":"}"} tail'), { x: "}" });
});

test("memory: decisions cannot be silently contradicted", () => {
  const mem = new ProjectMemoryStore("decision-test", tmpDir());
  mem.recordDecision({ agent: "creative", key: "direction", value: "cinematic-dark", rationale: "style" });
  assert.throws(() => mem.recordDecision({ agent: "copy", key: "direction", value: "bold-graphic", rationale: "x" }), /Decision conflict/);
  mem.recordDecision({ agent: "copy", key: "direction", value: "bold-graphic", rationale: "x", overrides: { previous: "cinematic-dark", because: "client request" } });
  assert.equal(mem.decisionValue("direction"), "bold-graphic");
});

function fakeCtx(llm: LLMProvider): AgentContext & { reports: { provider?: string; model?: string }[] } {
  const memory = new ProjectMemoryStore("llm-test", tmpDir());
  const reports: { provider?: string; model?: string }[] = [];
  return { input: LANDSCAPING, memory, llm, iteration: 0, log: () => {}, report: (i: { provider?: string; model?: string }) => reports.push(i), media: undefined as never, video: undefined as never, engines: undefined as never, reports } as never;
}
const fakeLLM = (fn: (n: number) => string, available = true): LLMProvider => { let n = 0; return { name: "fake", model: "fake-1", available, missing: [], complete: async () => ({ text: fn(n++), model: "fake-1-actual" }) }; };

test("askLLM: valid answer used and provider/model reported; demo fallback ONLY when no LLM is configured", async () => {
  const schema = z.object({ n: z.number() });
  const ctx = fakeCtx(fakeLLM(() => '{"n": 1}'));
  assert.deepEqual(await askLLM(ctx, { task: "t", system: "s", prompt: "p", schema, fallback: () => ({ n: 99 }) }), { n: 1 });
  assert.deepEqual(ctx.reports.at(-1), { provider: "fake", model: "fake-1-actual" });
  const demo = fakeCtx(fakeLLM(() => "{}", false));
  assert.deepEqual(await askLLM(demo, { task: "t", system: "s", prompt: "p", schema, fallback: () => ({ n: 99 }) }), { n: 99 });
  assert.equal(demo.reports.at(-1)?.provider, "knowledge-base (demo)");
});

test("askLLM: with an LLM configured, invalid output is NOT replaced by the fallback; the error is thrown", async () => {
  const schema = z.object({ n: z.number() });
  const ctx = fakeCtx(fakeLLM(() => '{"n": "nope"}'));
  await assert.rejects(askLLM(ctx, { task: "t", system: "s", prompt: "p", schema, fallback: () => ({ n: 99 }) }), (e: Error) => e instanceof ProviderError && /failed validation after a repair attempt/.test(e.message) && /n:/.test(e.message));
  // one repair round rescues a first bad answer
  const ctx2 = fakeCtx(fakeLLM((i: number) => (i === 0 ? "oops" : '{"n": 5}')));
  assert.deepEqual(await askLLM(ctx2, { task: "t", system: "s", prompt: "p", schema, fallback: () => ({ n: 99 }) }), { n: 5 });
  // semantic check failure is reported to the model and, if unresolved, thrown
  const ctx3 = fakeCtx(fakeLLM(() => '{"n": 5}'));
  await assert.rejects(askLLM(ctx3, { task: "t", system: "s", prompt: "p", schema, check: () => ["n must be even"], fallback: () => ({ n: 99 }) }), /n must be even/);
});

test("askLLM: provider errors propagate unchanged", async () => {
  const boom: LLMProvider = { name: "fake", model: "m", available: true, missing: [], complete: async () => { throw new ProviderError("fake", "rate-limit", "Rate limited (429): slow down", 429); } };
  await assert.rejects(askLLM(fakeCtx(boom), { task: "t", system: "s", prompt: "p", schema: z.object({}), fallback: () => ({}) }), /Rate limited \(429\): slow down/);
});

test("brand agent extracts the real DynaTech logo palette (blue accent on dark navy)", async () => {
  const logo = path.resolve(process.cwd(), "assets", "dynatech", "dynatech-logo.jpg");
  const memory = new ProjectMemoryStore("brand-test", tmpDir());
  const ctx = { ...fakeCtx(fakeLLM(() => "{}", false)), memory, input: { ...LANDSCAPING, logoPath: logo } } as AgentContext;
  const profile = await brandAgent.run(ctx);
  assert.equal(profile.provided, true);
  const accent = profile.colors.find((c) => c.role === "accent");
  assert.ok(accent, "accent found");
  const b = parseInt(accent!.hex.slice(5, 7), 16), r = parseInt(accent!.hex.slice(1, 3), 16);
  assert.ok(b > r + 60, `accent should be blue-dominant, got ${accent!.hex}`);
  const bg = profile.colors.find((c) => c.role === "background")!;
  assert.ok(parseInt(bg.hex.slice(1, 3), 16) < 60, `background should be dark, got ${bg.hex}`);
});
