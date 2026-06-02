# Review Links Feature Design

## Overview

Anonymous location-level review links for distribution via email signatures, QR codes, website buttons, invoices, and printed materials. Visitors click a happy or unhappy icon; happy routes directly to Google via a server-side redirect, unhappy routes to a private feedback form. All events are tracked at aggregate/location level with no contact association unless the visitor voluntarily submits identifying information.

---

## Routes

| Route | Auth | Description |
|---|---|---|
| `GET /review/[slug]` | None | Landing page — thumbs up/down chooser |
| `GET /review/[slug]/google` | None | Server-side redirect to Google; records events atomically |
| `GET /review/[slug]/feedback` | None | Anonymous private feedback form |
| `POST /review/[slug]/feedback` | None | Form submit — validates, rate-limits, stores, redirects |
| `GET /review/[slug]/thanks` | None | Confirmation after feedback submitted |
| `GET /review-links` | Required (org member) | Admin page — links, snippets, QR, analytics |
| `POST /api/review-links/[slug]/event` | None | Records a single validated analytics event |

`/r/[token]` remains unchanged as the personalized campaign/contact route.

---

## Landing Page — `GET /review/[slug]`

**Design:** Thumbs up/down card layout. Mobile-first, keyboard-navigable, screen-reader friendly.

**Copy:**
- Headline: `Would you recommend {Business Name}?`
- Subheadline: `Your feedback helps us improve.`

**Positive card:**
- Green-tinted border, 👍 icon (decorative, aria-hidden), accessible label "Great experience"
- Title: `Yes, I had a great experience`
- Subtitle: `Leave a public review`
- Action: navigate to `/review/[slug]/google?src=...&medium=...&placement=happy_card`

**Negative card:**
- Orange-tinted border, 👎 icon (decorative, aria-hidden), accessible label "Had an issue"
- Title: `Not quite`
- Subtitle: `Share private feedback`
- Action: navigate to `/review/[slug]/feedback?src=...&medium=...&placement=unhappy_card`

**Source tracking:**
- `?src=`, `?medium=`, `?placement=` query params are read on page load and appended to all outgoing links
- `LINK_VIEWED` event recorded on page load, deduplicated to once per `sessionId` (if same session already has a `LINK_VIEWED` for this location, skip)
- `sessionId` — random UUID generated on first load, stored in `sessionStorage` (not a persistent cookie, no PII), expires when tab closes

**Google review URL resolution:**
The `Location` model has two relevant fields:
- `reviewLink: String?` — manually configured Google review URL
- `googlePlaceId: String?` — Google Place ID, used to construct `https://search.google.com/local/writereview?placeid=...` via `buildGoogleWriteReviewLink(googlePlaceId)` from `src/lib/locations.ts`

Resolution order: use `location.reviewLink` if set; else use `buildGoogleWriteReviewLink(location.googlePlaceId)` if `googlePlaceId` is set; else the location has no Google URL.

**Missing Google URL behavior:**
- If no Google URL can be resolved (both `reviewLink` and `googlePlaceId` are null), render the landing page with the happy card disabled and copy: "Google review link is not yet configured — please contact us." Only the unhappy/feedback path is active.
- If the `slug` does not match any active location, return 404.

**Accessibility:**
- Both cards must be `<button>` or `<a>` elements with visible focus rings
- Icons are decorative (`aria-hidden`), text labels carry all meaning
- Color is not the sole affordance — card border + icon + label text all indicate sentiment
- Non-color indicator: green border + "Great" label vs orange border + "Not quite" label

---

## Server-Side Google Redirect — `GET /review/[slug]/google`

This route is the canonical happy-path endpoint. It records analytics atomically on the server before redirecting, ensuring events are never lost due to browser navigation racing the client request.

**Accepts:** `?src=`, `?medium=`, `?placement=` (attribution only — clients never pass the redirect URL)

**Process:**
1. Look up location by slug; 404 if not found or inactive
2. Look up Google review URL from the trusted location record — never from query params (prevents open redirect)
3. Record `HAPPY_CLICKED` and `GOOGLE_REDIRECT_CLICKED` events in a single DB write
4. Return `302` redirect to the stored Google review URL

**Used by:**
- Happy card on landing page
- Email signature happy button (`placement=happy_button`)
- Any other distribution channel linking directly to the happy action

