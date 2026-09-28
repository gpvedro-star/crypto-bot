import http from "node:http";
import type { AddressInfo } from "node:net";
import jpeg from "jpeg-js";

/** Minimal valid-enough MP4 (ftyp + moov{mvhd,trak{tkhd,mdia/minf/stbl/stsd(avc1)}} + mdat) for the Video QA parser. */
export function makeMp4(o: { width?: number; height?: number; seconds?: number; brand?: string; codec?: string; padBytes?: number } = {}): Buffer {
  const { width = 1920, height = 1080, seconds = 8, brand = "isom", codec = "avc1", padBytes = 2048 } = o;
  const box = (type: string, body: Buffer) => { const b = Buffer.alloc(8 + body.length); b.writeUInt32BE(8 + body.length, 0); b.write(type, 4, "ascii"); body.copy(b, 8); return b; };
  const ftyp = box("ftyp", Buffer.concat([Buffer.from(brand.padEnd(4).slice(0, 4), "ascii"), Buffer.alloc(4), Buffer.from("isomavc1", "ascii")]));
  const mvhdBody = Buffer.alloc(100); mvhdBody.writeUInt32BE(1000, 12); mvhdBody.writeUInt32BE(Math.round(seconds * 1000), 16);
  const tkhdBody = Buffer.alloc(84); tkhdBody.writeUInt32BE(width * 65536, 76); tkhdBody.writeUInt32BE(height * 65536, 80);
  const stsd = box("stsd", Buffer.concat([Buffer.alloc(8), box(codec, Buffer.alloc(78))]));
  const trak = box("trak", Buffer.concat([box("tkhd", tkhdBody), box("mdia", box("minf", box("stbl", stsd)))]));
  const moov = box("moov", Buffer.concat([box("mvhd", mvhdBody), trak]));
  return Buffer.concat([ftyp, moov, box("mdat", Buffer.alloc(padBytes, 7))]);
}

export function makeJpeg(seed: number, w = 320, h = 200): Buffer {
  const data = Buffer.alloc(w * h * 4);
  for (let i = 0; i < w * h; i++) { data[i * 4] = (seed * 37) % 200 + 30; data[i * 4 + 1] = (i % w) % 200; data[i * 4 + 2] = (seed * 91) % 220; data[i * 4 + 3] = 255; }
  return Buffer.from(jpeg.encode({ data, width: w, height: h }, 60).data);
}

interface Started { url: string; port: number; close: () => Promise<void>; server: http.Server }
async function listen(handler: http.RequestListener): Promise<Started> {
  const server = http.createServer(handler);
  await new Promise<void>((r) => server.listen(0, "127.0.0.1", r));
  const port = (server.address() as AddressInfo).port;
  return { url: `http://127.0.0.1:${port}`, port, server, close: () => new Promise((r) => { server.closeAllConnections?.(); server.close(() => r()); }) };
}
const readBody = (req: http.IncomingMessage) => new Promise<string>((res) => { let b = ""; req.on("data", (c) => (b += c)); req.on("end", () => res(b)); });
const hash = (s: string) => [...s].reduce((h, c) => (h * 31 + c.charCodeAt(0)) >>> 0, 7);

