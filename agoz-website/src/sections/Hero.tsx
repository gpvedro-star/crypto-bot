import { ArrowLeft, MoveDown } from 'lucide-react'
import { Photo } from '../components/Photo'
import { Button } from '../components/Button'
import { images } from '../data/images'
import { CTA_LABEL, site } from '../lib/siteConfig'

export function Hero() {
  return (
    <section
      id="top"
      aria-label="ברוכים הבאים"
      className="relative isolate flex min-h-[100svh] flex-col justify-end overflow-hidden bg-ink"
    >
      {/* Backdrop — very slow drift keeps the frame alive without demanding attention */}
      <div className="absolute inset-0 -z-10">
        <Photo
          photo={images.hero}
          priority
          fill
          sizes="100vw"
          className="h-full w-full [&>img]:animate-[heroDrift_28s_ease-in-out_infinite_alternate] motion-reduce:[&>img]:animate-none"
          imgClassName="object-[50%_60%]"
        />
      </div>

      <div
        aria-hidden="true"
        className="absolute inset-0 -z-10 bg-[linear-gradient(to_top,rgb(var(--c-ink)/0.94)_0%,rgb(var(--c-ink)/0.72)_28%,rgb(var(--c-ink)/0.28)_58%,rgb(var(--c-ink)/0.55)_100%)]"
      />
      <div aria-hidden="true" className="grain absolute inset-0 -z-10" />

      <div className="shell relative pb-16 pt-32 md:pb-20 lg:pb-24">
        <div className="max-w-3xl">
          <p className="eyebrow animate-[riseIn_0.9s_cubic-bezier(0.22,1,0.36,1)_both] text-gold">
            {site.disciplines}
          </p>

          <h1 className="mt-6 animate-[riseIn_0.9s_cubic-bezier(0.22,1,0.36,1)_0.1s_both] text-[clamp(2.15rem,6.2vw,4.6rem)] font-medium leading-[1.1] text-cream">
            מהגינה שלכם —
            <br />
            <span className="text-gilded">למקום שאוהבים לחיות בו.</span>
          </h1>

          <p className="mt-7 max-w-xl animate-[riseIn_0.9s_cubic-bezier(0.22,1,0.36,1)_0.22s_both] text-[1.05rem] leading-[1.85] text-cream/75 md:text-[1.15rem]">
            עיצוב, הקמה ותחזוקה של גינות בהתאמה אישית — עם ירידה לפרטים ותוצאה
            שמרגישים בכל פינה.
          </p>

          <div className="mt-10 flex animate-[riseIn_0.9s_cubic-bezier(0.22,1,0.36,1)_0.34s_both] flex-col gap-3 sm:flex-row sm:items-center sm:gap-4">
            <Button href="#contact">{CTA_LABEL}</Button>
            <Button
              href="#portfolio"
              variant="outline"
              icon={
                <ArrowLeft
                  size={17}
                  strokeWidth={1.75}
                  aria-hidden="true"
                  className="transition-transform duration-300 ease-brand group-hover:-translate-x-1 motion-reduce:group-hover:translate-x-0"
                />
              }
            >
              צפו בעבודות שלנו
            </Button>
          </div>
        </div>
      </div>

      <div className="shell relative hidden pb-10 md:block">
        <div className="flex items-center gap-3 text-cream/60">
          <MoveDown
            size={15}
            strokeWidth={1.5}
            aria-hidden="true"
            className="animate-[nudge_2.4s_ease-in-out_infinite] motion-reduce:animate-none"
          />
          <span className="eyebrow text-[0.6rem]">גללו</span>
          <span aria-hidden="true" className="h-px w-16 bg-cream/20" />
        </div>
      </div>
    </section>
  )
}
