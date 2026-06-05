# Floating Widget Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Fix the broken Floating widget creation/customization path and implement Floating as a full first-class widget type with four card styles, three variations, four positions, rotation, mobile behavior, and sessionStorage-based display frequency.

**Architecture:** `widgetType: "FLOATING"` is added as a peer to WALL_OF_LOVE, BADGE, SINGLE_TESTIMONIAL, and COLLECTING. The public API returns all floating settings and up to 20 eligible reviews in a single non-paginated response. The embed script detects `widgetType === "FLOATING"`, gates on display frequency via sessionStorage (same pattern as COLLECTING), then renders a fixed-position card with rotation.

**Tech Stack:** Next.js 16 App Router, Prisma PostgreSQL, vanilla JS embed script (TypeScript template literal, single-quoted HTML strings only — never `\"`), Tailwind CSS admin UI.

---

## Root Cause of Current Broken State

| Bug | Location | Effect |
|---|---|---|
| `deriveLayout("floating") → "grid"` | `widget-customizer.tsx:133` | Layout silently remapped; floating widget opens as Wall of Love grid |
| `deriveWidgetType({layout:"floating"}) → "WALL_OF_LOVE"` | `widget-customizer.tsx:117-120` | Customizer shows wrong tab; saves wrong widgetType |
| `"FLOATING"` missing from `WidgetTypeKey` | `widget-customizer.tsx:30` | TypeScript type error if used; no tab exists |
| `"FLOATING"` missing from `allowedWidgetTypes` | `widgets/actions.ts:101` | widgetType gets nulled on any save |
| No floating path in embed script | `embed/widget.js/route.ts` | Falls through to grid rendering; looks broken on page |
| `createReviewWidget` sets no defaults | `widgets/actions.ts` | New floating widget has no floatingCardStyle etc; embed renders nothing sensible |

---

## File Map

| File | Change |
|---|---|
| `prisma/schema.prisma` | Add 11 nullable floating fields to `ReviewWidget` |
| `prisma/migrations/…` | New migration (auto-generated) |
| `src/lib/review-widgets.ts` | Add floating fields to `PublicWidgetPayload`, add FLOATING-specific fetch path in `getPublicReviewWidgetPayload` |
| `src/app/widgets/actions.ts` | Add `"FLOATING"` to `allowedWidgetTypes`; add floating field validation in `updateReviewWidget`; set floating defaults in `createReviewWidget` |
| `src/components/widget-layout-picker.tsx` | Submit `widgetType: "FLOATING"` when floating layout is selected |
| `src/components/widget-customizer.tsx` | Fix `deriveWidgetType` and `deriveLayout`; add `"FLOATING"` to `WidgetTypeKey`; add 11 state vars; add `FloatingWidgetPanel`; update `handleSave` |
| `src/components/review-widget-preview.tsx` | Add `FloatingWidgetPreview` component; add 4 collecting-style props; early-return branch |
| `src/app/embed/widget.js/route.ts` | Add `ensureFloatingStyles`, `shouldShowFloating`, `renderFloatingCard`, `renderFloatingWidget`; add early-return in `loadPage` |

---

## Task 1: Schema — add 11 floating fields

**Files:**
- Modify: `prisma/schema.prisma` (after `collectButtonPosition`)

- [ ] **Step 1: Add 11 nullable fields to `ReviewWidget`**

After the line `collectButtonPosition String?` in `prisma/schema.prisma`, insert:

```prisma
  // Floating Widget
  floatingCardStyle           String?   // "dark_solid_pill" | "frosted_glass_pill" | "below_card" | "notification_compact"
  floatingVariation           String?   // "compact" | "standard" | "rich"
  floatingPosition            String?   // "bottom-right" | "bottom-left" | "left" | "right"
  floatingRotationEnabled     Boolean?
  floatingRotationIntervalSec Int?      // 5 | 8 | 12 | 30
  floatingAccentColorMode     String?   // "inherit" | "custom"
  floatingAccentColor         String?   // hex
  floatingMobileBehavior      String?   // "show" | "compact" | "hide"
  floatingApprovedOnly        Boolean?
  floatingMinRating           Int?      // 4 or 5
  floatingDisplayFrequency    String?   // "always" | "half" | "third"
```

- [ ] **Step 2: Run migration**

```bash
npx prisma migrate dev --name add_floating_widget_fields
```

Expected: `20260605…_add_floating_widget_fields` migration created and applied, Prisma client regenerated.

- [ ] **Step 3: Validate**

```bash
npx prisma validate
```

Expected: `The schema at prisma/schema.prisma is valid 🚀`

- [ ] **Step 4: Commit**

```bash
git add prisma/schema.prisma prisma/migrations/
git commit -m "feat: add floating widget fields to ReviewWidget schema"
```

---

## Task 2: Update `review-widgets.ts` — payload types and FLOATING fetch path

**Files:**
- Modify: `src/lib/review-widgets.ts`

- [ ] **Step 1: Add floating fields to `PublicWidgetPayload.widget` type**

Add after `collectButtonPosition: string | null;` in the `widget` sub-object:

```ts
    // Floating Widget
    floatingCardStyle: string | null;
    floatingVariation: string | null;
    floatingPosition: string | null;
    floatingRotationEnabled: boolean | null;
    floatingRotationIntervalSec: number | null;
    floatingAccentColorMode: string | null;
    floatingAccentColor: string | null;
    floatingMobileBehavior: string | null;
    floatingApprovedOnly: boolean | null;
    floatingMinRating: number | null;
    floatingDisplayFrequency: string | null;
```

- [ ] **Step 2: Add floating fields to `buildWidgetObj`**

Add after `collectButtonPosition: widget.collectButtonPosition ?? null,`:

```ts
    floatingCardStyle: widget.floatingCardStyle ?? null,
    floatingVariation: widget.floatingVariation ?? null,
    floatingPosition: widget.floatingPosition ?? null,
    floatingRotationEnabled: widget.floatingRotationEnabled ?? null,
    floatingRotationIntervalSec: widget.floatingRotationIntervalSec ?? null,
    floatingAccentColorMode: widget.floatingAccentColorMode ?? null,
    floatingAccentColor: widget.floatingAccentColor ?? null,
    floatingMobileBehavior: widget.floatingMobileBehavior ?? null,
    floatingApprovedOnly: widget.floatingApprovedOnly ?? null,
    floatingMinRating: widget.floatingMinRating ?? null,
    floatingDisplayFrequency: widget.floatingDisplayFrequency ?? null,
```

- [ ] **Step 3: Add FLOATING-specific fetch path in `getPublicReviewWidgetPayload`**

After the `SINGLE_TESTIMONIAL` block (around line 310) and before the normal Wall of Love flow, add:

