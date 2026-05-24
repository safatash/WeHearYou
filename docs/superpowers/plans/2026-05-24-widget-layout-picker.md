# Widget Layout Picker Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the modal-based widget creation flow with a dedicated `/widgets/new` page featuring a Trustindex-style visual layout selection gallery.

**Architecture:** New server page at `src/app/widgets/new/page.tsx` fetches eligible locations and renders a client component `WidgetLayoutPicker` that shows layout cards with CSS mini-previews, tab filtering, and a slide-up bottom panel for name/location input. The existing `createReviewWidget` action and customizer are reused with minor fixes.

**Tech Stack:** Next.js 14 App Router, React, Tailwind CSS, Prisma, TypeScript

---

## File Map

| Action | File |
|--------|------|
| Modify | `src/app/widgets/actions.ts` |
| Create | `src/app/widgets/new/page.tsx` |
| Create | `src/components/widget-layout-picker.tsx` |
| Modify | `src/app/widgets/page.tsx` |
| Delete | `src/components/create-widget-modal.tsx` |

---

### Task 1: Fix `allowedLayouts` in `updateReviewWidget`

**Files:**
- Modify: `src/app/widgets/actions.ts:87`

Currently `allowedLayouts` only includes `"grid"`, `"list"`, `"slider"`, `"badge"` — meaning carousel, masonry, and floating layouts silently fall back to `"grid"` when saved in the customizer.

- [ ] **Step 1: Expand `allowedLayouts`**

In `src/app/widgets/actions.ts`, find this line (~line 87):

```ts
const allowedLayouts = new Set(["grid", "list", "slider", "badge"]);
```

Replace with:

```ts
const allowedLayouts = new Set(["grid", "list", "slider", "badge", "carousel", "masonry", "floating"]);
```

- [ ] **Step 2: Type-check**

```bash
npx tsc --noEmit
```

Expected: no errors related to this change.

- [ ] **Step 3: Commit**

```bash
git add src/app/widgets/actions.ts
git commit -m "fix: expand allowedLayouts to include carousel, masonry, floating"
```

---

### Task 2: Update `createReviewWidget` to accept and persist `layout`

**Files:**
- Modify: `src/app/widgets/actions.ts:8-67`

Currently `createReviewWidget` ignores `layout` in formData — the new widget always gets the Prisma default layout. We need it to read and persist the chosen layout.

- [ ] **Step 1: Read `layout` from formData and validate it**

In `src/app/widgets/actions.ts`, after the existing `name` extraction (around line 11), add:

```ts
const ALLOWED_LAYOUTS = new Set(["grid", "list", "slider", "badge", "carousel", "masonry", "floating"]);
const rawLayout = String(formData.get("layout") ?? "").trim();
const layout = ALLOWED_LAYOUTS.has(rawLayout) ? rawLayout : "slider";
```

- [ ] **Step 2: Pass `layout` to `prisma.reviewWidget.create`**

Find the `prisma.reviewWidget.create` call (~line 57). Update the `data` object to include `layout`:

```ts
const widget = await prisma.reviewWidget.create({
  data: {
    organizationId,
    locationId,
    name,
    layout,
    publicToken: generateReviewWidgetToken(),
  },
});
```

- [ ] **Step 3: Type-check**

```bash
npx tsc --noEmit
```

Expected: no errors. If Prisma types complain, run `npx prisma generate` first.

- [ ] **Step 4: Commit**

```bash
git add src/app/widgets/actions.ts
git commit -m "feat: persist chosen layout when creating a widget"
```

---

### Task 3: Create `/widgets/new` server page

**Files:**
- Create: `src/app/widgets/new/page.tsx`

- [ ] **Step 1: Create the file**

```tsx
export const dynamic = "force-dynamic";

import { AppShell } from "@/components/app-shell";
import { WidgetLayoutPicker } from "@/components/widget-layout-picker";
import { requireActiveMembershipPage } from "@/lib/page-guards";
import { getWidgetEligibleLocations } from "@/lib/review-widgets";

export default async function NewWidgetPage() {
  const membership = await requireActiveMembershipPage();
  const locations = await getWidgetEligibleLocations(membership.organization.id);

  return (
    <AppShell activeScreen="widgets">
      <div className="space-y-8">
        <div className="border-b border-slate-200 pb-6">
          <p className="text-sm font-semibold uppercase tracking-[0.22em] text-indigo-600">Widget Showcase</p>
          <h2 className="mt-4 text-4xl font-bold tracking-tight text-slate-950">Select widget layout</h2>
          <p className="mt-3 text-base text-slate-600">
            Choose a layout — then give it a name and pick a location.
          </p>
        </div>
        <WidgetLayoutPicker locations={locations} />
      </div>
    </AppShell>
  );
}
```

