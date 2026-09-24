import { cookies } from "next/headers";
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import Link from "next/link";
import { authors, getAuthor } from "@/content/authors";
import { categoryMap } from "@/content/categories";
import { readingTimeMinutes } from "@/lib/reading-time";
import type { ArticleWithMeta } from "@/lib/content";
import { getEditorialStore } from "@/lib/editorial/store";
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
  if (!(await authorized(token))) notFound();

  const store = getEditorialStore();
  const record = store ? await store.get(id) : null;
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
      <div className="border-b border-line bg-navy-900 text-paper">
        <div className="container-x flex flex-wrap items-center gap-x-6 gap-y-2 py-3 font-sans text-[0.82rem]">
          <span className="font-semibold uppercase tracking-[0.14em]">Draft preview</span>
          <span className="text-sky-200">
            {status} · {record.content_id}
          </span>
          <span className="text-sky-200">
            {live ? (
              <>
                Live at{" "}
                <Link href={article.href} className="underline">
                  {article.href}
                </Link>
              </>
            ) : (
              "Not published — this page is visible only with a preview token."
            )}
          </span>
        </div>
      </div>
      <ArticleView article={article} related={[]} preview />
      <div className="container-x pb-20">
        <p className="mx-auto max-w-[720px] border-t border-line pt-6 font-sans text-[0.85rem] text-ink-500">
          Section: {categoryMap[article.category].name} · {article.content.length} blocks ·{" "}
          {article.readingTime} min read · last updated {new Date(article.updatedAt).toUTCString()}
        </p>
      </div>
    </>
  );
}
