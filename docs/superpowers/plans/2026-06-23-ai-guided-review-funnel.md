# AI-Guided Review Funnel Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Ship the Claude Design "Review Funnel" prototype as a new opt-in `AI_GUIDED` funnel style on `/f/[slug]`, wired to the app's existing Gemini assistant + routing + persistence.

**Architecture:** A `funnelStyle` flag on `LocationPublicProfile` selects between the existing `FunnelRatingForm` (`SIMPLE`) and a new client-side state-machine funnel (`AI_GUIDED`). The new funnel is a faithful React/TS port of `funnel-kit.jsx` + `funnel-positive.jsx` + `funnel-negative.jsx` + `review-funnel.jsx` (minus the prototype preview toolbar), styled by a scoped stylesheet, calling existing endpoints `/api/review-assistant/generate` (positive) and `/api/customer-resolution/rewrite` (negative), and persisting via existing server actions.

**Tech Stack:** Next.js 16 (App Router), React 19, TypeScript, Prisma (Postgres/Neon), Gemini 2.5 Flash (already integrated), `lucide-react`.

## Global Constraints

- **DB changes ship as committed Prisma migrations only.** Prod = Neon, local = Supabase; they have drifted. Never edit `schema.prisma` fields without a matching `prisma/migrations/*` file. New columns must be additive (`ADD COLUMN ... DEFAULT ...`). (Source: CLAUDE.md.)
- **Funnel style values:** `"SIMPLE" | "AI_GUIDED"`, default `"SIMPLE"`. The `SIMPLE` path must remain behaviorally unchanged.
- **Never gate/suppress reviews.** Negative-flow copy stays supportive and states feedback is private to the business. No "leave a public review only if happy" language.
- **AI is always degradable.** Any AI call that 4xx/5xx/times out falls back to the local deterministic generator; never block the customer.
- **Reuse, do not rebuild:** Gemini generation (`src/lib/review-assistant.ts`, `/api/review-assistant/generate`), feedback rewrite (`/api/customer-resolution/rewrite`), routing (`src/lib/review-routing.ts`), persistence (`src/app/f/[slug]/actions.ts`), icons (`src/components/icon.tsx`).

### Testing Convention (THIS REPO — overrides any framework habits)

- **Runner:** Node's built-in `node:test` + `node:assert/strict`. There is NO Vitest/Jest/@testing-library/jsdom. Do NOT add any.
- **Run a test file:** `node --import ./test-loader.mjs --test src/path/to/file.test.ts` (Node 23, native TS stripping; the loader maps `@/` aliases and stubs `@/lib/prisma` + `@prisma/client`).
- **GOTCHA — bracket route dirs:** `--test` glob-expands its argument, and `[slug]` is a glob character class, so `--test "src/app/f/[slug]/…"` matches NOTHING (reports `tests 0`). For any test file under a bracketed dir, run the file **directly without `--test`**: `node --import ./test-loader.mjs "src/app/f/[slug]/ai-funnel/foo.test.ts"` — `node:test` auto-runs the registered tests. (Files under non-bracket dirs like `src/lib/` and `src/app/campaign-wizard/` use the normal `--test` form.)
- **Test file shape** (copy this style):
  ```ts
  import test from "node:test";
  import assert from "node:assert/strict";
  import { fn } from "./module.ts";           // NOTE: explicit .ts extension
  test("describes behavior", () => { assert.equal(fn(x), y); });
  ```
- **Only pure `.ts` logic is unit-tested.** JSX/`.tsx` modules cannot be imported by the runner (it strips types, not JSX) — so React components are NOT unit-tested. They are verified by `npm run typecheck` + `npm run build` + the manual QA in the final task. Push any real logic out of components into pure `.ts` helpers so it can be tested.
- **Mocking `fetch`:** swap `globalThis.fetch` inside the test and restore it in a `finally`. No mock library.
- **Gate per task:** the task's own `*.test.ts` passes AND `npm run typecheck` reports no NEW errors. Run `npm run build` on tasks that add/modify `.tsx` or routes (Tasks 6–11).

### Universal port conversions (apply to every ported JSX file)

1. Remove `const { useState: useStateXX } = React;` aliases; use `import { useState, useEffect, useRef } from "react"`.
2. Remove every `Object.assign(window, {...})`; use ES module exports.
3. Replace the prototype global `<Icon name="..." />` with `import { Icon } from "@/components/icon"` (Task 2 adds missing names).
4. Inline `style={{...}}`, `className`, `data-active` attributes port as-is.
5. Add TypeScript prop types (interfaces given per task).
6. The funnel is `"use client"`; only `page.tsx` and `build-props.ts` run on the server.

### Source of truth for ported UI

Claude Design project `ea7ffe00-7521-4009-9487-db4786b9677c`. Fetch a file's exact content with the DesignSync tool (`method: get_file`, `path: "<name>"`). Files: `funnel-kit.jsx`, `funnel-positive.jsx`, `funnel-negative.jsx`, `review-funnel.jsx`, `Review Funnel.html` (inline `fk-*` CSS), `styles.css` (tokens), `components.jsx` (`Icon`/`Stars`/`Avatar`).

---

### Task 1: `funnelStyle` column + normalizer

**Files:**
- Modify: `prisma/schema.prisma` (LocationPublicProfile model, near `funnelRatingStyle`)
- Create: `prisma/migrations/20260623130000_add_funnel_style/migration.sql`
- Create: `src/lib/funnel-style.ts`
- Test: `src/lib/funnel-style.test.ts`

**Interfaces:**
- Produces: `type FunnelStyle = "SIMPLE" | "AI_GUIDED"`; `normalizeFunnelStyle(v: unknown): FunnelStyle`; `isFunnelStyle`; `FUNNEL_STYLES`; `DEFAULT_FUNNEL_STYLE`.

- [ ] **Step 1: Write the failing test**

```ts
// src/lib/funnel-style.test.ts
import test from "node:test";
import assert from "node:assert/strict";
import { normalizeFunnelStyle, DEFAULT_FUNNEL_STYLE } from "./funnel-style.ts";

test("accepts AI_GUIDED", () => assert.equal(normalizeFunnelStyle("AI_GUIDED"), "AI_GUIDED"));
test("accepts SIMPLE", () => assert.equal(normalizeFunnelStyle("SIMPLE"), "SIMPLE"));
test("falls back to default for junk", () => assert.equal(normalizeFunnelStyle("nope"), DEFAULT_FUNNEL_STYLE));
test("falls back to default for null", () => assert.equal(normalizeFunnelStyle(null), "SIMPLE"));
```

