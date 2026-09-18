import Link from "next/link";
import type { ArticleWithMeta } from "@/lib/content";
import { ArticleImage } from "@/components/ui/ArticleImage";
import { ArticleMeta } from "@/components/ui/ArticleMeta";
import { CategoryTag } from "@/components/ui/CategoryTag";
import { ImageCard } from "@/components/cards/ImageCard";
import { Reveal } from "@/components/ui/Reveal";
import { site } from "@/content/site";

interface HeroSectionProps {
  lead: ArticleWithMeta;
  topStories: ArticleWithMeta[];
}

/**
 * Front page: a navy cover band with the lead story, then a strip of top
 * stories that overlaps the band's bottom edge.
 */
export function HeroSection({ lead, topStories }: HeroSectionProps) {
  const developing = topStories.find((a) => a.breaking);
  const cards = topStories.filter((a) => a !== developing).slice(0, 4);

  return (
    <section aria-labelledby="lead-story">
      <div className="bg-navy-900 text-white">
        <div className="container-x grid gap-10 pb-28 pt-10 sm:pt-14 lg:grid-cols-12 lg:items-center lg:gap-14 lg:pb-36 lg:pt-16">
          <div className="lg:col-span-6">
            <p className="flex items-center gap-2 font-sans text-[0.8rem] font-semibold uppercase tracking-[0.14em] text-sky-300">
              <span className="inline-block h-2 w-2 rounded-full bg-sky-300" aria-hidden="true" />
              {site.tagline}
            </p>
            <div className="mt-6 flex flex-wrap items-center gap-2">
              <CategoryTag category={lead.category} tone="dark" />
              {lead.breaking && <span className="pill bg-sky-500 text-navy-950">Developing</span>}
            </div>
            <h1 id="lead-story" className="headline mt-5 text-[2.5rem] text-white sm:text-[3.4rem] lg:text-[3.9rem]">
              <Link href={lead.href} className="hover:text-sky-100">
                {lead.title}
              </Link>
            </h1>
            <p className="mt-5 max-w-xl text-[1.15rem] leading-relaxed text-white/80 sm:text-[1.25rem]">{lead.subtitle}</p>
            <ArticleMeta article={lead} tone="dark" className="mt-5" />
            <div className="mt-8 flex flex-wrap gap-3">
              <Link href={lead.href} className="inline-flex min-h-[50px] items-center gap-2 rounded-full bg-white px-6 font-sans text-[0.98rem] font-semibold text-navy-900 transition-colors hover:bg-sky-100">
                Read the story <span aria-hidden="true">→</span>
              </Link>
              <Link href="/latest" className="inline-flex min-h-[50px] items-center rounded-full border border-white/30 px-6 font-sans text-[0.98rem] font-semibold text-white transition-colors hover:bg-white/10">
                All stories
              </Link>
            </div>
          </div>
          <div className="lg:col-span-6">
            <Link href={lead.href} aria-label={lead.title} tabIndex={-1} className="block">
              <ArticleImage image={lead.featuredImage} ratio="aspect-[16/11]" sizes="(min-width: 1024px) 50vw, 100vw" priority className="shadow-lift ring-1 ring-white/10" />
            </Link>
          </div>
        </div>
      </div>

      <div className="container-x -mt-20 lg:-mt-24">
        <div className="rounded-card bg-white p-5 shadow-lift sm:p-7">
          <div className="flex items-center justify-between">
            <p className="font-sans text-[0.8rem] font-semibold uppercase tracking-[0.12em] text-sky-600">Top stories today</p>
            <Link href="/latest" className="font-sans text-[0.88rem] font-semibold text-navy-800 hover:underline">More →</Link>
          </div>
          {developing && (
            <Link href={developing.href} className="group mt-4 flex flex-col gap-2 rounded-[12px] bg-navy-900 px-5 py-4 text-white transition-colors hover:bg-navy-800 sm:flex-row sm:items-center sm:gap-4">
              <span className="pill shrink-0 bg-sky-500 text-navy-950">
                <span className="relative flex h-1.5 w-1.5">
                  <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-current opacity-60" />
                  <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-current" />
                </span>
                Developing
              </span>
              <span className="title text-[1.05rem] text-white">{developing.title}</span>
              <span className="font-sans text-[0.85rem] text-white/60 sm:ml-auto sm:shrink-0">
                <ArticleMeta article={developing} tone="dark" showAuthor={false} />
              </span>
            </Link>
          )}
          <div className="mt-6 grid gap-7 sm:grid-cols-2 lg:grid-cols-4">
            {cards.map((a, i) => (
              <Reveal key={a.slug} delay={60 + i * 60}>
                <ImageCard article={a} sizes="(min-width: 1024px) 25vw, (min-width: 640px) 50vw, 100vw" />
              </Reveal>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
