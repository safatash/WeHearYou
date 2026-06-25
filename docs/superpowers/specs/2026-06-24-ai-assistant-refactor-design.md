# AI Review Assistant Refactor — Design Spec

**Date:** 2026-06-24
**Status:** Approved (design); ready for planning
**Branch:** feat/ai-assistant-refactor

## Goal

Refactor the positive AI review-assistant flow so AI is a collaborator, not the author: the customer's text is always the source of truth, AI runs only on explicit request, drafts survive navigation, and the review is editable until copied.

## Scope

All changes are in the **shared positive flow** under `src/app/f/[slug]/ai-funnel/` plus the Gemini lib/route and the analytics enum. `AiFunnelFlow` is rendered by BOTH `/f/[slug]` (when `funnelStyle=AI_GUIDED`) and `/r/[token]/assist`, so both routes inherit this refactor from one source. Negative flow, rating capture, and Copy & Post are unchanged.

## 1. Step labels

In `ai-funnel-flow.tsx`, `FLOW.positive` labels become:
1. `pos-intro` → **Highlights**
2. `pos-details` → **Details**
3. `pos-review` → **Create Review**
4. `pos-confirm` → **Review & Edit**
5. `pos-celebrate` → **Copy & Post**

Screen IDs stay (`pos-review`, `pos-confirm`) to limit churn; only labels + behavior change.

## 2. State model (`state.ts` — `FunnelState`)

Lift currently-local PosReview state into `FunnelState` so it persists across the remounting flow (`key={screen}`), and add mode/flag fields:

```ts
// additions to FunnelState (keep existing reviewShort, reviewLong, sessionId, ...)
selectedVersion: "short" | "detailed";   // active tab in AI mode; default "detailed"
tone: "friendly" | "professional" | "casual" | "enthusiastic"; // default "friendly"
length: "short" | "medium" | "detailed";  // default "detailed"
writingMode: "ai" | "manual";              // default "ai"
draftGenerated: boolean;                   // default false — set true after first AI generation
```

`reviewLong` remains the **canonical working/final document**: Step 4 and Step 5 read/copy it. In AI mode the Detailed tab edits `reviewLong` and the Short tab edits `reviewShort`; leaving Step 3 ensures `reviewLong` holds the active version's text. In manual mode the single editor edits `reviewLong` (`reviewShort` unused).

## 3. Step 3 — Create Review (the AI workspace)

- **Auto-generate only on first arrival:** the mount-effect generates **iff** `!state.draftGenerated && state.writingMode === "ai"`. After the first generation it sets `draftGenerated = true`. Back/forward navigation to this screen restores the saved draft and never regenerates. (This is the fix for the "Back regenerates" bug.)
- Generates Short + Detailed as today; `loading` initializes to `!state.draftGenerated && writingMode === "ai"`.
- Message above the editor: **"We've created a review based on what you shared. Use it as-is, edit it, or start from scratch if you'd rather write your own."**
- The review is in an **editable** textarea from first render.
- **AI toolbar (secondary/outlined):** `Regenerate`, `Make Shorter`, `Make Longer`, `More Casual`, `More Professional`.
- **Primary filled button:** **"✍️ Start From Scratch"** — visually distinct from the AI actions; not an AI action.
- AI-mode Short/Detailed tabs remain (pick which generated version to work from); the active tab is `selectedVersion`.

## 4. Start From Scratch → Manual Mode

Clicking **Start From Scratch** opens a confirm dialog:
- Title: **"Start with a blank review?"**
- Body: **"Your current AI draft will be cleared. You can always generate another draft later if you'd like."**
- Buttons: **Start Blank** / **Cancel**

On **Start Blank**: set `reviewLong = ""`, `reviewShort = ""`, `writingMode = "manual"`, focus the textarea, placeholder **"Tell others about your experience..."**. Record `START_FROM_SCRATCH_SELECTED` + `MANUAL_WRITING_STARTED`. The dialog is a lightweight in-component modal (reuse existing design tokens; no new dependency).

**Manual mode** Step-3 toolbar: `Improve Writing`, `Make Shorter`, `Make Longer`, `More Casual`, `More Professional` (NO Regenerate, NO tabs, NO Start-From-Scratch). Returning to an AI draft is done by navigating Back is out of scope here — manual mode persists once chosen for the session.

## 5. AI transforms operate on the current editor text (both modes)

This replaces the current "regenerate from chips with new tone/length" behavior for the transform buttons.

