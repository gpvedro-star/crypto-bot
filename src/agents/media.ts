import type { Agent } from "../core/agent";
import type { Asset, MediaPlan, MediaResult, MediaSlot } from "../core/types";
import { cityOf, fill, matchIndustry } from "../knowledge";
import { slugWords } from "../services/pexels";

const STOP = new Set(["a", "an", "the", "of", "in", "at", "with", "and", "on", "for", "to"]);
const words = (s: string) => s.toLowerCase().split(/[^a-z]+/).filter((w) => w.length > 2 && !STOP.has(w));

/** Terms that usually signal low-quality or off-brief stock for premium work. */
const REJECT_TERMS = ["cartoon", "illustration", "vector", "clipart", "meme", "text", "logo", "watermark", "collage", "smiling", "selfie"];

export function scoreAsset(asset: Asset, slot: MediaSlot, extraReject: string[] = []): number {
  const hay = words(`${asset.description} ${asset.alt} ${slugWords(asset.url)}`);
  const q = words(slot.query);
  const overlap = q.length ? q.filter((w) => hay.includes(w)).length / q.length : 0;
  const w = asset.width ?? 0, h = asset.height ?? 1;
  const ratio = w / h;
  const aspect = slot.orientation === "landscape" ? (ratio >= 1.4 ? 1 : ratio >= 1.2 ? 0.6 : 0.1)
    : slot.orientation === "portrait" ? (ratio <= 0.85 ? 1 : 0.2)
    : ratio > 0.85 && ratio < 1.2 ? 1 : 0.4;
  const res = w >= slot.minWidth ? 1 : Math.max(0, w / slot.minWidth);
  const rejected = [...REJECT_TERMS, ...extraReject].some((t) => hay.includes(t));
  // Pexels alt text is often missing; don't over-punish empty descriptions.
  const relevance = hay.length === 0 ? 0.4 : overlap;
  return Math.max(0, 0.5 * relevance + 0.25 * aspect + 0.25 * res - (rejected ? 0.5 : 0));
}

export function buildMediaPlan(ctx: { input: { business: string; location: string; style: string; notes?: string }; palette: string; direction: string }): MediaPlan {
  const profile = matchIndustry(`${ctx.input.business} ${ctx.input.notes ?? ""}`);
  const city = cityOf(ctx.input.location);
  const mood = /cinematic|dark|dusk|night/i.test(ctx.input.style) || ctx.direction === "cinematic-dark" ? "golden hour dusk cinematic" : "soft natural daylight";
  const v = { city };
  const mk = (slot: string, usage: MediaSlot["usage"], type: MediaSlot["type"], orientation: MediaSlot["orientation"], minWidth: number, base: string, brief: string, alt: string, addMood = true): MediaSlot => ({
    slot, usage, type, orientation, minWidth, brief, alt,
    query: [fill(base, v), addMood && !/night|dusk|sunset|twilight|evening/.test(base) ? mood.split(" ")[0] + " " + mood.split(" ")[1] : ""].join(" ").trim(),
  });
  const slots: MediaSlot[] = [
    mk("hero", "hero", "image", "landscape", 1920, profile.media.hero, `Opening frame of the site; must carry the ${profile.media.subject} story at ${mood}`, `${profile.media.subject} in ${city}`, false),
  ];
  if (profile.media.video) slots.push(mk("hero-video", "hero-video", "video", "landscape", 1280, profile.media.video, "Slow, ambient background video for the hero. No people talking, no text.", `Ambient ${profile.media.subject} footage`, false));
  profile.media.story.forEach((q, i) => slots.push(mk(`story-${i + 1}`, "story", "image", "landscape", 1600, q, `Story stage ${i + 1}: ${profile.stages[i]?.label ?? ""}`, profile.stages[i]?.label ?? `Story stage ${i + 1}`)));
  profile.media.gallery.forEach((q, i) => slots.push(mk(`gallery-${i + 1}`, "gallery", "image", i % 3 === 1 ? "portrait" : "landscape", 1200, q, `Gallery ${i + 1}: ${profile.galleryCaptions[i] ?? ""}`, profile.galleryCaptions[i] ?? `${profile.media.subject} gallery ${i + 1}`)));
  slots.push(mk("split", "split", "image", "portrait", 1000, profile.media.split, "Supports the approach/intro section", `${profile.media.subject}`));
  if (profile.transformation) {
    slots.push(mk("before", "before", "image", "landscape", 1400, profile.media.beforeAfter[0], "Unfinished / before state", "Before: unfinished property", false));
    slots.push(mk("after", "after", "image", "landscape", 1400, profile.media.beforeAfter[1], "Finished / after state framed similarly to 'before'", "After: finished property", false));
  }
  slots.push(mk("contact", "contact", "image", "landscape", 1400, profile.media.contact, "Quiet closing image behind the contact form", `${profile.media.subject} at dusk`));
  return {
    slots,
    searchSuffix: mood,
    rules: [
      "Query with subject + place + light + mood, never a single generic noun",
      "Prefer landscape ≥1.4:1 for full-bleed slots; portrait for split/gallery accents",
      "Reject illustrations, watermarks, collages, staged smiling people",
      "Never reuse the same photo in two slots",
      "Credit Pexels photographers where displayed",
    ],
  };
}

