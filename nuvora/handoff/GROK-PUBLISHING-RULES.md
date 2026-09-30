# NUVORA — Grok Publishing Rules (handoff lock)

**Applies to every article in `handoff/*.json` (currently `NUVORA-10-ARTICLE-GROK-HANDOFF.json`).**

> **APPROVED HANDOFF CONTENT = PUBLISH VERBATIM OR BLOCK.**

The handoff file is the editor-approved, source-checked text. It is the only
version that may go live. Grok's job on these articles is to submit it, attach
the images, fact-check it, and either pass it or block it. Grok is not an editor
of this copy.

## Grok MAY

- Submit the handoff object to `nuvora-submit` exactly as written.
- Attach the hero and the inline image (`nuvora-image`, `nuvora-inline-image`).
- Fact-check the article against its listed sources.
- **BLOCK** publication and report why, if the fact check finds a problem.

## Grok MAY NOT

- Rewrite, reword, shorten, expand or reorder any text.
- Add, remove or strengthen any claim, number, date, price, plan or product name.
- Change any of: `final_headline`, `summary`, `article_body`, `key_takeaways`,
  `sources`, `verified_facts`, `seo_title`, `seo_description`, `keywords`, `slug`,
  `category`, `image_brief`, `inline_image_brief`.
- "Improve", "modernize" or "re-research" the article and publish the result.
- Re-submit a modified copy of a handoff article, even with the same `content_id`.

## When the fact check finds a problem

1. **Do not edit the article.**
2. **Do not run `nuvora-factcheck <id> PASS 0`.** Record a non-PASS result instead
   (`BLOCKED` or `PARTIAL`, with the issue count) so the server keeps it a DRAFT.
3. Report to the editor: `content_id`, the exact sentence, the claim, what the
   source actually says, and the source URL.
4. Stop that article. Wait for a corrected handoff file from the editor. Only a
   new handoff commit changes approved text.

## Before submitting each article (required check)

Read the article object from the handoff file and submit **that object**. Before
`nuvora-factcheck ... PASS 0`, read the saved draft back
(`GET /api/v1/editorial/articles/{id}`) and confirm every field listed above is
identical to the handoff object. If any field differs for any reason, do not PASS:
report it and stop.

## After publishing (required check)

Confirm the public page shows the handoff headline, and report the live URL. Do
not "fix" differences by editing the live record. Report them.

## What the editor does

Corrections to approved text come only from a new commit to `handoff/`, made by
the editor. The workflow never edits approved copy on its own.

*Added 2026-09-30 after production copy for B01–B03 was found to differ from the
approved handoff and was restored to it.*
