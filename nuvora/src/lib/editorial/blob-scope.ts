import { getDeployStore, getStore, type Store } from "@netlify/blobs";

/**
 * The one place that decides which Netlify Blobs store editorial data lives in.
 * Both the record store and the image store go through here, so every path —
 * the editorial API, fact-check, auto-publish, the homepage, article routes,
 * sitemap, RSS and search — reads and writes the same place.
 *
 *   global       production: a site-wide store that survives every deploy
 *   deploy       deploy previews, branch deploys, `netlify dev`: isolated per deploy
 *   local        plain `next dev` off Netlify: the caller's filesystem stand-in
 *   unavailable  on Netlify, but the scope can't be established: fail closed
 *
 * Production is decided from the request's own deploy context
 * (`Netlify.context.deploy.context`), not from `process.env.CONTEXT`. CONTEXT
 * is a build variable: Netlify does not set it in the function runtime, which
 * is exactly how every production request used to fall through to a
 * per-deploy store and every new deploy started with an empty site.
 */
export type BlobScope = "global" | "deploy" | "local" | "unavailable";

interface NetlifyRuntimeGlobal {
  context?: { deploy?: { context?: string } } | null;
}

function requestDeployContext(): string | undefined {
  try {
    const netlify = (globalThis as { Netlify?: NetlifyRuntimeGlobal }).Netlify;
    const value = netlify?.context?.deploy?.context;
    return typeof value === "string" && value ? value : undefined;
  } catch {
    return undefined;
  }
}

const onNetlify = () => Boolean(process.env.NETLIFY || process.env.NETLIFY_BLOBS_CONTEXT);

export function resolveBlobScope(): BlobScope {
  const context = requestDeployContext();
  if (context === "production") return "global";
  if (context) return "deploy";

  // No request context. On Netlify that means the build step (prerendering),
  // where CONTEXT genuinely is set and only reads happen: a production build
  // reads the production store so its first snapshot is not empty.
  if (onNetlify()) return process.env.CONTEXT === "production" ? "global" : "unavailable";
  return "local";
}

const opened = new Map<string, Store>();

/**
 * Open `name` in the resolved scope. Returns null — never a different store —
 * when the scope is `local` (the caller supplies its own dev stand-in) or when
 * a Netlify store can't be opened: no silent fallback to a deploy store,
 * memory, /tmp or the filesystem in production.
 */
export function openScopedBlobStore(name: string): { scope: BlobScope; store: Store | null } {
  const scope = resolveBlobScope();
  if (scope === "local" || scope === "unavailable") return { scope, store: null };

  const key = `${scope}:${name}`;
  const cached = opened.get(key);
  if (cached) return { scope, store: cached };

  try {
    const store =
      scope === "global"
        ? getStore({ name, consistency: "strong" })
        : getDeployStore({ name: `${name}-preview`, consistency: "strong" });
    opened.set(key, store);
    return { scope, store };
  } catch (error) {
    console.error(`[blob-scope] could not open ${scope} store "${name}"`, String(error));
    return { scope: "unavailable", store: null };
  }
}
