# Location Detail Command Center + Mini-Site Redesign

**Date:** 2026-06-19
**Status:** Approved design — ready for implementation planning

## Goal

Redesign two existing surfaces in WeHearYou:

1. **Admin Location Detail page** (`src/app/locations/[id]/page.tsx`) — turn the flat,
   sparse settings page into a "command center" for one business location.
2. **Public Mini-Site** (`src/app/b/[slug]/page.tsx`) — turn the location profile into a
   polished, trustworthy, shareable customer-facing page.

Both already exist and are backed by the `Location` + `LocationPublicProfile` Prisma
models. This is a redesign + targeted backend additions, not a greenfield build.

## Decisions (locked during brainstorming)

| Decision | Choice |
| --- | --- |
| Build depth | **Full build incl. real analytics** (page views, click tracking, request performance) |
| Public URL | **Keep `/b/{slug}` in place** (stable, already referenced across app/SEO/share). Display this URL in the admin "public URL pill". |
| Status model | **Derived status badge + stored publish flag** (no hand-set status enum) |
| Empty metric cards | **Render `—` with a "Tracking starts when published" hint** (no layout shift) |
| Connected sources | **Show all 4 rows** (Google, Facebook, Yelp, Trustpilot). Google + Yelp keep existing functionality; Facebook + Trustpilot show a Connect / "Coming soon" state — no new integrations built. |
| Highlight chips | **AI-generated + admin-editable** |

## Non-goals

- No new OAuth/API integrations for Facebook or Trustpilot.
- No change to the public URL scheme (`/l/{slug}` from the spec is **not** adopted; `/b/{slug}` stays).
- No redesign of the funnel (`/f`, `/r`), widgets, or other screens.

---

## Data model changes (single Prisma migration)

All new fields are optional or defaulted so existing rows migrate cleanly.

### `Location`
- `miniSitePublished Boolean @default(false)`
- `miniSitePublishedAt DateTime?`

The displayed status badge is **derived**, not stored (see Derived status below).
`slug` already exists and is unique; slug editing already flows through location settings.

### `LocationPublicProfile`
- `accentColor String?` — brand accent; falls back to teal `#37AEB7`.
- `services String[] @default([])` — services/categories chips.
- `websiteUrl String?` — public "Website URL" (distinct from `bookingUrl`).
- `timezone String?` — location time zone (operational + shown in Location Info).
- `ctaType String? @default("REVIEW")` — primary CTA, one of `CALL | WEBSITE | DIRECTIONS | BOOK | REVIEW`.
- `secondaryCtaType String?` — secondary CTA, same value set (or null = none).
- `secondaryCtaLabel String?` — secondary CTA button text.
- `enabledReviewSources String[] @default([])` — which sources appear in the public
  "Leave a Review" section (subset of `GOOGLE | FACEBOOK | YELP | TRUSTPILOT`). Empty =
  derive from whatever sources are connected.
- `reviewHighlights String[] @default([])` — AI-generated highlight phrases, admin-editable.
- Visibility toggles (booleans, defaults noted):
  - `showReviewSummary @default(true)` — the rating/count trust block.
  - `showFeaturedReviews @default(true)`
  - `showServices @default(true)` — services/categories section.
  - `showSourceBadges @default(true)`
  - `showVerifiedBadge @default(true)`
  - `showPoweredBy @default(true)` — "powered by WeHearYou" footer line.
- `ctaLabel` (existing) is reused as the **primary CTA label**.
- **Reused existing fields:** `headline` (display name), `subheadline` (description),
  `phone`, `email`, `addressLine1/2`, `postalCode`, `googleHours`, `googleMapsUrl`,
  `bookingUrl`, `ctaLabel`, `ctaUrl`, `logoUrl`, `heroImageUrl`, `showReviews`,
  `showTestimonials` (video), `showMap`, `showHours`, `showAiReviewSummary`, `aiReviewSummary`.

### `Review`
- `isHiddenFromMiniSite Boolean @default(false)` — "Hide from mini page".
- Featured-first ordering uses the existing `isFeatured` field. "Add to widget" uses
  existing `isWidgetVisible`.
- **Note on "featured review IDs / hidden review IDs":** the spec phrases these as ID lists
  on the location. We model them instead as per-review booleans (`isFeatured`,
  `isHiddenFromMiniSite`) — functionally equivalent, already partially present, and avoids a
  denormalized array that can drift from the reviews it references.

### `ReviewLinkEventType` enum — add values
- `MINISITE_VIEWED`
- `MINISITE_CLICK_REVIEW`
- `MINISITE_CLICK_CALL`
- `MINISITE_CLICK_WEBSITE`
- `MINISITE_CLICK_DIRECTIONS`
- `MINISITE_CLICK_CTA`

