import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { test } from "node:test";
import { findVideoUrl, HiggsfieldProvider, HIGGSFIELD_BASE_URL } from "../src/services/higgsfield";
import { inspectVideo, parseMp4 } from "../src/agents/video-qa";
import { downloadFile, inspectImage } from "../src/services/media/download";
import { higgsfieldAt, tmpDir } from "./helpers";
import { makeJpeg, makeMp4, startHiggsfieldMock } from "./mocks";

// ── Adapter contract (verified against the official higgsfield-client 0.2.0 source) ──

test("adapter defaults match the official API: base URL and credential handling", () => {
  assert.equal(HIGGSFIELD_BASE_URL, "https://api.higgsfield.ai");
  const none = new HiggsfieldProvider({ credentials: undefined, modelPath: "" });
  assert.equal(none.available, false);
  assert.ok(none.missing.some((m) => /HIGGSFIELD_MODEL_PATH/.test(m)));
  assert.equal(new HiggsfieldProvider({ credentials: "k:s", modelPath: "a/b" }).available, true);
});

test("SUCCESS: submit → poll → completed with a video URL; auth header is `Key key:secret`", async () => {
  const hf = await startHiggsfieldMock("success");
  try {
    const p = higgsfieldAt(hf.url);
    const job = await p.generateVideo("a cinematic shot, no text, no logos", { durationSeconds: 8, aspect: "16:9" });
    assert.equal(job.status, "queued");
    assert.equal(job.id, "req-1");
    assert.match(job.statusUrl!, /\/requests\/req-1\/status$/);
    const seen: string[] = [];
    for (let i = 0; i < 6; i++) { const j = await p.getGenerationStatus(job); seen.push(j.status); if (j.status === "completed") { assert.match(j.url!, /\/files\/out\.mp4$/); assert.ok(j.posterUrl); break; } }
    assert.deepEqual(seen, ["queued", "running", "completed"]);
    assert.ok(hf.authHeaders.every((h) => h === "Key hfkey:hfsecret"));
  } finally { await hf.close(); }
});

test("FAILURE: failed and NSFW jobs carry the exact reason; unknown status is an error, not a guess", async () => {
  for (const [sc, status, err] of [["failed", "failed", /model crashed/], ["nsfw", "nsfw", /NSFW/]] as const) {
    const hf = await startHiggsfieldMock(sc);
    hf.warmup = 0;
    try {
      const p = higgsfieldAt(hf.url);
      const j = await p.getGenerationStatus(await p.generateVideo("x"));
      assert.equal(j.status, status);
      assert.match(j.error!, err);
    } finally { await hf.close(); }
  }
  const hf = await startHiggsfieldMock("success");
  hf.server.removeAllListeners("request");
  hf.server.on("request", (_q, r) => { r.writeHead(200, { "content-type": "application/json" }); r.end('{"status":"exploded"}'); });
  try { await assert.rejects(higgsfieldAt(hf.url).getGenerationStatus({ id: "x" }), /unknown job status "exploded"/); } finally { await hf.close(); }
});

test("FAILURE: completed job without any video URL is reported as failed with the payload keys", async () => {
  const hf = await startHiggsfieldMock("no-url");
  hf.warmup = 0;
  try {
    const p = higgsfieldAt(hf.url);
    const j = await p.getGenerationStatus(await p.generateVideo("x"));
    assert.equal(j.status, "failed");
    assert.match(j.error!, /no video URL was found in the response \(keys: status, result\)/);
  } finally { await hf.close(); }
});

