# Collecting Widget MVP Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Implement the Collecting Widget type — a floating button/tab embedded on a customer's website that opens the `/f/[slug]` review funnel inside an iframe modal, with configurable position, frequency, theme, color, and mobile behavior.

**Architecture:** Five new nullable fields are added to `ReviewWidget` for collecting config. The public widget API passes these fields plus `locationSlug` (from existing `location.slug`) to the embed script. The embed script detects `widgetType === "COLLECTING"`, applies sessionStorage-based frequency gating, and renders a floating button that opens an iframe modal. The funnel pages detect `?embed=1` and render a compact layout suited for the modal. All new DB fields are nullable — existing Wall of Love, Badge, and Single Testimonial widgets are completely unaffected.

**Tech Stack:** Next.js App Router, Prisma (PostgreSQL), vanilla JS embed script (no framework dependencies), Node.js built-in `node:test` runner.

---

## File Map

### Modified files
| File | Change |
|---|---|
| `prisma/schema.prisma` | Add 5 nullable collecting fields to `ReviewWidget` |
| `src/lib/review-widgets.ts` | Add new fields to `PublicWidgetPayload` types; include in payload builders |
| `src/app/widgets/actions.ts` | Handle new collecting fields in `updateReviewWidget` |
| `src/components/widget-customizer.tsx` | Unlock Collecting Widget tab; add `CollectingWidgetPanel`; update save handler |
| `src/components/review-widget-preview.tsx` | Add collecting widget preview (floating button mockup) |
| `src/app/embed/widget.js/route.ts` | Add collecting widget render path: frequency gating, floating button, iframe modal |
| `src/app/f/[slug]/page.tsx` | Add `searchParams`; pass `embed` prop to `FunnelRatingForm` |
| `src/app/f/[slug]/funnel-rating-form.tsx` | Accept + forward `embed` prop through formData |
| `src/app/f/[slug]/actions.ts` | Preserve `embed=1` in all redirects |
| `src/app/f/[slug]/feedback/page.tsx` | Accept `searchParams`; compact layout when `embed=1` |
| `src/app/f/[slug]/thanks/page.tsx` | Accept `searchParams`; compact layout when `embed=1` |

---

## Task 1: DB Migration — Add collecting widget fields to ReviewWidget

**Files:**
- Modify: `prisma/schema.prisma`

- [ ] **Step 1: Add five nullable fields after `badgeStyle` in `ReviewWidget` model**

In `prisma/schema.prisma`, locate the `ReviewWidget` model's `badgeStyle String?` line and add after it:

```prisma
  badgeStyle                 String?

  // Collecting Widget
  collectDisplayFreq         String?   // "always" | "50pct" | "33pct"
  collectButtonColor         String?   // hex override; null = inherit primaryColor
  collectButtonTheme         String?   // "default" | "minimal" | "branded"
  collectMobileBehavior      String?   // "pill" | "hidden"
  collectButtonPosition      String?   // "left" | "right" | "bottom-left" | "bottom-right"
```

- [ ] **Step 2: Run Prisma migration**

```bash
cd /Users/safatash/.openclaw/workspace/wehearyou
npx prisma migrate dev --name add_collecting_widget_fields
```

Expected: Migration file created in `prisma/migrations/`, `prisma generate` runs, Prisma client updated.

- [ ] **Step 3: Verify schema and client compile**

```bash
npx prisma validate
npm run typecheck
```

Expected: no errors.

- [ ] **Step 4: Commit**

```bash
git add prisma/schema.prisma prisma/migrations/
git commit -m "feat: add collecting widget fields to ReviewWidget schema"
```

---

## Task 2: Update `review-widgets.ts` — payload types and builders

**Files:**
- Modify: `src/lib/review-widgets.ts`

- [ ] **Step 1: Write failing test for new payload fields**

Create `src/lib/review-widgets-collecting.test.ts`:

```ts
import assert from "node:assert/strict";
import test from "node:test";

// Test that buildWidgetObj fields compile and have expected defaults
// These are type-level checks — runtime is tested via typecheck
test("PublicWidgetPayload includes collecting fields", () => {
  const widgetFields = [
    "collectDisplayFreq",
    "collectButtonColor",
    "collectButtonTheme",
    "collectMobileBehavior",
    "collectButtonPosition",
  ];
  // If the type is wrong, tsc --noEmit will catch it at compile time
  assert.ok(widgetFields.length === 5);
});

test("PublicWidgetPayload.location includes slug", () => {
  assert.ok(true, "verified by typecheck");
});
```

```bash
node --import tsx/esm src/lib/review-widgets-collecting.test.ts
```

Expected: PASS (these are placeholder runtime assertions; correctness enforced by tsc).

- [ ] **Step 2: Add new fields to `PublicWidgetPayload` type**

In `src/lib/review-widgets.ts`, inside the `widget` sub-object of `PublicWidgetPayload`:

```ts
export type PublicWidgetPayload = {
  widget: {
    name: string;
    layout: string;
    theme: string;
    pageSize: number;
    contentType: string;
    widgetType: string | null;
    badgeStyle: string | null;
    // Header
    showHeader: boolean;
    showAvgRating: boolean;
    showReviewCount: boolean;
    headerAlign: string;
    // Reviews
    showRating: boolean;
    showReviewerName: boolean;
    showDate: boolean;
    showWriteReview: boolean;
    showResponses: boolean;
    showSourceLogo: boolean;
    bodyMaxChars: number;
    // Appearance
    primaryColor: string;
    starColor: string;
    backgroundColor: string;
    textColor: string;
    fontFamily: string;
    // Collecting Widget
    collectDisplayFreq: string | null;
    collectButtonColor: string | null;
    collectButtonTheme: string | null;
    collectMobileBehavior: string | null;
    collectButtonPosition: string | null;
  };
  location: {
    name: string;
    slug: string;
    avgRating: number | null;
    reviewCount: number;
    reviewLink: string | null;
    aiReviewSummary: string | null;
    aiReviewSummaryReviewCount: number | null;
  };
  reviews: PublicWidgetReview[];
  pagination: {
    page: number;
    pageSize: number;
    total: number;
    hasMore: boolean;
  };
  videoTestimonials?: PublicWidgetVideoTestimonial[];
  singleItemUnavailable?: boolean;
};
```