Kept distinct from the funnel's `LINK_VIEWED` so funnel analytics are not polluted.

---

## Analytics (real, reusing existing infrastructure)

The existing `ReviewLinkEvent` table and `src/lib/review-link-analytics.ts`
(`recordEvents`, `sanitizeAttribution`, `isRateLimited`, `getLocationAnalytics`) are the
foundation. No new event tables.

### Mini-site event capture
- New route `POST /api/public/minisite/[slug]/track` accepting `{ eventType, attribution }`.
  It resolves the location by slug, rate-limits via `isRateLimited`, sanitizes via
  `sanitizeAttribution`, and writes through `recordEvents`. Rejects event types outside the
  `MINISITE_*` set.
- New client component `MiniSiteTracker` mounted on `/b/[slug]`:
  - On load: `navigator.sendBeacon` a `MINISITE_VIEWED` event (deduped per session via a
    UUID in `sessionStorage`).
  - On click of review / call / website / directions / CTA buttons: send the matching
    `MINISITE_CLICK_*` event. Clicks never block navigation.
- Tracking is **disabled in preview mode** (`?preview=1`).

### Aggregation
- Extend the analytics lib with `getMiniSiteAnalytics(locationId, days)` returning page
  views and per-type click counts, using the same `groupBy` pattern as
  `getLocationAnalytics`.

### Request performance (derived, no new table)
- Computed from existing `Campaign` + `CampaignRecipient` for the location:
  - Requests sent = recipients with `sentAt`.
  - Open rate = `openedAt / sentAt`.
  - Click/conversion = `completedAt / sentAt`.
  - Best channel = groupBy `Campaign.channel` by conversion.
- New helper `getLocationRequestPerformance(locationId)` in `src/lib/locations.ts` (or a new
  `src/lib/location-request-performance.ts`).

### Empty-state contract
Aggregation helpers return `null` (or zeroed with a `hasData: false` flag) when there are no
events/campaigns yet. The UI renders `—` plus a muted "Tracking starts when published" hint.

---

## Derived status badge

Pure function `deriveLocationStatus(location): "Active" | "Draft" | "Paused" | "Needs setup"`:

- `Needs setup` — no review source mapped, or required public-profile fields missing.
- `Draft` — set up but `miniSitePublished` has never been true (`miniSitePublishedAt` null).
- `Paused` — was published before but `miniSitePublished` is currently false.
- `Active` — `miniSitePublished` true and at least one source connected.

Lives in `src/lib/locations.ts`, unit-tested (the repo already uses `*.test.ts` next to libs).

---

## Admin page rebuild — `locations/[id]/page.tsx`

The current 765-line file is decomposed into focused components under
`src/app/locations/[id]/_components/`. The page becomes a server component that fetches data
and composes these sections:

1. **`LocationHeader`** — back link to All Locations · location name · derived status badge ·
   address · primary rating + total review count · **public URL pill** (`<app>/b/{slug}` with
   a copy button) · connected-source mini-badges · quick actions: Copy public link, Open
   public page, Customize mini site, Edit location, Send review request, Manage sources.
2. **`SummaryCards`** — Average rating · Total reviews · New reviews this month · Pending
   replies · Request conversion · Mini-site page views · Direction clicks · Call clicks ·
   Website clicks (the three click types are separate cards). Cards with no backing data show
   `—` + hint.
3. **`MiniSitePreview`** (major section) — browser-chrome frame wrapping
   `<iframe src="/b/{slug}?preview=1">`; desktop/mobile width toggle; actions Copy link · Open
   page · Customize mini page (scrolls to settings) · Publish/Unpublish (server action toggling
   `miniSitePublished` + `miniSitePublishedAt`); current publish state + last-updated date;
   **missing-setup checklist** when the profile is incomplete.
4. **`MiniSiteSettings`** — reorganized settings form covering display name, address, phone,
   website, hours, time zone, short description, services/categories, hero image / accent
   color, primary CTA type + label, secondary CTA type + label, enabled review sources, and
   all show/hide toggles (AI review summary, featured reviews, video testimonials, source
   badges, map, hours, services, verified badge, powered-by). Submits through the existing
   `saveLocationSettings` server action (extended for the new fields).
5. **`LocationReviewsPanel`** — review list filtered to this location showing reviewer name,
   rating, source, date, text, reply status, public-visibility status, and featured status.
   Filters: All / Needs reply / Featured / Hidden from public page / 5★ / 4★ / 1–3★ / Google /
   Facebook / Yelp / Trustpilot. Row actions: Reply · Mark as featured / Remove from featured
   (`isFeatured`) · Hide from public page / Show on public page (`isHiddenFromMiniSite`) · Add
   to widget (`isWidgetVisible`). Filtering is URL-param driven (server-rendered).