test("HTTP errors: 401 names the credentials, 404 names the model path, both are not retried; 5xx is retried then succeeds", async () => {
  const hf = await startHiggsfieldMock("success");
  try {
    await assert.rejects(new HiggsfieldProvider({ credentials: "bad:creds", baseURL: hf.url, modelPath: hf.modelPath, retryDelayMs: 1 }).generateVideo("x"), /HTTP 401: Invalid credentials Check HIGGSFIELD_API_KEY/);
    assert.equal(hf.submits, 0);
    await assert.rejects(higgsfieldAt(hf.url, "hfkey:hfsecret", "wrong/model").generateVideo("x"), /HTTP 404.*Check HIGGSFIELD_MODEL_PATH/);
  } finally { await hf.close(); }
  const flaky = await startHiggsfieldMock("flaky");
  flaky.warmup = 0;
  try {
    const p = higgsfieldAt(flaky.url);
    const j = await p.getGenerationStatus(await p.generateVideo("x"));
    assert.equal(j.status, "completed", "two 503s were retried transparently");
    assert.ok(flaky.statusCalls >= 3);
  } finally { await flaky.close(); }
});

test("TIMEOUT: a hanging server yields a timeout error, and an unreachable host a network error", async () => {
  const hf = await startHiggsfieldMock("success");
  hf.server.removeAllListeners("request");
  hf.server.on("request", () => { /* never respond */ });
  try {
    const p = new HiggsfieldProvider({ credentials: "k:s", baseURL: hf.url, modelPath: "a/b", timeoutMs: 150, retryDelayMs: 1 });
    await assert.rejects(p.generateVideo("x"), /gave up after retries: request timed out after 150ms/);
  } finally { await hf.close(); }
  const dead = new HiggsfieldProvider({ credentials: "k:s", baseURL: "http://127.0.0.1:1", modelPath: "a/b", timeoutMs: 500, retryDelayMs: 1 });
  await assert.rejects(dead.generateVideo("x"), /gave up after retries: could not reach 127\.0\.0\.1:1/);
});

test("SECURITY: credentials are never sent to a status_url on another origin", async () => {
  const hf = await startHiggsfieldMock("foreign-status-url");
  hf.warmup = 0;
  try {
    const p = higgsfieldAt(hf.url);
    const job = await p.generateVideo("x");
    assert.match(job.statusUrl!, /^http:\/\/evil\.example/);
    const j = await p.getGenerationStatus(job); // must fall back to {base}/requests/{id}/status, not evil.example
    assert.equal(j.status, "completed");
  } finally { await hf.close(); }
});

test("findVideoUrl understands common result shapes and falls back to any video URL in the payload", () => {
  assert.equal(findVideoUrl({ video: { url: "https://x/a.mp4" } }), "https://x/a.mp4");
  assert.equal(findVideoUrl({ videos: [{ url: "https://x/b.mp4" }] }), "https://x/b.mp4");
  assert.equal(findVideoUrl({ deep: { nested: [{ file: "https://cdn/c.webm?sig=1" }] } }), "https://cdn/c.webm?sig=1");
  assert.equal(findVideoUrl({ images: [{ url: "https://x/p.jpg" }] }), undefined);
});

// ── Video QA ──

const tmpFile = (name: string, data: Buffer) => { const f = path.join(fs.mkdtempSync(path.join(os.tmpdir(), "vqa-")), name); fs.writeFileSync(f, data); return f; };