- [ ] **Step 2: Type-check**

```bash
npx tsc --noEmit
```

Expected: no errors (WidgetLayoutPicker doesn't exist yet — expect an import error for now, that's fine).

- [ ] **Step 3: Commit**

```bash
git add src/app/widgets/new/page.tsx
git commit -m "feat: add /widgets/new server page"
```

---

### Task 4: Create `WidgetLayoutPicker` client component

**Files:**
- Create: `src/components/widget-layout-picker.tsx`

This is the main client component. It renders layout type tabs, a grid of layout preview cards, and a slide-up bottom panel when a card is selected.

- [ ] **Step 1: Create the file with layout definitions and tab structure**

```tsx
"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createReviewWidget } from "@/app/widgets/actions";

type Location = {
  id: string;
  name: string;
  canCreateWidget: boolean;
  guidance: string;
  reviewCount: number;
};

type LayoutOption = {
  value: string;
  label: string;
  description: string;
  badge?: "popular" | "hot";
};

const LAYOUTS: LayoutOption[] = [
  { value: "slider", label: "Slider", description: "Horizontal scrolling reviews", badge: "popular" },
  { value: "carousel", label: "Carousel", description: "Rotating single-review slides" },
  { value: "grid", label: "Grid", description: "Multi-column card layout", badge: "hot" },
  { value: "list", label: "List", description: "Vertical stacked reviews" },
  { value: "badge", label: "Badge", description: "Compact rating display" },
  { value: "floating", label: "Floating", description: "Fixed widget on page edge" },
  { value: "masonry", label: "Masonry", description: "Pinterest-style variable heights" },
];

const TABS = ["All", "Slider", "Carousel", "Grid", "List", "Badge", "Floating", "Masonry"];

interface WidgetLayoutPickerProps {
  locations: Location[];
}

export function WidgetLayoutPicker({ locations }: WidgetLayoutPickerProps) {
  const [activeTab, setActiveTab] = useState("All");
  const [selectedLayout, setSelectedLayout] = useState<string | null>(null);
  const [widgetName, setWidgetName] = useState("");
  const [locationId, setLocationId] = useState("");
  const [isSaving, setIsSaving] = useState(false);

  const eligibleLocations = locations.filter((l) => l.canCreateWidget);

  const visibleLayouts =
    activeTab === "All"
      ? LAYOUTS
      : LAYOUTS.filter((l) => l.label === activeTab);

  const handleSelectLayout = (value: string) => {
    setSelectedLayout((prev) => (prev === value ? null : value));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedLayout || !widgetName.trim() || !locationId) return;
    setIsSaving(true);
    const formData = new FormData();
    formData.append("layout", selectedLayout);
    formData.append("name", widgetName.trim());
    formData.append("locationId", locationId);
    try {
      await createReviewWidget(formData);
    } catch {
      setIsSaving(false);
    }
  };

  return (
    <div className="pb-32">
      {/* Tabs */}
      <div className="flex gap-1 border-b border-slate-200 mb-8 overflow-x-auto">
        {TABS.map((tab) => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            type="button"
            className={`flex-shrink-0 px-4 py-2 text-sm font-medium rounded-t-md border border-transparent border-b-0 transition-colors ${
              activeTab === tab
                ? "bg-white border-slate-200 text-indigo-600 font-semibold -mb-px relative z-10"
                : "text-slate-500 hover:text-slate-900 hover:bg-slate-50"
            }`}
          >
            {tab}
          </button>
        ))}
      </div>

      {/* Count */}
      <p className="text-sm text-slate-500 mb-6">
        <span className="font-semibold text-slate-900">{visibleLayouts.length} layout{visibleLayouts.length !== 1 ? "s" : ""}</span> available
      </p>

      {/* Cards grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
        {visibleLayouts.map((layout) => (
          <LayoutCard
            key={layout.value}
            layout={layout}
            isSelected={selectedLayout === layout.value}
            onSelect={handleSelectLayout}
          />
        ))}
      </div>

      {/* Slide-up bottom panel */}
      <div
        className={`fixed bottom-0 left-0 right-0 z-50 bg-white border-t-2 border-indigo-500 shadow-2xl transition-transform duration-300 ${
          selectedLayout ? "translate-y-0" : "translate-y-full"
        }`}
      >
        <form onSubmit={handleSubmit} className="max-w-6xl mx-auto px-6 py-4 flex items-center gap-4 flex-wrap">
          <div className="flex-shrink-0">
            <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Selected layout</p>
            <p className="text-lg font-bold text-slate-900">
              {LAYOUTS.find((l) => l.value === selectedLayout)?.label ?? "—"}
            </p>
          </div>

          <div className="flex gap-3 flex-1 min-w-0">
            <input
              type="text"
              required
              value={widgetName}
              onChange={(e) => setWidgetName(e.target.value)}
              placeholder="Widget name (e.g. Main reviews widget)"
              className="flex-1 min-w-0 rounded-lg border border-slate-200 bg-slate-50 px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
            />
            <select
              required
              value={locationId}
              onChange={(e) => setLocationId(e.target.value)}
              className="flex-1 min-w-0 rounded-lg border border-slate-200 bg-slate-50 px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
            >
              <option value="">Choose a location…</option>
              {eligibleLocations.map((loc) => (
                <option key={loc.id} value={loc.id}>
                  {loc.name} ({loc.reviewCount} reviews)
                </option>
              ))}
            </select>
          </div>

          <div className="flex items-center gap-3 flex-shrink-0">
            <button
              type="button"
              onClick={() => setSelectedLayout(null)}
              className="text-sm text-slate-500 hover:text-slate-700 px-2"
            >
              ✕ Cancel
            </button>
            <button
              type="submit"
              disabled={isSaving || !widgetName.trim() || !locationId}
              className="rounded-lg bg-gradient-to-r from-indigo-600 to-indigo-700 hover:from-indigo-700 hover:to-indigo-800 disabled:opacity-50 px-6 py-2.5 text-sm font-semibold text-white transition-all shadow-sm"
            >
              {isSaving ? "Creating…" : "Create Widget →"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Add the `LayoutCard` sub-component and preview thumbnails**

Append to the same file `src/components/widget-layout-picker.tsx`:

```tsx
function LayoutCard({
  layout,
  isSelected,
  onSelect,
}: {
  layout: LayoutOption;
  isSelected: boolean;
  onSelect: (value: string) => void;
}) {
  return (
    <div
      onClick={() => onSelect(layout.value)}
      className={`group relative rounded-xl border-2 bg-white overflow-hidden cursor-pointer transition-all duration-200 ${
        isSelected
          ? "border-indigo-600 shadow-[0_0_0_4px_rgba(99,102,241,0.15)]"
          : "border-slate-200 hover:border-indigo-300 hover:shadow-md hover:-translate-y-0.5"
      }`}
    >
      {/* Badge */}
      {layout.badge === "popular" && (
        <span className="absolute top-2 right-2 z-10 bg-amber-400 text-white text-[10px] font-bold px-2 py-0.5 rounded-full uppercase">
          Popular
        </span>
      )}
      {layout.badge === "hot" && (
        <span className="absolute top-2 right-2 z-10 bg-red-500 text-white text-[10px] font-bold px-2 py-0.5 rounded-full uppercase">
          Hot
        </span>
      )}

      {/* Preview area */}
      <div className="bg-slate-50 border-b border-slate-100 px-4 py-5 min-h-[160px] flex items-center justify-center">
        <LayoutPreview value={layout.value} />
      </div>

      {/* Footer */}
      <div className="flex items-center justify-between px-4 py-3">
        <div>
          <p className="text-sm font-semibold text-slate-900">{layout.label}</p>
          <p className="text-xs text-slate-500">{layout.description}</p>
        </div>
        <span
          className={`text-xs font-semibold px-2.5 py-1 rounded-full transition-colors ${
            isSelected
              ? "bg-indigo-600 text-white"
              : "bg-indigo-50 text-indigo-600 group-hover:bg-indigo-100"
          }`}
        >
          {isSelected ? "✓ Selected" : "Select"}
        </span>
      </div>
    </div>
  );
}

