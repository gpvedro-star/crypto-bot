import assert from "node:assert/strict";
import path from "node:path";
import { test } from "node:test";
import { z } from "zod";
import { askOrFallback, type AgentContext } from "../src/core/agent";
import { contrast, ensureContrast } from "../src/core/color";
import { findBanned, findClaims } from "../src/core/lint";
import { ProjectMemoryStore } from "../src/core/memory";
import { extractJSON } from "../src/services/llm/json";
import type { LLMProvider } from "../src/services/llm/types";
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

function fakeCtx(llm: LLMProvider): AgentContext {
  const memory = new ProjectMemoryStore("llm-test", tmpDir());
  const used: string[] = [];
  return { input: LANDSCAPING, memory, llm, iteration: 0, log: () => {}, report: (i) => { if (i.usedLLM) used.push(i.usedLLM); }, media: undefined as never, video: undefined as never, engines: undefined as never, ...{ _used: used } } as AgentContext;
}

test("askOrFallback uses a valid LLM answer, and falls back when the model output is invalid", async () => {
  const schema = z.object({ n: z.number() });
  const good: LLMProvider = { name: "fake", available: true, completeJSON: async (r) => r.schema.parse({ n: 1 }) };
  const bad: LLMProvider = { name: "fake", available: true, completeJSON: async (r) => r.schema.parse({ n: "nope" }) };
  const run = (llm: LLMProvider) => askOrFallback(fakeCtx(llm), { task: "t", system: "s", prompt: "p", schema, fallback: () => ({ n: 99 }) });
  assert.deepEqual(await run(good), { n: 1 });
  assert.deepEqual(await run(bad), { n: 99 });
});

test("brand agent extracts the real DynaTech logo palette (blue accent on dark navy)", async () => {
  const logo = path.resolve(process.cwd(), "..", "assets", "dynatech", "dynatech-logo.jpg");
  const memory = new ProjectMemoryStore("brand-test", tmpDir());
  const ctx = { ...fakeCtx({ name: "x", available: false, completeJSON: async () => { throw new Error(); } }), memory, input: { ...LANDSCAPING, logoPath: logo } } as AgentContext;
  const profile = await brandAgent.run(ctx);
  assert.equal(profile.provided, true);
  const accent = profile.colors.find((c) => c.role === "accent");
  assert.ok(accent, "accent found");
  const b = parseInt(accent!.hex.slice(5, 7), 16), r = parseInt(accent!.hex.slice(1, 3), 16);
  assert.ok(b > r + 60, `accent should be blue-dominant, got ${accent!.hex}`);
  const bg = profile.colors.find((c) => c.role === "background")!;
  assert.ok(parseInt(bg.hex.slice(1, 3), 16) < 60, `background should be dark, got ${bg.hex}`);
});
