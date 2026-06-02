# Review Links Feature Design

## Overview

Anonymous location-level review links for distribution via email signatures, QR codes, website buttons, invoices, and printed materials. Visitors click a happy or unhappy icon; happy routes directly to Google, unhappy routes to a private feedback form. All events are tracked at aggregate/location level with no contact association unless the visitor voluntarily submits identifying information.

---

## Routes

| Route | Auth | Description |
|---|---|---|
| `/review/[slug]` | None | Landing page — thumbs up/down |
| `/review/[slug]/feedback` | None | Anonymous private feedback form |
| `/review/[slug]/thanks` | None | Confirmation after feedback submitted |
| `/admin/review-links` | Required | Admin page — links, snippets, QR, analytics |

`/r/[token]` remains unchanged as the personalized campaign/contact route.

---

## Landing Page — `/review/[slug]`

**Design:** Thumbs up/down card layout. Mobile-first. Professional, immediately understandable.

**Copy:**
- Headline: `Would you recommend {Business Name}?`
- Subheadline: `Your feedback helps us improve.`

**Positive card:**
- Green-tinted border, 👍 icon
- Title: `Yes, I had a great experience`
- Subtitle: `Leave a public review`
- Action: record `HAPPY_CLICKED` + `GOOGLE_REDIRECT_CLICKED`, redirect to location's configured Google review URL

**Negative card:**
- Orange-tinted border, 👎 icon
- Title: `Not quite`
- Subtitle: `Share private feedback`
- Action: record `UNHAPPY_CLICKED` + `FEEDBACK_STARTED`, navigate to `/review/[slug]/feedback?src=...`

**Source tracking:**
- `?src=` query parameter is read on page load and persisted through all navigation steps
- `link_viewed` event recorded on page load
- `sessionId` — random UUID generated on first load, stored in `sessionStorage` (not a persistent cookie, no PII), used to group events from the same visit for funnel analysis, expires when the tab closes

**404 behavior:** If `slug` does not match an active location with a configured Google review URL, return 404.

---

## Feedback Form — `/review/[slug]/feedback`

Fields:
- Name (optional)
- Email (optional)
- Message (required)

On submit:
- Record `FEEDBACK_SUBMITTED` analytics event (no contact FK)
- Store submission as a `Review` record using the existing pattern: `source: INTERNAL`, `status: PRIVATE_FEEDBACK`, `reviewerName: name || "Anonymous"`, `body: message`, `rating: 1`, `reviewedAt: now()`. If the visitor provides an email, store it in `internalNotes` as `"Review link feedback. Contact: <email>"`. No `contactId` FK.
- Redirect to `/review/[slug]/thanks`

The form preserves `?src=` from the query string and passes it through to the thanks page and analytics events.

---

## Analytics Model

### Prisma Schema

```prisma
enum ReviewLinkEventType {
  LINK_VIEWED
  HAPPY_CLICKED
  UNHAPPY_CLICKED
  GOOGLE_REDIRECT_CLICKED
  FEEDBACK_STARTED
  FEEDBACK_SUBMITTED
}

model ReviewLinkEvent {
  id             String              @id @default(cuid())
  organizationId String
  locationId     String
  eventType      ReviewLinkEventType
  source         String?             // email_signature | qr_counter | invoice | website | null
  medium         String?             // email | print | digital | null
  placement      String?             // free-form, future use (e.g. "happy_button" | "unhappy_button")
  referrer       String?             // HTTP Referer header, truncated to 500 chars
  sessionId      String?             // sessionStorage UUID, no PII
  reviewLinkId   String?             // nullable, reserved for future ReviewLink entity
  createdAt      DateTime            @default(now())

  organization   Organization        @relation(fields: [organizationId], references: [id])
  location       Location            @relation(fields: [locationId], references: [id])

  @@index([organizationId, createdAt])
  @@index([locationId, createdAt])
  @@index([locationId, eventType, createdAt])
  @@index([locationId, source, createdAt])
  @@index([sessionId])
}
```

### Design Notes

- No `contactId` FK — anonymous events are never associated with a contact
- `source` maps directly from `?src=` query param values; unmapped or missing values stored as `null`
- `placement` distinguishes the happy vs unhappy button in the email signature snippet (`happy_button` / `unhappy_button`)
- `reviewLinkId` is nullable and reserved for a future `ReviewLink` entity (named links, per-link stats, per-placement QR codes) — adding it later requires only a nullable column migration, no breaking change

---

## Admin UI — `/admin/review-links`

### Page Structure

