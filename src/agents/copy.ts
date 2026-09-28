import { askLLM, type Agent } from "../core/agent";
import { collectStrings, findBanned, findClaims, mapStrings, scrubBanned } from "../core/lint";
import { CopySchema } from "../core/schemas";
import type { SiteCopy } from "../core/types";
import { cityOf, fill, matchIndustry } from "../knowledge";

const titleCase = (s: string) => s.replace(/\b\w/g, (c) => c.toUpperCase());

export function workingBrandName(business: string, location: string): string {
  const core = business.replace(/\b(company|co\.?|inc\.?|llc|services?)\b/gi, "").replace(/\s+/g, " ").trim();
  return `${cityOf(location)} ${titleCase(core)}`.trim();
}

export const copyAgent: Agent<SiteCopy> = {
  id: "copy",
  label: "Copy",
  async run(ctx) {
    const { input } = ctx;
    const research = ctx.memory.require("research");
    const strategy = ctx.memory.require("strategy");
    const creative = ctx.memory.require("creative");
    const profile = matchIndustry(`${input.business} ${input.notes ?? ""}`);
    const city = cityOf(input.location);
    const brandName = input.businessName ?? workingBrandName(input.business, input.location);
    const vars = { city, audience: input.targetAudience.toLowerCase(), offeringTitle: titleCase(profile.offering === "services" ? input.business : profile.offering) };

    const fallback = (): SiteCopy => {
      const headline = profile.heroHeadlines[0];
      const title = `${brandName} | ${profile.label.split(" & ")[0]} in ${city}`;
      const placeholders: SiteCopy["placeholders"] = [
        ...(input.businessName ? [] : [{ field: "brandName", note: `Working title "${brandName}" is descriptive, not a real business name. Replace it.` }]),
        ...(input.contact?.phone ? [] : [{ field: "contact.phone", note: "Add the real phone number." }]),
        ...(input.contact?.email ? [] : [{ field: "contact.email", note: "Add the real email and set LEAD_WEBHOOK_URL so inquiries are delivered." }]),
        ...(input.contact?.address ? [] : [{ field: "contact.address", note: "Add the business address / service area." }]),
        { field: "trust.proofSlots", note: "Add real licenses, insurance, awards and review ratings." },
        { field: "testimonials", note: "Add real, permissioned client testimonials. None were invented." },
        { field: "media", note: "Replace stock or placeholder imagery with the business's real project photography when available." },
        { field: "legal", note: "Add privacy policy and terms pages." },
      ];
      return {
        brandName,
        brandNameIsPlaceholder: !input.businessName,
        hero: {
          eyebrow: `${input.location} · ${profile.label}`,
          headline,
          sub: fill(profile.heroSub, vars),
          primaryCta: strategy.primaryCTA.label,
          secondaryCta: strategy.secondaryCTA.label,
        },
        intro: { eyebrow: "Our approach", headline: profile.introHeadline, body: profile.introBody.map((b) => fill(b, vars)) },
        services: {
          eyebrow: "What we do",
          headline: profile.transformation ? "Everything the property needs, planned together" : "Services",
          intro: `Each service is designed to work with the others, so ${profile.customer}s deal with one team and one plan.`,
          items: profile.services,
        },
        story: { eyebrow: "The transformation", headline: profile.storyTitle, intro: profile.storyIntro, stages: profile.stages },
        gallery: {
          eyebrow: "Inspiration", headline: "The standard we design toward",
          intro: "Illustrative imagery. Replace with your own project photography as it becomes available.",
          captions: profile.galleryCaptions,
        },
        beforeAfter: { eyebrow: "Before & after", headline: profile.beforeAfter.headline, body: profile.beforeAfter.body, beforeLabel: profile.beforeAfter.before, afterLabel: profile.beforeAfter.after },
        process: { eyebrow: "How it works", headline: profile.process.headline, intro: profile.process.intro, steps: profile.process.steps },
        trust: { eyebrow: "Trust", headline: profile.trust.headline, intro: profile.trust.intro, checklist: profile.trust.checklist, proofSlots: profile.trust.proofSlots },
        testimonials: { eyebrow: "Client voices", headline: "In their words", slots: [
          { hint: "Add a real client quote: name, project type, neighborhood" },
          { hint: "Add a real client quote" },
          { hint: "Add a real client quote" },
        ] },
        faq: { eyebrow: "Questions", headline: "Before you reach out", items: profile.faq },
        cta: {
          headline: profile.transformation ? "Your property, finished properly." : `Start with a conversation about your ${profile.offering}.`,
          body: "Tell us about the project and we'll follow up with next steps.",
          button: strategy.primaryCTA.label,
        },
        contact: {
          eyebrow: "Get in touch",
          headline: profile.primaryCta,
          body: `Share a few details about your ${profile.transformation ? "property and goals" : "needs"}.`,
          fields: [
            { name: "name", label: "Full name", type: "text", required: true },
            { name: "email", label: "Email", type: "email", required: true },
            { name: "phone", label: "Phone (optional)", type: "tel", required: false },
            { name: "projectType", label: profile.formOptions.label, type: "select", required: true, options: profile.formOptions.options },
            { name: "message", label: "Tell us about your project", type: "textarea", required: false },
          ],
          submitLabel: strategy.primaryCTA.label,
          privacyNote: "We only use your details to respond to your inquiry.",
        },
        footer: { tagline: `${profile.label} in ${input.location}.`, note: "" },
        marquee: profile.marquee,
        seo: {
          title: title.length > 60 ? `${brandName} | ${city}`.slice(0, 60) : title,
          description: `${profile.label} for ${input.targetAudience.toLowerCase()} in ${input.location}. ${strategy.primaryCTA.label}.`.slice(0, 158),
          keywords: [profile.label.toLowerCase(), `${profile.offering} ${city}`, `${input.business.toLowerCase()} ${city}`],
          ogTitle: `${brandName}: ${headline}`,
          ogDescription: fill(profile.heroSub, vars),
          localBusinessType: profile.schemaType,
        },
        placeholders,
      };
    };

    const ux = ctx.memory.get("ux");
    const out = await askLLM(ctx, {
      task: "copy",
      check: (v) => {
        const p: string[] = [];
        const inputText = JSON.stringify(input).toLowerCase();
        if (v.hero.headline.trim().split(/\s+/).length > 10) p.push("hero.headline must be at most 10 words");
        if (v.seo.title.length > 60) p.push(`seo.title is ${v.seo.title.length} chars (max 60)`);
        if (v.seo.description.length < 70 || v.seo.description.length > 160) p.push(`seo.description is ${v.seo.description.length} chars (must be 70-160)`);
        const want = ux?.story?.stages.length ?? 0;
        if (v.story.stages.length !== want) p.push(`story.stages must have exactly ${want} items (one per UX story stage), got ${v.story.stages.length}`);
        const strings = collectStrings({ ...v, placeholders: undefined });
        const banned = new Set<string>(), claims = new Set<string>();
        for (const s of strings) {
          findBanned(s.text).forEach((b) => banned.add(b));
          if (findClaims(s.text).length && !inputText.includes(s.text.toLowerCase().slice(0, 20))) findClaims(s.text).forEach((c) => claims.add(`${c} in "${s.text.slice(0, 60)}"`));
        }
        if (banned.size) p.push(`remove generic phrases: ${[...banned].join(", ")}`);
        if (claims.size) p.push(`remove invented business claims (use placeholders instead): ${[...claims].slice(0, 4).join(" | ")}`);
        if (v.testimonials.slots.length && v.testimonials.slots.some((s) => !/add|placeholder|real/i.test(s.hint))) p.push("testimonials.slots must be placeholder hints only (e.g. 'Add a real client quote')");
        return p;
      },
      system: `You are the Copy Agent: native-quality American English, premium positioning, conversion + SEO. Direction: ${creative.direction}. Never invent business facts; use bracketed placeholders and list them in "placeholders". Hero headline max 9 words. SEO title <= 60 chars, description <= 158 chars. Include a testimonials section with placeholder slots only. If the industry has no transformation, story.stages and gallery.captions may be empty arrays and beforeAfter strings short.`,
      prompt: `Write the complete website copy. Business: ${input.business}\nUX story stages (copy must match this count, in order): ${JSON.stringify(ux?.story?.stages.map((x) => x.label) ?? [])}\nBrand name given: ${input.businessName ?? "(none — use a descriptive working title and mark brandNameIsPlaceholder true)"}\nLocation: ${input.location}\nAudience: ${input.targetAudience}\nGoal: ${input.goal ?? "generate leads"}\nResearch: ${JSON.stringify(research)}\nStrategy: ${JSON.stringify(strategy)}`,
      schema: CopySchema,
      fallback,
    });
    ctx.report({ summary: `Hero: "${out.hero.headline}"; ${out.placeholders.length} placeholders to fill` });
    return out;
  },

  async revise(ctx, actions) {
    let copy = ctx.memory.require("copy");
    for (const a of actions) {
      if (a.action === "scrub-banned-phrases") copy = mapStrings(copy, (s, p) => (p.startsWith("placeholders") ? s : scrubBanned(s)));
      if (a.action === "remove-unverified-claims") {
        copy = mapStrings(copy, (s, p) => {
          if (p.startsWith("placeholders") || findClaims(s).length === 0) return s;
          // Drop only the offending sentence(s).
          const kept = s.split(/(?<=[.!?])\s+/).filter((sent) => findClaims(sent).length === 0).join(" ");
          return kept || "[Add a verified statement here]";
        });
      }
    }
    const rewrite = actions.filter((a) => a.action === "rewrite-with-feedback" && a.target);
    if (rewrite.length) {
      if (!ctx.llm.available) ctx.log("Reviewer asked for a copy rewrite but no LLM is configured; skipped", "warn");
      else {
        const feedback = rewrite.map((a, i) => `${i + 1}. ${a.target}`).join("\n");
        const previousPlaceholders = copy.placeholders;
        copy = await copyAgent.run({ ...ctx, feedback });
        if (!copy.placeholders?.length) copy = { ...copy, placeholders: previousPlaceholders };
        ctx.report({ summary: `Rewrote copy to address ${rewrite.length} reviewer note(s)` });
        return copy;
      }
    }
    ctx.report({ provider: "rules", summary: `Applied ${actions.length} copy fixes` });
    return copy;
  },
};
