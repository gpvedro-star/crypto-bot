import { Phone } from 'lucide-react'
import { WhatsAppIcon, FacebookIcon, InstagramIcon } from '../components/BrandIcons'
import { Logo } from '../components/Logo'
import { nav, site } from '../lib/siteConfig'

export function Footer() {
  const year = new Date().getFullYear()
  const socials = [
    { href: site.social.facebook, label: 'פייסבוק', Icon: FacebookIcon },
    { href: site.social.instagram, label: 'אינסטגרם', Icon: InstagramIcon },
  ].filter((s): s is { href: string; label: string; Icon: typeof FacebookIcon } => Boolean(s.href))

  return (
    <footer className="bg-ink text-cream">
      <div className="shell py-16 md:py-20">
        <div className="grid gap-12 md:grid-cols-12 md:gap-8">
          <div className="md:col-span-5">
            <Logo size={58} />
            <p className="mt-6 max-w-xs text-[0.95rem] leading-[1.8] text-cream/50">
              עיצוב, תכנון, הקמה ותחזוקה של גינות פרטיות בהתאמה אישית.
            </p>
          </div>

          <nav aria-label="ניווט בתחתית העמוד" className="md:col-span-3">
            <h2 className="eyebrow text-[0.6rem] text-gold/80">ניווט</h2>
            <ul className="mt-5 space-y-2.5">
              {nav.map((item) => (
                <li key={item.href}>
                  <a
                    href={item.href}
                    className="text-[0.95rem] text-cream/60 transition-colors duration-300 hover:text-gold"
                  >
                    {item.label}
                  </a>
                </li>
              ))}
            </ul>
          </nav>

          <div className="md:col-span-4">
            <h2 className="eyebrow text-[0.6rem] text-gold/80">יצירת קשר</h2>
            <ul className="mt-5 space-y-2.5">
              <li>
                <a
                  href={site.phone.href}
                  className="flex items-center gap-2.5 text-[0.95rem] text-cream/60 transition-colors duration-300 hover:text-gold"
                >
                  <Phone size={15} strokeWidth={1.5} aria-hidden="true" />
                  <span className="ltr">{site.phone.display}</span>
                </a>
              </li>
              <li>
                <a
                  href={site.phone.whatsappPrefill}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-2.5 text-[0.95rem] text-cream/60 transition-colors duration-300 hover:text-gold"
                >
                  <WhatsAppIcon size={15} />
                  וואטסאפ
                </a>
              </li>
            </ul>

            {socials.length > 0 && (
              <ul className="mt-6 flex gap-3">
                {socials.map(({ href, label, Icon }) => (
                  <li key={label}>
                    <a
                      href={href}
                      target="_blank"
                      rel="noopener noreferrer"
                      aria-label={label}
                      className="flex h-10 w-10 items-center justify-center rounded-full border border-cream/20 text-cream/60 transition-all duration-300 hover:border-gold/60 hover:text-gold"
                    >
                      <Icon size={16} />
                    </a>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>

        <div className="mt-14 flex flex-col gap-3 border-t border-cream/12 pt-7 text-[0.82rem] text-cream/55 sm:flex-row sm:items-center sm:justify-between">
          <p>
            © {year} {site.nameFull}. כל הזכויות שמורות.
          </p>
          <p className="font-latin tracking-[0.18em]">{site.latinName}</p>
        </div>
      </div>
    </footer>
  )
}
