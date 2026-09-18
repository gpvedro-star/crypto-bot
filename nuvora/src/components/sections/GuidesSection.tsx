import type { Guide } from "@/content/types";
import { SectionHeading } from "@/components/ui/SectionHeading";
import { GuideCard } from "@/components/cards/GuideCard";
import { Reveal } from "@/components/ui/Reveal";

export function GuidesSection({ guides }: { guides: Guide[] }) {
  return (
    <section aria-labelledby="guides-heading" className="bg-navy-950 section-pad text-white">
      <div className="container-x">
        <SectionHeading id="guides-heading" title="NUVORA Guides" kicker="Start here" description="Step-by-step guides that start from zero and assume nothing." href="/guides" linkLabel="All guides" tone="dark" />
        <div className="mt-10 grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
          {guides.map((g, i) => (
            <Reveal key={g.slug} delay={i * 70}>
              <GuideCard guide={g} index={i} />
            </Reveal>
          ))}
        </div>
      </div>
    </section>
  );
}