- [ ] **Step 2: Run test, verify it fails**

Run: `node --import ./test-loader.mjs --test src/lib/funnel-style.test.ts`
Expected: FAIL (cannot find module `./funnel-style.ts`).

- [ ] **Step 3: Implement the normalizer**

```ts
// src/lib/funnel-style.ts
export const FUNNEL_STYLES = ["SIMPLE", "AI_GUIDED"] as const;
export type FunnelStyle = (typeof FUNNEL_STYLES)[number];
export const DEFAULT_FUNNEL_STYLE: FunnelStyle = "SIMPLE";

export function isFunnelStyle(v: unknown): v is FunnelStyle {
  return typeof v === "string" && (FUNNEL_STYLES as readonly string[]).includes(v);
}
export function normalizeFunnelStyle(v: unknown): FunnelStyle {
  return isFunnelStyle(v) ? v : DEFAULT_FUNNEL_STYLE;
}
```

- [ ] **Step 4: Add the schema field**

In `prisma/schema.prisma`, in `model LocationPublicProfile`, directly under `funnelRatingStyle String?` add:

```prisma
  funnelStyle          String      @default("SIMPLE")   // SIMPLE | AI_GUIDED
```

- [ ] **Step 5: Write the migration SQL**

```sql
-- prisma/migrations/20260623130000_add_funnel_style/migration.sql
ALTER TABLE "LocationPublicProfile" ADD COLUMN "funnelStyle" TEXT NOT NULL DEFAULT 'SIMPLE';
```

- [ ] **Step 6: Regenerate client + run test + typecheck**

Run: `npx prisma generate`
Then: `node --import ./test-loader.mjs --test src/lib/funnel-style.test.ts`
Then: `npm run typecheck`
Expected: test PASS; `prisma generate` succeeds; no NEW type errors. (Do NOT run `prisma db push`/`migrate deploy` — prod migration applies at deploy per CLAUDE.md.)

- [ ] **Step 7: Commit**

```bash
git add prisma/schema.prisma prisma/migrations/20260623130000_add_funnel_style src/lib/funnel-style.ts src/lib/funnel-style.test.ts
git commit -m "feat(funnel): add funnelStyle column + normalizer"
```

---

### Task 2: Extend the icon map with funnel icon names

**Files:**
- Modify: `src/components/icon.tsx`

**Interfaces:**
- Produces: `IconName` extended with `'bolt' | 'heart' | 'lock' | 'clock' | 'fileText' | 'edit' | 'info' | 'lightbulb' | 'refresh' | 'award' | 'arrowDown'`. (Prototype `sparkle` → existing `sparkles`; `chat` already exists.)

> No unit test: `icon.tsx` is JSX and cannot be imported by `node:test`. Verified by `npm run typecheck` (the `IconName` union + exhaustive `iconMap`) and `npm run build`.

- [ ] **Step 1: Add imports, union members, and map entries**

In `src/components/icon.tsx`: add to the `lucide-react` import — `Zap, Heart, Lock, Clock, FileText, Pencil, Info, Lightbulb, RefreshCw, Award, ArrowDown`. Append to the `IconName` union: `| 'bolt' | 'heart' | 'lock' | 'clock' | 'fileText' | 'edit' | 'info' | 'lightbulb' | 'refresh' | 'award' | 'arrowDown'`. Append to `iconMap`:

```tsx
  bolt: Zap,
  heart: Heart,
  lock: Lock,
  clock: Clock,
  fileText: FileText,
  edit: Pencil,
  info: Info,
  lightbulb: Lightbulb,
  refresh: RefreshCw,
  award: Award,
  arrowDown: ArrowDown,
```

- [ ] **Step 2: Verify**

Run: `npm run typecheck`
Expected: no NEW errors (the `iconMap: Record<IconName, LucideIcon>` annotation forces every new union member to have a map entry — a missing one fails here).

- [ ] **Step 3: Commit**

```bash
git add src/components/icon.tsx
git commit -m "feat(icon): add funnel icon names"
```

---

### Task 3: Fallback text generators (pure functions)

**Files:**
- Create: `src/app/f/[slug]/ai-funnel/fallback-text.ts`
- Test: `src/app/f/[slug]/ai-funnel/fallback-text.test.ts`

**Interfaces:**
- Produces:
  - `interface FunnelBusiness { name: string; location: string }`
  - `buildReview(input: { chips: string[]; service: string; helper: string; extra: string }, biz: FunnelBusiness, variant?: "short" | "detailed", tone?: "balanced" | "casual" | "professional"): string`
  - `clarifyFeedback(text: string, issues: string[], biz: FunnelBusiness): string`

Port the exact bodies of `buildReview`, `clarifyFeedback`, `joinNice`, `capitalize` from design file `funnel-kit.jsx`. Only change: the prototype reads a module-global `BIZ`; here pass `biz` explicitly (`BIZ.name` → `biz.name`, `BIZ.location` → `biz.location`).

- [ ] **Step 1: Write the failing test**

```ts
// src/app/f/[slug]/ai-funnel/fallback-text.test.ts
import test from "node:test";
import assert from "node:assert/strict";
import { buildReview, clarifyFeedback } from "./fallback-text.ts";

const biz = { name: "NOVA Advertising", location: "Fairfax, VA" };

test("buildReview names the business and is non-trivial", () => {
  const r = buildReview({ chips: ["Highly Recommend"], service: "Local SEO", helper: "", extra: "" }, biz, "detailed");
  assert.ok(r.includes("NOVA Advertising"));
  assert.ok(r.length > 40);
});
test("buildReview short variant is non-empty", () => {
  assert.ok(buildReview({ chips: [], service: "", helper: "", extra: "" }, biz, "short").length > 0);
});
test("clarifyFeedback tidies provided text and keeps meaning", () => {
  const r = clarifyFeedback("they were late and billing was wrong", ["Billing Concern"], biz);
  assert.ok(r.toLowerCase().includes("billing"));
});
test("clarifyFeedback handles empty text using issues", () => {
  assert.ok(clarifyFeedback("", ["Long Wait Time"], biz).includes("NOVA Advertising"));
});
```

