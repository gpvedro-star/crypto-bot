/**
 * Hero-image pipeline tests: the restricted generate-image endpoint (one
 * Pexels lookup per call), the HERO_IMAGE_MISSING gate, storage, and
 * end-to-end publication. Throwaway records only; all are deleted afterwards.
 *
 *   EDITORIAL_TEST_BASE_URL   default http://localhost:3930
 *   EDITORIAL_TEST_ADMIN_KEY  the server's NUVORA_EDITORIAL_API_KEY
 *   EDITORIAL_TEST_DRAFT_KEY  the server's NUVORA_GROK_DRAFT_KEY
 *   EDITORIAL_TEST_FACT_KEY   the server's NUVORA_FACTCHECK_KEY
 *
 *   npm run test:hero-image
 *
 * Keys come from the environment and are never printed. Refuses to run
 * against production. The tests that need a real attached photo are skipped —
 * not faked — when the server has no PEXELS_API_KEY or Pexels returns no
 * suitable photo; the run says so plainly rather than reporting a false PASS.
 * The deterministic query/selection rules are covered offline by
 * npm run test:pexels-select.
 */
import { after, before, describe, test } from "node:test";
import assert from "node:assert/strict";

const BASE = (process.env.EDITORIAL_TEST_BASE_URL ?? "http://localhost:3930").replace(/\/$/, "");
const ADMIN = process.env.EDITORIAL_TEST_ADMIN_KEY ?? "";
const DRAFT = process.env.EDITORIAL_TEST_DRAFT_KEY ?? "";
const FACT = process.env.EDITORIAL_TEST_FACT_KEY ?? "";

if (!ADMIN || !DRAFT || !FACT) {
  console.error("Set EDITORIAL_TEST_ADMIN_KEY, EDITORIAL_TEST_DRAFT_KEY and EDITORIAL_TEST_FACT_KEY.");
  process.exit(2);
}
if (/nuvora-news\.netlify\.app/.test(BASE)) {
  console.error("Refusing to run publication tests against production.");
  process.exit(2);
}

const RUN = Date.now().toString(36).toUpperCase();
const ID = `TEST-HEROIMG-${RUN}`;
const REAL_DRAFTS = ["NUVORA-AI-20260924-001", "NUVORA-AI-20260924-002"];
const created = new Set();
let realBefore = {};
let imageConfigured = null;

async function call(method, path, key, body) {
  const res = await fetch(`${BASE}${path}`, {
    method,
    headers: { ...(key ? { Authorization: `Bearer ${key}` } : {}), ...(body ? { "Content-Type": "application/json" } : {}) },
    body: body ? JSON.stringify(body) : undefined,
  });
  let json = null;
  try {
    json = await res.json();
  } catch {
    /* non-JSON */
  }
  return { status: res.status, json, headers: res.headers };
}
const page = async (path) => {
  const r = await fetch(`${BASE}${path}`);
  return { status: r.status, text: await r.text(), headers: r.headers };
};

function article(overrides = {}) {
  return {
    content_id: ID,
    project: "AI",
    category: "everyday-ai",
    final_headline: "Hero image pipeline test",
    summary: "Automated hero-image test record. Deleted after the run.",
    slug: ID.toLowerCase(),
    author: "NUVORA",
    image_brief: "A quiet desk with a notebook and a cup of coffee, morning light.",
    seo_title: "Hero image pipeline test",
    seo_description: "Automated hero-image test record.",
    sources: [{ title: "Example source", url: "https://example.com/source" }],
    article_body: [
      { type: "heading", level: 2, text: "Test section" },
      { type: "paragraph", text: "Automated hero-image test body." },
    ],
    ...overrides,
  };
}
const pass = { fact_check_status: "PASS", fact_check_issues_count: 0 };
const factCheck = (body) => call("POST", `/api/v1/editorial/articles/${ID}/fact-check`, FACT, body);
const generateImage = (key = DRAFT) => call("POST", `/api/v1/editorial/articles/${ID}/generate-image`, key);
const record = async () => (await call("GET", `/api/v1/editorial/articles/${ID}?full=1`, ADMIN)).json;

before(async () => {
  const probe = await fetch(`${BASE}/robots.txt`).catch(() => null);
  assert.ok(probe && probe.ok, `Server not reachable at ${BASE}`);
  for (const id of REAL_DRAFTS) {
    const r = await call("GET", `/api/v1/editorial/articles/${id}?full=1`, ADMIN);
    realBefore[id] = r.status === 200 ? JSON.stringify(r.json.record) : `missing:${r.status}`;
  }
});

after(async () => {
  for (const id of created) await call("DELETE", `/api/v1/editorial/articles/${id}`, ADMIN);
});

test("1. draft without a hero image cannot auto-publish", async () => {
  await call("POST", "/api/v1/editorial/articles", DRAFT, article());
  created.add(ID);
  const r = await factCheck(pass);
  assert.equal(r.status, 200);
  assert.equal(r.json.auto_publish.published, false);
  // 2. the blocking reason is HERO_IMAGE_MISSING
  assert.equal(r.json.auto_publish.reason, "HERO_IMAGE_MISSING");
  assert.equal(r.json.publish_status, "DRAFT");
  // Clear the fact check for the tests below (a re-submission does this too).
  await call("POST", "/api/v1/editorial/articles", DRAFT, article());
});

