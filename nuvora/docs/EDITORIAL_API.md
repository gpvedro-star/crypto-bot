# NUVORA Editorial API

Ingestion endpoint for the NUVORA editorial office (Grok bot publisher). An
agent submits an approved article; NUVORA stores it as a **draft**. Publication
is a separate, explicit call.

```
Approved article → Publisher agent → Editorial API → DRAFT → QA → Publish
```

## Status

| Piece | State |
|---|---|
| Authentication | Implemented — bearer token, constant-time compare |
| Contract + validation | Implemented — `src/lib/editorial/contract.ts` |
| Routes | Implemented — create/update, read, patch, publish |
| Persistence | Implemented — Netlify Blobs |
| Draft-first enforcement | Implemented |
| Idempotency on `content_id` | Implemented |
| Automatic live publishing | **Deliberately not implemented** |

## Storage

Netlify Blobs, via platform context. No site ID or token is in the repository.

| Context | Store | Lifetime |
|---|---|---|
| `production` | `nuvora-editorial` (site-wide, strong consistency) | Survives deploys |
| deploy preview / branch | `nuvora-editorial-preview` (per-deploy) | Scoped to that deploy |

Preview submissions therefore cannot read or overwrite production editorial
data. Outside Netlify (`next dev`) there is no Blobs context, so the API falls
back to a filesystem store under `.netlify/editorial-dev/` purely so the
endpoints can be exercised locally. That branch is never reached on Netlify.

Keys:

- `record/<content_id>` — the stored record
- `slug/<slug>` — the `content_id` that owns that slug

## Authentication

```
Authorization: Bearer $NUVORA_EDITORIAL_API_KEY
X-NUVORA-Agent: grok-bot            # optional, recorded as the actor
```

Server-side only. **When the key is unset the API is disabled entirely (503)** —
there is no default credential and no fallback. The key is never exposed to the
browser, never returned in a response, and never logged.

### Credentials

| Credential | Who holds it | Can do |
|---|---|---|
| `NUVORA_EDITORIAL_API_KEY` | Owner / desk | Everything below |
| `NUVORA_GROK_DRAFT_KEY` | Website Publisher (Grok) | `POST /articles` (create, or re-submit the same `content_id` while it is still DRAFT) and `GET /articles/{id}` for drafts |
| `NUVORA_FACTCHECK_KEY` | Fact Check Agent | `POST /articles/{id}/fact-check` on a DRAFT — the five fact-check fields only |

Neither restricted key can publish, delete, PATCH, or reach media, schedule or
analytics (403). The draft key cannot set fact-check fields: they are stripped
from its submissions, and because a submission replaces the record, any
re-submission clears an earlier fact check. Routes are admin-only unless they
opt in. All three values must differ; if any two match, the API refuses to run.

### Automatic publication

There is no publish command for either bot. When the fact-check key records
`fact_check_status: "PASS"`, the server runs a deterministic gate
(`src/lib/editorial/publish-gates.ts`) and publishes only if every check holds:

- the record is DRAFT and was submitted with the draft key (drafts written or
  edited with the admin key are never auto-published);
- `project` is AI and `content_id` is valid;
- `final_headline`, `summary`, `article_body` (renderable), `category` (a known
  section), `slug`, `seo_title`, `seo_description` and at least one usable
  source (title plus http(s) URL) are present;
- the slug is valid, owned by this record, and not a repository article;
- nothing is marked BLOCKED or needs human review;
- `fact_check_status` is PASS, `fact_check_issues_count` is exactly 0, and no
  verified fact is CONFLICTING or OUTDATED;
- a hero image this server attached is present (see below).

A failed gate leaves the record DRAFT and returns
`auto_publish: { published: false, reason, detail }` with one of:
`NOT_DRAFT`, `NOT_AUTOMATION_SUBMISSION`, `INVALID_PROJECT`,
`INVALID_CONTENT_ID`, `MISSING_REQUIRED_FIELD`, `UNRENDERABLE_BODY`,
`INVALID_CATEGORY`, `INVALID_SLUG`, `DUPLICATE_SLUG`, `NO_SOURCES`,
`ARTICLE_BLOCKED`, `FACT_CHECK_MISSING`, `FACT_CHECK_NOT_PASSED`,
`UNRESOLVED_FACT_CHECK_ISSUES`, `NEEDS_HUMAN_REVIEW`, `HERO_IMAGE_MISSING`. A
result other than PASS is recorded but never triggers publication. A second
PASS on a published record returns 409 `NOT_DRAFT` and changes nothing.

