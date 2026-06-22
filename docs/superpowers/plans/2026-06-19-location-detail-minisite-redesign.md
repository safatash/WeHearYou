# Location Detail Command Center + Mini-Site Redesign — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Rebuild the admin Location Detail page into a location "command center" and the public `/b/{slug}` mini-site into a polished, shareable reputation profile, backed by real publish state and analytics.

**Architecture:** A single Prisma migration adds publish state, mini-site settings fields, a per-review hidden flag, and 6 `MINISITE_*` analytics event types. Pure helper functions (status, setup checklist, analytics summarization, request performance, review filtering, CTA resolution) are TDD'd in `src/lib/*`. The admin page is decomposed from one 765-line file into focused server/client components under `src/app/locations/[id]/_components/`. The public page is rebuilt section-by-section and reused (via `?preview=1`) as the admin preview iframe. Mini-site analytics are captured through a new public POST route that reuses the existing `ReviewLinkEvent` infrastructure.

**Tech Stack:** Next.js 16 (App Router, React 19 server components + server actions), Prisma 6 + PostgreSQL, Tailwind CSS v4 (design tokens in `globals.css`), Node's built-in `node:test` runner with a custom ESM loader.

## Global Constraints

- **Public URL stays `/b/{slug}`** — no route rename, no `/l/` route. The admin "public URL pill" displays the `/b/{slug}` URL.
- **Brand accent is teal `#37AEB7`** via the `--accent` CSS token. Replace incumbent indigo / `slate-950` accents on these two pages with teal. White cards, subtle borders (`--ink-200`), `--shadow-sm`/`--shadow-md` used sparingly, star color `--star`.
- **All new DB fields are optional or defaulted** so existing rows migrate cleanly.
- **Empty metric cards render `—` plus a muted "Tracking starts when published" hint** — never hide the card, never invent numbers.
- **Connected Sources shows all 4 rows** (Google, Facebook, Yelp, Trustpilot). Google + Yelp keep existing functionality; Facebook + Trustpilot render a "Coming soon" connect state with `—` for stats. No new OAuth/API integrations.
- **Hidden reviews (`isHiddenFromMiniSite`) never appear publicly; featured reviews (`isFeatured`) sort first.**
- **Pure logic is TDD'd** with `node:test`. Run a single test file with:
  `node --import ./test-loader.mjs --test src/lib/<file>.test.ts`
  When a test references a Prisma enum value, that value must exist in `test-loader.mjs`'s `PRISMA_ENUMS`. Helpers in this plan use plain string-literal unions (not the Prisma enum) specifically to avoid that coupling.
- **UI/server-component tasks** are verified with `npm run typecheck` and `npm run build` (plus a Playwright smoke where noted), since the repo's test runner only covers pure logic.
- **Commit after every task.** Conventional Commit messages, end every commit body with:
  `Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>`
- Work happens on branch `redesign/location-detail-minisite` (already created).

---

## File Structure

**Created (lib + tests):**
- `src/lib/location-status.ts` / `.test.ts` — `deriveLocationStatus`, `isMiniSiteProfileComplete`.
- `src/lib/minisite-setup.ts` / `.test.ts` — `computeMiniSiteSetupChecklist`.
- `src/lib/request-performance.ts` / `.test.ts` — `computeRequestPerformance`, `getLocationRequestPerformance`.
- `src/lib/minisite-cta.ts` / `.test.ts` — `resolveCta`.
- `src/lib/review-filtering.ts` / `.test.ts` — `filterLocationReviews`, `sortFeaturedFirst`, `reviewNeedsReply`.

**Modified (lib):**
- `src/lib/review-link-analytics.ts` / new `.test.ts` — add `MINISITE_EVENT_TYPES`, `isMiniSiteEventType`, `summarizeMiniSiteEvents`, `getMiniSiteAnalytics`.
- `src/lib/public-profile.ts` — exclude hidden reviews, featured-first ordering.
- `src/lib/ai-summary.ts` — also emit highlight phrases; add `parseHighlights`.
- `src/lib/locations.ts` — re-export `deriveLocationStatus` helpers for page convenience (optional).

**Created (admin components):** `src/app/locations/[id]/_components/`
- `location-header.tsx`, `summary-cards.tsx`, `minisite-preview.tsx` (client),
  `minisite-settings.tsx`, `location-reviews-panel.tsx`, `review-row-actions.tsx` (client),
  `request-performance.tsx`, `connected-sources.tsx`, `location-details-card.tsx`,
  `copy-link-button.tsx` (client).

**Created (public + analytics):**
- `src/app/api/public/minisite/[slug]/track/route.ts` — event POST endpoint.
- `src/components/minisite-tracker.tsx` (client) — beacon + click tracking.
- `src/app/b/[slug]/_components/` — `minisite-hero.tsx`, `trust-summary.tsx`,
  `featured-reviews.tsx`, `leave-a-review.tsx`, `location-info.tsx`, `minisite-footer.tsx`,
  `minisite-unavailable.tsx`, `source-badge.tsx`, `verified-badge.tsx`.

**Modified (pages + actions + schema + loader):**
- `prisma/schema.prisma`, `test-loader.mjs`.
- `src/app/locations/[id]/page.tsx` — recomposed.
- `src/app/locations/actions.ts` — extend `saveLocationSettings`, add publish + review actions.
- `src/app/b/[slug]/page.tsx` — recomposed.

---

# Phase 1 — Foundation (schema + pure logic + server actions)

## Task 1: Prisma migration + loader enum sync

**Files:**
- Modify: `prisma/schema.prisma` (models `Location`, `LocationPublicProfile`, `Review`; enum `ReviewLinkEventType`)
- Modify: `test-loader.mjs:14-23` (`PRISMA_ENUMS.ReviewLinkEventType`)

**Interfaces:**
- Produces: new columns + enum values consumed by every later task.

- [ ] **Step 1: Add `Location` publish fields**

In `prisma/schema.prisma`, inside `model Location`, after the `updatedAt` field add:

```prisma
  miniSitePublished     Boolean       @default(false)
  miniSitePublishedAt   DateTime?
```

- [ ] **Step 2: Add `LocationPublicProfile` fields**

Inside `model LocationPublicProfile`, before `createdAt`, add:

```prisma
  accentColor          String?
  websiteUrl           String?
  timezone             String?
  services             String[]    @default([])
  ctaType              String?     @default("REVIEW")
  secondaryCtaType     String?
  secondaryCtaLabel    String?
  enabledReviewSources String[]    @default([])
  reviewHighlights     String[]    @default([])
  showReviewSummary    Boolean     @default(true)
  showFeaturedReviews  Boolean     @default(true)
  showServices         Boolean     @default(true)
  showSourceBadges     Boolean     @default(true)
  showVerifiedBadge    Boolean     @default(true)
  showPoweredBy        Boolean     @default(true)
```

- [ ] **Step 3: Add `Review` hidden flag**

Inside `model Review`, after `isWidgetVisible`, add:

```prisma
  isHiddenFromMiniSite  Boolean       @default(false)
```

- [ ] **Step 4: Extend the event enum**

In `enum ReviewLinkEventType`, after `FEEDBACK_SUBMITTED`, add:

```prisma
  MINISITE_VIEWED
  MINISITE_CLICK_REVIEW
  MINISITE_CLICK_CALL
  MINISITE_CLICK_WEBSITE
  MINISITE_CLICK_DIRECTIONS
  MINISITE_CLICK_CTA
```

- [ ] **Step 5: Sync the test loader enum**

In `test-loader.mjs`, extend `PRISMA_ENUMS.ReviewLinkEventType` so the object also contains the 6 new keys, each mapping to its own string (e.g. `MINISITE_VIEWED: "MINISITE_VIEWED",`). Keep the existing 6 entries.

- [ ] **Step 6: Validate, migrate, generate**

Run:
```bash
npx prisma validate
npx prisma migrate dev --name minisite_publish_and_analytics
npx prisma generate
```
Expected: validation passes; a new migration is created under `prisma/migrations/`; client regenerates with no errors. (If no dev database is reachable, run `npx prisma migrate diff --from-schema-datasource prisma/schema.prisma --to-schema-datamodel prisma/schema.prisma --script` to confirm the schema is well-formed, and note that `migrate dev` must be run in an environment with the database.)

- [ ] **Step 7: Typecheck**

Run: `npm run typecheck`
Expected: PASS (no references to the new fields yet, but the generated client compiles).

- [ ] **Step 8: Commit**

```bash
git add prisma/schema.prisma prisma/migrations test-loader.mjs
git commit -m "feat(db): add mini-site publish state, settings fields, hidden-review flag, analytics events

Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>"
```

---

## Task 2: `deriveLocationStatus` + profile completeness

**Files:**
- Create: `src/lib/location-status.ts`
- Test: `src/lib/location-status.test.ts`

**Interfaces:**
- Produces:
  - `type LocationStatus = "Active" | "Draft" | "Paused" | "Needs setup"`
  - `isMiniSiteProfileComplete(input: { phone: string | null; websiteUrl: string | null }): boolean`
  - `deriveLocationStatus(input: { miniSitePublished: boolean; miniSitePublishedAt: Date | null; hasConnectedSource: boolean; profileComplete: boolean }): LocationStatus`

- [ ] **Step 1: Write the failing test**

Create `src/lib/location-status.test.ts`:

```ts
import assert from "node:assert/strict";
import test from "node:test";
import { deriveLocationStatus, isMiniSiteProfileComplete } from "./location-status.ts";

test("Active when published with a connected source", () => {
  assert.equal(
    deriveLocationStatus({ miniSitePublished: true, miniSitePublishedAt: new Date(), hasConnectedSource: true, profileComplete: true }),
    "Active",
  );
});

test("Needs setup when no connected source", () => {
  assert.equal(
    deriveLocationStatus({ miniSitePublished: false, miniSitePublishedAt: null, hasConnectedSource: false, profileComplete: true }),
    "Needs setup",
  );
});

test("Needs setup when profile incomplete and unpublished", () => {
  assert.equal(
    deriveLocationStatus({ miniSitePublished: false, miniSitePublishedAt: null, hasConnectedSource: true, profileComplete: false }),
    "Needs setup",
  );
});

test("Draft when set up but never published", () => {
  assert.equal(
    deriveLocationStatus({ miniSitePublished: false, miniSitePublishedAt: null, hasConnectedSource: true, profileComplete: true }),
    "Draft",
  );
});

test("Paused when previously published but now unpublished", () => {
  assert.equal(
    deriveLocationStatus({ miniSitePublished: false, miniSitePublishedAt: new Date(), hasConnectedSource: true, profileComplete: true }),
    "Paused",
  );
});

test("isMiniSiteProfileComplete requires phone and website", () => {
  assert.equal(isMiniSiteProfileComplete({ phone: "555", websiteUrl: "https://x.com" }), true);
  assert.equal(isMiniSiteProfileComplete({ phone: null, websiteUrl: "https://x.com" }), false);
  assert.equal(isMiniSiteProfileComplete({ phone: "555", websiteUrl: null }), false);
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `node --import ./test-loader.mjs --test src/lib/location-status.test.ts`
Expected: FAIL — `Cannot find module './location-status.ts'`.

- [ ] **Step 3: Write minimal implementation**

Create `src/lib/location-status.ts`:

```ts
export type LocationStatus = "Active" | "Draft" | "Paused" | "Needs setup";

export function isMiniSiteProfileComplete(input: {
  phone: string | null;
  websiteUrl: string | null;
}): boolean {
  return Boolean(input.phone?.trim()) && Boolean(input.websiteUrl?.trim());
}

