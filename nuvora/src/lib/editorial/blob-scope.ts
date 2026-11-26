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
 *
 * Background ISR is the other runtime with no request context, and it also
 * has no CONTEXT. Netlify still injects `NETLIFY_BLOBS_CONTEXT` into the
 * function. That used to resolve to `unavailable`, the render published an
 * empty article list, and Next.js cached the 404. A function runtime with
 * that blobs context reads the site-wide store. `NUVORA_BLOB_SCOPE` can pin
 * the no-request path (`global` or `deploy`); set it in the Netlify UI for
 * the Functions scope — values in netlify.toml never reach functions.
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

function blobsContextValue(): string | undefined {
  const fromEnv = process.env.NETLIFY_BLOBS_CONTEXT;
  if (typeof fromEnv === "string" && fromEnv.trim()) return fromEnv.trim();
  try {
    const fromGlobal = (globalThis as { netlifyBlobsContext?: unknown }).netlifyBlobsContext;
    if (typeof fromGlobal === "string" && fromGlobal.trim()) return fromGlobal.trim();
  } catch {
    // A locked global is the same as "not set": the caller fails closed.
  }
  return undefined;
}

const onNetlify = () => Boolean(process.env.NETLIFY || blobsContextValue());

/**
 * Pin for the no-request path only. An empty value means "not pinned".
 * Anything other than `global` or `deploy` fails closed so a typo cannot
 * select the production store.
 */
function pinnedScope(): BlobScope | undefined {
  const value = process.env.NUVORA_BLOB_SCOPE?.trim();
  if (!value) return undefined;
  if (value === "global" || value === "deploy") return value;
  return "unavailable";
}

let notedRuntimeStore = false;

export function resolveBlobScope(): BlobScope {
  const context = requestDeployContext();
  if (context === "production") return "global";
  if (context) return "deploy";

  // Off Netlify there is no Blobs store. Plain `next dev` uses the filesystem.
  if (!onNetlify()) return "local";

  // No request context. The build step sets CONTEXT. The function runtime,
  // including ISR background revalidation, does not.
  const pinned = pinnedScope();
  if (pinned) return pinned;

  if (process.env.CONTEXT === "production") return "global";
  // deploy-preview, branch-deploy, `netlify dev`: the scope is known and it
  // is not production. Fail closed rather than open the site-wide store.
  if (process.env.CONTEXT) return "unavailable";

  // Function runtime. NETLIFY_BLOBS_CONTEXT is injected for the whole
  // process; it carries site credentials, not the deploy context. This
  // site's published functions are production, so background revalidation
  // reads the site-wide store instead of caching an empty page.
  if (blobsContextValue()) {
    if (!notedRuntimeStore) {
      notedRuntimeStore = true;
      console.info(
        "[blob-scope] no request context and no CONTEXT; reading the site-wide store (NETLIFY_BLOBS_CONTEXT)",
      );
    }
    return "global";
  }
  return "unavailable";
}

/**
 * Local dev may degrade to file-based articles. On Netlify a missing store
 * or a failed read must fail the render: an empty list is a successful
 * response, and ISR would cache it as a 404 or an empty sitemap/feed.
 */
export function editorialFailureIsFatal(scope: BlobScope): boolean {
  return scope !== "local";
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