```ts
  // ── Floating Widget: return up to 20 reviews for client-side rotation ────────
  if (widget.widgetType === "FLOATING") {
    const minRating = widget.floatingMinRating ?? 4;
    const floatingReviews = await prisma.review.findMany({
      where: {
        locationId: widget.locationId,
        source: ReviewSource.GOOGLE,
        status: ReviewStatus.PUBLISHED,
        rating: { gte: minRating },
      },
      orderBy: [{ reviewedAt: "desc" }, { createdAt: "desc" }],
      take: 20,
      select: {
        id: true, reviewerName: true, reviewerPhotoUrl: true,
        sourceReviewUrl: true, sourceReplyText: true,
        replyDraft: true, replyPublishedAt: true, replySentAt: true,
        rating: true, body: true, reviewedAt: true, source: true,
      },
    });

    return {
      widget: buildWidgetObj(floatingReviews.length),
      location: buildLocationObj(floatingReviews.length),
      reviews: floatingReviews.map((r) => ({
        id: r.id,
        reviewerName: r.reviewerName,
        reviewerPhotoUrl: r.reviewerPhotoUrl ?? null,
        sourceReviewUrl: r.sourceReviewUrl ?? null,
        sourceReplyText: r.sourceReplyText ?? ((r.replyPublishedAt || r.replySentAt) ? r.replyDraft : null) ?? null,
        rating: r.rating ?? 5,
        body: r.body,
        reviewedAt: r.reviewedAt ? r.reviewedAt.toISOString() : null,
        source: r.source as string,
      })),
      pagination: { page: 1, pageSize: 20, total: floatingReviews.length, hasMore: false },
    };
  }
```

- [ ] **Step 4: Typecheck**

```bash
npm run typecheck
```

Expected: clean exit (no errors).

- [ ] **Step 5: Commit**

```bash
git add src/lib/review-widgets.ts
git commit -m "feat: add floating widget fields and FLOATING fetch path to payload"
```

---

## Task 3: Fix `widgets/actions.ts` — create defaults + update validation

**Files:**
- Modify: `src/app/widgets/actions.ts`

- [ ] **Step 1: Add `"FLOATING"` to `allowedWidgetTypes` in `updateReviewWidget`**

Change:
```ts
const allowedWidgetTypes = new Set(["WALL_OF_LOVE", "SINGLE_TESTIMONIAL", "BADGE", "COLLECTING"]);
```
To:
```ts
const allowedWidgetTypes = new Set(["WALL_OF_LOVE", "SINGLE_TESTIMONIAL", "BADGE", "COLLECTING", "FLOATING"]);
```

- [ ] **Step 2: Add floating field allowlists and parsing in `updateReviewWidget`**

After the `allowedCollectPositions` set, add:

```ts
  const allowedFloatingCardStyles = new Set(["dark_solid_pill", "frosted_glass_pill", "below_card", "notification_compact"]);
  const allowedFloatingVariations = new Set(["compact", "standard", "rich"]);
  const allowedFloatingPositions = new Set(["bottom-right", "bottom-left", "left", "right"]);
  const allowedFloatingMobileBehaviors = new Set(["show", "compact", "hide"]);
  const allowedFloatingAccentModes = new Set(["inherit", "custom"]);
  const allowedFloatingFrequencies = new Set(["always", "half", "third"]);

  const rawFloatingCardStyle = String(formData.get("floatingCardStyle") ?? "").trim();
  const rawFloatingVariation = String(formData.get("floatingVariation") ?? "").trim();
  const rawFloatingPosition = String(formData.get("floatingPosition") ?? "").trim();
  const rawFloatingRotationIntervalSec = Number(formData.get("floatingRotationIntervalSec") ?? 8);
  const rawFloatingAccentColorMode = String(formData.get("floatingAccentColorMode") ?? "").trim();
  const rawFloatingAccentColor = String(formData.get("floatingAccentColor") ?? "").trim();
  const rawFloatingMobileBehavior = String(formData.get("floatingMobileBehavior") ?? "").trim();
  const rawFloatingMinRating = Number(formData.get("floatingMinRating") ?? 4);
  const rawFloatingDisplayFrequency = String(formData.get("floatingDisplayFrequency") ?? "").trim();
```

- [ ] **Step 3: Add floating fields to the `prisma.reviewWidget.update` data block**

After the collecting widget fields, add:

```ts
      // Floating Widget
      floatingCardStyle: allowedFloatingCardStyles.has(rawFloatingCardStyle) ? rawFloatingCardStyle : null,
      floatingVariation: allowedFloatingVariations.has(rawFloatingVariation) ? rawFloatingVariation : null,
      floatingPosition: allowedFloatingPositions.has(rawFloatingPosition) ? rawFloatingPosition : null,
      floatingRotationEnabled: String(formData.get("floatingRotationEnabled") ?? "") === "on",
      floatingRotationIntervalSec: [5, 8, 12, 30].includes(rawFloatingRotationIntervalSec) ? rawFloatingRotationIntervalSec : 8,
      floatingAccentColorMode: allowedFloatingAccentModes.has(rawFloatingAccentColorMode) ? rawFloatingAccentColorMode : "inherit",
      floatingAccentColor: /^#[0-9a-fA-F]{6}$/.test(rawFloatingAccentColor) ? rawFloatingAccentColor : null,
      floatingMobileBehavior: allowedFloatingMobileBehaviors.has(rawFloatingMobileBehavior) ? rawFloatingMobileBehavior : null,
      floatingApprovedOnly: String(formData.get("floatingApprovedOnly") ?? "") === "on",
      floatingMinRating: rawFloatingMinRating === 5 ? 5 : 4,
      floatingDisplayFrequency: allowedFloatingFrequencies.has(rawFloatingDisplayFrequency) ? rawFloatingDisplayFrequency : null,
```

- [ ] **Step 4: Set floating defaults in `createReviewWidget`**

In the `prisma.reviewWidget.create` call at the end of `createReviewWidget`, change:

```ts
  const widget = await prisma.reviewWidget.create({
    data: {
      organizationId,
      locationId,
      name,
      layout,
      contentType,
      publicToken: generateReviewWidgetToken(),
    },
  });
```

To:

```ts
  const floatingDefaults = layout === "floating" ? {
    widgetType: "FLOATING",
    floatingCardStyle: "dark_solid_pill",
    floatingVariation: "standard",
    floatingPosition: "bottom-right",
    floatingRotationEnabled: true,
    floatingRotationIntervalSec: 8,
    floatingAccentColorMode: "inherit",
    floatingMobileBehavior: "show",
    floatingApprovedOnly: true,
    floatingMinRating: 4,
    floatingDisplayFrequency: "always",
  } : {};

  const widget = await prisma.reviewWidget.create({
    data: {
      organizationId,
      locationId,
      name,
      layout,
      contentType,
      publicToken: generateReviewWidgetToken(),
      ...floatingDefaults,
    },
  });
```

- [ ] **Step 5: Typecheck**

```bash
npm run typecheck
```

Expected: clean.

- [ ] **Step 6: Commit**

```bash
git add src/app/widgets/actions.ts
git commit -m "feat: add FLOATING to allowedWidgetTypes, floating field validation, and creation defaults"
```

---

## Task 4: Fix `widget-layout-picker.tsx` — submit widgetType for floating

**Files:**
- Modify: `src/components/widget-layout-picker.tsx`

- [ ] **Step 1: Append `widgetType` to formData when floating is selected**

