# Review Links Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add anonymous location-level review links (`/review/[slug]`) that route visitors happy→Google or unhappy→private feedback, with aggregate analytics, email signature snippets, QR code generation, and an admin dashboard at `/review-links`.

**Architecture:** Public routes are unauthenticated Next.js App Router pages/route handlers. The happy path uses a dedicated GET route handler (`/review/[slug]/google`) that records events atomically server-side before issuing a 302 redirect — no client-side tracking race. Analytics are written to a new `ReviewLinkEvent` table scoped to org and location; no contact FK is ever set. The admin page at `/review-links` is a protected server component using the existing `getCurrentMembership()` auth pattern.

**Tech Stack:** Next.js 16 App Router, Prisma (PostgreSQL), `qrcode` npm package for client-side QR generation, Node.js built-in `node:test` for tests.

---

## File Map

### New files
| File | Purpose |
|---|---|
| `src/lib/review-link-analytics.ts` | Attribution sanitisation, event recording, rate-limit check, analytics aggregation |
| `src/lib/email-signature.ts` | Generate email-safe table-based HTML snippet for a location |
| `src/app/review/[slug]/page.tsx` | Landing page — thumbs up / down server component |
| `src/app/review/[slug]/google/route.ts` | GET handler — record events + 302 to Google |
| `src/app/review/[slug]/feedback/page.tsx` | Anonymous feedback form server component |
| `src/app/review/[slug]/feedback/actions.ts` | Server action — validate, rate-limit, store, redirect |
| `src/app/review/[slug]/thanks/page.tsx` | Confirmation page |
| `src/app/review-links/page.tsx` | Protected admin page (server component) |
| `src/app/review-links/review-links-client.tsx` | Client components — tabs, copy buttons, QR generator |
| `src/app/api/review-links/[slug]/analytics/route.ts` | Protected analytics aggregation API |
| `src/lib/review-link-analytics.test.ts` | Unit tests for sanitisation, rate-limit, analytics |

### Modified files
| File | Change |
|---|---|
| `prisma/schema.prisma` | `Review.rating Int → Int?`; add `ReviewLinkEventType` enum; add `ReviewLinkEvent` model |
| `src/lib/dashboard.ts` | Exclude `PRIVATE_FEEDBACK` from averageRating; guard `.rating` against null |
| `src/lib/analytics.ts` | Exclude `PRIVATE_FEEDBACK` from averageRating; guard `.rating` against null |
| `src/lib/public-profile.ts` | Guard `.rating` against null in `getPublicProfileStats` |
| `src/lib/seo.ts` | Guard `.rating` against null in rating average |
| `src/lib/review-widgets.ts` | `PublicWidgetReview.rating: number` stays; map with `?? 0`; `ActivityItem.rating: number \| null` |
| `src/lib/navigation.ts` | Add `"review-links"` to `ScreenKey`; add nav item to `navItems` |
| `src/app/locations/[id]/page.tsx` | Add "Review Link" secondary section |
| `package.json` | Add `qrcode` and `@types/qrcode` |

---

## Task 1: Schema changes — nullable rating, ReviewLinkEvent model

**Files:**
- Modify: `prisma/schema.prisma`

- [ ] **Step 1: Change `Review.rating` from `Int` to `Int?`**

In `prisma/schema.prisma`, find the `model Review` block and change:
```prisma
  rating                Int
```
to:
```prisma
  rating                Int?
```

- [ ] **Step 2: Add `ReviewLinkEventType` enum after the existing enums (after `GbpPublishStatus`)**

```prisma
enum ReviewLinkEventType {
  LINK_VIEWED
  HAPPY_CLICKED
  UNHAPPY_CLICKED
  GOOGLE_REDIRECT_CLICKED
  FEEDBACK_STARTED
  FEEDBACK_SUBMITTED
}
```

- [ ] **Step 3: Add `ReviewLinkEvent` model at the end of `prisma/schema.prisma`**

```prisma
model ReviewLinkEvent {
  id             String              @id @default(cuid())
  organizationId String
  locationId     String
  eventType      ReviewLinkEventType
  source         String?
  medium         String?
  placement      String?
  referrer       String?
  sessionId      String?
  clientIp       String?
  reviewLinkId   String?
  createdAt      DateTime            @default(now())

  organization   Organization        @relation(fields: [organizationId], references: [id], onDelete: Restrict)
  location       Location            @relation(fields: [locationId], references: [id], onDelete: Restrict)

  @@index([organizationId, createdAt])
  @@index([locationId, createdAt])
  @@index([locationId, eventType, createdAt])
  @@index([locationId, source, createdAt])
  @@index([locationId, sessionId, createdAt])
  @@index([locationId, clientIp, createdAt])
}
```

- [ ] **Step 4: Create and apply the migration**

```bash
npx prisma migrate dev --name add_review_link_event_and_nullable_rating
```

Expected: migration file created in `prisma/migrations/`, Prisma client regenerated.

- [ ] **Step 5: Verify migration applied**

```bash
npx prisma migrate status
```

Expected: `All migrations have been applied`.

- [ ] **Step 6: Commit**

```bash
git add prisma/schema.prisma prisma/migrations/
git commit -m "feat: add ReviewLinkEvent model, enum, and nullable Review.rating"
```

---

## Task 2: Fix TypeScript for nullable `Review.rating`

**Files:**
- Modify: `src/lib/dashboard.ts`
- Modify: `src/lib/analytics.ts`
- Modify: `src/lib/public-profile.ts`
- Modify: `src/lib/seo.ts`
- Modify: `src/lib/review-widgets.ts`

- [ ] **Step 1: Fix `dashboard.ts` — `ActivityItem` type and three rating reductions**

In `src/lib/dashboard.ts`:

Change the `ActivityItem` type (top of file):
```typescript
type ActivityItem = {
  reviewerName: string;
  rating: number | null;
  sourceLabel: string;
  isPrivate: boolean;
  createdAt: Date;
};
```

Change the `averageRating` computation (around line 93):
```typescript
const nonTestimonialReviews = reviews.filter(
  (review) => !review.isTestimonial && review.status !== ReviewStatus.PRIVATE_FEEDBACK,
);
const totalReviews = nonTestimonialReviews.length;
const averageRating =
  totalReviews > 0
    ? (nonTestimonialReviews.reduce((sum, review) => sum + (review.rating ?? 0), 0) / totalReviews).toFixed(1)
    : "0.0";
```

Change `googleAvgRating` computation (around line 122):
```typescript
const googleReviewsOnly = reviews.filter(
  (r) => r.source === ReviewSource.GOOGLE && !r.isTestimonial && r.status !== ReviewStatus.PRIVATE_FEEDBACK,
);
const googleAvgRating =
  googleReviewsOnly.length > 0
    ? (
        googleReviewsOnly.reduce((sum, r) => sum + (r.rating ?? 0), 0) /
        googleReviewsOnly.length
      ).toFixed(1)
    : "0.0";
```

Remove the now-redundant `totalReviews` line computed before (it was `reviews.filter((review) => !review.isTestimonial).length`) — replace with `nonTestimonialReviews.length` as shown above.

- [ ] **Step 2: Fix `analytics.ts` — exclude PRIVATE_FEEDBACK from `averageRating`**

In `src/lib/analytics.ts`, change the `getAnalyticsData` function's review fetch to exclude private feedback, and guard the rating reduction:

```typescript
const [reviews, recipients] = await Promise.all([
  prisma.review.findMany({
    where: { status: { not: "PRIVATE_FEEDBACK" } },
    orderBy: [{ reviewedAt: "desc" }, { createdAt: "desc" }],
    select: {
      rating: true,
      source: true,
      status: true,
      sentiment: true,
      reviewedAt: true,
      createdAt: true,
    },
  }),
  // ... recipients unchanged
]);

const reviewVolume = reviews.length;
const averageRating = reviewVolume
  ? `${(reviews.reduce((sum, review) => sum + (review.rating ?? 0), 0) / reviewVolume).toFixed(1)} ★`
  : "0.0 ★";
```

