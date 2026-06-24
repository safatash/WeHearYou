# AI-Guided Review Funnel — Design Spec

**Date:** 2026-06-23
**Status:** Draft for review
**Source design:** Claude Design project `WeHearYou` → `Review Funnel.html` (+ `funnel-kit.jsx`, `funnel-positive.jsx`, `funnel-negative.jsx`, `review-funnel.jsx`, `styles.css`)

## 1. Goal

Implement the polished, AI-assisted multi-step "Review Funnel" from the Claude Design prototype as a **new opt-in funnel style** on the existing public funnel route `/f/[slug]`. The current simple funnel stays the default and is untouched.

The funnel branches on the customer's star rating:

- **Positive (≥ threshold, default 4–5★):** guide the customer to write an authentic public review with AI help, then hand off to a public destination (Google etc.).
- **Negative (< threshold, 1–3★):** collect private feedback with a supportive tone, optionally clarified by AI, routed privately to the business (never publicly suppressed).

## 2. Scope

**In scope**
- New client-side funnel flow (state machine) faithfully porting the prototype's screens.
- Opt-in switch (`funnelStyle`) on `LocationPublicProfile`, surfaced in the campaign wizard.
- Wiring positive review generation + tone/length controls to the **existing** `/api/review-assistant/generate` (Gemini 2.5 Flash).
- Wiring negative-flow "make my feedback clearer" to an AI rewrite (reuse `/api/customer-resolution/rewrite` if its contract fits; otherwise a thin new endpoint).
- Persisting outcomes via the **existing** server actions.
- Scoped stylesheet porting the prototype's `fk-*` styles + design tokens.

**Out of scope (prototype-only / future)**
- The mobile/desktop **preview toolbar** and **screen navigator** in `review-funnel.jsx` — these are a prototype harness, not part of the shipped funnel.
- Admin configuration of chip taxonomies (use sensible defaults seeded from existing data for v1).
- The faces/thumbs rating styles for the AI funnel (v1 is stars-only; simple funnel keeps faces/thumbs). Revisit later.
- Token funnel `/r/[token]` adoption of the new style (can follow once `/f/[slug]` is proven).

## 3. Existing infrastructure we reuse (do NOT rebuild)

| Need | Existing asset |
| --- | --- |
| AI review generation (Gemini 2.5 Flash) | `src/lib/review-assistant.ts` → `generateAssistedReview()`; route `src/app/api/review-assistant/generate/route.ts` |
| Tone / length options | `AssistantTone` (`friendly`/`professional`/`casual`/`enthusiastic`), `AssistantLength` (`short`/`medium`/`detailed`) |
| Review safety screening | `classifyReviewSafety` (already inside the generate path) |
| Theme seeding from real reviews | `extractReviewThemes`, `profile.reviewHighlights` |
| Rate limiting + session persistence + analytics | `isAssistantRateLimited`, `reviewAssistantSession`, `recordEvents` |
| Funnel routing config | `LocationPublicProfile`: `negativeFilterThreshold`, `highRatingMode`, `lowRatingDestination`, destination URL fields |
| AI assistant config flags | `aiAssistantEnabled`, `aiAssistantAllowGeneration`, `aiAssistantIncludeBusiness/City/Service`, `aiAssistantAllowNotes`, `aiAssistantUseReviewThemes` |
| Persistence | `submitPublicFunnelRating`, `submitPublicPositiveReview`, `submitPublicPrivateFeedback` (in `src/app/f/[slug]/actions.ts`) |
| Icons | `lucide-react` (already a dep) via `src/components/icon.tsx` |

The prototype's deterministic `buildReview()` / `clarifyFeedback()` become **local fallbacks** only (used when AI is disabled, rate-limited, or errors).

## 4. Architecture

