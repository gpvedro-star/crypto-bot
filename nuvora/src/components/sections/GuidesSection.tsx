import type { Guide } from "@/content/types";
import { SectionHeading } from "@/components/ui/SectionHeading";
import { GuideCard } from "@/components/cards/GuideCard";
import { Reveal } from "@/components/ui/Reveal";

export function GuidesSection({ guides }: { guides: Guide[] }) {
  return (
    <section aria-labelledby="guides-heading" className="container-x">
      <SectionHeading title="NUVORA Guides" kicker="Start Here" description="Step-by-step guides that start from zero and assume nothing." href="/guides" linkLabel="All guides" />
      <div className="mt-8 grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
        {guides.map((g, i) => (
          <Reveal key={g.slug} delay={i * 70}>
            <GuideCard guide={g} index={i} />
          </Reveal>
        ))}
      </div>
    </section>
  );
}