---

## Email Signature Snippet

Email sig buttons are **direct-action links**, not links to the chooser page. This avoids asking users to choose twice.

- **Happy button** → `/review/[slug]/google?src=email_signature&medium=email&placement=happy_button`
  - Records `HAPPY_CLICKED` + `GOOGLE_REDIRECT_CLICKED` server-side, then redirects to Google
- **Unhappy button** → `/review/[slug]/feedback?src=email_signature&medium=email&placement=unhappy_button`
  - Goes directly to the private feedback form

Table-based HTML for maximum email client compatibility (Gmail, Outlook, Apple Mail, mobile). Compact inline layout — two bordered buttons side by side, text labels carry meaning independent of emoji.

```html
<table cellpadding="0" cellspacing="0" border="0" style="font-family:Arial,sans-serif">
  <tr>
    <td style="padding-top:10px;border-top:1px solid #e5e7eb">
      <span style="font-size:12px;color:#6b7280;margin-right:8px">How was your visit?</span>
      <a href="https://[APP_URL]/review/[slug]/google?src=email_signature&amp;medium=email&amp;placement=happy_button"
         style="display:inline-block;background:#f0fdf4;border:1.5px solid #bbf7d0;border-radius:6px;padding:6px 12px;text-decoration:none;font-size:12px;font-weight:700;color:#15803d;margin-right:6px">
        👍 Great
      </a>
      <a href="https://[APP_URL]/review/[slug]/feedback?src=email_signature&amp;medium=email&amp;placement=unhappy_button"
         style="display:inline-block;background:#fff7ed;border:1.5px solid #fed7aa;border-radius:6px;padding:6px 12px;text-decoration:none;font-size:12px;font-weight:700;color:#c2410c">
        👎 Not great
      </a>
    </td>
  </tr>
</table>
```

Notes:
- Ampersands in `href` attributes are escaped as `&amp;` in generated HTML
- Labels ("Great", "Not great") carry meaning without relying on emoji rendering
- `[APP_URL]` is resolved from `NEXT_PUBLIC_APP_URL` at generation time, never hard-coded as `app.com`

---

## Feedback Form — `GET /review/[slug]/feedback`

Renders the anonymous private feedback form. Optionally records `FEEDBACK_STARTED` on page load (once per session, not per visit).

Fields:
- Name — optional, max 100 chars
- Email — optional, validated as syntactically valid email if provided, max 200 chars
- Message — **required**, min 10 chars, max 2000 chars

**Abuse controls:**
- Honeypot field: hidden `<input name="website">` — reject server-side if non-empty
- Message min/max length validated server-side
- Email syntactic validation if provided
- Rate limiting: max 5 submissions per IP per hour per location
- No CAPTCHA for MVP — add if abuse is observed post-launch

**Privacy note near form:** "Your name and email are optional. This feedback goes only to the business and is not posted publicly."

---

## `POST /review/[slug]/feedback`

1. Validate honeypot (reject silently — redirect to thanks as if successful, do not reveal detection)
2. Validate message length, email format if provided
3. Apply rate limiting — return generic error if exceeded
4. Store as a `Review` record:
   - `source: INTERNAL`
   - `status: PRIVATE_FEEDBACK`
   - `reviewerName: name || "Anonymous"`
   - `body: message`
   - `rating: null` — **do not store `rating: 1`** (see data pollution note below)
   - `internalNotes: "Review link feedback. Source: {src}. Contact email: {email}"` if email provided
   - No `contactId` FK
5. Record `FEEDBACK_SUBMITTED` analytics event
6. Redirect to `/review/[slug]/thanks`

> **Data pollution note:** The existing Review model's `rating` field should be `null` for `PRIVATE_FEEDBACK` records created via review links, not `1`. All existing dashboard queries that compute rating averages or review counts must already exclude `status: PRIVATE_FEEDBACK`; implementation must verify this with a query audit before go-live. Check: `prisma.review.findMany` callers that compute `avgRating` or `count` without a `status` filter.

---

## `GET /review/[slug]/thanks`

Static confirmation page. No new DB records. Copy: "Thank you for your feedback. We take every message seriously and will follow up if you've provided contact information."

Preserves `?src=` in URL for attribution visibility but records no additional events.

---

## Analytics Model

### Prisma Schema

