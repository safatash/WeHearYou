---
name: wehearyou-widgets
description: Use when working on WeHearYou review widgets - the widget studio editor, widget preview, public widget API, embed script, or widgets inventory. Covers Wall of Love, review marquee, single testimonial, rating badge, Collect reviews and floating badge. Also use when a widget setting saves but does not change the live embed, the editor preview disagrees with the embedded site, a control does not mark the editor dirty, or a widget is mislabelled in the inventory.
---

# WeHearYou Widgets

Next.js 16 + Prisma, deployed on Vercel. All paths below are relative to the repo root.

## The invariant

For every supported customization:

```
editor draft → saved row → public API → embed DOM/CSS
```

must preserve the **same meaning**. If a feature cannot be honored publicly, it must not be
selectable as though it were. Nearly every widget bug in this codebase is a break in this chain,
not a broken feature.

Corollary: **the preview may never render data the embed cannot have.** No sample reviews, no
placeholder ratings, no invented owner replies in live mode.

## The one rule

`src/lib/widget-config.ts` is the single source of truth for configuration semantics. It is
dependency-free on purpose (no Prisma, no React, no `next/*`) so the browser preview and the server
both import it.

The embed **never re-derives config semantics**. The server resolves the card list and ships the
result; `widget.js` renders it:

```
getPublicReviewWidgetPayload()  →  payload.items[]  +  payload.emptyState
                                   (filtered, ordered, interleaved, capped)
```

If you find yourself parsing `enabledSources` or branching on `contentType` inside `widget.js`,
stop — that logic belongs in `widget-config.ts` and its result belongs in the payload.

## File map

| Path | Role |
|---|---|
| `src/lib/widget-config.ts` | Canonical semantics: normalizers, `resolveWallItems`, `resolveWallEmptyState`, `WIDGET_TYPE_REGISTRY`, dirty comparison |
| `src/lib/review-widgets.ts` | `getPublicReviewWidgetPayload` — DB → resolved payload |
| `src/app/api/public/widgets/[token]/route.ts` | Public JSON endpoint (CORS, no-store) |
| `src/app/embed/widget.js/route.ts` | The embed script, served as one big template literal |
| `src/app/widgets/widget-studio-editor.tsx` | The editor (single typed draft + `update()`) |
| `src/components/widget-mock-preview.tsx` | Preview renderer, `dataMode: "live" \| "sample"` |
| `src/app/widgets/actions.ts` | `updateReviewWidget` server action |
| `src/app/widgets/[id]/page.tsx` | Loads the row, maps `StudioWidget`, keyed by `widget.id` |
| `src/app/widgets/widgets-index.tsx` | Inventory cards (labels from the registry) |

## Adding or changing a widget setting

All six layers are REQUIRED. Missing any one produces a setting that looks supported and isn't.

1. **Column** — `prisma/schema.prisma` + a committed migration (see DB rules below).
2. **Semantics** — a normalizer in `widget-config.ts` with a documented default and safe fallback.
   Use descriptive values (`natural`/`equal`), never booleans or inverted enums.
3. **Draft** — add to `WidgetDraft` + `draftFromWidget()` in the editor; mutate only through
   `update()`. Never component-local state for anything that must persist.
4. **Save** — append to FormData in `handleSave`, and write it in `updateReviewWidget`.
   Canonicalize on write so a reload can't read as dirty.
5. **Payload** — include it in `buildWidgetObj()`, normalized through the same function.
6. **Both renderers** — the preview *and* `widget.js`. Change them in the same commit.

Then: a unit test in `widget-config.test.ts`, and a browser check in the harness.

## The four failure shapes

Every widget defect found so far is one of these. Diagnose by asking where the value dies.