Also update the `privateFeedbackCount` line — since the query now excludes PRIVATE_FEEDBACK, count it separately:
```typescript
const privateFeedbackCount = await prisma.review.count({ where: { status: "PRIVATE_FEEDBACK" } });
```

- [ ] **Step 3: Fix `public-profile.ts` — guard rating in `getPublicProfileStats`**

In `src/lib/public-profile.ts`, change:
```typescript
const averageRating = ratingCount
  ? (visibleReviews.reduce((sum, review) => sum + review.rating, 0) / ratingCount).toFixed(1)
  : location.avgRating?.toFixed(1) ?? "0.0";
```
to:
```typescript
const averageRating = ratingCount
  ? (visibleReviews.reduce((sum, review) => sum + (review.rating ?? 0), 0) / ratingCount).toFixed(1)
  : location.avgRating?.toFixed(1) ?? "0.0";
```

- [ ] **Step 4: Fix `seo.ts` — guard rating in average computation**

In `src/lib/seo.ts` (around line 164), change:
```typescript
visibleReviews.reduce((sum, r) => sum + r.rating, 0) / ratingCount
```
to:
```typescript
visibleReviews.reduce((sum, r) => sum + (r.rating ?? 0), 0) / ratingCount
```

- [ ] **Step 5: Fix `review-widgets.ts` — map rating with null guard**

In `src/lib/review-widgets.ts`, the `PublicWidgetReview` type's `rating: number` stays (widget reviews from Google always have ratings). Update the mapping in `getPublicReviewWidgetPayload` (around line 306):
```typescript
reviews: reviews.map((review) => ({
  id: review.id,
  reviewerName: review.reviewerName,
  reviewerPhotoUrl: review.reviewerPhotoUrl ?? null,
  sourceReviewUrl: review.sourceReviewUrl ?? null,
  sourceReplyText: review.sourceReplyText ?? ((review.replyPublishedAt || review.replySentAt) ? review.replyDraft : null) ?? null,
  rating: review.rating ?? 0,
  body: review.body,
  reviewedAt: review.reviewedAt ? review.reviewedAt.toISOString() : null,
})),
```

- [ ] **Step 6: Verify TypeScript compiles**

```bash
npm run typecheck
```

Expected: exit 0, no errors.

- [ ] **Step 7: Commit**

```bash
git add src/lib/dashboard.ts src/lib/analytics.ts src/lib/public-profile.ts src/lib/seo.ts src/lib/review-widgets.ts
git commit -m "fix: handle nullable Review.rating and exclude PRIVATE_FEEDBACK from rating averages"
```

---

## Task 3: Create `src/lib/review-link-analytics.ts`

**Files:**
- Create: `src/lib/review-link-analytics.ts`

- [ ] **Step 1: Create the file**

```typescript
import { ReviewLinkEventType } from "@prisma/client";
import { prisma } from "@/lib/prisma";

const VALID_SOURCES = new Set(["email_signature", "qr_counter", "invoice", "website"]);
const VALID_MEDIUMS = new Set(["email", "print", "digital"]);
const VALID_PLACEMENTS = new Set(["happy_button", "unhappy_button", "happy_card", "unhappy_card"]);
const UUID_V4_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export type Attribution = {
  source: string | null;
  medium: string | null;
  placement: string | null;
  sessionId: string | null;
  referrer: string | null;
};

export function sanitizeAttribution(raw: {
  src?: string | null;
  medium?: string | null;
  placement?: string | null;
  sessionId?: string | null;
  referrer?: string | null;
}): Attribution {
  let referrer: string | null = null;
  if (raw.referrer) {
    try {
      const u = new URL(raw.referrer);
      referrer = `${u.origin}${u.pathname}`.slice(0, 500);
    } catch {
      referrer = null;
    }
  }
  return {
    source: VALID_SOURCES.has(raw.src ?? "") ? (raw.src as string) : null,
    medium: VALID_MEDIUMS.has(raw.medium ?? "") ? (raw.medium as string) : null,
    placement: VALID_PLACEMENTS.has(raw.placement ?? "") ? (raw.placement as string) : null,
    sessionId: UUID_V4_RE.test(raw.sessionId ?? "") ? (raw.sessionId as string) : null,
    referrer,
  };
}

export async function recordEvents(params: {
  locationId: string;
  organizationId: string;
  eventTypes: ReviewLinkEventType[];
  attribution: Attribution;
  clientIp?: string | null;
}): Promise<void> {
  await prisma.reviewLinkEvent.createMany({
    data: params.eventTypes.map((eventType) => ({
      locationId: params.locationId,
      organizationId: params.organizationId,
      eventType,
      source: params.attribution.source,
      medium: params.attribution.medium,
      placement: params.attribution.placement,
      sessionId: params.attribution.sessionId,
      referrer: params.attribution.referrer,
      clientIp: params.clientIp ?? null,
    })),
  });
}

export async function isRateLimited(locationId: string, clientIp: string | null): Promise<boolean> {
  if (!clientIp) return false;
  const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000);
  const count = await prisma.reviewLinkEvent.count({
    where: {
      locationId,
      eventType: ReviewLinkEventType.FEEDBACK_SUBMITTED,
      clientIp,
      createdAt: { gte: oneHourAgo },
    },
  });
  return count >= 5;
}

export async function getLocationAnalytics(locationId: string, days: number) {
  const since = new Date(Date.now() - days * 24 * 60 * 60 * 1000);

  const [byEventType, bySource, uniqueSessionRows] = await Promise.all([
    prisma.reviewLinkEvent.groupBy({
      by: ["eventType"],
      where: { locationId, createdAt: { gte: since } },
      _count: { eventType: true },
    }),
    prisma.reviewLinkEvent.groupBy({
      by: ["source", "eventType"],
      where: { locationId, createdAt: { gte: since } },
      _count: true,
    }),
    prisma.reviewLinkEvent.findMany({
      where: {
        locationId,
        eventType: ReviewLinkEventType.LINK_VIEWED,
        sessionId: { not: null },
        createdAt: { gte: since },
      },
      distinct: ["sessionId"],
      select: { sessionId: true },
    }),
  ]);

  const counts = Object.fromEntries(
    byEventType.map((row) => [row.eventType, row._count.eventType]),
  ) as Partial<Record<ReviewLinkEventType, number>>;

  return {
    uniqueViews: uniqueSessionRows.length,
    happyClicks: counts[ReviewLinkEventType.HAPPY_CLICKED] ?? 0,
    unhappyClicks: counts[ReviewLinkEventType.UNHAPPY_CLICKED] ?? 0,
    googleRedirects: counts[ReviewLinkEventType.GOOGLE_REDIRECT_CLICKED] ?? 0,
    feedbackStarts: counts[ReviewLinkEventType.FEEDBACK_STARTED] ?? 0,
    feedbackSubmissions: counts[ReviewLinkEventType.FEEDBACK_SUBMITTED] ?? 0,
    bySource,
  };
}
```

- [ ] **Step 2: Verify TypeScript**

```bash
npm run typecheck
```

Expected: exit 0.

- [ ] **Step 3: Commit**

```bash
git add src/lib/review-link-analytics.ts
git commit -m "feat: add review-link-analytics lib (sanitize, record, rate-limit, aggregate)"
```

---

## Task 4: Unit tests for `review-link-analytics.ts`

**Files:**
- Create: `src/lib/review-link-analytics.test.ts`

- [ ] **Step 1: Write the tests**

