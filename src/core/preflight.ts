import type { LLMProvider } from "../services/llm/types";
import type { MediaProvider } from "../services/pexels/types";
import type { VideoProvider } from "../services/higgsfield/types";
import { env } from "./config";
import type { RuntimeProviders } from "./types";

export interface ProviderSet { llm: LLMProvider; media: MediaProvider; video: VideoProvider }

export function describeProviders(p: ProviderSet): RuntimeProviders {
  const mode = p.llm.available && p.media.available ? "real" : p.llm.available || p.media.available ? "partial" : "demo";
  return {
    mode,
    llm: { provider: p.llm.available ? p.llm.name : "knowledge-base (demo)", model: p.llm.available ? p.llm.model : undefined, available: p.llm.available, missing: p.llm.missing },
    media: { provider: p.media.available ? p.media.name : "placeholders (demo)", available: p.media.available, missing: p.media.missing },
    video: { provider: p.video.available ? p.video.name : "not configured", available: p.video.available, missing: p.video.missing },
  };
}

export class PreflightError extends Error {
  constructor(public readonly problems: string[]) {
    super(`Real-provider mode is required but not ready:\n- ${problems.join("\n- ")}`);
    this.name = "PreflightError";
  }
}

/** Real mode is required by STUDIO_REQUIRE_REAL=1 (or --real on the CLI). Video is optional: it is approval-gated and has a fallback. */
export function requireReal(): boolean { return env("STUDIO_REQUIRE_REAL") === "1"; }

export function preflight(p: ProviderSet): { ok: boolean; problems: string[]; providers: RuntimeProviders } {
  const providers = describeProviders(p);
  const problems: string[] = [];
  if (!p.llm.available) {
    const want = env("LLM_PROVIDER")?.toLowerCase() === "openai" ? "OpenAI" : "Anthropic";
    problems.push(`LLM (${want}): set ${p.llm.missing.length ? p.llm.missing.join(" and ") : "ANTHROPIC_API_KEY"} in .env.local${want === "Anthropic" ? " (or set LLM_PROVIDER=openai with OPENAI_API_KEY and OPENAI_MODEL)" : ""}`);
  }
  if (!p.media.available) problems.push(`Pexels: set ${p.media.missing.join(" and ")} in .env.local`);
  return { ok: problems.length === 0, problems, providers };
}

export interface Probe { service: string; url: string; reachable: boolean; detail: string }

/** Checks that this machine can reach each provider host. Any HTTP response counts as reachable (auth is checked later). */
export async function probeConnectivity(p: ProviderSet, urls?: Partial<Record<"llm" | "media" | "mediaCdn" | "video", string>>): Promise<Probe[]> {
  const targets: [string, string][] = [
    [`LLM (${p.llm.name === "openai" ? "OpenAI" : "Anthropic"})`, urls?.llm ?? (p.llm.name === "openai" ? "https://api.openai.com/v1/models" : env("ANTHROPIC_BASE_URL") ?? "https://api.anthropic.com")],
    ["Pexels API", urls?.media ?? "https://api.pexels.com/v1/search?query=test&per_page=1"],
    ["Pexels image CDN", urls?.mediaCdn ?? "https://images.pexels.com/"],
    ["Higgsfield API", urls?.video ?? env("HIGGSFIELD_BASE_URL") ?? "https://api.higgsfield.ai"],
  ];
  return Promise.all(targets.map(async ([service, url]) => {
    try {
      const res = await fetch(url, { method: "GET", signal: AbortSignal.timeout(8000) });
      const body = res.status === 403 || res.headers.has("x-deny-reason") ? (await res.text()).slice(0, 200) : "";
      // A network policy / egress proxy denial answers with HTTP 403 too: that is NOT the provider being reachable.
      if (res.headers.has("x-deny-reason") || /not in allowlist|egress/i.test(body)) return { service, url: new URL(url).origin, reachable: false, detail: `BLOCKED by network policy: ${body}` };
      return { service, url: new URL(url).origin, reachable: true, detail: `HTTP ${res.status}` };
    } catch (e) {
      return { service, url: new URL(url).origin, reachable: false, detail: `${(e as Error).message}${(e as { cause?: Error }).cause ? `: ${(e as { cause?: Error }).cause?.message}` : ""}` };
    }
  }));
}
