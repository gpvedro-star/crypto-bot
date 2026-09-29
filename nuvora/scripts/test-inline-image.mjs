/**
 * Inline image pipeline tests against a running server: the restricted
 * inline-image endpoint, duplicate protection, hero ≠ inline, the
 * INLINE_IMAGE_MISSING gate, publication, midpoint rendering, and legacy
 * articles without an inline photo. Throwaway records only; all deleted after.
 *
 *   EDITORIAL_TEST_BASE_URL   default http://localhost:3930
 *   EDITORIAL_TEST_ADMIN_KEY / EDITORIAL_TEST_DRAFT_KEY / EDITORIAL_TEST_FACT_KEY
 *
 *   npm run test:inline-image
 *
 * Keys come from the environment and are never printed. Refuses to run
 * against production. Tests that need real photos are skipped — not faked —
 * when the server has no PEXELS_API_KEY.
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
const ID = `TEST-INLINE-${RUN}`;
const LEGACY = `TEST-INLINE-LEGACY-${RUN}`;
const created = new Set();
let photos = null; // true once hero + inline are really attached

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
  return { status: res.status, json };
}
const page = async (path) => {
  const r = await fetch(`${BASE}${path}`);
  return { status: r.status, text: await r.text(), type: r.headers.get("content-type") ?? "" };
};

const para = (n) => ({
  type: "paragraph",
  text: `Paragraph ${n}. ${"People check their account security settings to see which devices signed in and when. ".repeat(4)}`,
});
function article(id, overrides = {}) {
  return {
    content_id: id,
    project: "AI",
    category: "everyday-ai",
    final_headline: `Inline image test ${id}`,
    summary: "Automated inline-image test record. Deleted after the run.",
    slug: id.toLowerCase(),
    author: "NUVORA",
    image_brief: "A middle-aged woman using a laptop at a kitchen table",
    inline_image_brief: "A close-up of a phone showing a security settings screen while someone reviews account activity",
    seo_title: "Inline image test",
    seo_description: "Automated inline-image test record.",
    sources: [{ title: "Example source", url: "https://example.com/source" }],
    article_body: [para(1), { type: "heading", level: 2, text: "Section one" }, para(2), para(3), { type: "heading", level: 2, text: "Section two" }, para(4), para(5), para(6)],
    ...overrides,
  };
}
const pass = { fact_check_status: "PASS", fact_check_issues_count: 0 };
const record = async (id = ID) => (await call("GET", `/api/v1/editorial/articles/${id}?full=1`, ADMIN)).json?.record;
const inlinePost = (key = DRAFT, id = ID) => call("POST", `/api/v1/editorial/articles/${id}/inline-image`, key);
const inlineGet = (id = ID) => call("GET", `/api/v1/editorial/articles/${id}/inline-image`, DRAFT);

before(async () => {
  const probe = await fetch(`${BASE}/robots.txt`).catch(() => null);
  assert.ok(probe && probe.ok, `Server not reachable at ${BASE}`);
  const r = await call("POST", "/api/v1/editorial/articles", DRAFT, article(ID));
  assert.equal(r.status, 201);
  created.add(ID);
});

after(async () => {
  for (const id of created) await call("DELETE", `/api/v1/editorial/articles/${id}`, ADMIN);
});

describe("Inline image endpoint", () => {
  test("the fact-check key is refused; no key is refused", async () => {
    assert.equal((await inlinePost(FACT)).status, 403);
    assert.equal((await inlinePost("")).status, 401);
  });

  test("requires the hero first: HERO_IMAGE_REQUIRED, draft unchanged", async () => {
    const before = JSON.stringify(await record());
    const r = await inlinePost();
    assert.equal(r.status, 409);
    assert.equal(r.json.image_status, "HERO_IMAGE_REQUIRED");
    assert.equal(r.json.inline_image_url, null);
    assert.equal(JSON.stringify(await record()), before);
  });

  test("GET before attach reports INLINE_IMAGE_MISSING without calling Pexels", async () => {
    const r = await inlineGet();
    assert.equal(r.status, 404);
    assert.equal(r.json.image_status, "INLINE_IMAGE_MISSING");
  });

  test("5. hero only: publication blocks with INLINE_IMAGE_MISSING", async (t) => {
    const hero = await call("POST", `/api/v1/editorial/articles/${ID}/generate-image`, DRAFT);
    if (hero.status !== 200) {
      photos = false;
      return t.skip(`no hero attached (${hero.json?.image_status ?? hero.status}) — photo tests skipped, not faked`);
    }
    const fc = await call("POST", `/api/v1/editorial/articles/${ID}/fact-check`, FACT, pass);
    assert.equal(fc.status, 200);
    assert.equal(fc.json.auto_publish.published, false);
    assert.equal(fc.json.auto_publish.reason, "INLINE_IMAGE_MISSING");
    assert.equal(fc.json.publish_status, "DRAFT");
  });

  test("1/2. the draft key attaches one inline photo, persisted with truthful metadata", async (t) => {
    if (photos === false) return t.skip("no hero");
    const before = await record();
    const r = await inlinePost();
    if (r.status !== 200) {
      photos = false;
      return t.skip(`no inline photo (${r.json?.image_status ?? r.status})`);
    }
    photos = true;
    assert.equal(r.json.success, true);
    assert.equal(r.json.image_status, "ATTACHED");
    assert.equal(r.json.publish_status, "DRAFT", "never publishes");
    assert.equal(r.json.inline_image_url, `/media/articles/${ID}/inline-1`);
    assert.match(r.json.image_credit, /^Photo by .+ on Pexels$/);
    assert.ok(r.json.source_page.startsWith("https://www.pexels.com/"));
    assert.ok(r.json.width > 0 && r.json.height > 0 && r.json.alt.length > 0);
    assert.ok(r.json.query.length > 0);
    assert.match(r.json.query, /phone|security|settings|account/, "query came from inline_image_brief");
    assert.doesNotMatch(JSON.stringify(r.json), /authorization|api[_-]?key/i);

    const rec = await record();
    assert.equal(rec.inline_image_attached, true);
    assert.equal(rec.inline_images.length, 1);
    const img = rec.inline_images[0];
    assert.equal(img.src, r.json.inline_image_url);
    assert.equal(img.placement, "middle");
    assert.equal(img.provider, "pexels");
    assert.ok(img.photographer.length > 0);
    // Only image fields changed.
    for (const f of ["final_headline", "summary", "article_body", "sources", "slug", "publish_status", "image_assets", "hero_image_source"]) {
      assert.deepEqual(rec[f], before[f], `${f} untouched`);
    }
    const media = await page(r.json.inline_image_url);
    assert.equal(media.status, 200);
    assert.match(media.type, /^image\//);
  });

  test("4. hero and inline are never the same Pexels asset", async (t) => {
    if (photos !== true) return t.skip("no photos");
    const rec = await record();
    assert.notEqual(rec.inline_images[0].pexels_id, rec.hero_image_source.id);
    assert.notEqual(rec.inline_images[0].src, rec.image_assets[0].url);
  });

  test("3. a second call is a no-op: ALREADY_ATTACHED, no new Pexels search", async (t) => {
    if (photos !== true) return t.skip("no photos");
    const before = await record();
    const post = await inlinePost();
    assert.equal(post.status, 200);
    assert.equal(post.json.image_status, "ALREADY_ATTACHED");
    assert.equal("query" in post.json, false, "no search ran");
    const get = await inlineGet();
    assert.equal(get.status, 200);
    assert.equal(get.json.image_status, "ALREADY_ATTACHED");
    const after = await record();
    assert.deepEqual(after.inline_images, before.inline_images, "same photo, not replaced");
  });

  test("the submission cannot smuggle inline image fields", async (t) => {
    if (photos !== true) return t.skip("no photos");
    const id = `TEST-INLINE-SMUGGLE-${RUN}`;
    await call("POST", "/api/v1/editorial/articles", DRAFT, article(id, {
      inline_image_attached: true,
      inline_images: [{ src: "/media/articles/x/inline-1", placement: "middle" }],
    }));
    created.add(id);
    const rec = await record(id);
    assert.equal(rec.inline_image_attached, undefined);
    assert.equal(rec.inline_images, undefined);
  });
});

describe("Publication and rendering", () => {
  test("6. hero + inline + Fact Check PASS publishes", async (t) => {
    if (photos !== true) return t.skip("no photos");
    const fc = await call("POST", `/api/v1/editorial/articles/${ID}/fact-check`, FACT, pass);
    assert.equal(fc.status, 200);
    assert.equal(fc.json.auto_publish.published, true, JSON.stringify(fc.json.auto_publish));
    assert.equal(fc.json.publish_status, "PUBLISHED");
  });

  test("the published article renders the inline photo mid-body, with its credit", async (t) => {
    if (photos !== true) return t.skip("no photos");
    const html = (await page(`/articles/${ID.toLowerCase()}`)).text;
    const inline = encodeURIComponent(`/media/articles/${ID}/inline-1`);
    const at = html.indexOf(inline);
    assert.ok(at > 0, "inline image in the page");
    const firstPara = html.indexOf("Paragraph 1.");
    const lastPara = html.indexOf("Paragraph 6.");
    assert.ok(firstPara > 0 && lastPara > 0);
    assert.ok(at > html.indexOf("Paragraph 2."), "not before the second paragraph");
    assert.ok(at < lastPara, "not after the last paragraph");
    assert.match(html, /Photo by [^<]+ on Pexels/);
  });

  test("the inline endpoint refuses a published record (NOT_DRAFT)", async (t) => {
    if (photos !== true) return t.skip("no photos");
    const r = await inlinePost();
    assert.equal(r.status, 409);
    assert.equal(r.json.image_status, "NOT_DRAFT");
  });

  test("7. a legacy published article with no inline image still renders", async () => {
    // Stand-in for articles published before this rule: published by the
    // admin route (which has no gate), with no inline image at all.
    await call("POST", "/api/v1/editorial/articles", ADMIN, article(LEGACY, { inline_image_brief: undefined }));
    created.add(LEGACY);
    const pub = await call("POST", `/api/v1/editorial/articles/${LEGACY}/publish`, ADMIN, { publish_status: "published" });
    assert.equal(pub.status, 200);
    const rec = await record(LEGACY);
    assert.equal(rec.inline_images, undefined);
    const html = await page(`/articles/${LEGACY.toLowerCase()}`);
    assert.equal(html.status, 200);
    assert.ok(html.text.includes("Paragraph 6."), "full body rendered");
    assert.ok(!html.text.includes("inline-1"), "no inline image invented");
  });
});
