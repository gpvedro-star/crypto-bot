import Link from "next/link";
import { NewsletterForm } from "@/components/forms/NewsletterForm";
import { Logo } from "@/components/brand/Logo";
import { site } from "@/content/site";

export function NewsletterBlock({ source = "home" }: { source?: string }) {
  return (
    <section aria-labelledby="newsletter-heading" className="container-x">
      <div className="relative overflow-hidden rounded-card bg-gradient-to-br from-navy-800 via-navy-900 to-navy-950 px-6 py-12 text-white sm:px-10 lg:px-16 lg:py-16">
        <div className="pointer-events-none absolute -right-24 -top-24 h-80 w-80 rounded-full bg-sky-500/25 blur-3xl" aria-hidden="true" />
        <div className="relative grid gap-10 lg:grid-cols-12 lg:items-center lg:gap-16">
          <div className="lg:col-span-7">
            <div className="flex items-center gap-3">
              <Logo variant="mark" height={30} onDark />
              <p className="font-sans text-[0.8rem] font-semibold uppercase tracking-[0.12em] text-sky-300">{site.newsletter.name}</p>
            </div>
            <h2 id="newsletter-heading" className="headline mt-5 text-[2.2rem] text-white sm:text-[2.9rem]">
              Understand AI.
              <br />
              Without the noise.
            </h2>
            <p className="mt-4 max-w-xl text-[1.08rem] leading-relaxed text-white/75">
              The most important AI stories, tools and ideas — explained simply. {site.newsletter.cadence}, free, and easy to leave.
            </p>
          </div>
          <div className="lg:col-span-5">
            <NewsletterForm source={source} tone="dark" />
            <p className="mt-3 font-sans text-[0.82rem] text-white/60">
              We never sell your address. Read our <Link href="/privacy" className="underline hover:text-white">privacy policy</Link>.
            </p>
          </div>
        </div>
      </div>
    </section>
  );
}
