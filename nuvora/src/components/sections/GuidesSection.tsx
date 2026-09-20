import Link from "next/link";
import Image from "next/image";
import type { Guide } from "@/content/types";

/**
 * "Start here": a roadmap rather than four identical doors.
 *
 * The intro states the promise and hands off; the four pathways run as numbered
 * steps on rules, with Beginner given the extra weight so there is an obvious
 * front door — without demoting the other three, any of which can be entered
 * directly.
 *
 * Light on purpose: the newsletter block and the footer below are both navy, so
 * a dark band here would have given the page three dark blocks in a row.
 */
export function GuidesSection({ guides }: { guides: Guide[] }) {
  return (
    <section aria-labelledby="guides-heading" className="border-y border-line bg-cream section-pad">
      <div className="container-x grid gap-12 lg:grid-cols-12 lg:gap-x-16">
        {/* ---- Intro --------------------------------------------------- */}
        <div className="lg:col-span-4 lg:flex lg:flex-col">
          <p className="eyebrow border-t-2 border-navy-900 pt-4 text-navy-700">NUVORA Guides</p>
          <h2 id="guides-heading" className="headline mt-3 text-[2rem] sm:text-[2.5rem]">
            Start here
          </h2>
          <p className="mt-3 text-[1.05rem] leading-relaxed text-ink-700">
            Step-by-step guides that start from zero and assume nothing.
          </p>
          <p className="deck mt-6 text-[1.05rem] text-ink-500">Choose where you want to begin.</p>
          <Link
            href="/guides"
            className="eyebrow mt-6 inline-flex items-center gap-2 self-start text-navy-900 hover:text-navy-700 lg:mt-auto lg:pt-10"
          >
            All guides <span aria-hidden="true">→</span>
          </Link>
        </div>

        {/* ---- Pathways ------------------------------------------------ */}
        <ol className="lg:col-span-8">
          {guides.map((guide, i) => {
            const first = i === 0;
            return (
              <li key={guide.slug} className="border-t border-line-strong/60 first:border-t-0 lg:first:border-t">
                <article className={`relative flex gap-5 sm:gap-7 ${first ? "py-7 lg:pt-7" : "py-7"}`}>
                  <span
                    aria-hidden="true"
                    className={`tabular w-10 shrink-0 font-serif font-normal leading-none text-navy-900/40 sm:w-14 ${
                      first ? "text-[2rem] sm:text-[2.9rem]" : "text-[1.8rem] sm:text-[2.5rem]"
                    }`}
                  >
                    {String(i + 1).padStart(2, "0")}
                  </span>

                  <div className="min-w-0 flex-1">
                    <p className="eyebrow text-navy-700">{guide.level}</p>
                    <h3 className={`headline mt-2 ${first ? "text-[1.5rem] sm:text-[1.8rem]" : "text-[1.3rem] sm:text-[1.45rem]"}`}>
                      <Link href={`/articles/${guide.articleSlug}`} className="after:absolute after:inset-0 hover:text-navy-700">
                        {guide.title}
                      </Link>
                    </h3>
                    <p className="mt-2 max-w-[54ch] text-[1rem] leading-relaxed text-ink-700">{guide.description}</p>
                    <span className="eyebrow mt-3 inline-flex items-center gap-2 text-navy-900">
                      Start reading <span aria-hidden="true">→</span>
                    </span>
                  </div>

                  {/* Only the front door carries a picture, and only where there
                      is room for it: mobile stays a plain reading path. */}
                  {first && (
                    <div className="relative hidden aspect-[4/3] w-[150px] shrink-0 self-start overflow-hidden bg-mist sm:block lg:w-[176px]">
                      <Image
                        src={guide.image.src}
                        alt=""
                        fill
                        sizes="176px"
                        className="object-cover"
                      />
                    </div>
                  )}
                </article>
              </li>
            );
          })}
        </ol>
      </div>
    </section>
  );
}
