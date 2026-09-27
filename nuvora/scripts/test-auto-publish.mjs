/**
 * Server-side auto-publish tests: draft key, fact-check key, admin key, and
 * the publication gate. Throwaway records only; all are deleted afterwards.
 *
 *   EDITORIAL_TEST_BASE_URL   default http://localhost:3930
 *   EDITORIAL_TEST_ADMIN_KEY  the server's NUVORA_EDITORIAL_API_KEY
 *   EDITORIAL_TEST_DRAFT_KEY  the server's NUVORA_GROK_DRAFT_KEY
 *   EDITORIAL_TEST_FACT_KEY   the server's NUVORA_FACTCHECK_KEY
 *
 *   npm run test:auto-publish
 *
 * Keys come from the environment and are never printed. Refuses to run
 * against production: it publishes records (briefly) to prove the gate works.
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
const ids = {
  valid: `TEST-AUTOPUB-VALID-${RUN}`,
  blocked: `TEST-AUTOPUB-BLOCKED-${RUN}`,
  missing: `TEST-AUTOPUB-MISSING-${RUN}`,
  admin: `TEST-AUTOPUB-ADMIN-${RUN}`,
};
const REAL_DRAFTS = ["NUVORA-AI-20260924-001", "NUVORA-AI-20260924-002"];
const created = new Set();
let realBefore = {};

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
  return { status: r.status, text: await r.text() };
};

function article(id, overrides = {}) {
  return {
    content_id: id,
    project: "AI",
    category: "everyday-ai",
    final_headline: `Auto publish test ${id}`,
    summary: "Automated publication-gate test record. Deleted after the run.",
    slug: id.toLowerCase(),
    author: "NUVORA",
    seo_title: "Auto publish test",
    seo_description: "Automated publication-gate test record.",
    sources: [{ title: "Example source", url: "https://example.com/source" }],
    verified_facts: [{ claim: "A test claim.", source: "https://example.com/source" }],
    article_body: [
      { type: "heading", level: 2, text: "Test section" },
      { type: "paragraph", text: "Automated publication-gate test body." },
    ],
    ...overrides,
  };
}
const pass = { fact_check_status: "PASS", fact_check_issues_count: 0, fact_check_completed_at: new Date().toISOString() };
const factCheck = (id, body, key = FACT) => call("POST", `/api/v1/editorial/articles/${id}/fact-check`, key, body);
const record = async (id) => (await call("GET", `/api/v1/editorial/articles/${id}?full=1`, ADMIN)).json;

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

describe("Draft key", () => {
  test("1. creates a DRAFT", async () => {
    const r = await call("POST", "/api/v1/editorial/articles", DRAFT, article(ids.valid));
    created.add(ids.valid);
    assert.equal(r.status, 201);
    assert.equal(r.json.publish_status, "DRAFT");
    assert.equal((await page(`/articles/${ids.valid.toLowerCase()}`)).status, 404, "draft is not public");
  });

  test("2. cannot set a fact-check result", async () => {
    // In the payload: stripped server-side.
    const r = await call("POST", "/api/v1/editorial/articles", DRAFT, article(ids.valid, {
      ...pass,
      needs_human_review: false,
      verified_facts: [{ claim: "A test claim.", source: "https://example.com/source", status: "VERIFIED" }],
    }));
    assert.equal(r.status, 200);
    const rec = (await record(ids.valid)).record;
    assert.equal(rec.fact_check_status, undefined);
    assert.equal(rec.fact_check_issues_count, undefined);
    assert.equal(rec.fact_check_completed_at, undefined);
    assert.equal(rec.verified_facts[0].status, undefined);
    assert.equal(rec.submitted_via, "automation");
    // Through the fact-check route: refused.
    const direct = await factCheck(ids.valid, pass, DRAFT);
    assert.equal(direct.status, 403);
    assert.equal((await record(ids.valid)).publish_status, "DRAFT");
  });
});

describe("Fact-check key", () => {
  test("3. cannot alter article content", async () => {
    const before = JSON.stringify((await record(ids.valid)).record);
    const smuggled = await factCheck(ids.valid, { ...pass, final_headline: "Changed", summary: "Changed" });
    assert.equal(smuggled.status, 400, "non-fact-check fields fail the whole request");
    const create = await call("POST", "/api/v1/editorial/articles", FACT, article(`TEST-FACT-CREATE-${RUN}`));
    created.add(`TEST-FACT-CREATE-${RUN}`);
    assert.equal(create.status, 403, "cannot create");
    const patch = await call("PATCH", `/api/v1/editorial/articles?id=${ids.valid}`, FACT, { summary: "Changed" });
    assert.equal(patch.status, 403, "cannot PATCH");
    assert.equal(JSON.stringify((await record(ids.valid)).record), before, "record unchanged");
  });

  test("4. cannot publish or delete directly", async () => {
    const pub = await call("POST", `/api/v1/editorial/articles/${ids.valid}/publish`, FACT, { publish_status: "published" });
    assert.equal(pub.status, 403);
    const del = await call("DELETE", `/api/v1/editorial/articles/${ids.valid}`, FACT);
    assert.equal(del.status, 403);
    for (const [m, p] of [["POST", "/api/v1/editorial/media"], ["POST", "/api/v1/editorial/schedule"], ["GET", "/api/v1/analytics"]]) {
      assert.equal((await call(m, p, FACT, m === "POST" ? {} : undefined)).status, 403, `${m} ${p}`);
    }
    assert.equal((await record(ids.valid)).publish_status, "DRAFT");
  });
});

describe("Server publication gate", () => {
  test("5. BLOCKED, and every other non-clean result, leaves the article DRAFT", async () => {
    await call("POST", "/api/v1/editorial/articles", DRAFT, article(ids.blocked));
    created.add(ids.blocked);
    const cases = [
      [{ fact_check_status: "BLOCKED", fact_check_issues_count: 0 }, "ARTICLE_BLOCKED"],
      [{ fact_check_status: "PARTIAL", fact_check_issues_count: 0 }, "FACT_CHECK_NOT_PASSED"],
      [{ fact_check_status: "CONFLICTING", fact_check_issues_count: 2 }, "FACT_CHECK_NOT_PASSED"],
      [{ fact_check_status: "OUTDATED", fact_check_issues_count: 1 }, "FACT_CHECK_NOT_PASSED"],
      [{ ...pass, fact_check_issues_count: 1 }, "UNRESOLVED_FACT_CHECK_ISSUES"],
      [{ ...pass, verified_facts: [{ claim: "A test claim.", source: "https://example.com/source", status: "CONFLICTING" }] }, "UNRESOLVED_FACT_CHECK_ISSUES"],
      [{ ...pass, needs_human_review: true }, "NEEDS_HUMAN_REVIEW"],
    ];
    for (const [body, reason] of cases) {
      // Reset the per-claim verdicts and review flag between cases.
      if (!body.verified_facts) body.verified_facts = [{ claim: "A test claim.", source: "https://example.com/source", status: "VERIFIED" }];
      if (body.needs_human_review === undefined) body.needs_human_review = false;
      const r = await factCheck(ids.blocked, body);
      assert.equal(r.status, 200, `${reason}: recorded`);
      assert.equal(r.json.auto_publish.published, false, `${reason}: not published`);
      assert.equal(r.json.auto_publish.reason, reason);
      assert.equal(r.json.publish_status, "DRAFT");
    }
    assert.equal((await record(ids.blocked)).publish_status, "DRAFT");
    assert.equal((await page(`/articles/${ids.blocked.toLowerCase()}`)).status, 404);
  });

  test("6. PASS with a missing required field leaves DRAFT", async () => {
    const noSeo = article(ids.missing);
    delete noSeo.seo_title;
    await call("POST", "/api/v1/editorial/articles", DRAFT, noSeo);
    created.add(ids.missing);
    const r = await factCheck(ids.missing, pass);
    assert.equal(r.json.auto_publish.published, false);
    assert.equal(r.json.auto_publish.reason, "MISSING_REQUIRED_FIELD");
    assert.match(r.json.auto_publish.detail, /seo_title/);
    assert.equal((await record(ids.missing)).publish_status, "DRAFT");
    assert.equal((await page(`/articles/${ids.missing.toLowerCase()}`)).status, 404);
  });

  test("7. PASS on a valid article auto-publishes", async () => {
    const r = await factCheck(ids.valid, { ...pass, needs_human_review: false });
    assert.equal(r.status, 200);
    assert.equal(r.json.auto_publish.published, true, JSON.stringify(r.json.auto_publish));
    assert.equal(r.json.publish_status, "PUBLISHED");
    assert.ok(r.json.published_at);
    assert.match(r.json.published_url, new RegExp(`/articles/${ids.valid.toLowerCase()}$`));
    const rec = (await record(ids.valid)).record;
    assert.equal(rec.fact_check_status, "PASS", "fact-check metadata preserved");
    assert.equal(rec.sources.length, 1, "sources preserved");
  });

  test("8. the published article is public without a rebuild", async () => {
    const slug = ids.valid.toLowerCase();
    assert.equal((await page(`/articles/${slug}`)).status, 200);
    assert.ok((await page("/")).text.includes(`Auto publish test ${ids.valid}`), "homepage");
    assert.ok((await page("/everyday-ai")).text.includes(`Auto publish test ${ids.valid}`), "category");
    assert.ok((await page("/sitemap.xml")).text.includes(slug), "sitemap");
    assert.ok((await page("/feed.xml")).text.includes(slug), "RSS");
    assert.ok((await page("/search-index.json")).text.includes(`Auto publish test ${ids.valid}`), "search index");
  });

  test("9. a repeated PASS does not publish twice, and bots cannot edit live content", async () => {
    const before = (await record(ids.valid)).record;
    const again = await factCheck(ids.valid, pass);
    assert.equal(again.status, 409);
    assert.equal(again.json.reason, "NOT_DRAFT");
    const resubmit = await call("POST", "/api/v1/editorial/articles", DRAFT, article(ids.valid, { summary: "Edited after publication." }));
    assert.equal(resubmit.status, 403, "draft key cannot touch a published record");
    const after = (await record(ids.valid)).record;
    assert.equal(after.published_at, before.published_at);
    assert.equal(after.summary, before.summary);
  });
});

describe("Admin key", () => {
  test("10. is unchanged, and admin-written drafts are never auto-published", async () => {
    const c = await call("POST", "/api/v1/editorial/articles", ADMIN, article(ids.admin));
    created.add(ids.admin);
    assert.equal(c.status, 201);
    assert.equal((await call("PATCH", `/api/v1/editorial/articles?id=${ids.admin}`, ADMIN, { summary: "Admin PATCH." })).status, 200);
    const fc = await factCheck(ids.admin, pass, ADMIN);
    assert.equal(fc.status, 200, "admin can record a fact check");
    assert.equal(fc.json.auto_publish.published, false);
    assert.equal(fc.json.auto_publish.reason, "NOT_AUTOMATION_SUBMISSION");
    const pub = await call("POST", `/api/v1/editorial/articles/${ids.admin}/publish`, ADMIN, { publish_status: "published" });
    assert.equal(pub.status, 200);
    assert.equal(pub.json.publish_status, "PUBLISHED");
    assert.equal((await call("DELETE", `/api/v1/editorial/articles/${ids.admin}`, ADMIN)).status, 200);
    created.delete(ids.admin);
    assert.equal((await page(`/articles/${ids.admin.toLowerCase()}`)).status, 404);
  });

  test("missing or wrong keys are refused on the fact-check route", async () => {
    assert.equal((await factCheck(ids.blocked, pass, "")).status, 401);
    assert.equal((await factCheck(ids.blocked, pass, `${FACT}x`)).status, 401);
  });
});

describe("Real drafts", () => {
  test("11. are untouched", async () => {
    for (const id of REAL_DRAFTS) {
      const r = await call("GET", `/api/v1/editorial/articles/${id}?full=1`, ADMIN);
      const now = r.status === 200 ? JSON.stringify(r.json.record) : `missing:${r.status}`;
      assert.equal(now, realBefore[id], `${id} changed`);
      if (r.status === 200) assert.equal(r.json.publish_status, "DRAFT", `${id} is still DRAFT`);
    }
  });
});
