import Link from "next/link";
import { NewsletterForm } from "@/components/forms/NewsletterForm";
import { site } from "@/content/site";

/**
 * The brief, as a ruled editorial module rather than a promotional panel.
 *
 * Previously a gradient card with a blurred glow: the glow sat outside the
 * viewport at ~1024px and scrolled the whole page sideways, and the gradient
 * was off-system. Flat and ruled now, and light so it does not run into the
 * navy footer directly below it.
 */
export function NewsletterBlock({ source = "home" }: { source?: string }) {
  return (
    <section aria-labelledby="newsletter-heading" className="container-x">
      <div className="border-t-2 border-navy-900 pt-8">
        <div className="flex flex-col gap-7 lg:flex-row lg:items-end lg:justify-between lg:gap-16">
          <div className="max-w-xl">
            <p className="eyebrow text-navy-700">{site.newsletter.name}</p>
            <h2 id="newsletter-heading" className="headline mt-3 text-[1.75rem] sm:text-[2.1rem]">
              Understand AI. Without the noise.
            </h2>
            <p className="mt-3 text-[1.02rem] leading-relaxed text-ink-700">
              The most important AI stories, tools and ideas — explained simply. {site.newsletter.cadence}, free, and
              easy to leave.
            </p>
          </div>
          <div className="w-full lg:max-w-[26rem]">
            <NewsletterForm source={source} />
            <p className="mt-3 font-sans text-[0.85rem] leading-relaxed text-ink-500">
              We never sell your address. Read our{" "}
              <Link href="/privacy" className="underline decoration-line-strong hover:text-navy-900">
                privacy policy
              </Link>
              .
            </p>
          </div>
        </div>
      </div>
    </section>
  );
}
