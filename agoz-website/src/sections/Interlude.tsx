import { Photo } from '../components/Photo'
import { Reveal } from '../components/Reveal'
import { images } from '../data/images'
import { site } from '../lib/siteConfig'

/**
 * A quiet full-bleed band between the heavier sections: foliage, the brand
 * medallion, and nothing else. It gives the page somewhere to breathe and puts
 * the mark back in front of the reader at full size.
 */
export function Interlude() {
  return (
    <section aria-label="אגוז · גינות יוקרה" className="relative isolate overflow-hidden bg-ink">
      <div className="absolute inset-0 -z-10">
        <Photo photo={images.texture} fill sizes="100vw" className="h-full w-full" />
      </div>
      <div className="absolute inset-0 -z-10 bg-ink/72" />
      <div aria-hidden="true" className="grain absolute inset-0 -z-10" />

      <div className="shell flex flex-col items-center py-20 text-center md:py-24">
        <Reveal>
          <img
            src="/brand/agoz-logo.png"
            width={112}
            height={112}
            alt=""
            loading="lazy"
            className="mx-auto h-24 w-24 md:h-28 md:w-28"
          />
        </Reveal>
        <Reveal delay={120}>
          <p className="mt-6 font-latin text-[0.82rem] tracking-[0.42em] text-gold/85">
            LUXURY GARDENS
          </p>
        </Reveal>
        <Reveal delay={200}>
          <p className="eyebrow mt-3 text-[0.6rem] text-cream/55">{site.disciplines}</p>
        </Reveal>
      </div>
    </section>
  )
}
