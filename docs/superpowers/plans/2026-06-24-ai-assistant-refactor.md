# AI Review Assistant Refactor Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make the positive review-assistant flow customer-owned: AI runs only on explicit request, transforms operate on the current editor text, drafts survive navigation, and the review stays editable until copied.

**Architecture:** Refactor the shared positive screens under `src/app/f/[slug]/ai-funnel/` (rendered by both `/f/[slug]` and `/r/[token]/assist`), extend the existing Gemini lib/route with an `editMode`/`existingDraft` transform mode, lift draft state into `FunnelState` so the remounting wizard preserves it, and add analytics enum values + client events through the existing `/api/review-assistant/event` endpoint.

**Tech Stack:** Next.js 16 App Router, React 19, TypeScript, Prisma (Postgres/Neon), Gemini 2.5 Flash, `lucide-react`. Tests: Node `node:test` + `node:assert/strict`.

## Global Constraints

- **DB changes ship as committed additive Prisma migrations only** (prod=Neon, local=Supabase, drifted). The enum migration uses `ALTER TYPE ... ADD VALUE IF NOT EXISTS` (Neon/PG15-safe; values added but not used in the same migration).
- **Reuse, do not duplicate:** extend `buildReviewAssistantPrompt`, the `/api/review-assistant/generate` + `/event` routes, `recordEvents`, and the existing screens — do not create parallel implementations.
- **AI only on explicit request:** navigation must never trigger generation. The customer's current editor text is the source of truth for every AI action except `Regenerate`.
- **AI degradation:** every AI call falls back to the local deterministic generator / leaves text unchanged on error; never block the customer.
- **Scope:** positive flow only. Negative flow, rating capture, `/r/[token]` rating entry, and Copy & Post visuals are unchanged. Changes hit both `/f/[slug]` (AI_GUIDED) and `/r/[token]/assist`.
- **Step labels (verbatim):** Highlights · Details · Create Review · Review & Edit · Copy & Post.
- **EditMode values (verbatim):** `"improve" | "shorter" | "longer" | "casual" | "professional"`.

### Testing convention (this repo)

- `node:test` + `node:assert/strict`. NO vitest/jest. Run a `src/lib/**` or `src/app/api/**` (non-bracket) test with: `node --import ./test-loader.mjs --test src/lib/foo.test.ts`.
- **Bracket-dir gotcha:** files under `src/app/f/[slug]/...` cannot be globbed by `--test`; run them DIRECTLY: `node --import ./test-loader.mjs "src/app/f/[slug]/ai-funnel/foo.test.ts"`. Always quote `[slug]` paths. Test imports use explicit `.ts` extension.
- `.tsx`/JSX modules are NOT unit-tested (the runner strips types, not JSX) — verified by `npm run typecheck` + `npm run build`.

---

### Task 1: Analytics enum values + migration

**Files:**
- Modify: `prisma/schema.prisma` (enum `ReviewLinkEventType`, after `RESOLUTION_AI_REWRITE_ACCEPTED`)
- Create: `prisma/migrations/20260624130000_ai_assistant_refactor_events/migration.sql`

**Interfaces:**
- Produces: 5 new `ReviewLinkEventType` members: `START_FROM_SCRATCH_SELECTED`, `MANUAL_WRITING_STARTED`, `MANUAL_REVIEW_COMPLETED`, `AI_DRAFT_ACCEPTED`, `AI_ASSIST_TOOL_USED`.

- [ ] **Step 1: Add the enum members to the schema**

In `prisma/schema.prisma`, inside `enum ReviewLinkEventType { ... }`, add these lines (before the closing `}`):
```prisma
  START_FROM_SCRATCH_SELECTED
  MANUAL_WRITING_STARTED
  MANUAL_REVIEW_COMPLETED
  AI_DRAFT_ACCEPTED
  AI_ASSIST_TOOL_USED
```

- [ ] **Step 2: Write the migration**

```sql
-- prisma/migrations/20260624130000_ai_assistant_refactor_events/migration.sql
ALTER TYPE "ReviewLinkEventType" ADD VALUE IF NOT EXISTS 'START_FROM_SCRATCH_SELECTED';
ALTER TYPE "ReviewLinkEventType" ADD VALUE IF NOT EXISTS 'MANUAL_WRITING_STARTED';
ALTER TYPE "ReviewLinkEventType" ADD VALUE IF NOT EXISTS 'MANUAL_REVIEW_COMPLETED';
ALTER TYPE "ReviewLinkEventType" ADD VALUE IF NOT EXISTS 'AI_DRAFT_ACCEPTED';
ALTER TYPE "ReviewLinkEventType" ADD VALUE IF NOT EXISTS 'AI_ASSIST_TOOL_USED';
```

