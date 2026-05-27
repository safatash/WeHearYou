# Campaigns Page Redesign Spec

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Visual refresh of `/campaigns` — same data, cleaner presentation matching the new dashboard style.

**Architecture:** Pure UI change — `src/app/campaigns/page.tsx` is rewritten. No new routes, no schema changes, no data layer changes. Existing helpers (`formatCampaignStatus`, `formatChannel`, `formatDateTime` from `src/lib/campaigns.ts`) are kept.

**Tech Stack:** Next.js App Router (RSC), Tailwind CSS, Prisma.

---

## Layout

```
┌─────────────────────────────────────────────────────┐
│  "Campaigns"  ·  Review requests and send history   │
│                                   [Send New Request] │
├─────────────────────────────────────────────────────┤
│ Contact │ Status │ Channel │ Date Sent │ Outcome     │
│─────────────────────────────────────────────────────│
│ Row …                                               │
│ Row …                                               │
└─────────────────────────────────────────────────────┘
```

---

## Page Header

Match the dashboard header style exactly:

- **Title:** `"Campaigns"` — `text-xl font-bold text-slate-900`
- **Subtitle:** `"Review requests and send history"` — `text-sm text-slate-400 mt-0.5`
- **Action button (right-aligned):** `"Send New Request"` → `/campaigns/new`
  - Styling: `bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-semibold px-4 py-2 rounded-lg`
- Remove the existing eyebrow label, long `h2`, and paragraph description entirely.

The `createdCampaigns` flash banner (shown after creating multiple campaigns) is kept as-is above the header — no change.

---

## Table Card Container

Replace the current `rounded-3xl border border-slate-200 bg-white p-4 shadow-sm` wrapper with:

```
rounded-2xl border border-slate-200 bg-white shadow-sm overflow-hidden
```

No padding on the card — the table fills edge-to-edge so the header row bleeds to the card edges naturally.

---

## Table

### Header Row

- Background: `bg-slate-50`
- Bottom border: `border-b border-slate-200`
- Cell text: `text-[10px] font-bold uppercase tracking-[.1em] text-slate-400 px-4 py-3`
- Columns (in order): **Contact**, **Status**, **Channel**, **Date Sent**, **Outcome**

### Data Rows

- Bottom border: `border-b border-slate-100 last:border-b-0`
- Hover: `hover:bg-slate-50/60`
- Cell padding: `px-4 py-3`

#### Contact cell

- **Primary line:** first recipient's `contact.name` (or `campaign.name` if no recipients), linked to `/campaigns/${campaign.id}` — `text-sm font-semibold text-slate-900 hover:text-indigo-600`
- **Secondary line (conditional):** If `campaign.recipients.length > 1`: `+{n-1} more recipients` — `text-xs text-slate-400 mt-0.5`. Otherwise: no secondary line.

#### Status cell

Color-coded pill. Use `formatCampaignStatus(campaign.status)` for the label text. Colors by status:

| Status | Classes |
|--------|---------|
| `COMPLETED` | `bg-emerald-100 text-emerald-800` |
| `CLICKED` | `bg-emerald-100 text-emerald-800` |
| `OPENED` | `bg-amber-100 text-amber-800` |
| `SENT` | `bg-indigo-100 text-indigo-800` |
| `SCHEDULED` | `bg-indigo-100 text-indigo-800` |
| `DRAFT` | `bg-slate-100 text-slate-600` |
| `FAILED` | `bg-red-100 text-red-800` |

Pill base classes: `inline-flex items-center rounded-full px-2.5 py-0.5 text-[9px] font-bold uppercase tracking-[.1em]`

#### Channel cell

Small colored dot + label text:

- `EMAIL`: indigo dot (`bg-indigo-400`) + `"Email"`
- `SMS`: emerald dot (`bg-emerald-400`) + `"SMS"`

Dot: `inline-block w-1.5 h-1.5 rounded-full mr-1.5 flex-shrink-0`

Full cell: `flex items-center text-sm text-slate-500`

#### Date Sent cell

Use existing `formatDateTime(campaign.sendAt)`. If `null`, render `"—"` in `text-slate-400`.

Cell: `text-sm text-slate-500`

#### Outcome cell

Use `firstRecipient?.outcome ?? "—"`. Color-code based on content:

- If outcome includes `"Google"` (case-insensitive): `text-sm font-semibold text-emerald-600`
- If outcome includes `"feedback"` or `"private"` (case-insensitive): `text-sm font-semibold text-amber-600`
- If outcome is `null` / `undefined` / `"—"`: render `"—"` in `text-slate-400`
- Otherwise: `text-sm text-slate-500`

---

## Empty State

If `campaigns.length === 0`, show inside the table card (replacing the `<table>`):

```
<div class="flex flex-col items-center justify-center py-16 text-center">
  <p class="text-sm font-medium text-slate-900">No campaigns yet</p>
  <p class="text-sm text-slate-400 mt-1">Send your first review request to get started.</p>
  <a href="/campaigns/new" class="mt-4 inline-flex items-center rounded-lg bg-indigo-600 px-4 py-2 text-sm font-semibold text-white hover:bg-indigo-700">
    Send New Request
  </a>
</div>
```

(The existing code has no empty state — add it.)

---

## What's Removed

- The eyebrow label (`text-sm font-semibold uppercase tracking-[0.22em] text-indigo-600`)
- The long `h2` heading
- The paragraph description
- The `p-4` padding on the outer table card
- The plain gray status pill (replaced by color-coded pills)

## What's Unchanged

- `createdCampaigns` flash banner (above the header)
- `flash` / `tone` flash message handling (passed to `AppShell`)
- All data-fetching logic (`getCampaigns`, `getCurrentAccessibleLocationIds`)
- The overall `AppShell` wrapper with `activeScreen="campaigns"`
- The link on the contact name to the campaign detail page
