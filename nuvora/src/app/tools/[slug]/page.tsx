import { notFound } from "next/navigation";
import type { Metadata } from "next";
import Link from "next/link";
import { getArticlesByTool, getTool, tools } from "@/lib/content";
import { resolveAffiliate } from "@/lib/affiliates";
import { buildMetadata, breadcrumbSchema, toolSchema } from "@/lib/seo";
import { formatDate } from "@/lib/dates";
import { JsonLd } from "@/components/ui/JsonLd";
import { Breadcrumbs } from "@/components/article/Breadcrumbs";
import { ToolMonogram } from "@/components/cards/ToolMonogram";
import { ToolCard } from "@/components/cards/ToolCard";
import { HorizontalCard } from "@/components/cards/HorizontalCard";
import { SectionHeading } from "@/components/ui/SectionHeading";
import { Reveal } from "@/components/ui/Reveal";
import { NewsletterBlock } from "@/components/sections/NewsletterBlock";

interface Params { slug: string }

export function generateStaticParams(): Params[] {
  return tools.map((t) => ({ slug: t.slug }));
}
export const dynamicParams = false;

export async function generateMetadata({ params }: { params: Promise<Params> }): Promise<Metadata> {
  const { slug } = await params;
  const tool = getTool(slug);
  if (!tool) return {};
  return buildMetadata({ title: `${tool.name}: What It Is, Who It's For, and What It Costs`, description: tool.description, path: `/tools/${slug}` });
}

function List({ title, items, tone = "neutral" }: { title: string; items: string[]; tone?: "neutral" | "pro" | "con" }) {
  return (
    <div>
      <h3 className="eyebrow text-navy-800">{title}</h3>
      <ul className="mt-3 space-y-2.5">
        {items.map((it) => (
          <li key={it} className="flex gap-3 font-sans text-[1rem] leading-relaxed text-ink-900">
            <span aria-hidden="true" className={`mt-[0.55em] h-2 w-2 shrink-0 rounded-full ${tone === "con" ? "bg-ink-400" : "bg-sky-500"}`} />
            {it}
          </li>
        ))}
      </ul>
    </div>
  );
}