function MiniStars({ count = 5 }: { count?: number }) {
  return <span className="text-amber-400 text-[10px]">{"★".repeat(count)}</span>;
}

function MiniAvatar({ initial, color = "bg-indigo-500" }: { initial: string; color?: string }) {
  return (
    <div className={`w-5 h-5 rounded-full ${color} flex items-center justify-center text-white text-[9px] font-bold flex-shrink-0`}>
      {initial}
    </div>
  );
}

function MiniReviewCard({ name, initial, color, text }: { name: string; initial: string; color?: string; text: string }) {
  return (
    <div className="bg-white border border-slate-200 rounded-md p-2">
      <div className="flex items-center gap-1.5 mb-1">
        <MiniAvatar initial={initial} color={color} />
        <span className="text-[10px] font-semibold text-slate-800">{name}</span>
      </div>
      <MiniStars />
      <p className="text-[9px] text-slate-500 mt-0.5 leading-tight">{text}</p>
    </div>
  );
}

function LayoutPreview({ value }: { value: string }) {
  if (value === "slider") {
    return (
      <div className="w-full space-y-2">
        <div className="flex items-center gap-1.5">
          <span className="text-[13px] font-bold text-blue-500" style={{ fontFamily: "serif" }}>Google</span>
          <MiniStars />
          <span className="text-[10px] font-bold text-slate-800">4.8</span>
          <span className="text-[9px] text-slate-400">47 reviews</span>
        </div>
        <div className="flex gap-2">
          <MiniReviewCard name="Sarah J." initial="S" text="Fantastic service! Highly recommend." />
          <MiniReviewCard name="Michael C." initial="M" color="bg-emerald-500" text="Professional and reliable." />
        </div>
        <div className="flex justify-between items-center px-1">
          <span className="text-[11px] text-indigo-400 font-bold">‹</span>
          <div className="flex gap-1">{[0,1,2].map(i => <div key={i} className={`w-1 h-1 rounded-full ${i===0?"bg-indigo-500":"bg-slate-200"}`}/>)}</div>
          <span className="text-[11px] text-indigo-400 font-bold">›</span>
        </div>
      </div>
    );
  }

  if (value === "carousel") {
    return (
      <div className="w-full">
        <div className="flex items-center gap-1.5 mb-2">
          <span className="text-[13px] font-bold text-blue-500" style={{ fontFamily: "serif" }}>Google</span>
          <MiniStars />
          <span className="text-[10px] font-bold text-slate-800">4.8</span>
        </div>
        <div className="bg-white border border-slate-200 rounded-md p-2.5">
          <div className="flex items-center gap-1.5 mb-1.5">
            <MiniAvatar initial="E" color="bg-amber-400" />
            <div>
              <div className="text-[10px] font-semibold text-slate-800">Emily R.</div>
              <MiniStars />
            </div>
          </div>
          <p className="text-[9px] text-slate-500 leading-tight">Very satisfied with the results. Quick turnaround and excellent communication.</p>
          <div className="flex justify-between items-center mt-2">
            <span className="text-[11px] text-indigo-400 font-bold">‹</span>
            <div className="flex gap-1">{[0,1,2,3].map(i => <div key={i} className={`w-1 h-1 rounded-full ${i===1?"bg-indigo-500":"bg-slate-200"}`}/>)}</div>
            <span className="text-[11px] text-indigo-400 font-bold">›</span>
          </div>
        </div>
      </div>
    );
  }

  if (value === "grid") {
    return (
      <div className="grid grid-cols-2 gap-1.5 w-full">
        <MiniReviewCard name="David T." initial="D" text="Best in the business." />
        <MiniReviewCard name="Jessica M." initial="J" color="bg-pink-500" text="Outstanding service." />
        <MiniReviewCard name="Robert K." initial="R" color="bg-emerald-500" text="Highly recommend!" />
        <MiniReviewCard name="Amy L." initial="A" color="bg-amber-400" text="Great value for money." />
      </div>
    );
  }

  if (value === "list") {
    return (
      <div className="w-full space-y-1.5">
        <div className="flex items-center gap-1.5 mb-2">
          <span className="text-[13px] font-bold text-blue-500" style={{ fontFamily: "serif" }}>Google</span>
          <MiniStars />
          <span className="text-[10px] font-bold text-slate-800">4.8</span>
          <span className="text-[9px] text-slate-400">47 reviews</span>
        </div>
        {[
          { n: "Sarah Johnson", i: "S", c: "bg-indigo-500", t: "Fantastic service! Highly recommend." },
          { n: "Michael Chen", i: "M", c: "bg-emerald-500", t: "Professional and reliable." },
          { n: "Emily Rodriguez", i: "E", c: "bg-amber-400", t: "Very satisfied. Quick turnaround." },
        ].map((r) => (
          <div key={r.n} className="bg-white border border-slate-200 rounded-md px-2 py-1.5 flex gap-1.5">
            <MiniAvatar initial={r.i} color={r.c} />
            <div>
              <div className="text-[10px] font-semibold text-slate-800">{r.n}</div>
              <MiniStars count={5} />
              <p className="text-[9px] text-slate-500 leading-tight">{r.t}</p>
            </div>
          </div>
        ))}
      </div>
    );
  }

  if (value === "badge") {
    return (
      <div className="flex flex-col items-center">
        <div className="bg-white border border-slate-200 rounded-xl px-6 py-4 text-center shadow-sm">
          <p className="text-[9px] font-bold text-slate-700 uppercase tracking-wider mb-1">Top Rated Service</p>
          <span className="text-[18px] font-bold text-blue-500" style={{ fontFamily: "serif" }}>Google</span>
          <p className="text-3xl font-extrabold text-slate-900 leading-none my-1">4.8</p>
          <MiniStars />
          <p className="text-[9px] text-slate-400 mt-1">Based on 47 reviews</p>
        </div>
      </div>
    );
  }

  if (value === "floating") {
    return (
      <div className="relative w-full h-32">
        <div className="absolute inset-0 bg-slate-100 rounded-md flex flex-col gap-1.5 p-2 overflow-hidden">
          <div className="w-full h-2 bg-slate-300 rounded" />
          <div className="w-3/4 h-2 bg-slate-200 rounded" />
          <div className="w-1/2 h-2 bg-slate-200 rounded" />
        </div>
        <div className="absolute bottom-2 left-2 bg-white border border-slate-200 rounded-lg p-2 shadow-lg w-40">
          <div className="flex items-center gap-1.5 mb-1">
            <MiniAvatar initial="L" color="bg-slate-600" />
            <div>
              <div className="text-[9px] font-semibold text-slate-800">Lucas Graham</div>
              <MiniStars />
            </div>
            <span className="ml-auto text-[13px] font-bold text-blue-500" style={{ fontFamily: "serif" }}>G</span>
          </div>
          <p className="text-[8px] text-slate-500 leading-tight">Great marketing agency. Helped us with SEO.</p>
        </div>
      </div>
    );
  }

  if (value === "masonry") {
    return (
      <div className="flex gap-1.5 w-full">
        {[
          [
            { i: "S", c: "bg-indigo-500", t: "Fantastic service! The team went above and beyond.", h: 52 },
            { i: "D", c: "bg-slate-500", t: "Best in the business.", h: 36 },
          ],
          [
            { i: "A", c: "bg-amber-400", t: "Great value for money.", h: 36 },
            { i: "E", c: "bg-pink-500", t: "Very satisfied. Quick turnaround and excellent communication.", h: 52 },
          ],
          [
            { i: "M", c: "bg-emerald-500", t: "Professional and reliable. Great experience overall.", h: 44 },
            { i: "J", c: "bg-purple-500", t: "Outstanding customer service.", h: 44 },
          ],
        ].map((col, ci) => (
          <div key={ci} className="flex flex-col gap-1.5 flex-1">
            {col.map((item, ri) => (
              <div
                key={ri}
                className="bg-white border border-slate-200 rounded-md p-1.5"
                style={{ minHeight: item.h }}
              >
                <div className="flex items-center gap-1 mb-0.5">
                  <MiniAvatar initial={item.i} color={item.c} />
                  <MiniStars />
                </div>
                <p className="text-[8px] text-slate-500 leading-tight">{item.t}</p>
              </div>
            ))}
          </div>
        ))}
      </div>
    );
  }

  return null;
}
```

- [ ] **Step 3: Type-check**

```bash
npx tsc --noEmit
```

Expected: no errors.

- [ ] **Step 4: Commit**

```bash
git add src/components/widget-layout-picker.tsx
git commit -m "feat: add WidgetLayoutPicker component with layout cards and slide-up panel"
```

---

### Task 5: Update `/widgets/page.tsx` — swap modal for link

**Files:**
- Modify: `src/app/widgets/page.tsx`

- [ ] **Step 1: Add `Link` import, remove `CreateWidgetModal`**

At the top of `src/app/widgets/page.tsx`, replace:

```tsx
import { CreateWidgetModal } from "@/components/create-widget-modal";
```

With:

```tsx
import Link from "next/link";
```

- [ ] **Step 2: Replace `<CreateWidgetModal>` usage**

Find the `<CreateWidgetModal locations={locations} />` usage (~line 33) and replace with:

```tsx
<Link
  href="/widgets/new"
  className="block w-full rounded-lg bg-gradient-to-r from-indigo-600 to-indigo-700 hover:from-indigo-700 hover:to-indigo-800 px-5 py-3 text-sm font-semibold text-white shadow-lg hover:shadow-xl transition-all duration-300 text-center"
