import Link from "next/link";
import type { ArticleWithMeta } from "@/lib/content";
import { SectionHeading } from "@/components/ui/SectionHeading";
import { FeatureCard } from "@/components/cards/FeatureCard";
import { CompactCard } from "@/components/cards/CompactCard";
import { Reveal } from "@/components/ui/Reveal";

/** The heart of NUVORA: one large feature, then a list of practical stories. */
export function EverydaySection({ articles }: { articles: ArticleWithMeta[] }) {
  const [lead, ...rest] = articles;
  return (
    <section aria-labelledby="everyday-heading" className="bg-cream py-16 sm:py-20">
      <div className="container-x">
        <SectionHeading
          title="AI for Everyday Life"
          kicker="Everyday AI"
          description="Small, useful ways to put AI to work on the ordinary parts of your day."
          href="/everyday-ai"
          linkLabel="All everyday stories"
        />
        <div className="mt-8 grid gap-10 lg:grid-cols-12 lg:gap-14">
          <div className="lg:col-span-7">
            {lead && (
              <Reveal>
                <FeatureCard article={lead} size="lg" sizes="(min-width: 1024px) 58vw, 100vw" />
              </Reveal>
            )}
          </div>
          <div className="lg:col-span-5">
            <p className="eyebrow border-b border-line pb-3 text-ink-500">More practical stories</p>
            <ul className="divide-y divide-line">
              {rest.slice(0, 4).map((a, i) => (
                <Reveal key={a.slug} as="li" delay={i * 70} className="py-5">
                  <CompactCard article={a} />
                </Reveal>
              ))}
            </ul>
            <Link href="/everyday-ai" className="link-underline mt-2 inline-block pb-0.5 font-sans text-[0.95rem] font-semibold text-navy-800">
              Browse Everyday AI <span aria-hidden="true">→</span>
            </Link>
          </div>
        </div>
      </div>
    </section>
  );
}
