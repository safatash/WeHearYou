# GBP Management — Phase 1 Design

## Context

WeHearYou is expanding into a full Google local SEO platform (Phase C — BrightLocal competitor), broken into five sequential sub-projects. This spec covers **Phase 1: GBP Management** — the foundation that all later phases build on.

**Target users:** Both business owners and marketing agencies.

**Phases overview:**
1. **GBP Management** ← this spec
2. Local Rank Tracking
3. Competitor Monitoring
4. Citation Auditing
5. White-Label Reporting

---

## Scope

Four features ship in Phase 1:

- **Review reply publishing** — publish AI-drafted or manually written replies to Google Business Profile
- **GBP post scheduler** — create and schedule What's New, Offer, and Event posts
- **Photo management** — upload, schedule, and view photos on GBP
- **Q&A management** — pull questions from GBP nightly, answer them from within WeHearYou

---

## Architecture decision

**Unified GBP content model (Option B):** All four content types get a local database record. Everything follows the same `DRAFT → SCHEDULED → PUBLISHED → FAILED` lifecycle. A cron job handles scheduled publishing. Google is not the source of truth — WeHearYou is.

Rationale: consistent with existing patterns (Review already has `replyDraft`), enables scheduling for all content types, provides history and audit trail needed for Phase 5 reporting, and avoids a painful re-architecture when rank tracking and reports arrive.

---

## Navigation

A new **"GOOGLE LOCAL SEO"** section is added to the left nav in `AppShell`, below "REQUESTS & FEEDBACK":

```
GOOGLE LOCAL SEO
  🗺 GBP Manager          ← active in Phase 1
  📊 Rank Tracker         ← greyed out (Phase 2)
  🏆 Competitors          ← greyed out (Phase 3)
  📋 Reports              ← greyed out (Phase 5)
```

Greyed-out items are visible from day one to signal the roadmap without shipping unfinished features.

---

## Data model

### Review (extended — 2 new fields)

```prisma
model Review {
  // existing
  replyDraft        String?

  // new
  replyPublishedAt  DateTime?
  replyGbpId        String?    // Google's reply ID, used for edit/delete
}
```

### GbpPost

```prisma
model GbpPost {
  id           String    @id @default(cuid())
  locationId   String
  location     Location  @relation(fields: [locationId], references: [id])
  postType     GbpPostType   // WHATS_NEW | OFFER | EVENT
  content      String
  callToAction Json?     // { type: String, url: String }
  imageUrl     String?
  status       GbpPublishStatus  // DRAFT | SCHEDULED | PUBLISHED | FAILED
  scheduledAt  DateTime?
  publishedAt  DateTime?
  gbpPostId    String?   // Google's ID
  failureReason String?
  createdAt    DateTime  @default(now())
}
```

### GbpPhoto

```prisma
model GbpPhoto {
  id           String    @id @default(cuid())
  locationId   String
  location     Location  @relation(fields: [locationId], references: [id])
  storageUrl   String    // Vercel Blob URL
  category     String    // EXTERIOR | INTERIOR | FOOD | TEAM | AT_WORK | ADDITIONAL
  caption      String?
  status       GbpPublishStatus
  scheduledAt  DateTime?
  publishedAt  DateTime?
  gbpMediaId   String?   // Google's ID
  failureReason String?
  createdAt    DateTime  @default(now())
}
```

### GbpQuestion

```prisma
model GbpQuestion {
  id             String    @id @default(cuid())
  locationId     String
  location       Location  @relation(fields: [locationId], references: [id])
  gbpQuestionId  String    @unique  // Google's ID
  questionText   String
  askedAt        DateTime
  answerText     String?
  answeredAt     DateTime?
  gbpAnswerId    String?
  syncedAt       DateTime
}
```

### GbpSyncLog

```prisma
model GbpSyncLog {
  id           String    @id @default(cuid())
  locationId   String
  location     Location  @relation(fields: [locationId], references: [id])
  syncType     String    // QUESTIONS | REVIEWS | PHOTOS
  status       String    // SUCCESS | FAILED
  itemsSynced  Int       @default(0)
  error        String?
  syncedAt     DateTime  @default(now())
}

enum GbpPostType {
  WHATS_NEW
  OFFER
  EVENT
}

enum GbpPublishStatus {
  DRAFT
  SCHEDULED
  PUBLISHED
  FAILED
}
```

