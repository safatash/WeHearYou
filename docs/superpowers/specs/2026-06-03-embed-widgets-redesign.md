# Embed Widgets Customizer Redesign

**Date:** 2026-06-03  
**Approach:** Targeted refactor of `widget-customizer.tsx` — no new routes, no full rebuild.  
**Visual reference:** `docs/superpowers/widget-customizer-mockup.html`

---

## Problem

The existing widget customizer (`/widgets/[id]`) feels like a settings panel rather than an embed publishing experience. Key issues:

- Content type (text/video/mixed) is buried in a "Display Options" section
- Layout options are compact icon buttons with no visual preview
- No concept of widget "type" — badge is just another layout value
- "Both" label for mixed content is ambiguous
- Embed modal is generic with no platform-specific guidance
- Save lifecycle has no visible state (unsaved, saving, saved, error)
- Mobile preview is just a narrower frame, not responsive widget content

---

## Goals

Redesign the customizer UX in place, preserving:
- All existing embed tokens, public API, and embed script behavior
- Existing `ReviewWidget` DB fields and defaults
- Backward compatibility for widgets already embedded on customer sites

Add:
- Top-level widget type navigation (Wall of Love, Single Testimonial, Badge, Collecting Widget)
- Prominent content mode selector at the top of the left panel
- Visual layout cards filtered by widget type + content mode
- Single Testimonial mode with saved specific review/video selection
- Testimonial source logos on review and video cards
- Publish Widget drawer with platform-specific instructions
- True responsive mobile preview
- Save lifecycle states

---

## Architecture

### Component structure

```
/widgets/[id]/page.tsx                — unchanged server page, passes widget + preview data
  └── WidgetCustomizer                — enhanced in place (widget-customizer.tsx)
        ├── TypeTabBar                — Wall of Love | Single Testimonial | Badge | Collecting
        ├── WallOfLovePanel           — content mode + layout cards + display toggles
        ├── SingleTestimonialPanel    — type cards + content picker + display toggles
        ├── BadgePanel                — badge style cards + display toggles
        ├── LivePreview               — right panel, desktop/mobile toggle, responsive
        └── PublishDrawer             — platform selector + embed code + install steps
```

All sub-panels live inside the existing `widget-customizer.tsx` file. No new routes. No new pages.

### Data flow

1. Widget is fetched server-side in `page.tsx` and passed to `WidgetCustomizer` as props
2. All UI state is local React state, initialized from widget DB values
3. Save action POSTs to existing `updateReviewWidget` server action (extended with new fields)
4. Public embed reads config by token from existing `/api/public/widgets/[token]` route
5. Preview reads from React state only — no network calls needed for preview

---

## Database Migration

Add five fields to `ReviewWidget`:

```prisma
widgetType                 String?   // "WALL_OF_LOVE" | "SINGLE_TESTIMONIAL" | "BADGE" | "COLLECTING"
singleTestimonialReviewId  String?   // FK to Review.id (Single Text Testimonial)
singleTestimonialVideoId   String?   // FK to VideoTestimonial.id (Single Video Testimonial)
showSourceLogo             Boolean   @default(true)   // show Google/WHY/video source mark on cards
badgeStyle                 String?   // "rating" | "compact" | "review_cta" | "trust"
```

**Backward compatibility:** `widgetType` defaults to `null` (treated as `WALL_OF_LOVE`). Existing widgets continue working unchanged. No existing embed codes break.

**Validation:**
- When `widgetType === "SINGLE_TESTIMONIAL"` and `contentType === "TEXT"`, save `singleTestimonialReviewId`, clear `singleTestimonialVideoId`
- When `widgetType === "SINGLE_TESTIMONIAL"` and `contentType === "VIDEO"`, save `singleTestimonialVideoId`, clear `singleTestimonialReviewId`
- Both fields can never be set simultaneously for the same widget

**Relations:** Do not add Prisma `@relation` decorators for `singleTestimonialReviewId` or `singleTestimonialVideoId`. Store them as plain nullable strings. Referential integrity is enforced at the application layer — `getPublicReviewWidgetPayload` checks existence at render time and returns the `singleItemUnavailable` flag if the referenced item is gone. This avoids cascade-delete surprises on review cleanup jobs.

---

## Widget Type: Wall of Love

**Content modes and their valid layouts:**

| Content Mode | Label | Layouts |
|---|---|---|
| TEXT | Text Reviews | Masonry, Carousel Slider, Grid, List |
| VIDEO | Video Testimonials | Video Grid, Video Carousel, Featured Video, Video Wall |
| MIXED | Reviews + Videos | Mixed Masonry, Featured + Reviews, Mixed Carousel, Tabbed View |

**Layout card behavior:**
- Show as a 2-column visual card grid
- Each card has a mini visual preview (not just an icon)
- Cards filter based on selected content mode
- When content mode changes, reset layout to first valid option for that mode
- Selected card shows indigo border + "✓ Selected" pill