```prisma
enum ReviewLinkEventType {
  LINK_VIEWED
  HAPPY_CLICKED
  UNHAPPY_CLICKED
  GOOGLE_REDIRECT_CLICKED
  FEEDBACK_STARTED
  FEEDBACK_SUBMITTED
}

model ReviewLinkEvent {
  id             String              @id @default(cuid())
  organizationId String
  locationId     String
  eventType      ReviewLinkEventType
  source         String?             // email_signature | qr_counter | invoice | website | null
  medium         String?             // email | print | digital | null
  placement      String?             // happy_button | unhappy_button | happy_card | unhappy_card | null
  referrer       String?             // HTTP Referer, max 500 chars, query string stripped
  sessionId      String?             // sessionStorage UUID, validated as UUID v4, no PII
  reviewLinkId   String?             // nullable, reserved for future ReviewLink entity
  createdAt      DateTime            @default(now())

  organization   Organization        @relation(fields: [organizationId], references: [id], onDelete: Restrict)
  location       Location            @relation(fields: [locationId], references: [id], onDelete: Restrict)

  @@index([organizationId, createdAt])
  @@index([locationId, createdAt])
  @@index([locationId, eventType, createdAt])
  @@index([locationId, source, createdAt])
  @@index([locationId, sessionId, createdAt])
}
```

**Deletion behavior:** `onDelete: Restrict` — a location cannot be hard-deleted while analytics events exist. This preserves historical data. Locations should be deactivated rather than deleted.

**Referrer handling:** Strip query string from `Referer` header before storing (`new URL(referrer).origin + pathname`), truncate to 500 chars, store `null` if malformed.

### Application-Layer Validation (before writing any event)

| Field | Rule |
|---|---|
| `source` | Allow-list: `email_signature`, `qr_counter`, `invoice`, `website`, `null`. Unknown values → `null`. |
| `medium` | Allow-list: `email`, `print`, `digital`, `null`. Unknown values → `null`. |
| `placement` | Allow-list: `happy_button`, `unhappy_button`, `happy_card`, `unhappy_card`, `null`. Unknown → `null`. |
| `sessionId` | Must match UUID v4 regex or be omitted. Invalid → `null`. |
| `referrer` | Strip query string, truncate to 500 chars, set `null` if missing or malformed. |
| `organizationId` | Always resolved server-side from the slug's location — never from the request body. |

### Analytics Metric Formulas

| Admin metric | Formula | Notes |
|---|---|---|
| Total views | `COUNT(LINK_VIEWED)` deduplicated by `sessionId` | One view per session per location |
| Happy clicks | `COUNT(HAPPY_CLICKED)` | Does not include `GOOGLE_REDIRECT_CLICKED` |
| Google redirects | `COUNT(GOOGLE_REDIRECT_CLICKED)` | Delivery confirmation for the redirect endpoint |
| Unhappy clicks | `COUNT(UNHAPPY_CLICKED)` | Does not include `FEEDBACK_STARTED` |
| Feedback starts | `COUNT(FEEDBACK_STARTED)` | Fires on feedback form page load, once per session |
| Feedback submissions | `COUNT(FEEDBACK_SUBMITTED)` | Tied to successful DB write |
| Conversion (happy) | `HAPPY_CLICKED / LINK_VIEWED` | Drop-off from view to action |
| Containment rate | `FEEDBACK_SUBMITTED / UNHAPPY_CLICKED` | Did unhappy visitors complete feedback? |

---

## Admin UI — `GET /review-links`

### Page Structure

**Top summary bar:** total locations, total views (30d, deduplicated), happy clicks (30d), unhappy clicks (30d)

**Location search/filter:** server-side text search by name, lazy-rendered results

**Per-location tabbed cards** — tabs load lazily on first open:

#### Links tab
- Default URL: `{NEXT_PUBLIC_APP_URL}/review/[slug]` — generated from env, never hard-coded
- Source-specific URLs with copy buttons: email_signature, qr_counter, invoice, website

#### Email Sig tab
- Rendered HTML preview
- Copyable table-based HTML with escaped `&amp;` in URLs
- Happy button → `/review/[slug]/google?src=email_signature&medium=email&placement=happy_button`
- Unhappy button → `/review/[slug]/feedback?src=email_signature&medium=email&placement=unhappy_button`