6. **`RequestPerformance`** — requests sent, open rate, click rate, review conversion, best
   performing channel, latest campaign, last request sent; actions Send new review request /
   Create campaign for this location / View campaign history.
7. **`ConnectedSources`** — Google, Facebook, Yelp, Trustpilot rows. Each row shows connection
   status, last synced date, number of reviews imported, that source's rating, and sync
   status, with Connect / Reconnect / Sync now / Manage mapping actions. Absorbs the current
   Google mapping + sync block. Facebook + Trustpilot render a "Coming soon" connect state
   (status/counts shown as `—`).
8. **`LocationDetailsCard`** — address, phone, website, business hours, time zone, internal
   location ID, created date, updated date, last synced date, assigned team/users.

The existing AI-summary, Google-reply-automation, and danger-zone blocks are retained and
folded into the relevant sections (AI summary → near Mini Site Settings; automation →
Connected Sources/Google area; danger zone → bottom).

### Styling
Use the existing CSS tokens in `globals.css`: brand teal `--accent` (#37AEB7), `--ink-*`
ramp, white cards, subtle borders, `--shadow-sm/md` used sparingly, star color `--star`.
Replace the page's current indigo / `slate-950` accents with the teal token to match the
WeHearYou design language. Keep the admin dense and operational — not a landing page.

---

## Public mini-site rebuild — `/b/[slug]`

Restructured into the spec's section order, each honoring its visibility toggle and hiding
gracefully when its data is empty:

1. **Hero / Location Summary** — name, short description, average rating, total reviews, star
   rating, source badges, Verified-by-WeHearYou badge, address + phone, primary CTA (driven by
   `ctaType` + `ctaLabel`) and secondary CTA (driven by `secondaryCtaType` + `secondaryCtaLabel`,
   hidden when not set).
2. **Trust Summary** — average rating, review count, recent review activity, AI review
   summary (when `showAiReviewSummary`), highlight chips from `reviewHighlights`.
3. **Featured Reviews** — visible public reviews, **featured first** (`isFeatured`), excluding
   `isHiddenFromMiniSite`; supports text reviews and video testimonials; source filter chips
   when enough reviews exist.
4. **Leave a Review** — friendly, conversion-focused prompt with buttons for the sources in
   `enabledReviewSources` (Google / Facebook / Yelp / Trustpilot); falls back to connected
   sources when the list is empty.
5. **Location Info** — address, map preview, directions button, phone, website, hours,
   services/categories (services honor `showServices`).
6. **Footer** — business name, Verified by WeHearYou, optional powered-by (`showPoweredBy`).

### Behavior
- Stable public URL `/b/{slug}`, unchanged on save unless the admin changes the slug.
- Public, no login required.
- Unpublished (`miniSitePublished` false) + not preview → simple "page unavailable" view.
- `?preview=1` (admin iframe) renders unpublished/full content and disables analytics.
- Only approved/visible reviews appear; hidden reviews never appear publicly; featured first.
- No public reviews → clean empty state (not a broken/empty section).
- Sections with missing optional content hide gracefully.
- Accent color applied via a CSS custom property on the page root, defaulting to teal.
- Responsive and polished on mobile.
- Admin preview shares rendering by pointing the iframe at the real route — single source of
  truth for mini-site markup.

---

## Highlight chips

Extend `src/lib/ai-summary.ts` so summary regeneration also emits 3–5 short highlight phrases,
stored in `LocationPublicProfile.reviewHighlights`. The admin can edit/override the list in
Mini Site Settings. Chips are hidden on the public page when the list is empty.

---

## Suggested implementation phases

1. **Foundation** — Prisma migration; `deriveLocationStatus`; `getMiniSiteAnalytics`;
   `getLocationRequestPerformance`; extend `saveLocationSettings` + publish/visibility/review
   server actions. Unit tests for status + aggregation.
2. **Admin command center** — decompose `locations/[id]/page.tsx` into `_components/`; build
   header, summary cards, mini-site preview, reviews panel, request performance, connected
   sources, location details; re-skin to teal.
3. **Public mini-site** — rebuild `/b/[slug]` into the six sections with toggles, accent
   theming, preview mode, unavailable state.
4. **Analytics wiring + AI highlights** — `/api/public/minisite/[slug]/track`,
   `MiniSiteTracker` client component, AI highlight generation.

## Testing

- Unit: `deriveLocationStatus`, `getMiniSiteAnalytics`, `getLocationRequestPerformance`,
  attribution sanitizing for new event types.
- Integration/behavior: publish/unpublish toggles visibility; hidden reviews excluded
  publicly; featured-first ordering; preview mode shows unpublished content + suppresses
  tracking; empty-state cards render `—`.
- Existing tests in `src/lib/*.test.ts` continue to pass; `npm run validate`
  (typecheck + lint + build) is green.
