/**
 * The article's own key takeaways as a light editorial strip under the
 * opening: three columns on wide screens, a plain stack on phones. No icons,
 * badges or shadows — the numbers carry the order.
 */
export function AtAGlance({ items }: { items: string[] }) {
  return (
    <section
      aria-labelledby="at-a-glance"
      className="rounded-[6px] border border-sky-200 bg-sky-50 px-5 py-6 sm:px-8 sm:py-7 lg:grid lg:grid-cols-[minmax(0,10.5rem)_minmax(0,1fr)] lg:gap-10"
    >
      <div>
        <h2 id="at-a-glance" className="font-serif text-[1.45rem] font-semibold leading-tight text-navy-900 sm:text-[1.65rem]">
          At a glance
        </h2>
        <span aria-hidden="true" className="mt-3 block h-[2px] w-10 bg-navy-900" />
      </div>
      <ol className="mt-5 grid gap-5 md:grid-cols-3 md:gap-x-8 lg:mt-1">
        {items.map((item, i) => (
          <li
            key={i}
            className="border-t border-sky-200 pt-4 first:border-t-0 first:pt-0 md:border-l md:border-t-0 md:pl-6 md:pt-0 md:[&:nth-child(3n+1)]:border-l-0 md:[&:nth-child(3n+1)]:pl-0"
          >
            <span className="font-sans text-[0.8rem] font-semibold tracking-[0.08em] text-navy-700 tabular">
              {String(i + 1).padStart(2, "0")}
            </span>
            <p className="mt-1.5 font-sans text-[1.02rem] leading-[1.55] text-ink-900">{item}</p>
          </li>
        ))}
      </ol>
    </section>
  );
}
