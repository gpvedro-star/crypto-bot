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
const verifyImage = (key = DRAFT) => call("GET", `/api/v1/editorial/articles/${ID}/generate-image`, key);
const record = async () => (await call("GET", `/api/v1/editorial/articles/${ID}?full=1`, ADMIN)).json;

/** Every hero response — GET or POST, attached or already-attached — shares this shape. */
function assertHeroContract(json) {
  assert.equal(json.success, true);
  assert.equal(json.content_id, ID);
  assert.match(json.image_status, /^(ATTACHED|ALREADY_ATTACHED)$/);
  assert.ok(json.hero_url?.startsWith(`/media/articles/${ID}`), json.hero_url);
  assert.match(json.image_credit, /^Photo by .+ on Pexels$/);
  assert.ok(json.source_page?.startsWith("https://www.pexels.com/"), json.source_page);
  assert.ok(typeof json.request_id === "string" && json.request_id.length > 0);
}

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

  // 4. missing image: before anything is attached, the read-only verify path
  // reports it truthfully, with the same field names a real attach would use.
  test("4. GET reports HERO_IMAGE_MISSING when nothing is attached yet — no draft, no Pexels", async () => {
    const r = await verifyImage();
    assert.equal(r.status, 404);
    assert.equal(r.json.success, false);
    assert.equal(r.json.image_status, "HERO_IMAGE_MISSING");
    assert.equal(r.json.hero_url, null);
  });

  // 1/3. the restricted key can request an image for its own draft; the rest
  // need Pexels to actually return a photo, which needs PEXELS_API_KEY.
  test("1. newly attached: the draft key attaches and persists one Pexels hero, in the stable response contract", async () => {
    const before = JSON.stringify((await record()).record);
    const r = await generateImage();
    if (r.status === 503 || r.status === 422) {
      imageConfigured = false;
      assert.equal(r.json?.success, false);
      assert.equal(r.json?.image_status, r.status === 503 ? "PEXELS_NOT_CONFIGURED" : "HERO_IMAGE_MISSING");
      assert.equal(r.json?.reason, r.json?.image_status, "image_status and reason agree");
      assert.equal(r.json?.hero_url, null);
      // Nothing attached: the draft is byte-for-byte what it was, still DRAFT.
      assert.equal(JSON.stringify((await record()).record), before, "draft unchanged when no image is attached");
      console.log(`  (${r.json.image_status} — remaining hero-image tests are skipped, not faked)`);
      return;
    }
    imageConfigured = true;
    assert.equal(r.status, 200, JSON.stringify(r.json));
    assert.equal(r.json.image_status, "ATTACHED");
    assert.equal(r.json.publish_status, "DRAFT", "attaching an image never publishes");
    assertHeroContract(r.json);
    assert.ok(r.json.width > 0 && r.json.height > 0);
    assert.ok(typeof r.json.query === "string" && r.json.query.length > 0, "a real Pexels search ran");
    // 8. the Pexels key is never in the response.
    assert.doesNotMatch(JSON.stringify(r.json), /authorization|api[_-]?key/i, "no credential in the response");

    // 6. the draft record carries correct image metadata, and only that changed.
    const rec = (await record()).record;
    assert.equal(rec.hero_image_attached, true);
    assert.equal(rec.hero_image_source?.provider, "pexels");
    assert.ok(Number.isInteger(rec.hero_image_source?.id));
    assert.equal(rec.image_assets?.[0]?.url, r.json.hero_url);
    assert.equal(rec.image_assets[0].width, r.json.width);
    assert.ok(rec.image_assets[0].alt?.length > 0, "has alt text");
    assert.equal(rec.image_assets[0].credit, r.json.image_credit);
    assert.equal(rec.image_assets[0].source_page, r.json.source_page);
    assert.ok(rec.image_assets[0].photographer?.length > 0, "photographer stored");
    const was = JSON.parse(before);
    for (const field of ["final_headline", "summary", "article_body", "sources", "category", "slug", "publish_status"]) {
      assert.deepEqual(rec[field], was[field], `${field} untouched by the image endpoint`);
    }

    // 7. the image URL itself returns 200 with an image content type.
    const img = await page(r.json.hero_url);
    assert.equal(img.status, 200);
    assert.match(img.headers.get("content-type") ?? "", /^image\//);
  });

  // 2. already-attached image verification, via the read-only GET path —
  // confirms hero_image_attached, the hero URL, and that it resolves, without
  // any write and without ever touching Pexels.
  test("2. GET verifies an already-attached hero without generating another one", async (t) => {
    if (imageConfigured !== true) return t.skip("no image was attached");
    const before = (await record()).record;
    const r = await verifyImage();
    assert.equal(r.status, 200);
    assert.equal(r.json.image_status, "ALREADY_ATTACHED");
    assertHeroContract(r.json);
    assert.equal(r.json.hero_url, before.image_assets[0].url);
    assert.equal("query" in r.json, false, "a verify-only read never reports a search query");

    const img = await page(r.json.hero_url);
    assert.equal(img.status, 200, "the hero URL GET reported still resolves");

    // 3. no accidental second Pexels request: the stored photo and query are
    // exactly what the first attach recorded.
    const after = (await record()).record;
    assert.deepEqual(after.hero_image_source, before.hero_image_source, "same Pexels photo id and query as before");
    assert.equal(after.image_assets.length, 1);
  });

  // 3. no accidental second Pexels request — this time via a second explicit
  // POST, which the server must treat as a no-op rather than a regeneration.
  test("3. a second POST is idempotent: ALREADY_ATTACHED, same photo, no new Pexels search", async (t) => {
    if (imageConfigured !== true) return t.skip("no image was attached");
    const before = (await record()).record;
    const r = await generateImage();
    assert.equal(r.status, 200);
    assert.equal(r.json.image_status, "ALREADY_ATTACHED");
    assertHeroContract(r.json);
    assert.equal("query" in r.json, false, "no Pexels search ran on this call");
    const after = (await record()).record;
    assert.deepEqual(after.hero_image_source, before.hero_image_source, "identical Pexels photo id and query — not re-fetched");
    assert.equal(after.image_assets.length, 1, "not appended or replaced");
    assert.equal(after.image_assets[0].url, before.image_assets[0].url);
  });
});