export default async function ToolPage({ params }: { params: Promise<Params> }) {
  const { slug } = await params;
  const tool = getTool(slug);
  if (!tool) notFound();
  const link = resolveAffiliate(tool.affiliateId, tool.officialUrl);
  const stories = getArticlesByTool(slug);
  const others = tools.filter((t) => t.slug !== slug).slice(0, 3);

  return (
    <>
      <JsonLd data={[toolSchema(tool), breadcrumbSchema([{ name: "Home", path: "/" }, { name: "AI Tools", path: "/tools" }, { name: tool.name, path: `/tools/${slug}` }])]} />
      <div className="container-x">
        <Breadcrumbs items={[{ name: "AI Tools", href: "/tools" }, { name: tool.name }]} />
        <header className="grid gap-8 border-b border-line pb-10 pt-8 lg:grid-cols-12 lg:items-end">
          <div className="flex items-start gap-5 lg:col-span-8">
            <ToolMonogram tool={tool} size={80} />
            <div>
              <p className="eyebrow text-navy-700">AI Tool · by {tool.maker}</p>
              <h1 className="headline mt-1 text-[2.6rem] sm:text-[3.4rem]">{tool.name}</h1>
              <p className="deck mt-3 max-w-2xl text-[1.2rem] text-ink-700 sm:text-[1.35rem]">{tool.tagline}</p>
              <p className="mt-3 font-sans text-[0.85rem] text-ink-500">Last reviewed {formatDate(tool.updatedAt)}</p>
            </div>
          </div>
          <div className="flex flex-wrap gap-3 lg:col-span-4 lg:justify-end">
            {link && (
              <a href={link.href} rel={link.rel} target="_blank" className="inline-flex min-h-[48px] items-center gap-2 rounded-[4px] bg-navy-900 px-5 font-sans font-semibold text-white transition-colors hover:bg-navy-800">
                Visit {tool.name} <span aria-hidden="true">↗</span>
              </a>
            )}
            <Link href="/tools" className="inline-flex min-h-[48px] items-center rounded-[4px] border border-navy-900 px-5 font-sans font-semibold text-navy-900 transition-colors hover:bg-navy-900 hover:text-white">
              Compare tools
            </Link>
          </div>
        </header>
      </div>

      <div className="container-x mt-12 grid gap-14 lg:grid-cols-12">
        <div className="space-y-12 lg:col-span-8">
          <section aria-labelledby="what-it-is">
            <h2 id="what-it-is" className="font-serif text-[1.8rem] font-semibold text-navy-900">What it is</h2>
            <p className="mt-3 font-serif text-[1.25rem] leading-[1.7] text-ink-900" style={{ fontVariationSettings: '"opsz" 18' }}>{tool.description}</p>
          </section>
          <div className="grid gap-10 sm:grid-cols-2">
            <List title="Who it's for" items={tool.whoItsFor} />
            <List title="Best uses" items={tool.bestUses} />
            <List title="What we like" items={tool.pros} tone="pro" />
            <List title="What to know" items={tool.cons} tone="con" />
          </div>
          <section aria-labelledby="verdict" className="rounded-card bg-navy-900 px-6 py-7 text-white sm:px-8">
            <p className="eyebrow text-sky-300">NUVORA Verdict</p>
            <p id="verdict" className="mt-3 font-serif text-[1.3rem] leading-[1.45]">{tool.verdict}</p>
          </section>
          {stories.length > 0 && (
            <section aria-labelledby="tool-stories">
              <SectionHeading title={`${tool.name} in NUVORA`} kicker="Recent stories & tutorials" />
              <div className="mt-8 grid gap-10">
                {stories.map((a, i) => (
                  <Reveal key={a.slug} delay={i * 60}><HorizontalCard article={a} /></Reveal>
                ))}
              </div>
            </section>
          )}
        </div>

        <aside className="space-y-8 lg:col-span-4">
          <section aria-labelledby="pricing" className="rounded-card border border-line bg-white p-6">
            <h2 id="pricing" className="eyebrow text-navy-800">Pricing</h2>
            <dl className="mt-4 divide-y divide-line">
              {tool.pricing.map((p) => (
                <div key={p.name} className="flex items-baseline justify-between gap-4 py-3">
                  <dt>
                    <span className="block font-sans font-semibold text-ink-900">{p.name}</span>
                    {p.note && <span className="block font-sans text-[0.82rem] text-ink-500">{p.note}</span>}
                  </dt>
                  <dd className="font-serif text-[1.2rem] font-semibold text-navy-900 tabular">{p.price}</dd>
                </div>
              ))}
            </dl>
            <p className="mt-3 font-sans text-[0.8rem] text-ink-500">Prices change often. Confirm on the official site before you pay.</p>
          </section>
          <section aria-labelledby="official" className="rounded-card border border-line bg-white p-6">
            <h2 id="official" className="eyebrow text-navy-800">Official website</h2>
            <a href={tool.officialUrl} rel="noopener" target="_blank" className="mt-2 block break-all font-sans text-[0.98rem] text-navy-800 underline">{tool.officialUrl.replace(/^https?:\/\//, "")}</a>
            {link?.isAffiliate && <p className="mt-3 font-sans text-[0.8rem] text-ink-500">Some links on this page are affiliate links. <Link href="/affiliate-disclosure" className="underline">How that works.</Link></p>}
          </section>
          <section aria-labelledby="other-tools">
            <h2 id="other-tools" className="eyebrow border-b border-line pb-3 text-navy-800">Other tools</h2>
            <div className="mt-4 grid gap-4">
              {others.map((t) => <ToolCard key={t.slug} tool={t} />)}
            </div>
          </section>
        </aside>
      </div>
      <div className="mt-20"><NewsletterBlock source={`tool-${slug}`} /></div>
    </>
  );
}
