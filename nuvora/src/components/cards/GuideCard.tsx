import Link from "next/link";
import Image from "next/image";
import type { Guide } from "@/content/types";

export function GuideCard({ guide, index = 0 }: { guide: Guide; index?: number }) {
  return (
    <article className="group card-lift relative flex h-full flex-col overflow-hidden rounded-card bg-white shadow-card">
      <Link href={`/articles/${guide.articleSlug}`} className="image-zoom relative block aspect-[4/3] w-full overflow-hidden bg-navy-900" aria-label={guide.title} tabIndex={-1}>
        <Image src={guide.image.src} alt={guide.image.alt} fill sizes="(min-width: 1024px) 25vw, (min-width: 640px) 50vw, 100vw" className="object-cover" />
        <span className="absolute left-4 top-4 rounded-[3px] bg-white/95 px-2.5 py-1 font-sans text-[0.72rem] font-semibold uppercase tracking-[0.12em] text-navy-900">
          {guide.level}
        </span>
      </Link>
      <div className="flex flex-1 flex-col p-5">
        <p className="eyebrow text-sky-500">Guide {String(index + 1).padStart(2, "0")}</p>
        <h3 className="headline mt-2 text-[1.35rem]">
          <Link href={`/articles/${guide.articleSlug}`} className="after:absolute after:inset-0">
            {guide.title}
          </Link>
        </h3>
        <p className="mt-2 text-[0.95rem] leading-relaxed text-ink-700">{guide.description}</p>
        <span className="mt-auto pt-4 font-sans text-[0.9rem] font-semibold text-navy-800">
          Start reading <span aria-hidden="true">→</span>
        </span>
      </div>
    </article>
  );
}
