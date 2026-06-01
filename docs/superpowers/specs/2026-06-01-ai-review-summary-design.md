# AI Review Summary Design

## Goal

Generate an AI-written 2–4 sentence summary of all public reviews for a location, cache it in the database, and display it on the public profile page and in embedded review widgets.

## Decisions

- **Placement:** above the review list on `/b/[slug]`, and inline with the header stats in the embedded widget
- **Generation:** on-demand (admin triggers via "Regenerate" button); result is cached in the DB
- **Toggle:** location-level (`PublicProfile.showAiReviewSummary`) — controls both the public profile and all widgets for that location simultaneously
- **Gating:** available to all plans, no org-level flag required

---

## Architecture

### Schema changes — `PublicProfile`

Add four fields:

```prisma
showAiReviewSummary        Boolean   @default(false)
aiReviewSummary            String?
aiReviewSummaryAt          DateTime?
aiReviewSummaryReviewCount Int?
```

Migration: `prisma/migrations/20260601_ai_review_summary/migration.sql`

### AI lib — `src/lib/ai-summary.ts`

Exports one function:

```ts
generateAiReviewSummary(reviews: { rating: number; body: string }[]): Promise<string>
```

- Uses `openai` (same client as `ai-reply.ts`, key from `OPENAI_API_KEY`)
- Model: `gpt-4o-mini`
- Prompt: summarize the collection in 2–4 sentences; surface common positives and any recurring negatives; do not mention specific reviewers by name; return only the summary text
- Throws if OpenAI returns empty

### Server action — `src/app/locations/actions.ts`

Add `regenerateAiReviewSummaryAction(formData: FormData)`:

1. Extract `locationId` from form data
2. `requireLocationAccess(locationId)` — auth guard
3. Check `process.env.OPENAI_API_KEY` — return `{ error }` if missing
4. Fetch up to 50 published Google/Facebook reviews for the location (body must be non-null, non-empty)
5. If fewer than 3 reviews, return `{ error: "Not enough reviews to summarize (need at least 3)" }`
6. Call `generateAiReviewSummary(reviews)`
7. `prisma.publicProfile.upsert` — write `aiReviewSummary`, `aiReviewSummaryAt: new Date()`, `aiReviewSummaryReviewCount: reviews.length`
8. `revalidatePath("/locations/[id]")`, `revalidatePath("/b/[slug]")`
9. Return `{ ok: true, summary }`

Also add `toggleAiReviewSummaryAction(formData: FormData)`:

1. Extract `locationId`, `enabled` (boolean string) from form data
2. `requireLocationAccess(locationId)`
3. `prisma.publicProfile.upsert` — write `showAiReviewSummary: enabled === "true"`
4. `revalidatePath` both paths
5. Return `{ ok: true }`

### Admin UI — `src/app/locations/[id]/page.tsx`

Add a new "AI Review Summary" card in the location settings page (after the existing profile settings):

```
┌─────────────────────────────────────────┐
│ AI Review Summary                       │
│                                         │
│ [toggle] Show on public profile         │
│          and all widgets                │
│                                         │
│ Last generated: Jun 1, 2026 · 42 reviews │
│                                          │
│ ╔══════════════════════════════════════╗ │
│ ║ Customers consistently praise the   ║ │
│ ║ fast service and friendly staff…    ║ │
│ ╚══════════════════════════════════════╝ │
│                                          │
│ [Regenerate Summary]                     │
│ (uses up to 50 most recent public reviews) │
└─────────────────────────────────────────┘
```

The toggle and regenerate button are separate forms (different actions). The summary preview is read-only text. If no summary exists yet, show placeholder copy: "No summary yet — click Regenerate to generate one."

Error states: show inline error text below the button (e.g. "Not enough reviews to summarize").

### Public profile — `src/app/b/[slug]/page.tsx`

When `profile.showAiReviewSummary && profile.aiReviewSummary`, render above the reviews section:

```tsx
<div className="rounded-2xl bg-indigo-50 border border-indigo-100 px-4 py-3">
  <div className="flex items-center justify-between mb-1">
    <p className="text-xs font-semibold text-indigo-600">✦ AI Summary</p>
    {profile.aiReviewSummaryReviewCount && (
      <p className="text-xs text-indigo-400">Based on {profile.aiReviewSummaryReviewCount} reviews</p>
    )}
  </div>
  <p className="text-sm leading-7 text-indigo-900">{profile.aiReviewSummary}</p>
</div>
```