export const mediaAgent: Agent<MediaResult> = {
  id: "media",
  label: "Media",
  async run(ctx) {
    const creative = ctx.memory.require("creative");
    const plan = buildMediaPlan({ input: ctx.input, palette: creative.palette.name, direction: creative.direction });
    ctx.memory.set("media-plan", plan);
    const log: string[] = [];
    const used = new Set<string>();
    const assets: Asset[] = [];
    const provider = ctx.media;
    const THRESHOLD = 0.4;

    for (const slot of plan.slots) {
      let chosen: Asset | undefined;
      if (provider.available) {
        try {
          const found = slot.type === "video"
            ? await provider.searchVideos(slot.query, { orientation: slot.orientation, minWidth: slot.minWidth })
            : await provider.searchImages(slot.query, { orientation: slot.orientation, minWidth: slot.minWidth });
          const ranked = found.filter((a) => !used.has(a.id)).map((a) => ({ a, s: scoreAsset(a, slot) })).sort((x, y) => y.s - x.s);
          log.push(`${slot.slot}: "${slot.query}" → ${found.length} results, best ${ranked[0]?.s.toFixed(2) ?? "n/a"}`);
          if (ranked[0] && ranked[0].s >= THRESHOLD) {
            chosen = { ...ranked[0].a, usage: slot.usage, slot: slot.slot, alt: slot.alt, score: Math.round(ranked[0].s * 100) / 100, status: "approved" };
            used.add(chosen.id);
          }
        } catch (e) { log.push(`${slot.slot}: search failed (${(e as Error).message.slice(0, 100)})`); }
      }
      if (!chosen) {
        // Video slots without a real match are simply omitted; images get a labelled placeholder (never a fake photo).
        if (slot.type === "video") { log.push(`${slot.slot}: no vetted video; hero falls back to still image`); continue; }
        chosen = {
          id: `placeholder-${slot.slot}`, type: "image", source: "placeholder",
          url: slot.usage === "story" ? "" : `/media/${slot.slot}.svg`,
          width: 1600, height: slot.orientation === "portrait" ? 2000 : 1000,
          usage: slot.usage, slot: slot.slot, description: `Placeholder for: ${slot.brief}`, alt: slot.alt, query: slot.query, status: "placeholder",
        };
      }
      assets.push(chosen);
    }
    const usedPlaceholders = assets.some((a) => a.source === "placeholder");
    ctx.report({ usedLLM: provider.available ? "pexels-search" : "placeholder-fallback", summary: `${assets.filter((a) => a.source === "pexels").length} Pexels assets, ${assets.filter((a) => a.source === "placeholder").length} placeholders` });
    return { assets, provider: provider.name, usedPlaceholders, log };
  },

  async revise(ctx, actions) {
    const media = ctx.memory.require("media");
    if (actions.some((a) => a.action === "fill-alt")) {
      for (const a of media.assets) if (!a.alt?.trim()) a.alt = (a.description || `Image for ${a.slot}`).slice(0, 120);
    }
    ctx.report({ usedLLM: "rule-based-revision", summary: `Applied ${actions.length} media fixes` });
    return media;
  },
};