describe("Restricted image endpoint", () => {
  test("only the draft or admin key may request an image; the fact-check key cannot", async () => {
    const viaFact = await call("POST", `/api/v1/editorial/articles/${ID}/generate-image`, FACT);
    assert.equal(viaFact.status, 403);
    const noKey = await call("POST", `/api/v1/editorial/articles/${ID}/generate-image`, "");
    assert.equal(noKey.status, 401);
    assert.equal((await record()).record.hero_image_attached, undefined, "no image attached yet");
  });

  test("refuses an id that does not exist", async () => {
    const notFound = await call("POST", `/api/v1/editorial/articles/TEST-HEROIMG-DOES-NOT-EXIST-${RUN}/generate-image`, DRAFT);
    assert.equal(notFound.status, 404);
  });

  // 3. the restricted key can request an image for its own draft; the rest
  // need Pexels to actually return a photo, which needs PEXELS_API_KEY.
  test("3/4/5/6. the draft key attaches and persists one Pexels hero for its own draft", async () => {
    const before = JSON.stringify((await record()).record);
    const r = await generateImage();
    if (r.status === 503 || r.status === 422) {
      imageConfigured = false;
      assert.equal(r.json?.success, false);
      assert.equal(r.json?.reason, r.status === 503 ? "PEXELS_NOT_CONFIGURED" : "HERO_IMAGE_MISSING");
      // Nothing attached: the draft is byte-for-byte what it was, still DRAFT.
      assert.equal(JSON.stringify((await record()).record), before, "draft unchanged when no image is attached");
      console.log(`  (${r.json.reason} — remaining hero-image tests are skipped, not faked)`);
      return;
    }
    imageConfigured = true;
    assert.equal(r.status, 200, JSON.stringify(r.json));
    assert.equal(r.json.success, true);
    assert.equal(r.json.publish_status, "DRAFT", "attaching an image never publishes");
    assert.ok(r.json.image.url.startsWith(`/media/articles/${ID}`), r.json.image.url);
    assert.ok(r.json.image.width > 0 && r.json.image.height > 0);
    assert.match(r.json.image.credit, /^Photo by .+ on Pexels$/);
    assert.ok(r.json.image.source_page.startsWith("https://www.pexels.com/"), r.json.image.source_page);
    // 8. the Pexels key is never in the response.
    assert.doesNotMatch(JSON.stringify(r.json), /authorization|api[_-]?key/i, "no credential in the response");

    // 6. the draft record carries correct image metadata, and only that changed.
    const rec = (await record()).record;
    assert.equal(rec.hero_image_attached, true);
    assert.equal(rec.hero_image_source?.provider, "pexels");
    assert.ok(Number.isInteger(rec.hero_image_source?.id));
    assert.equal(rec.image_assets?.[0]?.url, r.json.image.url);
    assert.equal(rec.image_assets[0].width, r.json.image.width);
    assert.ok(rec.image_assets[0].alt?.length > 0, "has alt text");
    assert.equal(rec.image_assets[0].credit, r.json.image.credit);
    assert.equal(rec.image_assets[0].source_page, r.json.image.source_page);
    assert.ok(rec.image_assets[0].photographer?.length > 0, "photographer stored");
    const was = JSON.parse(before);
    for (const field of ["final_headline", "summary", "article_body", "sources", "category", "slug", "publish_status"]) {
      assert.deepEqual(rec[field], was[field], `${field} untouched by the image endpoint`);
    }

    // 7. the image URL itself returns 200 with an image content type.
    const img = await page(r.json.image.url);
    assert.equal(img.status, 200);
    assert.match(img.headers.get("content-type") ?? "", /^image\//);
  });

  test("a second explicit call replaces rather than accumulating stale assets", async (t) => {
    if (imageConfigured !== true) return t.skip("no image was attached");
    const first = (await record()).record.image_assets[0].url;
    const r = await generateImage();
    assert.equal(r.status, 200);
    const rec = (await record()).record;
    assert.equal(rec.image_assets.length, 1, "old server-attached hero was replaced, not appended");
    assert.equal(rec.image_assets[0].url, first, "same predictable path — content_id is the key");
  });
});

describe("Publication with a hero image", () => {
  test("9. Fact Check PASS after a successful image causes publication", async (t) => {
    if (imageConfigured !== true) return t.skip("no image was attached");
    const r = await factCheck(pass);
    assert.equal(r.status, 200);
    assert.equal(r.json.auto_publish.published, true, JSON.stringify(r.json.auto_publish));
    assert.equal(r.json.publish_status, "PUBLISHED");
  });

  test("10. the published article renders the attached hero (desktop and mobile)", async (t) => {
    if (imageConfigured !== true) return t.skip("no image was attached");
    const slug = ID.toLowerCase();
    const rec = (await record()).record;
    const heroUrl = rec.image_assets[0].url;
    const html = (await page(`/articles/${slug}`)).text;
    // next/image rewrites the src through its own optimizer; the original
    // path is still present in the encoded query string either way.
    assert.ok(html.includes(encodeURIComponent(heroUrl)) || html.includes(heroUrl), "hero URL present in the article HTML");
    assert.match(html, /<img[^>]+srcset/i, "responsive image markup is present, which is what serves a mobile-sized crop");
  });

  test("the image endpoint refuses a record that has left DRAFT", async (t) => {
    if (imageConfigured !== true) return t.skip("nothing was published");
    const before = JSON.stringify((await record()).record);
    const r = await generateImage();
    assert.equal(r.status, 409);
    assert.equal(r.json.reason, "NOT_DRAFT");
    assert.equal(JSON.stringify((await record()).record), before, "published record untouched");
  });

  test("11. cleans itself up: publishing does not affect other content", async () => {
    for (const id of REAL_DRAFTS) {
      const r = await call("GET", `/api/v1/editorial/articles/${id}?full=1`, ADMIN);
      const now = r.status === 200 ? JSON.stringify(r.json.record) : `missing:${r.status}`;
      assert.equal(now, realBefore[id], `${id} changed`);
    }
  });
});
