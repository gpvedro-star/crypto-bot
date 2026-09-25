/**
 * A before/after illustration built from the article's own example text, as
 * plain HTML. The label is always shown so it cannot be read as a product
 * screenshot or as tested output.
 */
function splitLead(item: string): [string, string] | null {
  const m = /^([^:]{2,40}):\s+(.+)$/.exec(item);
  return m ? [m[1], m[2]] : null;
}

export function ExampleTransform({
  label,
  before,
  after,
  note,
}: {
  label: string;
  before: { title: string; items: string[] };
  after: { title: string; items: string[] };
  note?: string;
}) {
  return (
    <figure className="not-prose my-10" aria-label={label}>
      <figcaption className="eyebrow text-navy-900">{label}</figcaption>
      <div className="mt-4 grid gap-3 md:grid-cols-[minmax(0,0.85fr)_auto_minmax(0,1.15fr)] md:items-start md:gap-4">
        <div className="rounded-[6px] border border-line bg-white p-5">
          <p className="font-sans text-[0.95rem] font-semibold text-navy-900">{before.title}</p>
          <ul className="mt-3 space-y-2">
            {before.items.map((item, i) => (
              <li key={i} className="flex gap-3 font-sans text-[1rem] leading-snug text-ink-900">
                <span aria-hidden="true" className="mt-[0.2em] h-3.5 w-3.5 shrink-0 rounded-[2px] border border-ink-500" />
                {item}
              </li>
            ))}
          </ul>
        </div>

        <div aria-hidden="true" className="flex items-center justify-center self-center font-sans text-[1.4rem] text-navy-700">
          <span className="md:hidden">↓</span>
          <span className="hidden md:inline">→</span>
        </div>

        <div className="rounded-[6px] border border-sky-200 bg-sky-50 p-5">
          <p className="font-sans text-[0.95rem] font-semibold text-navy-900">{after.title}</p>
          <ul className="mt-3 space-y-2.5">
            {after.items.map((item, i) => {
              const lead = splitLead(item);
              return (
                <li key={i} className="font-sans text-[1rem] leading-snug text-ink-900">
                  {lead ? (
                    <>
                      <span className="font-semibold text-navy-900">{lead[0]}:</span> {lead[1]}
                    </>
                  ) : (
                    item
                  )}
                </li>
              );
            })}
          </ul>
        </div>
      </div>
      {note && <p className="mt-3 font-sans text-[0.88rem] leading-snug text-ink-500">{note}</p>}
    </figure>
  );
}