- [ ] **Step 3: Regenerate client + typecheck**

Run: `npx prisma generate && npm run typecheck`
Expected: generate succeeds; no NEW type errors. (Do NOT run `prisma db push`/`migrate deploy` locally — it applies at deploy.)

- [ ] **Step 4: Commit**

```bash
git add prisma/schema.prisma prisma/migrations/20260624130000_ai_assistant_refactor_events
git commit -m "feat(analytics): add AI assistant refactor event types"
```

---

### Task 2: Allow new client events on the event endpoint

**Files:**
- Modify: `src/app/api/review-assistant/event/route.ts` (the `ALLOWED` map)

**Interfaces:**
- Consumes: enum members from Task 1.
- Produces: `/api/review-assistant/event` accepts `START_FROM_SCRATCH_SELECTED`, `MANUAL_WRITING_STARTED`, `MANUAL_REVIEW_COMPLETED`, `AI_DRAFT_ACCEPTED` (client-fired). (`AI_ASSIST_TOOL_USED` stays server-emitted in Task 4; `AI_ASSIST_EDITED`/`AI_ASSIST_COPIED` already allowed.)

> No unit test: the route imports `@/lib/prisma` and Next types; gate is typecheck + build. The change is a literal allowlist extension.

- [ ] **Step 1: Extend the `ALLOWED` map**

In `src/app/api/review-assistant/event/route.ts`, add to the `ALLOWED` object:
```ts
  START_FROM_SCRATCH_SELECTED: ReviewLinkEventType.START_FROM_SCRATCH_SELECTED,
  MANUAL_WRITING_STARTED: ReviewLinkEventType.MANUAL_WRITING_STARTED,
  MANUAL_REVIEW_COMPLETED: ReviewLinkEventType.MANUAL_REVIEW_COMPLETED,
  AI_DRAFT_ACCEPTED: ReviewLinkEventType.AI_DRAFT_ACCEPTED,
```

- [ ] **Step 2: Verify**

Run: `npm run typecheck`
Expected: no NEW errors (the `Record<string, ReviewLinkEventType>` type forces valid enum members).

- [ ] **Step 3: Commit**

```bash
git add src/app/api/review-assistant/event/route.ts
git commit -m "feat(analytics): allow new client-fired assistant events"
```

---

### Task 3: Extend the Gemini prompt with transform (editMode) support

**Files:**
- Modify: `src/lib/review-assistant.ts` (`AssistantContext`, `buildReviewAssistantPrompt`)
- Test: `src/lib/review-assistant.test.ts` (existing file — add cases)

**Interfaces:**
- Produces:
  - `type AssistantEditMode = "improve" | "shorter" | "longer" | "casual" | "professional"` (exported)
  - `AssistantContext` gains optional `editMode?: AssistantEditMode` and `existingDraft?: string`.
  - `buildReviewAssistantPrompt(ctx)`: when `ctx.existingDraft` is non-empty AND `ctx.editMode` is set, returns a TRANSFORM prompt built around the draft; otherwise unchanged (from-scratch) behavior.

- [ ] **Step 1: Write the failing test**

Append to `src/lib/review-assistant.test.ts`:
```ts
import { buildReviewAssistantPrompt } from "./review-assistant.ts";
// (file already imports test/assert; if not, add:)
// import test from "node:test"; import assert from "node:assert/strict";

const baseCtx = {
  businessName: "NOVA Advertising", selectedPhrases: ["Great Communication"],
  tone: "friendly" as const, length: "detailed" as const,
};

test("transform prompt uses the existing draft, not from-scratch", () => {
  const p = buildReviewAssistantPrompt({ ...baseCtx, editMode: "shorter", existingDraft: "They were fantastic and thorough and kind." });
  assert.ok(p.includes("They were fantastic and thorough and kind."));
  assert.match(p.toLowerCase(), /shorter/);
  assert.match(p.toLowerCase(), /preserv|keep|meaning|voice/);
});
test("no editMode keeps from-scratch prompt (no draft echoed)", () => {
  const p = buildReviewAssistantPrompt(baseCtx);
  assert.ok(!p.includes("existing review"));
});
test("editMode without a draft falls back to from-scratch", () => {
  const p = buildReviewAssistantPrompt({ ...baseCtx, editMode: "shorter", existingDraft: "" });
  assert.ok(!p.includes("current review draft"));
});
```

