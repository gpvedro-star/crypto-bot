import { useEffect, useState } from 'react'
import { WhatsAppIcon } from './BrandIcons'
import { site } from '../lib/siteConfig'

/**
 * Persistent WhatsApp affordance. It appears once the hero is behind the
 * viewer so it never competes with the opening frame, and sits clear of the
 * iOS home indicator via env(safe-area-inset-bottom).
 */
export function WhatsAppFab() {
  const [show, setShow] = useState(false)

  useEffect(() => {
    const onScroll = () => {
      const pastHero = window.scrollY > window.innerHeight * 0.75
      // Stand down over the contact section — it offers WhatsApp already, and
      // the button would otherwise sit on top of the form on a phone.
      const contact = document.getElementById('contact')
      const box = contact?.getBoundingClientRect()
      const atContact = !!box && box.top < window.innerHeight * 0.85 && box.bottom > 0
      setShow(pastHero && !atContact)
    }
    onScroll()
    window.addEventListener('scroll', onScroll, { passive: true })
    window.addEventListener('resize', onScroll, { passive: true })
    return () => {
      window.removeEventListener('scroll', onScroll)
      window.removeEventListener('resize', onScroll)
    }
  }, [])

  return (
    <a
      href={site.phone.whatsappPrefill}
      target="_blank"
      rel="noopener noreferrer"
      aria-label="שליחת הודעת וואטסאפ"
      className={`fixed z-40 flex items-center gap-2.5 rounded-full bg-leaf-deep px-5 py-3.5 font-semibold text-cream shadow-[0_10px_30px_-8px_rgb(var(--c-ink)/0.6)] transition-all duration-500 ease-brand hover:bg-leaf hover:text-ink ${
        show ? 'translate-y-0 opacity-100' : 'pointer-events-none translate-y-4 opacity-0'
      }`}
      style={{
        insetInlineStart: '1rem',
        bottom: 'calc(1rem + env(safe-area-inset-bottom, 0px))',
      }}
    >
      <WhatsAppIcon size={21} />
      <span className="hidden text-[0.9rem] sm:inline">דברו איתנו</span>
    </a>
  )
}