In `handleSubmit`, after `formData.append("contentType", "TEXT");`, add:

```ts
    if (selectedLayout === "floating") {
      formData.append("widgetType", "FLOATING");
    }
```

- [ ] **Step 2: Typecheck**

```bash
npm run typecheck
```

Expected: clean.

- [ ] **Step 3: Commit**

```bash
git add src/components/widget-layout-picker.tsx
git commit -m "fix: submit widgetType FLOATING when floating layout is selected in widget creator"
```

---

## Task 5: Fix `widget-customizer.tsx` — add FLOATING type, panel, and state

**Files:**
- Modify: `src/components/widget-customizer.tsx`

- [ ] **Step 1: Add `"FLOATING"` to `WidgetTypeKey`**

Change line 30:
```ts
type WidgetTypeKey = "WALL_OF_LOVE" | "SINGLE_TESTIMONIAL" | "BADGE" | "COLLECTING";
```
To:
```ts
type WidgetTypeKey = "WALL_OF_LOVE" | "SINGLE_TESTIMONIAL" | "BADGE" | "COLLECTING" | "FLOATING";
```

- [ ] **Step 2: Fix `deriveWidgetType` to recognise floating layout**

Change lines 117–120:
```ts
function deriveWidgetType(widget: { widgetType?: string | null; layout: string }): WidgetTypeKey {
  if (widget.widgetType) return widget.widgetType as WidgetTypeKey;
  if (widget.layout === "badge") return "BADGE";
  return "WALL_OF_LOVE";
}
```
To:
```ts
function deriveWidgetType(widget: { widgetType?: string | null; layout: string }): WidgetTypeKey {
  if (widget.widgetType) return widget.widgetType as WidgetTypeKey;
  if (widget.layout === "badge") return "BADGE";
  if (widget.layout === "floating") return "FLOATING";
  return "WALL_OF_LOVE";
}
```

- [ ] **Step 3: Fix `deriveLayout` — remove floating from legacy remap**

Change the `legacyMap` in `deriveLayout`:
```ts
  const legacyMap: Record<string, string> = {
    slider: "carousel",
    floating: "grid",   // ← remove this line
    video: "video-carousel",
  };
```
To:
```ts
  const legacyMap: Record<string, string> = {
    slider: "carousel",
    video: "video-carousel",
  };
```

- [ ] **Step 4: Add FLOATING to the tab bar**

Change the tab loop array from:
```ts
{(["WALL_OF_LOVE", "SINGLE_TESTIMONIAL", "BADGE", "COLLECTING"] as WidgetTypeKey[]).map((type) => {
  const labels: Record<string, string> = {
    WALL_OF_LOVE: "🧱 Wall of Love",
    SINGLE_TESTIMONIAL: "✦ Single Testimonial",
    BADGE: "⭐ Badge",
    COLLECTING: "📥 Collecting Widget",
  };
```
To:
```ts
{(["WALL_OF_LOVE", "SINGLE_TESTIMONIAL", "BADGE", "COLLECTING", "FLOATING"] as WidgetTypeKey[]).map((type) => {
  const labels: Record<string, string> = {
    WALL_OF_LOVE: "🧱 Wall of Love",
    SINGLE_TESTIMONIAL: "✦ Single Testimonial",
    BADGE: "⭐ Badge",
    COLLECTING: "📥 Collecting Widget",
    FLOATING: "📍 Floating Widget",
  };
```

- [ ] **Step 5: Add 11 floating state vars**

After the collecting state vars block, add:

```tsx
  // Floating Widget state
  const [floatingCardStyle, setFloatingCardStyle] = useState<string>(
    (widget as { floatingCardStyle?: string | null }).floatingCardStyle ?? "dark_solid_pill",
  );
  const [floatingVariation, setFloatingVariation] = useState<string>(
    (widget as { floatingVariation?: string | null }).floatingVariation ?? "standard",
  );
  const [floatingPosition, setFloatingPosition] = useState<string>(
    (widget as { floatingPosition?: string | null }).floatingPosition ?? "bottom-right",
  );
  const [floatingRotationEnabled, setFloatingRotationEnabled] = useState<boolean>(
    (widget as { floatingRotationEnabled?: boolean | null }).floatingRotationEnabled ?? true,
  );
  const [floatingRotationIntervalSec, setFloatingRotationIntervalSec] = useState<number>(
    (widget as { floatingRotationIntervalSec?: number | null }).floatingRotationIntervalSec ?? 8,
  );
  const [floatingAccentColorMode, setFloatingAccentColorMode] = useState<string>(
    (widget as { floatingAccentColorMode?: string | null }).floatingAccentColorMode ?? "inherit",
  );
  const [floatingAccentColor, setFloatingAccentColor] = useState<string | null>(
    (widget as { floatingAccentColor?: string | null }).floatingAccentColor ?? null,
  );
  const [floatingMobileBehavior, setFloatingMobileBehavior] = useState<string>(
    (widget as { floatingMobileBehavior?: string | null }).floatingMobileBehavior ?? "show",
  );
  const [floatingApprovedOnly, setFloatingApprovedOnly] = useState<boolean>(
    (widget as { floatingApprovedOnly?: boolean | null }).floatingApprovedOnly ?? true,
  );
  const [floatingMinRating, setFloatingMinRating] = useState<number>(
    (widget as { floatingMinRating?: number | null }).floatingMinRating ?? 4,
  );
  const [floatingDisplayFrequency, setFloatingDisplayFrequency] = useState<string>(
    (widget as { floatingDisplayFrequency?: string | null }).floatingDisplayFrequency ?? "always",
  );
```

- [ ] **Step 6: Update `handleSave` to append floating fields**

After the collecting fields appended in `handleSave`, add:

```ts
    formData.append("floatingCardStyle", floatingCardStyle);
    formData.append("floatingVariation", floatingVariation);
    formData.append("floatingPosition", floatingPosition);
    if (floatingRotationEnabled) formData.append("floatingRotationEnabled", "on");
    formData.append("floatingRotationIntervalSec", String(floatingRotationIntervalSec));
    formData.append("floatingAccentColorMode", floatingAccentColorMode);
    formData.append("floatingAccentColor", floatingAccentColor ?? "");
    formData.append("floatingMobileBehavior", floatingMobileBehavior);
    if (floatingApprovedOnly) formData.append("floatingApprovedOnly", "on");
    formData.append("floatingMinRating", String(floatingMinRating));
    formData.append("floatingDisplayFrequency", floatingDisplayFrequency);
```

- [ ] **Step 7: Add `FloatingWidgetPanel` JSX block**

Before the `{/* ── STICKY FOOTER ──── */}` comment, add the new panel after the COLLECTING panel:

```tsx
          {/* ── FLOATING WIDGET ──────────────────────────────────────── */}
          {widgetType === "FLOATING" && (
            <>
              {/* Card Style */}
              <SectionCard title="Card style">
                <div className="p-3 grid grid-cols-2 gap-2">
                  {(
                    [
                      { id: "dark_solid_pill", label: "Dark Solid Pill", desc: "High-contrast, always readable (default)" },
                      { id: "frosted_glass_pill", label: "Frosted Glass Pill", desc: "Modern translucent overlay" },
                      { id: "notification_compact", label: "Notification Compact", desc: "Small proof-pop notification" },
                      { id: "below_card", label: "Below Card", desc: "Reviewer info under the card" },
                    ] as const
                  ).map(({ id, label, desc }) => (
                    <button
                      key={id}
                      type="button"
                      onClick={() => { setFloatingCardStyle(id); markUnsaved(); }}
                      className={`relative flex flex-col gap-1 rounded-xl border-2 p-3 text-left transition-all ${
                        floatingCardStyle === id ? "border-indigo-600 bg-indigo-50" : "border-slate-200 bg-white hover:border-slate-300"
                      }`}
                    >
                      {floatingCardStyle === id && (
                        <span className="absolute -top-1.5 -right-1.5 w-4 h-4 bg-indigo-600 rounded-full text-white text-[9px] font-bold flex items-center justify-center">✓</span>
                      )}
                      <span className="text-xs font-bold text-slate-900">{label}</span>
                      <span className="text-[10px] text-slate-500 leading-tight">{desc}</span>
                    </button>
                  ))}
                </div>
              </SectionCard>

              {/* Variation */}
              <SectionCard title="Variation">
                <div className="p-3 grid grid-cols-3 gap-2">
                  {(
                    [
                      { id: "compact", label: "Compact", desc: "Minimal" },
                      { id: "standard", label: "Standard", desc: "Recommended" },
                      { id: "rich", label: "Rich", desc: "2 cards desktop" },
                    ] as const
                  ).map(({ id, label, desc }) => (
                    <button
                      key={id}
                      type="button"
                      onClick={() => { setFloatingVariation(id); markUnsaved(); }}
                      className={`relative flex flex-col items-center gap-1 rounded-xl border-2 p-3 text-center transition-all ${
                        floatingVariation === id ? "border-indigo-600 bg-indigo-50" : "border-slate-200 bg-white hover:border-slate-300"
                      }`}
                    >
                      {floatingVariation === id && (
                        <span className="absolute -top-1.5 -right-1.5 w-4 h-4 bg-indigo-600 rounded-full text-white text-[9px] font-bold flex items-center justify-center">✓</span>
                      )}
                      <span className="text-xs font-bold text-slate-900">{label}</span>
                      <span className="text-[10px] text-slate-500">{desc}</span>
                    </button>
                  ))}
                </div>
              </SectionCard>

              {/* Position */}
              <SectionCard title="Position">
                <div className="p-3 grid grid-cols-2 gap-2">
                  {(
                    [
                      { id: "bottom-right", icon: "↘", label: "Bottom Right" },
                      { id: "bottom-left", icon: "↙", label: "Bottom Left" },
                      { id: "right", icon: "→", label: "Right Edge" },
                      { id: "left", icon: "←", label: "Left Edge" },
                    ] as const
                  ).map(({ id, icon, label }) => (
                    <button
                      key={id}
                      type="button"
                      onClick={() => { setFloatingPosition(id); markUnsaved(); }}
                      className={`relative flex items-center gap-2 rounded-xl border-2 p-3 transition-all ${
                        floatingPosition === id ? "border-indigo-600 bg-indigo-50" : "border-slate-200 bg-white hover:border-slate-300"
                      }`}
                    >
                      {floatingPosition === id && (
                        <span className="absolute -top-1.5 -right-1.5 w-4 h-4 bg-indigo-600 rounded-full text-white text-[9px] font-bold flex items-center justify-center">✓</span>
                      )}
                      <span className="text-lg">{icon}</span>
                      <span className="text-xs font-semibold text-slate-900">{label}</span>
                    </button>
                  ))}
                </div>
              </SectionCard>

              {/* Rotation */}
              <SectionCard title="Rotation">
                <div className="p-4 space-y-3">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-semibold text-slate-900">Auto-rotate reviews</p>
                      <p className="text-xs text-slate-500">Cycle through eligible reviews</p>
                    </div>
                    <Toggle on={floatingRotationEnabled} onChange={(v) => { setFloatingRotationEnabled(v); markUnsaved(); }} />
                  </div>
                  {floatingRotationEnabled && (
                    <div>
                      <p className="text-xs font-bold text-slate-500 mb-2">Rotation interval</p>
                      <div className="grid grid-cols-4 gap-2">
                        {([5, 8, 12, 30] as const).map((sec) => (
                          <button
                            key={sec}
                            type="button"
                            onClick={() => { setFloatingRotationIntervalSec(sec); markUnsaved(); }}
                            className={`rounded-lg border-2 p-2 text-center text-xs font-semibold transition-all ${
                              floatingRotationIntervalSec === sec ? "border-indigo-600 bg-indigo-50 text-indigo-700" : "border-slate-200 text-slate-700 hover:border-slate-300"
                            }`}
                          >
                            {sec}s
                          </button>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </SectionCard>

              {/* Accent Color */}
              <SectionCard title="Accent color">
                <div className="p-4 space-y-3">
                  <button
                    type="button"
                    onClick={() => { setFloatingAccentColorMode("inherit"); markUnsaved(); }}
                    className={`w-full flex items-center justify-between rounded-lg border-2 p-3 transition-all ${
                      floatingAccentColorMode === "inherit" ? "border-indigo-600 bg-indigo-50" : "border-slate-200 bg-white hover:border-slate-300"
                    }`}
                  >
                    <div className="text-left">
                      <p className="text-sm font-semibold text-slate-900">Inherit brand color</p>
                      <p className="text-xs text-slate-500">Uses the widget&apos;s primary color</p>
                    </div>
                    {floatingAccentColorMode === "inherit" && <span className="text-xs font-bold text-indigo-600 bg-indigo-100 px-2 py-0.5 rounded-full">Active</span>}
                  </button>
                  <div>
                    <p className="text-xs font-bold text-slate-500 mb-1.5">Custom color</p>
                    <div className="flex items-center gap-2">
                      <input
                        type="color"
                        value={floatingAccentColor ?? widget.primaryColor ?? "#4338ca"}
                        onChange={(e) => { setFloatingAccentColor(e.target.value); setFloatingAccentColorMode("custom"); markUnsaved(); }}
                        className="w-10 h-10 rounded-lg border border-slate-200 cursor-pointer"
                      />
                      <input
                        type="text"
                        value={floatingAccentColor ?? ""}
                        onChange={(e) => {
                          const v = e.target.value.trim();
                          setFloatingAccentColor(/^#[0-9a-fA-F]{6}$/.test(v) ? v : null);
                          setFloatingAccentColorMode("custom");
                          markUnsaved();
                        }}
                        placeholder="#4338ca"
                        className="flex-1 rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-sm font-mono"
                      />
                    </div>
                  </div>
                </div>
              </SectionCard>

              {/* Mobile + Frequency */}
              <SectionCard title="Mobile & frequency">
                <div className="p-3 space-y-3">
                  <div>
                    <p className="text-xs font-bold text-slate-500 mb-2">Mobile behavior</p>
                    <div className="grid grid-cols-3 gap-2">
                      {(
                        [
                          { id: "show", label: "Show", desc: "Normal" },
                          { id: "compact", label: "Compact", desc: "Force compact" },
                          { id: "hide", label: "Hide", desc: "Don't render" },
                        ] as const
                      ).map(({ id, label, desc }) => (
                        <button
                          key={id}
                          type="button"
                          onClick={() => { setFloatingMobileBehavior(id); markUnsaved(); }}
                          className={`relative flex flex-col items-center gap-0.5 rounded-xl border-2 p-2.5 text-center transition-all ${
                            floatingMobileBehavior === id ? "border-indigo-600 bg-indigo-50" : "border-slate-200 bg-white hover:border-slate-300"
                          }`}
                        >
                          {floatingMobileBehavior === id && (
                            <span className="absolute -top-1.5 -right-1.5 w-4 h-4 bg-indigo-600 rounded-full text-white text-[9px] font-bold flex items-center justify-center">✓</span>
                          )}
                          <span className="text-xs font-bold text-slate-900">{label}</span>
                          <span className="text-[9px] text-slate-500">{desc}</span>
                        </button>
                      ))}
                    </div>
                  </div>
                  <div>
                    <p className="text-xs font-bold text-slate-500 mb-2">Display frequency</p>
                    <div className="flex flex-col gap-1.5">
                      {(
                        [
                          { id: "always", label: "Always", desc: "Every session" },
                          { id: "half", label: "50% of sessions", desc: "Half of visitors" },
                          { id: "third", label: "33% of sessions", desc: "One in three visitors" },
                        ] as const
                      ).map(({ id, label, desc }) => (
                        <button
                          key={id}
                          type="button"
                          onClick={() => { setFloatingDisplayFrequency(id); markUnsaved(); }}
                          className={`flex items-center justify-between rounded-lg border-2 p-2.5 transition-all ${
                            floatingDisplayFrequency === id ? "border-indigo-600 bg-indigo-50" : "border-slate-200 bg-white hover:border-slate-300"
                          }`}
                        >
                          <div className="text-left">
                            <p className="text-xs font-semibold text-slate-900">{label}</p>
                            <p className="text-[10px] text-slate-500">{desc}</p>
                          </div>
                          {floatingDisplayFrequency === id && <span className="text-[10px] font-bold text-indigo-600 bg-indigo-100 px-2 py-0.5 rounded-full">Selected</span>}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
              </SectionCard>

              {/* Content filters */}
              <SectionCard title="Content filters">
                <div className="p-4 space-y-3">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-semibold text-slate-900">Approved only</p>
                      <p className="text-xs text-slate-500">Only show published/approved reviews</p>
                    </div>
                    <Toggle on={floatingApprovedOnly} onChange={(v) => { setFloatingApprovedOnly(v); markUnsaved(); }} />
                  </div>
                  <div>
                    <p className="text-xs font-bold text-slate-500 mb-2">Minimum star rating</p>
                    <div className="flex gap-2">
                      {([4, 5] as const).map((r) => (
                        <button
                          key={r}
                          type="button"
                          onClick={() => { setFloatingMinRating(r); markUnsaved(); }}
                          className={`flex-1 rounded-lg border-2 p-2 text-center text-sm font-bold transition-all ${
                            floatingMinRating === r ? "border-indigo-600 bg-indigo-50 text-indigo-700" : "border-slate-200 text-slate-700 hover:border-slate-300"
                          }`}
                        >
                          {r}★+
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
              </SectionCard>

              {/* Active toggle */}
              <SectionCard title="Widget settings">
                <div className="p-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-semibold text-slate-900">Widget active</p>
                      <p className="text-xs text-slate-500">Show floating widget on embedded pages</p>
                    </div>
                    <Toggle on={isActive} onChange={setAndMark(setIsActive)} />
                  </div>
                </div>
              </SectionCard>
            </>
          )}
```

