import fs from "node:fs";
import path from "node:path";
import { askLLM, type Agent, type AgentContext } from "../core/agent";
import { MediaPlanLLMSchema, CurationSchema } from "../core/schemas";
import type { Asset, CreativeDirection, ExperiencePlan, MediaPlan, MediaResult, MediaSlot, StrategyBlueprint } from "../core/types";
import { cityOf, fill, matchIndustry } from "../knowledge";
import { downloadFile, inspectImage } from "../services/media/download";
import { slugWords } from "../services/pexels";
import { inspectVideo } from "./video-qa";

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

/** Slots are derived from what the strategy/UX actually put on the page, so no image is fetched that the site will not use. */
export function buildMediaPlan(ctx: { input: { business: string; location: string; style: string; notes?: string }; strategy: StrategyBlueprint; ux: ExperiencePlan; creative: CreativeDirection }): MediaPlan {
  const { input, strategy, ux, creative } = ctx;
  const profile = matchIndustry(`${input.business} ${input.notes ?? ""}`);
  const city = cityOf(input.location);
  const has = (c: string) => strategy.sections.some((s) => s.component === c);
  const mood = /cinematic|dark|dusk|night/i.test(input.style) || creative.direction === "cinematic-dark" ? "golden hour dusk cinematic" : "soft natural daylight";
  const v = { city };
  const subject = profile.media.subject;
  const mk = (slot: string, usage: MediaSlot["usage"], type: MediaSlot["type"], orientation: MediaSlot["orientation"], minWidth: number, base: string, brief: string, alt: string, addMood = true): MediaSlot => ({
    slot, usage, type, orientation, minWidth, brief, alt,
    query: [fill(base, v), addMood && !/night|dusk|sunset|twilight|evening/.test(base) ? mood.split(" ")[0] + " " + mood.split(" ")[1] : ""].join(" ").trim(),
  });
  const slots: MediaSlot[] = [
    mk("hero", "hero", "image", "landscape", 1920, profile.media.hero, `Opening frame of the site; must carry the ${subject} story at ${mood}`, `${subject} in ${city}`, false),
  ];
  const wantsVideo = ux.decisions.some((d) => d.technique === "cinematic-video" && d.used);
  if (wantsVideo) slots.push(mk("hero-video", "hero-video", "video", "landscape", 1280, profile.media.video || `${subject} ${city} cinematic ambient`, "Slow, ambient background video for the hero. No people talking, no text.", `Ambient ${subject} footage`, false));
  ux.story?.stages.forEach((st, i) => slots.push(mk(`story-${i + 1}`, "story", "image", "landscape", 1600, profile.media.story[i] ?? `${subject} ${st.label}`, `Story stage ${i + 1}: ${st.label}`, st.label)));
  if (has("ImageGallery")) {
    const n = profile.media.gallery.length || 6;
    for (let i = 0; i < n; i++) slots.push(mk(`gallery-${i + 1}`, "gallery", "image", i % 3 === 1 ? "portrait" : "landscape", 1200, profile.media.gallery[i] ?? `${subject} ${city} detail`, `Gallery ${i + 1}: ${profile.galleryCaptions[i] ?? subject}`, profile.galleryCaptions[i] ?? `${subject} gallery ${i + 1}`));
  }
  if (has("SplitSection")) slots.push(mk("split", "split", "image", "portrait", 1000, profile.media.split, "Supports the approach/intro section", subject));
  if (has("BeforeAfter")) {
    slots.push(mk("before", "before", "image", "landscape", 1400, profile.media.beforeAfter[0] || `${subject} before`, "Unfinished / before state", "Before: unfinished property", false));
    slots.push(mk("after", "after", "image", "landscape", 1400, profile.media.beforeAfter[1] || `${subject} after`, "Finished / after state framed similarly to 'before'", "After: finished property", false));
  }
  if (has("Contact")) slots.push(mk("contact", "contact", "image", "landscape", 1400, profile.media.contact, "Quiet closing image behind the contact form", `${subject} at dusk`));
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

function placeholderFor(slot: MediaSlot): Asset {
  return {
    id: `placeholder-${slot.slot}`, type: "image", source: "placeholder",
    url: slot.usage === "story" ? "" : `/media/${slot.slot}.svg`,
    width: 1600, height: slot.orientation === "portrait" ? 2000 : 1000,
    usage: slot.usage, slot: slot.slot, description: `Placeholder for: ${slot.brief}`, alt: slot.alt, query: slot.query, status: "placeholder",
  };
}

const MIN_SCORE = 0.3;

async function fetchThumb(ctx: AgentContext, a: Asset): Promise<{ base64: string; mediaType: "image/jpeg" }> {
  const url = a.type === "video" ? a.posterUrl ?? a.url : ctx.media.renditionUrl(a, 512);
  const tmp = path.join(ctx.memory.root, ".thumbs", `${a.id}.jpg`);
  await downloadFile(url, tmp, { maxBytes: 4 * 1048576, expectTypes: ["image/"], retries: 1, timeoutMs: 30000 });
  const base64 = fs.readFileSync(tmp).toString("base64");
  fs.rmSync(tmp, { force: true });
  return { base64, mediaType: "image/jpeg" };
}

/** Real visual curation: the model looks at the candidate thumbnails and picks the one that fits the creative direction, or none. */
async function curate(ctx: AgentContext, slot: MediaSlot, cands: Asset[], creative: CreativeDirection): Promise<{ asset?: Asset; reason: string; score: number }> {
  const thumbs = await Promise.all(cands.map((c) => fetchThumb(ctx, c)));
  const out = await askLLM(ctx, {
    task: `media-curation:${slot.slot}`,
    system: `You are the Media Agent's art director. Look at the candidate images (in the order listed) and pick the single best one for the slot, or none if none is good enough. Judge composition, lighting, subject fit, absence of watermarks/text/logos/staged smiling people, aspect fit, and consistency with the creative direction. Never pick an image just because it is the only one; return chosen=null if all are weak.`,
    prompt: `Slot: ${slot.slot} (${slot.usage}, ${slot.orientation}). Brief: ${slot.brief}\nCreative direction: ${creative.direction}. Photography style: ${creative.photographyStyle}. Avoid: ${creative.avoid.join("; ")}\nCandidates in order:\n${cands.map((c, i) => `Image ${i + 1}: id=${c.id}; ${c.description}; ${c.width}x${c.height}`).join("\n")}\nReturn {"chosen": "<id or null>", "score": 0..1, "reason": "..."}.`,
    images: thumbs,
    schema: CurationSchema,
    check: (v) => (v.chosen && !cands.some((c) => c.id === v.chosen) ? [`chosen must be one of ${cands.map((c) => c.id).join(", ")} or null`] : []),
    fallback: () => { throw new Error("unreachable: LLM is available"); },
  });
  const asset = cands.find((c) => c.id === out.chosen);
  return { asset, reason: out.reason, score: out.score };
}

const IMAGE_WIDTHS = (slot: MediaSlot) => (slot.usage === "hero" ? [800, 1600, 2400] : [800, 1600]);

async function saveImage(ctx: AgentContext, slot: MediaSlot, chosen: Asset, dir: string): Promise<Asset> {
  const variants: { width: number; url: string }[] = [];
  let bytes = 0;
  for (const w of IMAGE_WIDTHS(slot)) {
    const file = path.join(dir, `${slot.slot}-${w}.jpg`);
    const got = await downloadFile(ctx.media.renditionUrl(chosen, w), file, { expectTypes: ["image/"], maxBytes: 15 * 1048576 });
    const info = inspectImage(file);
    if (!info) { fs.rmSync(file, { force: true }); throw new Error(`downloaded file for ${chosen.id} (${w}px) is not a valid JPEG/PNG image`); }
    variants.push({ width: info.width, url: `/media/${slot.slot}-${w}.jpg` });
    bytes += got.bytes;
  }
  const best = variants[variants.length - 1];
  const last = inspectImage(path.join(dir, `${slot.slot}-${IMAGE_WIDTHS(slot).at(-1)}.jpg`))!;
  return { ...chosen, usage: slot.usage, slot: slot.slot, alt: slot.alt, url: best.url, localPath: `public${best.url}`, variants, width: last.width, height: last.height, bytes, status: "approved" };
}

async function saveVideo(ctx: AgentContext, slot: MediaSlot, chosen: Asset, dir: string): Promise<Asset> {
  const maxBytes = Number(process.env.VIDEO_MAX_MB ?? 25) * 1048576;
  const file = path.join(dir, `${slot.slot}.mp4`);
  const candidates = chosen.variants ?? [{ width: chosen.width ?? 0, url: chosen.url }];
  let lastErr = "no rendition fit the size cap";
  for (const c of candidates) { // best resolution first; the first that downloads within the cap and passes Video QA wins
    try {
      const got = await downloadFile(c.url, file, { maxBytes, expectTypes: ["video/", "application/octet-stream"], timeoutMs: 120000 });
      const qa = await inspectVideo(file, { minSeconds: 3, maxSeconds: 40 });
      if (!qa.passed) { lastErr = `Video QA failed: ${qa.checks.filter((k) => !k.passed).map((k) => `${k.name} (${k.detail})`).join("; ")}`; fs.rmSync(file, { force: true }); continue; }
      let posterUrl: string | undefined;
      if (chosen.posterUrl) {
        const poster = path.join(dir, `${slot.slot}-poster.jpg`);
        try { await downloadFile(chosen.posterUrl, poster, { expectTypes: ["image/"], maxBytes: 10 * 1048576 }); posterUrl = `/media/${slot.slot}-poster.jpg`; } catch { /* poster is optional; the still hero image is used instead */ }
      }
      return { ...chosen, usage: slot.usage, slot: slot.slot, url: `/media/${slot.slot}.mp4`, localPath: `public/media/${slot.slot}.mp4`, posterUrl, width: qa.info.width, height: qa.info.height, bytes: got.bytes, variants: undefined, status: "approved" };
    } catch (e) { lastErr = (e as Error).message; }
  }
  throw new Error(lastErr);
}

export const mediaAgent: Agent<MediaResult> = {
  id: "media",
  label: "Media",
  async run(ctx) {
    const creative = ctx.memory.require("creative");
    const strategy = ctx.memory.require("strategy");
    const ux = ctx.memory.require("ux");
    let plan = buildMediaPlan({ input: ctx.input, strategy, ux, creative });

    // 1) Search plan. With an LLM the queries are written for THIS creative direction; without one the industry defaults are used.
    plan = await askLLM(ctx, {
      task: "media-plan",
      system: `You are the Media Agent. Rewrite the search query for every slot so that stock search returns images matching the creative direction. Bad: "garden". Good: "luxury modern backyard landscaping Miami sunset". Each query: subject + place/setting + light + mood, 4-9 words, no brand names. Provide up to 3 broader altQueries used only if the first finds nothing. Keep every slot id exactly as given; do not add or remove slots. Also write a precise brief and factual alt text (describe what the image should show, no marketing).`,
      prompt: `Business: ${ctx.input.business} in ${ctx.input.location}. Audience: ${ctx.input.targetAudience}.\nCreative direction: ${JSON.stringify({ direction: creative.direction, concept: creative.concept, photographyStyle: creative.photographyStyle, palette: creative.palette.name, avoid: creative.avoid })}\nSlots to rewrite (keep ids): ${JSON.stringify(plan.slots.map((s) => ({ slot: s.slot, usage: s.usage, type: s.type, orientation: s.orientation, brief: s.brief, query: s.query })))}`,
      schema: MediaPlanLLMSchema,
      check: (v) => {
        const want = plan.slots.map((s) => s.slot).sort().join(",");
        const got = v.slots.map((s) => s.slot).sort().join(",");
        const p = want === got ? [] : [`slots must be exactly [${want}], got [${got}]`];
        for (const s of v.slots) if (s.query.trim().split(/\s+/).length < 3) p.push(`query for ${s.slot} is too generic: "${s.query}"`);
        return p;
      },
      fallback: () => ({ slots: plan.slots.map((s) => ({ slot: s.slot, query: s.query, altQueries: [], brief: s.brief, alt: s.alt })), rules: plan.rules }),
    }).then((r) => ({
      ...plan,
      slots: plan.slots.map((s) => { const n = r.slots.find((x) => x.slot === s.slot); return n ? { ...s, query: n.query, altQueries: n.altQueries, brief: n.brief || s.brief, alt: n.alt || s.alt } : s; }),
      rules: r.rules.length ? r.rules : plan.rules,
    }));
    ctx.memory.set("media-plan", plan);

    const log: string[] = [];
    const errors: MediaResult["errors"] = [];

    // 2) Demo mode (no Pexels key): labelled placeholders, clearly reported. Never used when a key exists.
    if (!ctx.media.available) {
      ctx.report({ provider: "placeholders (demo: no PEXELS_API_KEY)", summary: `${plan.slots.filter((s) => s.type === "image").length} placeholder slots` });
      return { assets: plan.slots.filter((s) => s.type === "image").map(placeholderFor), provider: "none", usedPlaceholders: true, errors, log: ["PEXELS_API_KEY not set: demo placeholders"] };
    }

    // 3) Real search → curation → download. Failures are recorded verbatim; nothing is replaced by a placeholder.
    const dir = path.join(ctx.memory.siteDir, "public", "media");
    fs.mkdirSync(dir, { recursive: true });
    const used = new Set<string>();
    const assets: Asset[] = [];
    for (const slot of plan.slots) {
      try {
        let done: Asset | undefined;
        let lastNote = "no candidates";
        for (const q of [slot.query, ...(slot.altQueries ?? [])]) {
          const found = slot.type === "video"
            ? await ctx.media.searchVideos(q, { orientation: slot.orientation, minWidth: slot.minWidth })
            : await ctx.media.searchImages(q, { orientation: slot.orientation, minWidth: slot.minWidth });
          const ranked = found.filter((a) => !used.has(a.id)).map((a) => ({ a, s: scoreAsset(a, { ...slot, query: q }) })).filter((x) => x.s >= MIN_SCORE).sort((x, y) => y.s - x.s).slice(0, 4);
          log.push(`${slot.slot}: "${q}" → ${found.length} results, ${ranked.length} viable (best ${ranked[0]?.s.toFixed(2) ?? "n/a"})`);
          if (!ranked.length) { lastNote = `best of ${found.length} results scored below ${MIN_SCORE}`; continue; }
          let pick = ranked[0].a, reason = `top heuristic score ${ranked[0].s.toFixed(2)}`, score = ranked[0].s;
          if (ctx.llm.available) {
            const c = await curate(ctx, slot, ranked.map((x) => x.a), creative);
            if (!c.asset) { lastNote = `art director rejected all candidates: ${c.reason}`; continue; }
            pick = c.asset; reason = c.reason; score = c.score;
          }
          const saved = slot.type === "video" ? await saveVideo(ctx, slot, pick, dir) : await saveImage(ctx, slot, pick, dir);
          done = { ...saved, query: q, reason, score: Math.round(score * 100) / 100 };
          used.add(pick.id);
          break;
        }
        if (!done) throw new Error(`no acceptable ${slot.type} for "${slot.query}" (${lastNote})`);
        assets.push(done);
        log.push(`${slot.slot}: chose ${done.id} — ${done.reason}`);
      } catch (e) {
        const message = (e as Error).message;
        errors.push({ slot: slot.slot, message });
        assets.push({ id: `failed-${slot.slot}`, type: slot.type, source: "pexels", url: "", usage: slot.usage, slot: slot.slot, description: slot.brief, alt: slot.alt, query: slot.query, status: "failed", error: message });
        ctx.log(`Media slot ${slot.slot} failed: ${message}`, "error");
      }
    }
    const ok = assets.filter((a) => a.status === "approved").length;
    ctx.report({ provider: `pexels${ctx.llm.available ? ` + ${ctx.llm.name} curation` : ""}`, summary: `${ok}/${plan.slots.length} assets downloaded${errors.length ? `, ${errors.length} FAILED: ${errors[0].slot}: ${errors[0].message.slice(0, 90)}` : ""}` });
    return { assets, provider: ctx.media.name, usedPlaceholders: false, errors, log };
  },
  async revise(ctx, actions) {
    const media = ctx.memory.require("media");
    if (actions.some((a) => a.action === "fill-alt")) {
      for (const a of media.assets) if (!a.alt?.trim()) a.alt = (a.description || `Image for ${a.slot}`).slice(0, 120);
    }
    ctx.report({ provider: "rules", summary: `Applied ${actions.length} media fixes` });
    return media;
  },
};
