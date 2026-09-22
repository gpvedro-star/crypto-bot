import { Photo } from '../components/Photo'
import { Reveal } from '../components/Reveal'
import { SectionHeading } from '../components/SectionHeading'
import { images } from '../data/images'

export function About() {
  return (
    <section id="about" className="relative overflow-hidden bg-cream py-24 md:py-32 lg:py-40">
      <div className="shell">
        <div className="grid items-start gap-12 lg:grid-cols-12 lg:gap-16">
          {/* Imagery — large portrait with a smaller square overlapping it */}
          <div className="relative lg:col-span-6 lg:col-start-1">
            <Reveal variant="mask">
              <Photo
                photo={images.aboutMain}
                sizes="(max-width: 1024px) 92vw, 46vw"
                className="w-full"
              />
            </Reveal>

            <Reveal
              delay={180}
              className="relative z-10 mx-auto -mt-16 w-[58%] max-w-[16rem] sm:-mt-24 sm:w-[46%] lg:absolute lg:-bottom-16 lg:left-0 lg:mt-0 lg:w-[52%] lg:max-w-none lg:translate-x-[-14%]"
            >
              <div className="border-[10px] border-cream bg-cream shadow-[0_18px_50px_-24px_rgb(var(--c-charcoal)/0.55)]">
                <Photo
                  photo={images.aboutDetail}
                  sizes="(max-width: 1024px) 50vw, 24vw"
                  className="w-full"
                />
              </div>
            </Reveal>
          </div>

          {/* Copy */}
          <div className="lg:col-span-5 lg:col-start-8 lg:pt-10">
            <SectionHeading
              eyebrow="אודות"
              title={
                <>
                  גינה טובה לא נולדת במקרה —<br />
                  <span className="text-gold-deep">היא מתוכננת.</span>
                </>
              }
            />

            <Reveal delay={120}>
              <div className="mt-8 space-y-5 text-[1.0625rem] leading-[1.9] text-charcoal/80">
                <p>
                  אנחנו מתכננים, מקימים ומתחזקים גינות פרטיות — מהרגע שבו מסתכלים
                  לראשונה על השטח ועד הביקור השוטף שנים אחר כך. כל פרויקט מתחיל
                  בהקשבה: איך אתם חיים בחלל, מי משתמש בו, ובאילו שעות.
                </p>
                <p>
                  מהתשובות האלה נגזרת התכנית — מפלסים, מעברים, אזורי ישיבה, צמחייה
                  שמתאימה לאקלים ולקרקע, ותאורה שממשיכה את הגינה גם אחרי השקיעה.
                  רק אחר כך מתחילים לבצע.
                </p>
                <p>
                  מה שמבדיל תוצאה טובה מתוצאה מצוינת הוא בדרך כלל מה שלא שמים לב
                  אליו: הקו שבו נפגשים הדשא והאבן, גובה הגדר החיה, כיוון הגוף
                  שמאיר את העץ. אלה הפרטים שאנחנו עובדים עליהם.
                </p>
              </div>
            </Reveal>

            <Reveal delay={200}>
              <dl className="mt-10 grid grid-cols-1 gap-x-8 gap-y-6 border-t border-charcoal/12 pt-8 sm:grid-cols-2">
                {[
                  { t: 'תכנון לפני ביצוע', d: 'תכנית מלאה ומאושרת לפני שמרימים את הטוריה הראשונה.' },
                  { t: 'איש קשר אחד', d: 'אותו אדם מלווה אתכם מהפגישה הראשונה ועד התחזוקה.' },
                  { t: 'צמחייה מותאמת', d: 'בחירה לפי אקלים, קרקע וכמות האור בפועל בחלל שלכם.' },
                  { t: 'ליווי אחרי המסירה', d: 'הגינה ממשיכה להשתנות — וכך גם הטיפול בה.' },
                ].map((m) => (
                  <div key={m.t}>
                    <dt className="font-display text-[1.05rem] font-medium text-charcoal">
                      {m.t}
                    </dt>
                    <dd className="mt-1.5 text-[0.95rem] leading-relaxed text-charcoal/70">
                      {m.d}
                    </dd>
                  </div>
                ))}
              </dl>
            </Reveal>
          </div>
        </div>
      </div>
    </section>
  )
}