- `Make Shorter` / `Make Longer` / `More Casual` / `More Professional` / `Improve Writing` → call the **extended** generate endpoint with `editMode` + `existingDraft = <current active text>`; the result **replaces the current text only** (preserving the customer's edits as the basis). Records `AI_ASSIST_TOOL_USED`.
- `Regenerate` (AI mode only) → the **only** from-scratch action: regenerates from highlights/details (existing `generateReview` path), replacing the AI draft. Records `AI_ASSIST_REGENERATED`.
- `editMode` values: `"improve" | "shorter" | "longer" | "casual" | "professional"`.

The customer's current text is always the source of truth for everything except `Regenerate`.

## 6. Step 4 — Review & Edit (final human review)

The old read-only confirm (`PosConfirm`) becomes an **editable** textarea bound to `reviewLong`:
- Manual editing only (edit wording, remove/add sentences, fix grammar, personalize).
- Controls: **Back** (→ `pos-review`) and **Copy Review** (→ `pos-celebrate`).
- **No AI toolbar.** Fully editable until copied. No locked confirmation page.
- Edits update `reviewLong`. Records `REVIEW_EDITED` on change (debounced) and `MANUAL_REVIEW_COMPLETED` on Continue.

## 7. Step 5 — Copy & Post

Unchanged: clipboard copy of `reviewLong`, confetti, destination buttons (Google / WeHearYou / Yelp / Facebook / others). "Review copied!" messaging stays. Records `AI_ASSIST_COPIED` (Review Copied) — already emitted today; verify/keep.

## 8. API extension (`src/lib/review-assistant.ts` + `/api/review-assistant/generate`)

Extend — do not duplicate:
- Add optional `editMode?: "improve" | "shorter" | "longer" | "casual" | "professional"` and `existingDraft?: string` to `AssistantContext` and to the route's parsed body.
- In `buildReviewAssistantPrompt`: when `existingDraft` + `editMode` are present, build a transform prompt instead of the from-scratch prompt — e.g. *"Here is the customer's current review: '<existingDraft>'. Revise it to [improve the writing / be shorter / be longer / sound more casual / sound more professional] while preserving their meaning, facts, and voice. Do not invent new details. Return only the revised review."* Keep all existing safety rules (no guarantees/claims, no fabrication).
- The route still runs the safety classifier + session persistence; when `editMode` is present it emits `AI_ASSIST_TOOL_USED` instead of `GENERATED`.
- `ai-client.ts` `GenerateParams` gains optional `editMode?` + `existingDraft?`; `generateReview` forwards them. Transform buttons call `generateReview` with these set; `Regenerate` calls it without them (from-scratch).

## 9. Analytics

Add 5 enum values to `ReviewLinkEventType` via an **additive, committed Prisma migration** (`ALTER TYPE "ReviewLinkEventType" ADD VALUE ...`; Neon-safe — values are only added, not used within the migration):
`START_FROM_SCRATCH_SELECTED`, `MANUAL_WRITING_STARTED`, `MANUAL_REVIEW_COMPLETED`, `AI_DRAFT_ACCEPTED`, `AI_ASSIST_TOOL_USED`.
Reuse existing `AI_ASSIST_REGENERATED` (AI Draft Regenerated), `AI_ASSIST_EDITED` (Review Edited), `AI_ASSIST_COPIED` (Review Copied).

Recording:
- **Server-side** (generate route): emit `AI_ASSIST_TOOL_USED` when `editMode` present; keep `GENERATED`/`REGENERATED`.
- **Client-initiated** events (`START_FROM_SCRATCH_SELECTED`, `MANUAL_WRITING_STARTED`, `MANUAL_REVIEW_COMPLETED`, `AI_DRAFT_ACCEPTED`, `AI_ASSIST_COPIED`, `AI_ASSIST_EDITED`): record through the app's existing client→server analytics path. **Open item for planning:** confirm whether a client event endpoint exists (e.g. under `/api/review-link/*` using `recordEvents`); if not, add a thin `POST` endpoint that calls the existing `recordEvents` lib. Events must be best-effort (never block the customer).

## 10. Out of scope / unchanged

Negative (1–3★) flow, rating capture, the `/r/[token]` rating entry page, the Copy & Post visuals/destinations, and `/f/[slug]` default gating (still opt-in `AI_GUIDED`).

## 11. Testing

- node:test (pure): the new `editMode` branch of `buildReviewAssistantPrompt`; `mapToneAction` (updated to mark transforms as text-ops, not regenerate); a pure `shouldAutoGenerate(state)` helper (`!draftGenerated && writingMode==="ai"`); `ai-client` `generateReview` forwarding `editMode`/`existingDraft` (fetch-stub) and fallback behavior.
- Typecheck + build for the screens (`pos-review`/`pos-confirm`) and `ai-funnel-flow`.
- Manual QA: first arrival auto-generates; edit then Back/forward keeps text; Make Shorter shortens edited text (not from chips); Start From Scratch confirm → blank manual editor; manual transforms preserve text; Step 4 editable with no AI buttons; Copy & Post unchanged; both `/f/[slug]` (AI_GUIDED) and `/r/[token]/assist`.

## 12. Risks

1. **Migration discipline** (highest): the enum migration must be additive + committed (Neon prod). Note the Postgres "ADD VALUE cannot run inside a transaction" caveat — verify the migration applies cleanly (modern PG/Neon allows ADD VALUE in a txn as long as the value isn't used in the same txn, which it isn't here).
2. **Client analytics endpoint** may not exist — sized as a thin add in the plan if needed.
3. **Shared flow:** changes hit both `/f/[slug]` and `/r/[token]/assist`; QA both. Negative flow must remain untouched.
