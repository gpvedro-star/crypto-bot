import { env } from "../../core/config";
import type { GenerationJob } from "../../core/types";
import type { GenerateVideoOptions, VideoProvider } from "./types";

export * from "./types";

/**
 * Higgsfield adapter: REST client for the official Higgsfield platform API.
 *
 * VERIFIED against the official Python SDK (`higgsfield-client` 0.2.0, published by Higgsfield on PyPI/GitHub):
 *   - Base URL:      https://api.higgsfield.ai
 *   - Auth header:   `Authorization: Key <api_key>:<api_secret>`   (SDK env: HF_KEY, or HF_API_KEY + HF_API_SECRET)
 *   - Submit:        POST {base}/{model-path}[?hf_webhook=<url>]  with a JSON body  →  { request_id, status_url, cancel_url }
 *   - Status:        GET  {status_url}  (default {base}/requests/{request_id}/status)  →  { status: queued | in_progress | completed | failed | nsfw | canceled }
 *   - Cancel:        POST {cancel_url}  (default {base}/requests/{request_id}/cancel; only before processing starts)
 *   - Retries:       408, 429, 500, 502, 503, 504 with exponential backoff
 *
 * NOT verifiable from the SDK (it ships no video examples) and therefore configurable/tolerant:
 *   - The text-to-video model path → HIGGSFIELD_MODEL_PATH (required, e.g. from your Higgsfield dashboard).
 *   - Request argument names for that model (we send prompt, aspect_ratio, duration) → extend/override with HIGGSFIELD_EXTRA_ARGS (JSON).
 *   - Where the finished video URL sits in the completed payload → we look at the common shapes, then any *.mp4/.mov/.webm URL in the JSON.
 */
export const HIGGSFIELD_BASE_URL = "https://api.higgsfield.ai";
const RETRYABLE = new Set([408, 429, 500, 502, 503, 504]);

export class HiggsfieldError extends Error {
  constructor(message: string, public readonly status?: number) { super(`[higgsfield] ${message}`); this.name = "HiggsfieldError"; }
}

export interface HiggsfieldOptions {
  credentials?: string; baseURL?: string; modelPath?: string; extraArgs?: Record<string, unknown>;
  /** Backoff base in ms (tests use 0). */
  retryDelayMs?: number; timeoutMs?: number;
}

function credentialsFromEnv(): string | undefined {
  const key = env("HF_KEY");
  if (key) return key;
  const k = env("HIGGSFIELD_API_KEY") ?? env("HF_API_KEY");
  const sec = env("HIGGSFIELD_API_SECRET") ?? env("HF_API_SECRET");
  return k && sec ? `${k}:${sec}` : undefined;
}

/** Deep search for a downloadable video URL in an arbitrary completed payload. */
export function findVideoUrl(payload: unknown): string | undefined {
  const p = payload as Record<string, unknown> | undefined;
  const direct = [
    (p?.video as { url?: string } | undefined)?.url,
    (p?.videos as { url?: string }[] | undefined)?.[0]?.url,
    ((p?.result as Record<string, unknown> | undefined)?.video as { url?: string } | undefined)?.url,
    (p?.output as { url?: string } | undefined)?.url,
  ].find((u) => typeof u === "string");
  if (direct) return direct;
  const walk = (v: unknown): string | undefined => {
    if (typeof v === "string") return /^https?:\/\/\S+\.(mp4|mov|webm)(\?\S*)?$/i.test(v) ? v : undefined;
    if (Array.isArray(v)) { for (const x of v) { const r = walk(x); if (r) return r; } }
    else if (v && typeof v === "object") { for (const x of Object.values(v)) { const r = walk(x); if (r) return r; } }
    return undefined;
  };
  return walk(payload);
}

export class HiggsfieldProvider implements VideoProvider {
  readonly name = "higgsfield";
  private readonly credentials?: string;
  private readonly baseURL: string;
  private readonly modelPath: string;
  private readonly extraArgs: Record<string, unknown>;
  private readonly retryDelayMs: number;
  private readonly timeoutMs: number;

  constructor(opts: HiggsfieldOptions = {}) {
    this.credentials = opts.credentials ?? credentialsFromEnv();
    this.baseURL = (opts.baseURL ?? env("HIGGSFIELD_BASE_URL") ?? HIGGSFIELD_BASE_URL).replace(/\/$/, "");
    this.modelPath = (opts.modelPath ?? env("HIGGSFIELD_MODEL_PATH") ?? "").replace(/^\/+|\/+$/g, "");
    let extra: Record<string, unknown> = {};
    try { extra = opts.extraArgs ?? JSON.parse(env("HIGGSFIELD_EXTRA_ARGS") ?? "{}"); } catch { throw new HiggsfieldError("HIGGSFIELD_EXTRA_ARGS is not valid JSON"); }
    this.extraArgs = extra;
    this.retryDelayMs = opts.retryDelayMs ?? 1000;
    this.timeoutMs = opts.timeoutMs ?? 30000;
  }

  get available() { return !!this.credentials && !!this.modelPath; }
  get missing() {
    return [
      ...(this.credentials ? [] : ["HIGGSFIELD_API_KEY + HIGGSFIELD_API_SECRET (or HF_KEY=key:secret)"]),
      ...(this.modelPath ? [] : ["HIGGSFIELD_MODEL_PATH"]),
    ];
  }

  private headers() { return { Authorization: `Key ${this.credentials}`, "Content-Type": "application/json", Accept: "application/json", "User-Agent": "dynatech-ai-studio/1.0" }; }