// ───────────────────────── Pexels (API + CDN) ─────────────────────────
export interface PexelsMock extends Started {
  key: string;
  hits: { path: string; query?: string }[];
  /** Force the next N search calls to fail with this status. */
  failSearch?: { status: number; times: number; body?: string };
  /** Make these CDN paths return a non-image body. */
  badCdn: Set<string>;
  /** Queries containing this word return no results. */
  emptyFor?: string;
  videoBytes: () => Buffer;
}
export async function startPexelsMock(key = "test-pexels-key"): Promise<PexelsMock> {
  const state = { hits: [] as PexelsMock["hits"], badCdn: new Set<string>() } as Pick<PexelsMock, "hits" | "badCdn"> & Partial<PexelsMock>;
  const srv = await listen((req, res) => {
    const u = new URL(req.url ?? "/", "http://x");
    state.hits.push({ path: u.pathname, query: u.searchParams.get("query") ?? undefined });
    const send = (status: number, body: unknown, headers: Record<string, string> = {}) => { res.writeHead(status, { "content-type": typeof body === "string" ? "text/plain" : "application/json", ...headers }); res.end(typeof body === "string" ? body : JSON.stringify(body)); };
    const base = `http://127.0.0.1:${(srv.server.address() as AddressInfo).port}`;

    if (u.pathname.startsWith("/cdn/photos/")) {
      if (state.badCdn.has(u.pathname)) { res.writeHead(200, { "content-type": "text/html" }); return res.end("<html>nope</html>"); }
      const id = Number(u.pathname.match(/(\d+)\.jpeg/)?.[1] ?? 1);
      res.writeHead(200, { "content-type": "image/jpeg" }); return res.end(makeJpeg(id));
    }
    if (u.pathname.startsWith("/cdn/videos/")) { const b = mock.videoBytes(); res.writeHead(200, { "content-type": "video/mp4", "content-length": String(b.length) }); return res.end(b); }
    if (u.pathname.startsWith("/cdn/posters/")) { res.writeHead(200, { "content-type": "image/jpeg" }); return res.end(makeJpeg(3)); }

    if (req.headers.authorization !== key) return send(401, "Unauthorized");
    if (mock.failSearch && mock.failSearch.times > 0) { mock.failSearch.times--; return send(mock.failSearch.status, mock.failSearch.body ?? "error", { "x-ratelimit-remaining": "0", "x-ratelimit-reset": "1700000000" }); }
    const q = u.searchParams.get("query") ?? "";
    if (mock.emptyFor && q.includes(mock.emptyFor)) return send(200, u.pathname.startsWith("/videos") ? { videos: [] } : { photos: [] });
    const portrait = u.searchParams.get("orientation") === "portrait";
    const slug = q.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
    if (u.pathname === "/v1/search") {
      return send(200, { photos: [0, 1, 2, 3, 4].map((i) => {
        const id = (hash(q) % 100000) * 10 + i;
        return { id, width: portrait ? 2500 : 4000, height: portrait ? 4000 : 2500, url: `https://www.pexels.com/photo/${slug}-${id}/`, photographer: `Photographer ${i}`, photographer_url: `https://www.pexels.com/@photographer-${i}`, alt: i === 0 ? q : `stock photo ${i}`, src: { original: `${base}/cdn/photos/${id}.jpeg`, large2x: `${base}/cdn/photos/${id}.jpeg` } };
      }) });
    }
    if (u.pathname === "/videos/search") {
      return send(200, { videos: [0, 1].map((i) => {
        const id = (hash(q) % 100000) * 10 + i;
        return { id, width: 1920, height: 1080, duration: 12, url: `https://www.pexels.com/video/${slug}-${id}/`, image: `${base}/cdn/posters/${id}.jpg`, user: { name: `Videographer ${i}`, url: `https://www.pexels.com/@videographer-${i}` },
          video_files: [{ quality: "hd", file_type: "video/mp4", width: 1920, height: 1080, link: `${base}/cdn/videos/${id}_hd.mp4` }, { quality: "sd", file_type: "video/mp4", width: 1280, height: 720, link: `${base}/cdn/videos/${id}_sd.mp4` }] };
      }) });
    }
    send(404, "not found");
  });
  const mock: PexelsMock = Object.assign(srv, { key, hits: state.hits, badCdn: state.badCdn, videoBytes: () => makeMp4() });
  return mock;
}

