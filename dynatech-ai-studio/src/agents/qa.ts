import fs from "node:fs";
import path from "node:path";
import type { Agent, AgentContext } from "../core/agent";
import { contrast } from "../core/color";
import { collectStrings, findBanned, findClaims } from "../core/lint";
import type { QAIssue, QAReport } from "../core/types";
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
  const noAlt = media.assets.filter((a) => a.type === "image" && !a.alt?.trim()).map((a) => a.slot);
  check("Every image has alt text", noAlt.length === 0, noAlt.join(", "));
  if (noAlt.length) issue({ category: "technical", severity: "major", message: `Images missing alt text: ${noAlt.join(", ")}`, fix: { agent: "media", action: "fill-alt" } });
  const ph = media.assets.filter((a) => a.source === "placeholder");
  const stock = media.assets.filter((a) => a.source === "pexels");
  check("Photography is real (not placeholder)", ph.length === 0, `${ph.length} placeholder slots`);
  if (ph.length) {
    const keyed = ctx.media.available;
    issue({
      category: "design", severity: keyed ? "major" : "minor",
      message: keyed
        ? `${ph.length} slots found no acceptable Pexels match and use placeholders; refine queries or supply photography.`
        : `${ph.length} image slots use labelled placeholders because PEXELS_API_KEY is not set. Visual quality cannot be judged as premium until real photography is used.`,
    });
  }
  const dupes = stock.length - new Set(stock.map((a) => a.id)).size;
  check("No duplicated photos across slots", dupes === 0);
  if (dupes) issue({ category: "design", severity: "minor", message: "The same stock photo is used in multiple slots." });
  void strategy; void research;
  return { issues, checks };
}

function toReport(issues: QAIssue[], checks: QAReport["checks"], iteration: number, browserQa: boolean): QAReport {
  const score = Math.max(0, 100 - issues.reduce((n, i) => n + WEIGHT[i.severity], 0));
  return {
    score,
    criticalIssues: issues.filter((i) => i.severity === "critical"),
    designIssues: issues.filter((i) => i.severity !== "critical" && (i.category === "design" || i.category === "ai-quality")),
    uxIssues: issues.filter((i) => i.severity !== "critical" && (i.category === "ux" || i.category === "mobile")),
    technicalIssues: issues.filter((i) => i.severity !== "critical" && (i.category === "technical" || i.category === "content")),
    recommendedChanges: issues.map((i) => `[${i.severity}] ${i.message}`),
    checks, iteration, browserQa,
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
    const report = toReport(issues, checks, ctx.iteration, browser);
    ctx.report({ usedLLM: browser ? "static+browser" : "static-analysis", summary: `Score ${report.score}/100 · ${report.criticalIssues.length} critical · ${issues.length - report.criticalIssues.length} other` });
    return report;
  },
};

export function qaPasses(r: QAReport): boolean {
  return r.criticalIssues.length === 0 && [...r.designIssues, ...r.uxIssues, ...r.technicalIssues].every((i) => i.severity === "minor") && r.score >= 80;
}
