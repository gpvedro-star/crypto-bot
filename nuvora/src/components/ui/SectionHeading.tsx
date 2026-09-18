import Link from "next/link";

interface SectionHeadingProps {
  title: string;
  kicker?: string;
  description?: string;
  href?: string;
  linkLabel?: string;
  tone?: "light" | "dark";
  as?: "h2" | "h3";
}

export function SectionHeading({ title, kicker, description, href, linkLabel = "View all", tone = "light", as: Tag = "h2" }: SectionHeadingProps) {
  const dark = tone === "dark";
  return (
    <div className={`flex flex-wrap items-end justify-between gap-x-8 gap-y-3 border-t-2 pt-4 ${dark ? "border-white/80" : "border-navy-900"}`}>
      <div className="max-w-2xl">
        {kicker && <p className={`eyebrow mb-2 ${dark ? "text-sky-300" : "text-navy-700"}`}>{kicker}</p>}
        <Tag className={`headline text-[1.75rem] sm:text-[2.1rem] ${dark ? "text-white" : "text-navy-900"}`}>{title}</Tag>
        {description && <p className={`mt-2 text-[1.02rem] ${dark ? "text-white/75" : "text-ink-500"}`}>{description}</p>}
      </div>
      {href && (
        <Link
          href={href}
          className={`link-underline inline-flex items-center gap-1.5 pb-0.5 font-sans text-[0.95rem] font-semibold ${dark ? "text-sky-300" : "text-navy-800"}`}
        >
          {linkLabel}
          <span aria-hidden="true">→</span>
        </Link>
      )}
    </div>
  );
}