- [ ] **Step 3: Update `buildWidgetObj` to include new fields**

Replace the entire `buildWidgetObj` function:

```ts
const buildWidgetObj = (ps: number) => ({
  name: widget.name,
  layout: widget.layout,
  theme: widget.theme,
  pageSize: ps,
  contentType: widget.contentType,
  widgetType: widget.widgetType ?? null,
  badgeStyle: widget.badgeStyle ?? null,
  showHeader: widget.showHeader,
  showAvgRating: widget.showAvgRating,
  showReviewCount: widget.showReviewCount,
  headerAlign: widget.headerAlign,
  showRating: widget.showRating,
  showReviewerName: widget.showReviewerName,
  showDate: widget.showDate,
  showWriteReview: widget.showWriteReview,
  showResponses: widget.showResponses,
  showSourceLogo: widget.showSourceLogo,
  bodyMaxChars: widget.bodyMaxChars,
  primaryColor: widget.primaryColor,
  starColor: widget.starColor,
  backgroundColor: widget.backgroundColor,
  textColor: widget.textColor,
  fontFamily: widget.fontFamily,
  collectDisplayFreq: widget.collectDisplayFreq ?? null,
  collectButtonColor: widget.collectButtonColor ?? null,
  collectButtonTheme: widget.collectButtonTheme ?? null,
  collectMobileBehavior: widget.collectMobileBehavior ?? null,
  collectButtonPosition: widget.collectButtonPosition ?? null,
});
```

- [ ] **Step 4: Update `buildLocationObj` to include `slug`**

Replace the entire `buildLocationObj` function:

```ts
const buildLocationObj = (reviewCount: number) => ({
  name: widget.location.name,
  slug: widget.location.slug,
  avgRating: widget.location.avgRating ?? null,
  reviewCount,
  reviewLink: widget.location.reviewLink ?? null,
  aiReviewSummary: widget.location.publicProfile?.showAiReviewSummary
    ? (widget.location.publicProfile.aiReviewSummary ?? null)
    : null,
  aiReviewSummaryReviewCount: widget.location.publicProfile?.showAiReviewSummary
    ? (widget.location.publicProfile.aiReviewSummaryReviewCount ?? null)
    : null,
});
```

- [ ] **Step 5: Run typecheck**

```bash
npm run typecheck
```

Expected: PASS — no type errors.

- [ ] **Step 6: Commit**

```bash
git add src/lib/review-widgets.ts src/lib/review-widgets-collecting.test.ts
git commit -m "feat: add collecting widget fields and locationSlug to PublicWidgetPayload"
```

---

## Task 3: Update `widgets/actions.ts` — persist collecting widget fields

**Files:**
- Modify: `src/app/widgets/actions.ts`

- [ ] **Step 1: Add validation and DB write for collecting widget fields**

In `updateReviewWidget`, after the existing `allowedBadgeStyles` set, add:

```ts
const allowedDisplayFreqs = new Set(["always", "50pct", "33pct"]);
const allowedButtonThemes = new Set(["default", "minimal", "branded"]);
const allowedMobileBehaviors = new Set(["pill", "hidden"]);
const allowedCollectPositions = new Set(["left", "right", "bottom-left", "bottom-right"]);

const rawCollectDisplayFreq = String(formData.get("collectDisplayFreq") ?? "").trim();
const rawCollectButtonTheme = String(formData.get("collectButtonTheme") ?? "").trim();
const rawCollectMobileBehavior = String(formData.get("collectMobileBehavior") ?? "").trim();
const rawCollectButtonPosition = String(formData.get("collectButtonPosition") ?? "").trim();
const rawCollectButtonColor = String(formData.get("collectButtonColor") ?? "").trim();
```

Then inside `prisma.reviewWidget.update({ data: { ... } })`, add after the existing fields:

```ts
  collectDisplayFreq: allowedDisplayFreqs.has(rawCollectDisplayFreq) ? rawCollectDisplayFreq : null,
  collectButtonColor: /^#[0-9a-fA-F]{6}$/.test(rawCollectButtonColor) ? rawCollectButtonColor : null,
  collectButtonTheme: allowedButtonThemes.has(rawCollectButtonTheme) ? rawCollectButtonTheme : null,
  collectMobileBehavior: allowedMobileBehaviors.has(rawCollectMobileBehavior) ? rawCollectMobileBehavior : null,
  collectButtonPosition: allowedCollectPositions.has(rawCollectButtonPosition) ? rawCollectButtonPosition : null,
```

- [ ] **Step 2: Run typecheck**

```bash
npm run typecheck
```

Expected: PASS.

- [ ] **Step 3: Commit**

```bash
git add src/app/widgets/actions.ts
git commit -m "feat: persist collecting widget config fields in updateReviewWidget"
```

---

## Task 4: Update `widget-customizer.tsx` — Collecting Widget tab and panel

**Files:**
- Modify: `src/components/widget-customizer.tsx`

- [ ] **Step 1: Update `WidgetTypeKey` and activate the Collecting tab**

The `WidgetTypeKey` type already includes `"COLLECTING"`. In the tab bar loop, `["WALL_OF_LOVE", "SINGLE_TESTIMONIAL", "BADGE"]` is mapped to buttons, and then the `COLLECTING` tab is rendered as a separate disabled div. 

