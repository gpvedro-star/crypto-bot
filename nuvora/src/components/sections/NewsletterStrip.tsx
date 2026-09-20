import { NewsletterForm } from "@/components/forms/NewsletterForm";
import { site } from "@/content/site";

/**
 * The brief panel that used to sit in the Latest rail, relocated as a quiet
 * ruled strip. Kept light so it does not read as a second dark banner under
 * the navy Most read band.
 */
export function NewsletterStrip() {
  return (
    <section aria-labelledby="newsletter-strip-heading" className="border-y border-line bg-white">
      <div className="container-x flex flex-col gap-6 py-10 lg:flex-row lg:items-center lg:justify-between lg:gap-16 lg:py-12">
        <div className="max-w-xl">
          <p className="eyebrow text-navy-700">{site.newsletter.name}</p>
          <h2 id="newsletter-strip-heading" className="headline mt-2 text-[1.55rem] sm:text-[1.85rem]">
            Understand AI. Without the noise.
          </h2>
          <p className="mt-2 text-[0.98rem] text-ink-500">{site.newsletter.cadence}. Free. Unsubscribe any time.</p>
        </div>
        <div className="w-full lg:max-w-[26rem]">
          <NewsletterForm compact source="home-strip" />
        </div>
      </div>
    </section>
  );
}
