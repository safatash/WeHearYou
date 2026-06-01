# AI Review Summary Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add AI-generated 2–4 sentence review summaries, cached per location, shown on the public profile page and in embedded review widgets, with a location-level admin toggle and on-demand regeneration.

**Architecture:** Four new fields are added to `LocationPublicProfile` via a Prisma migration. A new `src/lib/ai-summary.ts` generates the summary via OpenAI. Two server actions handle toggle and regeneration. The summary renders in the existing public profile page above the reviews section, and in the widget payload/renderer. Since `publicProfile: true` is used in all relevant queries, new fields are available automatically after the schema migration.

**Tech Stack:** Next.js App Router, Prisma + PostgreSQL (Neon), OpenAI `gpt-4o-mini` (`openai` npm package, same as `ai-reply.ts`), React Server Components, Tailwind CSS, inline styles for widget renderer (embeddability requirement)

---

## File Map

| Action | File |
|--------|------|
| Create | `src/lib/ai-summary.ts` |
| Create | `prisma/migrations/20260601000000_ai_review_summary/migration.sql` |
| Modify | `prisma/schema.prisma` — add 4 fields to `LocationPublicProfile` |
| Modify | `src/app/locations/actions.ts` — add 2 server actions |
| Modify | `src/app/locations/[id]/page.tsx` — add AI Summary card |
| Modify | `src/app/b/[slug]/page.tsx` — render summary block above reviews |
| Modify | `src/lib/review-widgets.ts` — add fields to types and payload |
| Modify | `src/components/review-widget-preview.tsx` — render summary in header |

---

### Task 1: Schema — add 4 fields to `LocationPublicProfile`

**Files:**
- Modify: `prisma/schema.prisma` — `LocationPublicProfile` model (around line 557)
- Create: `prisma/migrations/20260601000000_ai_review_summary/migration.sql`

- [ ] **Step 1: Create the migration SQL file**

Create directory `prisma/migrations/20260601000000_ai_review_summary/` and write:

```sql
-- prisma/migrations/20260601000000_ai_review_summary/migration.sql
ALTER TABLE "LocationPublicProfile"
  ADD COLUMN "showAiReviewSummary"        BOOLEAN   NOT NULL DEFAULT false,
  ADD COLUMN "aiReviewSummary"            TEXT,
  ADD COLUMN "aiReviewSummaryAt"          TIMESTAMP(3),
  ADD COLUMN "aiReviewSummaryReviewCount" INTEGER;
```

- [ ] **Step 2: Add the 4 fields to `prisma/schema.prisma`**

In the `LocationPublicProfile` model, after the `schemaEnabled` field (line ~600), add:

```prisma
  showAiReviewSummary        Boolean   @default(false)
  aiReviewSummary            String?
  aiReviewSummaryAt          DateTime?
  aiReviewSummaryReviewCount Int?
```

The full updated tail of `LocationPublicProfile` should look like:

```prisma
  showReviews          Boolean     @default(true)
  showTestimonials     Boolean     @default(true)
  showMap              Boolean     @default(true)
  showHours            Boolean     @default(false)
  schemaEnabled        Boolean     @default(true)
  showAiReviewSummary        Boolean   @default(false)
  aiReviewSummary            String?
  aiReviewSummaryAt          DateTime?
  aiReviewSummaryReviewCount Int?
  createdAt            DateTime    @default(now())
  updatedAt            DateTime    @updatedAt
```

- [ ] **Step 3: Apply the migration and regenerate the client**

```bash
cd /Users/safatash/.openclaw/workspace/wehearyou
npx prisma migrate dev --name ai_review_summary
```

Expected output: `Your database is now in sync with your schema.`

If the migration name conflicts, run:
```bash
npx prisma db push
npx prisma generate
```

- [ ] **Step 4: Verify TypeScript sees the new fields**

```bash
npx tsc --noEmit 2>&1 | grep -i "aiReview\|showAiReview" | head -5
```

Expected: no output (no errors referencing the new fields).

- [ ] **Step 5: Commit**

```bash
git add prisma/schema.prisma prisma/migrations/
git commit -m "feat: add ai review summary fields to LocationPublicProfile"
```

---

### Task 2: AI summary lib — `src/lib/ai-summary.ts`

**Files:**
- Create: `src/lib/ai-summary.ts`

- [ ] **Step 1: Create the file**