No changes needed to the data fetch — `publicProfile: true` already pulls all scalar fields.

### Widget API — `src/lib/review-widgets.ts`

In `getPublicReviewWidgetPayload`, include in the payload:

```ts
aiReviewSummary: widget.location.publicProfile?.showAiReviewSummary
  ? (widget.location.publicProfile.aiReviewSummary ?? null)
  : null,
```

The location query already includes `publicProfile` — no additional DB query needed.

Add `aiReviewSummary: string | null` and `aiReviewSummaryReviewCount: number | null` to `PublicWidgetPayload` type.

Include both in the payload:

```ts
aiReviewSummary: widget.location.publicProfile?.showAiReviewSummary
  ? (widget.location.publicProfile.aiReviewSummary ?? null)
  : null,
aiReviewSummaryReviewCount: widget.location.publicProfile?.showAiReviewSummary
  ? (widget.location.publicProfile.aiReviewSummaryReviewCount ?? null)
  : null,
```

### Widget renderer — `src/components/review-widget-preview.tsx`

Add `aiReviewSummary?: string | null` and `aiReviewSummaryReviewCount?: number | null` to `ReviewWidgetPreviewProps`.

In the header section (below the avg rating / review count row), render when present:

```tsx
{aiReviewSummary && (
  <div style={{ background: "#eef2ff", border: "1px solid #c7d2fe", borderRadius: 10, padding: "10px 12px", marginTop: 10, textAlign: "left" }}>
    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 4 }}>
      <p style={{ margin: 0, fontSize: 10, fontWeight: 700, textTransform: "uppercase", letterSpacing: ".1em", color: "#4f46e5" }}>✦ AI Summary</p>
      {aiReviewSummaryReviewCount && (
        <p style={{ margin: 0, fontSize: 10, color: "#a5b4fc" }}>Based on {aiReviewSummaryReviewCount} reviews</p>
      )}
    </div>
    <p style={{ margin: 0, color: "#3730a3", fontSize: 12, lineHeight: 1.6 }}>{aiReviewSummary}</p>
  </div>
)}
```

Uses inline styles to stay consistent with the rest of the widget renderer (which uses inline styles for embeddability).

### Widget embed page — `src/app/widgets/[id]/page.tsx`

Pass `aiReviewSummary` from the widget config through to `ReviewWidgetPreview`. The page already fetches the location with publicProfile; add `aiReviewSummary` to the props passed down.

---

## Data flow

```
Admin clicks "Regenerate"
  → regenerateAiReviewSummaryAction
    → fetch ≤50 public reviews
    → generateAiReviewSummary (OpenAI)
    → upsert PublicProfile.aiReviewSummary
    → revalidatePath

Public profile load
  → getPublicLocationBySlug (includes publicProfile)
  → render summary block if showAiReviewSummary && aiReviewSummary

Widget API request
  → getPublicReviewWidgetPayload
  → include aiReviewSummary in JSON payload

Widget renderer
  → render summary in header when aiReviewSummary present
```

---

## Error handling

- Missing `OPENAI_API_KEY`: action returns `{ error: "AI summary is not configured" }`
- Fewer than 3 reviews: action returns `{ error: "Not enough reviews to summarize (need at least 3)" }`
- OpenAI failure: action returns `{ error: <message from OpenAI or generic> }`
- All errors displayed inline below the Regenerate button; no redirect

---

## Files

| Action | File |
|--------|------|
| Create | `src/lib/ai-summary.ts` |
| Create | `prisma/migrations/20260601_ai_review_summary/migration.sql` |
| Modify | `prisma/schema.prisma` — add 4 fields to `PublicProfile` |
| Modify | `src/app/locations/actions.ts` — add 2 server actions |
| Modify | `src/app/locations/[id]/page.tsx` — add AI Summary card |
| Modify | `src/app/b/[slug]/page.tsx` — render summary block |
| Modify | `src/lib/review-widgets.ts` — include summary in payload |
| Modify | `src/components/review-widget-preview.tsx` — render summary in widget |
| Modify | `src/app/widgets/[id]/page.tsx` — pass aiReviewSummary prop |
