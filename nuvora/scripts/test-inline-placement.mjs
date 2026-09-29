/**
 * Offline tests for the inline image: where it goes in the body, how its one
 * search query is built, and that it can never be the hero's photo. No
 * network, no key.
 *
 *   npm run test:inline-placement
 */
import { test } from "node:test";
import assert from "node:assert/strict";
import { INLINE_TARGET, inlineInsertIndex, withInlineImage } from "../src/lib/editorial/inline-placement.ts";
import { buildInlinePexelsQuery, buildPexelsQuery, selectPexelsPhoto } from "../src/lib/editorial/pexels-select.ts";

const p = (n = 400) => ({ type: "paragraph", text: "x".repeat(n) });
const h = (text = "Section") => ({ type: "heading", level: 2, text });
const image = { src: "/media/articles/T/inline-1", alt: "A phone showing account activity", width: 1920, height: 1280 };

test("goes after a paragraph near the middle of the text", () => {
  const body = [p(), h(), p(), p(), h(), p(), p(), h(), p(), p()];
  const at = inlineInsertIndex(body);
  assert.equal(body[at - 1].type, "paragraph");
  const before = body.slice(0, at).reduce((s, b) => s + (b.text?.length ?? 0), 0);
  const total = body.reduce((s, b) => s + (b.text?.length ?? 0), 0);
  assert.ok(Math.abs(before / total - INLINE_TARGET) < 0.15, `at ${(before / total).toFixed(2)} of the text`);
});

test("never directly after the first paragraph, never as the last block", () => {
  const body = [p(4000), p(), p()];
  const at = inlineInsertIndex(body);
  assert.notEqual(at, 1, "not right after the opening paragraph");
  assert.notEqual(at, body.length, "not at the very end, against Sources");
});

test("never directly before a list, quote or table, and never inside one", () => {
  const body = [p(), p(), p(), { type: "list", style: "bullet", items: ["a", "b"] }, p(), { type: "quote", text: "q" }, p(), p()];
  const at = inlineInsertIndex(body);
  assert.ok(at > 0);
  assert.equal(body[at - 1].type, "paragraph");
  assert.ok(!["list", "quote", "table"].includes(body[at].type));
});

test("a piece too short for a sensible gap gets no inline photo", () => {
  assert.equal(inlineInsertIndex([p()]), -1);
  assert.equal(inlineInsertIndex([h(), p()]), -1);
  assert.equal(inlineInsertIndex([]), -1);
});

test("deterministic: same body, same position; one image block inserted", () => {
  const body = [p(), h(), p(), p(), p(), h(), p(), p()];
  const a = withInlineImage(body, image);
  const b = withInlineImage(body, image);
  assert.deepEqual(a, b);
  assert.equal(a.length, body.length + 1);
  assert.equal(a.filter((x) => x.type === "image").length, 1);
});

test("legacy records with no inline image render exactly as before", () => {
  const body = [p(), h(), p(), p()];
  assert.equal(withInlineImage(body, null), body);
});

test("inline query uses inline_image_brief, not the hero brief", () => {
  const fields = {
    image_brief: "A middle-aged woman using a laptop at a kitchen table",
    inline_image_brief: "A close-up of a phone showing security settings while someone reviews account activity",
    final_headline: "Check who signed in to your account",
  };
  const inline = buildInlinePexelsQuery(fields);
  assert.notEqual(inline, buildPexelsQuery(fields));
  assert.match(inline, /phone/);
  assert.doesNotMatch(inline, /kitchen/);
});

test("without an inline brief, the summary leads (not the hero's image_brief)", () => {
  const q = buildInlinePexelsQuery({ image_brief: "kitchen table laptop woman", summary: "Grandparents video calling family abroad", final_headline: "x" });
  assert.equal(q, "grandparents video calling family abroad");
});

const photo = (id) => ({
  id,
  width: 6000,
  height: 4000,
  url: `https://www.pexels.com/photo/${id}/`,
  photographer: "Ana Example",
  alt: "Phone on a desk",
  src: { original: `https://images.pexels.com/photos/${id}/p.jpeg` },
});

test("the hero's Pexels photo can never be chosen as the inline photo", () => {
  const results = [photo(111), photo(222), photo(333)];
  assert.equal(selectPexelsPhoto(results)?.id, 111, "hero would pick the first");
  assert.equal(selectPexelsPhoto(results, { excludeIds: [111] })?.id, 222, "inline skips the hero's photo");
  assert.equal(selectPexelsPhoto([photo(111)], { excludeIds: [111] }), null, "only the hero's photo → none");
});
