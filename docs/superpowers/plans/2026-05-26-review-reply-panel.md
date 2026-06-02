# Review Reply Panel Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Redesign `/reviews` as a two-column panel layout with URL-driven review selection and an AI reply generation button gated to Pro orgs.

**Architecture:** `searchParams.selected` drives which review is shown in the right panel — clicking a review navigates to `/reviews?selected=<id>` via a Next.js `<Link>`, keeping the full list visible. The AI reply button is a client component that POSTs to `/api/ai/reply-draft`, checks `org.aiReplyEnabled`, calls OpenAI, and inserts the draft into the textarea. The existing `saveReviewReply` server action handles saving.

**Tech Stack:** Next.js 14 App Router, Prisma + PostgreSQL, OpenAI `gpt-4o-mini`, `openai` npm package, `OPENAI_API_KEY` env var.

---

## File Map

| File | Change |
|---|---|
| `prisma/schema.prisma` | Add `aiReplyEnabled Boolean @default(false)` to Organization |
| `prisma/migrations/20260526_add_ai_reply_enabled/migration.sql` | ALTER TABLE for new column |
| `src/lib/ai-reply.ts` | **New** — builds OpenAI prompt, calls API, returns draft string |
| `src/app/api/ai/reply-draft/route.ts` | **New** — POST endpoint: auth → aiReplyEnabled check → OpenAI call |
| `src/components/reviews/review-list-item.tsx` | **New** — compact review card for the left panel |
| `src/components/reviews/review-reply-panel.tsx` | **New** — client component: full review body + reply form + AI button |
| `src/app/reviews/page.tsx` | **Rewrite** — two-column panel layout using `searchParams.selected` |

---

## Task 1: Schema — add aiReplyEnabled to Organization

**Files:**
- Modify: `prisma/schema.prisma`
- Create: `prisma/migrations/20260526_add_ai_reply_enabled/migration.sql`

- [ ] **Step 1: Add the field to the Organization model in `prisma/schema.prisma`**

Find the `Organization` model (currently around line 86). Add `aiReplyEnabled` after `updatedAt`:

```prisma
model Organization {
  id             String                  @id @default(cuid())
  name           String
  slug           String                  @unique
  website        String?
  aiReplyEnabled Boolean                 @default(false)
  createdAt      DateTime                @default(now())
  updatedAt      DateTime                @updatedAt

  users             UserMembership[]
  locations         Location[]
  automations       Automation[]
  googleConnections GoogleAccountConnection[]
  reviewWidgets     ReviewWidget[]
}
```

- [ ] **Step 2: Create the migration directory and SQL file**

```bash
mkdir -p prisma/migrations/20260526_add_ai_reply_enabled
```

Create `prisma/migrations/20260526_add_ai_reply_enabled/migration.sql`:

```sql
ALTER TABLE "Organization" ADD COLUMN "aiReplyEnabled" BOOLEAN NOT NULL DEFAULT false;
```

- [ ] **Step 3: Apply the migration**

```bash
npx prisma migrate dev --name add_ai_reply_enabled
```

Expected: `✓ Generated Prisma Client` with no errors.

- [ ] **Step 4: Verify the field exists**

```bash
node -e "const { Prisma } = require('@prisma/client'); console.log('aiReplyEnabled:', 'aiReplyEnabled' in Prisma.OrganizationScalarFieldEnum)"
```

Expected: `aiReplyEnabled: true`

- [ ] **Step 5: Commit**

```bash
git add prisma/schema.prisma prisma/migrations/20260526_add_ai_reply_enabled/
git commit -m "feat: add aiReplyEnabled to Organization for Pro plan gating"
```

---

## Task 2: AI reply library and API route

**Files:**
- Create: `src/lib/ai-reply.ts`
- Create: `src/app/api/ai/reply-draft/route.ts`

### Context