```ts
// src/lib/ai-summary.ts
import OpenAI from "openai";

export async function generateAiReviewSummary(
  reviews: { rating: number; body: string }[]
): Promise<string> {
  const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

  const reviewList = reviews
    .map((r, i) => `${i + 1}. [${r.rating} stars] ${r.body}`)
    .join("\n");

  const prompt = `You are summarizing customer reviews for a business. Write a 2–4 sentence summary of the following reviews. Surface the most common positive themes and any recurring negatives. Do not mention specific reviewers by name. Return only the summary text, no preamble or labels.

Reviews:
${reviewList}`;

  const completion = await openai.chat.completions.create({
    model: "gpt-4o-mini",
    messages: [{ role: "user", content: prompt }],
    max_tokens: 300,
    temperature: 0.5,
  });

  const text = completion.choices[0]?.message?.content?.trim();
  if (!text) throw new Error("OpenAI returned an empty response");
  return text;
}
```

- [ ] **Step 2: Verify TypeScript compiles**

```bash
npx tsc --noEmit 2>&1 | grep "ai-summary" | head -5
```

Expected: no output (no errors in the new file).

- [ ] **Step 3: Commit**

```bash
git add src/lib/ai-summary.ts
git commit -m "feat: add generateAiReviewSummary lib"
```

---

### Task 3: Server actions — regenerate and toggle

**Files:**
- Modify: `src/app/locations/actions.ts` — append 2 new exported async functions at the end

- [ ] **Step 1: Add imports at the top of `src/app/locations/actions.ts`**

Add to the existing imports block (after the current import lines, around line 24):

```ts
import { generateAiReviewSummary } from "@/lib/ai-summary";
```

The file already imports `revalidatePath`, `prisma`, `requireLocationAccess`, and `ReviewSource`/`ReviewStatus` — these are all already present.

- [ ] **Step 2: Append `regenerateAiReviewSummaryAction` at the end of `src/app/locations/actions.ts`**

Uses the existing `redirect` + `flash` pattern so errors surface to the user without needing a client component.

```ts
export async function regenerateAiReviewSummaryAction(formData: FormData) {
  const locationId = String(formData.get("locationId") ?? "").trim();
  if (!locationId) throw new Error("Location is required");

  await requireLocationAccess(locationId);

  const location = await prisma.location.findUnique({
    where: { id: locationId },
    select: { slug: true },
  });

  if (!process.env.OPENAI_API_KEY) {
    redirect(`/locations/${locationId}?flash=${encodeURIComponent("AI summary is not configured — set OPENAI_API_KEY")}&tone=error`);
  }

  const reviews = await prisma.review.findMany({
    where: {
      locationId,
      OR: [
        { source: ReviewSource.GOOGLE, status: ReviewStatus.PUBLISHED },
        { source: ReviewSource.FACEBOOK, status: ReviewStatus.PUBLISHED },
      ],
      body: { not: "" },
    },
    orderBy: [{ reviewedAt: "desc" }, { createdAt: "desc" }],
    take: 50,
    select: { rating: true, body: true },
  });

  const nonEmpty = reviews.filter((r) => r.body.trim().length > 0);
  if (nonEmpty.length < 3) {
    redirect(`/locations/${locationId}?flash=${encodeURIComponent("Not enough reviews to summarize (need at least 3)")}&tone=error`);
  }

  let summary: string;
  try {
    summary = await generateAiReviewSummary(nonEmpty);
  } catch (err) {
    const msg = err instanceof Error ? err.message : "AI generation failed";
    redirect(`/locations/${locationId}?flash=${encodeURIComponent(msg)}&tone=error`);
  }

  await prisma.locationPublicProfile.upsert({
    where: { locationId },
    update: {
      aiReviewSummary: summary,
      aiReviewSummaryAt: new Date(),
      aiReviewSummaryReviewCount: nonEmpty.length,
    },
    create: {
      locationId,
      aiReviewSummary: summary,
      aiReviewSummaryAt: new Date(),
      aiReviewSummaryReviewCount: nonEmpty.length,
    },
  });

  revalidatePath(`/locations/${locationId}`);
  if (location?.slug) revalidatePath(`/b/${location.slug}`);

  redirect(`/locations/${locationId}?flash=${encodeURIComponent("AI summary regenerated")}&tone=success`);
}
```

- [ ] **Step 3: Append `toggleAiReviewSummaryAction` at the end of `src/app/locations/actions.ts`**