- [ ] **Step 2: Run test, verify it fails**

Run: `node --import ./test-loader.mjs "src/app/f/[slug]/ai-funnel/fallback-text.test.ts"`
Expected: FAIL (module not found).

- [ ] **Step 3: Implement by porting from `funnel-kit.jsx`**

Fetch `funnel-kit.jsx`. Copy `joinNice`, `capitalize`, `buildReview`, `clarifyFeedback` verbatim; add the `biz` parameter as above; add the TS types from Interfaces; `export` `buildReview` and `clarifyFeedback`.

- [ ] **Step 4: Run test, verify it passes**

Run: `node --import ./test-loader.mjs "src/app/f/[slug]/ai-funnel/fallback-text.test.ts"`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add "src/app/f/[slug]/ai-funnel/fallback-text.ts" "src/app/f/[slug]/ai-funnel/fallback-text.test.ts"
git commit -m "feat(funnel): port deterministic fallback generators"
```

---

### Task 4: Server-side prop derivation

**Files:**
- Create: `src/app/f/[slug]/ai-funnel/build-props.ts`
- Test: `src/app/f/[slug]/ai-funnel/build-props.test.ts`

**Interfaces:**
- Consumes: helpers from `src/lib/review-routing.ts` (`resolveHighRating`, `destinationExternalUrl`, `destinationLabel`) and `src/lib/locations.ts` (`buildGoogleWriteReviewLink`).
- Produces:
```ts
export interface FunnelDestination { id: string; label: string; url: string | null; glyph: string; color: string; preferred: boolean; isInternal: boolean }
export interface AiFunnelProps {
  slug: string; locationId: string; embed: boolean; threshold: number;
  business: { name: string; location: string; logoUrl: string | null; initial: string; hue: number };
  destinations: FunnelDestination[];
  stoodOut: string[]; services: string[]; issues: string[];
  ai: { reviewEnabled: boolean; allowNotes: boolean; allowTone: boolean; allowLength: boolean; allowRegenerate: boolean; includeService: boolean; clarifyEnabled: boolean };
}
export function buildAiFunnelProps(location: any /* LocationWithProfile */, opts: { slug: string; embed: boolean }): AiFunnelProps
```

Mapping rules (defaults from prototype constants in `funnel-kit.jsx`):
- `business.name` = `location.name`; `business.location` = `[location.city, location.state].filter(Boolean).join(", ")`; `logoUrl` = `profile.logoUrl ?? null`; `initial` = first char of `location.name` uppercased (fallback `"?"`); `hue` = `187`.
- `destinations`: `resolveHighRating(profile.highRatingMode, profile.highRatingDestinations, profile.highRatingPrimaryDestination)`. For single → one destination; for choice → the ordered list (primary first). Map each `dest` to `{ id: dest.toLowerCase(), label: destinationLabel(dest), url: destinationExternalUrl(dest, ctx), glyph, color, preferred: index===0, isInternal: dest==="WEHEARYOU" }`. `ctx = { googleReviewLink: location.reviewLink ?? buildGoogleWriteReviewLink(location.googlePlaceId), facebookReviewUrl: profile.facebookReviewUrl, customReviewUrl: profile.customReviewUrl }`. Glyph/color: GOOGLE `{glyph:"G",color:"var(--src-google)"}`, FACEBOOK `{glyph:"f",color:"var(--src-facebook)"}`, WEHEARYOU `{glyph:"W",color:"var(--accent)"}`, CUSTOM `{glyph:"★",color:"var(--src-trustpilot)"}`.
- `stoodOut` = `profile.aiAssistantCustomChips.length ? [...profile.aiAssistantCustomChips] : [...DEFAULT_STOOD_OUT]`; then prepend up to 4 of `profile.reviewHighlights` not already present (dedupe, preserve order).
- `services` = `profile.services.length ? [...profile.services] : [...DEFAULT_SERVICES]`.
- `issues` = `[...DEFAULT_ISSUES]`.
- `ai.reviewEnabled` = `!!(profile.aiAssistantEnabled && profile.aiAssistantAllowGeneration)`; `allowNotes/allowTone/allowLength/allowRegenerate/includeService` from the matching `aiAssistant*` booleans; `clarifyEnabled` = `true` (the rewrite route self-guards on resolution settings; client falls back on 403).
- Copy `DEFAULT_STOOD_OUT`, `DEFAULT_SERVICES`, `DEFAULT_ISSUES` from the `STOOD_OUT`, `SERVICES`, `ISSUES` arrays in `funnel-kit.jsx`.

> Import note: if importing `@/lib/locations` pulls in un-stubbable modules under the test loader, import only `buildGoogleWriteReviewLink` (it is a pure string builder). If even that fails to import cleanly, inline a 3-line equivalent in `build-props.ts` and leave a `// mirror of buildGoogleWriteReviewLink` comment. The test below must run without a DB.

- [ ] **Step 1: Write the failing test**

```ts
// src/app/f/[slug]/ai-funnel/build-props.test.ts
import test from "node:test";
import assert from "node:assert/strict";
import { buildAiFunnelProps } from "./build-props.ts";

const baseLocation = {
  id: "loc1", name: "NOVA Advertising", city: "Fairfax", state: "VA",
  reviewLink: "https://g.page/r/abc/review", googlePlaceId: null,
  publicProfile: {
    negativeFilterThreshold: 4, highRatingMode: "SINGLE", highRatingDestinations: ["GOOGLE"],
    highRatingPrimaryDestination: null, facebookReviewUrl: null, customReviewUrl: null,
    logoUrl: null, aiAssistantCustomChips: [], reviewHighlights: ["Clear communication"],
    services: [], aiAssistantEnabled: true, aiAssistantAllowGeneration: true,
    aiAssistantAllowNotes: true, aiAssistantAllowTone: true, aiAssistantAllowLength: true,
    aiAssistantAllowRegenerate: true, aiAssistantIncludeService: true,
  },
};

test("derives business + threshold", () => {
  const p = buildAiFunnelProps(baseLocation, { slug: "nova", embed: false });
  assert.equal(p.business.name, "NOVA Advertising");
  assert.equal(p.business.location, "Fairfax, VA");
  assert.equal(p.threshold, 4);
});
test("builds the google destination with its url, marked preferred", () => {
  const p = buildAiFunnelProps(baseLocation, { slug: "nova", embed: false });
  assert.equal(p.destinations[0].id, "google");
  assert.equal(p.destinations[0].preferred, true);
  assert.equal(p.destinations[0].url, "https://g.page/r/abc/review");
});
test("seeds stoodOut with review highlights", () => {
  const p = buildAiFunnelProps(baseLocation, { slug: "nova", embed: false });
  assert.ok(p.stoodOut.includes("Clear communication"));
});
test("turns AI off when generation disabled", () => {
  const loc = { ...baseLocation, publicProfile: { ...baseLocation.publicProfile, aiAssistantAllowGeneration: false } };
  assert.equal(buildAiFunnelProps(loc, { slug: "nova", embed: false }).ai.reviewEnabled, false);
});
```

