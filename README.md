# DynaTech AI Studio

An autonomous, multi-agent website studio. You give it a business type, location, audience and style; a team of specialised agents researches the industry, plans strategy and UX, sets the creative direction, sources media, writes copy, builds a Next.js website, reviews it critically and revises it (up to 3 automatic rounds) before delivering.

```
Business input → Research → Strategy → Brand → Creative → UX → (Copy ∥ Media ∥ Design System)
              → (Video ∥ Architecture) → Developer → QA → Revision loop (≤3) → Final
```

## Quick start

```bash
npm install
cp .env.example .env.local        # add keys (see below)
npm run preflight                 # checks keys AND network reachability, spends nothing
npm run first-test -- --real      # Miami luxury landscaping brief; refuses to run unless real providers are ready
npm run dev                       # dashboard on http://localhost:3000
```

### Modes

| Mode | Condition | Behaviour |
|---|---|---|
| **REAL** | LLM key **and** `PEXELS_API_KEY` set | Every reasoning agent uses the LLM; media comes from Pexels and is downloaded into the site; no placeholders. |
| **PARTIAL** | only one of them | Runs, clearly labelled. Missing pieces are shown in the dashboard. |
| **DEMO** | neither | Built-in knowledge base + labelled placeholder images. Output is marked `knowledge-base (demo)`; QA can never return PASS. |

**No silent fallback.** If an LLM key exists and a call fails (auth, rate limit, refusal, truncated or invalid output after one repair round), the stage fails with the exact error. Templates are used only when *no* key is configured. With `STUDIO_REQUIRE_REAL=1` (or `--real`) the run refuses to start unless LLM + Pexels are ready, naming exactly which variables are missing.

### API keys (put them in `.env.local` at the repo root)

| Variable | Needed for | Notes |
|---|---|---|
| `ANTHROPIC_API_KEY` | LLM (default provider) | `ANTHROPIC_MODEL` optional, default `claude-opus-5-5` |
| `LLM_PROVIDER=openai`, `OPENAI_API_KEY`, `OPENAI_MODEL` | LLM alternative | no default OpenAI model: set it explicitly |
| `PEXELS_API_KEY` | real photos/videos | required for REAL mode |
| `HIGGSFIELD_API_KEY` + `HIGGSFIELD_API_SECRET` (or `HF_KEY=key:secret`), `HIGGSFIELD_MODEL_PATH` | generated video | optional; approval-gated |

The machine running the Studio must be able to reach `api.anthropic.com` (or `api.openai.com`), `api.pexels.com`, `images.pexels.com`, `videos.pexels.com`, and `api.higgsfield.ai` plus Higgsfield's output CDN. `npm run preflight` tests this.

## Commands

| Command | What it does |
|---|---|
| `npm run preflight` | Provider configuration + network reachability. No spending. |
| `npm run first-test -- --real` | The Miami brief, real providers required, browser QA on |
| `npm run first-test` | Same brief with whatever is configured (demo if nothing) |
| `npm run studio -- --business "..." --location "..." --audience "..." --style "..." [--goal ...] [--name "Real Name"] [--logo file.png] [--mode supervised] [--real]` | Any brief |
| `npm run video -- <project-id> generate\|skip` | Answer the video cost gate. `generate` **spends Higgsfield credits** |
| `npm run regen -- <project-id>` | Rebuild a site from stored project memory |
| `npm run rehearsal` | Full pipeline against **local mock servers** (Anthropic SDK over SSE, Pexels, Higgsfield) incl. `next build` + browser QA. Not a real-provider test. |
| `npm test` | Unit + integration tests (mock servers) |
| `npm run typecheck` · `npm run check:secrets` | Type check · secret scan |
| `npm run dev` / `npm start` | Dashboard |

Generated sites land in `projects/<id>/site/` as standalone Next.js projects: `cd projects/<id>/site && npm install && npm run dev`.

## Media (Pexels)

