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
| `NUVORA_GROK_DRAFT_KEY` | The Grok bot | `POST /articles` (create, or re-submit the same `content_id` while it is still DRAFT) and `GET /articles/{id}` for drafts |

The draft key gets **403** from publish, delete, PATCH, media, schedule and
analytics, and from any record that is no longer DRAFT. A `publish_status` in
its payload is ignored — records it creates are always DRAFT. Routes are
admin-only unless they opt in, so new routes stay closed to the draft key by
default. The two values must differ; if they match, the API refuses to run.

`npm run test:editorial-auth` exercises all of this against a running server.

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
