# DynaTech AI Studio

An autonomous, multi-agent website studio. You give it a business type, location, audience and style; a team of specialised agents researches the industry, plans strategy and UX, sets the creative direction, sources media, writes copy, builds a Next.js website, reviews it critically and revises it (up to 3 automatic rounds) before delivering.

```
Business input → Research → Strategy → Brand → Creative → UX → (Copy ∥ Media ∥ Design System)
              → (Video ∥ Architecture) → Developer → QA → Revision loop (≤3) → Final
```

## Quick start

```bash
cd dynatech-ai-studio
npm install
cp .env.example .env.local        # optional: add keys (see below)
npm run first-test                # builds the Miami luxury-landscaping site
npm run dev                       # dashboard on http://localhost:3000
```

Everything works with **no API keys**: agents use a built-in industry knowledge base (landscaping, restaurant, legal, dental, generic), and image slots use clearly-labelled placeholders. Add keys to upgrade each capability:

| Key | Enables | Without it |
|---|---|---|
| `ANTHROPIC_API_KEY` (+ optional `ANTHROPIC_MODEL`) | LLM-written research, strategy, creative direction and copy for **any** industry | Knowledge-base agents |
| `OPENAI_API_KEY` + `OPENAI_MODEL` | Same, via OpenAI | Knowledge-base agents |
| `PEXELS_API_KEY` | Intelligent stock photo/video search, scored per slot | Labelled placeholder art |
| `HIGGSFIELD_API_KEY` (+ `HIGGSFIELD_MODEL_PATH`, `HIGGSFIELD_API_SECRET`) | Generated hero video | Prompt is stored; hero uses a still |

Keys are read server-side only and never sent to the browser (`/api/status` returns booleans).

## Commands

| Command | What it does |
|---|---|
| `npm run first-test` | Full pipeline with the Miami luxury landscaping brief |
| `npm run first-test -- --browser-qa` | Also installs + builds the generated site and inspects it in headless Chromium (desktop + mobile, screenshots in `projects/<id>/qa/`) |
| `npm run studio -- --business "..." --location "..." --audience "..." --style "..." [--name "Real Name"] [--logo file.png] [--mode supervised]` | Build any site from the CLI |
| `npm run regen -- <project-id>` | Rebuild a site from stored project memory |
| `npm run dev` / `npm start` | Dashboard |
| `npm test` | Unit + pipeline tests (14) |
| `npm run typecheck` | TypeScript check |

Generated sites land in `projects/<id>/site/` as standalone Next.js projects: `cd projects/<id>/site && npm install && npm run dev`.

> The dashboard has no authentication. Run it locally, or put it behind auth before exposing it: it launches pipeline runs and writes to disk.

## Architecture

```
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

- Higgsfield adapter endpoints/payloads follow platform conventions but are **unverified against live credentials**; they are isolated in `src/services/higgsfield/index.ts`.
- LLM paths (Anthropic/OpenAI) are implemented and schema-validated but were exercised in tests with a fake provider, not live keys.
- Brand analysis extracts colors by pixel analysis; typography/shape analysis needs a vision model (not yet wired).
- Video "review" before approval is automated presence/status only; a human should watch generated clips.
- Browser QA does not measure Core Web Vitals yet.
