import { cityOf } from "../../../knowledge";
import type { Asset, ComponentName } from "../../../core/types";
import type { EngineInput } from "../types";

type Mem = EngineInput["memory"];
type Img = { src: string; alt: string; width: number; height: number; source?: string; credit?: { name: string; url: string } };

const NAV_LABELS: Record<string, string> = { services: "Services", story: "Transformation", gallery: "Work", process: "Process", faq: "FAQ" };

function toImg(a: Asset | undefined): Img | undefined {
  if (!a || !a.url) return undefined;
  return { src: a.url, alt: a.alt, width: a.width ?? 1600, height: a.height ?? 1000, source: a.source, credit: a.credit };
}

export interface BuiltContent { content: Record<string, unknown>; warnings: string[] }

/** Maps agent outputs onto the component props consumed by the generated site. */
export function buildSiteContent(m: Mem): BuiltContent {
  const { business, copy, media, ux, creative, brand, "design-system": ds } = m;
  const warnings: string[] = [];
  const bySlot = new Map(media.assets.map((a) => [a.slot, a]));
  const img = (slot: string) => toImg(bySlot.get(slot));
  const heroAsset = bySlot.get("hero");
  const videoAsset = media.assets.find((a) => a.type === "video" && a.status === "approved");
  const video = m.video.asset?.status === "approved" ? m.video.asset : videoAsset;
  const contact = business.contact ?? {};
  const cta = { label: m.strategy.primaryCTA.label, href: m.strategy.primaryCTA.target };
  const secondary = { label: m.strategy.secondaryCTA.label, href: m.strategy.secondaryCTA.target };

  const flow = ux.homepageFlow;
  const NAV_IDS = ["services", "story", "gallery", "process", "faq"];
  const nav = flow.filter((s) => NAV_IDS.includes(s.id)).map((s) => ({ label: NAV_LABELS[s.id], href: `#${s.id}` }));
  const shortCta = cta.label.length > 22 ? { ...cta, label: cta.label.split(" ").slice(-2).join(" ") } : cta;

  const credits = new Map<string, { name: string; url: string }>();
  for (const a of media.assets) if (a.credit && a.source === "pexels") credits.set(a.credit.url, a.credit);

  const sections: { id: string; component: ComponentName; tone: string; layout: string; props: Record<string, unknown> }[] = [];
  const push = (s: (typeof flow)[number], props: Record<string, unknown>) => sections.push({ id: s.id, component: s.component, tone: s.tone, layout: s.layout, props });

  for (const s of flow) {
    switch (s.component) {
      case "Navbar":
        push(s, { brand: copy.brandName, logoUrl: brand.logoUrl, links: nav, cta: shortCta });
        break;
      case "Hero":
      case "VideoHero":
        push(s, {
          eyebrow: copy.hero.eyebrow, headline: copy.hero.headline, sub: copy.hero.sub,
          primaryCta: cta, secondaryCta: secondary,
          image: toImg(heroAsset), video: video ? { src: video.url, poster: video.posterUrl } : undefined,
          credit: heroAsset?.credit,
        });
        break;
      case "Marquee":
        push(s, { items: copy.marquee });
        break;
      case "SplitSection":
        push(s, { eyebrow: copy.intro.eyebrow, headline: copy.intro.headline, body: copy.intro.body, image: img("split") });
        break;
      case "Services":
        push(s, { eyebrow: copy.services.eyebrow, headline: copy.services.headline, intro: copy.services.intro, items: copy.services.items });
        break;
      case "ScrollStory": {
        if (!ux.story) { warnings.push("ScrollStory in blueprint but UX plan has no story; section dropped"); break; }
        push(s, {
          eyebrow: copy.story.eyebrow, headline: copy.story.headline, intro: copy.story.intro,
          stages: ux.story.stages.map((st, i) => ({ label: copy.story.stages[i]?.label ?? st.label, caption: copy.story.stages[i]?.caption ?? st.caption, art: st.art, image: img(`story-${i + 1}`) })),
        });
        break;
      }
      case "BeforeAfter": {
        const b = img("before"), a = img("after");
        if (!b || !a) { warnings.push("BeforeAfter has no images; section dropped"); break; }
        push(s, { eyebrow: copy.beforeAfter.eyebrow, headline: copy.beforeAfter.headline, body: copy.beforeAfter.body, before: { ...b, label: copy.beforeAfter.beforeLabel }, after: { ...a, label: copy.beforeAfter.afterLabel } });
        break;
      }
      case "ImageGallery": {
        const items = media.assets.filter((a) => a.usage === "gallery" && a.url).map((a, i) => ({ ...toImg(a)!, caption: copy.gallery.captions[i] ?? "" }));
        if (!items.length) { warnings.push("ImageGallery has no images; section dropped"); break; }
        push(s, { eyebrow: copy.gallery.eyebrow, headline: copy.gallery.headline, intro: copy.gallery.intro, items });
        break;
      }
      case "Process":
        push(s, { eyebrow: copy.process.eyebrow, headline: copy.process.headline, intro: copy.process.intro, steps: copy.process.steps });
        break;
      case "Trust":
        push(s, { eyebrow: copy.trust.eyebrow, headline: copy.trust.headline, intro: copy.trust.intro, checklist: copy.trust.checklist, proofSlots: copy.trust.proofSlots });
        break;
      case "Testimonials":
        push(s, { eyebrow: copy.testimonials.eyebrow, headline: copy.testimonials.headline, slots: copy.testimonials.slots });
        break;
      case "FAQ":
        push(s, { eyebrow: copy.faq.eyebrow, headline: copy.faq.headline, items: copy.faq.items });
        break;
      case "CTA":
        push(s, { headline: copy.cta.headline, body: copy.cta.body, button: cta });
        break;
      case "Contact":
        push(s, { ...copy.contact, contact, image: img("contact") });
        break;
      case "Footer":
        push(s, { brand: copy.brandName, tagline: copy.footer.tagline, links: [...nav, { label: "Contact", href: "#contact" }], contact, credits: [...credits.values()] });
        break;
      default:
        warnings.push(`Component ${s.component} has no data mapping in the Next.js engine; section "${s.id}" dropped`);
    }
  }

  const city = cityOf(business.location);
  const jsonLd: Record<string, unknown> = {
    "@context": "https://schema.org",
    "@type": copy.seo.localBusinessType || "LocalBusiness",
    name: copy.brandName,
    description: copy.seo.description,
    areaServed: business.location,
    address: contact.address ? { "@type": "PostalAddress", streetAddress: contact.address, addressLocality: city } : undefined,
    telephone: contact.phone,
    email: contact.email,
  };
  Object.keys(jsonLd).forEach((k) => jsonLd[k] === undefined && delete jsonLd[k]);

  return {
    warnings,
    content: {
      brand: { name: copy.brandName, logoUrl: brand.logoUrl, isPlaceholder: copy.brandNameIsPlaceholder },
      siteUrl: "https://example.com",
      themeColor: ds.colors["bg-deep"],
      fontsHref: ds.typography.googleFontsHref,
      seo: copy.seo,
      contact,
      nav,
      cta,
      credits: [...credits.values()],
      jsonLd,
      direction: creative.direction,
      sections,
    },
  };
}
