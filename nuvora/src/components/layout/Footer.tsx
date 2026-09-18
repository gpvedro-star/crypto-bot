import Link from "next/link";
import { Logo } from "@/components/brand/Logo";
import { NewsletterForm } from "@/components/forms/NewsletterForm";
import { footerNav, site } from "@/content/site";

const socials = [
  { label: "X", href: site.social.x, path: "M4 4l16 16M20 4L4 20" },
  { label: "Facebook", href: site.social.facebook, path: "M14 8h3V4h-3a4 4 0 0 0-4 4v2H7v4h3v6h4v-6h3l1-4h-4V8z" },
  { label: "Instagram", href: site.social.instagram, path: "M7 3h10a4 4 0 0 1 4 4v10a4 4 0 0 1-4 4H7a4 4 0 0 1-4-4V7a4 4 0 0 1 4-4zm5 5a4 4 0 1 0 0 8 4 4 0 0 0 0-8zm5-1v.5" },
  { label: "LinkedIn", href: site.social.linkedin, path: "M6 9v11M6 5v.5M10 20v-6a3 3 0 0 1 6 0v6M10 9v11M18 20v-6" },
  { label: "Pinterest", href: site.social.pinterest, path: "M12 3a9 9 0 0 0-3 17.5l1-4.5c-.5-1-.5-2 0-3l1.5-6c.3-1 2-1.5 2.5 0 .3 1-.8 3-1 4.5s1 2.5 2.5 2.5c3 0 4.5-3 4.5-6a6 6 0 0 0-6-6z" },
];

export function Footer() {
  const year = new Date().getFullYear();
  return (
    <footer className="mt-24 bg-navy-900 text-white">
      <div className="container-x">
        <div className="grid gap-12 py-16 lg:grid-cols-12 lg:gap-8">
          <div className="lg:col-span-4">
            <Link href="/" className="inline-block text-white" aria-label="NUVORA home">
              <Logo variant="full" height={64} onDark />
            </Link>
            <p className="mt-6 max-w-sm text-[1rem] leading-relaxed text-white/75">
              An American digital magazine that explains artificial intelligence clearly, calmly and practically — for people who want to understand it, not build it.
            </p>
            <ul className="mt-6 flex items-center gap-1" aria-label="NUVORA on social media">
              {socials.map((s) => (
                <li key={s.label}>
                  <a
                    href={s.href}
                    className="inline-flex h-11 w-11 items-center justify-center rounded-full text-white/80 transition-colors hover:bg-white/10 hover:text-white"
                    aria-label={`NUVORA on ${s.label}`}
                    rel="noopener"
                  >
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                      <path d={s.path} />
                    </svg>
                  </a>
                </li>
              ))}
            </ul>
          </div>

          <nav aria-label="Footer" className="grid grid-cols-2 gap-8 sm:grid-cols-3 lg:col-span-5">
            <FooterColumn title="Explore" items={footerNav.explore} />
            <FooterColumn title="Company" items={footerNav.company} />
            <FooterColumn title="Legal" items={footerNav.legal} />
          </nav>

          <div className="lg:col-span-3">
            <p className="eyebrow text-sky-300">{site.newsletter.name}</p>
            <p className="mt-3 font-serif text-[1.35rem] font-semibold leading-snug">Understand AI. Without the noise.</p>
            <p className="mt-2 text-[0.95rem] text-white/70">{site.newsletter.cadence}. Free. Unsubscribe any time.</p>
            <div className="mt-4">
              <NewsletterForm compact tone="dark" source="footer" />
            </div>
          </div>
        </div>

        <div className="flex flex-col gap-3 border-t border-white/15 py-6 font-sans text-[0.85rem] text-white/60 sm:flex-row sm:items-center sm:justify-between">
          <p>© {year} {site.publisher.legalName} All rights reserved.</p>
          <p>
            NUVORA<span className="mx-2 text-white/30">|</span>AI for Normal People.
          </p>
        </div>
      </div>
    </footer>
  );
}

function FooterColumn({ title, items }: { title: string; items: readonly { label: string; href: string }[] }) {
  return (
    <div>
      <p className="eyebrow text-sky-300">{title}</p>
      <ul className="mt-4 space-y-1">
        {items.map((item) => (
          <li key={item.href}>
            <Link href={item.href} className="inline-flex min-h-[36px] items-center font-sans text-[0.98rem] text-white/85 transition-colors hover:text-white hover:underline">
              {item.label}
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
}