>
  ✨ Create New Widget
</Link>
```

- [ ] **Step 3: Remove `locations` from the data fetching since the page no longer needs it**

Find the `Promise.all` call and remove `getWidgetEligibleLocations` from it:

```tsx
// Before
const [widgets, locations] = await Promise.all([
  getOrganizationReviewWidgets(organization.id),
  getWidgetEligibleLocations(organization.id),
]);

// After
const widgets = await getOrganizationReviewWidgets(organization.id);
```

Also remove the `getWidgetEligibleLocations` import and the `locations` variable references in the sidebar section. Remove the entire "Location Status" sidebar card (lines ~121-142) since it's no longer needed on the list page.

- [ ] **Step 4: Type-check**

```bash
npx tsc --noEmit
```

Expected: no errors.

- [ ] **Step 5: Commit**

```bash
git add src/app/widgets/page.tsx
git commit -m "feat: replace CreateWidgetModal with link to /widgets/new"
```

---

### Task 6: Delete `CreateWidgetModal`

**Files:**
- Delete: `src/components/create-widget-modal.tsx`

- [ ] **Step 1: Verify no other references**

```bash
grep -r "create-widget-modal\|CreateWidgetModal" /Users/safatash/.openclaw/workspace/wehearyou/src
```

Expected: no output. If anything shows up, remove the reference before deleting.

- [ ] **Step 2: Delete the file**

```bash
rm src/components/create-widget-modal.tsx
```

- [ ] **Step 3: Type-check**

```bash
npx tsc --noEmit
```

Expected: no errors.

- [ ] **Step 4: Commit**

```bash
git add -A
git commit -m "chore: remove CreateWidgetModal (replaced by /widgets/new)"
```

---

### Task 7: End-to-end browser verification

- [ ] **Step 1: Start dev server**

```bash
npm run dev
```

- [ ] **Step 2: Verify widget list page**

Navigate to `/widgets`. Confirm:
- "Create New Widget" button is a link (not a button that opens a modal)
- Clicking it navigates to `/widgets/new`

- [ ] **Step 3: Verify layout picker page**

On `/widgets/new`, confirm:
- Page header shows "Select widget layout"
- All 7 layout cards are visible with CSS preview thumbnails
- Tabs (All, Slider, Carousel, Grid, List, Badge, Floating, Masonry) filter the cards correctly
- Clicking a card highlights it and slides up the bottom panel
- Bottom panel shows the selected layout name, name input, location dropdown
- Clicking a different card switches selection; clicking same card again deselects
- ✕ Cancel hides the panel

- [ ] **Step 4: Create a test widget**

Fill in name + location in the bottom panel, click "Create Widget →". Confirm:
- Redirects to `/widgets/[id]` customizer
- The layout saved matches what was selected on `/widgets/new`
- The customizer shows the correct layout pre-selected

- [ ] **Step 5: Verify layout saving in customizer**

In the customizer, switch layout to "Carousel" and save. Confirm it saves without silently falling back to "Grid".