Once published, a record is out of reach of both bot keys: corrections go
through the admin key.

### Hero image

`POST /api/v1/editorial/articles/{content_id}/generate-image` — draft or
admin key. Finds and attaches the article's one hero image from Pexels. The
request body is ignored: the server builds a single search query from the
stored draft — `image_brief` first, then `final_headline`, then `summary`
(category only as a last resort, since a section name is not a picture) —
keeping at most eight meaningful words and dropping "AI"-type terms that pull
stock results towards robots. Nothing in the request is ever used as a query.

One search (`orientation=landscape`, `size=large`, 30 results) and one
download, no retry. The photo chosen is the first, in Pexels' own relevance
order, that is at least 1920px wide, sits between 1.3:1 and 2.1:1, has a
photographer to credit, and whose Pexels description doesn't mention robots,
neon, holograms, screens, logos and similar. The same input always selects
the same photo (`src/lib/editorial/pexels-select.ts`).

The 1920px rendition is downloaded server-side and stored in Netlify Blobs,
served back at `/media/articles/{content_id}` — same-origin, so readers never
load anything from Pexels and no `NUVORA_IMAGE_HOSTS` entry is needed. The
draft's `image_assets[0]` gets the URL, Pexels' own alt text, the caption
"Illustrative photo.", the credit "Photo by {photographer} on Pexels", the
photographer, their profile link, the Pexels photo page, and the width and
height. A second call replaces the previous server-attached hero; any image
an editor attached by hand is left alone. `hero_image_attached` is then
`true` — set only here, stripped from every submission payload, and what the
publication gate checks.

| Status | `reason` | Draft |
|---|---|---|
| 200 | — (`success: true`) | hero attached |
| 422 | `HERO_IMAGE_MISSING` — no photo met the rules | unchanged |
| 502 | `IMAGE_LOOKUP_FAILED` — search or download failed | unchanged |
| 503 | `PEXELS_NOT_CONFIGURED` — no `PEXELS_API_KEY`, nothing attempted | unchanged |
| 409 | `NOT_DRAFT` | unchanged |

`PEXELS_API_KEY` is server-side only and never appears in a response or log.
`scripts/grok/nuvora-image <content_id>` is the Grok-side wrapper: one call,
four lines of output, key passed via a private header file rather than argv.

## Endpoints

### `POST /api/v1/editorial/articles` — create or update a draft

**Required:** `content_id`, `project`, `category`, `final_headline`, `summary`,
`article_body`.

**Optional:** `status`, `priority`, `topic`, `working_headline`, `slug`,
`key_takeaways`, `sources`, `verified_facts`, `image_brief`, `image_assets`,
`social_content`, `seo_title`, `seo_description`, `keywords`, `author`, `notes`,
`created_at`, `updated_at`, `published_at`.

Notes:

- `project` accepts `AI` (case-insensitive). `travel` exists in the model for a
  future publication but is refused today.
- `slug` is derived from `final_headline` when omitted.
- `author` defaults to `NUVORA`; the site has no per-person author records.
- `article_body` is typed content blocks or raw copy for the desk.
- Executable markup (`<script>`, `javascript:`, `on*=` handlers, …) is refused
  anywhere in the payload.
- Payloads above 512 KB are refused.

**Idempotent on `content_id`.** Re-submitting the same id updates that draft:
`201` on first write, `200` afterwards, with `created` in the body saying which.
`created_at` is preserved and the record's current `publish_status` is kept, so
a re-submission cannot reset an approved record back to draft.

**`publish_status` in the payload is never applied.** If it asks for anything
other than `DRAFT`, the response carries a `note` saying it was declined.

### `GET /api/v1/editorial/articles/{content_id}`

Returns the draft's status and URLs. `?full=1` adds the stored record.

### `PATCH /api/v1/editorial/articles?id={content_id}`

Partial update. Sending `publish_status` returns `409` — use the publish route.

### `POST /api/v1/editorial/articles/{content_id}/publish`

The only route that moves a record out of draft.

```json
{ "publish_status": "IN_REVIEW" | "SCHEDULED" | "PUBLISHED" }
```

Defaults to `PUBLISHED`. `DRAFT` is refused.

> This route changes the **record's** status. It does not yet render the
> article on the public site — the site still builds from `src/content/`.
> Wiring approved records into the published site is the next piece of work.

