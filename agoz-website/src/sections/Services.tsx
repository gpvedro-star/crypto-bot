import { Reveal } from "../components/Reveal";
import { SectionHeading } from "../components/SectionHeading";
import { services } from "../data/services";

/**
 * Editorial list rather than a card grid: each service is a row with a hairline
 * above it, a large index, an icon and the copy. Hovering warms the whole row.
 */
export function Services() {
  return (
    <section
      id="services"
      className="relative bg-ink py-24 text-cream md:py-32 lg:py-40"
    >
      <div className="shell">
        <SectionHeading
          eyebrow="שירותים"
          tone="light"
          title={
            <>
              כל מה שהגינה צריכה —<br />
              <span className="text-gilded">מהשרטוט ועד הטיפול השוטף.</span>
            </>
          }
          intro="אפשר להתחיל בתכנון בלבד, להמשיך להקמה מלאה, או להצטרף בשלב התחזוקה. כל שירות עומד בפני עצמו ומשתלב עם השאר."
        />

        <ul className="mt-16 border-t border-cream/12 md:mt-20">
          {services.map((service, i) => {
            const Icon = service.icon;
            return (
              <Reveal
                as="li"
                key={service.id}
                delay={(i % 2) * 80}
                className="block"
              >
                <article className="group relative border-b border-cream/12 transition-colors duration-500 ease-brand hover:bg-cream/[0.035]">
                  <div className="grid max-w-5xl grid-cols-[auto_1fr] items-start gap-x-5 gap-y-3 py-8 md:grid-cols-[3.25rem_auto_minmax(0,15rem)_minmax(0,1fr)] md:items-center md:gap-x-10 md:py-9">
                    <span
                      aria-hidden="true"
                      className="font-sans text-[0.72rem] font-semibold tracking-[0.2em] text-gold/85 transition-colors duration-500 group-hover:text-gold-light md:text-[0.78rem]"
                    >
                      0{i + 1}
                    </span>

                    <span className="row-start-1 flex h-11 w-11 flex-none items-center justify-center rounded-full border border-cream/15 text-gold transition-all duration-500 ease-brand group-hover:border-gold/60 group-hover:bg-gold/10 md:col-start-2">
                      <Icon size={19} strokeWidth={1.5} aria-hidden="true" />
                    </span>

                    <h3 className="col-span-2 text-[1.3rem] font-medium text-cream transition-colors duration-500 group-hover:text-gold-light md:col-span-1 md:col-start-3 md:text-[1.45rem]">
                      {service.title}
                    </h3>

                    <p className="col-span-2 text-[0.97rem] leading-[1.8] text-cream/55 transition-colors duration-500 group-hover:text-cream/75 md:col-span-1 md:col-start-4">
                      {service.description}
                    </p>
                  </div>
                </article>
              </Reveal>
            );
          })}
        </ul>
      </div>
    </section>
  );
}