- `getCurrentMembership()` is in `src/lib/authz.ts` — returns the session user's membership including `organizationId` and `organization` (with `aiReplyEnabled` after Task 1)
- `requireReviewReplyAccess(locationId)` is in `src/lib/authz.ts` — throws if the user can't manage this location's reviews
- `getReviewById(id)` is in `src/lib/reviews.ts` — returns the review with location included
- `OPENAI_API_KEY` must be set in `.env.local` for local dev

### Step 1: Install the OpenAI npm package

```bash
npm install openai
```

Expected: package added to `package.json` dependencies.

- [ ] **Step 2: Create `src/lib/ai-reply.ts`**

```typescript
import OpenAI from "openai";

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

export async function generateReplyDraft(review: {
  reviewerName: string;
  rating: number;
  body: string;
}): Promise<string> {
  const firstName = review.reviewerName.trim().split(/\s+/)[0] || "there";

  const prompt = `You are a professional business owner responding to a customer review. Write a warm, professional reply (2-4 sentences) to this ${review.rating}-star review from ${firstName}:

"${review.body}"

Rules:
- Address the content of the review directly
- Do not be sycophantic or use hollow phrases like "We are so thrilled"
- Sign off naturally without a formal signature line
- Write in first-person plural (we/our)
- Return only the reply text, no preamble`;

  const completion = await openai.chat.completions.create({
    model: "gpt-4o-mini",
    messages: [{ role: "user", content: prompt }],
    max_tokens: 200,
    temperature: 0.7,
  });

  const text = completion.choices[0]?.message?.content?.trim();
  if (!text) throw new Error("OpenAI returned an empty response");
  return text;
}
```

- [ ] **Step 3: Create `src/app/api/ai/reply-draft/route.ts`**

```typescript
import { NextRequest, NextResponse } from "next/server";
import { getCurrentMembership, requireReviewReplyAccess } from "@/lib/authz";
import { getReviewById } from "@/lib/reviews";
import { generateReplyDraft } from "@/lib/ai-reply";

export async function POST(request: NextRequest) {
  const membership = await getCurrentMembership();
  if (!membership) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  if (!membership.organization.aiReplyEnabled) {
    return NextResponse.json({ error: "Pro feature — upgrade to use AI replies" }, { status: 403 });
  }

  if (!process.env.OPENAI_API_KEY) {
    return NextResponse.json({ error: "AI reply is not configured" }, { status: 500 });
  }

  let body: { reviewId?: string };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid request body" }, { status: 400 });
  }

  const reviewId = typeof body.reviewId === "string" ? body.reviewId.trim() : "";
  if (!reviewId) {
    return NextResponse.json({ error: "reviewId is required" }, { status: 400 });
  }

  const review = await getReviewById(reviewId);
  if (!review) {
    return NextResponse.json({ error: "Review not found" }, { status: 404 });
  }

  try {
    await requireReviewReplyAccess(review.locationId);
  } catch {
    return NextResponse.json({ error: "Access denied" }, { status: 403 });
  }

  try {
    const draft = await generateReplyDraft({
      reviewerName: review.reviewerName,
      rating: review.rating,
      body: review.body,
    });
    return NextResponse.json({ draft });
  } catch (err) {
    const message = err instanceof Error ? err.message : "AI generation failed";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
```

- [ ] **Step 4: Verify TypeScript compiles**

```bash
npx tsc --noEmit 2>&1 | grep -i "ai-reply\|reply-draft" | head -10
```

Expected: no errors for these files.

- [ ] **Step 5: Commit**

```bash
git add src/lib/ai-reply.ts src/app/api/ai/reply-draft/route.ts package.json package-lock.json
git commit -m "feat: add AI reply library and POST /api/ai/reply-draft endpoint"
```

---

## Task 3: ReviewListItem component

**Files:**
- Create: `src/components/reviews/review-list-item.tsx`

### Context

This is a pure presentational component — no client state needed. It renders as a `<Link>` to `/reviews?selected=<id>&<other-current-params>`. The parent page passes all filter params through so selecting a review doesn't reset the filters.

The `selected` prop determines whether to show the active highlight (indigo left border).

