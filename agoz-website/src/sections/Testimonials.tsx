import { Quote } from 'lucide-react'
import { Reveal } from '../components/Reveal'
import { SectionHeading } from '../components/SectionHeading'
import { isPlaceholder, testimonials } from '../data/testimonials'

export function Testimonials() {
  return (
    <section id="testimonials" className="relative bg-cream-warm py-24 md:py-32 lg:py-40">
      <div className="shell">
        <SectionHeading
          eyebrow="לקוחות מספרים"
          align="center"
          title={
            <>
              מה שנשאר אחרי
              <br />
              <span className="text-gold-deep">שהעבודה נגמרת.</span>
            </>
          }
        />

        <div className="mt-16 grid gap-px border-t border-charcoal/12 bg-charcoal/12 md:mt-20 md:grid-cols-3">
          {testimonials.map((t, i) => (
            <Reveal as="figure" key={t.id} delay={i * 110} className="block bg-cream-warm">
              <div className="flex h-full flex-col px-0 py-10 md:px-8">
                <Quote
                  size={22}
                  strokeWidth={1.25}
                  aria-hidden="true"
                  className="flex-none rotate-180 text-gold/60"
                />
                <blockquote className="mt-6 flex-1 font-display text-[1.14rem] font-normal leading-[1.75] text-charcoal/85">
                  {t.quote}
                </blockquote>
                <figcaption className="mt-8 border-t border-charcoal/12 pt-5">
                  <span className="block font-sans text-[0.95rem] font-semibold text-charcoal">
                    {t.author}
                  </span>
                  <span className="mt-0.5 block text-[0.85rem] text-charcoal/70">
                    {t.context}
                  </span>
                </figcaption>
              </div>
            </Reveal>
          ))}
        </div>

        {isPlaceholder && (
          <Reveal delay={140}>
            <p className="mx-auto mt-8 max-w-2xl text-center text-[0.85rem] leading-relaxed text-charcoal/70">
              טקסטים להמחשה בלבד — אלו אינן המלצות אמיתיות ואינן מייצגות לקוחות
              קיימים. המלצות אמיתיות יוחלפו כאן לאחר קבלת אישור מהלקוחות.
            </p>
          </Reveal>
        )}
      </div>
    </section>
  )
}