// ───────────────────────── Higgsfield ─────────────────────────
export type HfScenario = "success" | "failed" | "nsfw" | "never" | "unauthorized" | "flaky" | "no-url" | "bad-video" | "foreign-status-url";
export interface HiggsfieldMock extends Started {
  credentials: string; modelPath: string;
  scenario: HfScenario;
  submits: number; statusCalls: number; cancels: number;
  /** Statuses returned by successive status calls before the terminal one. */
  warmup: number;
  authHeaders: string[];
  videoBytes: () => Buffer;
}
export async function startHiggsfieldMock(scenario: HfScenario = "success", credentials = "hfkey:hfsecret", modelPath = "vendor/video-model/v1/text-to-video"): Promise<HiggsfieldMock> {
  let flakyLeft = 2;
  const srv = await listen(async (req, res) => {
    const u = new URL(req.url ?? "/", "http://x");
    const base = `http://127.0.0.1:${(srv.server.address() as AddressInfo).port}`;
    m.authHeaders.push(String(req.headers.authorization));
    const send = (status: number, body: unknown) => { res.writeHead(status, { "content-type": "application/json" }); res.end(JSON.stringify(body)); };
    if (u.pathname === "/files/out.mp4") { const b = m.videoBytes(); res.writeHead(200, { "content-type": "video/mp4", "content-length": String(b.length) }); return res.end(b); }
    if (m.scenario === "unauthorized" || req.headers.authorization !== `Key ${credentials}`) return send(401, { detail: "Invalid credentials" });
    if (req.method === "POST" && u.pathname === `/${modelPath}`) {
      m.submits++;
      const body = JSON.parse(await readBody(req));
      if (!body.prompt) return send(422, { detail: "prompt required" });
      const id = `req-${m.submits}`;
      const statusBase = m.scenario === "foreign-status-url" ? "http://evil.example" : base;
      return send(200, { request_id: id, status_url: `${statusBase}/requests/${id}/status`, cancel_url: `${base}/requests/${id}/cancel` });
    }
    if (req.method === "POST" && u.pathname.endsWith("/cancel")) { m.cancels++; return send(200, {}); }
    if (req.method === "GET" && u.pathname.endsWith("/status")) {
      m.statusCalls++;
      if (m.scenario === "flaky" && flakyLeft-- > 0) return send(503, { detail: "temporarily unavailable" });
      if (m.statusCalls <= m.warmup) return send(200, { status: m.statusCalls === 1 ? "queued" : "in_progress" });
      switch (m.scenario) {
        case "failed": return send(200, { status: "failed", error: "model crashed" });
        case "nsfw": return send(200, { status: "nsfw" });
        case "never": return send(200, { status: "in_progress" });
        case "no-url": return send(200, { status: "completed", result: { note: "nothing here" } });
        default: return send(200, { status: "completed", video: { url: `${base}/files/out.mp4` }, images: [{ url: `${base}/files/poster.jpg` }] });
      }
    }
    send(404, { detail: "not found" });
  });
  const m: HiggsfieldMock = Object.assign(srv, { credentials, modelPath, scenario, submits: 0, statusCalls: 0, cancels: 0, warmup: 2, authHeaders: [] as string[], videoBytes: () => (scenario === "bad-video" ? makeMp4({ width: 640, height: 360, seconds: 1 }) : makeMp4()) });
  return m;
}

