---
name: wehearyou
description: Use when working anywhere in the WeHearYou codebase - campaigns, contacts, review funnels, review inbox and replies, locations, Google Business Profile, video testimonials, customer resolution, automations, analytics, team and roles, billing, onboarding, or admin. Also use when orienting in the repo, adding a route or server action, touching the Prisma schema, or deciding where a feature belongs.
---

# WeHearYou

Multi-tenant review management for local businesses: collect reviews through funnels, route happy
customers to public platforms and unhappy ones into private feedback, then reply, syndicate and
display the results.

Next.js 16 (App Router) + Prisma + Neon Postgres + NextAuth, deployed on Vercel. Paths are relative
to the repo root.

**For widget work, use the `wehearyou-widgets` skill instead** — it covers the studio editor,
preview, public widget API and embed script in depth.

## Cross-cutting invariants

These hold everywhere. Breaking one is how most bugs get in.

**1. Every data path is scoped to an organization, and often to a location.**
`Organization → UserMembership → MembershipLocationAccess → Location`. A membership can be scoped
to specific locations, so org access alone is not enough. Never query by id alone in a mutation —
call the matching guard from `src/lib/authz.ts` first:

```ts
getCurrentMembership()            // read the caller's membership, or null
requireOrganizationAccess(orgId)  // org-level
requireLocationAccess(locationId) // respects MembershipLocationAccess
requireContactManagement(locationId)  requireReviewReplyAccess(locationId)
requireAnalyticsAccess(...)  requireAutomationManagement(...)
requireTeamManagement(...)   requireBillingManagement(...)  requireSuperAdmin()
```

There is **no `middleware.ts`** — nothing guards routes for you. Every page and every server action
authorizes itself.

**2. Server actions end in `redirect()`.** Next throws to perform it, so a `try/catch` around an
action will catch the *success* path. Re-throw, or check `isRedirectError(e)` and treat it as
success. Flash messages ride the redirect as `?flash=…&tone=success|error`.

**3. Local DB is production.** `DATABASE_URL` points at the same Neon database as production —
confirm your `.env` and read `CLAUDE.md` at the repo root. Assume any local write is a production
write: never `prisma migrate dev`, `db push`, or seed locally. Ship migrations as committed
`ADD COLUMN IF NOT EXISTS` files; `vercel-build` runs `prisma migrate deploy` before `next build`.
Prisma selects all model fields by default, so **adding a field to `schema.prisma` breaks every
query on that model until the migration is applied** — commit both together.

**4. Admin data must not leak to public surfaces.** Unpublished reply drafts, internal notes, other
locations' content. Public payloads are built by dedicated functions; extend those rather than
passing a Prisma row through.

**5. Plan gating is centralized** in `src/lib/plan-features.ts` / `plans.ts`
(`canUseFeature`, `limitReached`, `getLimit`, `featureEnabledForOrg`). Don't inline plan checks.

## Domain map

| Domain | Routes | Lib | Key models |
|---|---|---|---|
| Auth & tenancy | `/login` `/signup` `/accept-invite` `/onboarding/*` | `src/auth.ts`, `authz.ts`, `team.ts` | `User` `Organization` `UserMembership` `MembershipLocationAccess` |
| Locations | `/locations/*` | `locations.ts`, `location-reputation.ts`, `location-status.ts` | `Location` `LocationPublicProfile` |
| Contacts | `/contacts/*` | — | `Contact` `Tag` `ContactTag` |
| Campaigns | `/campaigns/*` `/campaign-wizard` | `email.ts`, Twilio for SMS | `Campaign` `CampaignRecipient` |
| Public funnels | `/f/[slug]` `/r/[token]` `/review/[slug]` | `review-routing.ts`, `rating-styles.ts`, `funnel-style.ts` | `Location` `ReviewLinkEvent` |
| Review inbox & replies | `/reviews/*` | `reviews.ts`, `google-reply.ts`, `auto-send-reply.ts`, `review-assistant.ts` | `Review` `ReplyAuditLog` |
| Google Business Profile | `/gbp/*` `/integrations/google/*` | `google-oauth.ts`, `gbp-api.ts`, `gbp-sync.ts`, `gbp-scheduler.ts` | `GoogleAccountConnection` `GbpPost` `GbpPhoto` `GbpQuestion` `GbpSyncLog` |
| Meta / Facebook | `/integrations/facebook/*` | `meta-oauth.ts`, `meta-pages.ts` | `MetaAccountConnection` |
| Video testimonials | `/video-testimonials` `/vt/[token]` `/embed/vt/[id]` | `thumbnail-utils.ts` | `VideoTestimonial` |
| Customer resolution | `/customer-resolution/*` `/r/[token]/resolve` | `customer-resolution.ts` | `ResolutionCase` `ResolutionCaseNote` `ResolutionFollowUp` |
| Automations | `/automation/*` | `automation-engine.ts`, `automation-validation.ts` | `Automation` `AutomationStep` `AutomationRun` `AutomationJob` |
| Widgets | `/widgets/*` `/embed/widget.js` | `widget-config.ts`, `review-widgets.ts` | `ReviewWidget` → **see `wehearyou-widgets`** |
| Minisite | `/b/[slug]` | `minisite-cta.ts`, `minisite-setup.ts`, `public-profile.ts` | `LocationPublicProfile` |
| Analytics | `/analytics` | `analytics.ts`, `dashboard.ts`, `review-link-analytics.ts` | `ReviewLinkEvent` |
| Billing | `/billing` `/api/webhooks/stripe` | `plans.ts`, `plan-features.ts`, `stripe.ts` | `Organization` |
| Admin | `/admin/*` | `authz.ts#requireSuperAdmin` | all |

