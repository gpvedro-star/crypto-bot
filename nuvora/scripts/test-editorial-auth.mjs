/**
 * Editorial API credential tests — admin key vs Grok draft-only key.
 *
 * Runs against a live server (local dev by default), because authentication,
 * storage and route behaviour all have to hold together:
 *
 *   EDITORIAL_TEST_BASE_URL   default http://localhost:3930
 *   EDITORIAL_TEST_ADMIN_KEY  the server's NUVORA_EDITORIAL_API_KEY
 *   EDITORIAL_TEST_DRAFT_KEY  the server's NUVORA_GROK_DRAFT_KEY
 *
 *   npm run test:editorial-auth
 *
 * Keys are read from the environment and never printed. Every record the
 * tests create is deleted afterwards with the admin key. Point it only at a
 * local or preview server: it writes and deletes records.
 */
import { after, before, describe, test } from "node:test";
import assert from "node:assert/strict";

const BASE = (process.env.EDITORIAL_TEST_BASE_URL ?? "http://localhost:3930").replace(/\/$/, "");
const ADMIN = process.env.EDITORIAL_TEST_ADMIN_KEY ?? "";
const DRAFT = process.env.EDITORIAL_TEST_DRAFT_KEY ?? "";

if (!ADMIN || !DRAFT) {
  console.error("Set EDITORIAL_TEST_ADMIN_KEY and EDITORIAL_TEST_DRAFT_KEY to the server's two keys.");
  process.exit(2);
}
if (/nuvora-news\.netlify\.app/.test(BASE) && process.env.EDITORIAL_TEST_ALLOW_PRODUCTION !== "1") {
  console.error("Refusing to write test records to production.");
  process.exit(2);
}

const RUN = Date.now().toString(36).toUpperCase();
const GROK_ID = `TEST-GROK-AUTH-${RUN}`;
const ADMIN_ID = `TEST-ADMIN-AUTH-${RUN}`;
const created = new Set();

const auth = (key) => (key ? { Authorization: `Bearer ${key}` } : {});

async function call(method, path, key, body) {
  const res = await fetch(`${BASE}${path}`, {
    method,
    headers: { ...auth(key), ...(body ? { "Content-Type": "application/json" } : {}) },
    body: body ? JSON.stringify(body) : undefined,
  });
  let json = null;
  try {
    json = await res.json();
  } catch {
    /* non-JSON response */
  }
  return { status: res.status, json };
}

function article(id, overrides = {}) {
  return {
    content_id: id,
    project: "AI",
    category: "everyday-ai",
    final_headline: `Credential test ${id}`,
    summary: "Automated credential test record. Deleted after the run.",
    slug: id.toLowerCase(),
    author: "NUVORA",
    article_body: [{ type: "paragraph", text: "Automated credential test body." }],
    ...overrides,
  };
}

before(async () => {
  const probe = await fetch(`${BASE}/robots.txt`).catch(() => null);
  assert.ok(probe && probe.ok, `Server not reachable at ${BASE}`);
});

after(async () => {
  for (const id of created) await call("DELETE", `/api/v1/editorial/articles/${id}`, ADMIN);
});

