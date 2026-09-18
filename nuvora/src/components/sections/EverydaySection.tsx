import type { ArticleWithMeta } from "@/lib/content";
import { SectionHeading } from "@/components/ui/SectionHeading";
import { FeatureCard } from "@/components/cards/FeatureCard";
import { CompactCard } from "@/components/cards/CompactCard";
import { Reveal } from "@/components/ui/Reveal";

/** The heart of NUVORA: one large feature and a row of practical stories. */
export function EverydaySection({ articles }: { articles: ArticleWithMeta[] }) {
  const [lead, ...rest] = articles;
  return (
    <section aria-labelledby="everyday-heading" className="bg-mist section-pad">
      <div className="container-x">
        <SectionHeading id="everyday-heading" title="AI for everyday life" kicker="Everyday AI" description="Small, useful ways to put AI to work on the ordinary parts of your day." href="/everyday-ai" linkLabel="All everyday stories" />
        <div className="mt-10 grid gap-10 lg:grid-cols-12 lg:gap-12">
          <div className="lg:col-span-7">
            {lead && (
              <Reveal>
                <FeatureCard article={lead} size="lg" sizes="(min-width: 1024px) 58vw, 100vw" />
              </Reveal>
            )}
          </div>
          <div className="lg:col-span-5">
            <p className="font-sans text-[0.8rem] font-semibold uppercase tracking-[0.12em] text-ink-500">More practical stories</p>
            <ul className="mt-2 divide-y divide-line">
              {rest.slice(0, 4).map((a, i) => (
                <Reveal key={a.slug} as="li" delay={i * 70} className="py-5">
                  <CompactCard article={a} />
                </Reveal>
              ))}
            </ul>
          </div>
        </div>
      </div>
    </section>
  );
}
