# Video Testimonials — Design Spec

**Date:** 2026-05-24  
**Scope:** Approach B + Widget extension  
**Status:** Approved

---

## Overview

Improve the video testimonial section across four surfaces:

1. **Client recording experience** — rebuild `/vt/[token]` as a guided 6-step mobile-first flow
2. **Admin send form** — contact search, custom prompt field, live message preview
3. **Testimonials list** — video thumbnails, prompt display, Copy embed button
4. **Widget system** — extend existing review widgets to support video-only or mixed (text + video) content types with 5 layout options

Video testimonials remain a **fully separate section** from the review request flow. The contacts list is shared (the send form pulls from existing contacts), but there is no integration into the review request funnel. No smart nudge from reviews is included.

---

## Surface 1 — Client Recording Experience (`/vt/[token]`)

### Flow

6 steps, each rendered as a centered card. Mobile-first — most recipients open the link from an SMS or email on their phone.

| Step | Name | Content |
|------|------|---------|
| 1 | Intro | Business name + logo, "Share your experience in ~90 seconds", "Let's Go" CTA, "How it Works" bullet list |
| 2 | Prompt + Preview | Custom prompt question, 3 recording tips, live camera preview, "Start Recording" button |
| 3 | Recording | Full camera feed, recording timer, prompt as a small overlay reminder, "Stop" button |
| 4 | Playback | Video playback, "Re-record" + "Looks good →" buttons |
| 5 | Attribution | Name (required), email (optional), "Submit Testimonial" button |
| 6 | Thank you | Success confirmation with business name |

### Component changes — `VideoRecorder`

**New props:**
- `prompt: string` — shown on step 2 and as an overlay during recording. Falls back to `"Share your experience with [businessName]"` when the stored value is null (pre-migration testimonials). Max recording length is 90 seconds (matches existing `MAX_SECONDS = 90` in the component).
- `businessName: string` — shown on intro card
- `logoUrl?: string` — shown on intro card (fallback to initials avatar)

**Stage enum extended:**
```
intro → idle → requesting → countdown → recording → preview → form → uploading → done
```

**New behaviours:**
- Step 2: live camera preview starts immediately (camera requested on "Let's Go", not on "Start Recording")
- 3-second countdown animation (`countdown` stage) before recording begins
- Name field on step 5 becomes **required** (was optional)

### `/vt/[token]` page changes

Pass `prompt`, `businessName`, and `logoUrl` from the server-fetched `VideoTestimonial` + `Location` + `publicProfile` into `VideoRecorder`.

---

## Surface 2 — Admin Send Form

**Component:** New `SendVideoRequestForm` client component (replaces the current static `<form>` in `video-testimonials/page.tsx`)

### Fields

| Field | Type | Notes |
|-------|------|-------|
| Location | Select | Existing dropdown |
| Contact | Search autocomplete | Searches existing contacts by name/email/phone. Falls back to manual name + email/phone entry if no match |
| Channel | Toggle | Email / SMS |
| Recording Prompt | Textarea | Stored on `VideoTestimonial.prompt`. Pre-filled with `"How has [location name] helped you?"`. Customer sees this while recording. |

### Live preview

Right panel (on desktop) / below form (on mobile) shows a live email or SMS preview that updates as the prompt is typed. The prompt renders as a block-quoted callout inside the email.

### DB change

One new column on `VideoTestimonial`:

```sql
ALTER TABLE "VideoTestimonial" ADD COLUMN "prompt" TEXT;
```

The `sendVideoTestimonialRequest` server action is updated to accept and store `prompt`.

---

## Surface 3 — Testimonials List

### Card layout changes

Each card in "All Testimonials" gains:

- **Thumbnail** (96×64px): `<video src={videoUrl} preload="metadata">` — browser grabs the first frame, no additional processing or storage
- **Prompt display**: shown as an italic quote below the submitter's name — helps identify which question they answered
- **"Awaiting" state**: cards where `videoUrl` is null use a dashed border + camera emoji placeholder instead of hiding the thumbnail area
- **Copy button** on embed code: copies iframe HTML to clipboard without selecting the text

### Status vocabulary change

| Old label | New label |
|-----------|-----------|
| (no state shown) | AWAITING (no video yet) |
| PENDING | PENDING (video submitted, awaiting review) |
| PUBLISHED / APPROVED | PUBLISHED |
| REJECTED | REJECTED |

---

## Surface 4 — Widget System Extension

### Overview

The existing `ReviewWidget` model is extended to support video testimonials and mixed content. No new model is required.

### DB change

```sql
ALTER TABLE "ReviewWidget" ADD COLUMN "contentType" TEXT NOT NULL DEFAULT 'TEXT';
-- Values: 'TEXT' | 'VIDEO' | 'MIXED'
```

All existing widgets default to `TEXT` — fully backwards compatible, no migration of existing data needed.

### Widget creation flow (`/widgets/new`)

The `WidgetLayoutPicker` component gains a **Step 1: content type picker** before the layout step:

| Option | Label | Description |
|--------|-------|-------------|
| `TEXT` | ⭐ Text Reviews | Google reviews synced from Google Business Profile |
| `VIDEO` | 🎥 Video Testimonials | Published video testimonials for the location |
| `MIXED` | ⭐🎥 Both | Text reviews + video testimonials mixed by date |

### Layout options

All 5 layouts apply to all content types:

| Layout | Behaviour |
|--------|-----------|
| **List** | Vertical stack of cards |
| **Grid** | 2–3 column grid |
| **Carousel** | Horizontally scrollable, partial peek of next card |
| **Slider** | One item at a time with prev/next arrows + dot indicators |
| **Masonry** | Variable-height columns, Pinterest-style |

### Video cards (in embed)

Video cards render as thumbnail + play button overlay + name + duration. Clicking a video card opens a **lightbox modal player** — no page navigation.

### API extension (`/api/public/widgets/[token]`)

Returns `contentType` in the widget payload. When `contentType` is `VIDEO` or `MIXED`, the response includes a `videoTestimonials` array alongside the existing `reviews` array. In `MIXED` mode, items are interleaved by date descending.

### Embed script

The existing `/embed/widget.js` is extended with a video render mode. Video cards and text review cards share the same layout engine — the layout type (grid, masonry, etc.) controls the arrangement; the content type controls the card template.

---

## Out of Scope

- Smart nudge after a review is submitted (removed — review funnel goal is Google reviews, separate concern)
- Multiple recording prompts / multi-question flows (single prompt per request)
- Transcript generation (requires external service, deferred)
- Inline video player in the admin testimonials list (Watch ↗ opens new tab)
- Teleprompter feature (Vocal Video specific, not planned)

---

## Data Model Summary

| Change | Type | Details |
|--------|------|---------|
| `VideoTestimonial.prompt` | New column | `TEXT`, nullable |
| `ReviewWidget.contentType` | New column | `TEXT NOT NULL DEFAULT 'TEXT'` |

Two migrations total. No new models.