**Backward compatibility for layout values:**
- Existing DB values `grid`, `list`, `carousel`, `slider`, `masonry` map to Wall of Love text layouts
- `video` layout maps to Wall of Love / Video Testimonials / Video Carousel
- `badge` layout triggers `widgetType = BADGE` treatment

**Display toggles (Wall of Love):**
- Widget header (show Google rating bar)
- Star ratings on cards
- Reviewer names + avatar
- Review dates
- Source logo (default on)
- Google Review link (write a review)
- Dark theme
- WeHearYou branding

All toggles update live preview immediately.

---

## Widget Type: Single Testimonial

**Sub-types:**
- `video` — single selected video testimonial
- `text` — single selected written review

**Video sub-type:**
- Show a list of available published video testimonials for the location
- User selects one; selection saves as `singleTestimonialVideoId`
- Preview: 16:9 thumbnail area (dark gradient), play button, duration badge, customer name, optional caption/quote overlay
- Source badge: "Video Testimonial" or WeHearYou video mark near name

**Text sub-type:**
- Show a list of available published reviews for the location
- User selects one; selection saves as `singleTestimonialReviewId`
- Preview: Star rating row, quote text, reviewer name + avatar, date, source logo (Google "G" or WeHearYou mark)
- Source badge: "Google Review" or "WeHearYou Review" near reviewer metadata

**Graceful fallback:** If the saved item is deleted/unpublished, show an "Item unavailable" empty state in both admin preview and public embed.

**Display toggles (Single Testimonial):**
- Show caption / quote
- Show customer name
- Show source logo
- Show date
- Dark theme

---

## Widget Type: Badge

**Badge styles (left panel):**
- Rating Badge — score, stars, review count
- Compact Badge — inline mini, for headers/footers
- Review CTA Badge — rating + "Write a Review" button
- Trust Badge — horizontal trust signal strip

**Preview:** Shows the selected badge style centered, not a review wall.

**Scope for this pass:** Badge style cards (Rating Badge, Compact Badge, Review CTA, Trust Badge) are selectable, update the live preview, and persist via `badgeStyle String?` on `ReviewWidget` (included in this migration). Pass `badgeStyle` through `updateReviewWidget` and include it in `PublicWidgetPayload` so the embed script can render the correct badge variant. Default to `"rating"` when null.

---

## Widget Type: Collecting Widget

**State:** Disabled tab. Visible but greyed out (opacity ~45%).  
**Tooltip on hover:** "Collect reviews and testimonials directly from your website. Coming soon."  
**No panel content needed for this pass.**

---

## Testimonial Source Logos

Show a small source indicator on every testimonial card. Rules:

| Source | Label | Mark |
|---|---|---|
| Google review | "Google Review" | Google "G" colored SVG |
| WeHearYou review | "WeHearYou Review" | WHY wordmark or icon |
| Video testimonial | "Video Testimonial" | Camera/video icon |

**Placement:**
- Wall of Love cards: bottom-left of card footer, next to reviewer date. Small (10–11px), muted color.
- Single Testimonial preview: under the reviewer name/date row
- Mixed layout cards: same as Wall of Love cards

**Toggle:** `Show source logo` toggle in display settings, default enabled. Persisted as `showSourceLogo Boolean @default(true)` on `ReviewWidget` — this is an explicit DB column, not a JSON config field. Included in `updateReviewWidget`, `PublicWidgetPayload`, and the public embed renderer so it applies to both admin preview and live embeds.

**Implementation:** `ReviewCard` component receives a `source` prop (`"google"` | `"wehearyou"` | `"video"`) and a `showSourceLogo` boolean. Renders the appropriate mark conditionally. `PublicWidgetPayload` includes `showSourceLogo` in the `widget` sub-object.

---

## Live Preview

**Desktop/Mobile toggle:**
- Desktop: full-width preview frame with browser chrome
- Mobile: constrain preview frame to `375px` max-width AND reflow widget content:
  - Masonry/Grid → single column
  - Video grid → single column
  - Mixed layouts → single column (video stacked above reviews)
  - Carousel/Slider → unchanged (already horizontal scroll)

**Preview state consistency rules:**
- Type tab determines which panel and which preview template renders
- Content mode determines which layouts are shown and which preview content appears
- Layout selection visibly changes preview layout structure
- All display toggles immediately update the preview
- Badge tab → badge preview only (no review wall)
- Single Text tab → text card only (no video player)
- Single Video tab → video player only (no text card)

**Mock data fallback:** If real reviews/videos are unavailable, preview uses mock data. Mock data should be clearly distinguishable (e.g., faint "Preview" watermark or note).

---

## Save Lifecycle

States: `idle` | `unsaved` | `saving` | `saved` | `error`