Types needed from `src/lib/reviews.ts`:
- `ReviewWithRelations` — the full review type already defined there
- `formatReviewSource`, `formatReviewStatus`, `stars`, `truncateReviewBody`, `formatReviewDate` — all exported from `src/lib/reviews.ts`

- [ ] **Step 1: Create the directory**

```bash
mkdir -p src/components/reviews
```

- [ ] **Step 2: Create `src/components/reviews/review-list-item.tsx`**

```tsx
import Link from "next/link";
import { formatReviewDate, formatReviewSource, formatReviewStatus, stars, truncateReviewBody, type ReviewWithRelations } from "@/lib/reviews";

export function ReviewListItem({
  review,
  selected,
  filterHref,
}: {
  review: ReviewWithRelations;
  selected: boolean;
  filterHref: string;
}) {
  const href = `${filterHref}&selected=${review.id}`;

  return (
    <Link
      href={href}
      className={`block rounded-2xl border p-4 transition-colors ${
        selected
          ? "border-indigo-300 bg-indigo-50"
          : "border-slate-200 hover:border-slate-300 hover:bg-slate-50"
      }`}
    >
      <div className="flex items-start justify-between gap-2">
        <div className="flex items-center gap-2 min-w-0">
          <div className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full bg-slate-200 text-xs font-bold uppercase text-slate-600">
            {review.reviewerName.charAt(0)}
          </div>
          <div className="min-w-0">
            <p className="truncate text-sm font-semibold text-slate-900">{review.reviewerName}</p>
            <p className="text-xs text-amber-500">{stars(review.rating)}</p>
          </div>
        </div>
        <p className="flex-shrink-0 text-xs text-slate-400">{formatReviewDate(review.reviewedAt)}</p>
      </div>

      <p className="mt-2 text-xs leading-5 text-slate-500">{truncateReviewBody(review.body, 120)}</p>

      <div className="mt-2 flex flex-wrap gap-1">
        <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-slate-500">
          {formatReviewSource(review.source, review.isTestimonial)}
        </span>
        <span className="rounded-full bg-slate-900 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-white">
          {formatReviewStatus(review.status, review.isTestimonial)}
        </span>
        {review.location && (
          <span className="rounded-full bg-indigo-50 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-indigo-600">
            {review.location.name}
          </span>
        )}
      </div>
    </Link>
  );
}
```

- [ ] **Step 3: Verify TypeScript compiles**

```bash
npx tsc --noEmit 2>&1 | grep "review-list-item" | head -5
```

Expected: no errors.

- [ ] **Step 4: Commit**

```bash
git add src/components/reviews/review-list-item.tsx
git commit -m "feat: add ReviewListItem component for panel inbox"
```

---

## Task 4: ReviewReplyPanel client component

**Files:**
- Create: `src/components/reviews/review-reply-panel.tsx`

### Context

This is a `"use client"` component. It receives:
- `review: ReviewWithRelations` — the selected review (pre-fetched by the server)
- `aiReplyEnabled: boolean` — from `membership.organization.aiReplyEnabled`
- `initialDraft: string` — from `review.replyDraft ?? buildReviewReplyDraft(review.reviewerName, review.rating)`

It manages:
- `draft` state (string) — the textarea value
- `aiLoading` state (boolean) — spinner while OpenAI responds
- `aiError` state (string | null) — error message below button

The "Save draft" and "Mark as sent" buttons submit to the existing `saveReviewReply` server action (imported from `@/app/reviews/actions`). Because this is a client component using server actions, import the action directly.

`saveReviewReply` reads `replyDraft` and `markSent` from FormData. The textarea `name="replyDraft"` and the hidden input `name="markSent"` must match exactly.

- [ ] **Step 1: Create `src/components/reviews/review-reply-panel.tsx`**

