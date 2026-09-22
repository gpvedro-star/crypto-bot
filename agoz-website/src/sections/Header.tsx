import { useEffect, useState } from 'react'
import { Menu, X, Phone } from 'lucide-react'
import { Logo } from '../components/Logo'
import { CTA_LABEL, nav, site } from '../lib/siteConfig'

export function Header() {
  const [scrolled, setScrolled] = useState(false)
  const [open, setOpen] = useState(false)

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 24)
    onScroll()
    window.addEventListener('scroll', onScroll, { passive: true })
    return () => window.removeEventListener('scroll', onScroll)
  }, [])

  // Lock the page while the mobile sheet is open, and let Escape close it.
  useEffect(() => {
    if (!open) return
    const prev = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && setOpen(false)
    window.addEventListener('keydown', onKey)
    return () => {
      document.body.style.overflow = prev
      window.removeEventListener('keydown', onKey)
    }
  }, [open])

  return (
    <>
      <a
        href="#main"
        className="sr-only focus:not-sr-only focus:fixed focus:top-4 focus:right-4 focus:z-[60] focus:rounded-sm focus:bg-gold focus:px-5 focus:py-3 focus:font-semibold focus:text-ink"
      >
        דילוג לתוכן הראשי
      </a>

      <header
        className={`fixed inset-x-0 top-0 z-50 transition-all duration-500 ease-brand ${
          scrolled
            ? 'border-b border-gold/15 bg-ink/92 backdrop-blur-xl'
            : 'border-b border-transparent bg-gradient-to-b from-ink/70 to-transparent'
        }`}
      >
        <div
          className={`shell flex items-center justify-between transition-all duration-500 ease-brand ${
            scrolled ? 'h-[4.25rem]' : 'h-[5.5rem]'
          }`}
        >
          <a href="#top" aria-label={`${site.nameFull} — לראש העמוד`} className="flex-none">
            <Logo size={scrolled ? 40 : 50} className="transition-all duration-500 ease-brand" />
          </a>

          <nav aria-label="ניווט ראשי" className="hidden lg:block">
            <ul className="flex items-center gap-9">
              {nav.map((item) => (
                <li key={item.href}>
                  <a
                    href={item.href}
                    className="group relative py-2 text-[0.94rem] font-medium text-cream/80 transition-colors duration-300 hover:text-cream"
                  >
                    {item.label}
                    <span
                      aria-hidden="true"
                      className="absolute inset-x-0 -bottom-0.5 h-px origin-right scale-x-0 bg-gold transition-transform duration-300 ease-brand group-hover:scale-x-100"
                    />
                  </a>
                </li>
              ))}
            </ul>
          </nav>

          <div className="flex items-center gap-3">
            <a
              href={site.phone.href}
              className="hidden items-center gap-2 text-[0.92rem] font-medium text-cream/75 transition-colors hover:text-gold md:flex lg:hidden xl:flex"
            >
              <Phone size={15} strokeWidth={1.75} aria-hidden="true" />
              <span className="ltr">{site.phone.display}</span>
            </a>

            <a
              href="#contact"
              className="hidden rounded-sm border border-gold/55 px-5 py-2.5 text-[0.88rem] font-semibold text-gold transition-all duration-300 ease-brand hover:bg-gold hover:text-ink sm:inline-block"
            >
              {CTA_LABEL}
            </a>

            <button
              type="button"
              onClick={() => setOpen(true)}
              aria-label="פתיחת תפריט"
              aria-expanded={open}
              aria-controls="mobile-nav"
              className="-me-2 flex h-11 w-11 items-center justify-center text-cream lg:hidden"
            >
              <Menu size={24} strokeWidth={1.5} aria-hidden="true" />
            </button>
          </div>
        </div>
      </header>

      {/* Full-screen mobile navigation */}
      <div
        id="mobile-nav"
        className={`fixed inset-0 z-[55] lg:hidden ${open ? '' : 'pointer-events-none'}`}
        aria-hidden={!open}
      >
        <div
          onClick={() => setOpen(false)}
          className={`absolute inset-0 bg-ink/70 backdrop-blur-sm transition-opacity duration-400 ${
            open ? 'opacity-100' : 'opacity-0'
          }`}
        />
        <div
          className={`absolute inset-0 flex flex-col bg-ink transition-[transform,opacity] duration-500 ease-brand ${
            open ? 'translate-y-0 opacity-100' : '-translate-y-3 opacity-0'
          }`}
        >
          <div className="shell flex h-[5.5rem] flex-none items-center justify-between">
            <Logo size={46} />
            <button
              type="button"
              onClick={() => setOpen(false)}
              aria-label="סגירת תפריט"
              className="-me-2 flex h-11 w-11 items-center justify-center text-cream"
            >
              <X size={24} strokeWidth={1.5} aria-hidden="true" />
            </button>
          </div>

          <nav aria-label="ניווט במובייל" className="shell flex-1 overflow-y-auto pb-8">
            <ul className="flex flex-col">
              {nav.map((item, i) => (
                <li key={item.href} className="border-b border-cream/10">
                  <a
                    href={item.href}
                    onClick={() => setOpen(false)}
                    style={{ transitionDelay: open ? `${90 + i * 55}ms` : '0ms' }}
                    className={`flex items-baseline gap-4 py-5 font-display text-[1.65rem] text-cream transition-all duration-500 ease-brand ${
                      open ? 'translate-y-0 opacity-100' : 'translate-y-3 opacity-0'
                    }`}
                  >
                    <span className="font-sans text-[0.7rem] font-semibold text-gold/85">
                      0{i + 1}
                    </span>
                    {item.label}
                  </a>
                </li>
              ))}
            </ul>

            <div className="mt-9 flex flex-col gap-3">
              <a
                href="#contact"
                onClick={() => setOpen(false)}
                className="rounded-sm bg-gold px-6 py-4 text-center font-semibold text-ink"
              >
                {CTA_LABEL}
              </a>
              <a
                href={site.phone.href}
                className="flex items-center justify-center gap-2 rounded-sm border border-cream/25 px-6 py-4 font-semibold text-cream"
              >
                <Phone size={17} strokeWidth={1.75} aria-hidden="true" />
                <span className="ltr">{site.phone.display}</span>
              </a>
            </div>
          </nav>
        </div>
      </div>
    </>
  )
}
