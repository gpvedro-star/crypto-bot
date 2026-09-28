import fs from "node:fs";
import path from "node:path";
import { askLLM, type Agent, type AgentContext } from "../core/agent";
import { contrast } from "../core/color";
import { collectStrings, findBanned, findClaims } from "../core/lint";
import type { QAIssue, QAReport, QAVerdict } from "../core/types";
import { QAReviewSchema } from "../core/schemas";
import type { LLMImage } from "../services/llm";
import { runBrowserQa } from "./qa-browser";

const WEIGHT = { critical: 25, major: 10, minor: 3 } as const;

function read(dir: string, rel: string): string {
  try { return fs.readFileSync(path.join(dir, rel), "utf8"); } catch { return ""; }
}
function walk(dir: string, exts: string[], out: string[] = []): string[] {
  if (!fs.existsSync(dir)) return out;
  for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
    if (e.name === "node_modules" || e.name === ".next") continue;
    const p = path.join(dir, e.name);
    if (e.isDirectory()) walk(p, exts, out); else if (exts.some((x) => e.name.endsWith(x))) out.push(p);
  }
  return out;
}

export interface QAInput { ctx: AgentContext; siteDir: string; browser: boolean }

export function staticChecks(ctx: AgentContext, siteDir: string): { issues: QAIssue[]; checks: QAReport["checks"] } {
  const issues: QAIssue[] = [];
  const checks: QAReport["checks"] = [];
  const check = (name: string, passed: boolean, detail?: string) => checks.push({ name, passed, detail });
  const issue = (i: Omit<QAIssue, "id">) => issues.push({ ...i, id: `${i.category}-${issues.length + 1}` });

  const copy = ctx.memory.require("copy");
  const ds = ctx.memory.require("design-system");
  const ux = ctx.memory.require("ux");
  const media = ctx.memory.require("media");
  const strategy = ctx.memory.require("strategy");
  const research = ctx.memory.require("research");
  const site = JSON.parse(read(siteDir, "content/site.json") || "{}") as { sections?: { id: string; component: string; tone: string; layout: string; props: Record<string, unknown> }[]; nav?: { href: string }[] };
  const sections = site.sections ?? [];
  const inputText = JSON.stringify(ctx.input).toLowerCase();

  // ── files ──
  const required = ["app/page.tsx", "app/layout.tsx", "app/tokens.css", "app/globals.css", "app/api/lead/route.ts", "content/site.json", "package.json"];
  const missing = required.filter((f) => !fs.existsSync(path.join(siteDir, f)));
  check("Required project files exist", missing.length === 0, missing.join(", "));
  if (missing.length) issue({ category: "technical", severity: "critical", message: `Missing generated files: ${missing.join(", ")}`, fix: { agent: "developer", action: "regenerate" } });

  // ── copy quality ──
  const strings = collectStrings({ ...copy, placeholders: undefined });
  const banned = new Set<string>(), claims = new Set<string>();
  for (const s of strings) {
    findBanned(s.text).forEach((b) => banned.add(b));
    if (findClaims(s.text).length && !inputText.includes(s.text.toLowerCase().slice(0, 20))) findClaims(s.text).forEach((c) => claims.add(`${c}: "${s.text.slice(0, 70)}"`));
  }
  check("No generic/banned marketing phrases", banned.size === 0, [...banned].join(", "));
  if (banned.size) issue({ category: "ai-quality", severity: "major", message: `Generic AI-sounding phrases in copy: ${[...banned].join(", ")}`, fix: { agent: "copy", action: "scrub-banned-phrases" } });
  check("No invented business claims", claims.size === 0, [...claims].join(" | "));
  if (claims.size) issue({ category: "content", severity: "critical", message: `Unverified business claims in copy (never invent facts): ${[...claims].slice(0, 3).join(" | ")}`, fix: { agent: "copy", action: "remove-unverified-claims" } });

  const heroWords = copy.hero.headline.trim().split(/\s+/).length;
  check("Hero headline is concise (≤ 10 words)", heroWords <= 10, `${heroWords} words`);
  if (heroWords > 10) issue({ category: "design", severity: "minor", message: `Hero headline is ${heroWords} words; strong headlines are short.` });

  // ── SEO ──
  const tl = copy.seo.title.length, dl = copy.seo.description.length;
  check("SEO title ≤ 60 chars", tl > 0 && tl <= 60, `${tl}`);
  check("SEO description 70–160 chars", dl >= 70 && dl <= 160, `${dl}`);
  if (tl === 0 || tl > 60) issue({ category: "technical", severity: "major", message: `SEO title length ${tl} (max 60).`, fix: { agent: "copy", action: "scrub-banned-phrases" } });
  if (dl < 70 || dl > 160) issue({ category: "technical", severity: "minor", message: `SEO description length ${dl} (aim 70–160).` });
  const layoutTs = read(siteDir, "app/layout.tsx");
  check("Open Graph + JSON-LD wired in layout", /openGraph/.test(layoutTs) && /ld\+json/.test(layoutTs));

  // ── structure / UX ──
  const comps = sections.map((s) => s.component);
  const heroCount = comps.filter((c) => c === "Hero" || c === "VideoHero").length;
  check("Exactly one H1 (single Hero)", heroCount === 1, `${heroCount}`);
  if (heroCount !== 1) issue({ category: "technical", severity: "major", message: `Expected one Hero/H1, found ${heroCount}.`, fix: { agent: "developer", action: "regenerate" } });
  const need = ["Navbar", "Hero", "Services", "Process", "Trust", "CTA", "Contact", "Footer"];
  const lacking = need.filter((n) => !comps.includes(n as never) && !(n === "Hero" && comps.includes("VideoHero")));
  check("Core conversion sections present", lacking.length === 0, lacking.join(", "));
  if (lacking.length) issue({ category: "ux", severity: "critical", message: `Missing core sections: ${lacking.join(", ")}`, fix: { agent: "developer", action: "regenerate" } });
  if (ux.story) {
    const ok = comps.includes("ScrollStory") && comps.includes("BeforeAfter");
    check("Transformation storytelling present (story + before/after)", ok);
    if (!ok) issue({ category: "ux", severity: "major", message: "UX plan requires a transformation story but it did not reach the site (images or data missing)." });
  }
  const anchors = new Set(["top", "main", ...sections.map((s) => s.id)]);
  const hrefs = [...read(siteDir, "content/site.json").matchAll(/"href":\s*"#([^"]+)"/g)].map((m) => m[1]);
  const broken = [...new Set(hrefs.filter((h) => !anchors.has(h)))];
  check("All in-page links resolve", broken.length === 0, broken.join(", "));
  if (broken.length) issue({ category: "technical", severity: "major", message: `Broken anchor links: ${broken.join(", ")}`, fix: { agent: "developer", action: "regenerate" } });
  const ctaOk = sections.some((s) => s.component === "Contact") && (site.nav ?? []).length > 0;
  check("Primary CTA reaches a contact form", ctaOk);

  // ── layout repetition ──
  const rep = sections.slice(1).filter((s, i) => s.tone === sections[i].tone && s.layout === sections[i].layout).map((s) => s.id);
  check("No adjacent sections with identical tone + layout", rep.length === 0, rep.join(", "));
  if (rep.length) issue({ category: "design", severity: "major", message: `Repetitive rhythm: adjacent sections share tone and layout (${rep.join(", ")}).`, fix: { agent: "ux", action: "vary-layouts" } });
  const cardCount = comps.filter((c) => c === "InteractiveCards").length;
  check("Not card-heavy", cardCount <= 1, `${cardCount} card sections`);
  if (cardCount > 1) issue({ category: "ai-quality", severity: "minor", message: "Multiple card grids: reads as a generic template." });

  // ── design system enforcement ──
  const cssFiles = walk(siteDir, [".css"]).filter((f) => !f.endsWith("tokens.css"));
  const tsxFiles = walk(path.join(siteDir, "components"), [".tsx"]).concat(walk(path.join(siteDir, "app"), [".tsx"]));
  const literal = /#[0-9a-fA-F]{3,8}\b|\brgba?\(|\bhsla?\(/;
  const offenders = [...cssFiles, ...tsxFiles].filter((f) => literal.test(fs.readFileSync(f, "utf8").replace(/\/\*[\s\S]*?\*\//g, "")));
  check("No literal colors outside design tokens", offenders.length === 0, offenders.map((f) => path.relative(siteDir, f)).join(", "));
  if (offenders.length) issue({ category: "design", severity: "major", message: `Literal color values outside tokens.css: ${offenders.map((f) => path.relative(siteDir, f)).join(", ")}` });

  const css = cssFiles.map((f) => fs.readFileSync(f, "utf8")).join("\n");
  const gradients = (css.match(/gradient\(/g) ?? []).length;
  check("Gradients limited to functional scrims (≤ 3)", gradients <= 3, `${gradients}`);
  if (gradients > 3) issue({ category: "ai-quality", severity: "major", message: `${gradients} gradients found; excessive gradients read as generic AI design.` });
  const glass = /backdrop-filter/.test(css);
  check("No glassmorphism", !glass);
  if (glass) issue({ category: "ai-quality", severity: "minor", message: "backdrop-filter (glassmorphism) detected." });
  check("prefers-reduced-motion respected", /prefers-reduced-motion/.test(css));
  if (!/prefers-reduced-motion/.test(css)) issue({ category: "technical", severity: "critical", message: "No prefers-reduced-motion handling in CSS." });

  // ── contrast (tokens) ──
  const c = ds.colors;
  const pairs: [string, string, string, number][] = [
    ["ink on deep", c["ink-deep"], c["bg-deep"], 7], ["muted on deep", c["muted-deep"], c["bg-deep"], 4.5], ["accent on deep", c["accent-deep"], c["bg-deep"], 4.5],
    ["ink on paper", c["ink-paper"], c["bg-paper"], 7], ["muted on paper", c["muted-paper"], c["bg-paper"], 4.5], ["accent on paper", c["accent-paper"], c["bg-paper"], 4.5],
    ["button text on accent", c["on-accent"], c["accent"], 4.5], ["CTA band text on accent", c["on-accent"], c["accent-deep"], 4.5],
  ];
  const bad = pairs.filter(([, fg, bg, min]) => contrast(fg, bg) < min).map(([n, fg, bg]) => `${n} (${contrast(fg, bg).toFixed(2)}:1)`);
  check("WCAG AA contrast for every token pairing", bad.length === 0, bad.join(", "));
  if (bad.length) issue({ category: "technical", severity: "critical", message: `Contrast failures: ${bad.join(", ")}` });

  // ── media ──
  const noAlt = media.assets.filter((a) => a.type === "image" && a.status !== "failed" && !a.alt?.trim()).map((a) => a.slot);
  check("Every image has alt text", noAlt.length === 0, noAlt.join(", "));
  if (noAlt.length) issue({ category: "technical", severity: "major", message: `Images missing alt text: ${noAlt.join(", ")}`, fix: { agent: "media", action: "fill-alt" } });

  // Required hero media: without a usable hero image the site must not ship.
  const hero = media.assets.find((a) => a.slot === "hero");
  const heroUsable = !!hero && hero.status !== "failed" && !!hero.url;
  check("Required hero media exists", heroUsable, hero?.error ?? (hero ? undefined : "no hero asset"));
  if (!heroUsable) issue({ category: "design", severity: "critical", message: `Required hero media is missing${hero?.error ? `: ${hero.error}` : ""}. The site cannot ship without it.` });

  const failed = media.assets.filter((a) => a.status === "failed" && a.slot !== "hero");
  check("No media slot failed", failed.length === 0, failed.map((a) => `${a.slot}: ${a.error}`).join(" | "));
  for (const a of failed) issue({ category: "design", severity: a.type === "video" ? "minor" : "major", message: `Media slot "${a.slot}" failed: ${a.error}` });
  for (const e of media.errors ?? []) if (!failed.some((a) => a.slot === e.slot) && e.slot === "hero") issue({ category: "technical", severity: "major", message: `Media error on hero: ${e.message}` });

  // Placeholders are never "fully approved": they force at least PASS_WITH_WARNINGS.
  const ph = media.assets.filter((a) => a.source === "placeholder");
  const stock = media.assets.filter((a) => a.source === "pexels" && a.status === "approved");
  check("Photography is real (no placeholders)", ph.length === 0, `${ph.length} placeholder slots`);
  if (ph.length) issue({ category: "design", severity: "minor", message: `${ph.length} image slots use labelled placeholders${ctx.media.available ? "" : " because PEXELS_API_KEY is not set"}. Verdict cannot be PASS until real photography is used.` });

  // The published site must not depend on a temporary remote URL.
  const siteJson = read(siteDir, "content/site.json");
  const remote = [...siteJson.matchAll(/"(?:src|poster)":\s*"(https?:\/\/[^"]+)"/g)].map((m) => m[1]);
  check("Site media are local files (no remote URLs)", remote.length === 0, remote.slice(0, 2).join(", "));
  if (remote.length) issue({ category: "technical", severity: "major", message: `Site references remote media URLs that may expire: ${remote.slice(0, 2).join(", ")}` });
  const missingFiles = media.assets.filter((a) => a.status === "approved" && a.url.startsWith("/media/") && !fs.existsSync(path.join(siteDir, "public", a.url))).map((a) => a.url);
  check("Every referenced media file exists on disk", missingFiles.length === 0, missingFiles.slice(0, 3).join(", "));
  if (missingFiles.length) issue({ category: "technical", severity: "critical", message: `Media files missing from the site: ${missingFiles.slice(0, 3).join(", ")}`, fix: { agent: "developer", action: "regenerate" } });
  const attribution = stock.filter((a) => !a.credit?.name || !a.sourceUrl);
  check("Every Pexels asset has attribution + source URL", attribution.length === 0, attribution.map((a) => a.slot).join(", "));
  if (attribution.length) issue({ category: "content", severity: "major", message: `Assets missing attribution/source info: ${attribution.map((a) => a.slot).join(", ")}` });

  // ── video ──
  const vp = ctx.memory.get("video");
  if (vp) {
    if (vp.phase === "failed") issue({ category: "design", severity: "minor", message: `Video generation failed: ${vp.phaseDetail ?? "unknown error"}. The site uses the ${vp.fallback === "stock-video" ? "stock clip" : "still image"}.` });
    if (vp.phase === "awaiting_approval") issue({ category: "design", severity: "minor", message: "Hero video generation is awaiting your approval; the site currently uses the fallback." });
    if (vp.phase === "unavailable") issue({ category: "design", severity: "minor", message: `Hero video generation is not configured: ${vp.phaseDetail}` });
    if (vp.qa && !vp.qa.passed) issue({ category: "technical", severity: "major", message: `Video QA failed: ${vp.qa.checks.filter((c) => !c.passed).map((c) => c.name).join("; ")}` });
    check("Video lifecycle healthy (no failure)", vp.phase !== "failed", vp.phase);
  }
  const dupes = stock.length - new Set(stock.map((a) => a.id)).size;
  check("No duplicated photos across slots", dupes === 0);
  if (dupes) issue({ category: "design", severity: "minor", message: "The same stock photo is used in multiple slots." });
  void strategy; void research;
  return { issues, checks };
}

export function computeVerdict(issues: QAIssue[], hasPlaceholders: boolean): { verdict: QAVerdict; blockers: string[]; warnings: string[] } {
  const blockers = issues.filter((i) => i.severity === "critical").map((i) => i.message);
  const warnings = issues.filter((i) => i.severity !== "critical").map((i) => `[${i.severity}] ${i.message}`);
  const verdict: QAVerdict = blockers.length ? "BLOCKED" : warnings.length || hasPlaceholders ? "PASS_WITH_WARNINGS" : "PASS";
  return { verdict, blockers, warnings };
}

function toReport(issues: QAIssue[], checks: QAReport["checks"], iteration: number, browserQa: boolean, hasPlaceholders: boolean, review?: QAReport["review"]): QAReport {
  const score = Math.max(0, 100 - issues.reduce((n, i) => n + WEIGHT[i.severity], 0));
  const v = computeVerdict(issues, hasPlaceholders);
  return {
    verdict: v.verdict, blockers: v.blockers, warnings: v.warnings,
    score,
    criticalIssues: issues.filter((i) => i.severity === "critical"),
    designIssues: issues.filter((i) => i.severity !== "critical" && (i.category === "design" || i.category === "ai-quality")),
    uxIssues: issues.filter((i) => i.severity !== "critical" && (i.category === "ux" || i.category === "mobile")),
    technicalIssues: issues.filter((i) => i.severity !== "critical" && (i.category === "technical" || i.category === "content")),
    recommendedChanges: issues.map((i) => `[${i.severity}] ${i.message}`),
    checks, iteration, browserQa, review,
  };
}

/** LLM reviewer: reads the actual copy, the section structure, the failing checks and (if browser QA ran) the hero screenshots. */
async function llmReview(ctx: AgentContext, issues: QAIssue[], checks: QAReport["checks"]): Promise<{ issues: QAIssue[]; review?: QAReport["review"] }> {
  if (!ctx.llm.available) return { issues: [] };
  const copy = ctx.memory.require("copy");
  const creative = ctx.memory.require("creative");
  const ux = ctx.memory.require("ux");
  const media = ctx.memory.require("media");
  const shots: LLMImage[] = [];
  for (const f of ["desktop-hero.png", "mobile-hero.png"]) {
    const file = path.join(ctx.memory.root, "qa", f);
    if (fs.existsSync(file) && fs.statSync(file).size < 3_500_000) shots.push({ base64: fs.readFileSync(file).toString("base64"), mediaType: "image/png" });
  }
  const out = await askLLM(ctx, {
    task: "qa-review",
    system: `You are the QA / Critic Agent for a premium website. Review critically like a creative director: does it look premium and intentional? Is the copy specific (not generic AI copy, no invented claims)? Is the CTA obvious? Is hierarchy strong? Are sections repetitive? Are animations purposeful? Images (if attached) are the desktop then mobile hero screenshots. Report only real, specific problems (do not repeat automated findings already listed). Use severity "critical" ONLY for something that must block launch. If rewriting the copy would fix a problem, put the instruction in copyFix; otherwise null.`,
    prompt: `Business: ${ctx.input.business} in ${ctx.input.location}; audience ${ctx.input.targetAudience}; goal ${ctx.input.goal ?? "leads"}.\nCreative direction: ${creative.direction} — ${creative.concept}\nSections: ${ux.homepageFlow.map((s) => `${s.id}(${s.component}/${s.tone}/${s.layout})`).join(" → ")}\nCopy: ${JSON.stringify({ hero: copy.hero, intro: copy.intro, services: copy.services.items.map((i) => i.title), cta: copy.cta, seo: copy.seo })}\nMedia: ${media.assets.length} slots; sources: ${[...new Set(media.assets.map((a) => a.source))].join(", ")}\nAutomated findings (do not repeat): ${JSON.stringify(issues.map((i) => i.message))}\nFailed automated checks: ${JSON.stringify(checks.filter((c) => !c.passed).map((c) => c.name))}`,
    images: shots,
    schema: QAReviewSchema,
    fallback: () => ({ issues: [], summary: "" }),
  });
  return {
    issues: out.issues.map((i, n) => ({
      id: `llm-${n + 1}`, category: i.category, severity: i.severity, message: `(reviewer) ${i.message}`,
      ...(i.copyFix ? { fix: { agent: "copy" as const, action: "rewrite-with-feedback", target: i.copyFix } } : {}),
    })),
    review: { provider: ctx.llm.name, model: ctx.lastModel ?? ctx.llm.model, summary: out.summary },
  };
}

export const qaAgent: Agent<QAReport> = {
  id: "qa",
  label: "QA / Critic",
  async run(ctx) {
    const siteDir = ctx.memory.siteDir;
    const { issues, checks } = staticChecks(ctx, siteDir);
    let browser = false;
    if (process.env.STUDIO_BROWSER_QA === "1") {
      const r = await runBrowserQa(ctx, siteDir);
      browser = r.ran;
      issues.push(...r.issues.map((i, n) => ({ ...i, id: `browser-${n + 1}` })));
      checks.push(...r.checks);
    }
    const reviewed = await llmReview(ctx, issues, checks);
    issues.push(...reviewed.issues);
    const media = ctx.memory.require("media");
    const report = toReport(issues, checks, ctx.iteration, browser, media.assets.some((a) => a.source === "placeholder"), reviewed.review);
    const how = [browser ? "static+browser" : "static", reviewed.review ? "LLM review" : ""].filter(Boolean).join(" + ");
    ctx.report({
      provider: reviewed.review ? reviewed.review.provider : `rules (${browser ? "static+browser" : "static"})`,
      ...(reviewed.review ? { model: reviewed.review.model } : {}),
      summary: `${report.verdict} · score ${report.score}/100 · ${how} · ${report.blockers.length} blockers, ${report.warnings.length} warnings`,
    });
    return report;
  },
};