- [ ] **Step 2: Run test, verify it fails**

Run: `node --import ./test-loader.mjs --test src/lib/review-assistant.test.ts`
Expected: FAIL (transform branch missing).

- [ ] **Step 3: Implement the transform branch**

In `src/lib/review-assistant.ts`: export `export type AssistantEditMode = "improve" | "shorter" | "longer" | "casual" | "professional";`. Add `editMode?: AssistantEditMode;` and `existingDraft?: string;` to `AssistantContext`. At the TOP of `buildReviewAssistantPrompt(ctx)`, before the existing from-scratch logic, add:
```ts
  const draft = (ctx.existingDraft ?? "").trim();
  if (draft && ctx.editMode) {
    const instruction: Record<AssistantEditMode, string> = {
      improve: "Improve the writing — clearer, more natural and well-structured",
      shorter: "Make it shorter and more concise",
      longer: "Make it a little longer and more detailed",
      casual: "Make it sound more casual and conversational",
      professional: "Make it sound more professional and polished",
    }[ctx.editMode];
    return [
      "You are helping a real customer refine their own online review. Here is the customer's current review draft:",
      `"""${draft}"""`,
      "",
      `Rewrite it to: ${instruction}.`,
      "Rules:",
      "- Preserve the customer's meaning, facts, and personal voice. Do not invent details or change what happened.",
      "- Do NOT make medical, legal, or financial guarantees or claims.",
      "- Return ONLY the revised review text — no preamble, quotes, labels, or options.",
    ].join("\n");
  }
```
(Leave the existing from-scratch prompt code below it as the fallback.)

- [ ] **Step 4: Run test, verify it passes**

Run: `node --import ./test-loader.mjs --test src/lib/review-assistant.test.ts`
Expected: PASS (existing tests still pass too).

- [ ] **Step 5: Commit**

```bash
git add src/lib/review-assistant.ts src/lib/review-assistant.test.ts
git commit -m "feat(assistant): editMode transform prompt operating on existing draft"
```

---

### Task 4: Wire editMode through the generate route

**Files:**
- Modify: `src/app/api/review-assistant/generate/route.ts`

**Interfaces:**
- Consumes: `AssistantEditMode` (Task 3).
- Produces: the route reads `editMode` + `existingDraft` from the body, passes them into the `AssistantContext`, and emits `AI_ASSIST_TOOL_USED` (instead of GENERATED/REGENERATED) when `editMode` is present.

> No unit test (route imports prisma/Next). Gate: typecheck + build. Behavior verified in Task 9 manual QA.

- [ ] **Step 1: Parse + pass editMode/existingDraft**

In `route.ts`, after the existing `const isRegenerate = body.isRegenerate === true;` line, add:
```ts
  const EDIT_MODES = ["improve", "shorter", "longer", "casual", "professional"] as const;
  const editMode = EDIT_MODES.includes(body.editMode as never) ? (body.editMode as (typeof EDIT_MODES)[number]) : undefined;
  const existingDraft = asString(body.existingDraft) ?? undefined;
```
Add `editMode,` and `existingDraft,` into the `ctx: AssistantContext = { ... }` object.

- [ ] **Step 2: Emit TOOL_USED for transforms**

Find the `recordEvents({ ... eventTypes: [isRegenerate ? ReviewLinkEventType.AI_ASSIST_REGENERATED : ReviewLinkEventType.AI_ASSIST_GENERATED] ... })` call and change the `eventTypes` expression to:
```ts
    eventTypes: [editMode ? ReviewLinkEventType.AI_ASSIST_TOOL_USED : isRegenerate ? ReviewLinkEventType.AI_ASSIST_REGENERATED : ReviewLinkEventType.AI_ASSIST_GENERATED],
```

- [ ] **Step 3: Verify**

Run: `npm run typecheck && npm run build`
Expected: no NEW errors; build compiles.

- [ ] **Step 4: Commit**