test("Video QA verifies duration, resolution, format, codec and size — and prepares (but does not run) frame analysis", async () => {
  const ok = await inspectVideo(tmpFile("ok.mp4", makeMp4({ width: 1920, height: 1080, seconds: 8 })));
  assert.equal(ok.passed, true, JSON.stringify(ok.checks));
  assert.deepEqual([ok.info.width, ok.info.height, ok.info.durationSeconds, ok.info.brand, ok.info.format], [1920, 1080, 8, "isom", "mp4/avc1"]);
  assert.equal(ok.frameAnalysis.status, "not_implemented");

  const cases: [string, Buffer, RegExp][] = [
    ["short.mp4", makeMp4({ seconds: 1 }), /Duration 3–30s/],
    ["low.mp4", makeMp4({ width: 640, height: 360 }), /Resolution/],
    ["hevc.mp4", makeMp4({ codec: "hvc1" }), /web-compatible/],
    ["notmp4.mp4", Buffer.from("this is not a video, just text".repeat(20)), /Format is MP4/],
    ["long.mp4", makeMp4({ seconds: 120 }), /Duration/],
  ];
  for (const [name, buf, re] of cases) {
    const r = await inspectVideo(tmpFile(name, buf));
    assert.equal(r.passed, false, name);
    assert.ok(r.checks.some((c) => !c.passed && re.test(c.name)), `${name}: ${JSON.stringify(r.checks.filter((c) => !c.passed))}`);
  }
  const big = await inspectVideo(tmpFile("big.mp4", makeMp4({ padBytes: 3 * 1048576 })), { maxBytes: 2 * 1048576 });
  assert.ok(big.checks.some((c) => !c.passed && /File size/.test(c.name)));
  const missing = await inspectVideo("/nonexistent/x.mp4");
  assert.equal(missing.passed, false);
  assert.match(missing.checks[0].detail!, /not found/);
  assert.equal(parseMp4(tmpFile("p.mp4", makeMp4({ width: 1280, height: 720, seconds: 5 }))).width, 1280);
});

test("Video QA accepts a pluggable frame analyzer (future AI/visual analysis)", async () => {
  const r = await inspectVideo(tmpFile("f.mp4", makeMp4()), { frames: { analyze: async () => ({ status: "completed", findings: ["no watermark detected"]}) } });
  assert.equal(r.frameAnalysis.status, "completed");
  assert.deepEqual(r.frameAnalysis.findings, ["no watermark detected"]);
});

// ── Downloader ──

test("downloader: size cap, content-type check, 404, timeout and empty body all fail with exact messages and leave no partial file", async () => {
  const { createServer } = await import("node:http");
  const srv = createServer((req, res) => {
    if (req.url === "/big") { res.writeHead(200, { "content-type": "video/mp4" }); return res.end(Buffer.alloc(200000)); }
    if (req.url === "/html") { res.writeHead(200, { "content-type": "text/html" }); return res.end("<html/>"); }
    if (req.url === "/empty") { res.writeHead(200, { "content-type": "image/jpeg" }); return res.end(); }
    if (req.url === "/hang") return; // never respond
    if (req.url === "/ok") { res.writeHead(200, { "content-type": "image/jpeg" }); return res.end(makeJpeg(5)); }
    res.writeHead(404); res.end("nope");
  });
  await new Promise<void>((r) => srv.listen(0, "127.0.0.1", r));
  const base = `http://127.0.0.1:${(srv.address() as import("node:net").AddressInfo).port}`;
  const dir = tmpDir();
  try {
    await assert.rejects(downloadFile(`${base}/big`, path.join(dir, "big"), { maxBytes: 1000, retries: 0 }), /exceeded the 0 MB cap|above the 0 MB cap/);
    await assert.rejects(downloadFile(`${base}/html`, path.join(dir, "h"), { expectTypes: ["image/"], retries: 0 }), /unexpected content-type "text\/html"/);
    await assert.rejects(downloadFile(`${base}/missing`, path.join(dir, "m"), { retries: 2 }), /HTTP 404/);
    await assert.rejects(downloadFile(`${base}/empty`, path.join(dir, "e"), { retries: 0 }), /empty response/);
    await assert.rejects(downloadFile(`${base}/hang`, path.join(dir, "t"), { timeoutMs: 150, retries: 0 }), /timed out after 150ms/);
    assert.deepEqual(fs.readdirSync(dir), [], "no partial files remain");
    const got = await downloadFile(`${base}/ok`, path.join(dir, "ok.jpg"), { expectTypes: ["image/"] });
    assert.ok(got.bytes > 500);
    const img = inspectImage(got.path);
    assert.deepEqual([img?.format, img?.width, img?.height], ["jpeg", 320, 200]);
    fs.writeFileSync(path.join(dir, "junk.jpg"), "not an image");
    assert.equal(inspectImage(path.join(dir, "junk.jpg")), undefined);
  } finally { srv.closeAllConnections(); srv.close(); }
});
