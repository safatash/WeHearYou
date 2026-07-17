# Review Inbox Redesign Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Redesign the review inbox to show reviews in a single-pane list with inline reply/AI suggestion, simplified filters, and improved visual hierarchy matching the provided mockup.

**Architecture:** Replace the split-panel (left list / right reply) layout with an expandable single-pane card list. Each review card shows: content, action buttons, status badge, and when expanded, AI suggestions with tone options and inline reply form. Filters change from 3-column grid to horizontal rating tabs + location filter bar.

**Tech Stack:** Next.js, React, Tailwind CSS, TypeScript

## Global Constraints

- Color scheme: Use teal (#37aeb7) for accent elements, status badges, and buttons
- Filter tabs match design exactly: "All", "Needs reply", "5★", "4★", "1-3★", "Replied"
- Location filter pills: "All locations" + dynamic location names
- Review card left border accent: teal bar indicating review state
- AI suggestion tone buttons: "Warm", "Professional", "Concise", "Apologetic"
- Status badges use red/amber/green for "Needs attention" / "Needs reply" / "Replied"
- Page title: "Reviews" (not "All reviews, organized for action")
- Subtitle: "Every Google review across your connected profiles. Replies post publicly as the business owner — always after you confirm."

---

### Task 1: Update page header and remove split-panel layout

**Files:**
- Modify: `src/app/reviews/page.tsx`

**Interfaces:**
- Consumes: `getReviews()`, `getReviewFilterOptions()`, `buildReviewPageStats()`, `getCurrentAccessibleLocationIds()`, `getCurrentMembership()`
- Produces: Simplified page structure with no split-panel layout, single review list container

**Description:** Replace the verbose header, remove the split-panel grid layout, and convert to a single-pane list view. Update the header to show "Reviews" title with subtitle. Remove the sort buttons and stats cards for now (they'll be handled in filter restructuring). Keep all the server-side logic intact, just change the JSX output structure.

- [ ] **Step 1: Read the current page.tsx to understand the structure**

Run: `head -100 src/app/reviews/page.tsx`

- [ ] **Step 2: Update header section**

Replace lines 81-105 (header and sort buttons) with:

```tsx
{/* Header */}
<div className="flex items-start justify-between gap-4">
  <div>
    <p className="text-sm font-semibold uppercase tracking-[0.22em] text-teal-600">REPUTATION</p>
    <h1 className="mt-2 text-4xl font-semibold tracking-tight text-slate-950">Reviews</h1>
    <p className="mt-2 text-sm text-slate-600">
      Every Google review across your connected profiles. Replies post publicly as the business owner — always after you confirm.
    </p>
  </div>
  <div className="flex gap-2 shrink-0">
    <button className="rounded-lg border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50 transition">
      Export CSV
    </button>
    <button className="rounded-lg bg-teal-600 px-4 py-2 text-sm font-semibold text-white hover:bg-teal-700 transition">
      AI reply drafts
    </button>
  </div>
</div>
```

- [ ] **Step 3: Remove the stats section**

Delete lines 107-113 (the StatCard grid). These won't be in the new design.

- [ ] **Step 4: Update filter section layout**

Replace lines 115-178 (the 3-column filter grid) with:

```tsx
{/* Filters */}
<section className="space-y-3">
  {/* Status/Rating tabs */}
  <div className="flex flex-wrap gap-2">
    <Link
      href={buildFilterHref({ status: "all" })}
      className={`rounded-full px-4 py-1.5 text-sm font-semibold transition ${
        status === "all"
          ? "bg-teal-600 text-white"
          : "border border-slate-200 bg-white text-slate-700 hover:bg-slate-50"
      }`}
    >
      All
    </Link>
    <Link
      href={buildFilterHref({ status: "needs-follow-up" })}
      className={`rounded-full px-4 py-1.5 text-sm font-semibold transition ${
        status === "needs-follow-up"
          ? "bg-teal-600 text-white"
          : "border border-slate-200 bg-white text-slate-700 hover:bg-slate-50"
      }`}
    >
      Needs reply {stats.needsReply > 0 && <span className="ml-1 font-bold">{stats.needsReply}</span>}
    </Link>
    <Link
      href={buildFilterHref({ sort: "highest" })}
      className={`rounded-full px-4 py-1.5 text-sm font-semibold transition ${
        sort === "highest"
          ? "bg-teal-600 text-white"
          : "border border-slate-200 bg-white text-slate-700 hover:bg-slate-50"
      }`}
    >
      5★
    </Link>
    <Link
      href={buildFilterHref({ sort: "lowest" })}
      className={`rounded-full px-4 py-1.5 text-sm font-semibold transition ${
        sort === "lowest" ? "bg-teal-600 text-white" : "border border-slate-200 bg-white text-slate-700 hover:bg-slate-50"
      }`}
    >
      4★
    </Link>
    <Link href={buildFilterHref({ status: "all" })} className="rounded-full px-4 py-1.5 text-sm font-semibold border border-slate-200 bg-white text-slate-700 hover:bg-slate-50 transition">
      1-3★
    </Link>
    <Link
      href={buildFilterHref({ status: "published" })}
      className={`rounded-full px-4 py-1.5 text-sm font-semibold transition ${
        status === "published"
          ? "bg-teal-600 text-white"
          : "border border-slate-200 bg-white text-slate-700 hover:bg-slate-50"
      }`}
    >
      Replied
    </Link>
  </div>

  {/* Location filter */}
  <div className="flex flex-wrap gap-2">
    <Link
      href={buildFilterHref({ locationId: "all" })}
      className={`rounded-full px-4 py-1.5 text-sm font-semibold transition ${
        allowedLocationId === "all"
          ? "bg-slate-950 text-white"
          : "border border-slate-200 bg-white text-slate-700 hover:bg-slate-50"
      }`}
    >
      All locations
    </Link>
    {locations.map((loc) => (
      <Link
        key={loc.id}
        href={buildFilterHref({ locationId: loc.id })}
        className={`rounded-full px-4 py-1.5 text-sm font-semibold transition ${
          allowedLocationId === loc.id
            ? "bg-slate-950 text-white"
            : "border border-slate-200 bg-white text-slate-700 hover:bg-slate-50"
        }`}
      >
        {loc.name}
      </Link>
    ))}
  </div>
</section>
```

Note: `stats.needsReply` needs to be calculated from the stats object. Check the `buildReviewPageStats()` function to see if it exists; if not, calculate it in the page.

- [ ] **Step 5: Simplify the panel layout to single-pane list**

Replace lines 180-220 (the flex gap-6 panel layout) with:

```tsx
{/* Review list */}
<div className="space-y-3">
  {reviews.length === 0 ? (
    <div className="rounded-2xl border border-dashed border-slate-200 bg-slate-50 px-4 py-8 text-center text-sm text-slate-600">
      <p className="font-semibold text-slate-700 mb-1">No reviews yet</p>
      <p>Sync Google or collect direct feedback to start populating the inbox.</p>
    </div>
  ) : (
    reviews.map((review) => (
      <ReviewListItem
        key={review.id}
        review={review}
        selected={review.id === selectedId}
        filterHref={baseFilterHref}
        aiReplyEnabled={aiReplyEnabled}
      />
    ))
  )}
</div>
```

- [ ] **Step 6: Commit changes**

```bash
git add src/app/reviews/page.tsx
git commit -m "refactor: redesign review inbox header, filters, and layout

- Simplify page title to 'Reviews' with descriptive subtitle
- Replace verbose sort buttons with filter tabs (All, Needs reply, 5★, 4★, 1-3★, Replied)
- Add location filter bar below rating tabs
- Remove stats cards (not in new design)
- Change layout from split-panel (left list, right reply) to single-pane list
- Add Export CSV and AI reply drafts header buttons
- Pass aiReplyEnabled prop to ReviewListItem for inline suggestions"
```

---

### Task 2: Redesign ReviewListItem component with expandable inline reply

**Files:**
- Modify: `src/components/reviews/review-list-item.tsx`

**Interfaces:**
- Consumes: `review` object, `selected` boolean, `filterHref` string, `aiReplyEnabled` boolean
- Produces: Single review card with left teal border, compact header, review text, action buttons, status badge, and expandable AI suggestion + reply form

**Description:** Transform ReviewListItem from a simple list item to a fully-featured card with inline expansion. When clicked, should expand to show AI suggestion with tone buttons and reply form inline below the review.

- [ ] **Step 1: Read the current ReviewListItem component**

Run: `cat src/components/reviews/review-list-item.tsx | head -150`

- [ ] **Step 2: Backup current component and start rewrite**

The new component structure should be:

```tsx
"use client";

import { useState } from "react";
import Link from "next/link";
import type { ReviewWithReplyDraft } from "@/lib/reviews";

interface ReviewListItemProps {
  review: ReviewWithReplyDraft;
  selected: boolean;
  filterHref: string;
  aiReplyEnabled: boolean;
}

export function ReviewListItem({
  review,
  selected,
  filterHref,
  aiReplyEnabled,
}: ReviewListItemProps) {
  const [isExpanded, setIsExpanded] = useState(selected);

  const getStatusBadge = () => {
    // Return appropriate status badge based on review state
  };

  const getAvatarInitials = () => {
    // Extract initials from reviewer name
  };

  return (
    <div
      className={`rounded-2xl border border-slate-200 bg-white shadow-sm overflow-hidden cursor-pointer transition ${
        isExpanded ? "ring-2 ring-teal-400" : "hover:shadow-md"
      }`}
      onClick={() => setIsExpanded(!isExpanded)}
    >
      {/* Card header with left accent bar */}
      <div className="flex gap-4 p-4 border-l-4 border-l-teal-600">
        <div className="flex-1 min-w-0">
          {/* Review header: avatar, name, stars, location, time */}
          {/* Review text content */}
          {/* Action buttons and status badge */}
        </div>
      </div>

      {/* Expanded section: AI suggestion + reply form */}
      {isExpanded && aiReplyEnabled && (
        <div className="border-t border-slate-200 p-4 space-y-4 bg-slate-50">
          {/* AI suggestion section with tone buttons */}
          {/* Reply form */}
        </div>
      )}
    </div>
  );
}
```

- [ ] **Step 3: Implement the review header section**

The header should display:
- Avatar circle with initials (use first letters of reviewer name)
- Name, stars (★ symbols), "Google" badge
- Location, timestamp
- Status badge on right ("Needs reply" / "Needs attention" / "Replied")

```tsx
{/* Header row */}
<div className="flex items-start justify-between gap-2">
  <div className="flex gap-3 items-start flex-1 min-w-0">
    {/* Avatar */}
    <div className="w-10 h-10 rounded-full bg-teal-100 text-teal-700 flex items-center justify-center font-semibold text-sm shrink-0">
      {getAvatarInitials()}
    </div>

    {/* Info column */}
    <div className="min-w-0 flex-1">
      <div className="flex items-center gap-2 flex-wrap">
        <span className="font-semibold text-slate-900">{review.reviewerName}</span>
        <div className="flex items-center gap-0.5">
          {[...Array(5)].map((_, i) => (
            <span key={i} className={i < (review.rating || 0) ? "text-amber-400" : "text-slate-300"}>
              ★
            </span>
          ))}
        </div>
        <span className="text-xs font-semibold text-slate-500 bg-slate-100 px-2 py-0.5 rounded">Google</span>
      </div>
      <div className="text-xs text-slate-500 mt-1">
        {review.location?.name} · {formatTimeAgo(review.createdAt)}
      </div>
    </div>
  </div>

  {/* Status badge */}
  {getStatusBadge()}
</div>

{/* Review text */}
<p className="text-sm text-slate-700 mt-3">{review.text}</p>

{/* Action buttons */}
<div className="flex gap-2 mt-3 flex-wrap">
  <button className="rounded-lg bg-teal-600 text-white px-3 py-1.5 text-sm font-semibold hover:bg-teal-700 transition">
    Reply
  </button>
  <button className="rounded-lg border border-slate-200 bg-white text-slate-700 px-3 py-1.5 text-sm font-semibold hover:bg-slate-50 transition">
    Flag
  </button>
  <button className="rounded-lg border border-slate-200 bg-white text-slate-700 px-3 py-1.5 text-sm font-semibold hover:bg-slate-50 transition">
    Open on Google
  </button>
  <button className="rounded-lg border border-slate-200 bg-white text-red-600 px-3 py-1.5 text-sm font-semibold hover:bg-red-50 transition">
    Delete
  </button>
</div>
```

- [ ] **Step 4: Implement the expanded AI suggestion section**

When expanded and `aiReplyEnabled` is true, show:
- "AI suggestion" label with lightbulb icon
- Tone buttons: Warm, Professional, Concise, Apologetic
- "Regenerate" button
- Reply textarea with "Post reply" button

```tsx
{isExpanded && aiReplyEnabled && (
  <div className="border-t border-slate-200 p-4 space-y-4 bg-slate-50">
    {/* AI suggestion header */}
    <div className="flex items-center justify-between">
      <div className="flex items-center gap-2">
        <span className="text-xs font-semibold text-slate-500 uppercase">AI suggestion</span>
      </div>
      <button className="text-xs font-semibold text-teal-600 hover:text-teal-700">
        Regenerate
      </button>
    </div>

    {/* Tone buttons */}
    <div className="flex flex-wrap gap-2">
      {["Warm", "Professional", "Concise", "Apologetic"].map((tone) => (
        <button
          key={tone}
          className="rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-sm font-semibold text-slate-700 hover:bg-slate-100 transition"
        >
          {tone}
        </button>
      ))}
    </div>

    {/* Reply form */}
    <div className="space-y-2">
      <textarea
        placeholder="Write a reply, or generate a draft above…"
        className="w-full rounded-lg border border-slate-200 bg-white p-3 text-sm text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-teal-400"
        rows={3}
      />
      <div className="flex gap-2 justify-end">
        <button className="rounded-lg border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50 transition">
          Cancel
        </button>
        <button className="rounded-lg bg-teal-600 px-4 py-2 text-sm font-semibold text-white hover:bg-teal-700 transition">
          Post reply
        </button>
      </div>
    </div>
  </div>
)}
```

- [ ] **Step 5: Implement helper functions**

Add these helper functions to the component:

```tsx
function getAvatarInitials(): string {
  return review.reviewerName
    .split(" ")
    .map((word) => word[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);
}

function getStatusBadge() {
  if (review.hasReply) {
    return (
      <span className="inline-flex items-center gap-1 text-xs font-semibold text-emerald-700 bg-emerald-50 px-2.5 py-1 rounded-full">
        <span className="w-1.5 h-1.5 bg-emerald-500 rounded-full" />
        Replied
      </span>
    );
  }
  if (review.rating && review.rating < 4) {
    return (
      <span className="inline-flex items-center gap-1 text-xs font-semibold text-red-700 bg-red-50 px-2.5 py-1 rounded-full">
        <span className="w-1.5 h-1.5 bg-red-500 rounded-full" />
        Needs attention
      </span>
    );
  }
  return (
    <span className="inline-flex items-center gap-1 text-xs font-semibold text-amber-700 bg-amber-50 px-2.5 py-1 rounded-full">
      <span className="w-1.5 h-1.5 bg-amber-500 rounded-full" />
      Needs reply
    </span>
  );
}

function formatTimeAgo(date: Date): string {
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  if (diffMins < 60) return `${diffMins}m ago`;
  const diffHours = Math.floor(diffMins / 60);
  if (diffHours < 24) return `${diffHours}h ago`;
  const diffDays = Math.floor(diffHours / 24);
  return `${diffDays}d ago`;
}
```

- [ ] **Step 6: Commit changes**

```bash
git add src/components/reviews/review-list-item.tsx
git commit -m "refactor: redesign ReviewListItem as expandable card with inline reply

- Add left teal border accent to review cards
- Show compact header with avatar, name, stars, location, timestamp
- Display status badge (Replied/Needs attention/Needs reply) on right
- Make cards clickable to expand/collapse
- Add inline AI suggestion section with tone buttons when expanded
- Add inline reply form below AI suggestions
- Implement avatar initials, time formatting, status badge logic"
```

---

### Task 3: Update review-reply-panel component for inline use (optional refactor)

**Files:**
- Modify: `src/components/reviews/review-reply-panel.tsx` (may need adjustments)

**Interfaces:**
- Consumes: `review` object, `aiReplyEnabled` boolean
- Produces: Reusable reply panel component (if needed for both inline and full-page views)

**Description:** If review-reply-panel is currently used elsewhere, it may need to be refactored. However, based on the new design, the reply functionality is now inline in ReviewListItem. Verify if review-reply-panel is still needed or if it can be archived.

- [ ] **Step 1: Check where review-reply-panel is used**

Run: `grep -r "ReviewReplyPanel" src/ --include="*.tsx"`

- [ ] **Step 2: If only used in old split-panel, can be archived**

If it's not used elsewhere after removing the split-panel layout, no changes needed to this file for this task.

- [ ] **Step 3: If used elsewhere, refactor as needed**

If it's used in other places, extract the tone buttons and reply form logic to be reusable. For now, focus on ReviewListItem.

- [ ] **Step 4: No commit needed for this task if no changes**

If no changes are needed, mark as complete. If changes were made:

```bash
git add src/components/reviews/review-reply-panel.tsx
git commit -m "refactor: adjust review-reply-panel for potential reuse [optional]"
```

---

### Task 4: Fix filter logic to match new tab structure

**Files:**
- Modify: `src/app/reviews/page.tsx` (filter href building)
- Modify: `src/lib/reviews.ts` (filter type definitions if needed)

**Interfaces:**
- Consumes: Current filter query params, `buildFilterHref()` function
- Produces: Correct mapping between UI tabs and backend filter logic

**Description:** The new filter tabs use different semantics than the old design. Map the tab clicks to the correct backend filters:
- "All" → status: "all"
- "Needs reply" → status: "needs-follow-up"
- "5★" → sort: "highest"
- "4★" → sort: (none, this is for 4-star reviews specifically - may need custom logic)
- "1-3★" → sort: "lowest"
- "Replied" → status: "published"

- [ ] **Step 1: Verify current filter logic in page.tsx**

Review lines 26-37 in page.tsx to understand how filters are currently parsed.

- [ ] **Step 2: Check ReviewSort and ReviewStatusFilter types**

Run: `grep -A 5 "type ReviewSort\|type ReviewStatusFilter" src/lib/reviews.ts`

Ensure these types support the new filter structure. If a "4-star" specific filter doesn't exist, may need to add it or use a different approach.

- [ ] **Step 3: Adjust filter href building if needed**

Verify that `buildFilterHref()` correctly handles all the new tab combinations.

- [ ] **Step 4: Commit changes if any were made**

```bash
git add src/app/reviews/page.tsx src/lib/reviews.ts
git commit -m "fix: align filter logic with new tab-based structure"
```

---

### Task 5: Test the redesign in dev server

**Files:**
- Test: Browse to `/reviews` and verify all changes

**Interfaces:**
- Consumes: All previous changes
- Produces: Verified working review inbox matching the mockup

**Description:** Start the dev server and test the review inbox redesign.

- [ ] **Step 1: Start dev server**

Run: `npm run dev` (if not already running)

- [ ] **Step 2: Navigate to /reviews**

Open browser to `http://localhost:3000/reviews`

- [ ] **Step 3: Verify layout matches mockup**

Checklist:
- [ ] Header shows "Reviews" title with teal "REPUTATION" label above
- [ ] Subtitle displays correctly
- [ ] "Export CSV" and "AI reply drafts" buttons visible in top right
- [ ] Filter tabs appear horizontally: All, Needs reply (with count), 5★, 4★, 1-3★, Replied
- [ ] Location filters appear below rating tabs
- [ ] Review cards show teal left border
- [ ] Review card header has avatar, name, stars, location, time
- [ ] Status badge appears on right side of card
- [ ] Action buttons (Reply, Flag, Open on Google, Delete) are visible
- [ ] Clicking a card expands it (if aiReplyEnabled)
- [ ] Expanded view shows AI suggestion section with tone buttons
- [ ] Reply textarea appears below AI suggestions
- [ ] Colors match design (teal for accent, correct slate shades)

- [ ] **Step 4: Test interactions**

- [ ] Click a review to expand/collapse
- [ ] Verify status badges show correct color/text based on review state
- [ ] Test filter tab clicks (should update URL and filter list)
- [ ] Test location filter clicks
- [ ] Verify "Needs reply" tab shows correct count

- [ ] **Step 5: Commit test results**

```bash
git add -A
git commit -m "test: verify review inbox redesign matches mockup

- Confirm header, filters, and review cards match design
- Test expand/collapse functionality
- Verify status badges and action buttons work correctly
- Confirm filter tabs and location filters function"
```

---

## Summary

This plan redesigns the review inbox from a split-panel layout to a single-pane expandable card list with:
1. Simplified header matching mockup
2. Horizontal filter tabs + location filter bar
3. Redesigned review cards with inline AI suggestions and reply form
4. Proper status badges and action buttons
5. Teal accent color throughout matching design system

All changes maintain server-side logic while updating the client-side presentation layer.
