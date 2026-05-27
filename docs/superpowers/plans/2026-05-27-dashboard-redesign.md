# Dashboard Redesign Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the dashboard at `/` with a clean, reputation-focused layout: three KPI stat cards (Google Reviews hero, Funnel Conversion, Private Feedback), a recent activity feed, and a location leaderboard with funnel outcome counts.

**Architecture:** Two-file change. `src/lib/dashboard.ts` gains three new computed fields and one new query field. `src/app/page.tsx` is fully rewritten to use the new layout — no new components, no new routes.

**Tech Stack:** Next.js App Router (RSC), Tailwind CSS v3 (JIT arbitrary values), Prisma, Node.js `node:test`.

---

## File Map

| File | Change |
|------|--------|
| `src/lib/dashboard.ts` | Add `reviewerName` to reviews select; add `_count` to locations select; compute `googleAvgRating`, `googleReviewsThisMonth`, `recentActivity` |
| `src/app/page.tsx` | Full rewrite — new stat cards, activity feed, locations panel |

---

### Task 1: Extend `getDashboardData` with new fields

**Files:**
- Modify: `src/lib/dashboard.ts`

- [ ] **Step 1: Add `reviewerName` to the reviews query select**

Open `src/lib/dashboard.ts`. In the `prisma.review.findMany` call, the `select` block currently reads:

```ts
select: {
  rating: true,
  source: true,
  status: true,
  isTestimonial: true,
  isWidgetVisible: true,
  reviewedAt: true,
  createdAt: true,
},
```

Change it to:

```ts
select: {
  rating: true,
  source: true,
  status: true,
  isTestimonial: true,
  isWidgetVisible: true,
  reviewerName: true,
  reviewedAt: true,
  createdAt: true,
},
```

- [ ] **Step 2: Add `_count` to the locations query select**

In the same file, the `prisma.location.findMany` call has this select:

```ts
select: {
  id: true,
  name: true,
  status: true,
  avgRating: true,
},
```

Change it to:

```ts
select: {
  id: true,
  name: true,
  status: true,
  avgRating: true,
  _count: { select: { reviews: { where: { isTestimonial: false } } } },
},
```

- [ ] **Step 3: Compute the three new derived values**

After the existing line:

```ts
const facebookReviewCount = reviews.filter((review) => review.source === ReviewSource.FACEBOOK).length;
```

Add:

```ts
const startOfMonth = new Date();
startOfMonth.setDate(1);
startOfMonth.setHours(0, 0, 0, 0);

const googleReviewsOnly = reviews.filter(
  (r) => r.source === ReviewSource.GOOGLE && !r.isTestimonial,
);
const googleAvgRating =
  googleReviewsOnly.length > 0
    ? (
        googleReviewsOnly.reduce((sum, r) => sum + r.rating, 0) /
        googleReviewsOnly.length
      ).toFixed(1)
    : "0.0";
const googleReviewsThisMonth = googleReviewsOnly.filter(
  (r) => (r.reviewedAt ?? r.createdAt) >= startOfMonth,
).length;

const recentActivity = reviews
  .filter((r) => !r.isTestimonial)
  .slice(0, 10)
  .map((r) => ({
    reviewerName: r.reviewerName,
    rating: r.rating,
    sourceLabel:
      r.source === ReviewSource.GOOGLE
        ? "Google"
        : r.source === ReviewSource.FACEBOOK
          ? "Facebook"
          : "Review",
    isPrivate: r.status === ReviewStatus.PRIVATE_FEEDBACK,
    createdAt: r.createdAt,
  }));
```

Make sure `ReviewStatus` is imported — it is already imported at the top of the file alongside `ReviewSource` and `CampaignStatus`.

- [ ] **Step 4: Add new fields to the empty-state early return**

Find the early return block (around line 20) that handles `locationIds.length === 0`:

```ts
return {
  totalReviews: 0,
  averageRating: "0.0 ★",
  requestConversion: "0.0%",
  reviewTrendBars: Array.from({ length: 12 }, () => 0),
  funnelOutcomes: {
    redirectedToGoogle: 0,
    privateFeedback: 0,
    awaitingResponse: 0,
    webhookTriggered: 0,
    testimonials: 0,
    widgetTestimonials: 0,
  },
  channelBreakdown: {
    google: 0,
    facebook: 0,
    privateFeedback: 0,
  },
  locations: [],
};
```