**Top summary bar:** total locations, total clicks (30d), happy clicks (30d), unhappy clicks (30d)

**Location search/filter:** text input to filter the location list by name, scales to many locations

**Per-location tabbed cards** — four tabs per card:

#### Links tab
- Default URL: `https://app.com/review/[slug]` with copy button
- Source-specific URLs, each with a copy button:
  - Email Signature: `?src=email_signature`
  - QR / Print: `?src=qr_counter`
  - Invoice: `?src=invoice`
  - Website: `?src=website`

#### Email Sig tab
- Rendered preview of the snippet as it appears in an email client
- Copyable table-based HTML (email-client-safe: table layout, inline styles, no CSS variables, no flexbox)
- Two inline bordered buttons:
  - Green-tinted happy button → `?src=email_signature&medium=email&placement=happy_button`
  - Orange-tinted unhappy button → `?src=email_signature&medium=email&placement=unhappy_button`

#### QR Code tab
- Single QR code generated client-side (using a lightweight QR library, e.g. `qrcode`)
- Links to `/review/[slug]?src=qr_counter`
- Shows location name, headline, and short URL below the QR
- Print button: `window.print()` with a print-only CSS stylesheet

#### Analytics tab
- Event counts broken down by type (viewed, happy, unhappy, google_redirect, feedback_started, feedback_submitted)
- Breakdown by source
- Date range selector: last 7 / 30 / 90 days

### Secondary Location Section

A "Review Link" section is also added to each location detail page at `/locations/[id]`. It shows the default review URL with a copy button and links to the full Review Links admin page for that location's tools.

---

## Email Signature Snippet

Table-based HTML for maximum email client compatibility (Gmail, Outlook, Apple Mail, mobile). Compact inline layout — two bordered buttons side by side.

```html
<table cellpadding="0" cellspacing="0" border="0" style="font-family:Arial,sans-serif">
  <tr>
    <td style="padding-top:10px;border-top:1px solid #e5e7eb">
      <span style="font-size:12px;color:#6b7280;margin-right:8px">How was your visit?</span>
      <a href="https://app.com/review/[slug]?src=email_signature&medium=email&placement=happy_button"
         style="display:inline-block;background:#f0fdf4;border:1.5px solid #bbf7d0;border-radius:6px;padding:6px 12px;text-decoration:none;font-size:12px;font-weight:700;color:#15803d;margin-right:6px">
        👍 Great
      </a>
      <a href="https://app.com/review/[slug]?src=email_signature&medium=email&placement=unhappy_button"
         style="display:inline-block;background:#fff7ed;border:1.5px solid #fed7aa;border-radius:6px;padding:6px 12px;text-decoration:none;font-size:12px;font-weight:700;color:#c2410c">
        👎 Not great
      </a>
    </td>
  </tr>
</table>
```

The admin UI generates this snippet with the correct URLs and displays a copy button.

---

## QR Code Page

- Single QR code per location, generated client-side using `qrcode` npm package
- Target URL: `/review/[slug]?src=qr_counter`
- Print layout: location name, headline ("How was your visit?"), QR code, short URL below, WeHearYou branding
- Print triggered via `window.print()` with `@media print` CSS hiding everything except the print card

---

## Source Tracking Reference

| `?src=` value | `medium` | `placement` | Use case |
|---|---|---|---|
| `email_signature` | `email` | `happy_button` / `unhappy_button` | Email signature buttons |
| `qr_counter` | `print` | `null` | Counter card / in-store QR |
| `invoice` | `print` | `null` | Printed invoice insert |
| `website` | `digital` | `null` | Website button or embed |
| *(null)* | `null` | `null` | Direct link / unknown |

---

## Out of Scope for MVP

- Named `ReviewLink` entity with per-link status, custom slugs, or separate settings per placement
- Multiple QR codes per location (one per placement type)
- Two-QR print layout (Option B, happy/unhappy separate QR codes)
- Playful emoji theme (Option A) or review-form-style template (Option C) for the landing page
- Campaign/automation integration as a step type (follow-on feature)
- Contact-level tracking for anonymous visits

---

## Future Extension Points

- Add nullable `reviewLinkId` FK to `ReviewLinkEvent` to support named links with separate stats
- Add `ReviewLink` model with: `id`, `locationId`, `name`, `slug`, `isActive`, `defaultSource`, `createdAt`
- Multiple QR codes per location, one per named link
- Landing page theme selector (Option A emoji, Option B thumbs, Option C stars+actions)
- Automation step type: "Send review link" using the anonymous URL as a campaign step