- [ ] **Step 2: Run test, verify it fails**

Run: `node --import ./test-loader.mjs "src/app/f/[slug]/ai-funnel/build-props.test.ts"`
Expected: FAIL (module not found).

- [ ] **Step 3: Implement `build-props.ts`** per Interfaces + mapping rules.

- [ ] **Step 4: Run test, verify it passes**

Run: `node --import ./test-loader.mjs "src/app/f/[slug]/ai-funnel/build-props.test.ts"`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add "src/app/f/[slug]/ai-funnel/build-props.ts" "src/app/f/[slug]/ai-funnel/build-props.test.ts"
git commit -m "feat(funnel): server-side AI funnel prop derivation"
```

---

### Task 5: Client AI helpers (endpoint calls + param mapping + fallback)

**Files:**
- Create: `src/app/f/[slug]/ai-funnel/ai-client.ts`
- Test: `src/app/f/[slug]/ai-funnel/ai-client.test.ts`

**Interfaces:**
- Produces:
```ts
export type ToneAction = "regen" | "shorter" | "longer" | "casual" | "professional";
export type AssistantTone = "friendly" | "professional" | "casual" | "enthusiastic";
export type AssistantLength = "short" | "medium" | "detailed";
export interface GenerateParams {
  locationId: string; rating: number; selectedPhrases: string[];
  service: string; staffMember: string; notes: string;
  tone: AssistantTone; length: AssistantLength; sessionId: string | null; isRegenerate: boolean;
}
export function mapToneAction(action: ToneAction, cur: { tone: AssistantTone; length: AssistantLength }): { tone: AssistantTone; length: AssistantLength; isRegenerate: boolean };
export function generateReview(p: GenerateParams): Promise<{ review: string; sessionId: string | null; usedFallback: boolean }>;
export function clarifyFeedbackRemote(locationId: string, feedback: string, issues: string[]): Promise<{ rewritten: string; usedFallback: boolean }>;
```

Behavior:
- `mapToneAction`: `shorter`→`length:"short"`; `longer`→`length:"detailed"`; `casual`→`tone:"casual"`; `professional`→`tone:"professional"`; `regen`→unchanged tone/length, `isRegenerate:true`. Non-regen actions set `isRegenerate:false` and keep the other field unchanged.
- `generateReview`: `POST /api/review-assistant/generate` with the params as JSON. On `res.ok`: return `{ review: data.review, sessionId: data.sessionId ?? p.sessionId, usedFallback:false }`. On any non-ok response OR thrown error: return `{ review: "", sessionId: p.sessionId, usedFallback:true }` (the caller supplies local fallback text; this module stays free of `biz`).
- `clarifyFeedbackRemote`: `POST /api/customer-resolution/rewrite` with `{ locationId, feedback, issueCategories: issues }`. On ok: `{ rewritten: data.rewritten, usedFallback:false }`; else/throw: `{ rewritten:"", usedFallback:true }`.

- [ ] **Step 1: Write the failing test**

```ts
// src/app/f/[slug]/ai-funnel/ai-client.test.ts
import test from "node:test";
import assert from "node:assert/strict";
import { mapToneAction, generateReview, clarifyFeedbackRemote } from "./ai-client.ts";

const cur = { tone: "friendly" as const, length: "medium" as const };
const base = { locationId:"l", rating:5, selectedPhrases:[], service:"", staffMember:"", notes:"", tone:"friendly" as const, length:"medium" as const, sessionId:null, isRegenerate:false };

test("mapToneAction shorter sets length short", () => assert.equal(mapToneAction("shorter", cur).length, "short"));
test("mapToneAction professional sets tone", () => assert.equal(mapToneAction("professional", cur).tone, "professional"));
test("mapToneAction regen flags regenerate, keeps tone/length", () => {
  const r = mapToneAction("regen", cur);
  assert.equal(r.tone, "friendly"); assert.equal(r.length, "medium"); assert.equal(r.isRegenerate, true);
});

test("generateReview returns review on ok", async () => {
  const orig = globalThis.fetch;
  globalThis.fetch = (async () => ({ ok: true, json: async () => ({ review: "Great!", sessionId: "s1" }) })) as any;
  try {
    const r = await generateReview(base);
    assert.equal(r.review, "Great!"); assert.equal(r.sessionId, "s1"); assert.equal(r.usedFallback, false);
  } finally { globalThis.fetch = orig; }
});
test("generateReview flags fallback on 403", async () => {
  const orig = globalThis.fetch;
  globalThis.fetch = (async () => ({ ok: false, status: 403, json: async () => ({ error: "x" }) })) as any;
  try { assert.equal((await generateReview(base)).usedFallback, true); }
  finally { globalThis.fetch = orig; }
});
test("clarifyFeedbackRemote flags fallback on network error", async () => {
  const orig = globalThis.fetch;
  globalThis.fetch = (async () => { throw new Error("net"); }) as any;
  try { assert.equal((await clarifyFeedbackRemote("l","text",[])).usedFallback, true); }
  finally { globalThis.fetch = orig; }
});
```

- [ ] **Step 2: Run test, verify it fails**

Run: `node --import ./test-loader.mjs "src/app/f/[slug]/ai-funnel/ai-client.test.ts"`
Expected: FAIL (module not found).

- [ ] **Step 3: Implement `ai-client.ts`** per Interfaces + Behavior.

- [ ] **Step 4: Run test, verify it passes**

Run: `node --import ./test-loader.mjs "src/app/f/[slug]/ai-funnel/ai-client.test.ts"`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add "src/app/f/[slug]/ai-funnel/ai-client.ts" "src/app/f/[slug]/ai-funnel/ai-client.test.ts"
git commit -m "feat(funnel): client AI helpers with fallback"
```