```typescript
import assert from "node:assert/strict";
import test from "node:test";
import { sanitizeAttribution } from "./review-link-analytics.ts";

test("sanitizeAttribution — known source passes through", () => {
  const result = sanitizeAttribution({ src: "email_signature" });
  assert.equal(result.source, "email_signature");
});

test("sanitizeAttribution — unknown source becomes null", () => {
  const result = sanitizeAttribution({ src: "malicious_payload" });
  assert.equal(result.source, null);
});

test("sanitizeAttribution — unknown medium becomes null", () => {
  const result = sanitizeAttribution({ medium: "carrier_pigeon" });
  assert.equal(result.medium, null);
});

test("sanitizeAttribution — invalid sessionId becomes null", () => {
  const result = sanitizeAttribution({ sessionId: "not-a-uuid" });
  assert.equal(result.sessionId, null);
});

test("sanitizeAttribution — valid UUID v4 sessionId passes through", () => {
  const uuid = "550e8400-e29b-41d4-a716-446655440000".replace("41d4", "41d4");
  // Use a proper v4 UUID
  const v4 = "f47ac10b-58cc-4372-a567-0e02b2c3d479";
  const result = sanitizeAttribution({ sessionId: v4 });
  assert.equal(result.sessionId, v4);
});

test("sanitizeAttribution — referrer strips query string", () => {
  const result = sanitizeAttribution({
    referrer: "https://example.com/page?secret=12345&other=value",
  });
  assert.equal(result.referrer, "https://example.com/page");
});

test("sanitizeAttribution — malformed referrer becomes null", () => {
  const result = sanitizeAttribution({ referrer: "not a url at all" });
  assert.equal(result.referrer, null);
});

test("sanitizeAttribution — referrer truncated to 500 chars", () => {
  const longPath = "/" + "a".repeat(600);
  const result = sanitizeAttribution({
    referrer: `https://example.com${longPath}`,
  });
  assert.ok(result.referrer !== null);
  assert.ok((result.referrer?.length ?? 0) <= 500);
});

test("sanitizeAttribution — null src gives null source", () => {
  const result = sanitizeAttribution({ src: null });
  assert.equal(result.source, null);
});

test("sanitizeAttribution — valid placement passes through", () => {
  const result = sanitizeAttribution({ placement: "happy_card" });
  assert.equal(result.placement, "happy_card");
});

test("sanitizeAttribution — invalid placement becomes null", () => {
  const result = sanitizeAttribution({ placement: "xss_injection" });
  assert.equal(result.placement, null);
});
```

- [ ] **Step 2: Run the tests**

```bash
node --test src/lib/review-link-analytics.test.ts
```

Expected: all 11 tests pass.

- [ ] **Step 3: Commit**

```bash
git add src/lib/review-link-analytics.test.ts
git commit -m "test: add review-link-analytics unit tests"
```

---

## Task 5: Create `/review/[slug]` landing page

**Files:**
- Create: `src/app/review/[slug]/page.tsx`

- [ ] **Step 1: Create the landing page**

```typescript
export const dynamic = "force-dynamic";

import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { buildGoogleWriteReviewLink } from "@/lib/locations";

export default async function ReviewLinkPage({
  params,
  searchParams,
}: {
  params: Promise<{ slug: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const { slug } = await params;
  const query = await searchParams;

  const location = await prisma.location.findFirst({
    where: { slug },
    select: {
      id: true,
      name: true,
      reviewLink: true,
      googlePlaceId: true,
    },
  });

  if (!location) notFound();

  const src = typeof query.src === "string" ? query.src : null;
  const medium = typeof query.medium === "string" ? query.medium : null;
  const placement = typeof query.placement === "string" ? query.placement : null;

  const googleUrl =
    location.reviewLink ?? buildGoogleWriteReviewLink(location.googlePlaceId);

  const happyHref = googleUrl
    ? `/review/${slug}/google?${new URLSearchParams({
        ...(src ? { src } : {}),
        ...(medium ? { medium } : {}),
        placement: "happy_card",
      }).toString()}`
    : null;

  const unhappyHref = `/review/${slug}/feedback?${new URLSearchParams({
    ...(src ? { src } : {}),
    ...(medium ? { medium } : {}),
    placement: "unhappy_card",
  }).toString()}`;

  return (
    <main className="flex min-h-screen items-center justify-center bg-slate-50 px-4 py-10">
      {/* Client beacon: records LINK_VIEWED once per session via POST to event API */}
      <ReviewLinkBeacon slug={slug} src={src} medium={medium} placement={placement} />

      <div className="mx-auto w-full max-w-sm rounded-3xl border border-slate-200 bg-white p-8 shadow-lg text-center">
        <p className="text-xs font-semibold uppercase tracking-[0.18em] text-indigo-600 mb-3">
          {location.name}
        </p>
        <h1 className="text-2xl font-semibold tracking-tight text-slate-950">
          Would you recommend {location.name}?
        </h1>
        <p className="mt-2 text-sm text-slate-500">Your feedback helps us improve.</p>

        <div className="mt-8 flex gap-4">
          {/* Happy card */}
          {happyHref ? (
            <a
              href={happyHref}
              className="flex flex-1 flex-col items-center rounded-2xl border-2 border-emerald-200 bg-emerald-50 p-6 text-center transition hover:border-emerald-300 hover:bg-emerald-100 focus:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500"
              aria-label="Yes, I had a great experience — leave a public review"
            >
              <span aria-hidden="true" className="text-4xl">👍</span>
              <span className="mt-3 font-semibold text-emerald-800">Yes, I had a great experience</span>
              <span className="mt-1 text-xs text-emerald-700">Leave a public review</span>
            </a>
          ) : (
            <div
              className="flex flex-1 flex-col items-center rounded-2xl border-2 border-slate-200 bg-slate-50 p-6 text-center opacity-60 cursor-not-allowed"
              aria-label="Google review link is not yet configured"
              aria-disabled="true"
            >
              <span aria-hidden="true" className="text-4xl">👍</span>
              <span className="mt-3 font-semibold text-slate-500">Great experience</span>
              <span className="mt-1 text-xs text-slate-400">Google review link is not yet configured — please contact us.</span>
            </div>
          )}

          {/* Unhappy card */}
          <a
            href={unhappyHref}
            className="flex flex-1 flex-col items-center rounded-2xl border-2 border-orange-200 bg-orange-50 p-6 text-center transition hover:border-orange-300 hover:bg-orange-100 focus:outline-none focus-visible:ring-2 focus-visible:ring-orange-500"
            aria-label="Not quite — share private feedback"
          >
            <span aria-hidden="true" className="text-4xl">👎</span>
            <span className="mt-3 font-semibold text-orange-800">Not quite</span>
            <span className="mt-1 text-xs text-orange-700">Share private feedback</span>
          </a>
        </div>
      </div>
    </main>
  );
}
```

> **Note:** `ReviewLinkBeacon` is a client component defined in the same file. Add it above the default export:

```typescript
"use client";

import { useEffect } from "react";

function ReviewLinkBeacon({
  slug,
  src,
  medium,
  placement,
}: {
  slug: string;
  src: string | null;
  medium: string | null;
  placement: string | null;
}) {
  useEffect(() => {
    const SESSION_KEY = `rl_viewed_${slug}`;
    if (sessionStorage.getItem(SESSION_KEY)) return;

    let sessionId = sessionStorage.getItem("rl_session_id");
    if (!sessionId) {
      sessionId = crypto.randomUUID();
      sessionStorage.setItem("rl_session_id", sessionId);
    }
    sessionStorage.setItem(SESSION_KEY, "1");

    const params = new URLSearchParams({ event: "LINK_VIEWED", sessionId });
    if (src) params.set("src", src);
    if (medium) params.set("medium", medium);
    if (placement) params.set("placement", placement);

    fetch(`/api/review-links/${slug}/event`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ event: "LINK_VIEWED", sessionId, src, medium, placement }),
    }).catch(() => {});
  }, [slug, src, medium, placement]);

  return null;
}
```

> **File structure note:** Because the page uses `"use client"` only for `ReviewLinkBeacon`, split the file: put `ReviewLinkBeacon` in `src/app/review/[slug]/review-link-beacon.tsx` (client component, file starts with `"use client"`) and `page.tsx` imports it. This follows the Next.js App Router pattern where server components import client components.

Revised structure:

**`src/app/review/[slug]/review-link-beacon.tsx`** — client component only:
```typescript
"use client";

import { useEffect } from "react";

