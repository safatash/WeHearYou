# Widget Layout Picker — Design Spec

**Date:** 2026-05-24  
**Status:** Approved

## Overview

Replace the current modal-based widget creation flow with a dedicated `/widgets/new` page featuring a Trustindex-style visual layout selection gallery. Users pick a layout from preview cards, then fill in a name and location in a slide-up bottom panel before creating the widget.

## Motivation

The current flow (button → modal with name + location dropdown) gives no visual sense of what each layout looks like. Trustindex's layout selection page — a gallery of rendered widget previews grouped by type — is a better model: users can see exactly what they're getting before committing.

## Scope

- One card per layout type (no variants like List I / List II — extensible later)
- No source filter (WeHearYou is Google-only)
- 7 layouts: Slider, Carousel, Grid, List, Badge, Floating, Masonry
- Layout tabs for filtering

## Architecture

### Route changes

| Before | After |
|--------|-------|
| "Create New Widget" button opens `CreateWidgetModal` | "Create New Widget" button links to `/widgets/new` |
| `CreateWidgetModal` component | Removed |
| — | New page: `src/app/widgets/new/page.tsx` |
| — | New component: `src/components/widget-layout-picker.tsx` |

### Unchanged

- `src/app/widgets/[id]/page.tsx` — customizer page
- `src/components/widget-customizer.tsx` — customizer UI
- `src/lib/review-widgets.ts` — `getWidgetEligibleLocations` reused as-is

### Small fixes required

- `src/app/widgets/actions.ts` — `createReviewWidget` needs to read `layout` from formData and persist it on the new widget record
- `src/app/widgets/actions.ts` — `updateReviewWidget` has `allowedLayouts = new Set(["grid", "list", "slider", "badge"])` — must be expanded to include all 7 layout values: `carousel`, `masonry`, `floating`

## Components

### `src/app/widgets/new/page.tsx` (server component)

- Calls `requireActiveMembershipPage()` for auth
- Calls `getWidgetEligibleLocations(organization.id)` to fetch eligible locations
- Renders `AppShell` with `WidgetLayoutPicker` inside
- Page title: "Select widget layout"

### `src/components/widget-layout-picker.tsx` (client component)

**State:**
- `activeTab` — currently selected layout filter tab (`"all"` | layout type)
- `selectedLayout` — the chosen layout value or `null`
- `isPanelOpen` — whether the bottom slide-up panel is visible
- `isSaving` — form submission in progress

**Layout cards:**

Each card is a static data object:
```ts
{ value: string; label: string; description: string }
```

Cards are filtered by `activeTab`. Each renders:
- An inline CSS mini-preview (no images — pure HTML/CSS thumbnail)
- Label + description
- "Select" / "✓ Selected" badge

**Tabs:** All | Slider | Carousel | Grid | List | Badge | Floating | Masonry

**Bottom panel:**
- Slides up when a card is selected
- Shows selected layout name
- Widget name text input (required)
- Location `<select>` populated from props (required, filtered to `canCreateWidget === true`)
- "Create Widget →" submit button
- "✕ Cancel" clears selection and hides panel

**Form submission:**
- Calls `createReviewWidget(formData)` with `layout`, `name`, `locationId`
- `createReviewWidget` must be updated to read and persist `layout` (defaults to `"slider"` if missing)
- On success: redirects to `/widgets/[id]`
- On error: logs to console (error handling can be improved later)

### `src/app/widgets/page.tsx` (change)

- Remove `<CreateWidgetModal>` import and usage
- Replace with `<Link href="/widgets/new">` button styled identically to the current create button

## Data Flow

```
/widgets/new (server)
  → getWidgetEligibleLocations()
  → WidgetLayoutPicker (client)
      → user selects layout card
      → bottom panel slides up
      → user enters name + picks location
      → createReviewWidget(formData)
      → redirect to /widgets/[id]
```

## Layout Preview Thumbnails

Each card's preview is pure HTML/CSS — no external images. Thumbnails use:
- Mock avatar initials with colored circles
- Unicode stars for ratings
- Scaled-down card/list/grid structures
- The Google wordmark in text (matching existing `ReviewWidgetPreview` style)

This keeps the page fast, avoids image dependencies, and keeps previews in sync with the actual widget renderer.

## Out of Scope

- Multiple variants per layout (List I, List II…) — add later
- Source filter (Facebook/Google tabs) — WeHearYou is Google-only
- Animated transitions beyond the slide-up panel
- Inline live preview updating as user types (that's the customizer's job)