### 4.1 Opt-in switch
- Add `funnelStyle String @default("SIMPLE")` to `LocationPublicProfile` (`"SIMPLE" | "AI_GUIDED"`).
- **Ship as a committed Prisma migration** (`prisma/migrations/*`). Per project CLAUDE.md, prod (Neon) ≠ local (Supabase); a bare `schema.prisma` edit or `db push` will not reach prod and will break the build. The migration must be additive (`ADD COLUMN ... DEFAULT 'SIMPLE'`).
- Campaign wizard (`src/app/campaign-wizard/page.tsx` + its form/actions): add a "Funnel experience" toggle (Simple / AI-guided). Persist to `funnelStyle`.

### 4.2 Route branching
`src/app/f/[slug]/page.tsx` (server component) reads `profile.funnelStyle`:
- `"SIMPLE"` → existing `FunnelRatingForm` (unchanged).
- `"AI_GUIDED"` → new `AiFunnelFlow` client component, hydrated with props derived server-side.

### 4.3 New components (under `src/app/f/[slug]/ai-funnel/`)
- `ai-funnel-flow.tsx` — `"use client"` state machine porting `FunnelApp` (minus preview toolbar). Owns the `screen` + form `state` and renders the responsive layout (mobile card / desktop rail-with-steps).
- `screens/` — one file per screen, ported from the prototype:
  - Shared: `RatingScreen`
  - Positive: `PosIntro`, `PosDetails`, `PosReview`, `PosConfirm`, `PosCelebrate`
  - Negative: `NegIntro`, `NegIssues`, `NegFeedback`, `NegClarify`, `NegConfirm`, `NegSubmitted`
- `kit.tsx` — ported shared UI atoms: `ScreenCard`, `BigBtn`, `ActionPill`, `FChip`, `ChipWrap`, `StepLabel`, `Stepper`, `StarPicker`, `AiThinking`, `Confetti`, `SuccessCheck`, `BizHeader`, `Avatar`, `Stars`. `Icon name=...` calls map to `lucide-react` (via `src/components/icon.tsx` or a small local name→icon map).
- `funnel.css` — scoped stylesheet: the `fk-*` rules from `Review Funnel.html`'s `<style>` block + the needed token subset from `styles.css`, imported only by this route so it never collides with the app's Tailwind. Load Geist / Geist Mono fonts here (or via `next/font`).
- `fallback-text.ts` — ported `buildReview` / `clarifyFeedback` deterministic generators (fallback only).

### 4.4 Props passed server → client (no mock data)
Replace prototype hardcoded `BIZ` / `DESTINATIONS` / `STOOD_OUT` / `SERVICES` / `ISSUES` with real values:
- `business`: `{ name, city, state, logoUrl, initial, hue }` from `location` + `profile`.
- `destinations`: built from the location's configured high-rating destinations (Google review link, Facebook URL, custom URL, WeHearYou) — reusing `resolveHighRating` / `destinationExternalUrl` logic. The preferred destination is marked primary.
- `stoodOut`: default to the prototype list, seeded/augmented from `profile.reviewHighlights` / extracted themes where present.
- `services`: from profile if a list exists, else the prototype defaults (or hidden if none).
- `issues`: prototype default list.
- `ai`: `{ enabled, allowGeneration, allowNotes, includeService, ... }` mirroring the assistant flags + the rating `threshold`.
- `slug`, `embed`.

### 4.5 AI calls (client → existing endpoints)
- **Positive review** (`PosReview` "Write my review", tone/length pills, regenerate): POST `/api/review-assistant/generate` with `{ locationId, rating, selectedPhrases: chips, service, staffMember: helper, notes: extra, tone, length, sessionId, isRegenerate }`. Map prototype actions:
  - "Make Shorter" → `length: short`; "Make Longer" → `length: detailed`; "More Casual" → `tone: casual`; "More Professional" → `tone: professional`; "Regenerate" → same params, `isRegenerate: true`.
  - Short/Detailed tabs map to `length` short/detailed.
  - On non-200 (e.g. AI disabled / 403 / 429) → fall back to local `buildReview` and surface a soft notice; never block the user.