#### QR Code tab
- Single QR code generated client-side targeting `/review/[slug]?src=qr_counter`
- Print button: `window.print()` with `@media print` CSS
- Download as PNG (using canvas `toDataURL`)

#### Analytics tab
- Backed by a server-side aggregation query — not client-side filtering of raw events
- Event counts by type, by source
- Date range: last 7 / 30 / 90 days
- Timezone: UTC with note; org timezone support deferred

Analytics endpoint: `GET /api/review-links/[slug]/analytics?range=30` — protected via `getCurrentMembership()`, scoped to authenticated user's organization, returns grouped counts.

### Secondary Location Section

A "Review Link" section on each `/locations/[id]` page shows the default URL with a copy button and a link to `/review-links`.

---

## QR Code Page

- Single QR code per location, generated client-side (`qrcode` npm package)
- Target URL: `/review/[slug]?src=qr_counter`
- Print layout: location name, "How was your visit?", QR code, short URL below, WeHearYou branding
- Print: `window.print()` with `@media print` hiding all admin chrome
- Download: canvas `toDataURL("image/png")` triggered by download button

---

## Source Tracking Reference

| `?src=` value | `medium` | `placement` | Use case |
|---|---|---|---|
| `email_signature` | `email` | `happy_button` / `unhappy_button` | Email signature buttons (direct action) |
| `qr_counter` | `print` | `null` | Counter card / in-store QR (lands on chooser) |
| `invoice` | `print` | `null` | Printed invoice (lands on chooser) |
| `website` | `digital` | `null` | Website button (lands on chooser) |
| *(null)* | `null` | `null` | Direct link / unknown |

---

## Out of Scope for MVP

- Named `ReviewLink` entity with per-link status, custom slugs, or separate settings per placement
- Multiple QR codes per location (one per placement type)
- Two-QR print layout (Option B, happy/unhappy separate QR codes)
- Playful emoji theme (Option A) or review-form-style template (Option C) for the landing page
- Campaign/automation integration as a step type
- Contact-level tracking for anonymous visits
- CAPTCHA (add if abuse observed post-launch)
- Org timezone support for analytics

---

## Future Extension Points

- Add nullable `reviewLinkId` FK to `ReviewLinkEvent` for named links with separate stats
- Add `ReviewLink` model: `id`, `locationId`, `name`, `slug`, `isActive`, `defaultSource`, `createdAt`
- Multiple QR codes per location (one per named link)
- Landing page theme selector
- Automation step type: "Send review link"
- `rating: null` in `PRIVATE_FEEDBACK` Review records — requires schema migration to make `rating` nullable

---

## Pre-Implementation Checklist

### Rating field — make nullable as part of this migration

`Review.rating` is currently `Int` (required). Anonymous review-link feedback has no star rating. The migration for this feature should change `rating` to `Int?` (nullable). This requires:
1. `prisma/schema.prisma`: `rating Int` → `rating Int?`
2. A new migration SQL: `ALTER TABLE "Review" ALTER COLUMN "rating" DROP NOT NULL;`
3. All `review.rating` usages in TypeScript must be updated to handle `null`:
   - `dashboard.ts:95` — `reviews.filter(...).reduce((sum, r) => sum + r.rating, 0)` → guard with `r.rating ?? 0` and exclude `PRIVATE_FEEDBACK` records from the average
   - Any other `.rating` arithmetic must be audited

### Dashboard rating pollution — fix in same PR

`dashboard.ts:93–96` computes `averageRating` from all non-testimonial reviews without filtering `PRIVATE_FEEDBACK`. This pre-existing bug already affects the dashboard if any `PRIVATE_FEEDBACK` reviews exist. Fix: add `status: { not: ReviewStatus.PRIVATE_FEEDBACK }` filter to the `reviews` fetch query, or exclude them in the reduce.

### Required audit before go-live

- [ ] All `prisma.review` queries that compute rating averages or counts are audited to exclude `status: PRIVATE_FEEDBACK`
- [ ] `Review.rating` is nullable after migration — all TypeScript callers handle `null` without crash
- [ ] `ReviewStatus.PRIVATE_FEEDBACK` records are excluded from public review widgets and testimonial queries
- [ ] `Location.avgRating` field (stored on Location model) is confirmed to come from Google sync only, not computed from PRIVATE_FEEDBACK records
