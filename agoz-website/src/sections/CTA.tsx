import { Photo } from '../components/Photo'
import { Reveal } from '../components/Reveal'
import { Button } from '../components/Button'
import { images } from '../data/images'
import { CTA_LABEL, site } from '../lib/siteConfig'

export function CTA() {
  return (
    <section aria-labelledby="cta-title" className="relative isolate overflow-hidden bg-ink">
      <div className="absolute inset-0 -z-10">
        <Photo
          photo={images.ctaBackdrop}
          sizes="100vw"
          fill
          className="h-full w-full"
          imgClassName="object-[50%_55%]"
        />
      </div>
      <div
        aria-hidden="true"
        className="absolute inset-0 -z-10 bg-[linear-gradient(to_top,rgb(var(--c-ink)/0.93),rgb(var(--c-ink)/0.75)_55%,rgb(var(--c-ink)/0.6))]"
      />
      <div aria-hidden="true" className="grain absolute inset-0 -z-10" />

      <div className="shell py-28 text-center md:py-36 lg:py-44">
        <Reveal>
          <span className="eyebrow text-gold">{site.disciplines}</span>
        </Reveal>

        <Reveal delay={90}>
          <h2
            id="cta-title"
            className="mx-auto mt-6 max-w-3xl text-[clamp(1.95rem,5.2vw,3.7rem)] font-medium text-cream"
          >
            הגינה הבאה שלכם <span className="text-gilded">מתחילה כאן.</span>
          </h2>
        </Reveal>

        <Reveal delay={170}>
          <p className="mx-auto mt-7 max-w-2xl text-[1.03rem] leading-[1.9] text-cream/70 md:text-[1.1rem]">
            ספרו לנו מה אתם רוצים ליצור, ונחשוב יחד איך להפוך את החלל שלכם לגינה
            שתיהנו ממנה בכל יום.
          </p>
        </Reveal>

        <Reveal delay={250}>
          <div className="mt-11 flex flex-col items-center justify-center gap-3 sm:flex-row sm:gap-4">
            <Button href="#contact" className="w-full sm:w-auto">
              {CTA_LABEL}
            </Button>
            <a
              href={site.phone.href}
              className="text-[0.95rem] font-medium text-cream/70 underline-offset-8 transition-colors hover:text-gold hover:underline"
            >
              או חייגו <span className="ltr font-semibold">{site.phone.display}</span>
            </a>
          </div>
        </Reveal>
      </div>
    </section>
  )
}
