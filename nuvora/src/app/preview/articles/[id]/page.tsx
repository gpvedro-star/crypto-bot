import { cookies } from "next/headers";
import { notFound, redirect } from "next/navigation";
import type { Metadata } from "next";
import Link from "next/link";
import { authors, getAuthor } from "@/content/authors";
import { readingTimeMinutes } from "@/lib/reading-time";
import type { ArticleWithMeta } from "@/lib/content";
import { getEditorialStore, storeBackend } from "@/lib/editorial/store";
import { recordToArticle } from "@/lib/editorial/publish-map";
import { PREVIEW_COOKIE, previewTokenValid } from "@/lib/api-auth";
import { ArticleView } from "@/components/article/ArticleView";

/**
 * Authenticated draft preview.
 *
 * Renders any editorial record — including drafts — through the same article
 * template the public site uses, so the desk reviews exactly what readers
 * would see. Three things keep it private:
 *
 *   1. A caller without the preview token gets a 404, not a 401, so the route
 *      cannot be used to discover which content_ids exist.
 *   2. The page is `noindex, nofollow`, /preview is disallowed in robots.txt,
 *      and nothing under it appears in the sitemap, RSS or search index.
 *   3. Nothing is cached: every request re-checks the credential.
 */
export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Draft preview",
  robots: { index: false, follow: false, nocache: true, googleBot: { index: false, follow: false } },
};

interface Params {
  id: string;
}

async function authorized(token: string | undefined): Promise<boolean> {
  if (previewTokenValid(token)) return true;
  const jar = await cookies();
  return previewTokenValid(jar.get(PREVIEW_COOKIE)?.value);
}

export default async function PreviewArticlePage({
  params,
  searchParams,
}: {
  params: Promise<Params>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const [{ id }, query] = await Promise.all([params, searchParams]);
  const raw = query.token;
  const token = Array.isArray(raw) ? raw[0] : raw;
  if (token) {
    // A page that reads its query string gets the full URL embedded in its
    // server-rendered payload. Rather than render with the token in it, hand
    // it to /preview/enter, which sets the session cookie and returns here on
    // a clean URL. An invalid token gets the same 404 either way.
    redirect(`/preview/enter?token=${encodeURIComponent(token)}&id=${encodeURIComponent(id)}`);
  }
  const tokenOk = await authorized(undefined);
  // Never logs the token itself, only whether the session was authorised.
  console.log("[preview] auth", { id, authorized: tokenOk });
  if (!tokenOk) notFound();

  const store = getEditorialStore();
  const record = store ? await store.get(id) : null;
  console.log("[preview] lookup", { id, backend: storeBackend(), found: Boolean(record) });
  if (!record) notFound();

  const base = recordToArticle(record);
  const article: ArticleWithMeta = {
    ...base,
    readingTime: readingTimeMinutes(base.content),
    author: getAuthor(base.authorSlug) ?? authors[authors.length - 1],
    href: `/articles/${base.slug}`,
  };
  const status = record.publish_status.toUpperCase();
  const live = record.publish_status === "published";

  return (
    <>
      {/* Quiet, unmistakable: one line, above the template, never inside it. */}
      <div className="border-b border-sky-200 bg-sky-50">
        <div className="container-x flex flex-wrap items-center gap-x-4 gap-y-1 py-2.5 font-sans text-[0.82rem] text-navy-900">
          <span className="font-semibold uppercase tracking-[0.12em]">Draft preview</span>
          <span className="text-ink-700">
            {live ? (
              <>
                Published —{" "}
                <Link href={article.href} className="underline">
                  view live page
                </Link>
              </>
            ) : (
              <>
                {record.publish_status === "draft" ? "" : `${status.replace("_", " ")} · `}
                Not visible to readers
              </>
            )}
          </span>
          <span className="tabular text-ink-500 sm:ml-auto">{record.content_id}</span>
        </div>
      </div>
      <ArticleView article={article} related={[]} preview />
    </>
  );
}
