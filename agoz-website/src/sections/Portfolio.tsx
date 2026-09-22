import { Photo } from '../components/Photo'
import { Reveal } from '../components/Reveal'
import { SectionHeading } from '../components/SectionHeading'
import { gallery } from '../data/images'

const spanClass: Record<string, string> = {
  tall: 'md:row-span-2',
  wide: 'md:col-span-2',
  normal: '',
}

/**
 * Inspiration gallery.
 * NOTE: these are reference images of the design language, not photographs of
 * completed client projects — hence the "השראה" label and the note below the
 * heading. Once real project photography exists, swap the entries in
 * `src/data/images.ts` and change this heading to "העבודות שלנו".
 */
export function Portfolio() {
  return (
    <section id="portfolio" className="relative bg-cream-warm py-24 md:py-32 lg:py-40">
      <div className="shell">
        <div className="flex flex-col gap-8 lg:flex-row lg:items-end lg:justify-between">
          <SectionHeading
            eyebrow="השראה"
            title={
              <>
                שפת העיצוב שלנו —<br />
                <span className="text-gold-deep">אבן, ירוק ואור.</span>
              </>
            }
            className="lg:max-w-xl"
          />

          <Reveal delay={140}>
            <p className="max-w-sm border-s-2 border-gold/40 ps-5 text-[0.92rem] leading-[1.8] text-charcoal/70">
              התמונות כאן מציגות את קו העיצוב והאווירה שאנחנו עובדים בהם. הן אינן
              תיעוד של פרויקטים שבוצעו — גלריית העבודות שלנו תעלה לכאן בקרוב.
            </p>
          </Reveal>
        </div>

        <div id="gallery" className="mt-14 grid grid-cols-1 gap-4 sm:grid-cols-2 md:auto-rows-[minmax(0,15rem)] md:grid-cols-3 md:gap-5 lg:auto-rows-[minmax(0,17.5rem)]">
          {gallery.map((item, i) => (
            <Reveal
              key={item.id}
              variant="mask"
              delay={(i % 3) * 90}
              className={`group relative block overflow-hidden bg-charcoal/10 ${spanClass[item.span]}`}
            >
              <figure className="h-full">
                <Photo
                  photo={item}
                  zoomOnHover
                  sizes="(max-width: 640px) 92vw, (max-width: 1024px) 46vw, 31vw"
                  className="h-full w-full"
                />
                <div
                  aria-hidden="true"
                  className="pointer-events-none absolute inset-0 bg-gradient-to-t from-ink/80 via-ink/5 to-transparent opacity-70 transition-opacity duration-500 ease-brand group-hover:opacity-90"
                />
                <figcaption className="pointer-events-none absolute inset-x-0 bottom-0 p-5 md:p-6">
                  <span className="eyebrow block text-[0.58rem] text-gold/85">
                    {item.caption}
                  </span>
                  <span className="mt-1.5 block font-display text-[1.18rem] font-medium text-cream transition-transform duration-500 ease-brand group-hover:-translate-y-0.5 motion-reduce:group-hover:translate-y-0">
                    {item.title}
                  </span>
                </figcaption>
              </figure>
            </Reveal>
          ))}
        </div>
      </div>
    </section>
  )
}