```ts
export async function toggleAiReviewSummaryAction(formData: FormData) {
  const locationId = String(formData.get("locationId") ?? "").trim();
  const enabled = formData.get("enabled") === "true";
  if (!locationId) return { error: "Location is required" };

  await requireLocationAccess(locationId);

  const location = await prisma.location.findUnique({
    where: { id: locationId },
    select: { slug: true },
  });

  await prisma.locationPublicProfile.upsert({
    where: { locationId },
    update: { showAiReviewSummary: enabled },
    create: { locationId, showAiReviewSummary: enabled },
  });

  revalidatePath(`/locations/${locationId}`);
  if (location?.slug) revalidatePath(`/b/${location.slug}`);

  return { ok: true };
}
```

- [ ] **Step 4: Verify TypeScript compiles**

```bash
npx tsc --noEmit 2>&1 | grep "locations/actions" | head -5
```

Expected: no output.

- [ ] **Step 5: Commit**

```bash
git add src/app/locations/actions.ts
git commit -m "feat: add regenerateAiReviewSummaryAction and toggleAiReviewSummaryAction"
```

---

### Task 4: Admin UI — AI Summary card in location detail page

**Files:**
- Modify: `src/app/locations/[id]/page.tsx`

The card goes between the closing `</div>` of the two-column grid (line ~520) and the Danger Zone `<section>` (line ~522). It has two independent forms: one for toggling and one for regenerating.

- [ ] **Step 1: Add imports to `src/app/locations/[id]/page.tsx`**

In the existing import line for actions (line ~8), add `regenerateAiReviewSummaryAction` and `toggleAiReviewSummaryAction`:

```ts
import { deleteLocation, mapLocationToGoogle, refreshGoogleLocationDetails, regenerateAiReviewSummaryAction, saveLocationSettings, syncGoogleReviews, toggleAiReviewSummaryAction } from "@/app/locations/actions";
```

- [ ] **Step 2: Add the AI Summary card between the two-column grid and Danger Zone**

Find this closing tag sequence in the file (around lines 519–522):

```tsx
        </div>

        <section className="rounded-3xl border border-rose-200 bg-rose-50 p-6 shadow-sm">
```

Insert the AI Summary section between them:

```tsx
        </div>

        <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
          <div className="flex items-center justify-between gap-4">
            <div>
              <h3 className="text-xl font-semibold text-slate-950">AI Review Summary</h3>
              <p className="mt-2 text-sm text-slate-600">
                Generate a 2–4 sentence AI summary of all public reviews. Controls both the public profile page and all widgets for this location.
              </p>
            </div>
          </div>

          <div className="mt-6 space-y-5">
            {/* Toggle */}
            <form action={toggleAiReviewSummaryAction} className="flex items-center gap-4">
              <input type="hidden" name="locationId" value={location.id} />
              <input type="hidden" name="enabled" value={publicProfile?.showAiReviewSummary ? "false" : "true"} />
              <label className="flex cursor-pointer items-center gap-3 rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm font-semibold text-slate-700">
                <span className={`relative inline-flex h-5 w-9 items-center rounded-full transition-colors ${publicProfile?.showAiReviewSummary ? "bg-indigo-600" : "bg-slate-300"}`}>
                  <span className={`inline-block h-3 w-3 rounded-full bg-white shadow transition-transform ${publicProfile?.showAiReviewSummary ? "translate-x-5" : "translate-x-1"}`} />
                </span>
                Show on public profile and all widgets
              </label>
              <FormSubmitButton
                idleLabel="Save"
                pendingLabel="Saving…"
                className="rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm font-semibold text-slate-700 shadow-sm"
              />
            </form>

            {/* Last generated metadata */}
            {publicProfile?.aiReviewSummaryAt && (
              <p className="text-sm text-slate-500">
                Last generated: {new Date(publicProfile.aiReviewSummaryAt).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}
                {publicProfile.aiReviewSummaryReviewCount ? ` · ${publicProfile.aiReviewSummaryReviewCount} reviews` : ""}
              </p>
            )}

            {/* Summary preview */}
            {publicProfile?.aiReviewSummary ? (
              <div className="rounded-2xl border border-indigo-100 bg-indigo-50 px-4 py-3">
                <p className="text-xs font-semibold uppercase tracking-[0.18em] text-indigo-500 mb-2">Preview</p>
                <p className="text-sm leading-7 text-indigo-900">{publicProfile.aiReviewSummary}</p>
              </div>
            ) : (
              <p className="text-sm text-slate-400">No summary yet — click Regenerate to generate one.</p>
            )}

            {/* Regenerate form */}
            <form action={regenerateAiReviewSummaryAction} className="space-y-2">
              <input type="hidden" name="locationId" value={location.id} />
              <FormSubmitButton
                idleLabel="Regenerate Summary"
                pendingLabel="Generating…"
                className="rounded-2xl bg-indigo-600 px-5 py-3 text-sm font-semibold !text-white shadow-sm visited:!text-white hover:!text-white"
              />
              <p className="text-xs text-slate-400">Uses up to 50 most recent public Google and Facebook reviews</p>
            </form>
          </div>
        </section>

        <section className="rounded-3xl border border-rose-200 bg-rose-50 p-6 shadow-sm">
```