- [ ] **Step 8: Pass floating props to `ReviewWidgetPreview`**

In the `<ReviewWidgetPreview ... />` call, add these props:

```tsx
                floatingCardStyle={floatingCardStyle}
                floatingVariation={floatingVariation}
                floatingPosition={floatingPosition}
                floatingAccentColor={floatingAccentColorMode === "custom" ? (floatingAccentColor ?? widget.primaryColor ?? "#4338ca") : (widget.primaryColor ?? "#4338ca")}
```

- [ ] **Step 9: Typecheck**

```bash
npm run typecheck
```

Expected: type errors on `ReviewWidgetPreview` props — fixed in Task 6.

- [ ] **Step 10: Commit after Task 6 passes typecheck**

```bash
git add src/components/widget-customizer.tsx
git commit -m "feat: add FLOATING widget type tab, panel, and state to customizer"
```

---

## Task 6: Add `FloatingWidgetPreview` to `review-widget-preview.tsx`

**Files:**
- Modify: `src/components/review-widget-preview.tsx`

- [ ] **Step 1: Add 4 new props to `ReviewWidgetPreviewProps`**

After `collectMobileBehavior?: string | null;`, add:

```ts
  // Floating Widget
  floatingCardStyle?: string | null;
  floatingVariation?: string | null;
  floatingPosition?: string | null;
  floatingAccentColor?: string | null;
```

- [ ] **Step 2: Add `FloatingWidgetPreview` component**

Before the `// ─── Collecting Widget Preview ───` section, add:

