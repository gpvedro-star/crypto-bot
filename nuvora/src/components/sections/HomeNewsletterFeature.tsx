import Link from "next/link";
import { NewsletterForm } from "@/components/forms/NewsletterForm";
import { site } from "@/content/site";

/**
 * The brief, as a real visual moment on the homepage — not the same ruled
 * module reused site-wide on every article and category page. Full-bleed
 * navy, large serif headline, generous room to breathe. Deliberately not a
 * change to `NewsletterBlock` itself: that component is shared across the
 * article template, category pages and more, which this pass leaves alone.
 */
export function HomeNewsletterFeature({ source = "home" }: { source?: string }) {
  return (
    <section aria-labelledby="newsletter-heading" className="bg-navy-900 text-white">
      <div className="container-x py-16 sm:py-20 lg:py-24">
        <div className="mx-auto max-w-3xl text-center">
          <p className="eyebrow text-sky-300">{site.newsletter.name}</p>
          <h2 id="newsletter-heading" className="headline mt-4 text-[2.3rem] text-white sm:text-[3rem] lg:text-[3.4rem]">
            Understand AI. Without the noise.
          </h2>
          <p className="deck mx-auto mt-5 max-w-[46ch] text-[1.1rem] text-white/75 sm:text-[1.2rem]">
            The most important AI stories, tools and ideas — explained simply. {site.newsletter.cadence}, free, and
            easy to leave.
          </p>

          <div className="mx-auto mt-9 max-w-md">
            <NewsletterForm source={source} tone="dark" buttonLabel="Join NUVORA" />
          </div>

          <p className="mt-4 font-sans text-[0.85rem] leading-relaxed text-white/55">
            We never sell your address. Read our{" "}
            <Link href="/privacy" className="underline decoration-white/30 hover:text-white">
              privacy policy
            </Link>
            .
          </p>
        </div>
      </div>
    </section>
  );
}