  /** Never send credentials to a host other than the configured API host. */
  private sameOrigin(url: string): boolean {
    try { return new URL(url).origin === new URL(this.baseURL).origin; } catch { return false; }
  }

  private async request(method: "GET" | "POST", url: string, body?: unknown): Promise<unknown> {
    if (!this.credentials) throw new HiggsfieldError("credentials are not configured");
    let lastErr = "";
    for (let attempt = 0; attempt <= 3; attempt++) {
      if (attempt > 0) await new Promise((r) => setTimeout(r, this.retryDelayMs * 2 ** (attempt - 1)));
      let res: Response;
      try {
        res = await fetch(url, { method, headers: this.headers(), body: body === undefined ? undefined : JSON.stringify(body), signal: AbortSignal.timeout(this.timeoutMs) });
      } catch (e) {
        lastErr = (e as Error).name === "TimeoutError" ? `request timed out after ${this.timeoutMs}ms` : `could not reach ${new URL(url).host} (${(e as Error).message})`;
        continue;
      }
      if (res.ok) {
        const text = await res.text();
        try { return text ? JSON.parse(text) : {}; } catch { throw new HiggsfieldError(`invalid JSON in response from ${method} ${new URL(url).pathname}: ${text.slice(0, 120)}`); }
      }
      const raw = await res.text();
      let detail = raw.slice(0, 300);
      try { const j = JSON.parse(raw) as Record<string, unknown>; detail = String(j.detail ?? j.details ?? j.message ?? j.error ?? detail); } catch { /* keep raw */ }
      lastErr = `HTTP ${res.status}: ${detail}`;
      if (!RETRYABLE.has(res.status)) {
        const hint = res.status === 401 || res.status === 403 ? " Check HIGGSFIELD_API_KEY / HIGGSFIELD_API_SECRET." : res.status === 404 ? " Check HIGGSFIELD_MODEL_PATH." : "";
        throw new HiggsfieldError(`${lastErr}${hint}`, res.status);
      }
    }
    throw new HiggsfieldError(`gave up after retries: ${lastErr}`);
  }

  async generateVideo(prompt: string, opts: GenerateVideoOptions = {}): Promise<GenerationJob> {
    if (!this.available) throw new HiggsfieldError(`not configured; missing ${this.missing.join(", ")}`);
    const data = (await this.request("POST", `${this.baseURL}/${this.modelPath}`, {
      prompt, aspect_ratio: opts.aspect ?? "16:9", duration: opts.durationSeconds ?? 8, ...this.extraArgs,
    })) as { request_id?: string; status_url?: string; cancel_url?: string };
    if (!data.request_id) throw new HiggsfieldError(`submit response had no request_id: ${JSON.stringify(data).slice(0, 200)}`);
    return { id: data.request_id, provider: this.name, status: "queued", prompt, statusUrl: data.status_url, cancelUrl: data.cancel_url };
  }

  async getGenerationStatus(job: Pick<GenerationJob, "id" | "statusUrl">): Promise<GenerationJob> {
    const url = job.statusUrl && this.sameOrigin(job.statusUrl) ? job.statusUrl : `${this.baseURL}/requests/${job.id}/status`;
    const data = (await this.request("GET", url)) as Record<string, unknown>;
    const map: Record<string, GenerationJob["status"]> = { queued: "queued", in_progress: "running", completed: "completed", failed: "failed", nsfw: "nsfw", canceled: "cancelled", cancelled: "cancelled" };
    const status = map[String(data.status)];
    if (!status) throw new HiggsfieldError(`unknown job status "${String(data.status)}" (expected queued, in_progress, completed, failed, nsfw, canceled)`);
    const out: GenerationJob = { id: job.id, provider: this.name, status, prompt: "", statusUrl: job.statusUrl };
    if (status === "completed") {
      out.url = findVideoUrl(data);
      if (!out.url) { out.status = "failed"; out.error = `job completed but no video URL was found in the response (keys: ${Object.keys(data).join(", ")})`; }
      const poster = (data.images as { url?: string }[] | undefined)?.[0]?.url;
      if (poster) out.posterUrl = poster;
    }
    if (status === "failed") out.error = String(data.error ?? data.detail ?? "generation failed");
    if (status === "nsfw") out.error = "Higgsfield flagged the request as NSFW and refused to generate it";
    return out;
  }

  async cancel(job: Pick<GenerationJob, "id" | "cancelUrl">): Promise<void> {
    const url = job.cancelUrl && this.sameOrigin(job.cancelUrl) ? job.cancelUrl : `${this.baseURL}/requests/${job.id}/cancel`;
    await this.request("POST", url);
  }
}

/** Used when Higgsfield is not configured: makes the integration point explicit instead of pretending. */
export class DisabledVideoProvider implements VideoProvider {
  readonly name = "disabled";
  readonly available = false;
  readonly missing = ["HIGGSFIELD_API_KEY + HIGGSFIELD_API_SECRET (or HF_KEY=key:secret)", "HIGGSFIELD_MODEL_PATH"];
  async generateVideo(): Promise<GenerationJob> { throw new HiggsfieldError("video generation is not configured"); }
  async getGenerationStatus(): Promise<GenerationJob> { throw new HiggsfieldError("video generation is not configured"); }
}

export function createVideoProvider(): VideoProvider {
  const p = new HiggsfieldProvider();
  return p.available ? p : new DisabledVideoProvider();
}