```bash
git add src/app/api/review-assistant/generate/route.ts
git commit -m "feat(assistant): generate route accepts editMode transforms + TOOL_USED event"
```

---

### Task 5: ai-client — editMode params, transform mapping, event helper

**Files:**
- Modify: `src/app/f/[slug]/ai-funnel/ai-client.ts`
- Test: `src/app/f/[slug]/ai-funnel/ai-client.test.ts` (existing — add cases)

**Interfaces:**
- Produces:
  - `type EditMode = "improve" | "shorter" | "longer" | "casual" | "professional"` (exported)
  - `GenerateParams` gains optional `editMode?: EditMode` and `existingDraft?: string`; `generateReview` forwards them in the POST body.
  - `editModeForAction(action: "improve" | "shorter" | "longer" | "casual" | "professional"): EditMode` — identity-style mapping (kept as a named export so screens import one source of truth).
  - `fireAssistantEvent(locationId: string, event: string, sessionId?: string | null): void` — best-effort POST to `/api/review-assistant/event` (sendBeacon with fetch fallback); never throws.
  - Keep `mapToneAction` exported (still used by `Regenerate`? No — see note) — REMOVE `mapToneAction` usage from transforms; `Regenerate` calls `generateReview` with no editMode. `mapToneAction` may be deleted if unused after Task 7; for this task just add the new exports.

- [ ] **Step 1: Write the failing test**

Append to `src/app/f/[slug]/ai-funnel/ai-client.test.ts`:
```ts
import { editModeForAction, generateReview } from "./ai-client.ts";

test("editModeForAction returns the matching edit mode", () => {
  assert.equal(editModeForAction("shorter"), "shorter");
  assert.equal(editModeForAction("professional"), "professional");
});
test("generateReview forwards editMode + existingDraft in the request body", async () => {
  const orig = globalThis.fetch;
  let sentBody: any = null;
  globalThis.fetch = (async (_url: string, init: any) => { sentBody = JSON.parse(init.body); return { ok: true, json: async () => ({ review: "Shorter.", sessionId: "s1" }) }; }) as any;
  try {
    const r = await generateReview({ locationId: "l", rating: 5, selectedPhrases: [], service: "", staffMember: "", notes: "", tone: "friendly", length: "detailed", sessionId: "s1", isRegenerate: false, editMode: "shorter", existingDraft: "long text here" });
    assert.equal(sentBody.editMode, "shorter");
    assert.equal(sentBody.existingDraft, "long text here");
    assert.equal(r.review, "Shorter.");
  } finally { globalThis.fetch = orig; }
});
```

- [ ] **Step 2: Run test, verify it fails**

Run: `node --import ./test-loader.mjs "src/app/f/[slug]/ai-funnel/ai-client.test.ts"`
Expected: FAIL (`editModeForAction` missing).

- [ ] **Step 3: Implement**

In `ai-client.ts`:
```ts
export type EditMode = "improve" | "shorter" | "longer" | "casual" | "professional";
export function editModeForAction(action: EditMode): EditMode { return action; }

export function fireAssistantEvent(locationId: string, event: string, sessionId?: string | null): void {
  try {
    const payload = JSON.stringify({ locationId, event, sessionId: sessionId ?? null });
    if (typeof navigator !== "undefined" && navigator.sendBeacon) {
      navigator.sendBeacon("/api/review-assistant/event", new Blob([payload], { type: "application/json" }));
    } else {
      void fetch("/api/review-assistant/event", { method: "POST", body: payload, headers: { "Content-Type": "application/json" }, keepalive: true });
    }
  } catch { /* best-effort */ }
}
```
Add `editMode?: EditMode;` and `existingDraft?: string;` to `GenerateParams`. `generateReview` already serializes the whole `p` object as the body (`JSON.stringify(p)`), so the new fields are forwarded automatically — confirm the body is `JSON.stringify(p)` (it is) and no change is needed to the fetch call.

- [ ] **Step 4: Run test, verify it passes**

Run: `node --import ./test-loader.mjs "src/app/f/[slug]/ai-funnel/ai-client.test.ts"`
Expected: PASS (existing ai-client tests still pass).

- [ ] **Step 5: Commit**

```bash
git add "src/app/f/[slug]/ai-funnel/ai-client.ts" "src/app/f/[slug]/ai-funnel/ai-client.test.ts"
git commit -m "feat(funnel): ai-client editMode params + assistant event helper"
```

