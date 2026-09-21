# Content verification register

**Internal document. Not rendered on the site.**

Every article currently in `src/content/articles/` was written as demonstration
content during development. None of it has been sourced or fact-checked, and
none of it should be treated as reported journalism.

This register exists so the demo set can be replaced with real output from the
NUVORA editorial workflow, rather than quietly inherited as though it were
verified. **No citations were invented to make these stories look sourced.**

## Risk classes

- **A — current-event claims.** States that specific companies shipped specific
  things at specific times. Highest risk: reads as reporting, is not.
- **B — product behaviour claims.** Describes what a named tool does, costs or
  changed. Ages badly and is checkable by any reader.
- **C — first-person editorial process claims.** Copy that says NUVORA tested,
  tried or used something ("tested by our editors", "our tools desk tries
  dozens of AI products", "we used it instead of Google for a month"). These
  assert work that was never performed.
- **D — explanatory/evergreen.** Generic guidance with little factual surface.
  Lowest risk, still unverified.

## Register

| Article | Class | Note |
|---|---|---|
| `ai-just-changed-again-heres-what-actually-matters` | A | Homepage lead. Describes a week of unnamed announcements. |
| `three-announcements-one-morning-what-to-know` | A | Names OpenAI, Google and Anthropic publishing before 9am Eastern. |
| `chatgpt-has-a-new-feature-heres-why-it-actually-matters` | A, B | Asserts a specific unshipped-as-far-as-we-know feature. |
| `ai-agents-are-coming-heres-what-that-means` | A, D | Forward-looking; lighter factual surface. |
| `the-5-ai-tools-worth-knowing-this-week` | B, C | "Our tools desk tries dozens of AI products so you do not have to." |
| `claude-vs-chatgpt-what-normal-people-need-to-know` | B, C | Comparison; "the assistant our editors reach for", "many of our editors do". |
| `how-to-compare-ai-tools` | D | Method piece. |
| `7-ways-ai-can-save-you-time-this-week` | C | "each tested by our editors in the last month". |
| `how-ai-can-help-you-plan-a-vacation` | C | Framed as an editor's own two-week trip. |
| `how-to-use-chatgpt-to-organize-your-week` | C | "a routine our editors have kept for months". |
| `how-ai-can-help-you-write-better-emails` | D | |
| `what-ai-means-for-your-job-a-calm-guide` | D | |
| `the-quiet-way-ai-is-changing-the-office` | D | Profession-by-profession claims worth a check. |
| `you-dont-need-to-be-a-tech-expert-to-use-ai` | D | |
| `how-to-understand-ai-without-the-jargon` | D | |
| `how-to-use-ai-safely` | D | Safety guidance — verify before it is relied on. |
| `perplexity-review-the-search-engine-that-answers` | B, C | **Unwritten.** Body is scaffolding; claims a month of use. |
| `gemini-in-gmail-review` | B, C | **Unwritten.** "We used it instead of Google for a month." |
| `ai-photo-tools-on-your-phone-review` | B, C | **Unwritten.** "We tested the common features across several phones." |

## Recommended sequence

1. **The three reviews** — done. Set to `status: "draft"` in the launch audit
   (2026-09-21): their bodies were visible scaffolding ("Editorial placeholder…",
   "Verdict placeholder…"). Not deleted; restore by setting `status` back to
   `"published"` once real reviews are written. `/reviews` shows an empty state
   until then.
2. **Class C copy** — done. First-person testing and experience claims were
   rewritten neutrally (2026-09-20/21), and all bylines moved to "NUVORA". The
   underlying facts are still unverified: see Class A/B.
3. **Class A** should be replaced before any launch that invites real readers;
   dated claims about named companies are the ones that get noticed.
4. Class B and D can migrate as the real workflow produces replacements.

## Related

Tool `verdict` and pricing `note` fields still contain desk scaffolding. Those
are **not** shown to readers — `src/lib/editorial.ts` suppresses them at render
rather than substituting invented values. See `docs/EDITORIAL_API.md`.
