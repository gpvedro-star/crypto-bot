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

## Multi-project

`project` is carried on every record and the contract is independent of the
site's `Article` type, so a second publication can submit through the same
endpoint without reshaping this one. Enable it by adding to `ENABLED_PROJECTS`
in `contract.ts`. **The frontend renders the AI publication only.**