export function ReviewLinkBeacon({
  slug,
  src,
  medium,
  placement,
}: {
  slug: string;
  src: string | null;
  medium: string | null;
  placement: string | null;
}) {
  useEffect(() => {
    const SESSION_KEY = `rl_viewed_${slug}`;
    if (sessionStorage.getItem(SESSION_KEY)) return;

    let sessionId = sessionStorage.getItem("rl_session_id");
    if (!sessionId) {
      sessionId = crypto.randomUUID();
      sessionStorage.setItem("rl_session_id", sessionId);
    }
    sessionStorage.setItem(SESSION_KEY, "1");

    fetch(`/api/review-links/${slug}/event`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ event: "LINK_VIEWED", sessionId, src, medium, placement }),
    }).catch(() => {});
  }, [slug, src, medium, placement]);

  return null;
}
```

**`src/app/review/[slug]/page.tsx`** — import beacon at top, remove `"use client"` directive, import the beacon component:
```typescript
import { ReviewLinkBeacon } from "./review-link-beacon";
```

- [ ] **Step 2: Verify the page compiles**

```bash
npm run typecheck
```

Expected: exit 0.

- [ ] **Step 3: Commit**

```bash
git add src/app/review/
git commit -m "feat: add /review/[slug] landing page with happy/unhappy cards"
```

---

## Task 6: Create `/api/review-links/[slug]/event` — event recording endpoint

**Files:**
- Create: `src/app/api/review-links/[slug]/event/route.ts`

- [ ] **Step 1: Create the route**

```typescript
import { NextRequest, NextResponse } from "next/server";
import { ReviewLinkEventType } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { sanitizeAttribution, recordEvents } from "@/lib/review-link-analytics";

const ALLOWED_EVENTS = new Set<string>(["LINK_VIEWED", "FEEDBACK_STARTED"]);

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ slug: string }> },
) {
  try {
    const { slug } = await params;
    const body = await request.json();

    const event = typeof body.event === "string" ? body.event : null;
    if (!event || !ALLOWED_EVENTS.has(event)) {
      return NextResponse.json({ ok: false }, { status: 400 });
    }

    const location = await prisma.location.findFirst({
      where: { slug },
      select: { id: true, organizationId: true },
    });

    if (!location) {
      return NextResponse.json({ ok: false }, { status: 404 });
    }

    const attr = sanitizeAttribution({
      src: body.src,
      medium: body.medium,
      placement: body.placement,
      sessionId: body.sessionId,
      referrer: request.headers.get("referer"),
    });

    await recordEvents({
      locationId: location.id,
      organizationId: location.organizationId,
      eventTypes: [event as ReviewLinkEventType],
      attribution: attr,
      clientIp: request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? null,
    });

    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ ok: false }, { status: 500 });
  }
}
```

- [ ] **Step 2: Typecheck**

```bash
npm run typecheck
```

Expected: exit 0.

- [ ] **Step 3: Commit**

```bash
git add src/app/api/review-links/
git commit -m "feat: add /api/review-links/[slug]/event endpoint for client-side event recording"
```

---

## Task 7: Create `/review/[slug]/google` — server-side redirect route

**Files:**
- Create: `src/app/review/[slug]/google/route.ts`

- [ ] **Step 1: Create the route handler**

```typescript
import { NextRequest, NextResponse } from "next/server";
import { ReviewLinkEventType } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { buildGoogleWriteReviewLink } from "@/lib/locations";
import { sanitizeAttribution, recordEvents } from "@/lib/review-link-analytics";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ slug: string }> },
) {
  const { slug } = await params;

  const location = await prisma.location.findFirst({
    where: { slug },
    select: {
      id: true,
      organizationId: true,
      reviewLink: true,
      googlePlaceId: true,
    },
  });

  if (!location) {
    return new NextResponse("Not found", { status: 404 });
  }

  // Resolve Google URL from trusted location record only — never from query params
  const googleUrl =
    location.reviewLink ?? buildGoogleWriteReviewLink(location.googlePlaceId);

  if (!googleUrl) {
    // No Google URL configured — redirect to landing page so user can still leave feedback
    const fallback = new URL(`/review/${slug}`, request.url);
    return NextResponse.redirect(fallback, { status: 302 });
  }

  const url = new URL(request.url);
  const attr = sanitizeAttribution({
    src: url.searchParams.get("src"),
    medium: url.searchParams.get("medium"),
    placement: url.searchParams.get("placement"),
    sessionId: url.searchParams.get("sessionId"),
    referrer: request.headers.get("referer"),
  });

  await recordEvents({
    locationId: location.id,
    organizationId: location.organizationId,
    eventTypes: [
      ReviewLinkEventType.HAPPY_CLICKED,
      ReviewLinkEventType.GOOGLE_REDIRECT_CLICKED,
    ],
    attribution: attr,
    clientIp: request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? null,
  });

  return NextResponse.redirect(googleUrl, { status: 302 });
}
```

- [ ] **Step 2: Typecheck**

```bash
npm run typecheck
```

Expected: exit 0.

- [ ] **Step 3: Commit**

```bash
git add src/app/review/[slug]/google/route.ts
git commit -m "feat: add /review/[slug]/google server-side redirect with atomic event recording"
```

---

## Task 8: Create `/review/[slug]/feedback` — form page and server action

**Files:**
- Create: `src/app/review/[slug]/feedback/page.tsx`
- Create: `src/app/review/[slug]/feedback/actions.ts`

- [ ] **Step 1: Create `actions.ts`**

```typescript
"use server";

import { redirect } from "next/navigation";
import { ReviewLinkEventType, ReviewSource, ReviewStatus } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { sanitizeAttribution, recordEvents, isRateLimited } from "@/lib/review-link-analytics";
import { headers } from "next/headers";