```tsx
"use client";

import { useState } from "react";
import { saveReviewReply } from "@/app/reviews/actions";
import { FormSubmitButton } from "@/components/form-submit-button";
import { formatReviewDate, formatReviewSource, formatReviewStatus, stars, type ReviewWithRelations } from "@/lib/reviews";

export function ReviewReplyPanel({
  review,
  aiReplyEnabled,
  initialDraft,
}: {
  review: ReviewWithRelations;
  aiReplyEnabled: boolean;
  initialDraft: string;
}) {
  const [draft, setDraft] = useState(initialDraft);
  const [aiLoading, setAiLoading] = useState(false);
  const [aiError, setAiError] = useState<string | null>(null);

  async function handleGenerateReply() {
    setAiLoading(true);
    setAiError(null);
    try {
      const res = await fetch("/api/ai/reply-draft", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ reviewId: review.id }),
        signal: AbortSignal.timeout(15000),
      });
      const data = await res.json();
      if (!res.ok) {
        setAiError(data.error ?? "Could not generate reply — try again");
        return;
      }
      setDraft(data.draft);
    } catch {
      setAiError("Could not generate reply — try again");
    } finally {
      setAiLoading(false);
    }
  }

  const sourceLabel = formatReviewSource(review.source, review.isTestimonial);
  const statusLabel = formatReviewStatus(review.status, review.isTestimonial);

  return (
    <div className="flex h-full flex-col gap-6 p-6">
      {/* Review header */}
      <div>
        <div className="flex flex-wrap items-center gap-2">
          <div className="flex h-10 w-10 items-center justify-center rounded-full bg-slate-200 text-sm font-bold uppercase text-slate-600">
            {review.reviewerName.charAt(0)}
          </div>
          <div>
            <p className="font-semibold text-slate-900">{review.reviewerName}</p>
            <p className="text-xs text-slate-500">{formatReviewDate(review.reviewedAt)}</p>
          </div>
          <span className="ml-auto rounded-full bg-slate-100 px-2.5 py-1 text-[11px] font-semibold uppercase tracking-wide text-slate-500">
            {sourceLabel}
          </span>
          <span className="rounded-full bg-slate-900 px-2.5 py-1 text-[11px] font-semibold uppercase tracking-wide text-white">
            {statusLabel}
          </span>
          {review.location && (
            <span className="rounded-full bg-indigo-50 px-2.5 py-1 text-[11px] font-semibold uppercase tracking-wide text-indigo-600">
              {review.location.name}
            </span>
          )}
        </div>
        <p className="mt-2 text-lg font-medium text-amber-500">{stars(review.rating)}</p>
      </div>

      {/* Review body */}
      <div className="rounded-2xl bg-slate-50 p-4 text-sm leading-7 text-slate-700">
        {review.body}
      </div>

      {/* AI reply button */}
      <div>
        <button
          type="button"
          onClick={handleGenerateReply}
          disabled={!aiReplyEnabled || aiLoading}
          className={`flex items-center gap-2 rounded-2xl px-4 py-2.5 text-sm font-semibold transition-colors ${
            aiReplyEnabled
              ? "bg-indigo-600 text-white hover:bg-indigo-700 disabled:cursor-wait disabled:opacity-60"
              : "cursor-not-allowed bg-slate-100 text-slate-400"
          }`}
          title={aiReplyEnabled ? undefined : "Upgrade to Pro to use AI replies"}
        >
          {aiLoading ? (
            <>
              <span className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
              Generating...
            </>
          ) : (
            <>
              ✨ Reply with AI
              {!aiReplyEnabled && (
                <span className="ml-1 rounded-full bg-amber-100 px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-wide text-amber-700">
                  Pro
                </span>
              )}
            </>
          )}
        </button>
        {aiError && <p className="mt-2 text-xs text-rose-600">{aiError}</p>}
      </div>

      {/* Reply form */}
      <form action={saveReviewReply} className="flex flex-1 flex-col gap-4">
        <input type="hidden" name="reviewId" value={review.id} />
        <textarea
          name="replyDraft"
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          placeholder="Write your reply..."
          className="min-h-36 flex-1 rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm leading-7 text-slate-700 outline-none focus:border-indigo-300"
        />

        {review.replySentAt && (
          <p className="text-xs text-slate-500">
            Last sent: {formatReviewDate(review.replySentAt)}
            {review.replySentByMembership?.user.name && ` by ${review.replySentByMembership.user.name}`}
          </p>
        )}

        <div className="flex flex-wrap gap-3">
          <button
            type="submit"
            name="markSent"
            value="false"
            className="rounded-2xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 shadow-sm hover:border-slate-300"
          >
            Save draft
          </button>
          <button
            type="submit"
            name="markSent"
            value="true"
            className="rounded-2xl bg-slate-950 px-4 py-2.5 text-sm font-semibold text-white shadow-sm"
          >
            Mark as sent
          </button>
        </div>
      </form>

      <div className="border-t border-slate-100 pt-3">
        <a
          href={`/reviews/${review.id}`}
          className="text-xs font-semibold text-indigo-600 hover:text-indigo-700"
        >
          View full details →
        </a>
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Verify TypeScript compiles**

```bash
npx tsc --noEmit 2>&1 | grep "review-reply-panel" | head -5
```

Expected: no errors.

- [ ] **Step 3: Commit**

```bash
git add src/components/reviews/review-reply-panel.tsx
git commit -m "feat: add ReviewReplyPanel client component with AI button"
```

---

## Task 5: Rewrite the reviews page as a panel layout

**Files:**
- Modify: `src/app/reviews/page.tsx`

### Context

The existing page is a server component that fetches reviews using `searchParams` for sort/status/source/locationId filters. We keep ALL of that — we just add `selected` to `searchParams` and split the layout into two columns.

Key changes:
- Add `selected` param: `const selectedId = typeof query.selected === "string" ? query.selected : null;`
- Fetch the selected review: `const selectedReview = selectedId ? await getReviewById(selectedId, locationIds) : null;`
- Get `aiReplyEnabled` from the membership: `const membership = await getCurrentMembership();` — `membership.organization.aiReplyEnabled`
- The `buildFilterHref` function must now PRESERVE the `selected` param when changing filters. Update it:

```typescript
const buildFilterHref = (next: { sort?: string; status?: string; source?: string; locationId?: string }) => {
  const params = new URLSearchParams();
  params.set("sort", next.sort ?? sort);
  params.set("status", next.status ?? status);
  params.set("source", next.source ?? source);
  params.set("locationId", next.locationId ?? allowedLocationId);
  // preserve selected review across filter changes
  if (selectedId) params.set("selected", selectedId);
  return `/reviews?${params.toString()}`;
};
```

- The `ReviewListItem` needs a `filterHref` that is the current URL without `selected` (so clicking a different review updates just `selected`):

```typescript
const baseFilterHref = (() => {
  const params = new URLSearchParams();
  params.set("sort", sort);
  params.set("status", status);
  params.set("source", source);
  params.set("locationId", allowedLocationId);
  return `/reviews?${params.toString()}`;
})();
```

- Import `getCurrentMembership` from `@/lib/authz`
- Import `buildReviewReplyDraft` from `@/lib/reviews`
- Import `ReviewListItem` from `@/components/reviews/review-list-item`
- Import `ReviewReplyPanel` from `@/components/reviews/review-reply-panel`

- [ ] **Step 1: Rewrite `src/app/reviews/page.tsx`**

Replace the entire file with:

```tsx
export const dynamic = "force-dynamic";

