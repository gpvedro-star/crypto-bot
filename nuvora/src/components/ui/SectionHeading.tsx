import Link from "next/link";

interface SectionHeadingProps {
  title: string;
  kicker?: string;
  description?: string;
  href?: string;
  linkLabel?: string;
  tone?: "light" | "dark";
  as?: "h2" | "h3";
  id?: string;
}

export function SectionHeading({ title, kicker, description, href, linkLabel = "View all", tone = "light", as: Tag = "h2", id }: SectionHeadingProps) {
  const dark = tone === "dark";
  return (
    <div className="flex flex-wrap items-end justify-between gap-x-8 gap-y-4">
      <div className="max-w-2xl">
        {kicker && (
          <p className={`mb-3 flex items-center gap-2 font-sans text-[0.8rem] font-semibold uppercase tracking-[0.12em] ${dark ? "text-sky-300" : "text-sky-500"}`}>
            <span className={`inline-block h-2 w-2 rounded-full ${dark ? "bg-sky-300" : "bg-sky-500"}`} aria-hidden="true" />
            {kicker}
          </p>
        )}
        <Tag id={id} className={`headline text-[2rem] sm:text-[2.6rem] ${dark ? "text-white" : "text-navy-900"}`}>{title}</Tag>
        {description && <p className={`mt-3 text-[1.05rem] leading-relaxed ${dark ? "text-white/70" : "text-ink-500"}`}>{description}</p>}
      </div>
      {href && (
        <Link
          href={href}
          className={`inline-flex min-h-[44px] items-center gap-2 rounded-full border px-5 font-sans text-[0.92rem] font-semibold transition-colors ${
            dark ? "border-white/25 text-white hover:bg-white hover:text-navy-900" : "border-line-strong text-navy-900 hover:border-navy-900 hover:bg-navy-900 hover:text-white"
          }`}
        >
          {linkLabel}
          <span aria-hidden="true">→</span>
        </Link>
      )}
    </div>
  );
}
