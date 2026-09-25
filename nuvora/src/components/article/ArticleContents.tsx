import type { OutlineEntry } from "@/lib/article-outline";

/**
 * "In this article". Two presentations of the same list: a collapsed native
 * disclosure in the reading column below 1280px, and a quiet list in the
 * margin above it. Native <details> keeps it keyboard-operable with no script.
 */
export function ContentsDisclosure({ outline }: { outline: OutlineEntry[] }) {
  return (
    <details className="group not-prose mb-10 border-b border-line xl:hidden">
      <summary className="flex min-h-[48px] cursor-pointer list-none items-center justify-between gap-4 font-sans text-[0.95rem] font-semibold text-navy-900 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-navy-700 [&::-webkit-details-marker]:hidden">
        <span>
          In this article <span className="font-normal text-ink-500">· {outline.length} sections</span>
        </span>
        <span aria-hidden="true" className="text-navy-700 transition-transform group-open:rotate-180">
          ▾
        </span>
      </summary>
      <nav aria-label="In this article" className="pb-5">
        <ol className="space-y-1">
          {outline.map((entry) => (
            <li key={entry.id}>
              <a
                href={`#${entry.id}`}
                className="block py-1.5 font-sans text-[0.95rem] leading-snug text-ink-700 underline decoration-transparent underline-offset-[3px] hover:text-navy-900 hover:decoration-navy-900"
              >
                {entry.text}
              </a>
            </li>
          ))}
        </ol>
      </nav>
    </details>
  );
}

export function ContentsRail({ outline }: { outline: OutlineEntry[] }) {
  return (
    <nav aria-label="In this article" className="border-t-2 border-navy-900 pt-3">
      <p className="eyebrow text-navy-900">In this article</p>
      <ol className="mt-3 space-y-0.5 border-l border-line">
        {outline.map((entry, i) => (
          <li key={entry.id}>
            <a
              href={`#${entry.id}`}
              className="-ml-px flex gap-2.5 border-l border-transparent py-1.5 pl-4 font-sans text-[0.9rem] leading-snug text-ink-700 transition-colors hover:border-navy-900 hover:text-navy-900 focus-visible:border-navy-900 focus-visible:text-navy-900"
            >
              <span aria-hidden="true" className="tabular text-ink-500">{i + 1}.</span>
              <span>{entry.text}</span>
            </a>
          </li>
        ))}
      </ol>
    </nav>
  );
}