Replace it with:

```ts
return {
  totalReviews: 0,
  averageRating: "0.0 ★",
  requestConversion: "0.0%",
  reviewTrendBars: Array.from({ length: 12 }, () => 0),
  funnelOutcomes: {
    redirectedToGoogle: 0,
    privateFeedback: 0,
    awaitingResponse: 0,
    webhookTriggered: 0,
    testimonials: 0,
    widgetTestimonials: 0,
  },
  channelBreakdown: {
    google: 0,
    facebook: 0,
    privateFeedback: 0,
  },
  locations: [],
  googleAvgRating: "0.0",
  googleReviewsThisMonth: 0,
  recentActivity: [] as {
    reviewerName: string;
    rating: number;
    sourceLabel: string;
    isPrivate: boolean;
    createdAt: Date;
  }[],
};
```

- [ ] **Step 5: Add new fields to the main return**

Find the `return { ... }` at the bottom of the function. After the existing `locations,` line, add:

```ts
googleAvgRating,
googleReviewsThisMonth,
recentActivity,
```

- [ ] **Step 6: Verify TypeScript compiles**

Run:

```bash
npx tsc --noEmit
```

Expected: no errors. If you see errors about `ReviewStatus` not being imported, add it to the existing import at the top:

```ts
import { CampaignStatus, ReviewSource, ReviewStatus } from "@prisma/client";
```