| Shape | Symptom | Where to look |
|---|---|---|
| **No column** | Editor selection never persists; API returns a hardcoded default | `actions.ts` for a commented-out write; `schema.prisma` for a missing field |
| **Not in the draft** | Preview updates, editor never goes dirty, value lost on save | Component-local `useState` that isn't part of `WidgetDraft` |
| **Renderer gap** | Payload carries the data; embed doesn't show it | `widget.js` — check *every* card path, not just the one you're looking at |
| **Preview fabrication** | Preview shows something the embed structurally cannot | `widget-mock-preview.tsx` for fallbacks and hardcoded strings |

**Renderer gap is the easiest to under-fix.** `widget.js` has several card paths — `renderCard`
(uniform walls, lists, sliders, carousels), the varied-grid spotlight branch, the uniform spotlight
branch, and the non-featured varied branch. A feature added to one is missing from the others.
Check all of them.

## Verification

Run from the repo root. There is no jest/vitest — tests are `node --test` with a loader that stubs
Prisma, so tests must be pure logic or source assertions.

```bash
# One test file
node --import ./test-loader.mjs --test src/lib/widget-config.test.ts

# All tests
node --import ./test-loader.mjs --test $(find src -name "*.test.ts" | sort | tr '\n' ' ')

npx tsc --noEmit
npm run lint          # baseline is 23 errors / 82 warnings — compare, don't chase zero
npm run build
```

**Browser verification** — renders the *real* embed script in Chromium against payloads built by
the real resolver. No database, no customer data. Use it for anything that produces DOM or CSS:

```bash
node scripts/verify-widget-embed-render.mjs
```

Add a check there for every visual change. It has caught bugs the unit tests could not — a feature
present in one card path and missing from another looks fine in source assertions.

## Repo gotchas

**Local DB *is* production.** In this project's setup `DATABASE_URL` points at the same Neon
database as production — confirm your own `.env` before you touch data, and read `CLAUDE.md` at the
repo root for the full rules. Assume any local write is a production write: never run
`prisma migrate dev`, `db push`, or seeds locally. Ship migrations as committed
`ADD COLUMN IF NOT EXISTS` files; Vercel's `vercel-build` runs `prisma migrate deploy` before
`next build`. Prisma selects all model fields by default, so **adding a field to `schema.prisma`
breaks every query until the migration is applied** — commit both together and deploy. For manual
application use the direct (non-pooler) Neon URL; the advisory lock times out on the pooler.

**`widget.js` is one template literal.** A stray backtick in a comment silently truncates the whole
script. `widget-embed-contract.test.ts` guards this by evaluating the served body — keep that test
passing.

**Embed is cached 300s.** After deploying, hard-reload or wait ~5 minutes before judging live output.

**Two enum vocabularies.** Content mode is `REVIEWS`/`VIDEOS`/`MIXED` in code, stored as
`TEXT`/`VIDEO`/`MIXED`. Always cross them with `normalizeContentMode` / `contentModeToStored`.

**`enabledSources: ""` means all four platforms** (Google, Facebook, Yelp, WeHearYou), not none.
Round-trips to `""` when everything is on, so a reload doesn't read as dirty.

**Two editors exist.** `page.tsx` routes advanced video layouts to the legacy `widget-customizer.tsx`;
everything else gets `widget-studio-editor.tsx`. Check `isSimpleWidget()` before assuming which one
renders.

**The editor is keyed by `widget.id`.** Switching location routes to a *different widget id on the
same route segment*; without the key React reuses the instance and state initialisers never re-run.

**`VideoTestimonial` has no rating column.** Stars on a video card are fabricated.

## Common mistakes

- Fixing the preview or the embed but not both, in one commit.
- Adding a renderer feature to one card path in `widget.js` and calling it done.
- Falling back to sample content when live data is empty — render the shared empty state instead.
- Comparing dirty state with `===` on arrays; use `widgetDraftsEqual` (order-insensitive for
  sources, order-sensitive for pins).
- Treating `isRedirectError` as a save failure. `updateReviewWidget` ends in `redirect()`, so that
  throw is the **success** path.
- Chasing lint to zero. Compare against the baseline instead.
