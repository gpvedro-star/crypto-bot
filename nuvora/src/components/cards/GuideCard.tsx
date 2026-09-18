import Link from "next/link";
import Image from "next/image";
import type { Guide } from "@/content/types";

export function GuideCard({ guide, index = 0 }: { guide: Guide; index?: number }) {
  return (
    <article className="group card-lift relative flex h-full min-h-[380px] flex-col justify-end overflow-hidden rounded-card bg-navy-900 text-white shadow-card">
      <Image src={guide.image.src} alt={guide.image.alt} fill sizes="(min-width: 1024px) 25vw, (min-width: 640px) 50vw, 100vw" className="object-cover transition-transform duration-[900ms] [transition-timing-function:var(--ease-editorial)] group-hover:scale-105" />
      <div className="absolute inset-0 bg-gradient-to-t from-navy-950/90 via-navy-950/40 to-transparent" aria-hidden="true" />
      <div className="relative p-6">
        <span className="pill bg-white/15 text-sky-300">{guide.level} · Guide {String(index + 1).padStart(2, "0")}</span>
        <h3 className="headline mt-4 text-[1.5rem] text-white">
          <Link href={`/articles/${guide.articleSlug}`} className="after:absolute after:inset-0">
            {guide.title}
          </Link>
        </h3>
        <p className="mt-2 text-[0.95rem] leading-relaxed text-white/75">{guide.description}</p>
        <span className="mt-4 inline-flex items-center gap-1.5 font-sans text-[0.9rem] font-semibold text-sky-300">
          Start reading <span aria-hidden="true" className="transition-transform group-hover:translate-x-1">→</span>
        </span>
      </div>
    </article>
  );
}