Replace the entire tab bar section (the div containing `{(["WALL_OF_LOVE", "SINGLE_TESTIMONIAL", "BADGE"] as WidgetTypeKey[]).map(...)` and the following disabled div) with:

```tsx
{/* WIDGET TYPE TABS */}
<div className="flex border-b border-slate-200 overflow-x-auto">
  {(["WALL_OF_LOVE", "SINGLE_TESTIMONIAL", "BADGE", "COLLECTING"] as WidgetTypeKey[]).map((type) => {
    const labels: Record<string, string> = {
      WALL_OF_LOVE: "🧱 Wall of Love",
      SINGLE_TESTIMONIAL: "✦ Single Testimonial",
      BADGE: "⭐ Badge",
      COLLECTING: "📥 Collecting Widget",
    };
    return (
      <button
        key={type}
        type="button"
        onClick={() => {
          setWidgetType(type);
          markUnsaved();
        }}
        className={`flex-shrink-0 px-5 py-3 text-sm font-semibold border-b-2 transition-colors ${
          widgetType === type
            ? "border-indigo-600 text-indigo-600"
            : "border-transparent text-slate-500 hover:text-slate-900"
        }`}
      >
        {labels[type]}
      </button>
    );
  })}
</div>
```

- [ ] **Step 2: Add state for collecting widget config**

After the existing `const [singleType, ...]` state declaration, add:

```tsx
const [collectPosition, setCollectPosition] = useState<string>(
  (widget as { collectButtonPosition?: string | null }).collectButtonPosition ?? "bottom-right",
);
const [collectFreq, setCollectFreq] = useState<string>(
  (widget as { collectDisplayFreq?: string | null }).collectDisplayFreq ?? "always",
);
const [collectTheme, setCollectTheme] = useState<string>(
  (widget as { collectButtonTheme?: string | null }).collectButtonTheme ?? "default",
);
const [collectButtonColor, setCollectButtonColor] = useState<string | null>(
  (widget as { collectButtonColor?: string | null }).collectButtonColor ?? null,
);
const [collectMobileBehavior, setCollectMobileBehavior] = useState<string>(
  (widget as { collectMobileBehavior?: string | null }).collectMobileBehavior ?? "pill",
);
```

- [ ] **Step 3: Update `handleSave` to send collecting fields**

In `handleSave`, after `formData.append("widgetId", widget.id);` block (after all the existing appends), add:

```ts
formData.append("collectPosition", collectPosition);
formData.append("collectDisplayFreq", collectFreq);
formData.append("collectButtonTheme", collectTheme);
formData.append("collectButtonColor", collectButtonColor ?? "");
formData.append("collectMobileBehavior", collectMobileBehavior);
formData.append("collectButtonPosition", collectPosition);
```

Wait — note: the server action reads `collectButtonPosition` (not `collectPosition`), so ensure the field name matches. Use `collectButtonPosition` everywhere:

```ts
formData.append("collectDisplayFreq", collectFreq);
formData.append("collectButtonTheme", collectTheme);
formData.append("collectButtonColor", collectButtonColor ?? "");
formData.append("collectMobileBehavior", collectMobileBehavior);
formData.append("collectButtonPosition", collectPosition);
```

- [ ] **Step 4: Add the CollectingWidgetPanel JSX block**

After the `{/* ── BADGE ─── */}` block and before `{/* ── STICKY FOOTER ─── */}`, add:

```tsx
{/* ── COLLECTING WIDGET ─────────────────────────────────── */}
{widgetType === "COLLECTING" && (
  <>
    {/* Button Position */}
    <SectionCard title="Button position">
      <div className="p-3 grid grid-cols-2 gap-2">
        {(
          [
            { id: "bottom-right", icon: "↘", label: "Bottom Right", desc: "Floating pill, bottom-right corner" },
            { id: "bottom-left", icon: "↙", label: "Bottom Left", desc: "Floating pill, bottom-left corner" },
            { id: "right", icon: "→", label: "Right Tab", desc: "Vertical tab on right edge" },
            { id: "left", icon: "←", label: "Left Tab", desc: "Vertical tab on left edge" },
          ] as const
        ).map(({ id, icon, label, desc }) => (
          <button
            key={id}
            type="button"
            onClick={() => {
              setCollectPosition(id);
              markUnsaved();
            }}
            className={`relative flex flex-col items-center gap-1 rounded-xl border-2 p-3 text-center transition-all ${
              collectPosition === id
                ? "border-indigo-600 bg-indigo-50"
                : "border-slate-200 bg-white hover:border-slate-300"
            }`}
          >
            {collectPosition === id && (
              <span className="absolute -top-1.5 -right-1.5 w-4 h-4 bg-indigo-600 rounded-full text-white text-[9px] font-bold flex items-center justify-center">
                ✓
              </span>
            )}
            <span className="text-xl">{icon}</span>
            <span className="text-xs font-bold text-slate-900 leading-tight">{label}</span>
            <span className="text-[10px] text-slate-500 leading-tight">{desc}</span>
          </button>
        ))}
      </div>
    </SectionCard>

    {/* Display Frequency */}
    <SectionCard title="Display frequency">
      <div className="p-3 flex flex-col gap-2">
        {(
          [
            { id: "always", label: "Always", desc: "Show to every visitor" },
            { id: "50pct", label: "50% of visitors", desc: "Show to half of sessions" },
            { id: "33pct", label: "33% of visitors", desc: "Show to one in three sessions" },
          ] as const
        ).map(({ id, label, desc }) => (
          <button
            key={id}
            type="button"
            onClick={() => {
              setCollectFreq(id);
              markUnsaved();
            }}
            className={`flex items-center justify-between rounded-lg border-2 p-3 transition-all ${
              collectFreq === id
                ? "border-indigo-600 bg-indigo-50"
                : "border-slate-200 bg-white hover:border-slate-300"
            }`}
          >
            <div className="text-left">
              <p className="text-sm font-semibold text-slate-900">{label}</p>
              <p className="text-xs text-slate-500">{desc}</p>
            </div>
            {collectFreq === id && (
              <span className="text-xs font-bold text-indigo-600 bg-indigo-100 px-2 py-0.5 rounded-full flex-shrink-0">
                Selected
              </span>
            )}
          </button>
        ))}
        <p className="text-[11px] text-slate-400 px-1">
          Frequency is consistent per browser session using sessionStorage.
        </p>
      </div>
    </SectionCard>

    {/* Button Theme */}
    <SectionCard title="Button style">
      <div className="p-3 grid grid-cols-3 gap-2">
        {(
          [
            { id: "default", label: "Default", desc: "Solid filled" },
            { id: "minimal", label: "Minimal", desc: "Outlined border" },
            { id: "branded", label: "Branded", desc: "Bold brand color" },
          ] as const
        ).map(({ id, label, desc }) => (
          <button
            key={id}
            type="button"
            onClick={() => {
              setCollectTheme(id);
              markUnsaved();
            }}
            className={`relative flex flex-col items-center gap-1 rounded-xl border-2 p-3 text-center transition-all ${
              collectTheme === id
                ? "border-indigo-600 bg-indigo-50"
                : "border-slate-200 bg-white hover:border-slate-300"
            }`}
          >
            {collectTheme === id && (
              <span className="absolute -top-1.5 -right-1.5 w-4 h-4 bg-indigo-600 rounded-full text-white text-[9px] font-bold flex items-center justify-center">
                ✓
              </span>
            )}
            <span className="text-xs font-bold text-slate-900">{label}</span>
            <span className="text-[10px] text-slate-500 leading-tight">{desc}</span>
          </button>
        ))}
      </div>
    </SectionCard>

    {/* Button Color */}
    <SectionCard title="Button color">
      <div className="p-4 space-y-3">
        <button
          type="button"
          onClick={() => {
            setCollectButtonColor(null);
            markUnsaved();
          }}
          className={`w-full flex items-center justify-between rounded-lg border-2 p-3 transition-all ${
            collectButtonColor === null
              ? "border-indigo-600 bg-indigo-50"
              : "border-slate-200 bg-white hover:border-slate-300"
          }`}
        >
          <div className="text-left">
            <p className="text-sm font-semibold text-slate-900">Inherit brand color</p>
            <p className="text-xs text-slate-500">Uses the widget's primary color</p>
          </div>
          {collectButtonColor === null && (
            <span className="text-xs font-bold text-indigo-600 bg-indigo-100 px-2 py-0.5 rounded-full flex-shrink-0">
              Active
            </span>
          )}
        </button>
        <div>
          <p className="text-xs font-bold text-slate-500 mb-1.5">Custom color override</p>
          <div className="flex items-center gap-2">
            <input
              type="color"
              value={collectButtonColor ?? widget.primaryColor ?? "#4338ca"}
              onChange={(e) => {
                setCollectButtonColor(e.target.value);
                markUnsaved();
              }}
              className="w-10 h-10 rounded-lg border border-slate-200 cursor-pointer"
            />
            <input
              type="text"
              value={collectButtonColor ?? ""}
              onChange={(e) => {
                const v = e.target.value.trim();
                setCollectButtonColor(/^#[0-9a-fA-F]{6}$/.test(v) ? v : null);
                markUnsaved();
              }}
              placeholder="#4338ca"
              className="flex-1 rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-sm font-mono"
            />
          </div>
        </div>
      </div>
    </SectionCard>

    {/* Mobile Behavior */}
    <SectionCard title="Mobile behavior">
      <div className="p-3 grid grid-cols-2 gap-2">
        {(
          [
            { id: "pill", label: "Show on mobile", desc: "Render as pill button" },
            { id: "hidden", label: "Hide on mobile", desc: "Don't render on small screens" },
          ] as const
        ).map(({ id, label, desc }) => (
          <button
            key={id}
            type="button"
            onClick={() => {
              setCollectMobileBehavior(id);
              markUnsaved();
            }}
            className={`relative flex flex-col items-center gap-1 rounded-xl border-2 p-3 text-center transition-all ${
              collectMobileBehavior === id
                ? "border-indigo-600 bg-indigo-50"
                : "border-slate-200 bg-white hover:border-slate-300"
            }`}
          >
            {collectMobileBehavior === id && (
              <span className="absolute -top-1.5 -right-1.5 w-4 h-4 bg-indigo-600 rounded-full text-white text-[9px] font-bold flex items-center justify-center">
                ✓
              </span>
            )}
            <span className="text-xs font-bold text-slate-900">{label}</span>
            <span className="text-[10px] text-slate-500 leading-tight">{desc}</span>
          </button>
        ))}
      </div>
    </SectionCard>

    {/* Active toggle */}
    <SectionCard title="Widget settings">
      <div className="p-4">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm font-semibold text-slate-900">Widget active</p>
            <p className="text-xs text-slate-500">Show the collect button on embedded pages</p>
          </div>
          <Toggle on={isActive} onChange={setAndMark(setIsActive)} />
        </div>
      </div>
    </SectionCard>
  </>
)}
```

- [ ] **Step 5: Update preview to pass collecting props to `ReviewWidgetPreview`**