---

### Task 6: Funnel state types + routing helper + scoped styles + shared UI kit

**Files:**
- Create: `src/app/f/[slug]/ai-funnel/state.ts` (pure types + routing helper — UNIT TESTED)
- Create: `src/app/f/[slug]/ai-funnel/funnel.css`
- Create: `src/app/f/[slug]/ai-funnel/kit.tsx`
- Test: `src/app/f/[slug]/ai-funnel/state.test.ts`

**Interfaces:**
- Produces in `state.ts`:
```ts
export type ScreenId = "rating" | "pos-intro" | "pos-details" | "pos-review" | "pos-confirm" | "pos-celebrate"
  | "neg-intro" | "neg-issues" | "neg-feedback" | "neg-clarify" | "neg-confirm" | "neg-submitted";
export interface FunnelState {
  rating: number; chips: string[]; service: string; helper: string; extra: string;
  reviewShort: string; reviewLong: string; sessionId: string | null;
  issues: string[]; feedback: string; better: string; contact: "" | "email" | "phone" | "no";
  contactValue: string; feedbackClarified: string; feedbackFinal: string;
}
export const INITIAL_STATE: FunnelState;
export function nextFromRating(rating: number, threshold: number): ScreenId;  // rating>=threshold → "pos-intro" else "neg-intro"
export function contactSummary(state: FunnelState): string; // "" when contact is "" | "no"; else `${contact}:${contactValue}`
```
- Produces in `kit.tsx` (all `"use client"`): `ScreenCard`, `BigBtn`, `ActionPill`, `FChip`, `ChipWrap`, `StepLabel`, `Stepper`, `StarPicker`, `AiThinking`, `Confetti`, `SuccessCheck`, `BizHeader`, `Avatar`, `Stars`, `RATING_LABELS`. Prop types as called in screens (e.g. `BigBtn: { children: React.ReactNode; onClick?: () => void; variant?: "primary"|"secondary"|"ghost"; disabled?: boolean; full?: boolean; icon?: IconName; style?: React.CSSProperties }`; `StarPicker: { value: number; onChange: (n:number)=>void }`; `FChip: { label:string; active:boolean; onClick:()=>void }`; `BizHeader: { biz: { name:string; location:string; initial:string; hue:number; logoUrl:string|null }; size?: "md"|"lg" }`).

Porting notes:
- `funnel.css` = the full `<style>` block from `Review Funnel.html` (the `fk-*` rules) PLUS, from `styles.css`: the `:root` token block, `.tap`, `.eyebrow`, `.badge`+`.badge-accent`, `.anim-up`, `@keyframes fadeUp`/`pop`, and the reduced-motion rule. Also append the three keyframes the prototype injects at runtime (`fkspin`, `fkpop`, `fkdraw`). Prepend the Geist font `@import`. These classes are funnel-local (only imported here).
- `kit.tsx`: `import "./funnel.css"` at top. Port the listed components from `funnel-kit.jsx` + `Stars`/`Avatar` from `components.jsx`, applying the universal conversions + typed props. Replace `BIZ.*` globals with the `biz` prop. In `BizHeader`, when `biz.logoUrl` is set, render an `<img src={biz.logoUrl} .../>` instead of the initial block. DELETE the runtime `document.createElement("style")` block (now in `funnel.css`).

- [ ] **Step 1: Write the failing test (state helper)**

```ts
// src/app/f/[slug]/ai-funnel/state.test.ts
import test from "node:test";
import assert from "node:assert/strict";
import { nextFromRating, contactSummary, INITIAL_STATE } from "./state.ts";

test("rating at/above threshold routes positive", () => assert.equal(nextFromRating(4, 4), "pos-intro"));
test("rating below threshold routes negative", () => assert.equal(nextFromRating(2, 4), "neg-intro"));
test("contactSummary empty when no contact", () => assert.equal(contactSummary({ ...INITIAL_STATE, contact: "" }), ""));
test("contactSummary empty when contact is no", () => assert.equal(contactSummary({ ...INITIAL_STATE, contact: "no" }), ""));
test("contactSummary formats email", () => assert.equal(contactSummary({ ...INITIAL_STATE, contact: "email", contactValue: "a@b.co" }), "email:a@b.co"));
```

- [ ] **Step 2: Run test, verify it fails**

Run: `node --import ./test-loader.mjs "src/app/f/[slug]/ai-funnel/state.test.ts"`
Expected: FAIL (module not found).

- [ ] **Step 3: Implement `state.ts`**, then create `funnel.css` and `kit.tsx` per porting notes.

- [ ] **Step 4: Run test + typecheck + build**

Run: `node --import ./test-loader.mjs "src/app/f/[slug]/ai-funnel/state.test.ts"`
Then: `npm run typecheck`
Expected: test PASS; no NEW type errors. (Build is exercised in Task 11 once the route renders the kit.)

- [ ] **Step 5: Commit**

```bash
git add "src/app/f/[slug]/ai-funnel/state.ts" "src/app/f/[slug]/ai-funnel/state.test.ts" "src/app/f/[slug]/ai-funnel/funnel.css" "src/app/f/[slug]/ai-funnel/kit.tsx"
git commit -m "feat(funnel): state types + routing helper + scoped styles + UI kit"
```

---

### Task 7: Positive-flow screens

**Files:**
- Create: `src/app/f/[slug]/ai-funnel/screens/positive.tsx`

**Interfaces:**
- Consumes: kit (Task 6), `AiFunnelProps` (Task 4), `generateReview`/`mapToneAction` (Task 5), `buildReview` (Task 3), `FunnelState`/`ScreenId` (Task 6).
- Produces: `RatingScreen`, `PosIntro`, `PosDetails`, `PosReview`, `PosConfirm`, `PosCelebrate`. Shared screen props:
```ts
interface ScreenCtx { props: AiFunnelProps; state: FunnelState; set: (patch: Partial<FunnelState>) => void; go: (screen: ScreenId) => void; }
```

> No unit test (JSX). Verified by `npm run typecheck` and the Task 11 build + Task 12 manual QA. All branching logic lives in `state.ts`/`ai-client.ts` (already tested).