(It's likely already there — check before adding.)

- [ ] **Step 7: Commit**

```bash
git add src/lib/dashboard.ts
git commit -m "feat: extend getDashboardData with google avg, monthly count, and recent activity"
```

---

### Task 2: Rewrite the dashboard page

**Files:**
- Modify: `src/app/page.tsx`

- [ ] **Step 1: Replace the entire file**

`src/app/page.tsx` is a full rewrite. Replace everything in the file with:

```tsx
export const dynamic = "force-dynamic";

import Link from "next/link";
import { redirect } from "next/navigation";
import { AppShell } from "@/components/app-shell";
import { getDashboardData } from "@/lib/dashboard";
import { getCurrentAccessibleLocationIds } from "@/lib/current-scope";
import { getCurrentMembership } from "@/lib/authz";
import { prisma } from "@/lib/prisma";
import { OnboardingChecklist } from "@/components/onboarding-checklist";
import { canManageTeam } from "@/lib/team";
import { formatRelativeSyncTime } from "@/lib/relative-time";

export default async function DashboardPage() {
  const membership = await getCurrentMembership();

  if (!membership) {
    redirect("/login");
  }

  const org = await prisma.organization.findUnique({
    where: { id: membership.organizationId },
    select: {
      onboardingDismissedAt: true,
      locations: {
        select: { id: true, googleLocationName: true },
        orderBy: { createdAt: "asc" },
        take: 1,
      },
      _count: { select: { locations: true } },
    },
  });

  const hasLocation = (org?._count.locations ?? 0) > 0;
  const hasGoogle = (org?.locations[0]?.googleLocationName ?? null) !== null;
  const contactCount = hasLocation
    ? await prisma.contact.count({ where: { locationId: org!.locations[0].id } })
    : 0;
  const hasContacts = contactCount > 0;

  const dismissed = Boolean(org?.onboardingDismissedAt);
  const allDone = hasLocation && hasGoogle && hasContacts;
  const showChecklist = !dismissed && !allDone;
  const canDismiss = canManageTeam(membership);

  if (!hasLocation && !dismissed) {
    redirect("/onboarding");
  }

  const locationIds = await getCurrentAccessibleLocationIds();
  const dashboard = await getDashboardData(locationIds);

  const sortedLocations = [...dashboard.locations].sort(
    (a, b) => (b.avgRating ?? 0) - (a.avgRating ?? 0),
  );

  return (
    <AppShell activeScreen="dashboard">
      <div className="space-y-6">
        {showChecklist && (
          <OnboardingChecklist
            hasLocation={hasLocation}
            hasGoogle={hasGoogle}
            hasContacts={hasContacts}
            canDismiss={canDismiss}
          />
        )}

        {/* Page header */}
        <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <h1 className="text-2xl font-bold text-slate-900">Dashboard</h1>
            <p className="mt-1 text-sm text-slate-500">Your reputation at a glance</p>
          </div>
          <div className="flex shrink-0 gap-3">
            <Link
              href="/funnel-preview"
              className="rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm font-medium text-slate-700 hover:border-slate-300"
            >
              View Funnel
            </Link>
            <Link
              href="/campaigns/new"
              className="rounded-xl bg-indigo-600 px-4 py-2 text-sm font-semibold text-white hover:bg-indigo-700"
            >
              Send New Request
            </Link>
          </div>
        </div>

        {/* Stat cards */}
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-3 xl:grid-cols-[1.4fr_1fr_1fr]">
          {/* Google Reviews — hero */}
          <div className="rounded-2xl border border-indigo-100 bg-white p-6 shadow-sm">
            <p className="text-xs font-bold uppercase tracking-widest text-slate-400">
              Google Reviews
            </p>
            <p className="mt-2 text-4xl font-extrabold text-indigo-700">
              {dashboard.channelBreakdown.google}
            </p>
            <p className="mt-1 text-sm font-semibold text-indigo-400">
              ★ {dashboard.googleAvgRating} average
            </p>
            {dashboard.googleReviewsThisMonth > 0 && (
              <p className="mt-1 text-xs font-semibold text-emerald-600">
                ↑ {dashboard.googleReviewsThisMonth} this month
              </p>
            )}
          </div>

          {/* Funnel Conversion */}
          <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
            <p className="text-xs font-bold uppercase tracking-widest text-slate-400">
              Funnel Conversion
            </p>
            <p className="mt-2 text-4xl font-extrabold text-slate-900">
              {dashboard.requestConversion}
            </p>
            <p className="mt-1 text-sm text-slate-400">sent → meaningful activity</p>
          </div>

          {/* Private Feedback */}
          <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
            <p className="text-xs font-bold uppercase tracking-widest text-slate-400">
              Private Feedback
            </p>
            <p
              className={`mt-2 text-4xl font-extrabold ${
                dashboard.funnelOutcomes.privateFeedback > 0
                  ? "text-amber-500"
                  : "text-slate-900"
              }`}
            >
              {dashboard.funnelOutcomes.privateFeedback}
            </p>
            <p className="mt-1 text-sm text-slate-400">unread messages</p>
            {dashboard.funnelOutcomes.privateFeedback > 0 ? (
              <p className="mt-1 text-xs font-semibold text-amber-500">needs attention</p>
            ) : (
              <p className="mt-1 text-xs font-semibold text-emerald-600">all clear</p>
            )}
          </div>
        </div>

        {/* Body grid */}
        <div className="grid grid-cols-1 gap-4 xl:grid-cols-[1.4fr_1fr]">
          {/* Recent Activity */}
          <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
            <div className="mb-4 flex items-center justify-between">
              <h3 className="text-sm font-bold text-slate-900">Recent Activity</h3>
              <Link
                href="/reviews"
                className="text-xs font-semibold text-indigo-600 hover:text-indigo-800"
              >
                Open inbox →
              </Link>
            </div>
            <div className="space-y-2">
              {dashboard.recentActivity.length === 0 ? (
                <p className="text-sm text-slate-400">No reviews yet.</p>
              ) : (
                dashboard.recentActivity.map((item, i) => (
                  <div
                    key={i}
                    className={`flex items-start gap-3 rounded-xl px-3 py-2.5 ${
                      item.isPrivate
                        ? "border-l-2 border-amber-400 bg-amber-50"
                        : "border-l-2 border-emerald-400 bg-slate-50"
                    }`}
                  >
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-semibold text-slate-900">
                        {item.reviewerName || "Anonymous"}
                      </p>
                      <p className="text-xs text-amber-400">{"★".repeat(item.rating)}</p>
                      <p className="text-xs text-slate-400">
                        {item.sourceLabel} · {formatRelativeSyncTime(item.createdAt)}
                      </p>
                    </div>
                    <span
                      className={`shrink-0 rounded-full px-2 py-0.5 text-xs font-bold uppercase tracking-wide ${
                        item.isPrivate
                          ? "bg-amber-100 text-amber-700"
                          : "bg-emerald-100 text-emerald-700"
                      }`}
                    >
                      {item.isPrivate ? "Unread" : item.sourceLabel}
                    </span>
                  </div>
                ))
              )}
            </div>
          </div>

          {/* Locations + Funnel Outcomes */}
          <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
            <div className="mb-4 flex items-center justify-between">
              <h3 className="text-sm font-bold text-slate-900">Locations</h3>
              <Link
                href="/locations"
                className="text-xs font-semibold text-indigo-600 hover:text-indigo-800"
              >
                Manage →
              </Link>
            </div>
            <div className="space-y-2">
              {sortedLocations.length === 0 ? (
                <p className="text-sm text-slate-400">No locations yet.</p>
              ) : (
                sortedLocations.map((loc) => {
                  const displayName = loc.name.includes(", ")
                    ? loc.name.split(", ").slice(1).join(", ")
                    : loc.name;
                  const reviewCount = loc._count.reviews;
                  return (
                    <div
                      key={loc.id}
                      className="flex items-center justify-between rounded-xl bg-slate-50 px-3 py-2.5"
                    >
                      <div>
                        <p className="text-sm font-semibold text-slate-900">{displayName}</p>
                        <p className="text-xs text-slate-400">
                          {reviewCount} {reviewCount === 1 ? "review" : "reviews"} · {loc.status}
                        </p>
                      </div>
                      {loc.avgRating !== null && (
                        <span
                          className={`text-sm font-bold ${
                            loc.avgRating >= 4.5 ? "text-emerald-600" : "text-amber-500"
                          }`}
                        >
                          {loc.avgRating.toFixed(1)} ★
                        </span>
                      )}
                    </div>
                  );
                })
              )}
            </div>

            {/* Funnel Outcomes mini row */}
            <div className="mt-4 border-t border-slate-100 pt-4">
              <p className="mb-2 text-xs font-bold uppercase tracking-widest text-slate-400">
                Funnel Outcomes
              </p>
              <div className="grid grid-cols-3 gap-2">
                <div className="rounded-xl bg-emerald-50 p-2 text-center">
                  <p className="text-lg font-extrabold text-emerald-700">
                    {dashboard.funnelOutcomes.redirectedToGoogle}
                  </p>
                  <p className="text-xs font-semibold text-emerald-500">→ Google</p>
                </div>
                <div className="rounded-xl bg-amber-50 p-2 text-center">
                  <p className="text-lg font-extrabold text-amber-700">
                    {dashboard.funnelOutcomes.privateFeedback}
                  </p>
                  <p className="text-xs font-semibold text-amber-500">Feedback</p>
                </div>
                <div className="rounded-xl bg-slate-100 p-2 text-center">
                  <p className="text-lg font-extrabold text-slate-500">
                    {dashboard.funnelOutcomes.awaitingResponse}
                  </p>
                  <p className="text-xs font-semibold text-slate-400">Awaiting</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </AppShell>
  );
}
```

- [ ] **Step 2: Verify TypeScript compiles**

```bash
npx tsc --noEmit
```

Expected: no errors.

- [ ] **Step 3: Start the dev server and verify visually**

```bash
npm run dev
```

Open `http://localhost:3000` and check:

- Three stat cards render with correct labels
- Google Reviews card has indigo value and star line
- Private Feedback card shows amber value if count > 0, "all clear" in green if 0
- Recent Activity feed shows rows with green border for public, amber for private
- Locations panel shows location names, review counts, and ratings sorted high-to-low
- Funnel Outcomes mini row shows three colored tiles at the bottom of the right card
- No console errors in the browser or terminal
- Onboarding checklist still appears if conditions require it

- [ ] **Step 4: Commit**

```bash
git add src/app/page.tsx
git commit -m "feat: redesign dashboard with reputation-focused stat cards and activity feed"
```