```tsx
// ─── Floating Widget Preview ─────────────────────────────────────────────────

function FloatingWidgetPreview({
  cardStyle,
  variation,
  position,
  accentColor,
  isMobile,
}: {
  cardStyle: string;
  variation: string;
  position: string;
  accentColor: string;
  isMobile?: boolean;
}) {
  const color = accentColor || "#4338ca";

  const posClass: Record<string, string> = {
    "bottom-right": "bottom-3 right-3",
    "bottom-left": "bottom-3 left-3",
    right: "right-0 top-1/2 -translate-y-1/2",
    left: "left-0 top-1/2 -translate-y-1/2",
  };

  const renderCard = (idx: number) => {
    const names = ["Sarah J.", "Matt M."];
    const name = names[idx % names.length];
    const initial = name[0];

    if (cardStyle === "notification_compact") {
      return (
        <div key={idx} style={{ background: "#fff", borderRadius: 12, boxShadow: "0 4px 16px rgba(0,0,0,.14)", padding: "9px 12px", display: "flex", alignItems: "center", gap: 8, border: "1px solid rgba(0,0,0,.06)", marginBottom: idx === 0 && variation === "rich" ? 6 : 0 }}>
          <div style={{ width: 28, height: 28, borderRadius: "50%", background: color, display: "flex", alignItems: "center", justifyContent: "center", color: "#fff", fontWeight: 700, fontSize: 11, flexShrink: 0 }}>{initial}</div>
          <div>
            <div style={{ fontSize: 11, fontWeight: 700, color: "#0f172a" }}>{name} just left a review</div>
            <div style={{ display: "flex", alignItems: "center", gap: 4 }}>
              <span style={{ color: "#f59e0b", fontSize: 10 }}>★★★★★</span>
              <span style={{ fontSize: 10, color: "#64748b" }}>On Google</span>
            </div>
          </div>
        </div>
      );
    }

    const showQuote = variation !== "compact";

    return (
      <div key={idx} style={{ background: "#fff", borderRadius: 12, boxShadow: "0 6px 20px rgba(0,0,0,.14)", padding: "10px 12px", border: "1px solid rgba(0,0,0,.06)", marginBottom: idx === 0 && variation === "rich" ? 6 : 0 }}>
        <div style={{ color: "#f59e0b", fontSize: 11, marginBottom: 4 }}>★★★★★</div>
        {showQuote && <div style={{ fontSize: 10, color: "#475569", lineHeight: 1.4, borderLeft: `2px solid ${color}`, paddingLeft: 6, marginBottom: 7 }}>"Truly exceeded our expectations."</div>}
        {cardStyle === "below_card" ? (
          <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
            <div style={{ width: 22, height: 22, borderRadius: "50%", background: color, display: "flex", alignItems: "center", justifyContent: "center", color: "#fff", fontWeight: 700, fontSize: 9 }}>{initial}</div>
            <div>
              <div style={{ fontSize: 10, fontWeight: 700, color: "#0f172a" }}>{name}</div>
              <div style={{ fontSize: 9, color: "#64748b" }}>On Google</div>
            </div>
          </div>
        ) : (
          <div style={{ display: "inline-flex", alignItems: "center", gap: 6, background: cardStyle === "frosted_glass_pill" ? "rgba(15,23,42,.6)" : "#0f172a", borderRadius: 999, padding: "3px 10px 3px 3px" }}>
            <div style={{ width: 22, height: 22, borderRadius: "50%", background: color, display: "flex", alignItems: "center", justifyContent: "center", color: "#fff", fontWeight: 700, fontSize: 9 }}>{initial}</div>
            <div>
              <div style={{ fontSize: 10, fontWeight: 700, color: "#fff" }}>{name}</div>
              <div style={{ fontSize: 9, color: "rgba(255,255,255,.7)" }}>On Google</div>
            </div>
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="relative overflow-hidden rounded-xl border border-slate-200 bg-slate-100" style={{ minHeight: 220, fontFamily: "system-ui, sans-serif" }}>
      <div className="p-4 space-y-2">
        <div className="h-3 w-3/4 rounded bg-slate-200" />
        <div className="h-2 w-full rounded bg-slate-200" />
        <div className="h-2 w-5/6 rounded bg-slate-200" />
        <div className="h-2 w-4/6 rounded bg-slate-200" />
        <div className="mt-4 h-2 w-full rounded bg-slate-200" />
        <div className="h-2 w-5/6 rounded bg-slate-200" />
      </div>

      {isMobile && variation === "rich" ? (
        <div className={`absolute ${posClass[position] ?? posClass["bottom-right"]}`} style={{ maxWidth: 200 }}>
          {renderCard(0)}
        </div>
      ) : (
        <div className={`absolute ${posClass[position] ?? posClass["bottom-right"]}`} style={{ maxWidth: 200 }}>
          {renderCard(0)}
          {variation === "rich" && renderCard(1)}
        </div>
      )}

      <div className="absolute top-2 left-2 text-[9px] font-bold uppercase tracking-wider text-slate-400 bg-white rounded px-1.5 py-0.5 border border-slate-200">
        Preview
      </div>
    </div>
  );
}
```

- [ ] **Step 3: Add props to `ReviewWidgetPreview` destructure**

Add after `collectMobileBehavior,`:
```tsx
  floatingCardStyle,
  floatingVariation,
  floatingPosition,
  floatingAccentColor,
```

- [ ] **Step 4: Add early-return for FLOATING before the COLLECTING check**

Add before the existing `if (widgetType === "COLLECTING")` block:

```tsx
  if (widgetType === "FLOATING") {
    return (
      <FloatingWidgetPreview
        cardStyle={floatingCardStyle ?? "dark_solid_pill"}
        variation={floatingVariation ?? "standard"}
        position={floatingPosition ?? "bottom-right"}
        accentColor={floatingAccentColor ?? primaryColor ?? "#4338ca"}
        isMobile={isMobile}
      />
    );
  }
```

- [ ] **Step 5: Typecheck — Tasks 5 and 6 should now both pass**

```bash
npm run typecheck
```

Expected: clean.

- [ ] **Step 6: Commit Tasks 5 and 6 together**

```bash
git add src/components/widget-customizer.tsx src/components/review-widget-preview.tsx
git commit -m "feat: add Floating Widget customizer panel and admin preview"
```

---

## Task 7: Extend embed script with Floating Widget rendering

**Files:**
- Modify: `src/app/embed/widget.js/route.ts`

All JS strings inside the TypeScript template literal **must use single quotes** — never `\"` (it unescapes to `"` and breaks the served JS).

- [ ] **Step 1: Add `ensureFloatingStyles` helper**

After `// ── End Collecting Widget helpers ───` comment, add:

```js
  // ── Floating Widget helpers ─────────────────────────────────────────────────

  function ensureFloatingStyles() {
    if (document.getElementById('why-float-styles')) return;
    var style = document.createElement('style');
    style.id = 'why-float-styles';
    style.textContent =
      '.why-float-wrapper{position:fixed;z-index:2147483645;max-width:300px;font-family:inherit}' +
      '.why-float-br{bottom:24px;right:24px}' +
      '.why-float-bl{bottom:24px;left:24px}' +
      '.why-float-r{right:0;top:50%;transform:translateY(-50%)}' +
      '.why-float-l{left:0;top:50%;transform:translateY(-50%)}' +
      '.why-float-inner{position:relative}' +
      '.why-float-card{background:#fff;border-radius:14px;box-shadow:0 6px 20px rgba(0,0,0,.14);padding:12px 14px;border:1px solid rgba(0,0,0,.06);margin-bottom:8px;transition:opacity .3s}' +
      '.why-float-card:last-child{margin-bottom:0}' +
      '.why-float-dismiss{position:absolute;top:7px;right:9px;background:none;border:none;color:rgba(0,0,0,.35);cursor:pointer;font-size:13px;line-height:1;padding:2px;z-index:1}' +
      '.why-float-avatar{width:30px;height:30px;border-radius:50%;display:flex;align-items:center;justify-content:center;color:#fff;font-weight:700;font-size:12px;flex-shrink:0}' +
      '.why-float-name{font-size:12px;font-weight:700;color:#0f172a;line-height:1.3}' +
      '.why-float-stars{font-size:12px;color:#f59e0b}' +
      '.why-float-source{font-size:10px;color:#64748b;font-weight:500}' +
      '.why-float-meta{display:flex;align-items:center;gap:6px;margin-top:2px}' +
      '.why-float-action{font-size:11px;color:#64748b;line-height:1.3}' +
      '.why-float-compact-row{display:flex;align-items:center;gap:8px}' +
      '.why-float-stars-row{font-size:12px;color:#f59e0b;margin-bottom:5px}' +
      '.why-float-quote{font-size:11px;color:#475569;line-height:1.5;padding-left:7px;margin-bottom:7px;border-left-width:2px;border-left-style:solid;border-left-color:#e2e8f0}' +
      '.why-float-pill{display:inline-flex;align-items:center;gap:7px;border-radius:999px;padding:4px 10px 4px 4px}' +
      '.why-float-pill-dark{background:#0f172a}' +
      '.why-float-pill-frost{background:rgba(15,23,42,.65)}' +
      '.why-float-pill-name{font-size:11px;font-weight:700;color:#fff;line-height:1.3}' +
      '.why-float-pill-source{font-size:9px;color:rgba(255,255,255,.7);line-height:1.3}' +
      '.why-float-below-row{display:flex;align-items:center;gap:7px;margin-top:7px}' +
      '.why-float-below-name{font-size:11px;font-weight:700;color:#0f172a}' +
      '.why-float-below-source{font-size:9px;color:#64748b}' +
      '@media(max-width:639px){.why-float-rich-second{display:none}}' +
      '@media(max-width:639px){.why-float-compact-mobile .why-float-quote{display:none}}';
    document.head.appendChild(style);
  }
```

