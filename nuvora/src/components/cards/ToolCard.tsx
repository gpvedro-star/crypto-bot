import Link from "next/link";
import type { AITool } from "@/content/types";
import { ToolMonogram } from "./ToolMonogram";

export function ToolCard({ tool }: { tool: AITool }) {
  return (
    <article className="group card-lift relative flex h-full flex-col rounded-card border border-line bg-white p-5 sm:p-6">
      <div className="flex items-center gap-4">
        <ToolMonogram tool={tool} size={52} />
        <div>
          <h3 className="font-serif text-[1.35rem] font-semibold leading-tight text-navy-900">
            <Link href={`/tools/${tool.slug}`} className="after:absolute after:inset-0">
              {tool.name}
            </Link>
          </h3>
          <p className="font-sans text-[0.82rem] text-ink-500">by {tool.maker}</p>
        </div>
      </div>
      <p className="mt-4 text-[0.98rem] leading-relaxed text-ink-700">{tool.tagline}</p>
      <dl className="mt-4 grid grid-cols-[auto_1fr] gap-x-3 gap-y-1.5 font-sans text-[0.88rem]">
        <dt className="text-ink-500">Best for</dt>
        <dd className="text-ink-900">{tool.whoItsFor[0]}</dd>
        <dt className="text-ink-500">Starts at</dt>
        <dd className="text-ink-900">{tool.pricing[0].price}</dd>
      </dl>
      <span className="mt-auto pt-5 font-sans text-[0.9rem] font-semibold text-navy-800">
        Read the explainer <span aria-hidden="true">→</span>
      </span>
    </article>
  );
}
