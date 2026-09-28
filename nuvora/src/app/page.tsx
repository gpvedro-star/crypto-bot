import Link from "next/link";
import { HeroSection } from "@/components/sections/HeroSection";
import { LatestSection } from "@/components/sections/LatestSection";
import { MostReadBand } from "@/components/sections/MostReadBand";
import { EverydaySection } from "@/components/sections/EverydaySection";
import { ToolsSection } from "@/components/sections/ToolsSection";
import { GuidesSection } from "@/components/sections/GuidesSection";
import { HomeNewsletterFeature } from "@/components/sections/HomeNewsletterFeature";
import { AdSlot } from "@/components/ads/AdSlot";
import { tools } from "@/lib/content";
import {
  getLiveByCategory,
  getLiveFeatured,
  getLiveGuides,
  getLiveLatest,
  getLiveLead,
  getLiveMostRead,
  getLiveTrending,
} from "@/lib/live-content";
import { buildMetadata } from "@/lib/seo";
import { site } from "@/content/site";

export const metadata = buildMetadata({
  title: `${site.name} — ${site.tagline}`,
  description: site.description,
  path: "/",
});

/**
 * The front page.
 *
 * Every section is conditional on having something to show. The demo set was
 * unpublished pending verification, so the page has to read correctly with no
 * stories at all — an empty feed states that plainly rather than rendering
 * section furniture with nothing under it.
 */
export const revalidate = 60;

export default async function HomePage() {
  const lead = await getLiveLead();
  const topStories = lead
    ? [...(await getLiveTrending(6)), ...(await getLiveFeatured(6))]
        .filter((a, i, arr) => a.slug !== lead.slug && arr.findIndex((b) => b.slug === a.slug) === i)
        .slice(0, 3)
    : [];
  const usedSlugs = new Set(lead ? [lead.slug, ...topStories.map((a) => a.slug)] : []);
  const latest = await getLiveLatest(7, [...usedSlugs]);
  const everyday = await getLiveByCategory("everyday-ai");
  const toolStories = await getLiveByCategory("tools");
  const mostRead = await getLiveMostRead(5);
  const featuredTools = tools.filter((t) => t.featured);
  // A guide is only a way in if the piece it points at is published.
  const guides = await getLiveGuides();

  return (
    <>
      {lead ? (
        <HeroSection lead={lead} topStories={topStories} />
      ) : (
        <section aria-labelledby="no-stories" className="border-b border-line bg-white">
          <div className="container-x pb-16 pt-6 sm:pt-8 lg:pb-24">
            <p className="eyebrow border-t-2 border-navy-900 pt-2.5 text-navy-900">The Lead</p>
            <h1 id="no-stories" className="headline mt-6 max-w-[20ch] text-[2.3rem] sm:text-[2.9rem] lg:text-[3.4rem]">
              NUVORA has not published its first story yet.
            </h1>
            <p className="deck mt-5 max-w-[46ch] text-[1.12rem] text-ink-700 sm:text-[1.2rem]">
              Stories appear here as they are published. In the meantime, the tools desk explains the AI products
              people are actually using.
            </p>
            <div className="mt-7 flex flex-wrap items-center gap-x-8 gap-y-3">
              <Link href="/tools" className="eyebrow inline-flex items-center gap-2 text-navy-900 hover:text-navy-700">
                Browse the tools desk <span aria-hidden="true">→</span>
              </Link>
              <Link
                href="/newsletter"
                className="eyebrow inline-flex items-center gap-2 text-navy-900 hover:text-navy-700"
              >
                Get the brief <span aria-hidden="true">→</span>
              </Link>
            </div>
          </div>
        </section>
      )}

      <AdSlot name="home-after-hero" className="container-x mt-12" />

      {latest.length > 0 && (
        <div className="mt-20 sm:mt-28">
          <LatestSection articles={latest} />
        </div>
      )}
      {mostRead.length > 0 && (
        <div className="mt-20 sm:mt-28">
          <MostReadBand articles={mostRead} />
        </div>
      )}
      {everyday.length > 0 && (
        <div className="mt-20 sm:mt-28">
          <EverydaySection articles={everyday} />
        </div>
      )}
      {featuredTools.length > 0 && (
        <div className="mt-20 sm:mt-28">
          <ToolsSection tools={featuredTools} articles={toolStories} standalone={latest.length === 0 && mostRead.length === 0 && everyday.length === 0} />
        </div>
      )}
      <AdSlot name="home-mid" className="container-x mt-20" />
      {guides.length > 0 && (
        <div className="mt-20 sm:mt-28">
          <GuidesSection guides={guides} />
        </div>
      )}
      <div className="mt-20 sm:mt-28">
        <HomeNewsletterFeature />
      </div>
    </>
  );
}
