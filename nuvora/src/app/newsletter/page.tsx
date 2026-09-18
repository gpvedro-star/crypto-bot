import type { Metadata } from "next";
import { NewsletterForm } from "@/components/forms/NewsletterForm";
import { Logo } from "@/components/brand/Logo";
import { buildMetadata } from "@/lib/seo";
import { site } from "@/content/site";

export const metadata: Metadata = buildMetadata({
  title: `${site.newsletter.name}: Understand AI Without the Noise`,
  description: "The most important AI stories, tools and ideas — explained simply, twice a week, free.",
  path: "/newsletter",
});

const promises = [
  { title: "Plain English", text: "No jargon, no hype. If we use a technical word, we explain it in the same sentence." },
  { title: "Only what matters", text: "We read everything so you get the three or four things worth knowing, not thirty." },
  { title: "Practical", text: "Every issue includes at least one thing you can try this week." },
  { title: "Easy to leave", text: "One click to unsubscribe, and we never sell your address." },
];

export default function NewsletterPage() {
  return (
    <div className="container-x">
      <section className="mx-auto max-w-3xl pt-14 text-center text-navy-900 sm:pt-20">
        <Logo variant="mark" height={48} />
        <p className="eyebrow mt-6 text-navy-700">{site.newsletter.name} · {site.newsletter.cadence}</p>
        <h1 className="headline mt-3 text-[2.6rem] sm:text-[3.6rem]">Understand AI.<br />Without the noise.</h1>
        <p className="mt-5 text-[1.15rem] leading-relaxed text-ink-700 sm:text-[1.25rem]">The most important AI stories, tools and ideas — explained simply, for people who have better things to do than follow every announcement.</p>
        <div className="mx-auto mt-8 max-w-xl"><NewsletterForm source="newsletter-page" /></div>
        <p className="mt-3 font-sans text-[0.85rem] text-ink-500">Free. {site.newsletter.cadence}. Unsubscribe any time.</p>
      </section>
      <section className="mx-auto mt-20 max-w-5xl" aria-labelledby="promises">
        <h2 id="promises" className="sr-only">What to expect</h2>
        <ul className="grid gap-6 sm:grid-cols-2">
          {promises.map((p) => (
            <li key={p.title} className="rounded-card border border-line bg-white p-6">
              <p className="font-serif text-[1.3rem] font-semibold text-navy-900">{p.title}</p>
              <p className="mt-2 text-[1rem] leading-relaxed text-ink-700">{p.text}</p>
            </li>
          ))}
        </ul>
      </section>
    </div>
  );
}