Porting notes (from `funnel-positive.jsx` + `review-funnel.jsx`):
- Port `RatingScreen` from `review-funnel.jsx`; `PosIntro/PosDetails/PosReview/PosConfirm/PosCelebrate` from `funnel-positive.jsx`.
- Replace prototype globals: `STOOD_OUT`→`props.stoodOut`, `SERVICES`→`props.services`, `BIZ.name`→`props.business.name`, `DESTINATIONS`→`props.destinations`.
- `RatingScreen` "Continue" routes via `props`: call `go(nextFromRating(state.rating, props.threshold))` (import `nextFromRating` from `../state`), disabled until `state.rating > 0`.
- `PosReview` AI: replace the prototype `setTimeout`/`buildReview` mock. On mount, if `props.ai.reviewEnabled` call `generateReview({ locationId: props.locationId, rating: state.rating, selectedPhrases: state.chips, service: props.ai.includeService ? state.service : "", staffMember: state.helper, notes: props.ai.allowNotes ? state.extra : "", tone, length, sessionId: state.sessionId, isRegenerate:false })`. If `!props.ai.reviewEnabled` OR result `usedFallback`, set `reviewShort`=`buildReview({chips,service,helper,extra}, props.business, "short")` and `reviewLong`=`buildReview(..., "detailed")` (import `buildReview` from `../fallback-text`). On AI success set `reviewLong`=review and also generate a short via a second call OR reuse: keep it simple — store the returned text in `reviewLong`, and on the "Short" tab call `generateReview` with `length:"short"` lazily (fallback to local short). Persist returned `sessionId` into state via `set`. Tone/length pills call `mapToneAction` then `generateReview` again (same fallback). Hide a pill when the matching `props.ai.allowTone/allowLength/allowRegenerate` is false.
- `PosCelebrate`: render `props.destinations` — the `preferred` one as `fk-dest-primary`, the rest in `fk-dest-grid`. A destination with `isInternal:true` links to `/f/${props.slug}/review?rating=${state.rating}${props.embed?"&embed=1":""}`; others use `url` with `target="_blank" rel="noopener noreferrer"`. Keep the guarded auto-copy of `state.reviewLong`.
- Keep `StepLabel step/total` exactly as in the prototype.

- [ ] **Step 1: Create `positive.tsx`** per porting notes.

- [ ] **Step 2: Verify**

Run: `npm run typecheck`
Expected: no NEW type errors.

- [ ] **Step 3: Commit**

```bash
git add "src/app/f/[slug]/ai-funnel/screens/positive.tsx"
git commit -m "feat(funnel): positive-flow screens"
```

---

### Task 8: Negative-flow screens

**Files:**
- Create: `src/app/f/[slug]/ai-funnel/screens/negative.tsx`

**Interfaces:**
- Consumes: kit, `ScreenCtx`/`FunnelState` (Tasks 6–7), `clarifyFeedbackRemote` (Task 5), `clarifyFeedback` (Task 3), `AiFunnelProps` (Task 4).
- Produces: `NegIntro`, `NegIssues`, `NegFeedback`, `NegClarify`, `NegConfirm`, `NegSubmitted`.

> No unit test (JSX). Verified by `npm run typecheck` + Task 11 build + Task 12 manual QA.

Porting notes (from `funnel-negative.jsx`):
- Replace `ISSUES`→`props.issues`, `BIZ.name`→`props.business.name`.
- `NegFeedback` "Make my feedback clearer": call `clarifyFeedbackRemote(props.locationId, state.feedback, state.issues)`. If `usedFallback`, use `clarifyFeedback(state.feedback, state.issues, props.business)` (import from `../fallback-text`). Store result in `feedbackClarified`, then `go("neg-clarify")`. "Continue without AI" sets `feedbackClarified:""` and advances.
- `NegClarify`: same compare UI (original / suggested / edit); `suggested` falls back to local `clarifyFeedback(state.feedback, state.issues, props.business)` when `feedbackClarified` is empty. On proceed set `feedbackFinal`.
- `NegSubmitted`: keep supportive copy; show the contact note when `state.contact` is `"email"`/`"phone"`.

- [ ] **Step 1: Create `negative.tsx`** per porting notes.

- [ ] **Step 2: Verify**

Run: `npm run typecheck`
Expected: no NEW type errors.

- [ ] **Step 3: Commit**

```bash
git add "src/app/f/[slug]/ai-funnel/screens/negative.tsx"
git commit -m "feat(funnel): negative-flow screens"
```

---

### Task 9: Flow state machine + responsive layout + non-redirecting persistence

**Files:**
- Create: `src/app/f/[slug]/ai-funnel/ai-funnel-flow.tsx`
- Modify: `src/app/f/[slug]/actions.ts` (add non-redirecting record actions)

**Interfaces:**
- Consumes: all screens (Tasks 7–8), `AiFunnelProps` (Task 4), `nextFromRating`/`contactSummary` (Task 6).
- Produces:
```ts
// actions.ts (server, "use server")
export async function recordPositiveReview(input: { slug: string; rating: number; body: string; embed: boolean }): Promise<{ ok: boolean }>;
export async function recordPrivateFeedback(input: { slug: string; rating: number; feedback: string; contact: string; embed: boolean }): Promise<{ ok: boolean }>;
// ai-funnel-flow.tsx
export function AiFunnelFlow(props: AiFunnelProps & {
  onRecordPositive?: (i: { slug: string; rating: number; body: string; embed: boolean }) => Promise<unknown>;
  onRecordNegative?: (i: { slug: string; rating: number; feedback: string; contact: string; embed: boolean }) => Promise<unknown>;
}): JSX.Element;
```

> No unit test (JSX). Verified by `npm run typecheck` + Task 11 build + Task 12 manual QA. Routing logic is `nextFromRating` (tested in Task 6); persistence-input shaping is `contactSummary` (tested in Task 6).