---

### Task 6: state — persist draft fields + auto-generate guard

**Files:**
- Modify: `src/app/f/[slug]/ai-funnel/state.ts`
- Test: `src/app/f/[slug]/ai-funnel/state.test.ts` (existing — add cases)

**Interfaces:**
- Produces additions to `FunnelState` + `INITIAL_STATE`:
```ts
selectedVersion: "short" | "detailed";   // default "detailed"
tone: "friendly" | "professional" | "casual" | "enthusiastic"; // default "friendly"
length: "short" | "medium" | "detailed";  // default "detailed"
writingMode: "ai" | "manual";              // default "ai"
draftGenerated: boolean;                   // default false
```
  - `shouldAutoGenerate(state: Pick<FunnelState, "draftGenerated" | "writingMode">): boolean` → `!state.draftGenerated && state.writingMode === "ai"`.

- [ ] **Step 1: Write the failing test**

Append to `src/app/f/[slug]/ai-funnel/state.test.ts`:
```ts
import { shouldAutoGenerate, INITIAL_STATE } from "./state.ts";

test("auto-generates on first AI arrival", () => {
  assert.equal(shouldAutoGenerate({ draftGenerated: false, writingMode: "ai" }), true);
});
test("does not auto-generate once a draft exists", () => {
  assert.equal(shouldAutoGenerate({ draftGenerated: true, writingMode: "ai" }), false);
});
test("does not auto-generate in manual mode", () => {
  assert.equal(shouldAutoGenerate({ draftGenerated: false, writingMode: "manual" }), false);
});
test("INITIAL_STATE defaults: ai mode, not generated, detailed", () => {
  assert.equal(INITIAL_STATE.writingMode, "ai");
  assert.equal(INITIAL_STATE.draftGenerated, false);
  assert.equal(INITIAL_STATE.selectedVersion, "detailed");
});
```

- [ ] **Step 2: Run test, verify it fails**

Run: `node --import ./test-loader.mjs "src/app/f/[slug]/ai-funnel/state.test.ts"`
Expected: FAIL.

- [ ] **Step 3: Implement**

Add the 5 fields to the `FunnelState` interface and to `INITIAL_STATE` (`selectedVersion: "detailed"`, `tone: "friendly"`, `length: "detailed"`, `writingMode: "ai"`, `draftGenerated: false`). Add:
```ts
export function shouldAutoGenerate(state: { draftGenerated: boolean; writingMode: "ai" | "manual" }): boolean {
  return !state.draftGenerated && state.writingMode === "ai";
}
```

- [ ] **Step 4: Run test, verify it passes**

Run: `node --import ./test-loader.mjs "src/app/f/[slug]/ai-funnel/state.test.ts"`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add "src/app/f/[slug]/ai-funnel/state.ts" "src/app/f/[slug]/ai-funnel/state.test.ts"
git commit -m "feat(funnel): persist draft state + auto-generate guard"
```

---

### Task 7: Create Review screen (PosReview) + step labels

**Files:**
- Modify: `src/app/f/[slug]/ai-funnel/screens/positive.tsx` (`PosReview`)
- Modify: `src/app/f/[slug]/ai-funnel/ai-funnel-flow.tsx` (`FLOW.positive` labels)

**Interfaces:**
- Consumes: `shouldAutoGenerate`, lifted state fields (Task 6); `editModeForAction`, `fireAssistantEvent`, `generateReview` with `editMode`/`existingDraft` (Task 5); `buildReview` fallback (existing).

> No unit test (JSX). Gate: typecheck + build + Task 9 QA. Logic lives in the tested helpers.

- [ ] **Step 1: Update step labels**

In `ai-funnel-flow.tsx`, set `FLOW.positive` to:
```ts
  positive: [["pos-intro","Highlights"],["pos-details","Details"],["pos-review","Create Review"],["pos-confirm","Review & Edit"],["pos-celebrate","Copy & Post"]],