function isValidEmail(email: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

export async function submitReviewLinkFeedback(formData: FormData) {
  const slug = String(formData.get("slug") ?? "").trim();
  const honeypot = String(formData.get("website") ?? "");
  const name = String(formData.get("name") ?? "").trim().slice(0, 100);
  const email = String(formData.get("email") ?? "").trim().slice(0, 200);
  const message = String(formData.get("message") ?? "").trim().slice(0, 2000);
  const src = String(formData.get("src") ?? "").trim() || null;
  const medium = String(formData.get("medium") ?? "").trim() || null;
  const placement = String(formData.get("placement") ?? "").trim() || null;
  const sessionId = String(formData.get("sessionId") ?? "").trim() || null;

  const thanksUrl = `/review/${slug}/thanks?${new URLSearchParams({ ...(src ? { src } : {}) }).toString()}`;

  // Honeypot — silently redirect as if successful
  if (honeypot) {
    redirect(thanksUrl);
  }

  if (message.length < 10) {
    redirect(`/review/${slug}/feedback?error=message_too_short&${new URLSearchParams({ ...(src ? { src } : {}), ...(medium ? { medium } : {}), ...(placement ? { placement } : {}) }).toString()}`);
  }

  if (email && !isValidEmail(email)) {
    redirect(`/review/${slug}/feedback?error=invalid_email&${new URLSearchParams({ ...(src ? { src } : {}), ...(medium ? { medium } : {}), ...(placement ? { placement } : {}) }).toString()}`);
  }

  const location = await prisma.location.findFirst({
    where: { slug },
    select: { id: true, organizationId: true },
  });

  if (!location) redirect("/");

  const hdrs = await headers();
  const clientIp = hdrs.get("x-forwarded-for")?.split(",")[0]?.trim() ?? null;

  const rateLimited = await isRateLimited(location.id, clientIp);
  if (rateLimited) {
    redirect(`/review/${slug}/feedback?error=rate_limited`);
  }

  const attr = sanitizeAttribution({ src, medium, placement, sessionId });

  const internalNoteParts: string[] = [`Review link feedback.`];
  if (src) internalNoteParts.push(`Source: ${src}.`);
  if (email) internalNoteParts.push(`Contact email: ${email}.`);

  await prisma.review.create({
    data: {
      locationId: location.id,
      source: ReviewSource.INTERNAL,
      status: ReviewStatus.PRIVATE_FEEDBACK,
      reviewerName: name || "Anonymous",
      body: message,
      rating: null,
      internalNotes: internalNoteParts.join(" "),
      reviewedAt: new Date(),
    },
  });

  await recordEvents({
    locationId: location.id,
    organizationId: location.organizationId,
    eventTypes: [ReviewLinkEventType.FEEDBACK_SUBMITTED],
    attribution: attr,
    clientIp,
  });

  redirect(thanksUrl);
}
```

- [ ] **Step 2: Create `page.tsx`**

```typescript
export const dynamic = "force-dynamic";

import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { submitReviewLinkFeedback } from "./actions";

export default async function ReviewLinkFeedbackPage({
  params,
  searchParams,
}: {
  params: Promise<{ slug: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const { slug } = await params;
  const query = await searchParams;

  const location = await prisma.location.findFirst({
    where: { slug },
    select: { id: true, name: true },
  });

  if (!location) notFound();

  const src = typeof query.src === "string" ? query.src : null;
  const medium = typeof query.medium === "string" ? query.medium : null;
  const placement = typeof query.placement === "string" ? query.placement : null;
  const error = typeof query.error === "string" ? query.error : null;

  const errorMessage =
    error === "message_too_short" ? "Your message must be at least 10 characters." :
    error === "invalid_email" ? "Please enter a valid email address." :
    error === "rate_limited" ? "Too many submissions. Please try again later." :
    null;

  return (
    <main className="flex min-h-screen items-center justify-center bg-slate-50 px-4 py-10">
      <div className="mx-auto w-full max-w-lg rounded-3xl border border-slate-200 bg-white p-8 shadow-lg">
        <p className="text-xs font-semibold uppercase tracking-[0.18em] text-indigo-600">{location.name}</p>
        <h1 className="mt-3 text-2xl font-semibold tracking-tight text-slate-950">Share your feedback</h1>
        <p className="mt-2 text-sm text-slate-500">
          Your name and email are optional. This feedback goes only to the business and is not posted publicly.
        </p>

        {errorMessage && (
          <div className="mt-4 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
            {errorMessage}
          </div>
        )}

        <form action={submitReviewLinkFeedback} className="mt-6 space-y-4">
          <input type="hidden" name="slug" value={slug} />
          {src && <input type="hidden" name="src" value={src} />}
          {medium && <input type="hidden" name="medium" value={medium} />}
          {placement && <input type="hidden" name="placement" value={placement} />}
          {/* Honeypot — hidden from users, visible to bots */}
          <input type="text" name="website" className="hidden" tabIndex={-1} aria-hidden="true" />

          <div>
            <label className="block text-sm font-semibold text-slate-700" htmlFor="rl-name">
              Name <span className="font-normal text-slate-400">(optional)</span>
            </label>
            <input
              id="rl-name"
              name="name"
              type="text"
              maxLength={100}
              className="mt-2 w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-900 placeholder-slate-400 focus:border-indigo-400 focus:outline-none focus:ring-2 focus:ring-indigo-100"
              placeholder="Your name"
            />
          </div>

          <div>
            <label className="block text-sm font-semibold text-slate-700" htmlFor="rl-email">
              Email <span className="font-normal text-slate-400">(optional)</span>
            </label>
            <input
              id="rl-email"
              name="email"
              type="email"
              maxLength={200}
              className="mt-2 w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-900 placeholder-slate-400 focus:border-indigo-400 focus:outline-none focus:ring-2 focus:ring-indigo-100"
              placeholder="you@example.com"
            />
          </div>

          <div>
            <label className="block text-sm font-semibold text-slate-700" htmlFor="rl-message">
              What happened? <span className="text-red-500">*</span>
            </label>
            <textarea
              id="rl-message"
              name="message"
              required
              minLength={10}
              maxLength={2000}
              rows={5}
              className="mt-2 w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-900 placeholder-slate-400 focus:border-indigo-400 focus:outline-none focus:ring-2 focus:ring-indigo-100"
              placeholder="Share what could have gone better, and anything you'd want the team to know."
            />
          </div>

          <button
            type="submit"
            className="w-full rounded-2xl bg-slate-950 px-5 py-3 text-sm font-semibold text-white shadow-sm hover:bg-slate-800 transition"
          >
            Send private feedback
          </button>
        </form>
      </div>
    </main>
  );
}
```

- [ ] **Step 3: Typecheck**

```bash
npm run typecheck
```

Expected: exit 0.

- [ ] **Step 4: Commit**

```bash
git add src/app/review/[slug]/feedback/
git commit -m "feat: add /review/[slug]/feedback form with honeypot, rate limiting, and validation"
```

---

## Task 9: Create `/review/[slug]/thanks` — confirmation page

**Files:**
- Create: `src/app/review/[slug]/thanks/page.tsx`

- [ ] **Step 1: Create the page**

```typescript
import { notFound } from "next/navigation";
import Link from "next/link";
import { prisma } from "@/lib/prisma";

export default async function ReviewLinkThanksPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;

  const location = await prisma.location.findFirst({
    where: { slug },
    select: { name: true },
  });

  if (!location) notFound();

  return (
    <main className="flex min-h-screen items-center justify-center bg-slate-50 px-4 py-10">
      <div className="mx-auto w-full max-w-sm rounded-3xl border border-slate-200 bg-white p-8 shadow-lg text-center">
        <div className="text-5xl mb-4">🙏</div>
        <p className="text-xs font-semibold uppercase tracking-[0.18em] text-indigo-600 mb-2">
          {location.name}
        </p>
        <h1 className="text-2xl font-semibold tracking-tight text-slate-950">Thank you</h1>
        <p className="mt-3 text-sm text-slate-500 leading-relaxed">
          We take every message seriously and will follow up if you&apos;ve provided contact information.
        </p>
        <Link
          href={`/review/${slug}`}
          className="mt-6 inline-block text-sm text-indigo-600 hover:underline"
        >
          ← Back
        </Link>
      </div>
    </main>
  );
}
```

- [ ] **Step 2: Commit**

```bash
git add src/app/review/[slug]/thanks/page.tsx
git commit -m "feat: add /review/[slug]/thanks confirmation page"
```

---

## Task 10: Update navigation — add "Review Links" nav item

**Files:**
- Modify: `src/lib/navigation.ts`

- [ ] **Step 1: Add `"review-links"` to `ScreenKey` type**

In `src/lib/navigation.ts`, change the `ScreenKey` type to include `"review-links"`:

```typescript
export type ScreenKey =
  | "dashboard"
  | "contacts"
  | "reviews"
  | "campaigns"
  | "campaign-wizard"
  | "funnel-builder"
  | "locations"
  | "widgets"
  | "video-testimonials"
  | "automation"
  | "team"
  | "analytics"
  | "integrations"
  | "gbp-manager"
  | "gbp-posts"
  | "gbp-photos"
  | "gbp-qa"
  | "funnel-preview"
  | "settings"
  | "review-links";
```

- [ ] **Step 2: Add nav item to `navItems` array in the "REQUESTS & FEEDBACK" group**

Add after the `campaigns` item:
```typescript
{ key: "review-links", label: "Review Links", icon: "🔗", href: "/review-links", group: "REQUESTS & FEEDBACK" },
```

The "REQUESTS & FEEDBACK" group will now have: Contacts, Review Requests, **Review Links**, Reviews Inbox.

- [ ] **Step 3: Typecheck**

```bash
npm run typecheck
```

Expected: exit 0.

- [ ] **Step 4: Commit**

```bash
git add src/lib/navigation.ts
git commit -m "feat: add Review Links nav item to REQUESTS & FEEDBACK group"
```

---

## Task 11: Create `src/lib/email-signature.ts`

**Files:**
- Create: `src/lib/email-signature.ts`

- [ ] **Step 1: Create the utility**

```typescript
export function buildEmailSignatureSnippet(params: {
  appUrl: string;
  slug: string;
}): string {
  const { appUrl, slug } = params;
  const base = appUrl.replace(/\/$/, "");

  const happyUrl = `${base}/review/${slug}/google?src=email_signature&amp;medium=email&amp;placement=happy_button`;
  const unhappyUrl = `${base}/review/${slug}/feedback?src=email_signature&amp;medium=email&amp;placement=unhappy_button`;

  return `<table cellpadding="0" cellspacing="0" border="0" style="font-family:Arial,sans-serif">
  <tr>
    <td style="padding-top:10px;border-top:1px solid #e5e7eb">
      <span style="font-size:12px;color:#6b7280;margin-right:8px">How was your visit?</span>
      <a href="${happyUrl}" style="display:inline-block;background:#f0fdf4;border:1.5px solid #bbf7d0;border-radius:6px;padding:6px 12px;text-decoration:none;font-size:12px;font-weight:700;color:#15803d;margin-right:6px">&#128077; Great</a>
      <a href="${unhappyUrl}" style="display:inline-block;background:#fff7ed;border:1.5px solid #fed7aa;border-radius:6px;padding:6px 12px;text-decoration:none;font-size:12px;font-weight:700;color:#c2410c">&#128078; Not great</a>
    </td>
  </tr>
</table>`;
}
```

> Note: emoji are encoded as HTML entities (`&#128077;` = 👍, `&#128078;` = 👎) for maximum email client compatibility. `&amp;` is used in href attributes as required.

- [ ] **Step 2: Commit**

```bash
git add src/lib/email-signature.ts
git commit -m "feat: add email signature HTML snippet generator"
```

---

## Task 12: Install `qrcode` package

**Files:**
- Modify: `package.json`

- [ ] **Step 1: Install the package**

```bash
npm install qrcode
npm install --save-dev @types/qrcode
```

- [ ] **Step 2: Verify it installed**

```bash
node -e "require('qrcode'); console.log('ok')"
```

Expected: `ok`

- [ ] **Step 3: Commit**

```bash
git add package.json package-lock.json
git commit -m "chore: add qrcode package for client-side QR code generation"
```

---

## Task 13: Create `/review-links` admin page

**Files:**
- Create: `src/app/review-links/page.tsx`
- Create: `src/app/review-links/review-links-client.tsx`

- [ ] **Step 1: Create the client component `review-links-client.tsx`**

This file contains the tabbed card UI, copy buttons, QR generator, and analytics display.

```typescript
"use client";

import { useState, useEffect, useRef } from "react";
import QRCode from "qrcode";

type LocationData = {
  id: string;
  name: string;
  slug: string;
  reviewUrl: string;
  hasGoogleUrl: boolean;
};

function CopyButton({ text }: { text: string }) {
  const [copied, setCopied] = useState(false);
  return (
    <button
      type="button"
      onClick={async () => {
        await navigator.clipboard.writeText(text);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
      }}
      className="rounded-xl bg-indigo-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-indigo-700 transition whitespace-nowrap"
    >
      {copied ? "Copied!" : "Copy"}
    </button>
  );
}

function LinksTab({ slug, appUrl }: { slug: string; appUrl: string }) {
  const base = appUrl.replace(/\/$/, "");
  const defaultUrl = `${base}/review/${slug}`;
  const sources = [
    { label: "Email Signature", src: "email_signature", medium: "email" },
    { label: "QR / Print", src: "qr_counter", medium: "print" },
    { label: "Invoice", src: "invoice", medium: "print" },
    { label: "Website", src: "website", medium: "digital" },
  ];

  return (
    <div className="space-y-4 pt-4">
      <div>
        <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500 mb-2">Default link</p>
        <div className="flex items-center gap-2">
          <input
            readOnly
            value={defaultUrl}
            className="flex-1 rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-xs font-mono text-slate-700"
          />
          <CopyButton text={defaultUrl} />
        </div>
      </div>
      <div>
        <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500 mb-2">Source-specific links</p>
        <div className="space-y-2">
          {sources.map((s) => {
            const url = `${base}/review/${slug}?src=${s.src}&medium=${s.medium}`;
            return (
              <div key={s.src} className="flex items-center gap-2">
                <span className="w-28 shrink-0 text-xs font-semibold text-slate-600">{s.label}</span>
                <input
                  readOnly
                  value={url}
                  className="flex-1 rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-xs font-mono text-slate-600"
                />
                <CopyButton text={url} />
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

function EmailSigTab({ slug, appUrl, snippet }: { slug: string; appUrl: string; snippet: string }) {
  return (
    <div className="space-y-4 pt-4">
      <div>
        <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500 mb-2">Preview</p>
        <div
          className="rounded-xl border border-slate-200 bg-white p-4 font-sans text-sm"
          dangerouslySetInnerHTML={{ __html: snippet }}
        />
      </div>
      <div>
        <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500 mb-2">HTML snippet</p>
        <div className="relative">
          <pre className="overflow-x-auto rounded-xl border border-slate-200 bg-slate-50 p-3 text-xs text-slate-700 whitespace-pre-wrap">
            {snippet}
          </pre>
          <div className="absolute top-2 right-2">
            <CopyButton text={snippet} />
          </div>
        </div>
      </div>
    </div>
  );
}

function QrTab({ reviewUrl, locationName }: { reviewUrl: string; locationName: string }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [qrReady, setQrReady] = useState(false);

  useEffect(() => {
    if (!canvasRef.current) return;
    QRCode.toCanvas(canvasRef.current, reviewUrl, { width: 200, margin: 2 }, () => {
      setQrReady(true);
    });
  }, [reviewUrl]);

  function handleDownload() {
    if (!canvasRef.current) return;
    const link = document.createElement("a");
    link.download = `${locationName.replace(/\s+/g, "-").toLowerCase()}-review-qr.png`;
    link.href = canvasRef.current.toDataURL("image/png");
    link.click();
  }

  function handlePrint() {
    window.print();
  }

  return (
    <div className="pt-4 space-y-4">
      <div className="flex flex-col items-center gap-4">
        <canvas ref={canvasRef} className="rounded-xl border border-slate-200" />
        <p className="text-xs text-slate-500 font-mono">{reviewUrl}</p>
        <div className="flex gap-3">
          <button
            type="button"
            onClick={handleDownload}
            disabled={!qrReady}
            className="rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50 transition disabled:opacity-40"
          >
            Download PNG
          </button>
          <button
            type="button"
            onClick={handlePrint}
            className="rounded-xl bg-slate-950 px-4 py-2 text-sm font-semibold text-white hover:bg-slate-800 transition"
          >
            Print
          </button>
        </div>
      </div>
    </div>
  );
}

function AnalyticsTab({ slug }: { slug: string }) {
  const [range, setRange] = useState(30);
  const [data, setData] = useState<null | {
    uniqueViews: number;
    happyClicks: number;
    unhappyClicks: number;
    googleRedirects: number;
    feedbackSubmissions: number;
  }>(null);

  useEffect(() => {
    setData(null);
    fetch(`/api/review-links/${slug}/analytics?range=${range}`)
      .then((r) => r.json())
      .then(setData)
      .catch(() => {});
  }, [slug, range]);

  return (
    <div className="pt-4 space-y-4">
      <div className="flex items-center gap-2">
        <span className="text-xs font-semibold text-slate-500">Period:</span>
        {[7, 30, 90].map((d) => (
          <button
            key={d}
            type="button"
            onClick={() => setRange(d)}
            className={`rounded-lg px-3 py-1 text-xs font-semibold transition ${range === d ? "bg-indigo-600 text-white" : "bg-slate-100 text-slate-700 hover:bg-slate-200"}`}
          >
            {d}d
          </button>
        ))}
      </div>
      {data ? (
        <div className="grid grid-cols-3 gap-3">
          {[
            { label: "Views", value: data.uniqueViews },
            { label: "Happy", value: data.happyClicks },
            { label: "Unhappy", value: data.unhappyClicks },
            { label: "Google Redirects", value: data.googleRedirects },
            { label: "Feedback", value: data.feedbackSubmissions },
          ].map((stat) => (
            <div key={stat.label} className="rounded-xl border border-slate-200 bg-slate-50 p-3 text-center">
              <p className="text-xl font-bold text-slate-900">{stat.value}</p>
              <p className="text-xs text-slate-500">{stat.label}</p>
            </div>
          ))}
        </div>
      ) : (
        <p className="text-sm text-slate-400">Loading…</p>
      )}
    </div>
  );
}

const TABS = ["Links", "Email Sig", "QR Code", "Analytics"] as const;
type Tab = typeof TABS[number];

function LocationCard({
  location,
  appUrl,
  emailSnippet,
}: {
  location: LocationData;
  appUrl: string;
  emailSnippet: string;
}) {
  const [activeTab, setActiveTab] = useState<Tab>("Links");
  const qrUrl = `${appUrl.replace(/\/$/, "")}/review/${location.slug}?src=qr_counter`;

  return (
    <div className="rounded-3xl border border-slate-200 bg-white shadow-sm overflow-hidden">
      <div className="px-6 py-4 border-b border-slate-100">
        <p className="font-semibold text-slate-900">{location.name}</p>
        <p className="text-xs text-slate-500 mt-0.5 font-mono">{location.slug}</p>
        {!location.hasGoogleUrl && (
          <p className="text-xs text-amber-600 mt-1">⚠ No Google review URL configured — happy card disabled.</p>
        )}
      </div>
      <div className="flex border-b border-slate-100">
        {TABS.map((tab) => (
          <button
            key={tab}
            type="button"
            onClick={() => setActiveTab(tab)}
            className={`px-4 py-3 text-xs font-semibold transition ${activeTab === tab ? "text-indigo-600 border-b-2 border-indigo-600" : "text-slate-500 hover:text-slate-700"}`}
          >
            {tab}
          </button>
        ))}
      </div>
      <div className="px-6 pb-6">
        {activeTab === "Links" && <LinksTab slug={location.slug} appUrl={appUrl} />}
        {activeTab === "Email Sig" && <EmailSigTab slug={location.slug} appUrl={appUrl} snippet={emailSnippet} />}
        {activeTab === "QR Code" && <QrTab reviewUrl={qrUrl} locationName={location.name} />}
        {activeTab === "Analytics" && <AnalyticsTab slug={location.slug} />}
      </div>
    </div>
  );
}

export function ReviewLinksClient({
  locations,
  appUrl,
  emailSnippets,
}: {
  locations: LocationData[];
  appUrl: string;
  emailSnippets: Record<string, string>;
}) {
  const [search, setSearch] = useState("");

  const filtered = locations.filter((l) =>
    l.name.toLowerCase().includes(search.toLowerCase()),
  );

  return (
    <div className="space-y-6">
      {locations.length > 3 && (
        <input
          type="search"
          placeholder="Filter locations…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="w-full max-w-sm rounded-2xl border border-slate-200 bg-white px-4 py-2.5 text-sm text-slate-900 placeholder-slate-400 focus:border-indigo-400 focus:outline-none focus:ring-2 focus:ring-indigo-100"
        />
      )}
      {filtered.length === 0 && (
        <p className="text-sm text-slate-500">No locations match your search.</p>
      )}
      {filtered.map((loc) => (
        <LocationCard
          key={loc.id}
          location={loc}
          appUrl={appUrl}
          emailSnippet={emailSnippets[loc.slug] ?? ""}
        />
      ))}
    </div>
  );
}
```

- [ ] **Step 2: Create the server component `page.tsx`**

```typescript
export const dynamic = "force-dynamic";

import { redirect } from "next/navigation";
import { AppShell } from "@/components/app-shell";
import { getCurrentMembership } from "@/lib/authz";
import { getCurrentAccessibleLocationIds } from "@/lib/current-scope";
import { prisma } from "@/lib/prisma";
import { buildGoogleWriteReviewLink } from "@/lib/locations";
import { buildEmailSignatureSnippet } from "@/lib/email-signature";
import { getLocationAnalytics } from "@/lib/review-link-analytics";
import { ReviewLinksClient } from "./review-links-client";

export default async function ReviewLinksPage() {
  const membership = await getCurrentMembership();
  if (!membership) redirect("/sign-in");

  const locationIds = await getCurrentAccessibleLocationIds();

  const locations = await prisma.location.findMany({
    where:
      locationIds.length > 0
        ? { id: { in: locationIds }, organizationId: membership.organizationId }
        : { organizationId: membership.organizationId },
    select: {
      id: true,
      name: true,
      slug: true,
      reviewLink: true,
      googlePlaceId: true,
    },
    orderBy: { name: "asc" },
  });

  const appUrl = process.env.NEXT_PUBLIC_APP_URL?.replace(/\/$/, "") ?? "";

  // Build summary stats across all locations (last 30d)
  const statsPerLocation = await Promise.all(
    locations.map((loc) => getLocationAnalytics(loc.id, 30)),
  );
  const totalViews = statsPerLocation.reduce((sum, s) => sum + s.uniqueViews, 0);
  const totalHappy = statsPerLocation.reduce((sum, s) => sum + s.happyClicks, 0);
  const totalUnhappy = statsPerLocation.reduce((sum, s) => sum + s.unhappyClicks, 0);

  const locationData = locations.map((loc) => ({
    id: loc.id,
    name: loc.name,
    slug: loc.slug,
    reviewUrl: `${appUrl}/review/${loc.slug}`,
    hasGoogleUrl: Boolean(loc.reviewLink ?? buildGoogleWriteReviewLink(loc.googlePlaceId)),
  }));

  const emailSnippets = Object.fromEntries(
    locations.map((loc) => [
      loc.slug,
      buildEmailSignatureSnippet({ appUrl, slug: loc.slug }),
    ]),
  );

  return (
    <AppShell activeScreen="review-links">
      <div className="space-y-6">
        <div>
          <p className="text-sm font-semibold uppercase tracking-[0.22em] text-indigo-600">Review Links</p>
          <h2 className="mt-2 text-3xl font-semibold tracking-tight text-slate-950">Anonymous Review Links</h2>
          <p className="mt-3 max-w-3xl text-slate-600">
            Share these links in email signatures, QR codes, invoices, and websites. Happy clicks go straight to Google. Unhappy clicks go to private feedback.
          </p>
        </div>

        {/* Summary stats */}
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
          {[
            { label: "Locations", value: locations.length },
            { label: "Views (30d)", value: totalViews },
            { label: "Happy (30d)", value: totalHappy },
            { label: "Unhappy (30d)", value: totalUnhappy },
          ].map((stat) => (
            <div key={stat.label} className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm text-center">
              <p className="text-2xl font-bold text-slate-950">{stat.value}</p>
              <p className="text-xs text-slate-500 mt-1">{stat.label}</p>
            </div>
          ))}
        </div>

        {locations.length === 0 ? (
          <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
            <p className="text-sm font-semibold text-slate-900">No locations yet.</p>
            <p className="mt-2 text-sm text-slate-600">Add a location first to generate review links.</p>
          </div>
        ) : (
          <ReviewLinksClient
            locations={locationData}
            appUrl={appUrl}
            emailSnippets={emailSnippets}
          />
        )}
      </div>
    </AppShell>
  );
}
```

- [ ] **Step 3: Typecheck**

```bash
npm run typecheck
```

Expected: exit 0.

- [ ] **Step 4: Commit**

```bash
git add src/app/review-links/
git commit -m "feat: add /review-links admin page with tabbed location cards, QR, email sig, analytics"
```

---

## Task 14: Create analytics API endpoint

**Files:**
- Create: `src/app/api/review-links/[slug]/analytics/route.ts`

- [ ] **Step 1: Create the route**

```typescript
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentMembership } from "@/lib/authz";
import { getLocationAnalytics } from "@/lib/review-link-analytics";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ slug: string }> },
) {
  const membership = await getCurrentMembership();
  if (!membership) {
    return NextResponse.json({ ok: false }, { status: 401 });
  }

  const { slug } = await params;
  const url = new URL(request.url);
  const rawRange = url.searchParams.get("range");
  const range = rawRange === "7" ? 7 : rawRange === "90" ? 90 : 30;

  const location = await prisma.location.findFirst({
    where: { slug, organizationId: membership.organizationId },
    select: { id: true },
  });

  if (!location) {
    return NextResponse.json({ ok: false }, { status: 404 });
  }

  const data = await getLocationAnalytics(location.id, range);
  return NextResponse.json({ ok: true, ...data });
}
```

- [ ] **Step 2: Typecheck**

```bash
npm run typecheck
```

Expected: exit 0.

- [ ] **Step 3: Commit**

```bash
git add src/app/api/review-links/[slug]/analytics/route.ts
git commit -m "feat: add /api/review-links/[slug]/analytics endpoint scoped to org"
```

---

## Task 15: Add "Review Link" section to location detail page

**Files:**
- Modify: `src/app/locations/[id]/page.tsx`

- [ ] **Step 1: Find the location detail page and check its current structure**

Read `src/app/locations/[id]/page.tsx` to find the end of the page content where a new section can be appended. Look for the closing `</AppShell>` tag.

- [ ] **Step 2: Add a Review Link section before `</AppShell>`**

Import the needed utilities at the top of the file:
```typescript
import Link from "next/link";
import { buildGoogleWriteReviewLink } from "@/lib/locations";
```

Add a new section card near the bottom of the page content (before the closing of the main content div):
```tsx
{/* Review Link section */}
<section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
  <p className="text-sm font-semibold uppercase tracking-[0.22em] text-indigo-600">Review Link</p>
  <h3 className="mt-2 text-xl font-semibold text-slate-950">Anonymous review link</h3>
  <p className="mt-2 text-sm text-slate-500">
    Share this link in email signatures, QR codes, or anywhere else you want to collect reviews.
  </p>
  <div className="mt-4 flex items-center gap-3">
    <code className="flex-1 rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-xs font-mono text-slate-700 truncate">
      {`${process.env.NEXT_PUBLIC_APP_URL?.replace(/\/$/, "") ?? ""}/review/${location.slug}`}
    </code>
    <Link
      href="/review-links"
      className="rounded-xl bg-indigo-600 px-4 py-2 text-xs font-semibold text-white hover:bg-indigo-700 transition whitespace-nowrap"
    >
      Manage links →
    </Link>
  </div>
  {!location.reviewLink && !location.googlePlaceId && (
    <p className="mt-3 text-xs text-amber-600">
      ⚠ No Google review URL configured. Happy-path redirection will be disabled until a Google Place ID or review URL is set.
    </p>
  )}
</section>
```

> The `location` variable must include `slug`, `reviewLink`, and `googlePlaceId` fields. Verify the existing query selects these or add them to the select.

- [ ] **Step 3: Typecheck**

```bash
npm run typecheck
```

Expected: exit 0.

- [ ] **Step 4: Commit**

```bash
git add src/app/locations/
git commit -m "feat: add Review Link section to location detail page"
```

---

## Task 16: Run full validation and integration test

- [ ] **Step 1: Run typecheck**

```bash
npm run typecheck
```

Expected: exit 0.

- [ ] **Step 2: Run lint**

```bash
npm run lint
```

Expected: 0 errors (warnings OK).

- [ ] **Step 3: Run unit tests**

```bash
node --test src/lib/review-link-analytics.test.ts
```

Expected: all tests pass.

- [ ] **Step 4: Smoke-test the public flow manually**

With the dev server running (`npm run dev`):

1. Navigate to `http://localhost:3000/review/[a-valid-slug]`
   - Expected: landing page with happy/unhappy cards
2. Click the happy card
   - Expected: redirected to the location's Google review URL (or back to landing page if no Google URL)
   - Expected: `ReviewLinkEvent` rows for `HAPPY_CLICKED` and `GOOGLE_REDIRECT_CLICKED` in DB
3. Navigate back, click unhappy card
   - Expected: feedback form at `/review/[slug]/feedback`
4. Submit feedback with message < 10 chars
   - Expected: redirect back to form with `error=message_too_short`
5. Submit valid feedback
   - Expected: redirect to thanks page
   - Expected: `Review` record with `status: PRIVATE_FEEDBACK`, `rating: null`
   - Expected: `ReviewLinkEvent` row for `FEEDBACK_SUBMITTED`

- [ ] **Step 5: Smoke-test admin UI**

1. Navigate to `http://localhost:3000/review-links`
   - Expected: page loads, shows location cards
2. Click "Links" tab → copy a source URL
3. Click "Email Sig" tab → verify HTML snippet shows and copy works
4. Click "QR Code" tab → QR renders, download works
5. Click "Analytics" tab → shows counts (may be zeros)

- [ ] **Step 6: Verify dashboard exclusion fix**

In the database, check:
```sql
SELECT status, rating, COUNT(*) FROM "Review" GROUP BY status, rating;
```
Confirm `PRIVATE_FEEDBACK` records with `rating IS NULL` exist after testing, and that the dashboard shows the same average rating as before (PRIVATE_FEEDBACK excluded).

- [ ] **Step 7: Final commit if any fixes needed**

```bash
git add -A
git commit -m "fix: integration test fixes"
```

---

## Migration Notes

### Rollback considerations

The two schema changes are:
1. `Review.rating Int → Int?` — **safe to roll back**: changing nullable back to non-null requires all existing null rows to be filled. If rolled back, add `UPDATE "Review" SET rating = 1 WHERE rating IS NULL AND status = 'PRIVATE_FEEDBACK'` before removing the nullable.
2. `ReviewLinkEvent` table — **safe to drop**: no other tables reference it.

### Zero-downtime deployment

- Making `rating` nullable does not break reads or existing writes (non-null values continue to work)
- The new table has `onDelete: Restrict` — deploy the new table before any deletion workflows reference it
- The `qrcode` package is client-side only, no server-side implications

---

## Test Coverage Plan

### Unit tests (in `src/lib/review-link-analytics.test.ts` — Task 4)

- ✅ `sanitizeAttribution` — known/unknown source, medium, placement
- ✅ `sanitizeAttribution` — valid/invalid UUID sessionId
- ✅ `sanitizeAttribution` — referrer stripping, truncation, null on malformed

### Additional tests to add if `node:test` integration testing is feasible

Add to `src/lib/review-link-analytics.test.ts` if a test DB is available:

```typescript
// Rate limit test (requires DB connection)
test("isRateLimited — returns true after 5 submissions in 1 hour", async () => {
  // requires DB — skip in unit test environment, run in integration
  // Insert 5 FEEDBACK_SUBMITTED events for same IP/location within 1 hour
  // assert isRateLimited returns true
  // Insert 1 more — assert still true
});
```

### Manual/integration checklist

| Scenario | Expected |
|---|---|
| `/review/unknown-slug` | 404 |
| `/review/[slug]` (no Google URL) | Happy card disabled, feedback card active |
| `/review/[slug]/google` (no Google URL) | Redirects to `/review/[slug]` |
| `/review/[slug]/google` (with Google URL) | Records 2 events, 302 to Google |
| Feedback form — honeypot filled | Silent redirect to thanks |
| Feedback form — message < 10 chars | Error shown, no DB write |
| Feedback form — 6th submission same IP/location in 1h | Rate limited error |
| Feedback form — valid submission | `Review` row with `rating: null`, event recorded, redirect to thanks |
| Email sig happy URL clicked | Same as `/review/[slug]/google` |
| Email sig unhappy URL clicked | Same as `/review/[slug]/feedback` |
| `/review-links` unauthenticated | Redirect to sign-in |
| `/review-links` authenticated | Shows location cards with tabs |
| Analytics API unauth | 401 |
| Analytics API for another org's location | 404 |
| Dashboard average rating | Excludes `PRIVATE_FEEDBACK` |
| Widget payload | `rating: number` (non-null, via `?? 0`) |

---

## Open Questions

None — all design decisions are resolved in the spec. The only implementation-time decision is the rate-limit approach, which is specified above (DB-backed using `ReviewLinkEvent.clientIp` counts, no external service required).
