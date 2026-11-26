/**
 * Offline tests for the one Blobs scope resolver (src/lib/editorial/blob-scope.ts).
 * No network: they only exercise the decision.
 *
 * Two production failures live here. Reading the build-only CONTEXT variable
 * at runtime used to select a per-deploy store, so every new deploy started
 * empty. Treating a function runtime with no request context as `unavailable`
 * then let ISR cache that empty render as a 404. Background revalidation has
 * no Netlify.context and no CONTEXT, but Netlify still sets
 * NETLIFY_BLOBS_CONTEXT — that must resolve to the site-wide store.
 *
 *   npm run test:blob-scope
 */
import { afterEach, test } from "node:test";
import assert from "node:assert/strict";
import { editorialFailureIsFatal, openScopedBlobStore, resolveBlobScope } from "../src/lib/editorial/blob-scope.ts";

const saved = {
  NETLIFY: process.env.NETLIFY,
  CONTEXT: process.env.CONTEXT,
  NETLIFY_BLOBS_CONTEXT: process.env.NETLIFY_BLOBS_CONTEXT,
  NUVORA_BLOB_SCOPE: process.env.NUVORA_BLOB_SCOPE,
};

/** Minimal stand-in for the base64 JSON Netlify injects into the function runtime. */
const BLOBS_CONTEXT = Buffer.from(JSON.stringify({ siteID: "site", token: "token" })).toString("base64");

function setEnv({ netlify, context, blobsContext, pin } = {}) {
  if (netlify) process.env.NETLIFY = "true";
  else delete process.env.NETLIFY;
  if (context) process.env.CONTEXT = context;
  else delete process.env.CONTEXT;
  if (blobsContext) process.env.NETLIFY_BLOBS_CONTEXT = blobsContext;
  else delete process.env.NETLIFY_BLOBS_CONTEXT;
  if (pin) process.env.NUVORA_BLOB_SCOPE = pin;
  else delete process.env.NUVORA_BLOB_SCOPE;
}
function setRequestContext(deployContext) {
  if (deployContext === undefined) delete globalThis.Netlify;
  else globalThis.Netlify = { context: { deploy: { context: deployContext } } };
}

afterEach(() => {
  delete globalThis.Netlify;
  delete globalThis.netlifyBlobsContext;
  for (const [k, v] of Object.entries(saved)) {
    if (v === undefined) delete process.env[k];
    else process.env[k] = v;
  }
});

test("production request context → global store, whatever CONTEXT says", () => {
  setEnv({ netlify: true }); // CONTEXT unset: exactly the production function runtime
  setRequestContext("production");
  assert.equal(resolveBlobScope(), "global");
});

test("the old failure mode: production runtime without CONTEXT is never deploy-scoped", () => {
  setEnv({ netlify: true });
  setRequestContext("production");
  assert.notEqual(resolveBlobScope(), "deploy");
});

test("deploy previews and branch deploys stay isolated", () => {
  setEnv({ netlify: true, context: "production" }); // even with a misleading env var
  for (const ctx of ["deploy-preview", "branch-deploy", "dev"]) {
    setRequestContext(ctx);
    assert.equal(resolveBlobScope(), "deploy", ctx);
  }
});

test("production build step (no request, CONTEXT=production) reads the global store", () => {
  setEnv({ netlify: true, context: "production" });
  setRequestContext(undefined);
  assert.equal(resolveBlobScope(), "global");
});

test("on Netlify with no way to tell the scope: fail closed", () => {
  setEnv({ netlify: true });
  setRequestContext(undefined);
  assert.equal(resolveBlobScope(), "unavailable");
  const { scope, store } = openScopedBlobStore("nuvora-editorial");
  assert.equal(scope, "unavailable");
  assert.equal(store, null, "no silent fallback store");
});