The regenerate action uses `redirect` with the existing `flash` / `tone` query param pattern — errors appear as the red flash banner at the top of the page (the same banner already rendered by `AppShell`). The toggle action just returns without a redirect, relying on `revalidatePath` to re-render the card with the new state.

- [ ] **Step 3: Verify TypeScript compiles**

```bash
npx tsc --noEmit 2>&1 | grep "locations/\[id\]" | head -5
```

Expected: no output.

- [ ] **Step 4: Commit**

```bash
git add src/app/locations/[id]/page.tsx
git commit -m "feat: add AI Summary card to location detail admin page"
```

---

### Task 5: Public profile — render AI summary above reviews

**Files:**
- Modify: `src/app/b/[slug]/page.tsx`

Since `publicProfile: true` includes all scalar fields, `profile.showAiReviewSummary` and `profile.aiReviewSummary` are already available after Task 1.

- [ ] **Step 1: Add the AI summary block above the reviews section**

Find this block in `src/app/b/[slug]/page.tsx` (around lines 276–281):

```tsx
          {/* REVIEWS */}
          <div className="space-y-5">
            <div className="flex items-center justify-between gap-4">
              <h2 className="text-xl font-semibold text-slate-950">
                Reviews {totalReviews > 0 && <span className="text-slate-400">({totalReviews})</span>}
              </h2>
```

Insert the AI summary block immediately after the `{/* REVIEWS */}` comment and before the `<div className="flex items-center justify-between gap-4">` heading row:

```tsx
          {/* REVIEWS */}
          <div className="space-y-5">
            {profile?.showAiReviewSummary && profile?.aiReviewSummary && (
              <div className="rounded-2xl bg-indigo-50 border border-indigo-100 px-4 py-3">
                <div className="flex items-center justify-between mb-1">
                  <p className="text-xs font-semibold text-indigo-600">✦ AI Summary</p>
                  {profile.aiReviewSummaryReviewCount && (
                    <p className="text-xs text-indigo-400">Based on {profile.aiReviewSummaryReviewCount} reviews</p>
                  )}
                </div>
                <p className="text-sm leading-7 text-indigo-900">{profile.aiReviewSummary}</p>
              </div>
            )}
            <div className="flex items-center justify-between gap-4">
              <h2 className="text-xl font-semibold text-slate-950">
                Reviews {totalReviews > 0 && <span className="text-slate-400">({totalReviews})</span>}
              </h2>
```

- [ ] **Step 2: Verify TypeScript compiles**

```bash
npx tsc --noEmit 2>&1 | grep "b/\[slug\]" | head -5
```

Expected: no output.

- [ ] **Step 3: Commit**

```bash
git add src/app/b/[slug]/page.tsx
git commit -m "feat: render AI summary above reviews on public profile page"
```

---

### Task 6: Widget payload — add summary fields to types and payload

**Files:**
- Modify: `src/lib/review-widgets.ts`

- [ ] **Step 1: Add `aiReviewSummary` and `aiReviewSummaryReviewCount` to `PublicWidgetPayload`**

In `src/lib/review-widgets.ts`, the `PublicWidgetPayload` type has a `location` object (lines ~51–56). Add the two new optional fields:

```ts
  location: {
    name: string;
    avgRating: number | null;
    reviewCount: number;
    reviewLink: string | null;
    aiReviewSummary: string | null;
    aiReviewSummaryReviewCount: number | null;
  };
```

- [ ] **Step 2: Add the fields to the returned payload in `getPublicReviewWidgetPayload`**

In the `return` statement of `getPublicReviewWidgetPayload` (around lines 269–315), update the `location` object:

```ts
    location: {
      name: widget.location.name,
      avgRating: widget.location.avgRating ?? null,
      reviewCount: total,
      reviewLink: widget.location.reviewLink ?? null,
      aiReviewSummary: widget.location.publicProfile?.showAiReviewSummary
        ? (widget.location.publicProfile.aiReviewSummary ?? null)
        : null,
      aiReviewSummaryReviewCount: widget.location.publicProfile?.showAiReviewSummary
        ? (widget.location.publicProfile.aiReviewSummaryReviewCount ?? null)
        : null,
    },
```