## Response

```json
{
  "success": true,
  "created": false,
  "content_id": "NUVORA-2026-0001",
  "draft_id": "NUVORA-2026-0001",
  "status": "READY_FOR_APPROVAL",
  "publish_status": "DRAFT",
  "slug": "example-slug",
  "draft_url": "https://…/api/v1/editorial/articles/NUVORA-2026-0001",
  "published_url": "https://…/articles/example-slug",
  "created_at": "2026-09-24T07:05:53.380Z",
  "updated_at": "2026-09-24T07:05:56.555Z"
}
```

`draft_url` is this API's record endpoint — the draft is not on the site, so a
public article URL would be misleading. `published_url` is where the piece will
live once published.

## Errors

| Code | Meaning |
|---|---|
| 400 | Malformed JSON, failed validation (`errors[]`, one entry per field), or executable markup |
| 401 | Missing or invalid bearer token |
| 404 | No record with that id |
| 409 | Slug owned by a different `content_id`, or `publish_status` sent to PATCH |
| 413 | Payload over 512 KB |
| 500 | Storage write/read failed |
| 503 | `NUVORA_EDITORIAL_API_KEY` unset, or storage unavailable |

## Environment

| Variable | Scope | Purpose |
|---|---|---|
| `NUVORA_EDITORIAL_API_KEY` | server-side | Bearer token. Unset ⇒ API disabled |
| `NEXT_PUBLIC_SITE_URL` | build | Origin used in `draft_url` / `published_url` |

Netlify supplies Blobs credentials and `CONTEXT` automatically.

## From record to website

A record reaches readers only through `POST /{content_id}/publish`. Once its
`publish_status` is `PUBLISHED`:

- `/articles/{slug}` renders it through the same article template the
  repository's own articles use. There is no second template.
- It appears on the front page, in `/latest`, in its section, in search, in
  `sitemap.xml`, in `feed.xml` and in the public read API.
- None of that needs a rebuild. Pages revalidate every 60 seconds, and the
  publish call additionally clears the cached renders straight away, so a
  publication is normally visible within a second or two.
- Setting the status back to `DRAFT`, `IN_REVIEW` or `SCHEDULED`, or deleting
  the record, removes it from every one of those surfaces just as quickly.

Anything below `PUBLISHED` is invisible to the public site: drafts are filtered
out in `lib/live-content.ts`, which is the only path from the store to a page.

### Rendering rules

`article_body` is converted to the site's typed content blocks by
`lib/editorial/body.ts`. It is a whitelist, and the site never renders
submitted HTML:

- Text is stripped of tags; markdown emphasis and `[text](url)` links are
  flattened to their visible text. Nothing is passed to
  `dangerouslySetInnerHTML`.
- Unrecognised block types degrade to paragraphs. `toolRecommendation` is
  deliberately not accepted — a tool recommendation is an editorial judgement,
  not something a submission can assert.
- A plain-string `article_body` is parsed as markdown-lite: `##` headings,
  `-`/`1.` lists, `>` quotes, `---` rules, blank-line paragraphs.
- Image URLs must be same-origin paths or https URLs on `NUVORA_IMAGE_HOSTS`.
  Anything else is dropped and the story falls back to placeholder art.
- `sources` are rendered as a reference list; http(s) only.
- The byline is always the publication. A submission's `author` field is kept
  in the record but never presented as a person.
- `featured`, `trending` and `popular` are never set from a submission, so a
  record cannot put itself in "Most read" — the site has no readership data.

### Draft preview

`GET /preview/articles/{content_id}?token=…` renders any record, at any status,
through the same template, for review. `NUVORA_PREVIEW_TOKEN` gates it; without
a valid token the route 404s rather than 401s, so it cannot be used to discover
which records exist. It is `noindex, nofollow`, disallowed in `robots.txt`, and
never in the sitemap, RSS or search index.

`GET /preview/enter?token=…&id=…` exchanges the token for an HttpOnly cookie
and redirects, which keeps the credential out of the address bar.

### `DELETE /api/v1/editorial/articles/{content_id}`

Removes a record and releases its slug. Deleting a published record takes it
off the site immediately.

## Multi-project

`project` is carried on every record and the contract is independent of the
site's `Article` type, so a second publication can submit through the same
endpoint without reshaping this one. Enable it by adding to `ENABLED_PROJECTS`
in `contract.ts`. **The frontend renders the AI publication only.**
