# Review Reply Panel Design

## Goal

Redesign the `/reviews` inbox as a two-column panel layout and add AI-powered reply generation (gated to Pro orgs) using OpenAI.

## Architecture

The reviews page becomes a URL-driven panel layout. `searchParams.selected` holds the active review ID. The server component fetches all reviews and the selected review in parallel, renders the list on the left and the reply panel on the right. The AI reply button is a client component that POSTs to `/api/ai/reply-draft` and inserts the returned draft into the textarea.

## Tech Stack

Next.js 14 App Router, Prisma + PostgreSQL, OpenAI `gpt-4o-mini`, `openai` npm package, `OPENAI_API_KEY` env var.

---

## Layout

`/reviews` splits into two columns:

**Left column (~40%):** Scrollable list of compact review cards. Each card shows:
- Reviewer name + avatar initial
- Star rating (★)
- Truncated review body (≤120 chars)
- Location name badge
- Date
- Active card gets an indigo left border highlight

Clicking a card navigates to `/reviews?selected=<id>` (Next.js `<Link>`). No client JS needed for the list itself.

**Right column (~60%):** Selected review detail + reply form. When nothing is selected, shows an empty state: "Select a review to reply."

Panel contents (top to bottom):
1. Reviewer name, star rating, date, location badge, source badge
2. Full review body in a styled block
3. Reply textarea (pre-filled with existing `replyDraft` or the `buildReviewReplyDraft` fallback)
4. "Reply with AI" button (indigo, full-width or left-aligned)
5. "Save draft" and "Mark as sent" buttons (existing `saveReviewReply` action)
6. Link to full detail page: "View full details →" → `/reviews/<id>`

**Mobile:** Single column. List is the default view. Clicking a review pushes the panel full-screen (right column takes 100% width). A "← Back to inbox" link returns to the list.

---

## AI Reply Generation

### Button states

- **Enabled (Pro org):** Indigo button, label "Reply with AI". Shows spinner while loading. On success, inserts generated text into the textarea.
- **Disabled (non-Pro org):** Same button, greyed out, "Pro" badge, tooltip on hover: "Upgrade to Pro to use AI replies."
- **Error state:** Inline error message below the button ("Could not generate reply — try again"). Textarea unchanged.

### API route: `POST /api/ai/reply-draft`

Request body: `{ reviewId: string }`

Steps:
1. Authenticate the request (session check via `requireActiveMembership`)
2. Fetch the review + org from the DB; verify the user has access to the review's location
3. Check `org.aiReplyEnabled` — return `403` with `{ error: "Pro feature" }` if false
4. Check `OPENAI_API_KEY` is set — return `500` if missing
5. Call `openai.chat.completions.create` with `gpt-4o-mini`
6. Return `{ draft: string }`

### Prompt

```
You are a professional business owner responding to a customer review.
Write a warm, professional reply (2–4 sentences) to this ${rating}-star review from ${firstName}:

"${body}"

Rules:
- Address the content of the review directly
- Do not be sycophantic or use hollow phrases like "We are so thrilled"
- Sign off naturally without a formal signature
- Write in first-person plural (we/our) unless the business is a solo operator
```

### `src/lib/ai-reply.ts`

Exports one function: `generateReplyDraft(review: { reviewerName, rating, body }): Promise<string>`. Instantiates the OpenAI client, sends the prompt, returns the completion text. Throws on API error.

---

## Plan Gating

### Schema change

```prisma
model Organization {
  // ... existing fields
  aiReplyEnabled  Boolean  @default(false)
}
```

Migration: `ALTER TABLE "Organization" ADD COLUMN "aiReplyEnabled" BOOLEAN NOT NULL DEFAULT false;`

### Enabling for a customer (manual until billing is wired)

```sql
UPDATE "Organization" SET "aiReplyEnabled" = true WHERE slug = 'customer-slug';
```

### Enforcement

- Client: button disabled + "Pro" badge when `aiReplyEnabled` is false (passed as a prop from the server component)
- Server: `/api/ai/reply-draft` re-checks `aiReplyEnabled` and returns `403` if false — cannot be bypassed from the client

---

## File Map

| File | Change |
|---|---|
| `prisma/schema.prisma` | Add `aiReplyEnabled Boolean @default(false)` to Organization |
| `prisma/migrations/20260526_add_ai_reply_enabled/migration.sql` | `ALTER TABLE` for new column |
| `src/lib/ai-reply.ts` | **New** — OpenAI prompt builder + API call |
| `src/app/api/ai/reply-draft/route.ts` | **New** — POST endpoint |
| `src/components/reviews/review-list-item.tsx` | **New** — compact review card component |
| `src/components/reviews/review-reply-panel.tsx` | **New** — client component: full body + reply form + AI button |
| `src/app/reviews/page.tsx` | **Rewrite** — two-column panel layout using `searchParams.selected` |

---

## What is NOT changing

- `src/app/reviews/actions.ts` — `saveReviewReply` is reused as-is
- `src/app/reviews/[id]/page.tsx` — untouched; stays as the deep-dive view for ownership, workflow, metadata
- No changes to the Review schema — `replyDraft`, `replySentAt`, `replySentByMembershipId` are all already there

---

## Error Handling

| Scenario | Behavior |
|---|---|
| OpenAI API down | Inline error below button; textarea unchanged |
| `OPENAI_API_KEY` not set | 500 from API route; same inline error shown |
| `aiReplyEnabled` false | Button disabled client-side; 403 if called directly |
| Review not found / no access | 404 from API route; inline error |
| Network timeout | Abort after 15s; inline error |
