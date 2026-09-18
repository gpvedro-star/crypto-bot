import { Masthead } from "@/components/layout/Masthead";
import { HeroSection } from "@/components/sections/HeroSection";
import { LatestSection } from "@/components/sections/LatestSection";
import { EverydaySection } from "@/components/sections/EverydaySection";
import { ToolsSection } from "@/components/sections/ToolsSection";
import { MostRead } from "@/components/sections/MostRead";
import { GuidesSection } from "@/components/sections/GuidesSection";
import { NewsletterBlock } from "@/components/sections/NewsletterBlock";
import { AdSlot } from "@/components/ads/AdSlot";
import { getArticlesByCategory, getFeaturedArticles, getLatest, getLeadStory, getMostRead, getTrending, guides, tools } from "@/lib/content";
import { buildMetadata } from "@/lib/seo";
import { site } from "@/content/site";

export const metadata = buildMetadata({
  title: `${site.name} — ${site.tagline}`,
  description: site.description,
  path: "/",
});

export default function HomePage() {
  const lead = getLeadStory();
  const topStories = [...getTrending(6), ...getFeaturedArticles(6)]
    .filter((a, i, arr) => a.slug !== lead.slug && arr.findIndex((b) => b.slug === a.slug) === i)
    .slice(0, 5);
  const usedSlugs = new Set([lead.slug, ...topStories.map((a) => a.slug)]);
  const latest = getLatest(6, [...usedSlugs]);
  const everyday = getArticlesByCategory("everyday-ai");
  const toolStories = getArticlesByCategory("tools");
  const mostRead = getMostRead(5);
  const editorsPick = getFeaturedArticles(8).find((a) => !mostRead.some((m) => m.slug === a.slug) && a.slug !== lead.slug) ?? getFeaturedArticles(2)[1];

  return (
    <>
      <Masthead />
      <HeroSection lead={lead} topStories={topStories} />
      <AdSlot name="home-after-hero" className="container-x mt-12" />
      <div className="mt-20 space-y-20 sm:mt-24 sm:space-y-24">
        <LatestSection articles={latest} />
        <EverydaySection articles={everyday} />
        <ToolsSection tools={tools.filter((t) => t.featured)} articles={toolStories} />
        <AdSlot name="home-mid" className="container-x" />
        <MostRead articles={mostRead} feature={editorsPick} />
        <GuidesSection guides={guides} />
        <NewsletterBlock />
      </div>
    </>
  );
}