describe("Publication with a hero image", () => {
  test("9. Fact Check PASS after hero + inline images causes publication", async (t) => {
    if (imageConfigured !== true) return t.skip("no image was attached");
    // New articles need the inline photo too (INLINE_IMAGE_MISSING otherwise).
    const inline = await call("POST", `/api/v1/editorial/articles/${ID}/inline-image`, DRAFT);
    if (inline.status !== 200) return t.skip(`no inline image attached (${inline.json?.image_status ?? inline.status})`);
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

  // 5. error response: same contract fields as success, reported truthfully.
  test("5. the image endpoint refuses a record that has left DRAFT, in the same response contract", async (t) => {
    if (imageConfigured !== true) return t.skip("nothing was published");
    const before = JSON.stringify((await record()).record);
    const r = await generateImage();
    assert.equal(r.status, 409);
    assert.equal(r.json.success, false);
    assert.equal(r.json.image_status, "NOT_DRAFT");
    assert.equal(r.json.reason, "NOT_DRAFT");
    assert.equal(r.json.hero_url, null);
    assert.equal(r.json.publish_status, "PUBLISHED");
    assert.equal(JSON.stringify((await record()).record), before, "published record untouched");

    // GET still verifies the (now-published) hero without any write.
    const v = await verifyImage();
    assert.equal(v.status, 200);
    assert.equal(v.json.image_status, "ALREADY_ATTACHED");
  });

  test("11. cleans itself up: publishing does not affect other content", async () => {
    for (const id of REAL_DRAFTS) {
      const r = await call("GET", `/api/v1/editorial/articles/${id}?full=1`, ADMIN);
      const now = r.status === 200 ? JSON.stringify(r.json.record) : `missing:${r.status}`;
      assert.equal(now, realBefore[id], `${id} changed`);
    }
  });
});