- [ ] **Step 3: Verify TypeScript compiles**

```bash
npx tsc --noEmit 2>&1 | grep "review-widgets" | head -5
```

Expected: no output.

- [ ] **Step 4: Commit**

```bash
git add src/lib/review-widgets.ts
git commit -m "feat: add aiReviewSummary fields to widget payload type and data"
```

---

### Task 7: Widget renderer — render AI summary in header

**Files:**
- Modify: `src/components/review-widget-preview.tsx`

- [ ] **Step 1: Add `aiReviewSummary` and `aiReviewSummaryReviewCount` to `ReviewWidgetPreviewProps`**

In `ReviewWidgetPreviewProps` (lines ~24–57), add after the `videoTestimonials` and `contentType` fields:

```ts
  aiReviewSummary?: string | null;
  aiReviewSummaryReviewCount?: number | null;
```

- [ ] **Step 2: Thread the props through the `ReviewWidgetPreview` function**

In the `ReviewWidgetPreview` function signature (the main export), destructure the new props:

Find the existing destructuring (there is a large props destructure in the main function). Add:

```ts
  aiReviewSummary,
  aiReviewSummaryReviewCount,
```

to the destructure list.

- [ ] **Step 3: Render the AI summary in the header section**

In `ReviewWidgetPreview`, find where `ReviewHeader` is called (within the main layout rendering). After `ReviewHeader` renders (and before the review cards/layout), add:

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

Uses inline styles throughout to match the existing widget renderer pattern (the widget must be embeddable and CSS classes don't survive the embed context).

- [ ] **Step 4: Pass the new props through in `src/app/widgets/[id]/page.tsx`**

In `src/app/widgets/[id]/page.tsx`, the `WidgetCustomizer` is passed a `preview` prop (around line 75). The `WidgetCustomizer` passes `preview` to `ReviewWidgetPreview` internally (in `src/components/widget-customizer.tsx`).

In `src/components/widget-customizer.tsx`, find the `<ReviewWidgetPreview` usage (around line 520) and add:

```tsx
aiReviewSummary={preview?.location.aiReviewSummary ?? null}
aiReviewSummaryReviewCount={preview?.location.aiReviewSummaryReviewCount ?? null}
```

- [ ] **Step 5: Verify TypeScript compiles**

```bash
npx tsc --noEmit 2>&1 | grep "review-widget-preview\|widget-customizer" | head -10
```

Expected: no output.

- [ ] **Step 6: Commit**

```bash
git add src/components/review-widget-preview.tsx src/components/widget-customizer.tsx
git commit -m "feat: render AI summary in widget header"
```

---

### Task 8: Build verification and smoke test

- [ ] **Step 1: Run a full TypeScript check**

```bash
npx tsc --noEmit 2>&1 | head -30
```

Expected: no output (zero errors).

- [ ] **Step 2: Run a production build**

```bash
npm run build 2>&1 | tail -20
```

Expected: ends with `✓ Compiled successfully` or similar success output. Fix any build errors before proceeding.

- [ ] **Step 3: Smoke test the admin UI**

Start the dev server:
```bash
npm run dev
```

Navigate to any location detail page (`/locations/<id>`). Verify:
- "AI Review Summary" card appears between the main grid and the Danger Zone section
- Toggle displays current state (off by default for new locations)
- "No summary yet — click Regenerate to generate one." placeholder text shows
- Clicking "Regenerate Summary" calls the action (if `OPENAI_API_KEY` is set, a summary appears)

- [ ] **Step 4: Smoke test the public profile**

Navigate to `/b/<slug>`. Verify:
- With `showAiReviewSummary = false` (default): no summary block appears above reviews
- After enabling the toggle and generating a summary: the indigo summary block appears above the "Reviews (N)" heading with "Based on N reviews" on the right

- [ ] **Step 5: Smoke test the widget**

Navigate to `/widgets/<id>`. Verify:
- The widget preview renders the AI summary in the header section (indigo block below the rating row)
- The "Based on N reviews" label appears on the right side of the "✦ AI Summary" label
- If the toggle is off for the location, `aiReviewSummary` is `null` and nothing renders in the widget

- [ ] **Step 6: Final commit (if any fix-up changes were needed)**

```bash
git add -p
git commit -m "fix: review-summary smoke test corrections"
```
