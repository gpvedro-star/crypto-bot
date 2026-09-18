import type { Metadata } from "next";
import { getStaticPage } from "@/content/pages";
import { buildMetadata, breadcrumbSchema } from "@/lib/seo";
import { formatDate } from "@/lib/dates";
import { JsonLd } from "@/components/ui/JsonLd";
import { Breadcrumbs } from "@/components/article/Breadcrumbs";
import { NewsletterBlock } from "@/components/sections/NewsletterBlock";

export function staticPageMetadata(slug: string): Metadata {
  const page = getStaticPage(slug);
  if (!page) return {};
  return buildMetadata({ title: page.title, description: page.seoDescription, path: `/${slug}` });
}

export function StaticPage({ slug }: { slug: string }) {
  const page = getStaticPage(slug);
  if (!page) return null;
  return (
    <>
      <JsonLd data={breadcrumbSchema([{ name: "Home", path: "/" }, { name: page.title, path: `/${slug}` }])} />
      <div className="container-x">
        <Breadcrumbs items={[{ name: page.title }]} />
        <header className="mx-auto max-w-3xl pt-8 sm:pt-12">
          <p className="eyebrow text-navy-700">{page.kicker}</p>
          <h1 className="headline mt-2 text-[2.6rem] sm:text-[3.4rem]">{page.title}</h1>
          <p className="deck mt-4 text-[1.2rem] text-ink-700 sm:text-[1.35rem]">{page.intro}</p>
          <p className="mt-4 font-sans text-[0.85rem] text-ink-500">Last updated {formatDate(`${page.updatedAt}T12:00:00Z`)}</p>
        </header>
        <div className="article-body mx-auto mt-10 max-w-3xl border-t border-line pt-8 [&>p:first-child]:first-letter:float-none [&>p:first-child]:first-letter:text-inherit [&>p:first-child]:first-letter:font-normal [&>p:first-child]:first-letter:text-[1em] [&>p:first-child]:first-letter:m-0">
          {page.sections.map((s, i) => (
            <section key={i}>
              {s.heading && <h2>{s.heading}</h2>}
              {s.paragraphs.map((p, j) => <p key={j}>{p}</p>)}
              {s.bullets && <ul>{s.bullets.map((b) => <li key={b}>{b}</li>)}</ul>}
            </section>
          ))}
        </div>
      </div>
      <div className="mt-20"><NewsletterBlock source={`page-${slug}`} /></div>
    </>
  );
}