Porting notes (from `review-funnel.jsx` `FunnelApp`, minus the preview harness):
- Keep the `screen` + `state` machine and the screen `switch`. **Drop** the `device` toggle, `navOpen`, `fk-toolbar`, `fk-nav-*`, and the mobile/desktop preview switch and the phone-frame chrome (`fk-phone`/notch). Always render the `fk-desktop` structure (rail with steps + `fk-scroll-desktop`); `funnel.css`'s `@media (max-width:860px)` collapses it to a single column on mobile.
- Compute `flowKey`/steps for the rail exactly as the prototype's desktop branch.
- `go(screen)` sets screen + resets scroll. Initial screen `"rating"`. `set(patch)` merges state.
- Persistence (use React `useTransition`; do not navigate):
  - When `PosConfirm` "Yes, copy my review" fires (before showing `pos-celebrate`): call `onRecordPositive({ slug: props.slug, rating: state.rating, body: state.reviewLong, embed: props.embed })`, then `go("pos-celebrate")`.
  - When `NegConfirm` "Submit feedback" fires: call `onRecordNegative({ slug: props.slug, rating: state.rating, feedback: state.feedbackFinal || state.feedback, contact: contactSummary(state), embed: props.embed })`, then `go("neg-submitted")`.
  - Defaults: `onRecordPositive = recordPositiveReview`, `onRecordNegative = recordPrivateFeedback` (import from `../actions`).
- `actions.ts` new functions: mirror the `prisma.review.create` shapes already in `submitPublicPositiveReview` (PUBLISHED, sentiment "positive", `source: ReviewSource.INTERNAL`) and `submitPublicPrivateFeedback` (PRIVATE_FEEDBACK, sentiment by rating, `source: "INTERNAL"`), but resolve the location via `getLocationBySlug(input.slug)`, write the row, and `return { ok: true }` — NO `redirect()`. Parse `contact` (`"email:val"`/`"phone:val"`) into `internalNotes` like the existing actions do. Validate rating 1–5 and non-empty body/feedback; on invalid, `return { ok: false }` (do not throw).

- [ ] **Step 1: Add `recordPositiveReview`/`recordPrivateFeedback` to `actions.ts`** (non-redirecting, return `{ ok }`), then create `ai-funnel-flow.tsx`.

- [ ] **Step 2: Verify**

Run: `npm run typecheck`
Expected: no NEW type errors.

- [ ] **Step 3: Commit**

```bash
git add "src/app/f/[slug]/ai-funnel/ai-funnel-flow.tsx" "src/app/f/[slug]/actions.ts"
git commit -m "feat(funnel): flow state machine + non-redirecting persistence"
```

---

### Task 10: Branch the route on `funnelStyle`

**Files:**
- Create: `src/app/f/[slug]/funnel-style-choice.ts`
- Modify: `src/app/f/[slug]/page.tsx`
- Test: `src/app/f/[slug]/funnel-style-choice.test.ts`

**Interfaces:**
- Consumes: `normalizeFunnelStyle` (Task 1), `buildAiFunnelProps` + `AiFunnelFlow`.
- Produces: `chooseFunnelRenderer(raw: unknown): "ai" | "simple"`.

- [ ] **Step 1: Write the failing test**

```ts
// src/app/f/[slug]/funnel-style-choice.test.ts
import test from "node:test";
import assert from "node:assert/strict";
import { chooseFunnelRenderer } from "./funnel-style-choice.ts";

test("AI_GUIDED maps to ai", () => assert.equal(chooseFunnelRenderer("AI_GUIDED"), "ai"));
test("SIMPLE maps to simple", () => assert.equal(chooseFunnelRenderer("SIMPLE"), "simple"));
test("junk maps to simple", () => assert.equal(chooseFunnelRenderer("x"), "simple"));
test("null maps to simple", () => assert.equal(chooseFunnelRenderer(null), "simple"));
```

- [ ] **Step 2: Run test, verify it fails**

Run: `node --import ./test-loader.mjs "src/app/f/[slug]/funnel-style-choice.test.ts"`
Expected: FAIL (module not found).

- [ ] **Step 3: Create `funnel-style-choice.ts`**

```ts
// src/app/f/[slug]/funnel-style-choice.ts
import { normalizeFunnelStyle } from "@/lib/funnel-style";
export function chooseFunnelRenderer(raw: unknown): "ai" | "simple" {
  return normalizeFunnelStyle(raw) === "AI_GUIDED" ? "ai" : "simple";
}
```

- [ ] **Step 4: Run test, verify it passes**

Run: `node --import ./test-loader.mjs "src/app/f/[slug]/funnel-style-choice.test.ts"`
Expected: PASS.

- [ ] **Step 5: Branch in `page.tsx`**

Add imports at top:
```tsx
import { chooseFunnelRenderer } from "./funnel-style-choice";
import { buildAiFunnelProps } from "./ai-funnel/build-props";
import { AiFunnelFlow } from "./ai-funnel/ai-funnel-flow";
```
After `const profile = location.publicProfile;` (and before the existing rating-style/return block), insert:
```tsx
if (chooseFunnelRenderer(profile?.funnelStyle) === "ai") {
  const aiProps = buildAiFunnelProps(location, { slug, embed: isEmbed });
  return (
    <main className={isEmbed ? "" : "min-h-screen"}>
      <AiFunnelFlow {...aiProps} />
    </main>
  );
}
```
Leave the existing `SIMPLE` return untouched below.

- [ ] **Step 6: Run test + typecheck + build**

Run: `node --import ./test-loader.mjs "src/app/f/[slug]/funnel-style-choice.test.ts" && npm run typecheck && npm run build`
Expected: test PASS; no NEW type errors; build compiles (this is the first build that exercises the funnel `.tsx` tree — fix any compile errors surfaced here).

- [ ] **Step 7: Commit**

```bash
git add "src/app/f/[slug]/page.tsx" "src/app/f/[slug]/funnel-style-choice.ts" "src/app/f/[slug]/funnel-style-choice.test.ts"
git commit -m "feat(funnel): branch /f/[slug] on funnelStyle"
```

---

### Task 11: Campaign-wizard toggle + persistence

**Files:**
- Create: `src/app/campaign-wizard/funnel-style-field.ts`
- Modify: `src/app/campaign-wizard/actions.ts`
- Modify: `src/app/campaign-wizard/wizard-client.tsx`
- Test: `src/app/campaign-wizard/funnel-style-field.test.ts`

**Interfaces:**
- Consumes: `normalizeFunnelStyle` (Task 1).
- Produces: `readFunnelStyleField(formData: FormData): FunnelStyle`.

- [ ] **Step 1: Write the failing test**

```ts
// src/app/campaign-wizard/funnel-style-field.test.ts
import test from "node:test";
import assert from "node:assert/strict";
import { readFunnelStyleField } from "./funnel-style-field.ts";

test("reads AI_GUIDED", () => {
  const fd = new FormData(); fd.set("funnelStyle", "AI_GUIDED");
  assert.equal(readFunnelStyleField(fd), "AI_GUIDED");
});
test("defaults to SIMPLE when absent", () => assert.equal(readFunnelStyleField(new FormData()), "SIMPLE"));
```