---

## New files

### `src/lib/gbp-api.ts`

Thin wrapper around the GBP REST API. All functions accept an `accessToken` string and return typed results. Handles 401 → token refresh via `GoogleAccountConnection`. Exported functions:

- `publishReply(accessToken, locationName, reviewId, replyText)`
- `createPost(accessToken, locationName, post: GbpPostPayload)`
- `deletePost(accessToken, locationName, postId)`
- `uploadPhoto(accessToken, locationName, imageUrl, category)`
- `deletePhoto(accessToken, locationName, mediaId)`
- `listPhotos(accessToken, locationName)`
- `listQuestions(accessToken, locationName)`
- `answerQuestion(accessToken, locationName, questionId, answerText)`

### `src/lib/gbp-scheduler.ts`

Called by the cron route every 5 minutes. Queries all orgs' GbpPost and GbpPhoto records where `status = SCHEDULED AND scheduledAt <= now()`. For each, resolves the org's access token, calls the appropriate `gbp-api.ts` function, and updates status to `PUBLISHED` (with `publishedAt`) or `FAILED` (with `failureReason`). Writes a `GbpSyncLog` entry per batch.

### `src/lib/gbp-sync.ts`

Called by the nightly cron. For each location with an active Google connection, calls `listQuestions`, upserts `GbpQuestion` rows (keyed on `gbpQuestionId`), and detects new unanswered questions (syncedAt within last 24h, no answerText). Fires `sendTeamNotificationEmail` for each new unanswered question.

### `src/app/api/cron/gbp/route.ts`

Vercel cron endpoint, secured with `CRON_SECRET` header. Calls `gbp-scheduler.ts` on every invocation. Calls `gbp-sync.ts` only when the `sync=true` query param is present (set by the nightly cron schedule). Returns a JSON summary.

### `src/app/gbp/actions.ts`

All GBP server actions:

- `publishGbpReply(formData)` — reads reviewId + replyText, calls `gbp-api.ts`, updates Review
- `createGbpPost(formData)` — creates GbpPost record (DRAFT or SCHEDULED)
- `deleteGbpPost(formData)` — deletes from GBP API if published, deletes record
- `uploadGbpPhoto(formData)` — uploads to Vercel Blob, creates GbpPhoto record
- `deleteGbpPhoto(formData)` — removes from GBP API + marks record deleted
- `answerGbpQuestion(formData)` — calls `gbp-api.ts`, updates GbpQuestion

---

## New pages

### `src/app/gbp/page.tsx` — GBP Manager hub

Server component. Shows one card per connected location with:
- Reviews needing reply (count)
- Scheduled posts (count)
- Live photos (count)
- Unanswered Q&A (count)
- GBP health score (calculated: 100 minus points for unanswered reviews, unanswered Q&A, no recent posts, no photos)

### `src/app/gbp/posts/page.tsx`

List of all GbpPosts for accessible locations, grouped by status (SCHEDULED → PUBLISHED → FAILED). Each row shows type badge, content preview, scheduled/published date.

### `src/app/gbp/posts/new/page.tsx`

Form: post type selector, content textarea, optional image upload, optional call-to-action URL, datetime picker for scheduling. "Publish now" and "Schedule" buttons call `createGbpPost`.

### `src/app/gbp/photos/page.tsx`

Two tabs: "Upload" (file picker + category select + optional schedule) and "Live on Google" (grid of published GbpPhotos with delete button).

### `src/app/gbp/qa/page.tsx`

List of GbpQuestions, unanswered first. Each row has an inline textarea + "Post Answer" button that calls `answerGbpQuestion`.

---

## Modified existing files

### `src/components/app-shell.tsx`

Add "GOOGLE LOCAL SEO" nav section. Greyed-out items rendered as non-clickable spans with `opacity-40`.

### `src/app/reviews-inbox/page.tsx` (or equivalent)

Add "Publish to Google" button on reviews that have `replyDraft` and no `replyPublishedAt`. Show a published checkmark + relative date when `replyPublishedAt` is set.

### `src/lib/automation-engine.ts`

Add `PUBLISH_GBP_REPLY` case to the step executor. Resolves the review from `targetId` in step config, calls `gbp-api.ts publishReply`, updates Review.

### `prisma/schema.prisma`

Add 4 new models, 2 new enums, 2 fields on Review. One Prisma migration.