describe("Grok draft-only key", () => {
  test("1. creates a draft", async () => {
    const r = await call("POST", "/api/v1/editorial/articles", DRAFT, article(GROK_ID));
    created.add(GROK_ID);
    assert.equal(r.status, 201);
    assert.equal(r.json.created, true);
    assert.equal(r.json.content_id, GROK_ID);
    assert.equal(r.json.publish_status, "DRAFT");
  });

  test("2. updates the same draft", async () => {
    const r = await call("POST", "/api/v1/editorial/articles", DRAFT, article(GROK_ID, { summary: "Revised summary from the second submission." }));
    assert.equal(r.status, 200);
    assert.equal(r.json.created, false);
    const back = await call("GET", `/api/v1/editorial/articles/${GROK_ID}?full=1`, DRAFT);
    assert.equal(back.status, 200, "draft key can read its draft back");
    assert.equal(back.json.record.summary, "Revised summary from the second submission.");
    assert.equal(back.json.publish_status, "DRAFT");
  });

  test("3. re-submitting a content_id does not duplicate it", async () => {
    const again = await call("POST", "/api/v1/editorial/articles", DRAFT, article(GROK_ID));
    assert.equal(again.status, 200);
    assert.equal(again.json.created, false);
    assert.equal(again.json.draft_id, GROK_ID);
    // A second content_id may not claim the same public URL either.
    created.add(`${GROK_ID}-B`);
    const clash = await call("POST", "/api/v1/editorial/articles", DRAFT, article(`${GROK_ID}-B`, { slug: GROK_ID.toLowerCase() }));
    assert.equal(clash.status, 409);
  });

  test("4. publish endpoint is refused", async () => {
    const r = await call("POST", `/api/v1/editorial/articles/${GROK_ID}/publish`, DRAFT, { publish_status: "published" });
    assert.ok([401, 403].includes(r.status), `expected 401/403, got ${r.status}`);
    const back = await call("GET", `/api/v1/editorial/articles/${GROK_ID}`, ADMIN);
    assert.equal(back.json.publish_status, "DRAFT", "record unchanged");
  });

  test("5. a payload asking for PUBLISHED stays DRAFT", async () => {
    for (const requested of ["PUBLISHED", "published", "SCHEDULED"]) {
      const r = await call("POST", "/api/v1/editorial/articles", DRAFT, article(GROK_ID, { publish_status: requested, published_at: new Date().toISOString() }));
      assert.equal(r.status, 200);
      assert.equal(r.json.publish_status, "DRAFT", `${requested} was not forced to DRAFT`);
      assert.match(r.json.note ?? "", /not applied/);
    }
    const back = await call("GET", `/api/v1/editorial/articles/${GROK_ID}`, ADMIN);
    assert.equal(back.json.publish_status, "DRAFT");
    const page = await fetch(`${BASE}/articles/${GROK_ID.toLowerCase()}`);
    assert.equal(page.status, 404, "draft is not public");
  });

  test("cannot delete, PATCH, or reach other admin routes", async () => {
    const del = await call("DELETE", `/api/v1/editorial/articles/${GROK_ID}`, DRAFT);
    assert.equal(del.status, 403);
    const patch = await call("PATCH", `/api/v1/editorial/articles?id=${GROK_ID}`, DRAFT, { summary: "x" });
    assert.equal(patch.status, 403);
    // Each admin route, called with the method it actually handles.
    for (const [method, path] of [["POST", "/api/v1/editorial/media"], ["POST", "/api/v1/editorial/schedule"], ["GET", "/api/v1/analytics"]]) {
      const r = await call(method, path, DRAFT, method === "POST" ? {} : undefined);
      assert.equal(r.status, 403, `${method} ${path} should refuse the draft key`);
    }
    const still = await call("GET", `/api/v1/editorial/articles/${GROK_ID}`, ADMIN);
    assert.equal(still.status, 200, "record survived the delete attempt");
  });

  test("cannot touch a record once it has left DRAFT", async () => {
    const moved = await call("POST", `/api/v1/editorial/articles/${GROK_ID}/publish`, ADMIN, { publish_status: "in_review" });
    assert.equal(moved.status, 200);
    const overwrite = await call("POST", "/api/v1/editorial/articles", DRAFT, article(GROK_ID, { summary: "Overwrite attempt." }));
    assert.equal(overwrite.status, 403);
    const read = await call("GET", `/api/v1/editorial/articles/${GROK_ID}`, DRAFT);
    assert.equal(read.status, 403);
    const back = await call("GET", `/api/v1/editorial/articles/${GROK_ID}?full=1`, ADMIN);
    assert.equal(back.json.publish_status, "IN_REVIEW");
    assert.notEqual(back.json.record.summary, "Overwrite attempt.");
  });
});

describe("Admin editorial key", () => {
  test("6. still does everything it did", async () => {
    const c = await call("POST", "/api/v1/editorial/articles", ADMIN, article(ADMIN_ID));
    created.add(ADMIN_ID);
    assert.equal(c.status, 201);
    assert.equal(c.json.publish_status, "DRAFT");

    const p = await call("PATCH", `/api/v1/editorial/articles?id=${ADMIN_ID}`, ADMIN, { summary: "Admin PATCH." });
    assert.equal(p.status, 200);

    const pub = await call("POST", `/api/v1/editorial/articles/${ADMIN_ID}/publish`, ADMIN, { publish_status: "in_review" });
    assert.equal(pub.status, 200);
    assert.equal(pub.json.publish_status, "IN_REVIEW");

    const read = await call("GET", `/api/v1/editorial/articles/${ADMIN_ID}`, ADMIN);
    assert.equal(read.status, 200);

    // Admin may still edit a record the draft key can no longer touch.
    const edit = await call("POST", "/api/v1/editorial/articles", ADMIN, article(ADMIN_ID, { summary: "Admin re-submission." }));
    assert.equal(edit.status, 200);

    const del = await call("DELETE", `/api/v1/editorial/articles/${ADMIN_ID}`, ADMIN);
    assert.equal(del.status, 200);
    created.delete(ADMIN_ID);
  });
});

describe("Missing or wrong credentials", () => {
  test("7. are refused everywhere", async () => {
    const cases = [
      ["POST", "/api/v1/editorial/articles", article(`TEST-NOKEY-${RUN}`)],
      ["GET", `/api/v1/editorial/articles/${GROK_ID}`],
      ["POST", `/api/v1/editorial/articles/${GROK_ID}/publish`, { publish_status: "published" }],
      ["DELETE", `/api/v1/editorial/articles/${GROK_ID}`],
    ];
    for (const [method, path, body] of cases) {
      const none = await call(method, path, "", body);
      assert.equal(none.status, 401, `${method} ${path} without a key`);
      const wrong = await call(method, path, `${DRAFT}x`, body);
      assert.equal(wrong.status, 401, `${method} ${path} with a wrong key`);
      const lower = await call(method, path, ADMIN.slice(0, -1), body);
      assert.equal(lower.status, 401, `${method} ${path} with a truncated key`);
    }
    const nope = await call("GET", `/api/v1/editorial/articles/TEST-NOKEY-${RUN}`, ADMIN);
    assert.equal(nope.status, 404, "an unauthenticated POST created nothing");
  });
});