// ───────────────────────── Anthropic-compatible (SSE) ─────────────────────────
export interface AnthropicRequestInfo { task: string; system: string; prompt: string; imageCount: number; model: string; beta: boolean; headers: http.IncomingHttpHeaders; body: Record<string, unknown> }
export interface AnthropicMock extends Started {
  key: string;
  requests: AnthropicRequestInfo[];
  /** Return the model's text for a request, or throw {status,message} to emulate an API error, or return {refusal:true}. */
  answer: (r: AnthropicRequestInfo) => string | { refusal: true } | { truncated: true };
  reportedModel: string;
}
export async function startAnthropicMock(answer: AnthropicMock["answer"], key = "test-anthropic-key"): Promise<AnthropicMock> {
  const srv = await listen(async (req, res) => {
    const u = new URL(req.url ?? "/", "http://x");
    if (req.method !== "POST" || u.pathname !== "/v1/messages") { res.writeHead(404); return res.end("{}"); }
    if (req.headers["x-api-key"] !== key) { res.writeHead(401, { "content-type": "application/json" }); return res.end(JSON.stringify({ type: "error", error: { type: "authentication_error", message: "invalid x-api-key" } })); }
    const body = JSON.parse(await readBody(req)) as { model: string; system: string; messages: { content: { type: string; text?: string }[] | string }[]; stream?: boolean };
    const content = body.messages[0].content;
    const parts = typeof content === "string" ? [{ type: "text", text: content }] : content;
    const info: AnthropicRequestInfo = {
      task: /^\[task: ([^\]]+)\]/.exec(String(body.system))?.[1] ?? "", system: String(body.system),
      prompt: parts.filter((p) => p.type === "text").map((p) => p.text).join("\n"), imageCount: parts.filter((p) => p.type === "image").length,
      model: body.model, beta: u.searchParams.get("beta") === "true" || !!req.headers["anthropic-beta"], headers: req.headers, body: body as never,
    };
    mock.requests.push(info);
    let out: ReturnType<AnthropicMock["answer"]>;
    try { out = mock.answer(info); } catch (e) {
      const err = e as { status?: number; message: string };
      res.writeHead(err.status ?? 500, { "content-type": "application/json" });
      return res.end(JSON.stringify({ type: "error", error: { type: err.status === 429 ? "rate_limit_error" : "api_error", message: err.message } }));
    }
    const text = typeof out === "string" ? out : "";
    const stop = typeof out === "object" && "refusal" in out ? "refusal" : typeof out === "object" && "truncated" in out ? "max_tokens" : "end_turn";
    res.writeHead(200, { "content-type": "text/event-stream" });
    const ev = (name: string, data: unknown) => res.write(`event: ${name}\ndata: ${JSON.stringify(data)}\n\n`);
    ev("message_start", { type: "message_start", message: { id: "msg_test", type: "message", role: "assistant", model: mock.reportedModel, content: [], stop_reason: null, stop_sequence: null, usage: { input_tokens: 100, output_tokens: 1 } } });
    if (text) {
      ev("content_block_start", { type: "content_block_start", index: 0, content_block: { type: "text", text: "" } });
      const chunk = 400;
      for (let i = 0; i < text.length; i += chunk) ev("content_block_delta", { type: "content_block_delta", index: 0, delta: { type: "text_delta", text: text.slice(i, i + chunk) } });
      ev("content_block_stop", { type: "content_block_stop", index: 0 });
    }
    ev("message_delta", { type: "message_delta", delta: { stop_reason: stop, stop_sequence: null, ...(stop === "refusal" ? { stop_details: { type: "refusal", category: "cyber", explanation: "test refusal" } } : {}) }, usage: { output_tokens: 50 } });
    ev("message_stop", { type: "message_stop" });
    res.end();
  });
  const mock: AnthropicMock = Object.assign(srv, { key, requests: [] as AnthropicRequestInfo[], answer, reportedModel: "claude-mock-model" });
  return mock;
}

// ───────────────────────── OpenAI-compatible ─────────────────────────
export async function startOpenAIMock(answer: (system: string, prompt: string) => string, key = "test-openai-key") {
  const requests: { model: string; system: string; prompt: string }[] = [];
  const srv = await listen(async (req, res) => {
    if (req.headers.authorization !== `Bearer ${key}`) { res.writeHead(401, { "content-type": "application/json" }); return res.end(JSON.stringify({ error: { message: "Incorrect API key" } })); }
    const body = JSON.parse(await readBody(req)) as { model: string; messages: { role: string; content: unknown }[] };
    const sys = String(body.messages[0].content);
    const userC = body.messages[1].content;
    const prompt = typeof userC === "string" ? userC : (userC as { type: string; text?: string }[]).filter((p) => p.type === "text").map((p) => p.text).join("\n");
    requests.push({ model: body.model, system: sys, prompt });
    res.writeHead(200, { "content-type": "application/json" });
    res.end(JSON.stringify({ id: "x", object: "chat.completion", model: "mock-openai-model", choices: [{ index: 0, finish_reason: "stop", message: { role: "assistant", content: answer(sys, prompt) } }], usage: { prompt_tokens: 10, completion_tokens: 10, total_tokens: 20 } }));
  });
  return Object.assign(srv, { requests, key });
}
