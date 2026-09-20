import Link from "next/link";
import type { AITool } from "@/content/types";
import type { ArticleWithMeta } from "@/lib/content";
import { ArticleMeta } from "@/components/ui/ArticleMeta";

/** Flat typographic mark. Deliberately not ToolMonogram: that one is a gradient
 *  chip with a drop shadow, which reads as app-store chrome in this register —
 *  and it is shared with the tool pages, so it is left alone. */
function Mark({ tool, size = 44 }: { tool: AITool; size?: number }) {
  return (
    <span
      aria-hidden="true"
      className="inline-flex shrink-0 items-center justify-center rounded-[3px] bg-navy-900 font-sans font-semibold text-white"
      style={{ width: size, height: size, fontSize: size * 0.38 }}
    >
      {tool.monogram}
    </span>
  );
}

/** Small labelled fact: the questions readers actually arrive with. */
function Fact({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <dt className="eyebrow text-ink-400">{label}</dt>
      <dd className="mt-1.5 font-sans text-[0.98rem] leading-relaxed text-ink-900">{children}</dd>
    </div>
  );
}

function priceRange(tool: AITool) {
  return tool.pricing.map((tier) => `${tier.name} ${tier.price}`).join(" · ");
}

/**
 * The tools desk: one tool explained at length, the rest set in parallel so the
 * differences read across, then the desk's own explainers.
 *
 * No cards, pills or hover-lift — a bordered grid of logos with "From $20" chips
 * is a software directory, which is the one thing this section must not look
 * like. `verdict` stays off the page until it is written: today it holds
 * placeholder copy about the verdict being written.
 */
export function ToolsSection({ tools, articles }: { tools: AITool[]; articles: ArticleWithMeta[] }) {
  const [lead, ...rest] = tools;
  const others = rest.slice(0, 3);
  const explainers = articles.slice(0, 3);

  return (
    <section aria-labelledby="tools-heading" className="container-x">
      <header className="border-t-2 border-navy-900 pt-4">
        <p className="eyebrow text-navy-700">The tools desk</p>
        <div className="mt-2 flex flex-wrap items-end justify-between gap-x-8 gap-y-3">
          <div className="max-w-2xl">
            <h2 id="tools-heading" className="headline text-[2rem] sm:text-[2.5rem]">
              AI tools, explained
            </h2>
            <p className="mt-2 text-[1.02rem] leading-relaxed text-ink-500">
              What each tool is, who it is for, and whether it is worth your time.
            </p>
          </div>
          <Link href="/tools" className="eyebrow inline-flex items-center gap-2 text-navy-900 hover:text-navy-700">
            All tools <span aria-hidden="true">→</span>
          </Link>
        </div>
      </header>

      {/* ---- The tool explained at length -------------------------------- */}
      {lead && (
        <article className="mt-10 grid gap-8 lg:grid-cols-12 lg:gap-x-14">
          <div className="lg:col-span-5">
            <div className="flex items-center gap-4">
              <Mark tool={lead} size={52} />
              <div>
                <h3 className="headline text-[1.75rem] sm:text-[2rem]">
                  <Link href={`/tools/${lead.slug}`} className="transition-colors hover:text-navy-700">
                    {lead.name}
                  </Link>
                </h3>
                <p className="eyebrow mt-1 text-ink-400">by {lead.maker}</p>
              </div>
            </div>
            <p className="deck mt-5 text-[1.1rem] leading-relaxed text-ink-700">{lead.tagline}</p>
            <p className="mt-3 text-[1rem] leading-relaxed text-ink-700">{lead.description}</p>
          </div>

          <dl className="grid gap-7 border-t border-line pt-7 md:grid-cols-3 lg:col-span-7 lg:border-l lg:border-t-0 lg:pl-14 lg:pt-0">
            <Fact label="Who it is for">{lead.whoItsFor[0]}</Fact>
            <Fact label="What it costs">{priceRange(lead)}</Fact>
            <Fact label="Best used for">{lead.bestUses.slice(0, 2).join(", ")}</Fact>
            <div className="md:col-span-3">
              <Link
                href={`/tools/${lead.slug}`}
                className="eyebrow inline-flex items-center gap-2 text-navy-900 hover:text-navy-700"
              >
                Read the {lead.name} explainer <span aria-hidden="true">→</span>
              </Link>
            </div>
          </dl>
        </article>
      )}

      {/* ---- The rest, set in parallel so differences read across --------- */}
      {others.length > 0 && (
        <div className="mt-12 border-t border-navy-900 pt-8">
          <p className="eyebrow text-ink-400">Also on the desk</p>
          <ul className="mt-5 grid gap-x-10 gap-y-9 md:grid-cols-3">
            {others.map((tool) => (
              <li key={tool.slug} className="relative border-t border-line-strong/60 pt-6">
                <div className="flex items-center gap-3">
                  <Mark tool={tool} size={36} />
                  <div className="min-w-0">
                    <h3 className="title text-[1.2rem]">
                      <Link href={`/tools/${tool.slug}`} className="after:absolute after:inset-0 hover:text-navy-700">
                        {tool.name}
                      </Link>
                    </h3>
                    <p className="eyebrow mt-0.5 text-ink-400">by {tool.maker}</p>
                  </div>
                </div>
                <p className="mt-4 text-[1rem] leading-relaxed text-ink-700">{tool.tagline}</p>
                <dl className="mt-4 space-y-3">
                  <Fact label="Who it is for">{tool.whoItsFor[0]}</Fact>
                  <Fact label="What it costs">{priceRange(tool)}</Fact>
                </dl>
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* ---- The desk's own explainers ----------------------------------- */}
      {explainers.length > 0 && (
        <div className="mt-12 border-t border-line pt-6">
          <p className="eyebrow text-ink-400">From the tools desk</p>
          <ul className="mt-1 grid md:grid-cols-3 md:gap-x-10">
            {explainers.map((article) => (
              <li key={article.slug} className="border-b border-line">
                <article className="relative py-5">
                  <h3 className="title text-[1.05rem] sm:text-[1.1rem]">
                    <Link href={article.href} className="after:absolute after:inset-0 hover:text-navy-700">
                      {article.title}
                    </Link>
                  </h3>
                  <ArticleMeta article={article} showAuthor={false} className="relative z-10 mt-2" />
                </article>
              </li>
            ))}
          </ul>
        </div>
      )}

      <p className="mt-8 max-w-2xl font-sans text-[0.9rem] leading-relaxed text-ink-500">
        Tool descriptions are editorial explanations, not endorsements. Prices change often — confirm them on the
        provider&apos;s own site before you pay. Read our{" "}
        <Link href="/affiliate-disclosure" className="underline decoration-line-strong hover:text-navy-900">
          affiliate disclosure
        </Link>
        .
      </p>
    </section>
  );
}
