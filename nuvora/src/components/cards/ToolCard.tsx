import Link from "next/link";
import type { AITool } from "@/content/types";
import { ToolMonogram } from "./ToolMonogram";

export function ToolCard({ tool }: { tool: AITool }) {
  return (
    <article className="group card-lift relative flex h-full flex-col rounded-card border border-line bg-white p-6">
      <div className="flex items-center gap-4">
        <ToolMonogram tool={tool} size={56} />
        <div>
          <h3 className="title text-[1.25rem]">
            <Link href={`/tools/${tool.slug}`} className="after:absolute after:inset-0 after:rounded-card">
              {tool.name}
            </Link>
          </h3>
          <p className="font-sans text-[0.82rem] text-ink-500">by {tool.maker}</p>
        </div>
      </div>
      <p className="mt-4 text-[0.98rem] leading-relaxed text-ink-700">{tool.tagline}</p>
      <div className="mt-5 flex flex-wrap gap-2">
        <span className="pill bg-mist text-ink-700 normal-case tracking-normal">{tool.whoItsFor[0]}</span>
        <span className="pill bg-sky-100 text-navy-800 normal-case tracking-normal">From {tool.pricing[0].price}</span>
      </div>
      <span className="mt-auto inline-flex items-center gap-1.5 pt-5 font-sans text-[0.9rem] font-semibold text-navy-800">
        Read the explainer <span aria-hidden="true" className="transition-transform group-hover:translate-x-1">→</span>
      </span>
    </article>
  );
}