- [ ] **Step 2: Run test, verify it fails**

Run: `node --import ./test-loader.mjs --test "src/app/campaign-wizard/funnel-style-field.test.ts"`
Expected: FAIL (module not found).

- [ ] **Step 3: Create the helper + use it in `actions.ts`**

```ts
// src/app/campaign-wizard/funnel-style-field.ts
import { normalizeFunnelStyle, type FunnelStyle } from "@/lib/funnel-style";
export function readFunnelStyleField(formData: FormData): FunnelStyle {
  return normalizeFunnelStyle(formData.get("funnelStyle"));
}
```
In `src/app/campaign-wizard/actions.ts`: `import { readFunnelStyleField } from "./funnel-style-field";`, add `const funnelStyle = readFunnelStyleField(formData);` near the other field reads, and add `funnelStyle,` into the `data` object passed to `prisma.locationPublicProfile.upsert`.

- [ ] **Step 4: Run test, verify it passes**

Run: `node --import ./test-loader.mjs --test "src/app/campaign-wizard/funnel-style-field.test.ts"`
Expected: PASS.

- [ ] **Step 5: Add the UI control in `wizard-client.tsx`**

In the funnel-settings section (where `funnelRatingStyle`/`negativeFilterEnabled` controls live), add a two-option segmented control bound to a new local state `funnelStyle` (init from the loaded profile's `funnelStyle`, default `"SIMPLE"`), styled to match the existing controls in this file. Emit the value as a hidden input inside the same form that posts to the save action: `<input type="hidden" name="funnelStyle" value={funnelStyle} />`. Labels: "Simple funnel" / "AI-guided funnel", each with a one-line helper. Thread `funnelStyle` through the `locations.map(...)` prop shape in `page.tsx` if the wizard reads initial values from there.

- [ ] **Step 6: Verify**

Run: `node --import ./test-loader.mjs --test "src/app/campaign-wizard/funnel-style-field.test.ts" && npm run typecheck && npm run build`
Expected: test PASS; no NEW type errors; build compiles.

- [ ] **Step 7: Commit**

```bash
git add "src/app/campaign-wizard/actions.ts" "src/app/campaign-wizard/wizard-client.tsx" "src/app/campaign-wizard/funnel-style-field.ts" "src/app/campaign-wizard/funnel-style-field.test.ts"
git commit -m "feat(funnel): campaign-wizard AI-guided toggle"
```

---

### Task 12: Full-suite verification + manual QA

**Files:** none (verification only).

- [ ] **Step 1: Run all unit tests + typecheck + lint + build**

Run:
```bash
# bracket-dir funnel tests must run directly (node --test can't glob a [slug] path)
find "src/app/f/[slug]" -name "*.test.ts" -print0 | while IFS= read -r -d '' f; do
  echo "== $f =="; node --import ./test-loader.mjs "$f" || exit 1; done
# everything else via the normal --test glob
node --import ./test-loader.mjs --test "src/lib/**/*.test.ts" "src/app/campaign-wizard/**/*.test.ts"
npm run typecheck
npm run lint
npm run build
```
Expected: all funnel tests pass; no NEW type/lint errors beyond pre-existing baseline; build compiles. Fix failures before proceeding.

- [ ] **Step 2: Manual QA (dev server)**

Run `npm run dev`. For a location set to `AI_GUIDED` (toggle in the wizard, or `UPDATE "LocationPublicProfile" SET "funnelStyle"='AI_GUIDED'` on the local Supabase DB):
- [ ] 5★ → positive flow → "Write my review" generates via Gemini (network tab shows `POST /api/review-assistant/generate`); tone/length pills work; edit works; confirm → celebrate auto-copies + shows the Google primary destination.
- [ ] With AI off (`aiAssistantAllowGeneration=false`): positive flow still works using local fallback text; soft notice shown; no console errors.
- [ ] 2★ → negative flow → "Make my feedback clearer" calls `POST /api/customer-resolution/rewrite` (or falls back on 403); compare UI works; submit shows the thank-you and writes a `PRIVATE_FEEDBACK` review (verify row in DB).
- [ ] Mobile width: single-card layout, no phone-frame chrome, no preview toolbar/navigator.
- [ ] Desktop width: left rail with step progress.
- [ ] `prefers-reduced-motion`: no confetti/animation.
- [ ] A location left on `SIMPLE` renders the original `FunnelRatingForm` unchanged.
- [ ] `?embed=1` renders without page chrome.

- [ ] **Step 3: Commit any QA fixes**

```bash
git add -A && git commit -m "fix(funnel): QA adjustments"   # only if changes were needed
```

Then use `superpowers:finishing-a-development-branch` to open the PR.

---

## Self-Review

**Spec coverage:** opt-in switch + migration (T1), wizard toggle (T11), route branching (T10), client flow/state/screens/kit/CSS/fallbacks (T3,T6,T7,T8,T9), real-data props (T4), Gemini positive generation + tone/length mapping (T5,T7), negative clarify via existing rewrite endpoint (T5,T8), persistence reuse + non-redirecting variants (T9), drop preview toolbar (T9), icon parity (T2), migration discipline / no-gating / AI degradation (Global Constraints + T1/T8/T5), testing + manual QA (per-task + T12). ✓

**Placeholder scan:** every code step has concrete content; ported-UI steps name the exact source file + adaptations; no "handle edge cases"/"write tests for the above". ✓

**Type consistency:** `FunnelState`/`ScreenId`/`INITIAL_STATE`/`nextFromRating`/`contactSummary` defined once in `state.ts` (T6), consumed by T7–T9. `AiFunnelProps`/`FunnelDestination` in `build-props.ts` (T4), consumed by T5/T7/T8/T9/T10. `GenerateParams`/`ToneAction`/`AssistantTone`/`AssistantLength` in `ai-client.ts` (T5), consumed by T7. `normalizeFunnelStyle` (T1) consumed by T10/T11. ✓

**Testing-convention consistency:** all test snippets use `node:test`+`node:assert/strict` with explicit `.ts` imports and the `node --import ./test-loader.mjs --test` runner; component-only tasks (T2,T6-kit,T7,T8,T9) gate on typecheck/build instead of render tests. ✓