```

- [ ] **Step 2: Refactor `PosReview` per these rules**

In `screens/positive.tsx` `PosReview`:
1. **State source:** read `tab`/`tone`/`length` from `state.selectedVersion`/`state.tone`/`state.length` (via `set(...)`), NOT local `useState`. Keep a local `busy: string | null` for in-flight transform buttons and a local `loading` initialized to `shouldAutoGenerate(state)`.
2. **Mount effect:** replace the unconditional generate with: `useEffect(() => { if (!shouldAutoGenerate(state)) { setLoading(false); return; } /* run the existing first-generation (AI or buildReview fallback), then */ set({ draftGenerated: true }); setLoading(false); }, [])`. Use a `cancelled` guard. After a successful AI generation, also `fireAssistantEvent(props.locationId, "AI_DRAFT_ACCEPTED", state.sessionId)`.
3. **Editable textarea:** the active text is `state.writingMode === "manual" ? state.reviewLong : (state.selectedVersion === "short" ? state.reviewShort : state.reviewLong)`. Edits write back to that field via `set`. Placeholder: manual mode → "Tell others about your experience...", else the normal draft. Fire `AI_ASSIST_EDITED` (debounced/once) on first manual edit.
4. **Message above editor:** "We've created a review based on what you shared. Use it as-is, edit it, or start from scratch if you'd rather write your own."
5. **Tabs (AI mode only):** Short/Detailed set `state.selectedVersion`. Hidden in manual mode.
6. **Transform buttons** (`Make Shorter`/`Make Longer`/`More Casual`/`More Professional`, plus `Improve Writing` in manual mode): each calls `generateReview({ ...baseParams, editMode: editModeForAction(<mode>), existingDraft: <current active text>, isRegenerate: false })`; on success replace ONLY the active text with `result.review` (fallback: leave text unchanged on `usedFallback`). Fire nothing extra client-side (route emits TOOL_USED). Set `busy` during the call.
7. **Regenerate** (AI mode only): calls `generateReview({ ...baseParams, isRegenerate: true })` (no editMode) — from-scratch; replaces the draft. Keep existing behavior.
8. **Toolbars:** AI mode shows `Regenerate, Make Shorter, Make Longer, More Casual, More Professional` (secondary/outlined). Manual mode shows `Improve Writing, Make Shorter, Make Longer, More Casual, More Professional` (no Regenerate). Respect existing `props.ai.allowTone/allowLength/allowRegenerate` gating.
9. **Primary "✍️ Start From Scratch" button** (AI mode only, filled `BigBtn variant="primary"`): opens a confirm dialog (local `useState` `confirmOpen`). Dialog: title "Start with a blank review?", body "Your current AI draft will be cleared. You can always generate another draft later if you'd like.", buttons **Start Blank** / **Cancel**. On **Start Blank**: `set({ reviewLong: "", reviewShort: "", writingMode: "manual", selectedVersion: "detailed" })`, close dialog, focus the textarea (ref), and `fireAssistantEvent(props.locationId, "START_FROM_SCRATCH_SELECTED", state.sessionId)` + `fireAssistantEvent(props.locationId, "MANUAL_WRITING_STARTED", state.sessionId)`. Render the dialog as a simple absolutely-positioned overlay using existing tokens (`--ink-*`, `--accent`, `--shadow-pop`); no new dependency.
10. **Continue button:** "Looks good" / "Continue" → ensure `reviewLong` holds the active text (if `selectedVersion === "short"` and AI mode, `set({ reviewLong: state.reviewShort })`), then `go("pos-confirm")`.

- [ ] **Step 3: Verify**

Run: `npm run typecheck`
Expected: no NEW errors.

- [ ] **Step 4: Commit**

```bash
git add "src/app/f/[slug]/ai-funnel/screens/positive.tsx" "src/app/f/[slug]/ai-funnel/ai-funnel-flow.tsx"
git commit -m "feat(funnel): Create Review workspace — persist draft, text-op transforms, Start From Scratch"
```

---

### Task 8: Review & Edit screen (PosConfirm becomes editable)

**Files:**
- Modify: `src/app/f/[slug]/ai-funnel/screens/positive.tsx` (`PosConfirm`)

**Interfaces:**
- Consumes: `fireAssistantEvent` (Task 5); `state.reviewLong`.

> No unit test (JSX). Gate: typecheck + build + QA.

- [ ] **Step 1: Make `PosConfirm` an editable workspace**

Rewrite `PosConfirm` so it:
- Takes `{ props, state, set, go }` (no longer `_props`/`_set`).
- Renders an **editable** `textarea` bound to `state.reviewLong` (`onChange` → `set({ reviewLong: e.target.value })`), styled with the existing `fk-textarea`/review-card classes. Heading "Does this reflect your experience?" / sub "Make any final edits — you own every word." (keep supportive copy).
- NO AI toolbar / tabs / Start From Scratch.
- Buttons: **Back** (`variant="secondary"` → `go("pos-review")`) and **Copy Review** (primary → fire `fireAssistantEvent(props.locationId, "MANUAL_REVIEW_COMPLETED", state.sessionId)` then `go("pos-celebrate")`).
- Fire `AI_ASSIST_EDITED` once on first edit here (optional; debounced) — reuse the same pattern as Task 7.

- [ ] **Step 2: Verify**

Run: `npm run typecheck && npm run build`
Expected: no NEW errors; build compiles.

- [ ] **Step 3: Commit**

```bash
git add "src/app/f/[slug]/ai-funnel/screens/positive.tsx"
git commit -m "feat(funnel): Review & Edit — editable final workspace, no AI toolbar"
```

---

### Task 9: Full verification + manual QA

**Files:** none.

- [ ] **Step 1: Full automated gate**

Run:
```bash
find "src/app/f/[slug]" -name "*.test.ts" -print0 | while IFS= read -r -d '' f; do echo "== $f"; node --import ./test-loader.mjs "$f" || exit 1; done
node --import ./test-loader.mjs --test "src/lib/**/*.test.ts" "src/app/campaign-wizard/**/*.test.ts"
npm run typecheck
npm run lint
npm run build
```
Expected: all funnel + lib tests pass; no NEW type/lint errors beyond baseline; build compiles.

- [ ] **Step 2: Manual QA (dev server, both routes)**

`npm run dev`, then for an `AI_GUIDED` `/f/[slug]` location AND a campaign `/r/[token]/assist` (rate 4–5★):
- [ ] Step 3 labeled **Create Review**; auto-generates once on first arrival.
- [ ] Edit the draft, go **Back** to Details, return → the EDITED text is intact (no regeneration; network shows no `/generate` call on return).
- [ ] **Make Shorter** after editing → shortens the EDITED text (not a fresh chips-based review); network shows `/generate` with `editMode:"shorter"` + `existingDraft`.
- [ ] **Regenerate** → fresh review from highlights.
- [ ] **Start From Scratch** → confirm dialog → Start Blank clears editor, manual placeholder, AI toolbar loses Regenerate, keeps Improve/Shorter/Longer/Casual/Professional; those transform the manual text.
- [ ] Step 4 labeled **Review & Edit**: editable textarea, NO AI buttons, Back + Copy Review.
- [ ] **Copy & Post** unchanged (clipboard + confetti + destinations).
- [ ] Analytics: network shows `/api/review-assistant/event` for `START_FROM_SCRATCH_SELECTED`, `MANUAL_WRITING_STARTED`, `MANUAL_REVIEW_COMPLETED`, `AI_DRAFT_ACCEPTED`; `/generate` emits TOOL_USED for transforms (DB check optional).
- [ ] Negative flow + rating capture unchanged.

- [ ] **Step 3: Finish**

Use `superpowers:finishing-a-development-branch`.

---

## Self-Review

**Spec coverage:** step labels (T7) · persist draft/no-regen-on-nav (T6 + T7 mount guard) · Create Review workspace + message + toolbar + Start From Scratch dialog + manual mode (T7) · transforms on current text / Regenerate from-scratch (T3,T4,T5,T7) · Review & Edit editable, no toolbar (T8) · Copy & Post unchanged (untouched) · API extension editMode/existingDraft (T3,T4,T5) · analytics enum migration + events + client endpoint (T1,T2,T4,T5,T7,T8) · both routes (shared flow) · testing (per-task + T9). ✓

**Placeholder scan:** every code step has concrete content; screen tasks give exact behavior rules + the helpers they call. ✓

**Type consistency:** `EditMode`/`editModeForAction`/`fireAssistantEvent` (T5) consumed by T7/T8; `AssistantEditMode`/`editMode`/`existingDraft` (T3) consumed by T4; `shouldAutoGenerate` + lifted fields (T6) consumed by T7; enum members (T1) consumed by T2/T4. `reviewLong` is the canonical final doc across T7/T8. ✓

**Testing convention:** bracket-dir funnel tests run directly; `src/lib` tests use `--test`; `.tsx` screens gated by typecheck/build. ✓
