import { env } from "../../core/config";
import type { GenerationJob } from "../../core/types";
import type { GenerateVideoOptions, VideoProvider } from "./types";

export * from "./types";

/**
 * Higgsfield adapter.
 *
 * NOTE: endpoint paths and payload shapes below follow Higgsfield's public "platform" REST conventions
 * (submit a job to a model path, poll a request id) but have NOT been verified against live credentials.
 * They are isolated here so that verifying/adjusting them touches this one file only.
 * Set HIGGSFIELD_MODEL_PATH (e.g. the text-to-video model route from your Higgsfield dashboard) to enable.
 */
export class HiggsfieldProvider implements VideoProvider {
  readonly name = "higgsfield";
  get available() { return !!env("HIGGSFIELD_API_KEY") && !!env("HIGGSFIELD_MODEL_PATH"); }

  private base() { return (env("HIGGSFIELD_BASE_URL") ?? "https://platform.higgsfield.ai").replace(/\/$/, ""); }
  private headers() {
    const key = env("HIGGSFIELD_API_KEY")!;
    const secret = env("HIGGSFIELD_API_SECRET");
    return { "content-type": "application/json", accept: "application/json", authorization: secret ? `Key ${key}:${secret}` : `Bearer ${key}` };
  }

  async generateVideo(prompt: string, opts: GenerateVideoOptions = {}): Promise<GenerationJob> {
    if (!this.available) return { id: "", provider: this.name, status: "disabled", prompt, error: "HIGGSFIELD_API_KEY / HIGGSFIELD_MODEL_PATH not configured" };
    const res = await fetch(`${this.base()}/${env("HIGGSFIELD_MODEL_PATH")!.replace(/^\//, "")}`, {
      method: "POST",
      headers: this.headers(),
      body: JSON.stringify({ prompt, aspect_ratio: opts.aspect ?? "16:9", duration: opts.durationSeconds ?? 8 }),
    });
    if (!res.ok) return { id: "", provider: this.name, status: "failed", prompt, error: `Higgsfield ${res.status}: ${(await res.text()).slice(0, 200)}` };
    const data = (await res.json()) as { request_id?: string; id?: string };
    return { id: data.request_id ?? data.id ?? "", provider: this.name, status: "queued", prompt };
  }

  async getGenerationStatus(id: string): Promise<GenerationJob> {
    if (!this.available) return { id, provider: this.name, status: "disabled", prompt: "" };
    const res = await fetch(`${this.base()}/requests/${id}/status`, { headers: this.headers() });
    if (!res.ok) return { id, provider: this.name, status: "failed", prompt: "", error: `Higgsfield ${res.status}` };
    const data = (await res.json()) as { status?: string; video?: { url?: string }; images?: { url?: string }[]; error?: string };
    const s = (data.status ?? "").toLowerCase();
    const status: GenerationJob["status"] = s === "completed" ? "completed" : s === "failed" || s === "nsfw" ? "failed" : s === "queued" ? "queued" : "running";
    return { id, provider: this.name, status, prompt: "", url: data.video?.url, posterUrl: data.images?.[0]?.url, error: data.error };
  }
}

/** Used when Higgsfield is not configured: makes the "integration point" explicit instead of failing. */
export class DisabledVideoProvider implements VideoProvider {
  readonly name = "disabled";
  readonly available = false;
  async generateVideo(prompt: string): Promise<GenerationJob> {
    return { id: "", provider: "higgsfield", status: "disabled", prompt, error: "Video generation is not configured" };
  }
  async getGenerationStatus(id: string): Promise<GenerationJob> {
    return { id, provider: "higgsfield", status: "disabled", prompt: "" };
  }
}

export function createVideoProvider(): VideoProvider {
  const p = new HiggsfieldProvider();
  return p.available ? p : new DisabledVideoProvider();
}