- Any change to a setting marks state as `unsaved` (e.g., subtitle "Unsaved changes" near Save button)
- Save action → `saving` → `saved` or `error`
- Publish drawer: saves first if there are unsaved changes, then shows the drawer

Save button label changes per state:
- `idle` / `saved` → "Save changes"
- `unsaved` → "Save changes ·" (with dot indicator)
- `saving` → "Saving…"
- `error` → "Save failed — retry"

---

## Publish Widget Drawer

Replaces "View Embed Code" button.

**Trigger:** "🚀 Publish Widget" button in sticky left panel footer.

**Behavior:** If there are unsaved changes, save first (show brief saving state), then open drawer.

**Drawer contents:**
1. Platform selector: WordPress, Shopify, Webflow, Squarespace, Wix, Custom HTML
2. Embed code block (token-driven minimal code, no stale layout attributes in the token-driven case)
3. Copy button with "Copied!" success state (auto-resets after 2s)
4. Platform-specific installation steps (3 steps per platform)
5. Tip box: "Changes you make are applied automatically — you won't need to re-paste the code."
6. "Open widget preview" button (links to existing local test page)

**Embed code format:**
```html
<div id="why-reviews-widget"></div>
<script
  src="https://app.wehearyou.co/embed/widget.js"
  data-token="wg_xxx"
  data-mount="#why-reviews-widget"
></script>
```
Token-driven: the public API returns all config by token, so no `data-layout` or other attributes need to be in the copied code (backward compatible).

---

## Public API Changes for Single Testimonial

`getPublicReviewWidgetPayload` must handle `widgetType === "SINGLE_TESTIMONIAL"`:

- If `singleTestimonialReviewId` is set: fetch that specific review by ID; return it as `reviews: [review]` with `pagination.total = 1`. If deleted/unpublished, return `reviews: []` with a `singleItemUnavailable: true` flag on the payload.
- If `singleTestimonialVideoId` is set: fetch that specific video testimonial by ID; return it as `videoTestimonials: [video]`. If unavailable, return `videoTestimonials: []` with `singleItemUnavailable: true`.

**Type additions to `PublicWidgetPayload`:**
```ts
widgetType: string | null;         // add to widget sub-object
singleItemUnavailable?: boolean;   // add at payload root level
```

**`PublicWidgetReview` — add `source` field:**
```ts
source: string;  // "GOOGLE" | "WEHEARYOU" — used for source logo rendering
```
The `source` field maps from `Review.source` (already on the Prisma model). Pass it through `getPublicReviewWidgetPayload` → `PublicWidgetPayload` → preview component.

---

## Backward Compatibility

- All existing `publicToken` values remain valid
- Public API route `/api/public/widgets/[token]` returns an additive superset — existing consumers ignore new fields
- New fields (`widgetType`, `singleTestimonialReviewId`, `singleTestimonialVideoId`) are additive and nullable
- Existing embed scripts that pass `data-layout` as an attribute continue to be honored
- `layout === "badge"` in existing widgets maps to Badge widget type in the new UI

---

## Files to Change

| File | Change |
|---|---|
| `prisma/schema.prisma` | Add `widgetType`, `singleTestimonialReviewId`, `singleTestimonialVideoId`, `showSourceLogo`, `badgeStyle` to `ReviewWidget` |
| `prisma/migrations/` | New migration file |
| `src/lib/review-widgets.ts` | Update `getPublicReviewWidgetPayload` to handle Single Testimonial; update `PublicWidgetPayload` type |
| `src/app/widgets/actions.ts` | Update `updateReviewWidget` to persist new fields; add `singleTestimonialVideoId`/`ReviewId` |
| `src/components/widget-customizer.tsx` | Full UX refactor per this spec |
| `src/components/review-widget-preview.tsx` | Add source logos, responsive mobile layouts, Single Testimonial preview modes |

---

## Out of Scope (This Pass)

- Rebuilding `/widgets/new` into a multi-step wizard
- Full Badge style persistence in the DB
- Collecting Widget functionality
- Content balance options for Mixed wall (Balanced / Reviews first / etc.)
- Animated masonry layout
- AI summary block changes

## Additional Persistence Notes

### Source logo persistence

The `Show source logo` toggle must persist across refreshes and must affect both the admin preview and the public embed renderer. If display options are stored as explicit fields, add a persisted `showSourceLogo Boolean @default(true)` or equivalent field. If display options are stored in a JSON/config object, include `showSourceLogo: true` in the saved widget configuration by default.

### Badge style persistence decision

For this pass, Badge style selection is preview-only unless a persisted `badgeStyle` field is added. If Badge style should persist now, add nullable `badgeStyle String?` to `ReviewWidget`, include it in `updateReviewWidget`, return it through the public widget payload, and render the selected badge style in the public embed. If Badge style is intentionally not persisted in this pass, keep the UI note: “Preview only — badge style persistence coming soon.”