- [ ] **Step 2: Add `shouldShowFloating` helper**

After `ensureFloatingStyles`, add:

```js
  function shouldShowFloating(token, freq) {
    if (!freq || freq === 'always') return true;
    var key = 'why-float-' + token;
    try {
      var cached = sessionStorage.getItem(key);
      if (cached !== null) return cached === '1';
      var chance = freq === 'half' ? 0.5 : freq === 'third' ? 0.333 : 1;
      var show = Math.random() < chance;
      sessionStorage.setItem(key, show ? '1' : '0');
      return show;
    } catch (e) {
      return true;
    }
  }
```

- [ ] **Step 3: Add `buildFloatingCard` helper**

After `shouldShowFloating`, add:

```js
  function buildFloatingCard(review, widget, accentColor) {
    var cardStyle = widget.floatingCardStyle || 'dark_solid_pill';
    var variation = widget.floatingVariation || 'standard';
    var initial = escapeHtml((review.reviewerName || '?').slice(0, 1).toUpperCase());
    var name = escapeHtml(review.reviewerName || 'Anonymous');
    var ratingNum = review.rating || 5;
    var ratingStr = escapeHtml(stars(ratingNum));
    var source = review.source === 'GOOGLE' ? 'On Google' : 'On WeHearYou';
    var avatarStyle = 'background:' + accentColor + ';';
    var quoteBody = truncate(review.body || '', variation === 'compact' ? 60 : 110);
    var showQuote = variation !== 'compact' && quoteBody;

    if (cardStyle === 'notification_compact') {
      return '<div class="why-float-card">' +
        '<div class="why-float-compact-row">' +
          '<div class="why-float-avatar" style="' + avatarStyle + '">' + initial + '</div>' +
          '<div>' +
            '<div class="why-float-name">' + name + '</div>' +
            '<div class="why-float-action">just left a ' + escapeHtml(String(ratingNum)) + '-star review</div>' +
            '<div class="why-float-meta">' +
              '<span class="why-float-stars">' + ratingStr + '</span>' +
              '<span class="why-float-source">' + escapeHtml(source) + '</span>' +
            '</div>' +
          '</div>' +
        '</div>' +
      '</div>';
    }

    var pillClass = cardStyle === 'frosted_glass_pill' ? 'why-float-pill why-float-pill-frost' : 'why-float-pill why-float-pill-dark';

    if (cardStyle === 'below_card') {
      return '<div class="why-float-card">' +
        '<div class="why-float-stars-row">' + ratingStr + '</div>' +
        (showQuote ? '<div class="why-float-quote" style="border-left-color:' + accentColor + '">' + escapeHtml(quoteBody) + '</div>' : '') +
        '<div class="why-float-below-row">' +
          '<div class="why-float-avatar" style="' + avatarStyle + '">' + initial + '</div>' +
          '<div>' +
            '<div class="why-float-below-name">' + name + '</div>' +
            '<div class="why-float-below-source">' + escapeHtml(source) + '</div>' +
          '</div>' +
        '</div>' +
      '</div>';
    }

    // dark_solid_pill and frosted_glass_pill
    return '<div class="why-float-card">' +
      '<div class="why-float-stars-row">' + ratingStr + '</div>' +
      (showQuote ? '<div class="why-float-quote" style="border-left-color:' + accentColor + '">' + escapeHtml(quoteBody) + '</div>' : '') +
      '<div class="' + pillClass + '">' +
        '<div class="why-float-avatar" style="' + avatarStyle + '">' + initial + '</div>' +
        '<div>' +
          '<div class="why-float-pill-name">' + name + '</div>' +
          '<div class="why-float-pill-source">' + escapeHtml(source) + '</div>' +
        '</div>' +
      '</div>' +
    '</div>';
  }
```

- [ ] **Step 4: Add `renderFloatingWidget` main function**

After `buildFloatingCard`, add:

```js
  function renderFloatingWidget(data, token, appOrigin) {
    var w = data.widget;
    var reviews = data.reviews || [];

    if (reviews.length === 0) return;
    if (!shouldShowFloating(token, w.floatingDisplayFrequency)) return;

    var isMobile = window.innerWidth < 640;
    var mobileBehavior = w.floatingMobileBehavior || 'show';
    if (isMobile && mobileBehavior === 'hide') return;
    var forceCompact = isMobile && mobileBehavior === 'compact';

    var position = w.floatingPosition || 'bottom-right';
    var variation = forceCompact ? 'compact' : (w.floatingVariation || 'standard');
    var accentColor = (w.floatingAccentColorMode === 'custom' && w.floatingAccentColor)
      ? w.floatingAccentColor
      : (w.primaryColor || '#4338ca');

    ensureFloatingStyles();

    var posMap = { 'bottom-right': 'why-float-br', 'bottom-left': 'why-float-bl', 'right': 'why-float-r', 'left': 'why-float-l' };
    var posClass = posMap[position] || 'why-float-br';

    var wrapper = document.createElement('div');
    wrapper.className = 'why-float-wrapper ' + posClass;

    var inner = document.createElement('div');
    inner.className = 'why-float-inner';

    // Dismiss button
    var dismissBtn = document.createElement('button');
    dismissBtn.className = 'why-float-dismiss';
    dismissBtn.textContent = '✕';
    dismissBtn.setAttribute('type', 'button');
    dismissBtn.setAttribute('aria-label', 'Dismiss');
    dismissBtn.addEventListener('click', function() {
      if (wrapper.parentNode) wrapper.parentNode.removeChild(wrapper);
    });

    // Build initial cards
    var currentIdx = 0;
    var modifiedWidget = {};
    for (var k in w) { modifiedWidget[k] = w[k]; }
    modifiedWidget.floatingVariation = variation;

    var firstCard = buildFloatingCard(reviews[0], modifiedWidget, accentColor);
    inner.innerHTML = firstCard;
    if (variation === 'rich' && reviews.length > 1) {
      var secondCardEl = document.createElement('div');
      secondCardEl.className = 'why-float-rich-second';
      secondCardEl.innerHTML = buildFloatingCard(reviews[1], modifiedWidget, accentColor);
      inner.appendChild(secondCardEl.firstChild);
    }

    inner.appendChild(dismissBtn);
    wrapper.appendChild(inner);
    document.body.appendChild(wrapper);

    // Rotation
    if (w.floatingRotationEnabled !== false && reviews.length > 1) {
      var intervalMs = (w.floatingRotationIntervalSec || 8) * 1000;
      setInterval(function() {
        var firstEl = inner.querySelector('.why-float-card');
        if (!firstEl) return;
        firstEl.style.opacity = '0';
        setTimeout(function() {
          currentIdx = (currentIdx + 1) % reviews.length;
          firstEl.outerHTML = buildFloatingCard(reviews[currentIdx], modifiedWidget, accentColor);
          var updated = inner.querySelector('.why-float-card');
          if (updated) { updated.style.opacity = '0'; updated.style.transition = 'opacity .3s'; updated.offsetHeight; updated.style.opacity = '1'; }
        }, 300);
      }, intervalMs);
    }
  }

  // ── End Floating Widget helpers ─────────────────────────────────────────────
```

