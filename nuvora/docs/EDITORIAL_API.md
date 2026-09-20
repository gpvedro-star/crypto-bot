# NUVORA Editorial API

Ingestion endpoint for the NUVORA AI editorial office. A publishing agent
submits an approved article; NUVORA stores it as a **draft**. Publication is a
separate, explicit call.

```
Approved article → Publisher agent → Editorial API → DRAFT → QA → Publish
```

## Status

| Piece | State |
|---|---|
| Authentication | **Implemented** — bearer token, constant-time compare |
| Contract + validation | **Implemented** — `src/lib/editorial/contract.ts` |
| Routes | **Implemented** — create, read, update, publish |
| Draft-first enforcement | **Implemented** |
| Persistence | **Not provisioned** — no database on this deployment |

With no store configured, every route authenticates and validates as normal,
then answers `501` and echoes the record it *would* have written. Agents can be
built and tested against the final request/response shapes today.

To finish: implement `EditorialStore` and return it from `getEditorialStore()`
in `src/lib/editorial/store.ts`. No route changes are needed.

## Authentication

```
Authorization: Bearer $NUVORA_EDITORIAL_API_KEY
X-NUVORA-Agent: publisher-agent-1        # optional, recorded as the actor
```

`NUVORA_EDITORIAL_API_KEY` is read server-side only. **When it is unset the
write API is disabled entirely** (`503`) — there is no default credential and
no fallback. The key must never appear in client JavaScript or in the repo.

## Endpoints

### `POST /api/v1/editorial/articles` — create a draft

Required: `content_id`, `project`, `category`, `final_headline`, `summary`,
`slug`, `author`, `article_body`.

Optional: `status`, `working_headline`, `key_takeaways`, `sources`,
`verified_facts`, `image_brief`, `image_assets`, `seo_title`, `seo_description`,
`keywords`, `created_at`, `updated_at`, `published_at`.

`project` must be `ai` or `travel`. `slug` must be lowercase hyphenated.
`article_body` is either typed content blocks or raw copy for the desk.

**`publish_status` in the payload is recorded as intent and never applied.**
Creates are always `draft`.

`201` returns the record, including its `id` and the `url` the article will
occupy once published.

### `GET /api/v1/editorial/articles/{id}`

Reads a record back: current `publish_status` and destination `url`.

### `PATCH /api/v1/editorial/articles?id={id}`

Updates a draft. Sending `publish_status` here returns `409` — use the publish
endpoint.

### `POST /api/v1/editorial/articles/{id}/publish`

The only route that moves a record out of draft.

```json
{ "publish_status": "in_review" | "scheduled" | "published" }
```

Defaults to `published`. `draft` is rejected.

## Errors

| Code | Meaning |
|---|---|
| 400 | Malformed JSON |
| 401 | Missing or invalid bearer token |
| 404 | No record with that id |
| 409 | `publish_status` sent to the update route |
| 422 | Validation failed — see `errors[]`, one entry per field |
| 501 | Persistence not provisioned on this deployment |
| 503 | `NUVORA_EDITORIAL_API_KEY` is unset; API disabled |

## Multi-project

`project` is carried on every record and the contract is independent of the
site's own `Article` type, so a travel project can submit through the same
endpoint without the AI publication's content model constraining it. **The
frontend renders the AI publication only** — nothing here builds a travel site.

## Required before go-live

1. `NUVORA_EDITORIAL_API_KEY` set in the Netlify environment.
2. A storage backend, and `getEditorialStore()` returning an implementation.
3. A decision on who may call the publish endpoint — today it shares the
   submission credential. Splitting it into a second scope is the intended
   hardening step and needs no route changes.