## Public surfaces

Anything a customer can reach without logging in. Treat changes here as customer-visible.

| Surface | Entry | Notes |
|---|---|---|
| Funnel (modern) | `/f/[slug]` | Location slug. Supports the AI-guided funnel style; rating routes high/low per `review-routing.ts` |
| Funnel (token) | `/r/[token]` | `CampaignRecipient.token` — the link SMS/email campaigns send. Ties responses back to a contact |
| Review link (legacy) | `/review/[slug]` | Same location slug as `/f/`, simpler renderer plus a tracking beacon |
| Widget embed | `/embed/widget.js` | Third-party sites; cached 300s |
| Video testimonial | `/vt/[token]`, `/embed/vt/[id]` | Recording flow and embeddable player |
| Minisite | `/b/[slug]` | Public profile page |
| Public APIs | `/api/public/*` | CORS-enabled JSON |

**Three funnel entry points is a real trap.** `/f/[slug]` and `/review/[slug]` resolve the *same*
location by slug but render different components; `/r/[token]` resolves a campaign recipient. A
funnel change usually needs to be made in more than one of them — check all three before assuming
you're done.

## Conventions

- **`export const dynamic = "force-dynamic"`** on ~68 route files. Anything reading session, org or
  live data needs it; a missing one is how a page starts serving another tenant's cached output.
- **Server actions live in `actions.ts`** next to the routes that use them (23 of them). Business
  logic belongs in `src/lib/*.ts` so it can be unit tested; actions do auth → validate → persist →
  `revalidatePath` → `redirect`.
- **Validate and normalize on write.** Coerce unknown enum values to a documented default rather
  than storing them.
- **`@/` maps to `src/`.**

## Verification

No jest/vitest. Tests are `node --test` with a loader that stubs Prisma and resolves `@/`, so they
must be pure logic or source assertions — which is *why* logic belongs in `src/lib`.

```bash
node --import ./test-loader.mjs --test src/lib/<file>.test.ts        # one file
node --import ./test-loader.mjs --test $(find src -name "*.test.ts" | sort | tr '\n' ' ')

npx tsc --noEmit
npm run lint     # baseline is 23 errors / 82 warnings — compare, don't chase zero
npm run build
npm run validate # typecheck + lint + build
```

Coverage is concentrated in `src/lib` (31 of 37 test files). A feature with logic in a component is
a feature that cannot be tested here.

## Gotchas

- **`prisma migrate status` only checks history, not columns.** Silent drift surfaces as a 500. Audit
  read-only with
  `prisma migrate diff --from-url "$NEON_URL" --to-schema-datamodel prisma/schema.prisma --script`
  (a leftover `playing_with_neon` table is expected).
- **Neon pooler times out Prisma's advisory lock.** Use the direct URL for manual migrations.
- **A failed migration marks the DB failed (P3009) and blocks every future deploy.**
- **Vercel can inject newlines into forwarded headers** — strip `[\r\n]` before building URLs from
  `host` / `x-forwarded-proto`.
- **Sensitive Vercel env vars can't be read back** after being set; re-set rather than inspect.
- **`AGENTS.md` warns this Next.js version has breaking changes** from training data. Check
  `node_modules/next/dist/docs/` before relying on remembered API behavior.
- **Secrets required in prod** beyond the obvious: `OAUTH_STATE_SECRET`, `TOKEN_ENCRYPTION_KEY`
  (OAuth state signing and token encryption), `CRON_SECRET`, `AUTOMATION_RUNNER_SECRET`.

## Common mistakes

- Querying by id in a mutation without an `authz.ts` guard — org access alone ignores
  `MembershipLocationAccess`.
- Wrapping a server action in `try/catch` and swallowing the `redirect()` throw.
- Editing `schema.prisma` without a migration file in the same commit.
- Changing one public funnel entry point and not the other two.
- Putting business logic in a component, where the test setup cannot reach it.
- Running any Prisma write command locally — that is production.