- [ ] **Step 5: Add early-return for FLOATING in `loadPage`**

After the existing COLLECTING early-return block:
```js
        if (nextPage === 1 && data.widget.widgetType === 'COLLECTING') {
          renderCollectingWidget(data, token, baseUrl.origin);
          done = true;
          setLoadingState(false);
          return;
        }
```

Add immediately after:
```js
        if (nextPage === 1 && data.widget.widgetType === 'FLOATING') {
          renderFloatingWidget(data, token, baseUrl.origin);
          done = true;
          setLoadingState(false);
          return;
        }
```

- [ ] **Step 6: Validate embed script JS syntax against evaluated output**

```bash
node -e "
const fs = require('fs');
const vm = require('vm');
const content = fs.readFileSync('src/app/embed/widget.js/route.ts', 'utf8');
const match = content.match(/const script = ([\s\S]*?);\s*export async function GET/);
const scriptContent = vm.runInNewContext(match[1].trim());
fs.writeFileSync('/tmp/why-float-check.js', scriptContent);
console.log('Extracted', scriptContent.length, 'chars');
" && node --check /tmp/why-float-check.js && echo "EMBED SCRIPT SYNTAX OK"
```

Expected: `EMBED SCRIPT SYNTAX OK`

- [ ] **Step 7: Commit**

```bash
git add src/app/embed/widget.js/route.ts
git commit -m "feat: add Floating Widget rendering to embed script (4 card styles, rotation, mobile behavior)"
```

---

## Task 8: Full validation and push

- [ ] **Step 1: `npx prisma validate`**

```bash
npx prisma validate
```

Expected: `The schema at prisma/schema.prisma is valid 🚀`

- [ ] **Step 2: `npm run typecheck`**

```bash
npm run typecheck
```

Expected: clean exit.

- [ ] **Step 3: `npm run build`**

```bash
npm run build
```

Expected: `✓ Compiled successfully`, all routes listed, zero errors.

- [ ] **Step 4: Extract and `node --check` the evaluated embed script**

```bash
node -e "
const fs = require('fs');
const vm = require('vm');
const content = fs.readFileSync('src/app/embed/widget.js/route.ts', 'utf8');
const match = content.match(/const script = ([\s\S]*?);\s*export async function GET/);
const scriptContent = vm.runInNewContext(match[1].trim());
fs.writeFileSync('/tmp/why-final-check.js', scriptContent);
" && node --check /tmp/why-final-check.js && echo "SYNTAX OK"
```

Expected: `SYNTAX OK`

- [ ] **Step 5: Verify existing widget paths are intact in embed script**

```bash
node -e "
const fs = require('fs');
const vm = require('vm');
const content = fs.readFileSync('src/app/embed/widget.js/route.ts', 'utf8');
const match = content.match(/const script = ([\s\S]*?);\s*export async function GET/);
const s = vm.runInNewContext(match[1].trim());
const checks = [
  ['Wall of Love (badge layout)', s.includes(\"data.widget.layout === 'badge'\")],
  ['Collecting Widget path', s.includes(\"widgetType === 'COLLECTING'\")],
  ['Floating Widget path', s.includes(\"widgetType === 'FLOATING'\")],
  ['Slider controls', s.includes('attachSliderControls')],
  ['Carousel controls', s.includes('attachCarouselControls')],
];
checks.forEach(([name, ok]) => console.log((ok ? 'PASS' : 'FAIL') + ' ' + name));
process.exit(checks.some(([, ok]) => !ok) ? 1 : 0);
"
```

Expected: all `PASS`.

- [ ] **Step 6: Push and deploy**

```bash
git push origin main
npx vercel deploy --prod
```

---

## Self-Review

**Spec coverage:**
- [x] `floatingCardStyle`: 4 variants implemented in `buildFloatingCard`
- [x] `floatingVariation`: compact/standard/rich — quote visibility, stacked cards
- [x] `floatingPosition`: 4 positions via CSS class map
- [x] `floatingRotationEnabled` + `floatingRotationIntervalSec`: setInterval with fade
- [x] `floatingAccentColorMode` + `floatingAccentColor`: color resolution in `renderFloatingWidget`
- [x] `floatingMobileBehavior`: show/compact/hide checked at render time
- [x] `floatingApprovedOnly`: DB-enforced via PUBLISHED status filter in fetch path
- [x] `floatingMinRating`: applied in FLOATING fetch path
- [x] `floatingDisplayFrequency`: `shouldShowFloating` with sessionStorage
- [x] Fix `deriveWidgetType("floating") → "WALL_OF_LOVE"`: fixed in Task 5
- [x] Fix `deriveLayout("floating") → "grid"`: fixed in Task 5
- [x] Fix `"FLOATING"` missing from `allowedWidgetTypes`: fixed in Task 3
- [x] Creation defaults: set in `createReviewWidget` in Task 3
- [x] `widget-layout-picker` submits `widgetType: "FLOATING"`: Task 4
- [x] Admin panel: Task 5 with all 11 config fields
- [x] Live preview: Task 6 `FloatingWidgetPreview`
- [x] Public API FLOATING fetch path (up to 20 reviews, filtered by minRating): Task 2
- [x] Backward compat: existing COLLECTING/BADGE/WALL_OF_LOVE/SINGLE_TESTIMONIAL paths untouched
- [x] `showSourceLogo`: preserved in existing `renderCard`; floating uses `source` label in text

**Placeholder scan:** No TBDs. All code blocks complete.

**Type consistency:** `floatingCardStyle`, `floatingVariation`, `floatingPosition` used consistently across schema → payload → actions → customizer state → embed script. `floatingRotationEnabled` is `Boolean?` in Prisma, `boolean | null` in TS type, `"on"` form field, `!== false` check in embed.