Search queries are written by the LLM per slot from the creative direction; candidates are pre-filtered (aspect, resolution, rejected terms), then **the model looks at the candidate thumbnails** and picks one or rejects them all (broader `altQueries` are tried next). The chosen asset is downloaded into `site/public/media/` at several widths (`srcset`), verified as a real image, and recorded with photographer, Pexels page URL, licence and the curation reason. Hero videos are downloaded, inspected by Video QA, and stored locally. The published site never depends on a remote URL. If Pexels fails, the exact error is recorded on the slot and shown in the dashboard; nothing is replaced by a placeholder. A missing hero image makes QA return **BLOCKED**.

## Video (Higgsfield) and the cost gate

```
plan (LLM) ─▶ website is built ─▶ [Generate | Skip video]   "Video generation will use external generation credits."
                                        │ Generate
                                        ▼
        job created (returns at once) ─▶ background polling ─▶ download ─▶ Video QA ─▶ replace fallback ─▶ rebuild site + QA
                       failed / NSFW / timeout / bad file ─▶ the site keeps the fallback (stock clip or still) and QA warns
```

Nothing calls Higgsfield until **Generate** is pressed (dashboard) or `npm run video -- <id> generate` is run. Polling survives server restarts. Video QA checks: file downloads, MP4 container, web-compatible codec, duration (3–30 s), resolution (≥1280 px), size (≤`VIDEO_MAX_MB`). `FrameAnalyzer` is the reserved hook for future visual/AI frame analysis.

**Adapter verification.** The adapter (`src/services/higgsfield`) was checked against the official `higgsfield-client` 0.2.0 SDK source: base URL `https://api.higgsfield.ai`, `Authorization: Key <key>:<secret>`, submit → `{request_id, status_url, cancel_url}`, status values `queued | in_progress | completed | failed | nsfw | canceled`, retry set 408/429/5xx. What that SDK does **not** document, and what is therefore configurable and unverified against a live account: the text-to-video model path (`HIGGSFIELD_MODEL_PATH`), that model's argument names (we send `prompt`, `aspect_ratio`, `duration`; extend with `HIGGSFIELD_EXTRA_ARGS`) and where the video URL sits in the completed payload (we check common shapes, then any `.mp4/.mov/.webm` URL).

## QA verdicts

`PASS` (nothing open) · `PASS_WITH_WARNINGS` (shippable; placeholders, a failed video or minor findings remain: placeholders can never PASS) · `BLOCKED` (critical finding or **required hero media missing**). Checks: static rules, real browser (build, console, overflow, broken images, tap targets, no external requests), and an LLM reviewer that reads the copy, structure and hero screenshots and can order a copy rewrite. Up to 3 automatic revisions; unresolved serious issues stop for human approval.

## Architecture

```
assets/dynatech/   brand reference assets (logo)
legacy/crypto-bot/ unrelated standalone Python bot, isolated (see its README)
scripts/           repo tooling (secret scan)
src/
  core/            types, project memory, orchestrator (DAG + revision loop), agent contract, schemas, lint, color
  agents/          research, strategy, brand, creative, ux, copy, media, video, design-system, architect, developer, qa
  knowledge/       industry profiles powering the no-LLM path
  services/
    llm/           LLMProvider  → anthropic | openai | offline
    pexels/        MediaProvider → Pexels | none
    higgsfield/    VideoProvider → Higgsfield | disabled
    website-engines/  WebsiteEngine → nextjs (ready); react, webflow, framer, wordpress, shopify (registered, planned)
  cli/             run, regen
templates/nextjs-site/   the component library + CSS the Next.js engine copies into every generated site
app/                     the dashboard (Next.js App Router) + API routes
tests/
```

**Agents never call vendor APIs.** They receive an `AgentContext` with `llm`, `media`, `video` and `engines` behind interfaces (`LLMProvider`, `MediaProvider`, `VideoProvider`, `WebsiteEngine`).

**LLM-or-knowledge-base pattern.** Each reasoning agent calls `askOrFallback`: if an LLM is configured it is asked for JSON validated against a zod schema; if none is configured *or the output fails validation* the deterministic knowledge-base implementation is used. The stage list in the dashboard shows which brain produced each output.