import Link from "next/link";
import { AppShell } from "@/components/app-shell";
import { StatCard } from "@/components/ui";
import { getCurrentMembership } from "@/lib/authz";
import {
  buildReviewPageStats,
  buildReviewReplyDraft,
  getReviewById,
  getReviewFilterOptions,
  getReviews,
  type ReviewSort,
  type ReviewSourceFilter,
  type ReviewStatusFilter,
} from "@/lib/reviews";
import { getCurrentAccessibleLocationIds } from "@/lib/current-scope";
import { ReviewListItem } from "@/components/reviews/review-list-item";
import { ReviewReplyPanel } from "@/components/reviews/review-reply-panel";

export default async function ReviewsPage({
  searchParams,
}: {
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
}) {
  const query = (await searchParams) ?? {};
  const requestedSort = typeof query.sort === "string" ? query.sort : "newest";
  const sort: ReviewSort = requestedSort === "highest" || requestedSort === "lowest" ? requestedSort : "newest";
  const requestedStatus = typeof query.status === "string" ? query.status : "all";
  const status: ReviewStatusFilter = ["published", "private-feedback", "needs-follow-up", "testimonials"].includes(requestedStatus)
    ? (requestedStatus as ReviewStatusFilter)
    : "all";
  const requestedSource = typeof query.source === "string" ? query.source : "all";
  const source: ReviewSourceFilter = ["google", "facebook", "internal"].includes(requestedSource)
    ? (requestedSource as ReviewSourceFilter)
    : "all";
  const locationId = typeof query.locationId === "string" ? query.locationId : "all";
  const selectedId = typeof query.selected === "string" ? query.selected : null;

  const locationIds = await getCurrentAccessibleLocationIds();
  const allowedLocationId = locationId !== "all" && locationIds.includes(locationId) ? locationId : "all";

  const [{ locations }, reviews, membership, selectedReview] = await Promise.all([
    getReviewFilterOptions(locationIds),
    getReviews(sort, {
      status,
      source,
      locationId: allowedLocationId !== "all" ? allowedLocationId : null,
      locationIds,
    }),
    getCurrentMembership(),
    selectedId ? getReviewById(selectedId, locationIds) : Promise.resolve(null),
  ]);

  const stats = buildReviewPageStats(reviews);
  const aiReplyEnabled = membership?.organization.aiReplyEnabled ?? false;

  const baseFilterHref = (() => {
    const params = new URLSearchParams();
    params.set("sort", sort);
    params.set("status", status);
    params.set("source", source);
    params.set("locationId", allowedLocationId);
    return `/reviews?${params.toString()}`;
  })();

  const buildFilterHref = (next: { sort?: string; status?: string; source?: string; locationId?: string }) => {
    const params = new URLSearchParams();
    params.set("sort", next.sort ?? sort);
    params.set("status", next.status ?? status);
    params.set("source", next.source ?? source);
    params.set("locationId", next.locationId ?? allowedLocationId);
    if (selectedId) params.set("selected", selectedId);
    return `/reviews?${params.toString()}`;
  };

  return (
    <AppShell activeScreen="reviews">
      <div className="flex h-full flex-col gap-6">
        {/* Header */}
        <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <p className="text-sm font-semibold uppercase tracking-[0.22em] text-indigo-600">Reviews Inbox</p>
            <h2 className="mt-2 text-3xl font-semibold tracking-tight text-slate-950">All reviews, organized for action</h2>
          </div>
          <div className="flex flex-wrap gap-2">
            {[
              { value: "newest", label: "Newest" },
              { value: "highest", label: "Highest rating" },
              { value: "lowest", label: "Lowest rating" },
            ].map((option) => (
              <Link
                key={option.value}
                href={buildFilterHref({ sort: option.value })}
                className={`rounded-2xl px-4 py-2 text-sm font-semibold shadow-sm ${
                  sort === option.value
                    ? "bg-slate-950 !text-white visited:!text-white hover:!text-white"
                    : "border border-slate-200 bg-white text-slate-600"
                }`}
              >
                {option.label}
              </Link>
            ))}
          </div>
        </div>

        {/* Stats */}
        <div className="grid gap-4 xl:grid-cols-4">
          <StatCard title="Average Rating" value={stats.averageRating} meta="Across all stored reviews" />
          <StatCard title="Published Reviews" value={stats.publishedReviews} meta={`${stats.googleReviews} from Google`} />
          <StatCard title="Private Feedback" value={stats.privateFeedback} meta="Needs internal attention" />
          <StatCard title="Testimonials" value={stats.testimonials} meta={`${stats.totalReviews} total records`} />
        </div>

        {/* Filters */}
        <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
          <div className="grid gap-4 lg:grid-cols-3">
            <div>
              <p className="text-sm font-semibold text-slate-700">Status</p>
              <div className="mt-3 flex flex-wrap gap-2">
                {[
                  { value: "all", label: "All" },
                  { value: "published", label: "Published" },
                  { value: "private-feedback", label: "Private feedback" },
                  { value: "needs-follow-up", label: "Needs follow-up" },
                  { value: "testimonials", label: "Testimonials" },
                ].map((option) => (
                  <Link
                    key={option.value}
                    href={buildFilterHref({ status: option.value })}
                    className={`rounded-2xl px-4 py-2 text-sm font-semibold ${status === option.value ? "bg-slate-950 !text-white" : "border border-slate-200 bg-slate-50 text-slate-700"}`}
                  >
                    {option.label}
                  </Link>
                ))}
              </div>
            </div>
            <div>
              <p className="text-sm font-semibold text-slate-700">Source</p>
              <div className="mt-3 flex flex-wrap gap-2">
                {[
                  { value: "all", label: "All" },
                  { value: "google", label: "Google" },
                  { value: "facebook", label: "Facebook" },
                  { value: "internal", label: "Internal" },
                ].map((option) => (
                  <Link
                    key={option.value}
                    href={buildFilterHref({ source: option.value })}
                    className={`rounded-2xl px-4 py-2 text-sm font-semibold ${source === option.value ? "bg-slate-950 !text-white" : "border border-slate-200 bg-slate-50 text-slate-700"}`}
                  >
                    {option.label}
                  </Link>
                ))}
              </div>
            </div>
            <div>
              <p className="text-sm font-semibold text-slate-700">Location</p>
              <div className="mt-3 flex flex-wrap gap-2">
                <Link
                  href={buildFilterHref({ locationId: "all" })}
                  className={`rounded-2xl px-4 py-2 text-sm font-semibold ${allowedLocationId === "all" ? "bg-slate-950 !text-white" : "border border-slate-200 bg-slate-50 text-slate-700"}`}
                >
                  All locations
                </Link>
                {locations.map((loc) => (
                  <Link
                    key={loc.id}
                    href={buildFilterHref({ locationId: loc.id })}
                    className={`rounded-2xl px-4 py-2 text-sm font-semibold ${allowedLocationId === loc.id ? "bg-slate-950 !text-white" : "border border-slate-200 bg-slate-50 text-slate-700"}`}
                  >
                    {loc.name}
                  </Link>
                ))}
              </div>
            </div>
          </div>
        </section>

        {/* Panel layout */}
        <div className="flex min-h-0 flex-1 gap-6">
          {/* Left: review list */}
          <div className={`flex flex-col gap-2 overflow-y-auto ${selectedReview ? "hidden xl:flex xl:w-2/5" : "w-full"}`}>
            {reviews.length === 0 ? (
              <div className="rounded-2xl border border-dashed border-slate-200 bg-slate-50 px-4 py-6 text-sm text-slate-600">
                No reviews yet. Sync Google or collect direct feedback to start populating the inbox.
              </div>
            ) : (
              reviews.map((review) => (
                <ReviewListItem
                  key={review.id}
                  review={review}
                  selected={review.id === selectedId}
                  filterHref={baseFilterHref}
                />
              ))
            )}
          </div>

          {/* Right: reply panel */}
          {selectedReview ? (
            <div className="flex-1 overflow-y-auto rounded-3xl border border-slate-200 bg-white shadow-sm xl:w-3/5">
              <div className="mb-2 border-b border-slate-100 px-6 pt-4 pb-3 xl:hidden">
                <Link href={baseFilterHref} className="text-sm font-semibold text-indigo-600">
                  ← Back to inbox
                </Link>
              </div>
              <ReviewReplyPanel
                review={selectedReview}
                aiReplyEnabled={aiReplyEnabled}
                initialDraft={selectedReview.replyDraft ?? buildReviewReplyDraft(selectedReview.reviewerName, selectedReview.rating)}
              />
            </div>
          ) : (
            <div className="hidden xl:flex xl:w-3/5 items-center justify-center rounded-3xl border border-dashed border-slate-200 bg-slate-50 text-sm text-slate-400">
              Select a review to reply
            </div>
          )}
        </div>
      </div>
    </AppShell>
  );
}
```

- [ ] **Step 2: Verify TypeScript compiles with no new errors**

```bash
npx tsc --noEmit 2>&1 | grep -v "node_modules" | grep "error TS" | head -20
```

Expected: same pre-existing errors as before, nothing new.

- [ ] **Step 3: Start the dev server and test manually**

```bash
npm run dev
```

1. Open `http://localhost:3000/reviews`
2. Should see two columns on wide screens: review list on left, empty state on right
3. Click a review — URL updates to `/reviews?selected=<id>`, right panel shows review body and reply textarea
4. Click a different review — panel updates to the new review
5. Change a filter (e.g. Status) — selected review is preserved in the URL
6. On mobile (dev tools narrow viewport) — list is full width, clicking a review shows panel full width with "← Back to inbox" link