### `vercel.json`

```json
{
  "crons": [
    { "path": "/api/cron/gbp", "schedule": "*/5 * * * *" },
    { "path": "/api/cron/gbp?sync=true", "schedule": "0 2 * * *" }
  ]
}
```

---

## Feature flows

### Review reply publishing

1. User opens Reviews Inbox → sees review with AI-drafted reply
2. Edits draft if needed → clicks "Publish to Google"
3. `publishGbpReply` server action calls `gbp-api.ts publishReply`
4. On success: `Review.replyPublishedAt` and `Review.replyGbpId` set → flash confirmation
5. **Auto-publish path:** `PUBLISH_GBP_REPLY` automation step fires after a review syncs → publishes draft without a human click

### GBP post scheduler

1. User navigates to GBP Manager → Posts → New Post
2. Fills content, picks type (What's New / Offer / Event), optionally uploads image, sets schedule
3. `createGbpPost` creates GbpPost with status `SCHEDULED`
4. Cron (`*/5 * * * *`) picks up posts where `scheduledAt <= now()`, calls `localPosts.create`, sets status to `PUBLISHED`
5. "Publish now" skips scheduling — calls GBP API immediately in the server action

### Photo management

1. User uploads photo → stored to Vercel Blob → GbpPhoto created (`DRAFT`)
2. User picks category, optionally sets schedule → saves → status becomes `SCHEDULED`
3. Cron calls `media.create` with the Blob URL, stores returned `gbpMediaId`, sets `PUBLISHED`
4. Gallery tab shows all PUBLISHED photos. Delete button calls `media.delete` + marks record deleted.

### Q&A management

1. Nightly cron calls `listQuestions` for each connected location
2. New questions upserted into `GbpQuestion` (keyed on `gbpQuestionId`)
3. New unanswered questions trigger `sendTeamNotificationEmail`
4. User views Q&A page → sees unanswered questions first → writes answer → "Post Answer"
5. `answerGbpQuestion` calls `answers.upsert`, sets `GbpQuestion.answerText`, `answeredAt`, and `gbpAnswerId`

---

## Error handling

- **GBP API call fails (interactive):** Server action returns error → flash banner on page. GbpPost/GbpPhoto `status` set to `FAILED` with `failureReason`. User retries from UI.
- **Scheduled item fails in cron:** Status → `FAILED`. GbpSyncLog records error. No automatic retry (avoids duplicate posts on flaky API).
- **Google token expired:** `gbp-api.ts` catches 401 → attempts refresh via `GoogleAccountConnection.refreshToken`. If refresh fails, surfaces "Reconnect Google Business Profile" prompt in GBP Manager hub.
- **Location not connected:** GBP Manager hub shows empty state with "Connect Google Business Profile" CTA linking to existing OAuth flow.
- **No silent failures:** Every write failure is recorded in GbpSyncLog and surfaced in UI via status badge.

---

## Testing

### Unit tests

- `gbp-api.ts`: mock `fetch`, verify correct endpoints and payloads; test 401 → refresh → retry path; test double-401 surfaces error
- `gbp-scheduler.ts`: items past `scheduledAt` get processed; future items skipped; FAILED items not retried; PUBLISHED items not double-processed

### Integration tests (server actions against test DB)

- `publishGbpReply`: review with draft → action succeeds → `replyPublishedAt` set
- `createGbpPost`: valid payload → GbpPost created with SCHEDULED status
- `answerGbpQuestion`: `GbpQuestion.answeredAt` set after successful API call

### Manual smoke tests before deploy

- Reply draft → Publish to Google → `replyPublishedAt` appears in Reviews Inbox
- Create a What's New post → schedule 2 min ahead → wait → verify on GBP listing
- Upload a photo → publish now → verify in Google Maps
- Answer a Q&A question → verify on listing
- Expire/disconnect Google token → verify reconnect prompt appears in hub

---

## Timeline

| Week | Deliverable |
|------|-------------|
| 1–2  | Schema migration, `gbp-api.ts`, reply publishing (Reviews Inbox button + auto-publish step) |
| 3    | Post scheduler, cron infrastructure, `vercel.json` schedules |
| 4–5  | Photo management, Vercel Blob upload flow |
| 6    | Q&A sync, GBP Manager hub dashboard, nav section |

**~6 weeks total.** Reply publishing is independently usable from end of week 2.
