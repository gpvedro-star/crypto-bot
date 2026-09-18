import Link from "next/link";
import { NewsletterForm } from "@/components/forms/NewsletterForm";
import { Logo } from "@/components/brand/Logo";
import { site } from "@/content/site";

export function NewsletterBlock({ source = "home" }: { source?: string }) {
  return (
    <section aria-labelledby="newsletter-heading" className="container-x">
      <div className="grid gap-10 rounded-card border border-line bg-white px-6 py-12 sm:px-10 lg:grid-cols-12 lg:items-center lg:gap-16 lg:px-16 lg:py-16">
        <div className="lg:col-span-7">
          <div className="flex items-center gap-3 text-navy-900">
            <Logo variant="mark" height={30} />
            <p className="eyebrow">{site.newsletter.name}</p>
          </div>
          <h2 id="newsletter-heading" className="headline mt-4 text-[2rem] sm:text-[2.6rem]">
            Understand AI.
            <br />
            Without the noise.
          </h2>
          <p className="mt-4 max-w-xl text-[1.08rem] leading-relaxed text-ink-700">
            The most important AI stories, tools and ideas — explained simply. {site.newsletter.cadence}, free, and easy to leave.
          </p>
        </div>
        <div className="lg:col-span-5">
          <NewsletterForm source={source} />
          <p className="mt-3 font-sans text-[0.82rem] text-ink-500">
            We never sell your address. Read our <Link href="/privacy" className="underline hover:text-navy-900">privacy policy</Link>.
          </p>
        </div>
      </div>
    </section>
  );
}
