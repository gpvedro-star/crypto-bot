/**
 * Offline tests for the deterministic Pexels selection rules. No network, no
 * key: fixture photos in, one decision out. Runs against the real module the
 * server uses (Node strips its types on import).
 *
 *   npm run test:pexels-select
 */
import { test } from "node:test";
import assert from "node:assert/strict";
import {
  HERO_WIDTH,
  buildPexelsQuery,
  heroRendition,
  pexelsCredit,
  selectPexelsPhoto,
} from "../src/lib/editorial/pexels-select.ts";

const photo = (overrides = {}) => ({
  id: 1,
  width: 6000,
  height: 4000,
  url: "https://www.pexels.com/photo/desk-1/",
  photographer: "Ana Example",
  photographer_url: "https://www.pexels.com/@ana",
  alt: "Notebook and coffee on a wooden desk",
  src: { original: "https://images.pexels.com/photos/1/pexels-photo-1.jpeg" },
  ...overrides,
});

test("query: image_brief wins, trimmed to eight meaningful words", () => {
  const q = buildPexelsQuery({
    image_brief: "A quiet kitchen table with reading glasses, a notebook, coffee and warm morning window light.",
    final_headline: "Something else entirely",
  });
  assert.equal(q, "quiet kitchen table reading glasses notebook coffee warm");
});

test("query: falls back to headline, then summary", () => {
  assert.equal(buildPexelsQuery({ final_headline: "Planning your week at the kitchen table" }), "planning week kitchen table");
  assert.equal(buildPexelsQuery({ final_headline: "AI", summary: "Grandparents video calling family abroad" }), "grandparents video calling family abroad");
});

test("query: drops AI and product words that pull stock results towards robots", () => {
  const q = buildPexelsQuery({ final_headline: "How ChatGPT and Gemini AI help retirees plan travel" });
  assert.doesNotMatch(q, /\b(ai|chatgpt|gemini)\b/);
  assert.equal(q, "help retirees plan travel");
});

test("query: category is only a last resort, never a bare section name", () => {
  assert.equal(buildPexelsQuery({ final_headline: "AI", category: "everyday-ai" }), "everyday life home kitchen");
  assert.equal(buildPexelsQuery({ final_headline: "AI", category: "unknown" }), "calm home office desk");
  assert.equal(buildPexelsQuery({}), "calm home office desk");
});

test("select: the first photo that passes every rule, in Pexels' order", () => {
  const chosen = selectPexelsPhoto([
    photo({ id: 10, width: 1200, height: 800 }), // too narrow
    photo({ id: 11, width: 4000, height: 4000 }), // square, not landscape
    photo({ id: 12, width: 8000, height: 2000 }), // too wide a panorama
    photo({ id: 13, alt: "A humanoid robot at a laptop" }), // excluded imagery
    photo({ id: 14, photographer: "  " }), // no one to credit
    photo({ id: 15 }), // first valid
    photo({ id: 16 }), // also valid, but later
  ]);
  assert.equal(chosen?.id, 15);
});

test("select: deterministic — same input, same photo, every time", () => {
  const input = [photo({ id: 21, alt: "neon city" }), photo({ id: 22 }), photo({ id: 23 })];
  const picks = new Set(Array.from({ length: 20 }, () => selectPexelsPhoto(input)?.id));
  assert.deepEqual([...picks], [22]);
});

test("select: nothing suitable returns null (the endpoint reports HERO_IMAGE_MISSING)", () => {
  assert.equal(selectPexelsPhoto([]), null);
  assert.equal(selectPexelsPhoto([photo({ alt: "Glowing brain hologram" }), photo({ width: 800, height: 500 })]), null);
});

test("rendition: 1920px wide from the original, height from the true aspect ratio", () => {
  const r = heroRendition(photo({ width: 6000, height: 4000 }));
  assert.equal(r.width, HERO_WIDTH);
  assert.equal(r.height, 1280);
  const u = new URL(r.url);
  assert.equal(u.origin + u.pathname, "https://images.pexels.com/photos/1/pexels-photo-1.jpeg");
  assert.equal(u.searchParams.get("w"), String(HERO_WIDTH));
});

test("credit: truthful Pexels attribution", () => {
  assert.equal(pexelsCredit({ photographer: " Ana Example " }), "Photo by Ana Example on Pexels");
});
