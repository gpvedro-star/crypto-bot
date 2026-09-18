import Link from "next/link";
import Image from "next/image";
import type { ComparisonTable as TableType, FAQItem, ImageAsset } from "@/content/types";
import { getTool } from "@/content/tools";
import { resolveAffiliate } from "@/lib/affiliates";
import { Logo } from "@/components/brand/Logo";
import { ToolMonogram } from "@/components/cards/ToolMonogram";

/* ---------- NUVORA EXPLAINS ---------- */
export function Explains({ term, text }: { term: string; text: string }) {
  return (
    <aside className="not-prose my-10 rounded-card border-l-4 border-sky-500 bg-sky-50 px-6 py-6 sm:px-8" aria-label={`NUVORA explains: ${term}`}>
      <p className="eyebrow flex items-center gap-2 text-navy-800">
        <Logo variant="mark" height={16} />
        NUVORA Explains
      </p>
      <p className="mt-3 font-serif text-[1.4rem] font-semibold leading-snug text-navy-900">{term}</p>
      <p className="mt-3 font-sans text-[1.02rem] leading-relaxed text-ink-700">{text}</p>
    </aside>
  );
}

/* ---------- WHY THIS MATTERS ---------- */
export function WhyItMatters({ text }: { text: string }) {
  return (
    <aside className="not-prose my-10 border-y-2 border-navy-900 py-6" aria-label="Why this matters">
      <p className="eyebrow text-navy-900">Why This Matters</p>
      <p className="mt-3 font-serif text-[1.35rem] leading-[1.45] text-navy-900" style={{ fontVariationSettings: '"opsz" 24' }}>{text}</p>
    </aside>
  );
}

/* ---------- THE BOTTOM LINE ---------- */
export function BottomLine({ text }: { text: string }) {
  return (
    <aside className="not-prose my-10 rounded-card bg-navy-900 px-6 py-7 text-white sm:px-8" aria-label="The bottom line">
      <p className="eyebrow text-sky-300">The Bottom Line</p>
      <p className="mt-3 font-serif text-[1.4rem] leading-[1.4]" style={{ fontVariationSettings: '"opsz" 24' }}>{text}</p>
    </aside>
  );
}

/* ---------- KEY TAKEAWAYS ---------- */
export function KeyTakeaways({ items }: { items: string[] }) {
  return (
    <aside className="not-prose my-8 rounded-card border border-line bg-white p-6 sm:p-7" aria-label="Key takeaways">
      <p className="eyebrow text-navy-800">Key Takeaways</p>
      <ol className="mt-4 space-y-3">
        {items.map((item, i) => (
          <li key={i} className="flex gap-4 font-sans text-[1.02rem] leading-relaxed text-ink-900">
            <span className="mt-0.5 shrink-0 font-serif text-[1.1rem] font-semibold text-sky-500 tabular" aria-hidden="true">
              {String(i + 1).padStart(2, "0")}
            </span>
            <span>{item}</span>
          </li>
        ))}
      </ol>
    </aside>
  );
}

/* ---------- CALLOUT ---------- */
export function Callout({ title, text, tone = "neutral" }: { title?: string; text: string; tone?: "neutral" | "important" }) {
  const important = tone === "important";
  return (
    <aside className={`not-prose my-8 rounded-card px-6 py-5 ${important ? "border border-navy-900 bg-white" : "bg-mist"}`}>
      {title && <p className={`font-sans text-[0.95rem] font-semibold ${important ? "text-navy-900" : "text-ink-900"}`}>{title}</p>}
      <p className="mt-1.5 font-sans text-[1rem] leading-relaxed text-ink-700">{text}</p>
    </aside>
  );
}

/* ---------- FAQ ---------- */
export function FAQ({ items }: { items: FAQItem[] }) {
  return (
    <section className="not-prose my-12" aria-labelledby="faq-heading">
      <h2 id="faq-heading" className="font-serif text-[1.6rem] font-semibold text-navy-900">Common questions</h2>
      <div className="mt-4 divide-y divide-line border-y border-line">
        {items.map((item) => (
          <details key={item.question} className="group py-1">
            <summary className="flex min-h-[56px] cursor-pointer list-none items-center justify-between gap-6 py-3 font-sans text-[1.05rem] font-semibold text-navy-900 [&::-webkit-details-marker]:hidden">
              {item.question}
              <span aria-hidden="true" className="shrink-0 text-sky-500 transition-transform duration-300 group-open:rotate-45">＋</span>
            </summary>
            <p className="pb-5 font-sans text-[1rem] leading-relaxed text-ink-700">{item.answer}</p>
          </details>
        ))}
      </div>
    </section>
  );
}