- [ ] **Step 4: Commit**

```bash
git add src/app/reviews/page.tsx
git commit -m "feat: rewrite reviews page as two-column panel layout"
```

---

## Task 6: Add OPENAI_API_KEY to env and manual smoke test

**Files:**
- Modify: `.env.local` (local only — never commit)
- Modify: `.env.example` (if it exists) or document in README

- [ ] **Step 1: Add the key to `.env.local`**

```bash
echo "OPENAI_API_KEY=sk-..." >> .env.local
```

Replace `sk-...` with the actual key from platform.openai.com.

- [ ] **Step 2: Restart the dev server**

```bash
# Kill any running dev server first, then:
npm run dev
```

- [ ] **Step 3: Enable AI reply for the test org**

```bash
npx prisma db execute --schema=prisma/schema.prisma --stdin <<'EOF'
UPDATE "Organization" SET "aiReplyEnabled" = true;
EOF
```

This enables AI reply for all orgs locally for testing.

- [ ] **Step 4: Test the full flow**

1. Open `http://localhost:3000/reviews`
2. Click any review with a body
3. Click "✨ Reply with AI"
4. Should see spinner → textarea fills with generated reply (~2-3 seconds)
5. Edit the reply, click "Save draft" — page reloads with flash "Reply draft saved"
6. Click "Mark as sent" — page reloads with flash "Reply marked as sent"

