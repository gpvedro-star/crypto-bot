import { useState } from 'react'
import { Phone, Mail, Send, Check, ArrowLeft } from 'lucide-react'
import { WhatsAppIcon } from '../components/BrandIcons'
import { Reveal } from '../components/Reveal'
import { SectionHeading } from '../components/SectionHeading'
import { site } from '../lib/siteConfig'

type Field = { id: 'name' | 'phone' | 'email' | 'message'; label: string; type: string; required: boolean; autoComplete: string }

const fields: Field[] = [
  { id: 'name', label: 'שם', type: 'text', required: true, autoComplete: 'name' },
  { id: 'phone', label: 'טלפון', type: 'tel', required: true, autoComplete: 'tel' },
  { id: 'email', label: 'אימייל', type: 'email', required: false, autoComplete: 'email' },
]

const inputClass =
  'w-full border-0 border-b border-charcoal/25 bg-transparent px-0 py-3 text-[1rem] text-charcoal transition-colors duration-300 placeholder:text-charcoal/70 focus:border-gold-deep focus:outline-none focus:ring-0'

/**
 * The form has no backend yet: submitting hands the details to WhatsApp so no
 * enquiry is silently lost. Swap `handleSubmit` for a POST once an endpoint or
 * form service is in place.
 */
export function Contact() {
  const [sent, setSent] = useState(false)

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    const data = new FormData(e.currentTarget)
    const text = [
      'פנייה מהאתר',
      `שם: ${data.get('name') ?? ''}`,
      `טלפון: ${data.get('phone') ?? ''}`,
      data.get('email') ? `אימייל: ${data.get('email')}` : '',
      `הודעה: ${data.get('message') ?? ''}`,
    ]
      .filter(Boolean)
      .join('\n')

    window.open(`${site.phone.whatsapp}?text=${encodeURIComponent(text)}`, '_blank', 'noopener')
    setSent(true)
  }

  return (
    <section id="contact" className="relative bg-cream py-24 md:py-32 lg:py-40">
      <div className="shell">
        <div className="grid gap-14 lg:grid-cols-12 lg:gap-20">
          {/* Direct contact */}
          <div className="lg:col-span-5">
            <SectionHeading
              eyebrow="צור קשר"
              title={
                <>
                  נשמח לשמוע
                  <br />
                  <span className="text-gold-deep">על החלל שלכם.</span>
                </>
              }
              intro="השאירו פרטים ונחזור אליכם, או שלחו הודעה ישירה — מה שנוח לכם."
            />

            <Reveal delay={140}>
              <ul className="mt-10 space-y-3">
                <li>
                  <a
                    href={site.phone.href}
                    className="group flex items-center gap-4 border border-charcoal/15 px-5 py-4 transition-all duration-300 ease-brand hover:border-gold-deep/50 hover:bg-charcoal/[0.03]"
                  >
                    <Phone size={19} strokeWidth={1.5} aria-hidden="true" className="flex-none text-gold-deep" />
                    <span className="flex flex-col">
                      <span className="text-[0.78rem] text-charcoal/70">טלפון</span>
                      <span className="ltr text-[1.05rem] font-semibold text-charcoal">
                        {site.phone.display}
                      </span>
                    </span>
                    <ArrowLeft
                      size={17}
                      strokeWidth={1.5}
                      aria-hidden="true"
                      className="ms-auto flex-none text-charcoal/25 transition-all duration-300 ease-brand group-hover:-translate-x-1 group-hover:text-gold-deep motion-reduce:group-hover:translate-x-0"
                    />
                  </a>
                </li>
                <li>
                  <a
                    href={site.phone.whatsappPrefill}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="group flex items-center gap-4 border border-charcoal/15 px-5 py-4 transition-all duration-300 ease-brand hover:border-gold-deep/50 hover:bg-charcoal/[0.03]"
                  >
                    <WhatsAppIcon size={19} className="flex-none text-gold-deep" />
                    <span className="flex flex-col">
                      <span className="text-[0.78rem] text-charcoal/70">וואטסאפ</span>
                      <span className="text-[1.05rem] font-semibold text-charcoal">
                        שליחת הודעה
                      </span>
                    </span>
                    <ArrowLeft
                      size={17}
                      strokeWidth={1.5}
                      aria-hidden="true"
                      className="ms-auto flex-none text-charcoal/25 transition-all duration-300 ease-brand group-hover:-translate-x-1 group-hover:text-gold-deep motion-reduce:group-hover:translate-x-0"
                    />
                  </a>
                </li>
                {!site.email.isPlaceholder && (
                  <li>
                    <a
                      href={site.email.href}
                      className="group flex items-center gap-4 border border-charcoal/15 px-5 py-4 transition-all duration-300 ease-brand hover:border-gold-deep/50 hover:bg-charcoal/[0.03]"
                    >
                      <Mail size={19} strokeWidth={1.5} aria-hidden="true" className="flex-none text-gold-deep" />
                      <span className="flex flex-col">
                        <span className="text-[0.78rem] text-charcoal/70">אימייל</span>
                        <span className="ltr text-[1.05rem] font-semibold text-charcoal">
                          {site.email.display}
                        </span>
                      </span>
                      <ArrowLeft
                        size={17}
                        strokeWidth={1.5}
                        aria-hidden="true"
                        className="ms-auto flex-none text-charcoal/25 transition-all duration-300 ease-brand group-hover:-translate-x-1 group-hover:text-gold-deep motion-reduce:group-hover:translate-x-0"
                      />
                    </a>
                  </li>
                )}
              </ul>

              {site.areaServed && (
                <p className="mt-6 text-[0.92rem] text-charcoal/70">
                  אזור השירות: {site.areaServed}
                </p>
              )}
            </Reveal>
          </div>

          {/* Form */}
          <div className="lg:col-span-6 lg:col-start-7">
            <Reveal delay={100}>
              <form onSubmit={handleSubmit} noValidate={false} className="space-y-7">
                <div className="grid gap-7 sm:grid-cols-2">
                  {fields.map((f) => (
                    <div key={f.id} className={f.id === 'email' ? 'sm:col-span-2' : ''}>
                      <label
                        htmlFor={`f-${f.id}`}
                        className="mb-1 block text-[0.8rem] font-semibold tracking-wide text-charcoal/70"
                      >
                        {f.label}
                        {!f.required && (
                          <span className="font-normal text-charcoal/70"> (לא חובה)</span>
                        )}
                      </label>
                      <input
                        id={`f-${f.id}`}
                        name={f.id}
                        type={f.type}
                        required={f.required}
                        autoComplete={f.autoComplete}
                        dir={f.id === 'phone' || f.id === 'email' ? 'ltr' : 'rtl'}
                        className={`${inputClass} ${f.id === 'phone' || f.id === 'email' ? 'text-start' : ''}`}
                      />
                    </div>
                  ))}
                </div>

                <div>
                  <label
                    htmlFor="f-message"
                    className="mb-1 block text-[0.8rem] font-semibold tracking-wide text-charcoal/70"
                  >
                    הודעה
                  </label>
                  <textarea
                    id="f-message"
                    name="message"
                    rows={4}
                    placeholder="ספרו לנו בקצרה על השטח ועל מה שאתם מדמיינים"
                    className={`${inputClass} resize-y`}
                  />
                </div>

                <div className="flex flex-col gap-4 pt-1 sm:flex-row sm:items-center">
                  <button
                    type="submit"
                    className="group inline-flex items-center justify-center gap-2.5 rounded-sm bg-charcoal px-8 py-4 text-[0.95rem] font-semibold text-cream transition-all duration-300 ease-brand hover:bg-gold-deep hover:-translate-y-0.5 motion-reduce:hover:translate-y-0"
                  >
                    שלחו פרטים
                    <Send
                      size={16}
                      strokeWidth={1.75}
                      aria-hidden="true"
                      className="transition-transform duration-300 ease-brand group-hover:-translate-x-0.5 motion-reduce:group-hover:translate-x-0"
                    />
                  </button>

                  <p
                    role="status"
                    className={`flex items-center gap-2 text-[0.88rem] text-leaf-deep transition-opacity duration-300 ${
                      sent ? 'opacity-100' : 'opacity-0'
                    }`}
                  >
                    <Check size={16} strokeWidth={2} aria-hidden="true" />
                    נפתח חלון וואטסאפ עם הפרטים — רק ללחוץ שליחה.
                  </p>
                </div>

                <p className="text-[0.82rem] leading-relaxed text-charcoal/70">
                  הפרטים נשלחים ישירות לוואטסאפ של העסק ואינם נשמרים באתר.
                </p>
              </form>
            </Reveal>
          </div>
        </div>
      </div>
    </section>
  )
}
