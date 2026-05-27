# Dashboard Redesign Spec

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Replace the current dashboard (`/`) with a clean, reputation-focused layout: three KPI stat cards on top, a recent activity feed and location leaderboard below.

**Architecture:** Pure UI change — `src/app/page.tsx` is rewritten, `src/lib/dashboard.ts` gains one new query (recent reviews feed). No new routes, no schema changes.

**Tech Stack:** Next.js App Router (RSC), Tailwind CSS, Prisma.

---

## Layout

```
┌─────────────────────────────────────────────────────┐
│  Page header: "Dashboard" title + 2 action buttons  │
├──────────────┬──────────────┬───────────────────────┤
│ Google       │ Funnel       │ Private Feedback       │
│ Reviews hero │ Conversion   │ (amber if > 0)         │
├──────────────┴──────────────┴───────────────────────┤
│ Recent Activity (left, wider) │ Locations (right)    │
│                               ├──────────────────────│
│                               │ Funnel Outcomes row  │
└───────────────────────────────┴──────────────────────┘
```

---

## Stat Cards

Three cards in a `grid-cols-[1.4fr_1fr_1fr]` row.

### Google Reviews (hero card)
- Label: "Google Reviews"
- Value: count of non-testimonial Google-source reviews (`ReviewSource.GOOGLE`)
- Sub-line: `★ {avg} average` — average rating of Google reviews only
- Delta: `↑ {n} this month` — Google reviews in the current calendar month
- Styling: indigo-tinted value (`text-indigo-700`), slightly wider column

### Funnel Conversion
- Label: "Funnel Conversion"
- Value: `{n}%` — existing `requestConversion` calculation (completed / total recipients)
- Sub-line: "sent → meaningful activity"
- Delta: omit for now (no historical baseline stored)

### Private Feedback
- Label: "Private Feedback"
- Value: count of reviews with `status === ReviewStatus.PRIVATE_FEEDBACK`
- Sub-line: "unread messages"
- Delta: "needs attention" in amber if count > 0; otherwise "all clear" in green
- Styling: amber value (`text-amber-500`) when count > 0, normal slate otherwise

---

## Recent Activity Feed

Left column of the body grid (wider, `flex: 1.4`).

**Data:** Last 10 reviews ordered by `createdAt desc`, selecting: `submitterName`, `rating`, `source`, `status`, `createdAt`, `isTestimonial`. Exclude testimonials.

**Each row:**
- Left border color: green (`border-emerald-400`) for public/Google reviews; amber (`border-amber-400`) for private feedback
- Background: white for public; `bg-amber-50` for private
- Name: `submitterName` if present, otherwise "Anonymous"
- Stars: rendered as `★` characters based on `rating`
- Meta: source label + relative time (e.g. "Google · 2 hours ago") — computed server-side using `formatDistanceToNow` from `date-fns` (already a project dependency)
- Badge: "Google" (green pill) or "Unread" (amber pill) for private feedback

**Header:** "Recent Activity" title + "Open inbox →" link to `/reviews`.

---

## Locations Panel

Right column of the body grid.

**Data:** existing `dashboard.locations` — `id`, `name`, `status`, `avgRating`. Ordered by `avgRating desc`.

**Each row:**
- Location name (if the name contains `, `, display only the part after the first `, `; otherwise display as-is)
- Sub-line: review count for that location + "Active"
- Rating: `{avg} ★` right-aligned; green (`text-emerald-600`) if ≥ 4.5, amber (`text-amber-500`) if < 4.5

**Review count per location:** add `_count: { select: { reviews: { where: { isTestimonial: false } } } }` to the locations query in `getDashboardData`.

**Header:** "Locations" title + "Manage →" link to `/locations`.

### Funnel Outcomes mini row (inside the right card, below the location list)

Three mini tiles in a horizontal row, separated by a top border:

| Tile | Value | Color |
|------|-------|-------|
| → Google | `funnelOutcomes.redirectedToGoogle` | green bg |
| Feedback | `funnelOutcomes.privateFeedback` | amber bg |
| Awaiting | `funnelOutcomes.awaitingResponse` | slate bg |

---

## Page Header

- Title: "Dashboard"
- Subtitle: "Your reputation at a glance"
- Actions (right-aligned):
  - Primary button: "Send New Request" → `/campaigns/new`
  - Secondary button: "View Funnel" → `/funnel-preview`

---

## Styling Rules

- Background: `bg-slate-50` (existing)
- Cards: `bg-white border border-slate-200 rounded-2xl p-6 shadow-sm`
- No gradients, no colored card backgrounds (except the amber private-feedback card row tint)
- Indigo (`#6366f1`) for primary accents: hero value, links, primary button
- Amber (`#f59e0b`) for attention states: private feedback value, unread badge, amber tile
- Emerald (`#10b981`) for positive states: Google badge, high-rating locations, deltas
- Body grid: `grid grid-cols-[1.4fr_1fr] gap-4` on xl, single column on smaller screens

---

## Data Changes to `getDashboardData`

1. Add `_count: { select: { reviews: true } }` to the locations select so review counts are available.
2. Add a `recentActivity` field: last 10 non-testimonial reviews ordered by `createdAt desc`, selecting `id`, `submitterName`, `rating`, `source`, `status`, `createdAt`.
3. Add `googleReviewsThisMonth`: count of Google reviews where `createdAt >= start of current month`.
4. Add `googleAvgRating`: average rating of Google-source reviews only (formatted to one decimal).
5. Existing fields (`totalReviews`, `requestConversion`, `funnelOutcomes`, `locations`, `reviewTrendBars`, `channelBreakdown`) are kept — `reviewTrendBars` and `channelBreakdown` are unused by the new dashboard but other pages may use them.

---

## What's Removed

- `SectionHeading` component (replaced by inline page header)
- `OutcomeCard` usage on the dashboard (outcomes move to the mini tile row)
- The large 12-week bar chart section
- The "Agency View" section (replaced by the Locations panel)
- `MotivationBlock` in the sidebar is kept as-is

---

## Out of Scope

- No chart component (removed intentionally)
- No real-time updates (page remains `force-dynamic` SSR)
- No changes to the sidebar, top bar, or AppShell
- No changes to other pages
