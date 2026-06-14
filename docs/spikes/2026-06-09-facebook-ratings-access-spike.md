# Spike: Facebook Reviews — Meta Graph API proof-of-access

**Date:** 2026-06-09
**Status:** Plumbing verified against the live API · **live data run PENDING a real Page token**
**Goal:** Confirm the Meta Graph API can return Facebook Page recommendations
(`GET /{page-id}/ratings`) for a real managed Page before building product UI.

> Scope guardrails honored: no schema changes, no production UI, no secrets
> committed. The only production-safe artifact proposed for commit is the
> generic Graph client (`src/lib/meta-graph.ts`) plus `.env.example`
> documentation. The dev-only spike route is intentionally left uncommitted.

---

## Artifacts

| File | Purpose | Commit? |
|------|---------|---------|
| `src/lib/meta-graph.ts` | Generic, production-safe Graph client (Bearer transport, version handling, typed error). No secrets, no endpoint logic. | **Yes** |
| `.env.example` (additions) | Documents `META_APP_ID`, `META_APP_SECRET`, `META_GRAPH_API_VERSION`, and local-only `META_TEST_PAGE_ID` / `META_TEST_PAGE_TOKEN`. Empty placeholders only. | **Yes** |
| `src/app/api/dev/meta-ratings-spike/route.ts` | Dev-only spike route. 404 in production; token read only from env; all reviewer PII + token redacted. | **No (spike)** |
| This findings note | Verification record. | Optional |

---

## Required environment variables

```
META_APP_ID=""              # Meta app id
META_APP_SECRET=""          # Meta app secret
META_GRAPH_API_VERSION="v23.0"  # client targets this; falls back to v23.0 if unset/invalid
META_TEST_PAGE_ID=""        # LOCAL verification only
META_TEST_PAGE_TOKEN=""     # LOCAL verification only — short-lived Page token, never commit
```

`META_TEST_PAGE_TOKEN` is a **secret**. Keep it in the gitignored `.env`
(`.env*` is ignored with a `!.env.example` exception, confirmed). It is never
read from a query string and never logged.

---

## ✅ Live-verified in this spike (no real token required)

1. **Endpoint reachable on v23.0.** `https://graph.facebook.com/v23.0/{page}/ratings`
   responds (HTTP 400 with no token, 401/190 with an invalid token) — the path
   and version segment are valid and resolvable.
2. **Error contract matches the client.** An invalid token returns exactly:
   ```json
   {"error":{"message":"Invalid OAuth access token - Cannot parse access token",
             "type":"OAuthException","code":190,"fbtrace_id":"…"}}
   ```
   This is the shape `metaGraphGet()` parses into `MetaGraphRequestError`
   (`message`, `type`, `code`, `fbtrace_id`). The error path is exercised
   end-to-end.
3. **Bearer-header auth works.** Sending the token via `Authorization: Bearer`
   (not the query string) is accepted by the API, so tokens stay out of URLs and
   access logs.
4. **Redaction holds.** With an invalid token injected via env, the spike route
   response and the server log contained **no** occurrence of the token string.
5. **Typecheck + production build pass** with the helper and route present.

## ⏳ Pending — requires a valid Page access token (run by the operator)

These cannot be answered without a real, permissioned Page token, which by
design is not in the repo:

- Whether the Page returns any recommendation rows at all.
- The exact set of fields populated per row (see `fieldKeysSeen` in the route
  output).
- Whether numeric `rating` is present or null (see expectation below).
- Live pagination shape (`paging.cursors.after`, `paging.next`).
- Confirmation of the stable external id on real payloads.

### How to complete the live run

1. Add to the gitignored `.env`:
   ```
   META_TEST_PAGE_ID="<page id>"
   META_TEST_PAGE_TOKEN="<short-lived Page token>"
   ```
2. `npm run dev`, then — **from an authenticated browser session** (the route is
   behind the app's auth middleware; `/api/dev/*` is not public) — open:
   `http://localhost:3000/api/dev/meta-ratings-spike`
   The JSON returns `fieldKeysSeen`, a redacted 3-row `sample`, and a `paging`
   summary. Paste those three back into the "Pending" section to close the spike.

---

## 📚 Meta-documented expectations (to confirm on the live run — NOT verified here)

- **Star ratings are deprecated; recommendations replaced them (2018).** The
  numeric `rating` field is expected to come back `null`/absent on modern Pages.
  `recommendation_type` (`"positive"` / `"negative"`) is the real signal.
- **Permissions:** reading `/{page-id}/ratings` requires a **Page** access token
  with `pages_read_engagement`; reading reviewer/user content typically also
  requires `pages_read_user_content` and an app that has cleared App Review /
  Page Public Content Access. An invalid-permission token returns a distinct
  Graph error (code 200/10) rather than 190 — worth capturing on the live run.
- **Pagination is cursor-based:** `paging.cursors.after` + `paging.next`. The
  client returns `paging` so the caller can follow `next` until absent.

## Recommended stable external id for idempotent imports

**Primary: `open_graph_story.id`** — the recommendation's Open Graph story id is
the stable, per-recommendation identifier and the natural unique key for
idempotent upserts (maps cleanly to a future `Review.externalId` with
`source = FACEBOOK`). The spike requests `open_graph_story` and surfaces
`open_graph_story_id` specifically to validate this.

**Fallback (only if story id is ever absent):** a composite of
`reviewer.id` + `created_time`. Less ideal — reviewer id can be app-scoped and a
reviewer could leave more than one recommendation over time — so prefer the
story id and treat the composite as a last resort. **Confirm `open_graph_story.id`
is consistently present on the live payload before committing to it.**

---

## Recommendation / next step

The transport, version handling, error contract, and redaction are proven. Once
the operator pastes the live `fieldKeysSeen` + sample + paging from a real Page
token, the remaining decision is purely confirming `open_graph_story.id` as
`externalId`. After that, the productionization plan (separate, out of this
spike's scope) is: OAuth connect flow for Page tokens, a `FACEBOOK` review sync
service mirroring the Google sync, and storing recommendations as `Review` rows
with `source = FACEBOOK` keyed on `open_graph_story.id`.
