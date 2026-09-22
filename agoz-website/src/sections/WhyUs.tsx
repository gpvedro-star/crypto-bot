import { Photo } from '../components/Photo'
import { Reveal } from '../components/Reveal'
import { SectionHeading } from '../components/SectionHeading'
import { advantages } from '../data/whyUs'
import { images } from '../data/images'

export function WhyUs() {
  return (
    <section id="why-us" className="relative overflow-hidden bg-ink text-cream">
      <div className="grid lg:grid-cols-12">
        {/* Imagery panel — full-bleed on the start side at desktop */}
        <div className="relative lg:col-span-5 lg:min-h-[44rem]">
          <Photo
            photo={images.desk}
            sizes="(max-width: 1024px) 100vw, 42vw"
            fill
            className="h-full min-h-[18rem] w-full lg:absolute lg:inset-0"
          />
          <div
            aria-hidden="true"
            className="absolute inset-0 bg-gradient-to-t from-ink/75 via-ink/15 to-transparent lg:bg-gradient-to-r lg:from-ink lg:via-ink/25 lg:to-transparent"
          />
        </div>

        {/* Copy panel */}
        <div className="lg:col-span-7">
          <div className="px-[var(--shell-gutter)] py-24 md:py-28 lg:py-32 lg:pe-[max(var(--shell-gutter),6vw)] lg:ps-16">
            <SectionHeading
              eyebrow="למה אנחנו"
              tone="light"
              title={
                <>
                  מה שהופך גינה יפה
                  <br />
                  <span className="text-gilded">לגינה שנשארת יפה.</span>
                </>
              }
            />

            <dl className="mt-14 grid gap-x-10 gap-y-9 sm:grid-cols-2">
              {advantages.map((item, i) => (
                <Reveal key={item.title} delay={(i % 2) * 90}>
                  <div className="border-t border-cream/15 pt-5">
                    <dt className="flex items-baseline gap-3 font-display text-[1.18rem] font-medium text-cream">
                      <span
                        aria-hidden="true"
                        className="font-sans text-[0.68rem] font-semibold tracking-[0.2em] text-gold/85"
                      >
                        0{i + 1}
                      </span>
                      {item.title}
                    </dt>
                    <dd className="mt-2.5 text-[0.95rem] leading-[1.8] text-cream/55">
                      {item.description}
                    </dd>
                  </div>
                </Reveal>
              ))}
            </dl>
          </div>
        </div>
      </div>
    </section>
  )
}