export function deriveLocationStatus(input: {
  miniSitePublished: boolean;
  miniSitePublishedAt: Date | null;
  hasConnectedSource: boolean;
  profileComplete: boolean;
}): LocationStatus {
  if (input.miniSitePublished && input.hasConnectedSource) return "Active";
  if (!input.hasConnectedSource || !input.profileComplete) return "Needs setup";
  if (input.miniSitePublishedAt) return "Paused";
  return "Draft";
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `node --import ./test-loader.mjs --test src/lib/location-status.test.ts`
Expected: PASS (6 tests).

- [ ] **Step 5: Commit**

```bash
git add src/lib/location-status.ts src/lib/location-status.test.ts
git commit -m "feat(lib): derive location status from publish state and setup

Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>"
```

---

## Task 3: Mini-site setup checklist

**Files:**
- Create: `src/lib/minisite-setup.ts`
- Test: `src/lib/minisite-setup.test.ts`

**Interfaces:**
- Produces:
  - `type SetupChecklistItem = { key: "phone" | "website" | "source" | "featured" | "publish"; label: string; done: boolean }`
  - `computeMiniSiteSetupChecklist(input: { phone: string | null; websiteUrl: string | null; hasConnectedSource: boolean; hasFeaturedReview: boolean; miniSitePublished: boolean }): SetupChecklistItem[]`

- [ ] **Step 1: Write the failing test**

Create `src/lib/minisite-setup.test.ts`:

```ts
import assert from "node:assert/strict";
import test from "node:test";
import { computeMiniSiteSetupChecklist } from "./minisite-setup.ts";

const full = { phone: "555", websiteUrl: "https://x.com", hasConnectedSource: true, hasFeaturedReview: true, miniSitePublished: true };

test("all items done when fully set up and published", () => {
  const items = computeMiniSiteSetupChecklist(full);
  assert.equal(items.length, 5);
  assert.ok(items.every((i) => i.done));
});

test("flags each missing item", () => {
  const items = computeMiniSiteSetupChecklist({ ...full, phone: null, hasConnectedSource: false, miniSitePublished: false });
  const byKey = Object.fromEntries(items.map((i) => [i.key, i.done]));
  assert.equal(byKey.phone, false);
  assert.equal(byKey.website, true);
  assert.equal(byKey.source, false);
  assert.equal(byKey.featured, true);
  assert.equal(byKey.publish, false);
});

test("items are in setup order", () => {
  const keys = computeMiniSiteSetupChecklist(full).map((i) => i.key);
  assert.deepEqual(keys, ["phone", "website", "source", "featured", "publish"]);
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `node --import ./test-loader.mjs --test src/lib/minisite-setup.test.ts`
Expected: FAIL — module not found.

- [ ] **Step 3: Write minimal implementation**

Create `src/lib/minisite-setup.ts`:

```ts
export type SetupChecklistItem = {
  key: "phone" | "website" | "source" | "featured" | "publish";
  label: string;
  done: boolean;
};

export function computeMiniSiteSetupChecklist(input: {
  phone: string | null;
  websiteUrl: string | null;
  hasConnectedSource: boolean;
  hasFeaturedReview: boolean;
  miniSitePublished: boolean;
}): SetupChecklistItem[] {
  return [
    { key: "phone", label: "Add phone number", done: Boolean(input.phone?.trim()) },
    { key: "website", label: "Add website", done: Boolean(input.websiteUrl?.trim()) },
    { key: "source", label: "Connect review source", done: input.hasConnectedSource },
    { key: "featured", label: "Select featured reviews", done: input.hasFeaturedReview },
    { key: "publish", label: "Publish mini page", done: input.miniSitePublished },
  ];
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `node --import ./test-loader.mjs --test src/lib/minisite-setup.test.ts`
Expected: PASS (3 tests).

- [ ] **Step 5: Commit**

```bash
git add src/lib/minisite-setup.ts src/lib/minisite-setup.test.ts
git commit -m "feat(lib): compute mini-site setup checklist

Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>"
```

---

## Task 4: Mini-site analytics summarization + DB wrapper

**Files:**
- Modify: `src/lib/review-link-analytics.ts`
- Test: `src/lib/minisite-analytics.test.ts`

**Interfaces:**
- Consumes: existing `prisma.reviewLinkEvent.groupBy` (from this module's imports).
- Produces:
  - `const MINISITE_EVENT_TYPES: readonly string[]`
  - `type MiniSiteEventType = "MINISITE_VIEWED" | "MINISITE_CLICK_REVIEW" | "MINISITE_CLICK_CALL" | "MINISITE_CLICK_WEBSITE" | "MINISITE_CLICK_DIRECTIONS" | "MINISITE_CLICK_CTA"`
  - `isMiniSiteEventType(v: string): v is MiniSiteEventType`
  - `type MiniSiteAnalytics = { pageViews: number; reviewClicks: number; callClicks: number; websiteClicks: number; directionsClicks: number; ctaClicks: number; hasData: boolean }`
  - `summarizeMiniSiteEvents(rows: Array<{ eventType: string; count: number }>): MiniSiteAnalytics`
  - `getMiniSiteAnalytics(locationId: string, days: number): Promise<MiniSiteAnalytics>`

- [ ] **Step 1: Write the failing test**

Create `src/lib/minisite-analytics.test.ts`:

```ts
import assert from "node:assert/strict";
import test from "node:test";
import { summarizeMiniSiteEvents, isMiniSiteEventType } from "./review-link-analytics.ts";

test("summarizes counts by event type", () => {
  const result = summarizeMiniSiteEvents([
    { eventType: "MINISITE_VIEWED", count: 10 },
    { eventType: "MINISITE_CLICK_CALL", count: 3 },
    { eventType: "MINISITE_CLICK_WEBSITE", count: 2 },
    { eventType: "MINISITE_CLICK_DIRECTIONS", count: 1 },
    { eventType: "MINISITE_CLICK_REVIEW", count: 4 },
    { eventType: "MINISITE_CLICK_CTA", count: 5 },
  ]);
  assert.equal(result.pageViews, 10);
  assert.equal(result.callClicks, 3);
  assert.equal(result.websiteClicks, 2);
  assert.equal(result.directionsClicks, 1);
  assert.equal(result.reviewClicks, 4);
  assert.equal(result.ctaClicks, 5);
  assert.equal(result.hasData, true);
});

test("hasData is false when there are no events", () => {
  const result = summarizeMiniSiteEvents([]);
  assert.equal(result.pageViews, 0);
  assert.equal(result.hasData, false);
});

test("ignores unrelated event types", () => {
  const result = summarizeMiniSiteEvents([{ eventType: "LINK_VIEWED", count: 99 }]);
  assert.equal(result.pageViews, 0);
  assert.equal(result.hasData, false);
});

test("isMiniSiteEventType guards the MINISITE_* set", () => {
  assert.equal(isMiniSiteEventType("MINISITE_VIEWED"), true);
  assert.equal(isMiniSiteEventType("LINK_VIEWED"), false);
  assert.equal(isMiniSiteEventType("garbage"), false);
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `node --import ./test-loader.mjs --test src/lib/minisite-analytics.test.ts`
Expected: FAIL — `summarizeMiniSiteEvents` is not exported.

- [ ] **Step 3: Write the implementation**

Append to `src/lib/review-link-analytics.ts`:

```ts
export type MiniSiteEventType =
  | "MINISITE_VIEWED"
  | "MINISITE_CLICK_REVIEW"
  | "MINISITE_CLICK_CALL"
  | "MINISITE_CLICK_WEBSITE"
  | "MINISITE_CLICK_DIRECTIONS"
  | "MINISITE_CLICK_CTA";

export const MINISITE_EVENT_TYPES: readonly MiniSiteEventType[] = [
  "MINISITE_VIEWED",
  "MINISITE_CLICK_REVIEW",
  "MINISITE_CLICK_CALL",
  "MINISITE_CLICK_WEBSITE",
  "MINISITE_CLICK_DIRECTIONS",
  "MINISITE_CLICK_CTA",
];

export function isMiniSiteEventType(v: string): v is MiniSiteEventType {
  return (MINISITE_EVENT_TYPES as readonly string[]).includes(v);
}

export type MiniSiteAnalytics = {
  pageViews: number;
  reviewClicks: number;
  callClicks: number;
  websiteClicks: number;
  directionsClicks: number;
  ctaClicks: number;
  hasData: boolean;
};

export function summarizeMiniSiteEvents(
  rows: Array<{ eventType: string; count: number }>,
): MiniSiteAnalytics {
  const get = (type: MiniSiteEventType) =>
    rows.find((r) => r.eventType === type)?.count ?? 0;
  const summary = {
    pageViews: get("MINISITE_VIEWED"),
    reviewClicks: get("MINISITE_CLICK_REVIEW"),
    callClicks: get("MINISITE_CLICK_CALL"),
    websiteClicks: get("MINISITE_CLICK_WEBSITE"),
    directionsClicks: get("MINISITE_CLICK_DIRECTIONS"),
    ctaClicks: get("MINISITE_CLICK_CTA"),
  };
  const hasData = Object.values(summary).some((n) => n > 0);
  return { ...summary, hasData };
}

export async function getMiniSiteAnalytics(
  locationId: string,
  days: number,
): Promise<MiniSiteAnalytics> {
  const since = new Date(Date.now() - days * 24 * 60 * 60 * 1000);
  const grouped = await prisma.reviewLinkEvent.groupBy({
    by: ["eventType"],
    where: {
      locationId,
      createdAt: { gte: since },
      eventType: { in: MINISITE_EVENT_TYPES as unknown as ReviewLinkEventType[] },
    },
    _count: { eventType: true },
  });
  return summarizeMiniSiteEvents(
    grouped.map((row) => ({ eventType: row.eventType as string, count: row._count.eventType })),
  );
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `node --import ./test-loader.mjs --test src/lib/minisite-analytics.test.ts`
Expected: PASS (4 tests).

- [ ] **Step 5: Verify the existing analytics tests still pass + typecheck**

Run:
```bash
node --import ./test-loader.mjs --test src/lib/review-link-analytics.test.ts 2>/dev/null || true
npm run typecheck
```
Expected: typecheck PASS. (If no `review-link-analytics.test.ts` exists, the first command no-ops.)

- [ ] **Step 6: Commit**

```bash
git add src/lib/review-link-analytics.ts src/lib/minisite-analytics.test.ts
git commit -m "feat(lib): summarize and aggregate mini-site analytics events

Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>"
```

---

## Task 5: Request performance computation

**Files:**
- Create: `src/lib/request-performance.ts`
- Test: `src/lib/request-performance.test.ts`

**Interfaces:**
- Produces:
  - `type RequestPerformance = { requestsSent: number; openRate: number | null; clickRate: number | null; conversionRate: number | null; bestChannel: string | null; latestCampaignName: string | null; lastRequestSentAt: Date | null; hasData: boolean }`
  - `type RequestRecipientInput = { sentAt: Date | null; openedAt: Date | null; completedAt: Date | null; channel: string }`
  - `computeRequestPerformance(input: { recipients: RequestRecipientInput[]; campaigns: Array<{ name: string; createdAt: Date }> }): RequestPerformance`
  - `getLocationRequestPerformance(location: { campaigns: Array<{ name: string; channel: string; createdAt: Date; recipients: Array<{ sentAt: Date | null; openedAt: Date | null; completedAt: Date | null }> }> }): RequestPerformance`

Note: `openRate`/`clickRate`/`conversionRate` are fractions in `[0,1]` over recipients with a `sentAt`. `clickRate` and `conversionRate` are both derived from `completedAt` (the funnel has a single completion signal); they share a value but are surfaced under both labels the spec requests.

- [ ] **Step 1: Write the failing test**

Create `src/lib/request-performance.test.ts`:

```ts
import assert from "node:assert/strict";
import test from "node:test";
import { computeRequestPerformance, getLocationRequestPerformance } from "./request-performance.ts";

const d = (s: string) => new Date(s);

test("computes rates over sent recipients", () => {
  const r = computeRequestPerformance({
    recipients: [
      { sentAt: d("2026-06-01"), openedAt: d("2026-06-01"), completedAt: d("2026-06-02"), channel: "SMS" },
      { sentAt: d("2026-06-01"), openedAt: d("2026-06-01"), completedAt: null, channel: "EMAIL" },
      { sentAt: d("2026-06-01"), openedAt: null, completedAt: null, channel: "SMS" },
      { sentAt: null, openedAt: null, completedAt: null, channel: "SMS" },
    ],
    campaigns: [{ name: "June push", createdAt: d("2026-06-01") }],
  });
  assert.equal(r.requestsSent, 3);
  assert.equal(r.openRate, 2 / 3);
  assert.equal(r.conversionRate, 1 / 3);
  assert.equal(r.clickRate, 1 / 3);
  assert.equal(r.bestChannel, "SMS");
  assert.equal(r.latestCampaignName, "June push");
  assert.equal(r.hasData, true);
});

test("hasData false and null rates when nothing sent", () => {
  const r = computeRequestPerformance({ recipients: [], campaigns: [] });
  assert.equal(r.requestsSent, 0);
  assert.equal(r.openRate, null);
  assert.equal(r.bestChannel, null);
  assert.equal(r.hasData, false);
});

test("bestChannel picks highest conversion", () => {
  const r = computeRequestPerformance({
    recipients: [
      { sentAt: d("2026-06-01"), openedAt: d("2026-06-01"), completedAt: d("2026-06-02"), channel: "EMAIL" },
      { sentAt: d("2026-06-01"), openedAt: d("2026-06-01"), completedAt: null, channel: "SMS" },
    ],
    campaigns: [],
  });
  assert.equal(r.bestChannel, "EMAIL");
});

test("getLocationRequestPerformance flattens campaign recipients", () => {
  const r = getLocationRequestPerformance({
    campaigns: [
      { name: "C1", channel: "SMS", createdAt: d("2026-06-01"), recipients: [
        { sentAt: d("2026-06-01"), openedAt: d("2026-06-01"), completedAt: d("2026-06-02") },
      ] },
    ],
  });
  assert.equal(r.requestsSent, 1);
  assert.equal(r.bestChannel, "SMS");
  assert.equal(r.lastRequestSentAt?.toISOString(), d("2026-06-01").toISOString());
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `node --import ./test-loader.mjs --test src/lib/request-performance.test.ts`
Expected: FAIL — module not found.

- [ ] **Step 3: Write the implementation**

Create `src/lib/request-performance.ts`:

```ts
export type RequestRecipientInput = {
  sentAt: Date | null;
  openedAt: Date | null;
  completedAt: Date | null;
  channel: string;
};

export type RequestPerformance = {
  requestsSent: number;
  openRate: number | null;
  clickRate: number | null;
  conversionRate: number | null;
  bestChannel: string | null;
  latestCampaignName: string | null;
  lastRequestSentAt: Date | null;
  hasData: boolean;
};

export function computeRequestPerformance(input: {
  recipients: RequestRecipientInput[];
  campaigns: Array<{ name: string; createdAt: Date }>;
}): RequestPerformance {
  const sent = input.recipients.filter((r) => r.sentAt);
  const requestsSent = sent.length;

  const ratio = (n: number) => (requestsSent ? n / requestsSent : null);
  const opened = sent.filter((r) => r.openedAt).length;
  const completed = sent.filter((r) => r.completedAt).length;

  // Best channel by conversion (completed / sent within channel).
  const byChannel = new Map<string, { sent: number; completed: number }>();
  for (const r of sent) {
    const agg = byChannel.get(r.channel) ?? { sent: 0, completed: 0 };
    agg.sent += 1;
    if (r.completedAt) agg.completed += 1;
    byChannel.set(r.channel, agg);
  }
  let bestChannel: string | null = null;
  let bestRate = -1;
  for (const [channel, agg] of byChannel) {
    const rate = agg.completed / agg.sent;
    if (rate > bestRate) {
      bestRate = rate;
      bestChannel = channel;
    }
  }

  const latestCampaign = [...input.campaigns].sort(
    (a, b) => b.createdAt.getTime() - a.createdAt.getTime(),
  )[0];
  const lastRequestSentAt = sent
    .map((r) => r.sentAt as Date)
    .sort((a, b) => b.getTime() - a.getTime())[0] ?? null;

  return {
    requestsSent,
    openRate: ratio(opened),
    clickRate: ratio(completed),
    conversionRate: ratio(completed),
    bestChannel,
    latestCampaignName: latestCampaign?.name ?? null,
    lastRequestSentAt,
    hasData: requestsSent > 0,
  };
}

export function getLocationRequestPerformance(location: {
  campaigns: Array<{
    name: string;
    channel: string;
    createdAt: Date;
    recipients: Array<{ sentAt: Date | null; openedAt: Date | null; completedAt: Date | null }>;
  }>;
}): RequestPerformance {
  const recipients: RequestRecipientInput[] = location.campaigns.flatMap((c) =>
    c.recipients.map((r) => ({ ...r, channel: c.channel })),
  );
  return computeRequestPerformance({
    recipients,
    campaigns: location.campaigns.map((c) => ({ name: c.name, createdAt: c.createdAt })),
  });
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `node --import ./test-loader.mjs --test src/lib/request-performance.test.ts`
Expected: PASS (4 tests).

- [ ] **Step 5: Commit**

```bash
git add src/lib/request-performance.ts src/lib/request-performance.test.ts
git commit -m "feat(lib): compute review-request performance for a location

Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>"
```

---

## Task 6: Review filtering + featured-first ordering

**Files:**
- Create: `src/lib/review-filtering.ts`
- Test: `src/lib/review-filtering.test.ts`

**Interfaces:**
- Produces:
  - `type ReviewFilter = "all" | "needs-reply" | "featured" | "hidden" | "5" | "4" | "1-3" | "google" | "facebook" | "yelp" | "trustpilot"`
  - `type FilterableReview = { rating: number | null; source: string; isFeatured: boolean; isHiddenFromMiniSite: boolean; replyPublishedAt: Date | null; replySentAt: Date | null }`
  - `reviewNeedsReply(r: Pick<FilterableReview, "replyPublishedAt" | "replySentAt">): boolean`
  - `filterLocationReviews<T extends FilterableReview>(reviews: T[], filter: ReviewFilter): T[]`
  - `sortFeaturedFirst<T extends { isFeatured: boolean }>(reviews: T[]): T[]`
  - `REVIEW_FILTERS: ReadonlyArray<{ value: ReviewFilter; label: string }>`

- [ ] **Step 1: Write the failing test**

Create `src/lib/review-filtering.test.ts`:

```ts
import assert from "node:assert/strict";
import test from "node:test";
import { filterLocationReviews, sortFeaturedFirst, reviewNeedsReply } from "./review-filtering.ts";

const make = (over: Partial<Parameters<typeof filterLocationReviews>[0][number]>) => ({
  rating: 5, source: "GOOGLE", isFeatured: false, isHiddenFromMiniSite: false,
  replyPublishedAt: null, replySentAt: null, ...over,
});

test("needs-reply selects reviews with no reply", () => {
  const reviews = [make({ replyPublishedAt: new Date() }), make({})];
  assert.equal(filterLocationReviews(reviews, "needs-reply").length, 1);
});

test("rating buckets", () => {
  const reviews = [make({ rating: 5 }), make({ rating: 4 }), make({ rating: 2 }), make({ rating: 1 })];
  assert.equal(filterLocationReviews(reviews, "5").length, 1);
  assert.equal(filterLocationReviews(reviews, "4").length, 1);
  assert.equal(filterLocationReviews(reviews, "1-3").length, 2);
});

test("source filter is case-insensitive", () => {
  const reviews = [make({ source: "GOOGLE" }), make({ source: "YELP" })];
  assert.equal(filterLocationReviews(reviews, "google").length, 1);
  assert.equal(filterLocationReviews(reviews, "yelp").length, 1);
});

test("featured and hidden filters", () => {
  const reviews = [make({ isFeatured: true }), make({ isHiddenFromMiniSite: true }), make({})];
  assert.equal(filterLocationReviews(reviews, "featured").length, 1);
  assert.equal(filterLocationReviews(reviews, "hidden").length, 1);
  assert.equal(filterLocationReviews(reviews, "all").length, 3);
});

test("sortFeaturedFirst is stable and puts featured first", () => {
  const a = make({ isFeatured: false }); const b = make({ isFeatured: true }); const c = make({ isFeatured: false });
  const sorted = sortFeaturedFirst([a, b, c]);
  assert.deepEqual(sorted, [b, a, c]);
});

test("reviewNeedsReply", () => {
  assert.equal(reviewNeedsReply({ replyPublishedAt: null, replySentAt: null }), true);
  assert.equal(reviewNeedsReply({ replyPublishedAt: new Date(), replySentAt: null }), false);
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `node --import ./test-loader.mjs --test src/lib/review-filtering.test.ts`
Expected: FAIL — module not found.

- [ ] **Step 3: Write the implementation**

Create `src/lib/review-filtering.ts`:

```ts
export type ReviewFilter =
  | "all" | "needs-reply" | "featured" | "hidden"
  | "5" | "4" | "1-3"
  | "google" | "facebook" | "yelp" | "trustpilot";

export type FilterableReview = {
  rating: number | null;
  source: string;
  isFeatured: boolean;
  isHiddenFromMiniSite: boolean;
  replyPublishedAt: Date | null;
  replySentAt: Date | null;
};

export const REVIEW_FILTERS: ReadonlyArray<{ value: ReviewFilter; label: string }> = [
  { value: "all", label: "All" },
  { value: "needs-reply", label: "Needs reply" },
  { value: "featured", label: "Featured" },
  { value: "hidden", label: "Hidden from public page" },
  { value: "5", label: "5-star" },
  { value: "4", label: "4-star" },
  { value: "1-3", label: "1-3 star" },
  { value: "google", label: "Google" },
  { value: "facebook", label: "Facebook" },
  { value: "yelp", label: "Yelp" },
  { value: "trustpilot", label: "Trustpilot" },
];

export function reviewNeedsReply(r: { replyPublishedAt: Date | null; replySentAt: Date | null }): boolean {
  return !r.replyPublishedAt && !r.replySentAt;
}

export function filterLocationReviews<T extends FilterableReview>(reviews: T[], filter: ReviewFilter): T[] {
  switch (filter) {
    case "all": return reviews;
    case "needs-reply": return reviews.filter(reviewNeedsReply);
    case "featured": return reviews.filter((r) => r.isFeatured);
    case "hidden": return reviews.filter((r) => r.isHiddenFromMiniSite);
    case "5": return reviews.filter((r) => r.rating === 5);
    case "4": return reviews.filter((r) => r.rating === 4);
    case "1-3": return reviews.filter((r) => (r.rating ?? 0) >= 1 && (r.rating ?? 0) <= 3);
    case "google":
    case "facebook":
    case "yelp":
    case "trustpilot":
      return reviews.filter((r) => r.source.toLowerCase() === filter);
    default: return reviews;
  }
}

export function sortFeaturedFirst<T extends { isFeatured: boolean }>(reviews: T[]): T[] {
  return [...reviews].sort((a, b) => Number(b.isFeatured) - Number(a.isFeatured));
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `node --import ./test-loader.mjs --test src/lib/review-filtering.test.ts`
Expected: PASS (6 tests).

- [ ] **Step 5: Commit**

```bash
git add src/lib/review-filtering.ts src/lib/review-filtering.test.ts
git commit -m "feat(lib): location review filtering and featured-first ordering

Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>"
```

---

## Task 7: Exclude hidden reviews + featured-first on the public profile

**Files:**
- Modify: `src/lib/public-profile.ts:31-47`
- Test: `src/lib/public-profile.test.ts`

**Interfaces:**
- Consumes: `sortFeaturedFirst` from Task 6.
- Produces: `getVisiblePublicReviews` now excludes `isHiddenFromMiniSite` and returns featured-first.

- [ ] **Step 1: Write the failing test**

Create `src/lib/public-profile.test.ts`. Because the real functions take a Prisma payload, test the two behaviors with a minimal duck-typed object cast to the expected type:

```ts
import assert from "node:assert/strict";
import test from "node:test";
import { getVisiblePublicReviews } from "./public-profile.ts";

function loc(reviews: unknown[]) {
  return { publicProfile: { showReviews: true }, reviews } as unknown as Parameters<typeof getVisiblePublicReviews>[0];
}
const review = (over: Record<string, unknown>) => ({
  isTestimonial: false, source: "GOOGLE", isFeatured: false, isHiddenFromMiniSite: false, rating: 5, ...over,
});

test("excludes reviews hidden from mini site", () => {
  const result = getVisiblePublicReviews(loc([review({ id: "a" }), review({ id: "b", isHiddenFromMiniSite: true })]));
  assert.deepEqual(result.map((r) => r.id), ["a"]);
});

test("returns featured reviews first", () => {
  const result = getVisiblePublicReviews(loc([
    review({ id: "a", isFeatured: false }),
    review({ id: "b", isFeatured: true }),
  ]));
  assert.deepEqual(result.map((r) => r.id), ["b", "a"]);
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `node --import ./test-loader.mjs --test src/lib/public-profile.test.ts`
Expected: FAIL — hidden review still present / order unchanged.

- [ ] **Step 3: Implement**

In `src/lib/public-profile.ts`, add the import at the top:

```ts
import { sortFeaturedFirst } from "@/lib/review-filtering";
```

Replace the body of `getVisiblePublicReviews` (lines 31-38) with:

```ts
export function getVisiblePublicReviews(location: PublicLocationProfile) {
  const showReviews = location.publicProfile?.showReviews ?? true;
  if (!showReviews) {
    return [];
  }

  const visible = location.reviews.filter(
    (review) =>
      !review.isTestimonial &&
      !review.isHiddenFromMiniSite &&
      (review.source === "GOOGLE" || review.source === "FACEBOOK" || review.source === "INTERNAL"),
  );
  return sortFeaturedFirst(visible);
}
```

Also update `getVisibleTestimonials` (line 46) to exclude hidden testimonials by adding `&& !review.isHiddenFromMiniSite` to its filter predicate.

- [ ] **Step 4: Run test to verify it passes**

Run: `node --import ./test-loader.mjs --test src/lib/public-profile.test.ts`
Expected: PASS (2 tests).

- [ ] **Step 5: Typecheck + existing tests**

Run:
```bash
npm run typecheck
node --import ./test-loader.mjs --test src/lib/seo.test.ts
```
Expected: typecheck PASS; seo tests still PASS (they build on public-profile types).

- [ ] **Step 6: Commit**

```bash
git add src/lib/public-profile.ts src/lib/public-profile.test.ts
git commit -m "feat(lib): hide hidden reviews and surface featured first on public profile

Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>"
```

---

## Task 8: Server actions — extend settings, add publish + review toggles

**Files:**
- Modify: `src/app/locations/actions.ts`

**Interfaces:**
- Consumes: existing `saveLocationSettings` and its auth/guard helpers in this file.
- Produces (all `(formData: FormData) => Promise<void>` server actions usable as `<form action={...}>`):
  - `toggleMiniSitePublish` — reads `locationId`, `publish` (`"true"`/`"false"`); sets `miniSitePublished` and, when publishing for the first time or republishing, `miniSitePublishedAt = new Date()`.
  - `setReviewFeatured` — reads `reviewId`, `featured`.
  - `setReviewHiddenFromMiniSite` — reads `reviewId`, `hidden`.
  - `setReviewWidgetVisible` — reads `reviewId`, `visible`.
  - `saveLocationSettings` now also persists: `accentColor`, `websiteUrl`, `timezone`, `services` (comma-split), `ctaType`, `secondaryCtaType`, `secondaryCtaLabel`, `enabledReviewSources` (multi-value), `showReviewSummary`, `showFeaturedReviews`, `showServices`, `showSourceBadges`, `showVerifiedBadge`, `showPoweredBy`.

- [ ] **Step 1: Read the existing action to match its patterns**

Run: `grep -n "saveLocationSettings\|requireLocationAccess\|revalidatePath\|upsert\|publicProfile" src/app/locations/actions.ts | head -40`
Note the auth guard used (e.g. `requireLocationAccess`), how the `publicProfile` upsert is built, and the `revalidatePath` calls. The new fields go into the same `publicProfile.upsert` `create`/`update` payloads.

- [ ] **Step 2: Extend `saveLocationSettings`**

In the `publicProfile.upsert` call inside `saveLocationSettings`, add these parsed fields to BOTH the `create` and `update` objects (read with the same `formData.get(...)` style already used in the function):

```ts
        accentColor: (formData.get("accentColor") as string)?.trim() || null,
        websiteUrl: (formData.get("websiteUrl") as string)?.trim() || null,
        timezone: (formData.get("timezone") as string)?.trim() || null,
        services: ((formData.get("services") as string) ?? "")
          .split(",").map((s) => s.trim()).filter(Boolean),
        ctaType: (formData.get("ctaType") as string) || "REVIEW",
        secondaryCtaType: (formData.get("secondaryCtaType") as string)?.trim() || null,
        secondaryCtaLabel: (formData.get("secondaryCtaLabel") as string)?.trim() || null,
        enabledReviewSources: formData.getAll("enabledReviewSources").map(String),
        showReviewSummary: formData.get("showReviewSummary") === "on" || formData.get("showReviewSummary") === "true",
        showFeaturedReviews: formData.get("showFeaturedReviews") === "on" || formData.get("showFeaturedReviews") === "true",
        showServices: formData.get("showServices") === "on" || formData.get("showServices") === "true",
        showSourceBadges: formData.get("showSourceBadges") === "on" || formData.get("showSourceBadges") === "true",
        showVerifiedBadge: formData.get("showVerifiedBadge") === "on" || formData.get("showVerifiedBadge") === "true",
        showPoweredBy: formData.get("showPoweredBy") === "on" || formData.get("showPoweredBy") === "true",
```

(Match the surrounding quoting/spacing style of the existing fields in that upsert.)

- [ ] **Step 3: Add the new actions**

At the end of `src/app/locations/actions.ts`, add (reusing the file's existing auth-guard import — substitute the real guard name found in Step 1 for `requireLocationAccess`):

```ts
export async function toggleMiniSitePublish(formData: FormData): Promise<void> {
  const locationId = String(formData.get("locationId"));
  const publish = formData.get("publish") === "true";
  await requireLocationAccess(locationId);
  await prisma.location.update({
    where: { id: locationId },
    data: {
      miniSitePublished: publish,
      ...(publish ? { miniSitePublishedAt: new Date() } : {}),
    },
  });
  revalidatePath(`/locations/${locationId}`);
  revalidatePath("/locations");
}

async function setReviewFlag(reviewId: string, data: Record<string, boolean>): Promise<string> {
  const review = await prisma.review.findUnique({ where: { id: reviewId }, select: { locationId: true } });
  if (!review) throw new Error("Review not found");
  await requireLocationAccess(review.locationId);
  await prisma.review.update({ where: { id: reviewId }, data });
  revalidatePath(`/locations/${review.locationId}`);
  return review.locationId;
}

export async function setReviewFeatured(formData: FormData): Promise<void> {
  await setReviewFlag(String(formData.get("reviewId")), { isFeatured: formData.get("featured") === "true" });
}

export async function setReviewHiddenFromMiniSite(formData: FormData): Promise<void> {
  await setReviewFlag(String(formData.get("reviewId")), { isHiddenFromMiniSite: formData.get("hidden") === "true" });
}

export async function setReviewWidgetVisible(formData: FormData): Promise<void> {
  await setReviewFlag(String(formData.get("reviewId")), { isWidgetVisible: formData.get("visible") === "true" });
}
```

If `prisma`, `revalidatePath`, or the auth guard are not already imported in this file, add the imports (`import { prisma } from "@/lib/prisma";`, `import { revalidatePath } from "next/cache";`, and the guard from its module).

- [ ] **Step 4: Typecheck**

Run: `npm run typecheck`
Expected: PASS. Fix any type errors (e.g. real guard name, exact field names) before continuing.

- [ ] **Step 5: Commit**

```bash
git add src/app/locations/actions.ts
git commit -m "feat(actions): persist mini-site settings, publish toggle, review flags

Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>"
```

---

# Phase 2 — Admin command center

> All Phase 2 components use design tokens from `globals.css`: cards are
> `rounded-2xl border border-[var(--ink-200)] bg-white shadow-[var(--shadow-sm)]`;
> the accent is `text-[var(--accent)]` / `bg-[var(--accent)]`; stars use `text-[var(--star)]`.
> Reference the existing `src/components/ui.tsx` (`StatCard`, `Field`, `SectionHeading`),
> `src/components/copy-button.tsx`, `src/components/status-badge.tsx`, and
> `src/components/app-shell.tsx` for established patterns. The page stays wrapped in
> `<AppShell activeScreen="locations">`.

## Task 9: Copy-link button + status badge wiring

**Files:**
- Create: `src/app/locations/[id]/_components/copy-link-button.tsx`
- Test: smoke via typecheck/build (client component).

**Interfaces:**
- Produces: `<CopyLinkButton url={string} label?={string} className?={string} />` — a `"use client"` button that calls `navigator.clipboard.writeText(url)` and briefly swaps its label to "Copied".

- [ ] **Step 1: Implement**

```tsx
"use client";
import { useState } from "react";

export function CopyLinkButton({ url, label = "Copy public link", className = "" }: { url: string; label?: string; className?: string }) {
  const [copied, setCopied] = useState(false);
  return (
    <button
      type="button"
      onClick={async () => {
        await navigator.clipboard.writeText(url);
        setCopied(true);
        setTimeout(() => setCopied(false), 1500);
      }}
      className={className || "inline-flex items-center gap-2 rounded-xl border border-[var(--ink-200)] bg-white px-3 py-2 text-sm font-semibold text-[var(--ink-700)] hover:bg-[var(--ink-50)] transition"}
    >
      {copied ? "Copied ✓" : label}
    </button>
  );
}
```

- [ ] **Step 2: Typecheck**

Run: `npm run typecheck`
Expected: PASS.

- [ ] **Step 3: Commit**

```bash
git add src/app/locations/[id]/_components/copy-link-button.tsx
git commit -m "feat(locations): add copy-link button component

Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>"
```

---

## Task 10: Location header

**Files:**
- Create: `src/app/locations/[id]/_components/location-header.tsx`

**Interfaces:**
- Consumes: `deriveLocationStatus`/`isMiniSiteProfileComplete` (Task 2), `CopyLinkButton` (Task 9).
- Produces: `<LocationHeader location={LocationDetailData} publicUrl={string} status={LocationStatus} />` where `LocationDetailData` is the value returned by `getLocationById` (Task 1's enriched type). Header renders: back link, name, status badge, full address, connected-source mini-badges, avg rating + total reviews, the public-URL pill (with `CopyLinkButton`), and the action buttons (Copy public link, Open public page, Customize mini site `<a href="#minisite-settings">`, Edit location, Send review request, Manage sources).

- [ ] **Step 1: Implement**

Create the component as a server component. Key structure (use real tokens; fill addresses/rating from `location`):

```tsx
import Link from "next/link";
import type { LocationStatus } from "@/lib/location-status";
import { CopyLinkButton } from "./copy-link-button";

const STATUS_STYLES: Record<LocationStatus, string> = {
  Active: "bg-[var(--success-soft)] text-[#047857]",
  Draft: "bg-[var(--ink-100)] text-[var(--ink-600)]",
  Paused: "bg-[var(--warning-soft)] text-[#92400e]",
  "Needs setup": "bg-[var(--danger-soft)] text-[#b91c1c]",
};

export function LocationHeader({
  location, publicUrl, status, connectedSources, avgRating, totalReviews,
}: {
  location: { id: string; name: string; slug: string; city: string; state: string };
  publicUrl: string;
  status: LocationStatus;
  connectedSources: string[];
  avgRating: number | null;
  totalReviews: number;
}) {
  return (
    <header className="rounded-2xl border border-[var(--ink-200)] bg-white p-6 shadow-[var(--shadow-sm)]">
      <Link href="/locations" className="text-sm font-semibold text-[var(--accent)]">← All locations</Link>
      <div className="mt-3 flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
        <div>
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-semibold tracking-tight text-[var(--ink-900)]">{location.name}</h1>
            <span className={`rounded-full px-3 py-1 text-xs font-semibold ${STATUS_STYLES[status]}`}>{status}</span>
          </div>
          <p className="mt-1 text-sm text-[var(--ink-500)]">{location.city}, {location.state}</p>
          <div className="mt-2 flex items-center gap-2 text-sm">
            <span className="font-semibold text-[var(--ink-900)]">{avgRating ? avgRating.toFixed(1) : "—"}</span>
            <span className="text-[var(--star)]">{"★".repeat(Math.round(avgRating ?? 0))}</span>
            <span className="text-[var(--ink-500)]">({totalReviews} reviews)</span>
          </div>
          <div className="mt-3 flex items-center gap-2">
            <span className="inline-flex items-center gap-2 rounded-full border border-[var(--accent-border)] bg-[var(--accent-softer)] px-3 py-1.5 font-mono text-xs text-[var(--accent-strong)]">{publicUrl.replace(/^https?:\/\//, "")}</span>
            <CopyLinkButton url={publicUrl} label="Copy" className="rounded-full border border-[var(--ink-200)] px-3 py-1.5 text-xs font-semibold text-[var(--ink-600)] hover:bg-[var(--ink-50)]" />
          </div>
          {connectedSources.length > 0 && (
            <div className="mt-3 flex flex-wrap gap-1.5">
              {connectedSources.map((s) => (
                <span key={s} className="rounded-md bg-[var(--ink-100)] px-2 py-0.5 text-xs font-semibold text-[var(--ink-600)]">{s}</span>
              ))}
            </div>
          )}
        </div>
        <div className="flex flex-wrap gap-2">
          <CopyLinkButton url={publicUrl} />
          <a href={publicUrl} target="_blank" rel="noreferrer" className="rounded-xl border border-[var(--ink-200)] bg-white px-3 py-2 text-sm font-semibold text-[var(--ink-700)] hover:bg-[var(--ink-50)]">Open public page</a>
          <a href="#minisite-settings" className="rounded-xl border border-[var(--ink-200)] bg-white px-3 py-2 text-sm font-semibold text-[var(--ink-700)] hover:bg-[var(--ink-50)]">Customize mini site</a>
          <a href="#location-settings" className="rounded-xl border border-[var(--ink-200)] bg-white px-3 py-2 text-sm font-semibold text-[var(--ink-700)] hover:bg-[var(--ink-50)]">Edit location</a>
          <Link href={`/campaigns/new?locationId=${location.id}`} className="rounded-xl bg-[var(--accent)] px-3 py-2 text-sm font-semibold !text-white hover:bg-[var(--accent-strong)]">Send review request</Link>
          <a href="#connected-sources" className="rounded-xl border border-[var(--ink-200)] bg-white px-3 py-2 text-sm font-semibold text-[var(--ink-700)] hover:bg-[var(--ink-50)]">Manage sources</a>
        </div>
      </div>
    </header>
  );
}
```

- [ ] **Step 2: Typecheck**

Run: `npm run typecheck`
Expected: PASS.

- [ ] **Step 3: Commit**

```bash
git add src/app/locations/[id]/_components/location-header.tsx
git commit -m "feat(locations): command-center header with status, URL pill, actions

Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>"
```

---

## Task 11: Summary metric cards

**Files:**
- Create: `src/app/locations/[id]/_components/summary-cards.tsx`

**Interfaces:**
- Consumes: `MiniSiteAnalytics` (Task 4), `RequestPerformance` (Task 5).
- Produces: `<SummaryCards data={SummaryCardsData} />` rendering 9 cards in a responsive grid (`grid gap-3 sm:grid-cols-2 xl:grid-cols-3`): Average rating, Total reviews, New reviews this month, Pending replies, Request conversion, Mini-site page views, Direction clicks, Call clicks, Website clicks. Cards whose value is `null` render `—` + the muted hint "Tracking starts when published".

- [ ] **Step 1: Implement**

```tsx
function MetricCard({ label, value, hint }: { label: string; value: string | number | null; hint?: string }) {
  const empty = value === null || value === undefined;
  return (
    <div className="rounded-2xl border border-[var(--ink-200)] bg-white p-4 shadow-[var(--shadow-sm)]">
      <p className="text-xs font-semibold uppercase tracking-wide text-[var(--ink-500)]">{label}</p>
      <p className="mt-1 text-2xl font-semibold tabular-nums text-[var(--ink-900)]">{empty ? "—" : value}</p>
      {empty && <p className="mt-0.5 text-xs text-[var(--ink-400)]">{hint ?? "Tracking starts when published"}</p>}
    </div>
  );
}

export type SummaryCardsData = {
  avgRating: number | null;
  totalReviews: number;
  newReviewsThisMonth: number;
  pendingReplies: number;
  requestConversion: number | null;
  pageViews: number | null;
  directionClicks: number | null;
  callClicks: number | null;
  websiteClicks: number | null;
};

const pct = (n: number | null) => (n === null ? null : `${Math.round(n * 100)}%`);

export function SummaryCards({ data }: { data: SummaryCardsData }) {
  return (
    <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
      <MetricCard label="Average rating" value={data.avgRating ? data.avgRating.toFixed(1) : null} hint="No reviews yet" />
      <MetricCard label="Total reviews" value={data.totalReviews} />
      <MetricCard label="New reviews this month" value={data.newReviewsThisMonth} />
      <MetricCard label="Pending replies" value={data.pendingReplies} />
      <MetricCard label="Request conversion" value={pct(data.requestConversion)} hint="No requests sent yet" />
      <MetricCard label="Mini-site page views" value={data.pageViews} />
      <MetricCard label="Direction clicks" value={data.directionClicks} />
      <MetricCard label="Call clicks" value={data.callClicks} />
      <MetricCard label="Website clicks" value={data.websiteClicks} />
    </div>
  );
}
```

- [ ] **Step 2: Typecheck**

Run: `npm run typecheck`
Expected: PASS.

- [ ] **Step 3: Commit**

```bash
git add src/app/locations/[id]/_components/summary-cards.tsx
git commit -m "feat(locations): summary metric cards with empty-state hints

Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>"
```

---

## Task 12: Mini-site preview (browser frame + device toggle + publish)

**Files:**
- Create: `src/app/locations/[id]/_components/minisite-preview.tsx`

**Interfaces:**
- Consumes: `SetupChecklistItem[]` (Task 3), `toggleMiniSitePublish` (Task 8), `CopyLinkButton` (Task 9).
- Produces: `<MiniSitePreview locationId publicUrl previewUrl published lastUpdated checklist />` — a `"use client"` component with a desktop/mobile width toggle that renders an `<iframe src={previewUrl}>` (where `previewUrl = ${publicUrl}?preview=1`) inside a browser-chrome frame, plus a header row with publish state + last-updated, action buttons (Copy link, Open page, Customize mini site, Publish/Unpublish), and — when `checklist` has undone items — the setup checklist.

- [ ] **Step 1: Implement**

```tsx
"use client";
import { useState } from "react";
import type { SetupChecklistItem } from "@/lib/minisite-setup";
import { toggleMiniSitePublish } from "@/app/locations/actions";
import { CopyLinkButton } from "./copy-link-button";

export function MiniSitePreview({
  locationId, publicUrl, published, lastUpdated, checklist,
}: {
  locationId: string;
  publicUrl: string;
  published: boolean;
  lastUpdated: string;
  checklist: SetupChecklistItem[];
}) {
  const [device, setDevice] = useState<"desktop" | "mobile">("desktop");
  const previewUrl = `${publicUrl}?preview=1`;
  const incomplete = checklist.filter((i) => !i.done);

  return (
    <section className="rounded-2xl border border-[var(--ink-200)] bg-white p-6 shadow-[var(--shadow-sm)]">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-lg font-semibold text-[var(--ink-900)]">Public mini site</h2>
          <p className="mt-0.5 text-sm text-[var(--ink-500)]">
            <span className={`mr-2 rounded-full px-2 py-0.5 text-xs font-semibold ${published ? "bg-[var(--success-soft)] text-[#047857]" : "bg-[var(--ink-100)] text-[var(--ink-600)]"}`}>
              {published ? "Published" : "Draft"}
            </span>
            Updated {lastUpdated}
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <div className="flex rounded-xl border border-[var(--ink-200)] p-0.5">
            <button type="button" onClick={() => setDevice("desktop")} className={`rounded-lg px-3 py-1 text-xs font-semibold ${device === "desktop" ? "bg-[var(--ink-100)] text-[var(--ink-900)]" : "text-[var(--ink-500)]"}`}>Desktop</button>
            <button type="button" onClick={() => setDevice("mobile")} className={`rounded-lg px-3 py-1 text-xs font-semibold ${device === "mobile" ? "bg-[var(--ink-100)] text-[var(--ink-900)]" : "text-[var(--ink-500)]"}`}>Mobile</button>
          </div>
          <CopyLinkButton url={publicUrl} label="Copy link" />
          <a href={publicUrl} target="_blank" rel="noreferrer" className="rounded-xl border border-[var(--ink-200)] bg-white px-3 py-2 text-sm font-semibold text-[var(--ink-700)] hover:bg-[var(--ink-50)]">Open page</a>
          <a href="#minisite-settings" className="rounded-xl border border-[var(--ink-200)] bg-white px-3 py-2 text-sm font-semibold text-[var(--ink-700)] hover:bg-[var(--ink-50)]">Customize</a>
          <form action={toggleMiniSitePublish}>
            <input type="hidden" name="locationId" value={locationId} />
            <input type="hidden" name="publish" value={(!published).toString()} />
            <button type="submit" className="rounded-xl bg-[var(--accent)] px-3 py-2 text-sm font-semibold !text-white hover:bg-[var(--accent-strong)]">{published ? "Unpublish" : "Publish"}</button>
          </form>
        </div>
      </div>

      {incomplete.length > 0 && (
        <ul className="mt-4 grid gap-2 rounded-xl border border-[var(--warning-soft)] bg-[var(--warning-soft)]/40 p-4 sm:grid-cols-2">
          {checklist.map((item) => (
            <li key={item.key} className={`flex items-center gap-2 text-sm ${item.done ? "text-[var(--ink-400)] line-through" : "text-[var(--ink-700)]"}`}>
              <span>{item.done ? "✓" : "○"}</span>{item.label}
            </li>
          ))}
        </ul>
      )}

      <div className="mt-4 overflow-hidden rounded-xl border border-[var(--ink-200)] bg-[var(--ink-50)]">
        <div className="flex items-center gap-1.5 border-b border-[var(--ink-200)] bg-white px-3 py-2">
          <span className="h-3 w-3 rounded-full bg-[var(--ink-200)]" />
          <span className="h-3 w-3 rounded-full bg-[var(--ink-200)]" />
          <span className="h-3 w-3 rounded-full bg-[var(--ink-200)]" />
          <span className="ml-3 truncate rounded-md bg-[var(--ink-100)] px-2 py-0.5 font-mono text-xs text-[var(--ink-500)]">{publicUrl.replace(/^https?:\/\//, "")}</span>
        </div>
        <div className="flex justify-center bg-[var(--ink-100)] p-4">
          <iframe
            title="Mini site preview"
            src={previewUrl}
            className="h-[640px] rounded-lg border border-[var(--ink-200)] bg-white transition-all"
            style={{ width: device === "mobile" ? 390 : "100%" }}
          />
        </div>
      </div>
    </section>
  );
}
```

- [ ] **Step 2: Typecheck**

Run: `npm run typecheck`
Expected: PASS.

- [ ] **Step 3: Commit**

```bash
git add src/app/locations/[id]/_components/minisite-preview.tsx
git commit -m "feat(locations): large mini-site preview with device toggle and publish

Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>"
```

---

## Task 13: Mini-site settings form

**Files:**
- Create: `src/app/locations/[id]/_components/minisite-settings.tsx`

**Interfaces:**
- Consumes: `saveLocationSettings` (Task 8). Renders one `<form action={saveLocationSettings} id="minisite-settings">` with all mini-site fields and toggles. Reuses the existing `FormSubmitButton` (`src/components/form-submit-button.tsx`).
- Produces: `<MiniSiteSettings location={...} profile={LocationPublicProfile | null} />`.

- [ ] **Step 1: Implement the form**

Build the form mirroring the field/markup conventions in the current `locations/[id]/page.tsx` settings form (labels: `grid gap-2 text-sm font-semibold text-[var(--ink-700)]`; inputs: `rounded-xl border border-[var(--ink-200)] bg-[var(--ink-50)] px-4 py-3 text-sm font-normal`). Include a hidden `locationId`, and these inputs (names must match Task 8 exactly):

- text inputs: `headline` (display name), `addressLine1`, `phone`, `websiteUrl`, `timezone`, `accentColor` (type `color` + a text fallback), `ctaLabel`, `secondaryCtaLabel`, `services` (comma-separated text), `googleHours` (textarea).
- textarea: `subheadline` (short description).
- selects: `ctaType` and `secondaryCtaType` with options `CALL | WEBSITE | DIRECTIONS | BOOK | REVIEW` (secondary also offers an empty "None").
- `enabledReviewSources`: four checkboxes all `name="enabledReviewSources"` with values `GOOGLE`, `FACEBOOK`, `YELP`, `TRUSTPILOT`, `defaultChecked` from `profile?.enabledReviewSources?.includes(value)`.
- toggle checkboxes (each `defaultChecked` from the matching profile field, default true): `showReviewSummary`, `showFeaturedReviews`, `showServices`, `showSourceBadges`, `showMap`, `showHours`, `showTestimonials`, `showAiReviewSummary`, `showVerifiedBadge`, `showPoweredBy`.
- hero image upload: reuse the existing `heroImageFile` / `existingHeroImageUrl` inputs from the current page.

End with:

```tsx
<FormSubmitButton idleLabel="Save mini site settings" pendingLabel="Saving…" className="rounded-xl bg-[var(--accent)] px-5 py-3 text-sm font-semibold !text-white hover:bg-[var(--accent-strong)]" />
```

Wrap everything in `<section className="rounded-2xl border border-[var(--ink-200)] bg-white p-6 shadow-[var(--shadow-sm)]">` with an `<h2 id="minisite-settings">Mini site settings</h2>` heading. (The `id` is the scroll target for the "Customize" buttons.)

- [ ] **Step 2: Typecheck**

Run: `npm run typecheck`
Expected: PASS.

- [ ] **Step 3: Commit**

```bash
git add src/app/locations/[id]/_components/minisite-settings.tsx
git commit -m "feat(locations): mini-site settings form (CTAs, toggles, sources)

Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>"
```

---

## Task 14: Reviews panel + row actions

**Files:**
- Create: `src/app/locations/[id]/_components/location-reviews-panel.tsx`
- Create: `src/app/locations/[id]/_components/review-row-actions.tsx` (client)

**Interfaces:**
- Consumes: `REVIEW_FILTERS`, `filterLocationReviews`, `reviewNeedsReply` (Task 6); `setReviewFeatured`, `setReviewHiddenFromMiniSite`, `setReviewWidgetVisible` (Task 8); `formatReviewSource`, `formatReviewDate` from `src/lib/reviews.ts`.
- Produces:
  - `<LocationReviewsPanel reviews={Review[]} locationId activeFilter />` — server component. Reads the active filter, renders the filter chip row (each chip a `Link` to `?reviewFilter=<value>#reviews`), applies `filterLocationReviews`, and lists matching reviews with reviewer name, rating stars, source, date, text, reply status, public-visibility status, featured status, and the row actions.
  - `<ReviewRowActions reviewId isFeatured isHidden isWidgetVisible />` — client; renders four `<form>`s posting the toggle actions with the inverted boolean.

- [ ] **Step 1: Implement `review-row-actions.tsx`**

```tsx
"use client";
import { setReviewFeatured, setReviewHiddenFromMiniSite, setReviewWidgetVisible } from "@/app/locations/actions";

function ToggleForm({ action, name, value, label }: { action: (fd: FormData) => Promise<void>; name: string; value: boolean; reviewId: string; label: string } & { reviewId: string }) {
  return null; // replaced below
}

export function ReviewRowActions({ reviewId, isFeatured, isHidden, isWidgetVisible }: { reviewId: string; isFeatured: boolean; isHidden: boolean; isWidgetVisible: boolean }) {
  const btn = "rounded-lg border border-[var(--ink-200)] px-2.5 py-1 text-xs font-semibold text-[var(--ink-600)] hover:bg-[var(--ink-50)]";
  return (
    <div className="flex flex-wrap gap-1.5">
      <form action={setReviewFeatured}>
        <input type="hidden" name="reviewId" value={reviewId} />
        <input type="hidden" name="featured" value={(!isFeatured).toString()} />
        <button className={btn} type="submit">{isFeatured ? "Remove from featured" : "Mark as featured"}</button>
      </form>
      <form action={setReviewHiddenFromMiniSite}>
        <input type="hidden" name="reviewId" value={reviewId} />
        <input type="hidden" name="hidden" value={(!isHidden).toString()} />
        <button className={btn} type="submit">{isHidden ? "Show on public page" : "Hide from public page"}</button>
      </form>
      <form action={setReviewWidgetVisible}>
        <input type="hidden" name="reviewId" value={reviewId} />
        <input type="hidden" name="visible" value={(!isWidgetVisible).toString()} />
        <button className={btn} type="submit">{isWidgetVisible ? "Remove from widget" : "Add to widget"}</button>
      </form>
    </div>
  );
}
```

Delete the unused `ToggleForm` stub before committing (it is only shown to mark where the forms live).

- [ ] **Step 2: Implement `location-reviews-panel.tsx`**

Server component. Accept `reviews`, `locationId`, `activeFilter: ReviewFilter`. Render:

```tsx
import Link from "next/link";
import { REVIEW_FILTERS, filterLocationReviews, reviewNeedsReply, type ReviewFilter } from "@/lib/review-filtering";
import { formatReviewSource, formatReviewDate } from "@/lib/reviews";
import { ReviewRowActions } from "./review-row-actions";

export function LocationReviewsPanel({ reviews, activeFilter }: { reviews: Array<{ id: string; reviewerName: string; rating: number | null; source: string; reviewedAt: Date | null; body: string; isFeatured: boolean; isHiddenFromMiniSite: boolean; isWidgetVisible: boolean; isTestimonial: boolean; replyPublishedAt: Date | null; replySentAt: Date | null }>; locationId: string; activeFilter: ReviewFilter }) {
  const filtered = filterLocationReviews(reviews, activeFilter);
  return (
    <section id="reviews" className="rounded-2xl border border-[var(--ink-200)] bg-white p-6 shadow-[var(--shadow-sm)]">
      <h2 className="text-lg font-semibold text-[var(--ink-900)]">Reviews for this location</h2>
      <div className="mt-3 flex flex-wrap gap-1.5">
        {REVIEW_FILTERS.map((f) => (
          <Link key={f.value} href={`?reviewFilter=${f.value}#reviews`} scroll={false}
            className={`rounded-full px-3 py-1 text-xs font-semibold ${activeFilter === f.value ? "bg-[var(--accent)] !text-white" : "border border-[var(--ink-200)] text-[var(--ink-600)] hover:bg-[var(--ink-50)]"}`}>
            {f.label}
          </Link>
        ))}
      </div>
      <div className="mt-4 space-y-3">
        {filtered.length === 0 ? (
          <p className="rounded-xl border border-dashed border-[var(--ink-200)] p-6 text-center text-sm text-[var(--ink-500)]">No reviews match this filter.</p>
        ) : filtered.map((r) => (
          <article key={r.id} className="rounded-xl border border-[var(--ink-200)] p-4">
            <div className="flex flex-wrap items-start justify-between gap-2">
              <div>
                <p className="font-semibold text-[var(--ink-900)]">{r.reviewerName}</p>
                <div className="mt-0.5 flex items-center gap-2 text-xs text-[var(--ink-500)]">
                  <span className="text-[var(--star)]">{"★".repeat(Math.round(r.rating ?? 0))}</span>
                  <span>{formatReviewSource(r.source, r.isTestimonial)}</span>
                  <span>{formatReviewDate(r.reviewedAt)}</span>
                </div>
              </div>
              <div className="flex flex-wrap gap-1.5">
                {r.isFeatured && <span className="rounded-md bg-[var(--accent-soft)] px-2 py-0.5 text-xs font-semibold text-[var(--accent-strong)]">Featured</span>}
                {r.isHiddenFromMiniSite && <span className="rounded-md bg-[var(--ink-100)] px-2 py-0.5 text-xs font-semibold text-[var(--ink-600)]">Hidden</span>}
                <span className={`rounded-md px-2 py-0.5 text-xs font-semibold ${reviewNeedsReply(r) ? "bg-[var(--warning-soft)] text-[#92400e]" : "bg-[var(--success-soft)] text-[#047857]"}`}>{reviewNeedsReply(r) ? "Needs reply" : "Replied"}</span>
              </div>
            </div>
            <p className="mt-2 text-sm leading-6 text-[var(--ink-600)]">{r.body}</p>
            <div className="mt-3 flex items-center justify-between gap-2">
              <Link href={`/reviews/${r.id}`} className="text-xs font-semibold text-[var(--accent)]">Reply →</Link>
              <ReviewRowActions reviewId={r.id} isFeatured={r.isFeatured} isHidden={r.isHiddenFromMiniSite} isWidgetVisible={r.isWidgetVisible} />
            </div>
          </article>
        ))}
      </div>
    </section>
  );
}
```

- [ ] **Step 3: Typecheck**

Run: `npm run typecheck`
Expected: PASS. (Confirm `formatReviewSource`/`formatReviewDate` signatures via `grep -n "export function formatReviewSource\|export function formatReviewDate" src/lib/reviews.ts` and adjust args if needed.)

- [ ] **Step 4: Commit**

```bash
git add src/app/locations/[id]/_components/location-reviews-panel.tsx src/app/locations/[id]/_components/review-row-actions.tsx
git commit -m "feat(locations): per-location reviews panel with filters and row actions

Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>"
```

---

## Task 15: Request performance + connected sources + location details cards

**Files:**
- Create: `src/app/locations/[id]/_components/request-performance.tsx`
- Create: `src/app/locations/[id]/_components/connected-sources.tsx`
- Create: `src/app/locations/[id]/_components/location-details-card.tsx`

**Interfaces:**
- Consumes: `RequestPerformance` (Task 5); existing Google mapping markup from the current page (moved into `connected-sources.tsx`).
- Produces:
  - `<RequestPerformance perf={RequestPerformance} locationId />` — metric rows (Requests sent, Open rate, Click rate, Review conversion, Best channel, Latest campaign, Last request sent) with `—` for null, plus actions Send new review request (`/campaigns/new?locationId=`), Create campaign for this location, View campaign history (`/campaigns?locationId=`).
  - `<ConnectedSources sources={SourceRow[]} />` where `SourceRow = { key: "google"|"facebook"|"yelp"|"trustpilot"; label: string; connected: boolean; lastSyncedLabel: string | null; reviewsImported: number | null; rating: number | null; syncStatus: string | null; comingSoon: boolean }`. Each row shows status + the four stats (`—` when null) and actions Connect / Reconnect / Sync now / Manage mapping; `comingSoon` rows show a disabled "Coming soon" pill instead of actions.
  - `<LocationDetailsCard details={...} />` — definition list of address, phone, website, hours, time zone, internal location ID, created date, updated date, last synced date, assigned team/users.

- [ ] **Step 1: Implement the three components**

Each is a presentational server component using the shared card shell
`rounded-2xl border border-[var(--ink-200)] bg-white p-6 shadow-[var(--shadow-sm)]`. For
`RequestPerformance`, render a 2-column definition grid; format rates with
`v === null ? "—" : `${Math.round(v * 100)}%``. For `ConnectedSources`, give the section
`id="connected-sources"` and map over `sources`; for Google's connected row, move the existing
mapping/sync `<form>` blocks from `locations/[id]/page.tsx` into this component unchanged
(they already work). For `LocationDetailsCard`, reuse the existing `Field` component from
`src/components/ui.tsx` for each row.

- [ ] **Step 2: Typecheck**

Run: `npm run typecheck`
Expected: PASS.

- [ ] **Step 3: Commit**

```bash
git add src/app/locations/[id]/_components/request-performance.tsx src/app/locations/[id]/_components/connected-sources.tsx src/app/locations/[id]/_components/location-details-card.tsx
git commit -m "feat(locations): request performance, connected sources, details cards

Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>"
```

---

## Task 16: Recompose the Location Detail page

**Files:**
- Modify: `src/app/locations/[id]/page.tsx` (full rewrite of the JSX body; keep the data-fetching preamble)

**Interfaces:**
- Consumes: every Phase 1 lib + every Phase 2 component.
- Produces: the assembled page — header, summary cards, then a two-column layout (`grid gap-6 xl:grid-cols-[1.6fr_1fr]`): left = MiniSitePreview, LocationReviewsPanel, RequestPerformance; right = MiniSiteSettings (id anchor), ConnectedSources, LocationDetailsCard. The existing AI-summary, Google-reply-automation, and danger-zone sections are retained below the grid.

- [ ] **Step 1: Compute the derived data in the page server component**

After the existing `getLocationById` / `getLocationMappingOptions` calls, add (using the new helpers):

```ts
import { deriveLocationStatus, isMiniSiteProfileComplete } from "@/lib/location-status";
import { computeMiniSiteSetupChecklist } from "@/lib/minisite-setup";
import { getMiniSiteAnalytics } from "@/lib/review-link-analytics";
import { getLocationRequestPerformance } from "@/lib/request-performance";
import { type ReviewFilter } from "@/lib/review-filtering";

const profile = location.publicProfile;
const connectedSources = [
  location.googleLocationName ? "Google" : null,
  location.yelpBusinessId ? "Yelp" : null,
  profile?.facebookUrl ? "Facebook" : null,
].filter(Boolean) as string[];
const hasConnectedSource = connectedSources.length > 0;
const profileComplete = isMiniSiteProfileComplete({ phone: profile?.phone ?? null, websiteUrl: profile?.websiteUrl ?? null });
const hasFeaturedReview = location.reviews.some((r) => r.isFeatured);
const status = deriveLocationStatus({
  miniSitePublished: location.miniSitePublished,
  miniSitePublishedAt: location.miniSitePublishedAt,
  hasConnectedSource,
  profileComplete,
});
const checklist = computeMiniSiteSetupChecklist({
  phone: profile?.phone ?? null,
  websiteUrl: profile?.websiteUrl ?? null,
  hasConnectedSource,
  hasFeaturedReview,
  miniSitePublished: location.miniSitePublished,
});
const analytics = await getMiniSiteAnalytics(location.id, 30);
const perf = getLocationRequestPerformance(location);
const baseUrl = process.env.NEXT_PUBLIC_APP_URL?.replace(/\/$/, "") ?? "";
const publicUrl = `${baseUrl}/b/${location.slug}`;
const activeFilter = (typeof query.reviewFilter === "string" ? query.reviewFilter : "all") as ReviewFilter;
const now = new Date();
const newReviewsThisMonth = location.reviews.filter((r) => r.reviewedAt && r.reviewedAt.getMonth() === now.getMonth() && r.reviewedAt.getFullYear() === now.getFullYear()).length;
const pendingReplies = location.reviews.filter((r) => !r.replyPublishedAt && !r.replySentAt).length;
```

- [ ] **Step 2: Replace the JSX body**

Replace the returned JSX (keep `<AppShell activeScreen="locations" flash=...>` and the sync flash banners) with the assembled layout:

```tsx
<AppShell activeScreen="locations" flash={flash ? { message: flash, tone } : null}>
  <div className="space-y-6">
    {/* keep existing sync success/error banners here */}
    <LocationHeader location={location} publicUrl={publicUrl} status={status} connectedSources={connectedSources} avgRating={location.avgRating ?? null} totalReviews={location.reviews.length} />
    <SummaryCards data={{
      avgRating: location.avgRating ?? null,
      totalReviews: location.reviews.length,
      newReviewsThisMonth,
      pendingReplies,
      requestConversion: perf.conversionRate,
      pageViews: analytics.hasData ? analytics.pageViews : null,
      directionClicks: analytics.hasData ? analytics.directionsClicks : null,
      callClicks: analytics.hasData ? analytics.callClicks : null,
      websiteClicks: analytics.hasData ? analytics.websiteClicks : null,
    }} />
    <div className="grid gap-6 xl:grid-cols-[1.6fr_1fr]">
      <div className="space-y-6">
        <MiniSitePreview locationId={location.id} publicUrl={publicUrl} published={location.miniSitePublished} lastUpdated={profile?.updatedAt ? formatDateTime(profile.updatedAt) : "—"} checklist={checklist} />
        <LocationReviewsPanel reviews={location.reviews} locationId={location.id} activeFilter={activeFilter} />
        <RequestPerformance perf={perf} locationId={location.id} />
      </div>
      <div className="space-y-6">
        <MiniSiteSettings location={location} profile={profile} />
        <ConnectedSources sources={/* build SourceRow[] from location + mappingOptions */} />
        <LocationDetailsCard details={/* build from location + profile */} />
      </div>
    </div>
    {/* retained: AI review summary section, Google reply automation section, danger zone */}
  </div>
</AppShell>
```

Fill the `ConnectedSources`/`LocationDetailsCard` props from `location`, `profile`, `mappingOptions`, and the existing sync labels already computed at the top of the file. Move the existing Google mapping/sync `<form>` blocks into `ConnectedSources` (Task 15).

- [ ] **Step 3: Typecheck + build**

Run:
```bash
npm run typecheck
npm run build
```
Expected: both PASS. Resolve any prop/type mismatches.

- [ ] **Step 4: Playwright smoke (manual data)**

Run `npm run dev` in the background, then verify the page renders. If a seeded location exists, capture a screenshot:

```bash
node -e "const {chromium}=require('playwright');(async()=>{const b=await chromium.launch();const p=await b.newPage();await p.goto(process.env.SMOKE_URL||'http://localhost:3000/locations');await p.screenshot({path:'test-results/location-detail.png',fullPage:true});await b.close();})()"
```
Expected: screenshot saved (auth permitting). If auth blocks it, at minimum confirm `npm run build` succeeded.

- [ ] **Step 5: Commit**

```bash
git add src/app/locations/[id]/page.tsx
git commit -m "feat(locations): recompose Location Detail as a command center

Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>"
```

---

# Phase 3 — Public mini-site rebuild

## Task 17: CTA resolution helper

**Files:**
- Create: `src/lib/minisite-cta.ts`
- Test: `src/lib/minisite-cta.test.ts`

**Interfaces:**
- Produces:
  - `type CtaType = "CALL" | "WEBSITE" | "DIRECTIONS" | "BOOK" | "REVIEW"`
  - `type ResolvedCta = { type: CtaType; label: string; href: string; external: boolean }`
  - `resolveCta(type: CtaType | null | undefined, opts: { label?: string | null; phone?: string | null; websiteUrl?: string | null; bookingUrl?: string | null; mapsUrl?: string | null; reviewUrl?: string | null }): ResolvedCta | null`

Default labels: CALL→"Call now", WEBSITE→"Visit website", DIRECTIONS→"Get directions", BOOK→"Book appointment", REVIEW→"Leave a review". Returns `null` when the destination for the chosen type is missing.

- [ ] **Step 1: Write the failing test**

```ts
import assert from "node:assert/strict";
import test from "node:test";
import { resolveCta } from "./minisite-cta.ts";

test("CALL builds tel href", () => {
  assert.deepEqual(resolveCta("CALL", { phone: "555-1234" }), { type: "CALL", label: "Call now", href: "tel:555-1234", external: false });
});

test("REVIEW uses review url and custom label", () => {
  const r = resolveCta("REVIEW", { reviewUrl: "https://g.page/review", label: "Review us" });
  assert.equal(r?.href, "https://g.page/review");
  assert.equal(r?.label, "Review us");
  assert.equal(r?.external, true);
});

test("returns null when destination missing", () => {
  assert.equal(resolveCta("WEBSITE", { websiteUrl: null }), null);
  assert.equal(resolveCta(null, {}), null);
});

test("DIRECTIONS and BOOK", () => {
  assert.equal(resolveCta("DIRECTIONS", { mapsUrl: "https://maps" })?.label, "Get directions");
  assert.equal(resolveCta("BOOK", { bookingUrl: "https://book" })?.href, "https://book");
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `node --import ./test-loader.mjs --test src/lib/minisite-cta.test.ts`
Expected: FAIL — module not found.

- [ ] **Step 3: Implement**

```ts
export type CtaType = "CALL" | "WEBSITE" | "DIRECTIONS" | "BOOK" | "REVIEW";
export type ResolvedCta = { type: CtaType; label: string; href: string; external: boolean };

const DEFAULT_LABELS: Record<CtaType, string> = {
  CALL: "Call now",
  WEBSITE: "Visit website",
  DIRECTIONS: "Get directions",
  BOOK: "Book appointment",
  REVIEW: "Leave a review",
};

export function resolveCta(
  type: CtaType | null | undefined,
  opts: { label?: string | null; phone?: string | null; websiteUrl?: string | null; bookingUrl?: string | null; mapsUrl?: string | null; reviewUrl?: string | null },
): ResolvedCta | null {
  if (!type) return null;
  const label = opts.label?.trim() || DEFAULT_LABELS[type];
  switch (type) {
    case "CALL":
      return opts.phone ? { type, label, href: `tel:${opts.phone}`, external: false } : null;
    case "WEBSITE":
      return opts.websiteUrl ? { type, label, href: opts.websiteUrl, external: true } : null;
    case "DIRECTIONS":
      return opts.mapsUrl ? { type, label, href: opts.mapsUrl, external: true } : null;
    case "BOOK":
      return opts.bookingUrl ? { type, label, href: opts.bookingUrl, external: true } : null;
    case "REVIEW":
      return opts.reviewUrl ? { type, label, href: opts.reviewUrl, external: true } : null;
    default:
      return null;
  }
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `node --import ./test-loader.mjs --test src/lib/minisite-cta.test.ts`
Expected: PASS (4 tests).

- [ ] **Step 5: Commit**

```bash
git add src/lib/minisite-cta.ts src/lib/minisite-cta.test.ts
git commit -m "feat(lib): resolve mini-site CTA destinations by type

Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>"
```

---

## Task 18: Public mini-site section components

**Files:**
- Create: `src/app/b/[slug]/_components/source-badge.tsx`, `verified-badge.tsx`, `minisite-hero.tsx`, `trust-summary.tsx`, `featured-reviews.tsx`, `leave-a-review.tsx`, `location-info.tsx`, `minisite-footer.tsx`, `minisite-unavailable.tsx`

**Interfaces:**
- Consumes: `ResolvedCta` (Task 17); existing `StarRating`/`ReviewerAvatar` patterns from the current `b/[slug]/page.tsx`; `MiniSiteTracker` (Task 19, wired in Task 20).
- Produces: one presentational component per public section, each accepting plain props (no Prisma types) so they are reusable and testable. `<MiniSiteUnavailable name={string} />` renders the "page unavailable" state.

- [ ] **Step 1: Implement the building blocks**

`source-badge.tsx` — maps a source key to its brand token (`--src-google`, `--src-facebook`, `--src-yelp`, `--src-trustpilot`) and renders a small pill. `verified-badge.tsx` — a teal "Verified by WeHearYou" pill (`bg-[var(--accent-soft)] text-[var(--accent-strong)]`). `minisite-unavailable.tsx`:

```tsx
export function MiniSiteUnavailable({ name }: { name: string }) {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center bg-[var(--page)] px-6 text-center">
      <h1 className="text-2xl font-semibold text-[var(--ink-900)]">{name}</h1>
      <p className="mt-2 text-[var(--ink-500)]">This page isn’t available right now.</p>
    </main>
  );
}
```

- [ ] **Step 2: Implement the section components**

Build `minisite-hero.tsx` (name, description, star rating, avg + count, source badges, verified badge, address + phone, primary + secondary CTA buttons from `ResolvedCta`), `trust-summary.tsx` (rating, count, recent activity line, AI summary block, highlight chips from a `highlights: string[]` prop), `featured-reviews.tsx` (review cards, featured badge, video support, optional source filter chips), `leave-a-review.tsx` (prompt + a button per enabled source), `location-info.tsx` (address, map embed/link, directions, phone, website, hours, services), `minisite-footer.tsx` (name, verified, optional powered-by). Reuse the exact card/spacing/`StarRating` styling from the current `b/[slug]/page.tsx` but swap indigo accents for `--accent`. Each section accepts a boolean visibility prop and the parent decides whether to render it (sections return `null` when their data is empty).

Accept an optional `onTrack` affordance by giving interactive elements stable `data-track` attributes (e.g. `data-track="call"`, `"website"`, `"directions"`, `"review"`, `"cta"`) so the Task 19 tracker can attach listeners without prop drilling.

- [ ] **Step 3: Typecheck**

Run: `npm run typecheck`
Expected: PASS.

- [ ] **Step 4: Commit**

```bash
git add src/app/b/[slug]/_components
git commit -m "feat(minisite): public section components (hero, trust, reviews, info)

Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>"
```

---

## Task 19: Mini-site tracker client component + track API route

**Files:**
- Create: `src/components/minisite-tracker.tsx` (client)
- Create: `src/app/api/public/minisite/[slug]/track/route.ts`

**Interfaces:**
- Consumes: `isMiniSiteEventType`, `sanitizeAttribution`, `isRateLimited`, `recordEvents` (Tasks 4 + existing lib); `getPublicLocationBySlug` (`src/lib/public-profile.ts`).
- Produces:
  - `<MiniSiteTracker slug={string} enabled={boolean} />` — on mount (when `enabled`), sends a `MINISITE_VIEWED` beacon (deduped per session via a `sessionStorage` UUID); attaches `click` listeners to `[data-track]` elements mapping `data-track` values to `MINISITE_CLICK_*` events. No-op when `enabled` is false (preview mode).
  - `POST /api/public/minisite/[slug]/track` — validates the event type, rate-limits, records the event, returns `204`.

- [ ] **Step 1: Implement the route**

```ts
import { NextRequest } from "next/server";
import { getPublicLocationBySlug } from "@/lib/public-profile";
import { isMiniSiteEventType, sanitizeAttribution, isRateLimited, recordEvents } from "@/lib/review-link-analytics";
import type { ReviewLinkEventType } from "@prisma/client";

export async function POST(req: NextRequest, { params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const body = await req.json().catch(() => null);
  if (!body || typeof body.eventType !== "string" || !isMiniSiteEventType(body.eventType)) {
    return new Response("Bad request", { status: 400 });
  }
  const location = await getPublicLocationBySlug(slug);
  if (!location) return new Response("Not found", { status: 404 });

  const clientIp = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? null;
  if (await isRateLimited(location.id, clientIp)) return new Response(null, { status: 204 });

  const attribution = sanitizeAttribution({
    sessionId: body.sessionId ?? null,
    referrer: req.headers.get("referer"),
  });
  await recordEvents({
    locationId: location.id,
    organizationId: location.organizationId,
    eventTypes: [body.eventType as ReviewLinkEventType],
    attribution,
    clientIp,
  });
  return new Response(null, { status: 204 });
}
```

- [ ] **Step 2: Implement the tracker**

```tsx
"use client";
import { useEffect } from "react";

const CLICK_MAP: Record<string, string> = {
  call: "MINISITE_CLICK_CALL",
  website: "MINISITE_CLICK_WEBSITE",
  directions: "MINISITE_CLICK_DIRECTIONS",
  review: "MINISITE_CLICK_REVIEW",
  cta: "MINISITE_CLICK_CTA",
};

export function MiniSiteTracker({ slug, enabled }: { slug: string; enabled: boolean }) {
  useEffect(() => {
    if (!enabled) return;
    const url = `/api/public/minisite/${slug}/track`;
    let sessionId = sessionStorage.getItem("whs_session");
    if (!sessionId) {
      sessionId = crypto.randomUUID();
      sessionStorage.setItem("whs_session", sessionId);
    }
    const send = (eventType: string) => {
      const payload = JSON.stringify({ eventType, sessionId });
      navigator.sendBeacon?.(url, new Blob([payload], { type: "application/json" })) ||
        fetch(url, { method: "POST", body: payload, headers: { "Content-Type": "application/json" }, keepalive: true });
    };
    send("MINISITE_VIEWED");
    const onClick = (e: Event) => {
      const el = (e.target as HTMLElement)?.closest("[data-track]");
      const key = el?.getAttribute("data-track");
      if (key && CLICK_MAP[key]) send(CLICK_MAP[key]);
    };
    document.addEventListener("click", onClick, true);
    return () => document.removeEventListener("click", onClick, true);
  }, [slug, enabled]);
  return null;
}
```

- [ ] **Step 3: Typecheck + build**

Run:
```bash
npm run typecheck
npm run build
```
Expected: PASS.

- [ ] **Step 4: Commit**

```bash
git add src/components/minisite-tracker.tsx src/app/api/public/minisite
git commit -m "feat(minisite): analytics tracker beacon and track API route

Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>"
```

---

## Task 20: Recompose the public mini-site page

**Files:**
- Modify: `src/app/b/[slug]/page.tsx`

**Interfaces:**
- Consumes: Tasks 17–19 + existing `getPublicLocationBySlug`, `getPublicProfileStats`, `getVisiblePublicReviews`, `getVisibleTestimonials`, `resolveCta`.
- Produces: the assembled public page honoring visibility toggles + publish state.

- [ ] **Step 1: Add publish gate + preview flag**

Near the top of the component, after loading `location`:

```ts
const isPreview = (typeof query.preview === "string" && query.preview === "1");
if (!location.miniSitePublished && !isPreview) {
  return <MiniSiteUnavailable name={location.name} />;
}
```

- [ ] **Step 2: Assemble sections**

Replace the page body with the six sections (hero, trust summary, featured reviews, leave-a-review, location info, footer), passing each its visibility flag from `profile` and data from the existing stats/review helpers. Wrap the root in a div that sets the accent CSS var:

```tsx
<main style={{ ["--accent" as string]: profile?.accentColor || "#37AEB7" } as React.CSSProperties} className="min-h-screen bg-[var(--page)]">
  <MiniSiteTracker slug={location.slug} enabled={!isPreview} />
  <MiniSiteHero ... />
  {profile?.showReviewSummary !== false && <TrustSummary ... highlights={profile?.reviewHighlights ?? []} />}
  {profile?.showFeaturedReviews !== false && <FeaturedReviews ... />}
  <LeaveAReview sources={resolveEnabledSources(profile, location)} ... />
  <LocationInfo ... showServices={profile?.showServices !== false} />
  <MiniSiteFooter name={location.name} showPoweredBy={profile?.showPoweredBy !== false} showVerified={profile?.showVerifiedBadge !== false} />
</main>
```

Where `resolveEnabledSources` returns `profile.enabledReviewSources` if non-empty, else the set of connected sources. Compute the primary/secondary CTAs with `resolveCta` from `profile.ctaType`/`secondaryCtaType` and the resolved destinations (phone, websiteUrl, mapsUrl, bookingUrl, reviewDestination). Keep `generateMetadata` and the JSON-LD schema block unchanged.

- [ ] **Step 3: Typecheck + build**

Run:
```bash
npm run typecheck
npm run build
```
Expected: PASS.

- [ ] **Step 4: Playwright smoke**

With `npm run dev` running and a published seeded location slug in `SMOKE_SLUG`:

```bash
node -e "const {chromium}=require('playwright');(async()=>{const b=await chromium.launch();const p=await b.newPage();await p.goto(\`http://localhost:3000/b/\${process.env.SMOKE_SLUG||'demo'}\`);await p.screenshot({path:'test-results/minisite.png',fullPage:true});await p.setViewportSize({width:390,height:844});await p.screenshot({path:'test-results/minisite-mobile.png',fullPage:true});await b.close();})()"
```
Expected: desktop + mobile screenshots saved; verify hero, reviews, and CTAs render with teal accent.

- [ ] **Step 5: Commit**

```bash
git add src/app/b/[slug]/page.tsx
git commit -m "feat(minisite): rebuild public page into sections with publish + preview

Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>"
```

---

# Phase 4 — AI highlights

## Task 21: Generate + persist review highlight chips

**Files:**
- Modify: `src/lib/ai-summary.ts`
- Modify: `src/app/locations/actions.ts` (the existing `regenerateAiReviewSummaryAction`)
- Test: `src/lib/ai-summary-highlights.test.ts`

**Interfaces:**
- Produces: `parseHighlights(raw: string): string[]` — splits a model response (newline- or comma-separated, optional leading bullets/numbers) into ≤5 trimmed, deduped, non-empty phrases. The regenerate action stores the result in `LocationPublicProfile.reviewHighlights`.

- [ ] **Step 1: Write the failing test**

```ts
import assert from "node:assert/strict";
import test from "node:test";
import { parseHighlights } from "./ai-summary.ts";

test("parses newline list with bullets", () => {
  assert.deepEqual(parseHighlights("- Friendly staff\n- Fast service\n* Clean office"), ["Friendly staff", "Fast service", "Clean office"]);
});

test("parses comma list and caps at 5", () => {
  assert.deepEqual(parseHighlights("a, b, c, d, e, f"), ["a", "b", "c", "d", "e"]);
});

test("dedupes and drops empties", () => {
  assert.deepEqual(parseHighlights("Friendly, friendly, , Fast"), ["Friendly", "Fast"]);
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `node --import ./test-loader.mjs --test src/lib/ai-summary-highlights.test.ts`
Expected: FAIL — `parseHighlights` not exported.

- [ ] **Step 3: Implement `parseHighlights`**

Add to `src/lib/ai-summary.ts`:

```ts
export function parseHighlights(raw: string): string[] {
  const parts = raw
    .split(/[\n,]+/)
    .map((s) => s.replace(/^[\s*\-\d.]+/, "").trim())
    .filter(Boolean);
  const seen = new Set<string>();
  const out: string[] = [];
  for (const p of parts) {
    const key = p.toLowerCase();
    if (!seen.has(key)) { seen.add(key); out.push(p); }
    if (out.length === 5) break;
  }
  return out;
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `node --import ./test-loader.mjs --test src/lib/ai-summary-highlights.test.ts`
Expected: PASS (3 tests).

- [ ] **Step 5: Wire highlight generation into the regenerate action**

In `ai-summary.ts`, find the summary-generation function and extend its prompt to also return 3–5 short highlight phrases on a separate line prefixed `HIGHLIGHTS:`. After receiving the model output, split on `HIGHLIGHTS:` and run the tail through `parseHighlights`. Have the function return `{ summary, highlights }`. In `regenerateAiReviewSummaryAction` (in `locations/actions.ts`), persist `reviewHighlights: highlights` into the same `publicProfile.update` that already stores `aiReviewSummary`. (Confirm the existing function shape with `grep -n "regenerateAiReviewSummary\|aiReviewSummary" src/app/locations/actions.ts src/lib/ai-summary.ts`.)

- [ ] **Step 6: Typecheck + build**

Run:
```bash
npm run typecheck
npm run build
```
Expected: PASS.

- [ ] **Step 7: Commit**

```bash
git add src/lib/ai-summary.ts src/lib/ai-summary-highlights.test.ts src/app/locations/actions.ts
git commit -m "feat(minisite): generate and persist AI review highlight chips

Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>"
```

---

## Task 22: Full validation pass

**Files:** none (verification only)

- [ ] **Step 1: Run the whole unit suite**

Run:
```bash
for f in src/lib/location-status.test.ts src/lib/minisite-setup.test.ts src/lib/minisite-analytics.test.ts src/lib/request-performance.test.ts src/lib/review-filtering.test.ts src/lib/public-profile.test.ts src/lib/minisite-cta.test.ts src/lib/ai-summary-highlights.test.ts src/lib/seo.test.ts; do echo "== $f =="; node --import ./test-loader.mjs --test "$f"; done
```
Expected: every file reports `pass` with `fail 0`.

- [ ] **Step 2: Full validate**

Run: `npm run validate`
Expected: typecheck + lint + build all PASS.

- [ ] **Step 3: Commit any lint fixes**

```bash
git add -A
git commit -m "chore: validation pass for location/mini-site redesign

Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>"
```

---

## Self-Review (completed by author)

**Spec coverage:** Header (T10) · status badge (T2) · address/rating/source badges/URL pill (T10) · all header actions (T10) · 9 metric cards incl. split clicks (T11) · mini-site preview + device toggle + publish + checklist (T12, T3) · mini-site settings incl. secondary CTA, enabled sources, all toggles, time zone, services (T13, T8) · reviews panel filters + actions incl. featured/hidden + show/remove (T14, T6) · request performance incl. latest campaign/last sent + history action (T15, T5) · connected sources w/ per-source detail + coming-soon (T15) · location info (T15) · public hero/trust/featured/leave-a-review/info/footer (T18, T20) · CTA types (T17) · highlight chips AI + editable (T13 edit field, T21) · publish gate + preview + unavailable (T20) · hidden excluded + featured first (T7) · real analytics (T4, T19) · `/b/{slug}` kept, teal accent (global constraints). 

**Placeholder scan:** The `ToggleForm` stub in T14 Step 1 is explicitly flagged for deletion; no other placeholders. UI tasks that assemble large JSX reference the existing files for exact styling — acceptable because those files are the source of truth and the novel logic is shown in full.

**Type consistency:** `MiniSiteAnalytics`, `RequestPerformance`, `ReviewFilter`, `ResolvedCta`, `SetupChecklistItem`, `LocationStatus`, `SummaryCardsData` names/fields are consistent across producing and consuming tasks. Event-type string literals match the enum names added in T1 and the loader sync in T1 Step 5.