test("ISR background revalidation: no request, NETLIFY_BLOBS_CONTEXT present, no CONTEXT → global", () => {
  // The production function runtime. CONTEXT is build-only and unset.
  // Background regeneration also has no Netlify.context. The blobs context
  // is still injected, and this must not come back `unavailable`.
  setEnv({ netlify: true, blobsContext: BLOBS_CONTEXT });
  setRequestContext(undefined);
  assert.equal(resolveBlobScope(), "global");
  assert.notEqual(resolveBlobScope(), "unavailable");
  assert.notEqual(resolveBlobScope(), "deploy");
});

test("the blobs context on globalThis is the same function-runtime signal", () => {
  setEnv({ netlify: true });
  setRequestContext(undefined);
  globalThis.netlifyBlobsContext = BLOBS_CONTEXT;
  assert.equal(resolveBlobScope(), "global");
});

test("a non-production build context never opens the site-wide store", () => {
  setEnv({ netlify: true, context: "deploy-preview", blobsContext: BLOBS_CONTEXT });
  setRequestContext(undefined);
  assert.equal(resolveBlobScope(), "unavailable");
});

test("NUVORA_BLOB_SCOPE=deploy pins a context-less runtime off the production store", () => {
  setEnv({ netlify: true, blobsContext: BLOBS_CONTEXT, pin: "deploy" });
  setRequestContext(undefined);
  assert.equal(resolveBlobScope(), "deploy");
});

test("a production request stays global even if NUVORA_BLOB_SCOPE says deploy", () => {
  setEnv({ netlify: true, pin: "deploy" });
  setRequestContext("production");
  assert.equal(resolveBlobScope(), "global");
});

test("an unknown NUVORA_BLOB_SCOPE fails closed instead of guessing production", () => {
  setEnv({ netlify: true, blobsContext: BLOBS_CONTEXT, pin: "site" });
  setRequestContext(undefined);
  assert.equal(resolveBlobScope(), "unavailable");
});

test("off Netlify, NUVORA_BLOB_SCOPE does not select a Blobs store", () => {
  setEnv({ pin: "global" });
  setRequestContext(undefined);
  assert.equal(resolveBlobScope(), "local");
});

test("a missing or unreadable store is fatal on Netlify and only local dev degrades", () => {
  for (const scope of ["global", "deploy", "unavailable"]) {
    assert.equal(editorialFailureIsFatal(scope), true, scope);
  }
  assert.equal(editorialFailureIsFatal("local"), false);
});

test("plain next dev off Netlify → local stand-in, and no Blobs store is opened", () => {
  setEnv({});
  setRequestContext(undefined);
  assert.equal(resolveBlobScope(), "local");
  assert.equal(openScopedBlobStore("nuvora-editorial").store, null);
});

test("hero and inline media use the same resolver as records (global in production)", async () => {
  const { readFile } = await import("node:fs/promises");
  for (const file of ["src/lib/editorial/image-store.ts", "src/lib/editorial/store.ts"]) {
    const src = await readFile(new URL(`../${file}`, import.meta.url), "utf8");
    assert.match(src, /openScopedBlobStore\(/, `${file} opens its store through blob-scope`);
    assert.doesNotMatch(src, /\bgetStore\(|\bgetDeployStore\(|process\.env\.CONTEXT/, `${file} never picks a store itself`);
  }
  // Inline photos live in the same image store under their own key.
  const img = await readFile(new URL("../src/lib/editorial/image-store.ts", import.meta.url), "utf8");
  assert.match(img, /articles\/\$\{contentId\}\/\$\{slot\}/);
});

test("sitemap, feed and /latest share the list that refuses an empty Netlify store", async () => {
  const { readFile } = await import("node:fs/promises");
  const live = await readFile(new URL("../src/lib/live-content.ts", import.meta.url), "utf8");
  assert.match(live, /editorialFailureIsFatal\(scope\)/);
  assert.match(live, /refusing to render empty content/);
  assert.doesNotMatch(live, /if \(!store\) return \[\]/);
  for (const file of ["src/app/sitemap.ts", "src/app/feed.xml/route.ts", "src/app/[category]/page.tsx"]) {
    const src = await readFile(new URL(`../${file}`, import.meta.url), "utf8");
    assert.match(src, /getLiveArticles\(/, `${file} renders through the live article list`);
  }
});