**Project memory** (`projects/<id>/memory/*.json`): `business, research, strategy, brand, creative, ux, design-system, copy, media-plan, media, video, architecture, code, qa, final`, plus an append-only `decisions.json`. Every LLM prompt includes the decision digest, and `recordDecision` throws if an agent contradicts an earlier decision without an explicit override rationale.

**Orchestrator.** The pipeline is a dependency graph; anything whose dependencies are met runs in parallel (Copy ∥ Media ∥ Design System, then Video ∥ Architect). State is persisted after every step, so a restarted run resumes and skips finished stages.

**Modes.** `autonomous` runs straight through. `supervised` pauses at Strategy, Creative Direction, Homepage Concept and Final; approve or request changes from the dashboard. Free-text change requests are only interpreted when an LLM is configured (the knowledge-base agents can't read them, and say so in the activity log).

**Design system first.** `design-system.json` (colors, typography, spacing, radius, shadows, component tokens, animation, breakpoints) is generated before code, compiled to `app/tokens.css`, and the site CSS/TSX may only reference tokens; QA fails the build on literal colors elsewhere. Every color pairing is contrast-checked against WCAG AA and auto-corrected at generation time.

**QA / Critic.** Static checks (banned AI-sounding phrases, invented business claims, repetitive layout rhythm, literal colors, gradient/glassmorphism count, contrast, alt text, SEO lengths, anchors, structure, reduced-motion) plus optional real-browser checks (production build, console errors, overflow, broken images, tap targets at 390px, screenshots). Issues carry a machine-readable `fix` that the Copy, UX, Media or Developer agent applies. After 3 automatic revisions with serious issues left, the run stops as `needs_human_approval`.

**Truthfulness rules** are enforced in code, not just prompts: no invented testimonials, statistics, licences or awards. Trust and testimonial sections render labelled placeholder slots until real data is supplied, and the Final report lists every placeholder to fill.

## Generated site

Next.js App Router + React + TypeScript. Component library: Navbar, Hero, VideoHero, Marquee, SplitSection, Services (index list), InteractiveCards, ScrollStory (sticky, scroll-driven stages), BeforeAfter (native range slider), ImageGallery (dialog lightbox), Process, Stats, Trust, Testimonials, FAQ (native `<details>`), CTA, Contact (server route `/api/lead` with honeypot, validation, rate-limit, webhook forwarding), Footer, ImageReveal, VideoReveal. Semantic landmarks, skip link, focus rings, 44px targets, `prefers-reduced-motion` support, Metadata API + Open Graph + JSON-LD + robots + sitemap.

To receive inquiries set `LEAD_WEBHOOK_URL` in the generated site's environment. Until then the form reports that it is not connected instead of silently dropping leads.

## Adding things

- **A new LLM/media/video provider:** implement the interface in `src/services/*/types.ts`, return it from the factory in that folder's `index.ts`.
- **A new industry:** add an `IndustryProfile` in `src/knowledge/` and register it in `index.ts`.
- **A new website platform:** implement `WebsiteEngine` and register it in `src/services/website-engines/index.ts`. Agents and memory are platform-independent.

## Known limitations (V1)

- Anthropic, OpenAI, Pexels and Higgsfield are exercised in tests against local mock servers using the real SDK/HTTP code; they have **not** been run with live keys from this repository's CI/sandbox (no keys, and the sandbox egress policy blocks Pexels/Higgsfield/OpenAI).
- Higgsfield: model path, argument names and video-URL location are unverified against a live account (see above).
- Video QA is automated (file, format, codec, duration, resolution, size). Frame-level visual analysis is a reserved hook (`FrameAnalyzer`), not implemented: a human should watch generated clips.
- Brand vision analysis needs a supplied logo and an LLM; without a logo the Brand stage reports "nothing to analyze".
- Browser QA does not measure Core Web Vitals yet.
