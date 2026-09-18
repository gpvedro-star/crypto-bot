import Link from "next/link";

export interface Crumb {
  name: string;
  href?: string;
}

export function Breadcrumbs({ items }: { items: Crumb[] }) {
  return (
    <nav aria-label="Breadcrumb" className="pt-5 font-sans text-[0.82rem] text-ink-500">
      <ol className="flex flex-wrap items-center gap-x-2">
        <li>
          <Link href="/" className="hover:text-navy-900 hover:underline">Home</Link>
        </li>
        {items.map((item, i) => (
          <li key={i} className="flex items-center gap-x-2">
            <span aria-hidden="true" className="text-line-strong">/</span>
            {item.href ? (
              <Link href={item.href} className="hover:text-navy-900 hover:underline">{item.name}</Link>
            ) : (
              <span className="line-clamp-1 max-w-[50vw] text-ink-700" aria-current="page">{item.name}</span>
            )}
          </li>
        ))}
      </ol>
    </nav>
  );
}