/* ---------- COMPARISON TABLE ---------- */
export function ComparisonTable({ table }: { table: TableType }) {
  return (
    <figure className="not-prose my-10 -mx-5 overflow-x-auto px-5 sm:mx-0 sm:px-0">
      <table>
        {table.caption && <caption className="mb-3 text-left font-sans text-[0.85rem] text-ink-500">{table.caption}</caption>}
        <thead>
          <tr>
            {table.columns.map((c, i) => (
              <th key={i} scope="col">{c}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {table.rows.map((row, r) => (
            <tr key={r}>
              {row.map((cell, c) => (c === 0 ? <th key={c} scope="row" className="text-left font-semibold text-navy-900">{cell}</th> : <td key={c}>{cell}</td>))}
            </tr>
          ))}
        </tbody>
      </table>
    </figure>
  );
}

/* ---------- TOOL RECOMMENDATION ---------- */
export function ToolRecommendation({ toolSlug, note }: { toolSlug: string; note: string }) {
  const tool = getTool(toolSlug);
  if (!tool) return null;
  const link = resolveAffiliate(tool.affiliateId, tool.officialUrl);
  return (
    <aside className="not-prose my-8 flex flex-col gap-4 rounded-card border border-line bg-white p-5 sm:flex-row sm:items-center sm:gap-6">
      <ToolMonogram tool={tool} size={56} />
      <div className="min-w-0 flex-1">
        <p className="eyebrow text-ink-500">Tool</p>
        <p className="font-serif text-[1.3rem] font-semibold text-navy-900">
          <Link href={`/tools/${tool.slug}`} className="hover:underline">{tool.name}</Link>
          <span className="ml-2 font-sans text-[0.85rem] font-normal text-ink-500">by {tool.maker}</span>
        </p>
        <p className="mt-1 font-sans text-[0.98rem] text-ink-700">{note}</p>
      </div>
      <div className="flex shrink-0 gap-2">
        <Link href={`/tools/${tool.slug}`} className="inline-flex min-h-[44px] items-center rounded-[4px] border border-navy-900 px-4 font-sans text-[0.9rem] font-semibold text-navy-900 transition-colors hover:bg-navy-900 hover:text-white">
          Our explainer
        </Link>
        {link && (
          <a href={link.href} rel={link.rel} target="_blank" className="inline-flex min-h-[44px] items-center rounded-[4px] bg-navy-900 px-4 font-sans text-[0.9rem] font-semibold text-white transition-colors hover:bg-navy-800">
            Visit site
          </a>
        )}
      </div>
    </aside>
  );
}

/* ---------- FIGURE / GALLERY ---------- */
export function Figure({ image, size = "body" }: { image: ImageAsset; size?: "body" | "wide" }) {
  return (
    <figure className={`not-prose my-10 ${size === "wide" ? "lg:-mx-24" : ""}`}>
      <div className="relative aspect-[16/10] overflow-hidden rounded-image bg-mist">
        <Image src={image.src} alt={image.alt} fill sizes={size === "wide" ? "(min-width: 1024px) 960px, 100vw" : "(min-width: 768px) 720px, 100vw"} className="object-cover" />
      </div>
      {(image.caption || image.credit) && (
        <figcaption className="mt-3 font-sans text-[0.85rem] leading-snug text-ink-500">
          {image.caption} {image.credit && <span className="text-ink-400">{image.credit}</span>}
        </figcaption>
      )}
    </figure>
  );
}

export function Gallery({ images, caption }: { images: ImageAsset[]; caption?: string }) {
  return (
    <figure className="not-prose my-10">
      <div className="grid grid-cols-2 gap-3">
        {images.map((img, i) => (
          <div key={i} className="relative aspect-[4/3] overflow-hidden rounded-image bg-mist">
            <Image src={img.src} alt={img.alt} fill sizes="(min-width: 768px) 360px, 50vw" className="object-cover" />
          </div>
        ))}
      </div>
      {caption && <figcaption className="mt-3 font-sans text-[0.85rem] text-ink-500">{caption}</figcaption>}
    </figure>
  );
}
