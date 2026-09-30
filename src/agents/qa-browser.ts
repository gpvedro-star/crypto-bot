import { spawn, spawnSync } from "node:child_process";
import fs from "node:fs";
import net from "node:net";
import path from "node:path";
import type { AgentContext } from "../core/agent";
import type { QAIssue, QAReport } from "../core/types";

type Out = { ran: boolean; issues: Omit<QAIssue, "id">[]; checks: QAReport["checks"] };

function findChromium(): string | undefined {
  if (process.env.CHROMIUM_PATH) return process.env.CHROMIUM_PATH;
  const base = process.env.PLAYWRIGHT_BROWSERS_PATH ?? "/opt/pw-browsers";
  const candidates = ["chromium/chrome-linux/chrome", "chromium-1194/chrome-linux/chrome"].map((p) => path.join(base, p));
  return candidates.find((p) => fs.existsSync(p));
}

function freePort(): Promise<number> {
  return new Promise((res, rej) => {
    const s = net.createServer();
    s.listen(0, () => { const p = (s.address() as net.AddressInfo).port; s.close(() => res(p)); });
    s.on("error", rej);
  });
}

async function waitFor(url: string, ms: number) {
  const end = Date.now() + ms;
  while (Date.now() < end) {
    try { const r = await fetch(url); if (r.ok) return; } catch { /* not up yet */ }
    await new Promise((r) => setTimeout(r, 500));
  }
  throw new Error(`Server did not start at ${url}`);
}