- [ ] **Step 5: Test the Pro gate**

```bash
npx prisma db execute --schema=prisma/schema.prisma --stdin <<'EOF'
UPDATE "Organization" SET "aiReplyEnabled" = false;
EOF
```

Reload the page. The "Reply with AI" button should be greyed out with the "Pro" badge and be unclickable.

Re-enable when done:
```bash
npx prisma db execute --schema=prisma/schema.prisma --stdin <<'EOF'
UPDATE "Organization" SET "aiReplyEnabled" = true;
EOF
```

- [ ] **Step 6: Commit**

```bash
git add -A
git commit -m "feat: complete review reply panel with AI generation"
```

---

## Self-Review

**Spec coverage:**
- ✅ Two-column panel layout with URL-driven state → Task 5
- ✅ Left column: compact review cards with active highlight → Task 3
- ✅ Right column: full body + reply textarea + AI button + save/mark sent → Task 4
- ✅ Mobile: full-width panel with "← Back to inbox" → Task 5
- ✅ `aiReplyEnabled` org field + migration → Task 1
- ✅ AI reply API route with auth + plan check + OpenAI call → Task 2
- ✅ Pro badge on disabled button + tooltip → Task 4
- ✅ Error handling (OpenAI down, missing key, timeout) → Task 2 + Task 4
- ✅ "View full details →" link to `/reviews/<id>` → Task 4
- ✅ Filters preserved when selecting review → Task 5

**Placeholder scan:** None found — all code blocks are complete.

**Type consistency:** `ReviewWithRelations` used consistently across Tasks 3, 4, 5. `buildReviewReplyDraft(review.reviewerName, review.rating)` matches the existing signature in `src/lib/reviews.ts`. `saveReviewReply` form field names (`reviewId`, `replyDraft`, `markSent`) match the existing action.
