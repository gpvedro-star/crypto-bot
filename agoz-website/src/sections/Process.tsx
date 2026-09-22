import { Reveal } from '../components/Reveal'
import { SectionHeading } from '../components/SectionHeading'
import { processSteps } from '../data/process'

export function Process() {
  return (
    <section id="process" className="relative bg-cream py-24 md:py-32 lg:py-40">
      <div className="shell">
        <SectionHeading
          eyebrow="התהליך"
          title={
            <>
              ארבעה שלבים,
              <br />
              <span className="text-gold-deep">בלי הפתעות בדרך.</span>
            </>
          }
        />

        <ol className="mt-16 grid gap-px border-t border-charcoal/12 bg-charcoal/12 md:mt-20 md:grid-cols-2 lg:grid-cols-4">
          {processSteps.map((step, i) => (
            <Reveal as="li" key={step.number} delay={i * 110} className="block bg-cream">
              <div className="group h-full px-0 py-9 md:px-7 lg:px-8">
                <span
                  aria-hidden="true"
                  className="block font-display text-[3.1rem] font-light leading-none text-charcoal/12 transition-colors duration-500 ease-brand group-hover:text-gold/45"
                >
                  {step.number}
                </span>
                <h3 className="mt-5 text-[1.3rem] font-medium text-charcoal">{step.title}</h3>
                <p className="mt-3 text-[0.97rem] leading-[1.8] text-charcoal/70">
                  {step.description}
                </p>
              </div>
            </Reveal>
          ))}
        </ol>
      </div>
    </section>
  )
}