- **Negative clarify** (`NegFeedback` "Make my feedback clearer", `NegClarify` compare): call the rewrite endpoint. First verify `/api/customer-resolution/rewrite`'s request/response contract; if it cleanly takes raw text + context and returns a tidied version, reuse it. If not, add `src/app/api/funnel-feedback/clarify/route.ts` (thin Gemini call, no fabrication, "tidy wording only — never change meaning", guarded by the same rate limiter). Fallback: local `clarifyFeedback`.

### 4.6 Persistence (reuse existing actions)
- Rating recorded via `submitPublicFunnelRating` semantics (we record the rating up front so analytics/threshold routing stay consistent). Because the AI flow is a single client state machine rather than separate routes, we call server actions at the terminal steps rather than navigating:
  - **Positive confirm/celebrate** → `submitPublicPositiveReview` (rating, body = final review, name optional) so the drafted review is stored as an internal `PUBLISHED` review (current behavior), then the client reveals destination links + auto-copy.
  - **Negative submit** → `submitPublicPrivateFeedback` (rating, feedback = final text, contact info in `internalNotes`) → `PRIVATE_FEEDBACK` review.
- No new tables. Reuse `reviewAssistantSession` already written by the generate route.

## 5. UX / behavior notes (from the prototype)
- Tone is supportive in the negative flow; copy explicitly states feedback is private and goes to the business — **no review-gating language**.
- AI text is always editable; confirmations stress "nothing is posted until you choose."
- Celebration auto-copies the review to clipboard (guarded `navigator.clipboard` + `document.hasFocus()`), shows preferred destination prominently + others in a grid.
- Respect `prefers-reduced-motion` (confetti + animations already guard for it in the prototype).
- Accessibility: star picker has `aria-label`s; keep them. Ensure buttons are real `<button>`s (they are in the prototype).

## 6. Risks / callouts
1. **DB migration discipline (highest):** the `funnelStyle` column MUST be a committed, additive migration applied to Neon prod, or `/f/[slug]` 500s in prod. Follow CLAUDE.md's Neon migration guidance.
2. **Endpoint reuse vs. new:** `/api/customer-resolution/rewrite` contract must be confirmed before assuming reuse.
3. **Overlap with any existing customer-facing assistant UI:** the generate endpoint implies an assistant UI may already exist (e.g. in `/r/[token]`). Confirm during planning to avoid duplicate UX; share the `kit.tsx` atoms if so.
4. **`aiAssistantEnabled` vs `funnelStyle`:** define precedence. Proposed: AI-guided funnel renders regardless, but the AI *generation* features degrade to manual writing + local fallback when `aiAssistantEnabled`/`allowGeneration` are false.
5. **Icon parity:** prototype `Icon` names must each map to a real `lucide-react` icon; audit the name set (`arrowRight`, `sparkle`, `bolt`, `chevDown`, `check`, `copy`, `external`, `heart`, `lock`, `clock`, `shield`, `fileText`, `edit`, `send`, `mail`, `phone`, `info`, `lightbulb`, `refresh`, `award`, `chat`, `pin`, `monitor`, `layers`, `arrowUp`, `arrowDown`, `close`).

## 7. Testing
- Unit: prop-derivation helpers (destinations, chip seeding), tone/length → API param mapping, fallback generators.
- Integration: positive happy path (generate → edit → confirm → copy → destination), negative happy path (feedback → clarify → submit → private review persisted), AI-disabled fallback path, low-rating private routing.
- Manual: mobile + desktop layouts, reduced-motion, clipboard copy, embed mode.
- Regression: `SIMPLE` funnel unchanged for existing locations.

## 8. Open questions to resolve in planning
- Exact `/api/customer-resolution/rewrite` contract (reuse vs. new endpoint).
- Whether to expose chip taxonomies in the wizard now or defer (default: defer).
- Fonts via `next/font` vs. `<link>` in the scoped CSS.
