import { formatDate } from "@/lib/dates";
import { site } from "@/content/site";

/** Thin brand line under the header: publication name, tagline and date. */
export function Masthead() {
  const today = formatDate(new Date().toISOString());
  return (
    <div className="container-x">
      <div className="flex items-center justify-between border-b border-line py-3 font-sans text-[0.8rem] text-ink-500">
        <p>
          <span className="font-semibold tracking-[0.12em] text-navy-900">{site.name}</span>
          <span className="mx-2 text-line-strong" aria-hidden="true">|</span>
          <span className="italic">{site.tagline}.</span>
        </p>
        <p className="hidden sm:block">{today}</p>
      </div>
    </div>
  );
}