/** Builds the generated site, serves it, and inspects it in real Chromium at desktop and phone sizes. */
export async function runBrowserQa(ctx: AgentContext, siteDir: string): Promise<Out> {
  const issues: Out["issues"] = [];
  const checks: QAReport["checks"] = [];
  const skip = (why: string): Out => { ctx.log(`Browser QA skipped: ${why}`, "warn"); return { ran: false, issues: [], checks: [{ name: "Browser QA", passed: false, detail: `skipped: ${why}` }] }; };

  const chromium = findChromium();
  if (!chromium) return skip("no Chromium found (set CHROMIUM_PATH)");
  let pw: typeof import("playwright-core");
  try { pw = await import("playwright-core"); } catch { return skip("playwright-core not installed"); }

  if (!fs.existsSync(path.join(siteDir, "node_modules"))) {
    ctx.log("Installing generated site dependencies…");
    const i = spawnSync("npm", ["install", "--no-audit", "--no-fund", "--loglevel=error"], { cwd: siteDir, encoding: "utf8" });
    if (i.status !== 0) return skip(`npm install failed: ${i.stderr.slice(0, 200)}`);
  }
  ctx.log("Building generated site…");
  const b = spawnSync("npx", ["next", "build"], { cwd: siteDir, encoding: "utf8", env: { ...process.env, NEXT_TELEMETRY_DISABLED: "1" } });
  checks.push({ name: "Production build succeeds", passed: b.status === 0, detail: b.status === 0 ? undefined : (b.stdout + b.stderr).slice(-600) });
  if (b.status !== 0) {
    issues.push({ category: "technical", severity: "critical", message: `next build failed: ${(b.stdout + b.stderr).slice(-400)}`, fix: { agent: "developer", action: "regenerate" } });
    return { ran: true, issues, checks };
  }

  const port = await freePort();
  const server = spawn("npx", ["next", "start", "-p", String(port)], { cwd: siteDir, env: { ...process.env, NEXT_TELEMETRY_DISABLED: "1" }, stdio: "ignore" });
  const url = `http://127.0.0.1:${port}`;
  const shotDir = path.join(ctx.memory.root, "qa");
  fs.mkdirSync(shotDir, { recursive: true });
  try {
    await waitFor(url, 30000);
    const browser = await pw.chromium.launch({ executablePath: chromium, args: ["--no-sandbox"] });
    for (const vp of [{ name: "desktop", width: 1440, height: 900, mobile: false }, { name: "mobile", width: 390, height: 844, mobile: true }]) {
      const context = await browser.newContext({ viewport: { width: vp.width, height: vp.height }, isMobile: vp.mobile, hasTouch: vp.mobile, deviceScaleFactor: 1 });
      const page = await context.newPage();
      const consoleErrors: { text: string; url: string }[] = [], pageErrors: string[] = [], failedReqs: { url: string; reason: string }[] = [], external: string[] = [];
      page.on("console", (m) => { if (m.type() === "error") consoleErrors.push({ text: m.text(), url: m.location().url ?? "" }); });
      page.on("pageerror", (e) => pageErrors.push(e.message));
      page.on("requestfailed", (r) => failedReqs.push({ url: r.url(), reason: r.failure()?.errorText ?? "request failed" }));
      page.on("response", (r) => { if (r.status() >= 400) failedReqs.push({ url: r.url(), reason: `HTTP ${r.status()}` }); });
      page.on("request", (r) => { const u = new URL(r.url()); if (u.origin !== new URL(url).origin && !/fonts\.(googleapis|gstatic)\.com$/.test(u.hostname) && !u.protocol.startsWith("data")) external.push(r.url()); });
      await page.goto(url, { waitUntil: "load" });
      await page.waitForLoadState("networkidle", { timeout: 15000 }).catch(() => { /* long-polling pages: continue */ });
      // Scroll through so lazy images and reveals trigger.
      const total = await page.evaluate(() => document.documentElement.scrollHeight);
      for (let y = 0; y < total; y += vp.height * 0.8) { await page.evaluate((yy) => window.scrollTo({ top: yy, behavior: 'instant' }), y); await page.waitForTimeout(120); }
      await page.evaluate(() => window.scrollTo({ top: 0, behavior: 'instant' }));
      await page.waitForTimeout(400);

      const m = await page.evaluate(() => {
        const vw = window.innerWidth;
        const broken = [...document.images].filter((i) => i.complete && i.naturalWidth === 0 && !i.src.includes("fonts.")).map((i) => i.src);
        const small = [...document.querySelectorAll<HTMLElement>(".btn, .nav-toggle, summary, .index-row button, .gallery-item button, .nav-links a")]
          .filter((el) => el.offsetParent !== null || getComputedStyle(el).position === "fixed")
          .map((el) => ({ el, r: el.getBoundingClientRect() })).filter(({ r }) => r.width > 0 && r.height > 0 && (r.height < 44 || r.width < 44))
          .map(({ el, r }) => `${el.className || el.tagName} ${Math.round(r.width)}x${Math.round(r.height)}`);
        const body = getComputedStyle(document.body).fontSize;
        return { overflow: document.documentElement.scrollWidth - vw, h1: document.querySelectorAll("h1").length, broken, small, body, title: document.title, desc: document.querySelector('meta[name="description"]')?.getAttribute("content") ?? "", lang: document.documentElement.lang };
      });

      checks.push({ name: `[${vp.name}] No external media/network dependencies (fonts excepted)`, passed: external.length === 0, detail: external.slice(0, 2).join(", ") });
      if (external.length) issues.push({ category: "technical", severity: "major", message: `[${vp.name}] Site loads resources from other origins: ${external.slice(0, 2).join(", ")}` });
      // Nothing is filtered away: every failed request, HTTP >= 400, CORS/mixed-content/CSP message and page error is reported.
      const isFont = (u: string) => /^https?:\/\/fonts\.(googleapis|gstatic)\.com\//.test(u);
      const otherFailed = failedReqs.filter((f) => !isFont(f.url));
      const fontFailed = failedReqs.filter((f) => isFont(f.url));
      const failedUrls = new Set(failedReqs.map((f) => f.url));
      const realErrors = [
        ...pageErrors,
        ...consoleErrors.filter((c) => !isFont(c.url) && !(failedUrls.has(c.url) && /Failed to load resource/i.test(c.text))).map((c) => c.text),
      ];
      const security = realErrors.filter((e) => /CORS|Cross-Origin|Mixed Content|Content Security Policy|blocked by|ERR_BLOCKED/i.test(e));
      checks.push({ name: `[${vp.name}] Every request succeeds (Google Fonts reported separately)`, passed: otherFailed.length === 0, detail: otherFailed.slice(0, 3).map((f) => `${f.url} — ${f.reason}`).join(" | ") });
      if (otherFailed.length) issues.push({ category: "technical", severity: "major", message: `[${vp.name}] ${otherFailed.length} request(s) failed: ${otherFailed.slice(0, 3).map((f) => `${f.url} — ${f.reason}`).join(" | ")}`, fix: { agent: "developer", action: "regenerate" } });
      checks.push({ name: `[${vp.name}] Google Fonts load`, passed: fontFailed.length === 0, detail: fontFailed.slice(0, 2).map((f) => `${new URL(f.url).host} — ${f.reason}`).join(" | ") });
      if (fontFailed.length && vp.name === "desktop") issues.push({ category: "design", severity: "minor", message: `Google Fonts could not be loaded in the test browser (${fontFailed.slice(0, 2).map((f) => `${new URL(f.url).host} — ${f.reason}`).join(" | ")}). The site falls back to system fonts, so typography was NOT verified as designed. Allow fonts.googleapis.com and fonts.gstatic.com and re-run.` });
      checks.push({ name: `[${vp.name}] No CORS / mixed-content / CSP errors`, passed: security.length === 0, detail: security.slice(0, 2).join(" | ") });
      if (security.length) issues.push({ category: "technical", severity: "major", message: `[${vp.name}] Security/CORS console errors: ${security.slice(0, 2).join(" | ")}` });
      checks.push({ name: `[${vp.name}] No console/page errors`, passed: realErrors.length === 0, detail: realErrors.slice(0, 2).join(" | ") });
      if (realErrors.length) issues.push({ category: "technical", severity: "major", message: `[${vp.name}] Console errors: ${realErrors.slice(0, 2).join(" | ")}`, fix: { agent: "developer", action: "regenerate" } });
      const ds = ctx.memory.get("design-system");
      if (ds) {
        const want = [ds.typography.fontDisplay, ds.typography.fontBody].map((f) => f.split(",")[0].replace(/["']/g, "").trim());
        const loaded = await page.evaluate(async () => { await document.fonts.ready; return [...document.fonts].filter((f) => f.status === "loaded").map((f) => f.family.replace(/["']/g, "")); });
        const missingFonts = want.filter((w) => !loaded.includes(w));
        checks.push({ name: `[${vp.name}] Design fonts actually loaded in the browser`, passed: missingFonts.length === 0, detail: missingFonts.length ? `not loaded: ${missingFonts.join(", ")}` : want.join(", ") });
      }
      checks.push({ name: `[${vp.name}] No horizontal overflow`, passed: m.overflow <= 1, detail: `${m.overflow}px` });
      if (m.overflow > 1) issues.push({ category: vp.mobile ? "mobile" : "technical", severity: "major", message: `[${vp.name}] Horizontal overflow of ${m.overflow}px.` });
      checks.push({ name: `[${vp.name}] Single H1`, passed: m.h1 === 1, detail: `${m.h1}` });
      checks.push({ name: `[${vp.name}] No broken images`, passed: m.broken.length === 0, detail: m.broken.slice(0, 2).join(", ") });
      if (m.broken.length) issues.push({ category: "technical", severity: "major", message: `[${vp.name}] ${m.broken.length} broken images: ${m.broken.slice(0, 2).join(", ")}`, fix: { agent: "developer", action: "regenerate" } });
      if (vp.mobile) {
        checks.push({ name: "[mobile] Tap targets ≥ 44px", passed: m.small.length === 0, detail: m.small.slice(0, 3).join("; ") });
        if (m.small.length) issues.push({ category: "mobile", severity: "minor", message: `Small tap targets on mobile: ${m.small.slice(0, 3).join("; ")}` });
        checks.push({ name: "[mobile] Body text ≥ 16px", passed: parseFloat(m.body) >= 16, detail: m.body });
      }
      checks.push({ name: `[${vp.name}] <html lang> + title + description`, passed: !!m.lang && !!m.title && m.desc.length > 0 });
      await page.screenshot({ path: path.join(shotDir, `${vp.name}-full.png`), fullPage: true });
      await page.screenshot({ path: path.join(shotDir, `${vp.name}-hero.png`) });
      await context.close();
    }
    await browser.close();
  } catch (e) {
    issues.push({ category: "technical", severity: "major", message: `Browser QA aborted: ${(e as Error).message.slice(0, 200)}` });
  } finally {
    server.kill("SIGTERM");
  }
  return { ran: true, issues, checks };
}
