import { revalidatePath } from "next/cache";
import type { EditorialRecord } from "./contract";

/**
 * Drops the cached renders a record appears in, so publishing, unpublishing or
 * editing shows up within seconds instead of at the next deploy. Every page
 * also carries its own `revalidate`, so this is an accelerator, not the only
 * thing keeping the site current.
 */
export function revalidateForRecord(record: EditorialRecord): string[] {
  const paths = [
    "/",
    `/articles/${record.slug}`,
    "/search",
    "/search-index.json",
    "/sitemap.xml",
    "/feed.xml",
    "/api/v1/articles",
    `/api/v1/articles/${record.slug}`,
    "/api/v1/categories",
  ];
  const done: string[] = [];
  for (const path of paths) {
    try {
      revalidatePath(path);
      done.push(path);
    } catch (error) {
      console.error("[editorial] revalidate failed", { path, error: String(error) });
    }
  }
  // /latest and the section pages are prerendered under the /[category] route.
  // A concrete path does not clear a prerendered dynamic segment, so the route
  // itself is revalidated — coarser, but it only happens on a status change.
  for (const route of ["/[category]"]) {
    try {
      revalidatePath(route, "page");
      done.push(route);
    } catch (error) {
      console.error("[editorial] revalidate failed", { path: route, error: String(error) });
    }
  }
  return done;
}
