import Link from "next/link";
import type { AITool } from "@/content/types";
import type { ArticleWithMeta } from "@/lib/content";
import { SectionHeading } from "@/components/ui/SectionHeading";
import { ToolCard } from "@/components/cards/ToolCard";
import { HorizontalCard } from "@/components/cards/HorizontalCard";
import { Reveal } from "@/components/ui/Reveal";

export function ToolsSection({ tools, articles }: { tools: AITool[]; articles: ArticleWithMeta[] }) {
  return (
    <section aria-labelledby="tools-heading" className="container-x">
      <SectionHeading title="AI Tools, Explained" kicker="The Tools Desk" description="What each tool is, who it is for, and whether it is worth your time." href="/tools" linkLabel="All tools" />
      <div className="mt-8 grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
        {tools.slice(0, 4).map((tool, i) => (
          <Reveal key={tool.slug} delay={i * 60}>
            <ToolCard tool={tool} />
          </Reveal>
        ))}
      </div>
      {articles.length > 0 && (
        <div className="mt-12 grid gap-10 border-t border-line pt-10 lg:grid-cols-2 lg:gap-12">
          {articles.slice(0, 2).map((a, i) => (
            <Reveal key={a.slug} delay={i * 80}>
              <HorizontalCard article={a} />
            </Reveal>
          ))}
        </div>
      )}
      <p className="mt-8 font-sans text-[0.9rem] text-ink-500">
        Tool descriptions are editorial explanations, not endorsements. Read our{" "}
        <Link href="/affiliate-disclosure" className="underline hover:text-navy-900">affiliate disclosure</Link>.
      </p>
    </section>
  );
}
