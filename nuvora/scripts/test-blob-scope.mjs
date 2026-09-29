/**
 * Offline tests for the one Blobs scope resolver (src/lib/editorial/blob-scope.ts).
 * No network: they only exercise the decision, which is what went wrong in
 * production — every request resolved to a per-deploy store because the
 * decision read the build-only CONTEXT variable at runtime.
 *
 *   npm run test:blob-scope
 */
import { afterEach, test } from "node:test";
import assert from "node:assert/strict";
import { openScopedBlobStore, resolveBlobScope } from "../src/lib/editorial/blob-scope.ts";

const saved = { NETLIFY: process.env.NETLIFY, CONTEXT: process.env.CONTEXT, NETLIFY_BLOBS_CONTEXT: process.env.NETLIFY_BLOBS_CONTEXT };

function setEnv({ netlify, context } = {}) {
  delete process.env.NETLIFY_BLOBS_CONTEXT;
  if (netlify) process.env.NETLIFY = "true";
  else delete process.env.NETLIFY;
  if (context) process.env.CONTEXT = context;
  else delete process.env.CONTEXT;
}
function setRequestContext(deployContext) {
  if (deployContext === undefined) delete globalThis.Netlify;
  else globalThis.Netlify = { context: { deploy: { context: deployContext } } };
}

afterEach(() => {
  delete globalThis.Netlify;
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