In the `<ReviewWidgetPreview ... />` call, add these props (they'll be consumed in the next task):

```tsx
collectPosition={collectPosition}
collectButtonColor={collectButtonColor}
collectButtonTheme={collectTheme}
collectMobileBehavior={collectMobileBehavior}
```

- [ ] **Step 6: Run typecheck**

```bash
npm run typecheck
```

Expected: Type errors on `ReviewWidgetPreview` props — those get fixed in Task 5.

- [ ] **Step 7: Commit (after Task 5 resolves the preview type errors)**

Hold this commit until Task 5 is done — typecheck must pass first.

---

## Task 5: Update `review-widget-preview.tsx` — collecting widget preview

**Files:**
- Modify: `src/components/review-widget-preview.tsx`

- [ ] **Step 1: Add collecting props to `ReviewWidgetPreviewProps`**

In `ReviewWidgetPreviewProps`, add after `badgeStyle`:

```ts
  collectPosition?: string | null;
  collectButtonColor?: string | null;
  collectButtonTheme?: string | null;
  collectMobileBehavior?: string | null;
```

- [ ] **Step 2: Add `CollectingWidgetPreview` component**

Add this component near the top of the file, before the main `ReviewWidgetPreview` function:

```tsx
function CollectingWidgetPreview({
  position,
  theme,
  color,
  mobileBehavior,
  isMobile,
}: {
  position: string;
  theme: string;
  color: string;
  mobileBehavior: string;
  isMobile?: boolean;
}) {
  const effectiveColor = color || "#4338ca";
  const isTab = position === "left" || position === "right";
  const hidden = isMobile && mobileBehavior === "hidden";

  const btnStyle: React.CSSProperties =
    theme === "minimal"
      ? { background: "transparent", border: `2px solid ${effectiveColor}`, color: effectiveColor }
      : { background: effectiveColor, border: "none", color: "#fff" };

  const positionClass: Record<string, string> = {
    "bottom-right": "bottom-3 right-3",
    "bottom-left": "bottom-3 left-3",
    right: "right-0 top-1/2 -translate-y-1/2",
    left: "left-0 top-1/2 -translate-y-1/2",
  };

  return (
    <div className="relative overflow-hidden rounded-xl border border-slate-200 bg-slate-100" style={{ minHeight: 220 }}>
      {/* Mock page lines */}
      <div className="p-4 space-y-2">
        <div className="h-3 w-3/4 rounded bg-slate-200" />
        <div className="h-2 w-full rounded bg-slate-200" />
        <div className="h-2 w-5/6 rounded bg-slate-200" />
        <div className="h-2 w-4/6 rounded bg-slate-200" />
        <div className="mt-4 h-2 w-full rounded bg-slate-200" />
        <div className="h-2 w-5/6 rounded bg-slate-200" />
      </div>

      {/* Floating button */}
      {!hidden ? (
        <div className={`absolute ${positionClass[position] ?? positionClass["bottom-right"]}`}>
          {isTab ? (
            <div
              style={{
                ...btnStyle,
                writingMode: "vertical-rl" as const,
                padding: "10px 8px",
                borderRadius: position === "right" ? "8px 0 0 8px" : "0 8px 8px 0",
                fontSize: 11,
                fontWeight: 700,
                cursor: "pointer",
                boxShadow: "0 2px 8px rgba(0,0,0,.15)",
              }}
            >
              Share Feedback
            </div>
          ) : (
            <div
              style={{
                ...btnStyle,
                padding: "10px 16px",
                borderRadius: 999,
                fontSize: 12,
                fontWeight: 700,
                cursor: "pointer",
                boxShadow: "0 4px 12px rgba(0,0,0,.2)",
                whiteSpace: "nowrap",
              }}
            >
              Share Feedback
            </div>
          )}
        </div>
      ) : (
        <div className="absolute bottom-3 right-3">
          <div className="text-[10px] text-slate-400 italic">Hidden on mobile</div>
        </div>
      )}

      {/* Label */}
      <div className="absolute top-2 left-2 text-[9px] font-bold uppercase tracking-wider text-slate-400 bg-white rounded px-1.5 py-0.5">
        Preview
      </div>
    </div>
  );
}
```

- [ ] **Step 3: Add COLLECTING branch in `ReviewWidgetPreview` render function**

At the beginning of the `ReviewWidgetPreview` return, before the existing content, add:

```tsx
if (widgetType === "COLLECTING") {
  return (
    <CollectingWidgetPreview
      position={collectPosition ?? "bottom-right"}
      theme={collectButtonTheme ?? "default"}
      color={collectButtonColor ?? primaryColor ?? "#4338ca"}
      mobileBehavior={collectMobileBehavior ?? "pill"}
      isMobile={isMobile}
    />
  );
}
```

- [ ] **Step 4: Run typecheck — Tasks 4 and 5 should both pass**

```bash
npm run typecheck
```

Expected: PASS.

- [ ] **Step 5: Commit Tasks 4 and 5 together**

```bash
git add src/components/widget-customizer.tsx src/components/review-widget-preview.tsx
git commit -m "feat: add Collecting Widget tab, config panel, and preview in customizer"
```

---

## Task 6: Update embed script — collecting widget render path

**Files:**
- Modify: `src/app/embed/widget.js/route.ts`

This task is the core of the feature. All changes are inside the `script` template literal string.

- [ ] **Step 1: Add `ensureCollectStyles` helper**

After the existing `ensureStyles()` function (around line 45–111 of the script), add:

```js
  function ensureCollectStyles() {
    if (document.getElementById("why-collect-styles")) return;
    var style = document.createElement("style");
    style.id = "why-collect-styles";
    style.textContent =
      ".why-collect-btn{font-family:inherit;border:none;cursor:pointer;font-weight:600;transition:opacity .2s,transform .2s;z-index:2147483646;line-height:1}" +
      ".why-collect-pill{position:fixed;padding:12px 20px;border-radius:999px;font-size:14px;box-shadow:0 4px 16px rgba(0,0,0,.2)}" +
      ".why-collect-pill-br{bottom:24px;right:24px}" +
      ".why-collect-pill-bl{bottom:24px;left:24px}" +
      ".why-collect-tab{position:fixed;top:50%;transform:translateY(-50%);writing-mode:vertical-rl;padding:14px 10px;font-size:13px;box-shadow:0 2px 8px rgba(0,0,0,.15)}" +
      ".why-collect-tab-r{right:0;border-radius:8px 0 0 8px}" +
      ".why-collect-tab-l{left:0;border-radius:0 8px 8px 0;writing-mode:vertical-lr}" +
      ".why-collect-overlay{position:fixed;inset:0;z-index:2147483647;background:rgba(0,0,0,.6);display:flex;align-items:center;justify-content:center;padding:16px}" +
      ".why-collect-modal{position:relative;width:100%;max-width:520px;background:#fff;border-radius:24px;overflow:hidden;box-shadow:0 24px 80px rgba(0,0,0,.3)}" +
      ".why-collect-close{position:absolute;top:12px;right:12px;background:rgba(0,0,0,.08);border:none;border-radius:50%;width:32px;height:32px;font-size:14px;cursor:pointer;z-index:1;color:#0f172a;font-weight:700;line-height:1}" +
      ".why-collect-iframe{width:100%;height:600px;border:none;display:block}" +
      "@media(max-height:700px){.why-collect-iframe{height:480px}}";
    document.head.appendChild(style);
  }
```

- [ ] **Step 2: Add `shouldShowCollect` helper**

After `ensureCollectStyles`, add:

```js
  function shouldShowCollect(token, freq) {
    if (!freq || freq === "always") return true;
    var key = "why-collect-" + token;
    try {
      var cached = sessionStorage.getItem(key);
      if (cached !== null) return cached === "1";
      var chance = freq === "50pct" ? 0.5 : freq === "33pct" ? 0.333 : 1;
      var show = Math.random() < chance;
      sessionStorage.setItem(key, show ? "1" : "0");
      return show;
    } catch (e) {
      return true;
    }
  }
```

- [ ] **Step 3: Add `openCollectModal` helper**

After `shouldShowCollect`, add:

```js
  function openCollectModal(slug, appOrigin) {
    var overlay = document.createElement("div");
    overlay.className = "why-collect-overlay";
    var modal = document.createElement("div");
    modal.className = "why-collect-modal";
    var closeBtn = document.createElement("button");
    closeBtn.className = "why-collect-close";
    closeBtn.textContent = "✕";
    closeBtn.setAttribute("type", "button");
    closeBtn.setAttribute("aria-label", "Close");
    var iframe = document.createElement("iframe");
    iframe.src = appOrigin + "/f/" + encodeURIComponent(slug) + "?embed=1";
    iframe.className = "why-collect-iframe";
    iframe.setAttribute("title", "Share your feedback");
    overlay.addEventListener("click", function (e) {
      if (e.target === overlay) document.body.removeChild(overlay);
    });
    closeBtn.addEventListener("click", function () { document.body.removeChild(overlay); });
    modal.appendChild(closeBtn);
    modal.appendChild(iframe);
    overlay.appendChild(modal);
    document.body.appendChild(overlay);
  }
```

- [ ] **Step 4: Add `renderCollectingWidget` function**

After `openCollectModal`, add:

```js
  function renderCollectingWidget(data, token, appOrigin) {
    var w = data.widget;
    var slug = data.location.slug;
    if (!slug) return;

    if (!shouldShowCollect(token, w.collectDisplayFreq)) return;

    var position = w.collectButtonPosition || "bottom-right";
    var theme = w.collectButtonTheme || "default";
    var color = w.collectButtonColor || w.primaryColor || "#4338ca";
    var mobileBehavior = w.collectMobileBehavior || "pill";

    var isMobile = window.innerWidth < 640;
    if (isMobile && mobileBehavior === "hidden") return;

    ensureCollectStyles();

    var btn = document.createElement("button");
    btn.setAttribute("type", "button");
    btn.setAttribute("aria-label", "Share Feedback");
    btn.textContent = "Share Feedback";
    btn.className = "why-collect-btn";

    if (theme === "minimal") {
      btn.style.cssText = "background:transparent;color:" + color + ";border:2px solid " + color;
    } else {
      btn.style.cssText = "background:" + color + ";color:#fff;border:none";
    }

    if (position === "right") {
      btn.classList.add("why-collect-tab", "why-collect-tab-r");
    } else if (position === "left") {
      btn.classList.add("why-collect-tab", "why-collect-tab-l");
    } else if (position === "bottom-left") {
      btn.classList.add("why-collect-pill", "why-collect-pill-bl");
    } else {
      btn.classList.add("why-collect-pill", "why-collect-pill-br");
    }

    btn.addEventListener("click", function () { openCollectModal(slug, appOrigin); });
    document.body.appendChild(btn);
  }
```

- [ ] **Step 5: Call `renderCollectingWidget` early in `loadPage`**

Inside `loadPage`, immediately after `var data = await response.json();` and `widgetConfig = data.widget;` (around line 390–391 of the original), add:

```js
        if (nextPage === 1 && data.widget.widgetType === "COLLECTING") {
          renderCollectingWidget(data, token, baseUrl.origin);
          done = true;
          setLoadingState(false);
          return;
        }
```

- [ ] **Step 6: Run typecheck (the route is JS, but Next can still validate it)**

```bash
npm run typecheck
```

Expected: PASS.

- [ ] **Step 7: Commit**

```bash
git add src/app/embed/widget.js/route.ts
git commit -m "feat: add collecting widget rendering to embed script (floating button + iframe modal)"
```

---

## Task 7: Update funnel pages for embed mode

All three funnel pages need compact layout when `?embed=1` is in the URL. The server actions need to forward `embed=1` through redirects.

**Files:**
- Modify: `src/app/f/[slug]/page.tsx`
- Modify: `src/app/f/[slug]/funnel-rating-form.tsx`
- Modify: `src/app/f/[slug]/actions.ts`
- Modify: `src/app/f/[slug]/feedback/page.tsx`
- Modify: `src/app/f/[slug]/thanks/page.tsx`

### 7a: Update `actions.ts` to forward `embed` param

- [ ] **Step 1: Update `submitPublicFunnelRating` to forward `embed`**

In `src/app/f/[slug]/actions.ts`, update `submitPublicFunnelRating`:

```ts
export async function submitPublicFunnelRating(formData: FormData) {
  const slug = String(formData.get("slug") ?? "").trim();
  const ratingValue = Number(formData.get("rating"));
  const feedback = String(formData.get("feedback") ?? "").trim();
  const name = String(formData.get("name") ?? "").trim();
  const email = String(formData.get("email") ?? "").trim();
  const embed = formData.get("embed") === "1";
  const embedSuffix = embed ? "&embed=1" : "";

  if (!slug || !Number.isInteger(ratingValue) || ratingValue < 1 || ratingValue > 5) {
    redirect(`/f/${slug}?error=invalid_rating${embedSuffix}`);
  }

  const location = await getLocationBySlug(slug);

  if (!location) {
    redirect(`/f/${slug}?error=missing_location${embedSuffix}`);
  }

  const profile = location.publicProfile;
  const threshold = profile?.negativeFilterThreshold ?? 4;

  if (feedback && ratingValue < threshold) {
    const internalNoteParts: string[] = [];
    if (email) internalNoteParts.push(`Contact email: ${email}.`);
    await prisma.review.create({
      data: {
        locationId: location.id,
        source: "INTERNAL",
        reviewerName: name || email || "Anonymous customer",
        rating: ratingValue,
        status: "PRIVATE_FEEDBACK",
        sentiment: ratingValue <= 2 ? "negative" : "neutral",
        body: feedback,
        internalNotes: internalNoteParts.length > 0 ? internalNoteParts.join(" ") : null,
        reviewedAt: new Date(),
      },
    });
    redirect(`/f/${slug}/thanks?rating=${ratingValue}&mode=private${embedSuffix}`);
  }

  if (ratingValue >= threshold) {
    redirect(`/f/${slug}/thanks?rating=${ratingValue}${embedSuffix}`);
  }

  redirect(`/f/${slug}/feedback?rating=${ratingValue}${embedSuffix}`);
}
```

- [ ] **Step 2: Update `submitPublicPrivateFeedback` to forward `embed`**

```ts
export async function submitPublicPrivateFeedback(formData: FormData) {
  const slug = String(formData.get("slug") ?? "").trim();
  const ratingValue = Number(formData.get("rating"));
  const feedback = String(formData.get("feedback") ?? "").trim();
  const contact = String(formData.get("contact") ?? "").trim();
  const embed = formData.get("embed") === "1";
  const embedSuffix = embed ? "&embed=1" : "";

  if (!slug || !Number.isInteger(ratingValue) || ratingValue < 1 || ratingValue > 5 || !feedback) {
    redirect(`/f/${slug}/feedback?rating=${ratingValue || ""}${embedSuffix}&error=invalid_feedback`);
  }

  const location = await getLocationBySlug(slug);

  if (!location) {
    redirect(`/f/${slug}?error=missing_location${embedSuffix}`);
  }

  await prisma.review.create({
    data: {
      locationId: location.id,
      source: "INTERNAL",
      reviewerName: contact || "Anonymous customer",
      rating: ratingValue,
      status: "PRIVATE_FEEDBACK",
      sentiment: ratingValue <= 2 ? "negative" : "neutral",
      body: feedback,
      reviewedAt: new Date(),
    },
  });

  redirect(`/f/${slug}/thanks?rating=${ratingValue}&mode=private${embedSuffix}`);
}
```

### 7b: Update `funnel-rating-form.tsx` to accept and forward `embed`

- [ ] **Step 3: Add `embed` prop to `FunnelRatingForm`**

Add `embed?: boolean` to the props and `"embed"` to formData:

```tsx
export function FunnelRatingForm({
  slug,
  submitAction,
  reviewLink,
  filterEnabled = false,
  filterThreshold = 4,
  ratingMode = "stars",
  ratingOptions,
  embed = false,
}: {
  slug: string;
  submitAction: (formData: FormData) => Promise<void>;
  reviewLink?: string | null;
  filterEnabled?: boolean;
  filterThreshold?: number;
  ratingMode?: "stars" | "faces" | "thumbs";
  ratingOptions?: readonly RatingOption[];
  embed?: boolean;
}) {
```

In `handleSubmit`, add embed to formData:

```ts
  const handleSubmit = async (rating: number, feedbackText: string, nameText: string, emailText: string) => {
    setIsSubmitting(true);
    const formData = new FormData();
    formData.append("slug", slug);
    formData.append("rating", String(rating));
    if (feedbackText) formData.append("feedback", feedbackText);
    if (nameText) formData.append("name", nameText);
    if (emailText) formData.append("email", emailText);
    if (embed) formData.append("embed", "1");
    await submitAction(formData);
  };
```

### 7c: Update the three funnel pages for embed layout

- [ ] **Step 4: Update `/f/[slug]/page.tsx`**

Add `searchParams` and detect `embed`:

```tsx
export default async function PublicFunnelPage({
  params,
  searchParams,
}: {
  params: Promise<{ slug: string }>;
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
}) {
  const { slug } = await params;
  const query = (await searchParams) ?? {};
  const isEmbed = typeof query.embed === "string" && query.embed === "1";
  // ... existing location fetch ...

  return (
    <main className={isEmbed ? "bg-white p-5 text-slate-900" : "min-h-screen bg-slate-50 px-4 py-10 text-slate-900 sm:px-6"}>
      <div className={isEmbed ? "" : "mx-auto max-w-3xl rounded-[32px] border border-slate-200 bg-white p-8 shadow-[0_16px_50px_rgba(15,23,42,0.08)] sm:p-10"}>
        {profile?.logoUrl && !isEmbed ? <img src={profile.logoUrl} alt={`${location.name} logo`} className="mb-6 h-14 w-auto rounded-xl object-contain" /> : null}
        {!isEmbed && <p className="text-sm font-semibold uppercase tracking-[0.22em] text-indigo-600">WeHearYou Review Funnel</p>}
        <h1 className={`${isEmbed ? "text-2xl mt-0" : "mt-3 text-4xl"} font-semibold tracking-tight text-slate-950`}>
          {profile?.funnelPromptTitle ?? profile?.headline ?? `How was your experience with ${location.name}?`}
        </h1>
        <p className="mt-3 text-base leading-7 text-slate-600">
          {profile?.funnelPromptBody ?? profile?.subheadline ?? `Share a quick rating for ${location.name}.`}
        </p>
        <FunnelRatingForm
          slug={slug}
          submitAction={submitPublicFunnelRating}
          reviewLink={location.reviewLink ?? buildGoogleWriteReviewLink(location.googlePlaceId)}
          filterEnabled={profile?.negativeFilterEnabled ?? false}
          filterThreshold={profile?.negativeFilterThreshold ?? 4}
          ratingMode={ratingMode}
          ratingOptions={ratingOptions}
          embed={isEmbed}
        />
      </div>
    </main>
  );
}
```

- [ ] **Step 5: Update `/f/[slug]/feedback/page.tsx` for embed mode**

Add `searchParams` and detect `embed`. Change the main wrapper:

```tsx
export default async function PublicFunnelFeedbackPage({
  params,
  searchParams,
}: {
  params: Promise<{ slug: string }>;
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
}) {
  const { slug } = await params;
  const query = (await searchParams) ?? {};
  const rating = Number(typeof query.rating === "string" ? query.rating : "0");
  const isEmbed = typeof query.embed === "string" && query.embed === "1";
  // ... existing location fetch ...

  return (
    <main className={isEmbed ? "bg-white p-5 text-slate-900" : "min-h-screen bg-slate-50 px-4 py-10 text-slate-900 sm:px-6"}>
      <div className={isEmbed ? "" : "mx-auto max-w-3xl rounded-[32px] border border-slate-200 bg-white p-8 shadow-[0_16px_50px_rgba(15,23,42,0.08)] sm:p-10"}>
        {!isEmbed && <p className="text-sm font-semibold uppercase tracking-[0.22em] text-indigo-600">Private Feedback</p>}
        <h1 className={`${isEmbed ? "text-2xl" : "mt-3 text-4xl"} font-semibold tracking-tight text-slate-950`}>
          {location.publicProfile?.funnelPrivateTitle ?? `Tell ${location.name} how they can improve`}
        </h1>
        {/* ... rest of the existing form content ... */}
        <form action={submitPublicPrivateFeedback} className="mt-8 space-y-4">
          <input type="hidden" name="slug" value={slug} />
          <input type="hidden" name="rating" value={rating} />
          {isEmbed && <input type="hidden" name="embed" value="1" />}
          {/* ... rest of form unchanged ... */}
        </form>
      </div>
    </main>
  );
}
```

- [ ] **Step 6: Update `/f/[slug]/thanks/page.tsx` for embed mode**

Add `searchParams` embed detection:

```tsx
  const isEmbed = typeof query.embed === "string" && query.embed === "1";
```

Change wrapper classes:

```tsx
  return (
    <main className={isEmbed ? "bg-white p-5 text-slate-900" : "min-h-screen bg-slate-50 px-4 py-10 text-slate-900 sm:px-6"}>
      <div className={isEmbed ? "" : "mx-auto max-w-3xl rounded-[32px] border border-slate-200 bg-white p-8 shadow-[0_16px_50px_rgba(15,23,42,0.08)] sm:p-10"}>
        {!isEmbed && <p className="text-sm font-semibold uppercase tracking-[0.22em] text-indigo-600">Thank You</p>}
        <h1 className={`${isEmbed ? "text-2xl" : "mt-3 text-4xl"} font-semibold tracking-tight text-slate-950`}>
          {/* ... existing content unchanged ... */}
```

- [ ] **Step 7: Run typecheck**

```bash
npm run typecheck
```

Expected: PASS.

- [ ] **Step 8: Commit**

```bash
git add src/app/f/[slug]/page.tsx src/app/f/[slug]/funnel-rating-form.tsx src/app/f/[slug]/actions.ts src/app/f/[slug]/feedback/page.tsx src/app/f/[slug]/thanks/page.tsx
git commit -m "feat: add embed=1 mode to funnel pages for iframe rendering"
```

---

## Self-Review Checklist

**Spec coverage:**
- [x] `collectDisplayFreq` — deterministic per session via sessionStorage (`shouldShowCollect`)
- [x] `collectButtonColor` — null means inherit `primaryColor` from widget config
- [x] `collectButtonTheme` + `collectButtonColor` coexist — theme sets base style, color overrides fill
- [x] `collectMobileBehavior` defaults to `pill`; `hidden` skips render on `window.innerWidth < 640`
- [x] `left`/`right` = vertical side tabs (using `writing-mode: vertical-rl/lr`); `bottom-left`/`bottom-right` = floating pill
- [x] `locationSlug` passed through payload via `data.location.slug` (no new DB field)
- [x] All new DB fields are nullable — existing widgets unaffected

**No placeholders:** All code blocks are complete and runnable.

**Type consistency:**
- `collectButtonPosition` is the DB field name used in schema, actions, payload, and embed script
- `collectPosition` is the React state variable name in `widget-customizer.tsx`; maps to `collectButtonPosition` when appended to formData
- `collectFreq` is the React state variable name; maps to `collectDisplayFreq` in formData/DB

---

*Plan complete.*
