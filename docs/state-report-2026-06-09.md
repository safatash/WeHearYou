# WeHearYou — Comprehensive Product State Report

> Verified against codebase at commit `2a2eb49` on 2026-06-09.
> All findings are evidence-based from actual file reads. No assumptions from UI labels alone.

---

## 1. Dashboard and Onboarding

**Status: Done (with minor limitations)**

**What works:**
- `src/app/page.tsx` — real dashboard powered by `getDashboardData()` from `src/lib/dashboard.ts`. Fetches review counts, campaign stats, and location data from Prisma.
- `OnboardingChecklist` component (`src/components/onboarding-checklist.tsx`) — 3-step checklist (add location, connect Google, add contacts), computed from actual DB state, dismissible via `dismissOnboarding` action.
- `src/app/onboarding/` — full onboarding wizard with location creation, Google connection, and contacts import steps, all backed by real server actions.
- Signup (`src/app/signup/`) — fully wired: creates User, Organization (with unique slug), and OWNER UserMembership atomically.
- Login — NextAuth credentials provider, bcrypt password verification.
- `src/app/suspended/` — suspended org guard with redirect.

**Missing/broken:**
- Dashboard shows no filtering by date range, location, or time period. All stats are lifetime totals with no period selector.
- No quick-action buttons (e.g. "Send a request", "Add a contact") on the dashboard itself.
- `src/app/billing/page.tsx` simply does `redirect("/")` — billing is completely absent.

**Evidence:** `billing/page.tsx`: `export default function BillingPage() { redirect("/"); }`

**User-facing impact:** No customer can manage billing or subscription. Acceptable for internal beta, blocks monetization.

**Recommended next action:** Either add a Stripe/Paddle billing integration or explicitly mark billing as not yet available with a landing page. The silent redirect is confusing.

---

## 2. Locations and Multi-Location Management

**Status: Done**

**What works:**
- `src/app/locations/` — full CRUD (create, update, delete), Google mapping, sync triggers, location settings, funnel builder settings, public profile management.
- Google location sync: manual trigger, batch sync, retry failed, disconnect — all real server actions in `src/app/locations/actions.ts`.
- `src/lib/current-scope.ts` + `src/lib/scope.ts` — location-scoped data access enforced consistently.
- Location-scoped enforcement for Managers/Support via `MembershipLocationAccess` — works correctly.
- `LocationPublicProfile` — full public facing profile settings (headline, CTAs, social links, funnel copy, AI summary, schema.org).
- `src/app/b/[slug]/` — real public business profile page with reviews, testimonials, hours, social links, schema.org metadata, and UTM-tracked review link. Fully rendered.

**Missing/broken:**
- No bulk location management or import.
- Location detail page has a lot of Google-specific content; non-Google locations feel sparse.
- Yelp sync fields exist in schema (from migration `add_yelp_integration`) but Yelp is not in the integrations page UI. Dead schema.

**User-facing impact:** Core functionality is solid. Yelp sync is a schema-only ghost.

**Recommended next action:** Either wire Yelp sync into the Integrations page or remove Yelp model fields to reduce confusion. Low priority.

---

## 3. Review Links and QR/Review Request Flows

**Status: Done**

**What works:**
- `src/app/review-links/page.tsx` — fully wired. Fetches all locations, builds review URLs, loads analytics per location via `getLocationAnalytics()`.
- `src/app/review-links/review-links-client.tsx` — client component with tabbed UI: default link, UTM source-specific links (email signature, QR/print, invoice, website), QR code generator using `qrcode` lib, analytics dashboard, email signature snippet.
- `src/app/review/[slug]/` — public review link with `LINK_VIEWED`, `HAPPY_CLICKED`, `UNHAPPY_CLICKED` event tracking via `/api/review-links/[slug]/event`.
- `src/lib/review-link-analytics.ts` — real analytics computation (views, conversions, 7/30-day buckets).
- Analytics tracked: `ReviewLinkEvent` model with source, medium, placement, referrer, sessionId.
- QR code download works via canvas-to-blob in the client.

**Missing/broken:**
- No "Google Write Review" link differentiation from the funnel review link on the review links page.
- No review link creation/deletion UI — links are auto-generated per location.

**User-facing impact:** Fully functional for sharing and tracking. No blockers.

**Recommended next action:** None critical.

---

## 4. Review Funnel and Negative-Feedback Routing

**Status: Done**

**What works:**
- `/f/[slug]/` — public funnel with happy/unhappy routing based on `negativeFilterEnabled` and `negativeFilterThreshold` from `LocationPublicProfile`.
- `/r/[token]/` — token-based funnel (SMS/campaign-specific), reads campaign recipient + location profile settings.
- `/review/[slug]/` — review link funnel (UTM-tracked entry point).
- All three paths correctly route: high ratings → thanks page with Google review button; low ratings → private feedback form → private thanks.
- `embed=1` iframe mode: compact layout, `postMessage` auto-close for embedding in widgets.
- Server actions: `submitPublicFunnelRating`, `submitPublicPrivateFeedback`, `submitReviewRating`, `submitPrivateFeedback`, `submitReviewLinkFeedback` — all real and wired.
- `FunnelPreviewSimulator` (`src/components/funnel-preview-simulator.tsx`) — client-side preview of funnel flow, reads actual location settings (not hardcoded).

**Missing/broken:**
- No way for a customer to upload a photo with their feedback.
- No custom domain support for the funnel (schema field `customDomain` exists on `LocationPublicProfile` but not implemented in routing).

**User-facing impact:** Core funnel flow is production-ready. Custom domain and photo feedback are P2 features.

---

## 5. Campaign Wizard and Campaign Management

**Status: Partially Done**

**What works:**
- `src/app/campaigns/page.tsx` — real campaign list with status pills, channel, outcome display.
- `src/app/campaigns/[id]/page.tsx` — campaign detail with recipient list, resend action.
- `src/app/campaigns/new/` — create campaign form, supports sending to contacts with email/SMS.
- `src/app/campaign-wizard/page.tsx` — fully wired wizard that saves funnel settings (rating style, negative filter, prompt copy) to `LocationPublicProfile` via `saveCampaignWizard` action.
- Campaign creation from automation: `createCampaignFromStep()` in automation engine.
- `resendCampaignInvites` server action — functional.
- Contact `quickCreateContact` action for inline contact creation during campaign.

**Missing/broken:**
- Campaign detail page (`campaigns/[id]/page.tsx`) has placeholder description copy: *"This invite record now reads from Prisma, showing token metadata, delivery path, recipients, and what happened after send."* — leftover scaffolding text visible to users.
- No campaign editing after creation.
- No campaign scheduling UI (the `SCHEDULED` status exists in schema but no UI for scheduling future sends).
- No bulk send (one contact per campaign in the new form).
- No delivery status webhook tracking (no Resend/Twilio webhooks to update `CampaignRecipient.status` from `SENT` to `OPENED`/`CLICKED`).

**User-facing impact:** Campaigns work for manual single-contact sends. The agency use case (bulk upload, scheduling, delivery tracking) is incomplete. The placeholder copy will confuse real users.

**Recommended next action:** Remove the placeholder description copy from `campaigns/[id]/page.tsx`. Then add bulk campaign send (send to all contacts in a list). P1 for agency use.

---

## 6. Video Testimonials, Captions, Thumbnails, and Publishing

**Status: Mostly Done — one production bug**

**What works:**
- `VideoRecorder` component (`src/components/video-recorder.tsx`) — real WebRTC recording via `MediaRecorder`, uploads to Vercel Blob via `@vercel/blob/client` with `handleUpload`. Requires `BLOB_Public_READ_WRITE_TOKEN` env var.
- `/api/video-testimonials/upload` — handles Vercel Blob client upload authorization.
- `/api/video-testimonials/complete` — writes `videoUrl`, `durationSeconds`, `mimeType` to `VideoTestimonial` record.
- Admin page (`src/app/video-testimonials/page.tsx`) — grid of editorial cards with: status chips (`StatusChips`), caption editor (`CaptionEditor` with character counter, save state), thumbnail editor (`VideoThumbnailEditor` — drawer with capture/upload/auto tabs), approve/reject/delete actions — all real and wired.
- `VideoThumbnailEditor` — opens as a split-screen modal (desktop), shows live widget preview, deferred source selection, "Save & Publish" for pending.
- Custom thumbnail upload: `uploadCustomThumbnail` action → Vercel Blob → `customThumbnailUrl`.
- Frame capture: `captureVideoFrame` action → saves frame data → Vercel Blob → `capturedFrameUrl`.
- `setThumbnailSource`, `deleteCustomThumbnail`, `deleteCapturedFrame` — all wired.
- Caption update: `updateVideoTestimonialCaption` — wired via `CaptionEditor`.
- Public recorder (`/vt/[token]`) — real recorder page, handles "already submitted" state.
- Embed iframe code shown with `CopyButton`.

### 🐛 Production Bug — `/embed/vt/[id]`

The embed route (`src/app/embed/vt/[id]/page.tsx`) renders `<img>` if a thumbnail URL exists, and only falls back to `<video controls>` when there is no thumbnail. Every published testimonial with a thumbnail renders as a static non-playable image in the embed. Users clicking the play icon see nothing happen.

**Evidence (`src/app/embed/vt/[id]/page.tsx`):**
```tsx
{thumbnailUrl ? (
  <img src={thumbnailUrl} alt="..." />   // ← WRONG: static image, not a video player
) : (
  <video src={testimonial.videoUrl} controls ... />
)}
```

**Fix:** Always render `<video>` with `poster={thumbnailUrl ?? undefined}`. One-line change.

**Missing/broken:**
- `BLOB_Public_READ_WRITE_TOKEN` not documented in `.env.example` — will silently fail on new dev setups.
- No subtitles/closed captions auto-generation.
- No video transcoding (raw WebM from browser is stored as-is).

**User-facing impact:** The embed bug is critical — anyone embedding published testimonials sees a static image. Immediate P0 fix needed.

---

## 7. Testimonial Widgets, Floating Widgets, Trust Badges, and Embed Surfaces

**Status: Done**

**What works:**
- `WidgetCustomizer` (`src/components/widget-customizer.tsx`) — large client component with live preview, all appearance settings, layout picker.
- `src/app/widgets/[id]/page.tsx` — fully wired widget detail page with live preview and embed code generation.
- `/api/public/widgets/[token]` — CORS-enabled public API returning widget data (reviews, testimonials, widget config). Caching disabled.
- `/embed/widget.js/route.ts` — serves the widget script inline as a Next.js route. Handles: grid/list/carousel/floating/collecting/trust-badge widget types, review cards, video testimonial cards, floating rotator, star ratings, pagination, embed=1 iframes, mobile behavior — all real.
- Widget types: static carousel/grid, floating rotator, collecting widget (funnel embed), trust badge — all implemented in the widget script.
- `regenerateReviewWidgetToken` — can rotate the public token without breaking the embed.
- `widgets/[id]/test` — test page for local widget preview.

**Missing/broken:**
- Nav items for "Rank Tracker" (`/gbp/rank`), "Competitors" (`/gbp/competitors`), "Reports" (`/gbp/reports`) are marked `comingSoon: true` and point to routes that don't exist. These are incorrectly placed under the GBP group in the nav (using keys `gbp-posts`, `gbp-photos`, `gbp-qa`) — the *real* pages for GBP Posts, Photos, and Q&A exist at `/gbp/posts`, `/gbp/photos`, `/gbp/qa` but are unreachable from the sidebar.

**Evidence (`src/lib/navigation.ts` lines 52-54):**
```typescript
{ key: "gbp-posts", label: "Rank Tracker",  href: "/gbp/rank",        comingSoon: true },
{ key: "gbp-photos", label: "Competitors",  href: "/gbp/competitors", comingSoon: true },
{ key: "gbp-qa",     label: "Reports",      href: "/gbp/reports",     comingSoon: true },
// Real pages exist at: /gbp/posts, /gbp/photos, /gbp/qa
```

**User-facing impact:** Widget system is production-ready. GBP Posts, Photos, and Q&A are fully built but unreachable via the sidebar.

**Recommended next action:** Fix navigation — rename the three GBP nav items to their correct labels and routes.

---

## 8. Automation Builder, Runs, Queue, Persistence, Guardrails, Provider Setup

**Status: Done (no retry logic — known gap)**

**What works:**
- Builder (`/automation/[id]?tab=builder`) — create/edit automations with steps, all step types.
- Activation guardrails (`src/lib/automation-validation.ts`) — 14 validation checks blocking activation.
- Runs tab — fetches `AutomationRun` records with `stepExecutions`, per-step outcomes, real `completedAt` timestamps.
- Queue tab — shows `AutomationJob` records, pending/completed grouped.
- Setup tab — provider readiness cards (Resend, Twilio, secrets), integration URLs, webhook payload reference.
- Persistence — `AutomationStepExecution` writes for every step type, `completedAt` set on every run status transition, `Campaign.automationRunId` FK links campaign back to run.
- "View campaign →" link in step execution detail.
- Manual enrollment — wired via `EnrollContactForm`.
- Delayed jobs — `AutomationJob` created, `executePendingAutomationJobs` processes via `/api/automation/run-pending` or `/api/cron`.
- Smoke test — `/api/automation/smoke-test` (dev-only, 26 assertions, confirmed passing).

**Missing/broken:**
- **No retry logic** — `AutomationJob` schema has no `attemptCount`, `maxAttempts`, or retry fields. Failed jobs stay `status=failed` permanently. Confirmed: no retry/attempt code in `src/lib/automation-engine.ts`.
- **No delivery confirmation** — step executions record `status=executed` but don't capture Resend/Twilio delivery status. Bounced messages are indistinguishable from delivered ones.
- **`RESEND_API_KEY`, `TWILIO_*`, `CRON_SECRET`, `BLOB_Public_READ_WRITE_TOKEN`** — all required in production but absent from `.env.example`.
- Automation step `PUBLISH_GBP_REPLY` — implemented in the engine but not exposed in `AddStepForm` UI.

**User-facing impact:** Automation is functional for delivery paths that succeed on the first attempt. Failed jobs are permanently stuck. Missing env docs risk silent failures on new deployments.

**Recommended next action:** Add `attemptCount` / `maxAttempts` to `AutomationJob` and retry logic in `executePendingAutomationJobs`. Document missing env vars.

---

## 9. Team & Access, Roles, Invitations, Member Management, and Location Permissions

**Status: Done**

**What works (verified from `src/app/team/actions.ts`):**
- `inviteTeamMember` — creates User + UserMembership (INVITED) + MembershipLocationAccess, sends email via `sendTeamInviteEmail` (non-blocking Resend), full absolute invite URL.
- Invite URL — shown on `/team` and `/team/[id]` with `CopyButton`, persists across page navigation.
- `acceptInvite` — password setup, bcrypt hash, sets ACTIVE, clears token.
- `resetInvite` — generates new token.
- `updateMemberRole` — validates role level hierarchy, updates role/accessScope/locationAccess, blocks equal/higher role changes.
- `deactivateMember` / `reactivateMember` — flash-redirect on all guardrail failures (no error pages), last-owner protection.
- `transferOwnership` — atomic `prisma.$transaction([promote, demote])`, typed `"transfer ownership"` confirmation enforced client-side (disabled button) and server-side.
- `MemberEditForm` (`src/app/team/[id]/member-edit-form.tsx`) — real radio-style role selector, conditional location picker.
- `OwnershipTransferForm` (`src/app/team/[id]/ownership-transfer-form.tsx`) — consequence list, typed confirmation.
- Permission matrix — read-only ✓/✕ indicators, correctly labeled "determined by role."
- Access enforcement — `getCurrentMembership` filters `status: ACTIVE`; DISABLED users blocked from all protected pages and server actions.

**Missing/broken:**
- Sessions not invalidated on deactivation — user stays "logged in" (session cookie valid) but gets 404s until session expires.
- No owner-to-owner step-down path (can't demote yourself from OWNER without transferring to someone else first).
- `RESEND_API_KEY` not in `.env.example` — invite emails silently not sent on fresh deployments.
- `accessScope` denormalized string computed in two separate places.

**User-facing impact:** Core team management is fully functional. Session persistence on deactivation is a minor polish issue.

---

## 10. Analytics and Reporting

**Status: Partially Done — real data, dead action buttons, missing org scope**

**What works:**
- `src/app/analytics/page.tsx` + `src/lib/analytics.ts` — real queries: review volume, average rating, response rate, response time, private feedback count, weekly time series. All computed from live Prisma data.
- `StatCard` components display real numbers.
- Time series rendered via `src/lib/time-series.ts`.

**Missing/broken:**
- "Export PDF" button — no `onClick`, no action, no href. Completely dead.
- "Share Report" button — same, completely dead.
- No date range filtering, no location filtering, no drill-down.
- **`getAnalyticsData()` has no org/location scoping** — queries all reviews and recipients without filtering to the current org. Data from all organizations is mixed in a multi-tenant scenario.

**Evidence (`src/lib/analytics.ts`):**
```typescript
prisma.review.findMany({
  where: { status: { not: "PRIVATE_FEEDBACK" } },
  // ← No organizationId or locationId filter
})
```

**User-facing impact:** The missing org scope is a data leak between orgs. The dead buttons are confusing but not blocking.

**Recommended next action:** Fix org scoping in `getAnalyticsData()` — accept `organizationId` param, filter all queries through location. P0 if multiple organizations exist.

---

## 11. Integrations, Webhooks, Email/SMS Providers, and Environment Readiness

**Status: Partially Done — Google wired, others require undocumented env vars**

**What works:**
- `src/app/integrations/page.tsx` — Google OAuth connect/disconnect, location mapping, review sync triggers, batch sync — all real.
- `/api/integrations/google/connect` + `/api/integrations/google/callback` — full OAuth flow.
- Google review sync — real (cron at `/api/cron` calls `executePendingAutomationJobs`, GBP cron at `/api/cron/gbp` handles posts/photos scheduling).
- Token encryption for Google OAuth tokens (`src/lib/token-encryption.ts`, `TOKEN_ENCRYPTION_KEY`).
- Inbound automation webhook (`/api/webhooks/automation`) — HMAC verification with `AUTOMATION_WEBHOOK_SECRET`.
- Outbound webhook steps in automation — real `fetch()` calls.

**Missing/broken:**
- **`.env.example` is incomplete** — the following env vars are used in code but not documented:

| Variable | Used for | Required |
|---|---|---|
| `RESEND_API_KEY` | Email delivery (invites, review requests, notifications) | Yes for email |
| `RESEND_FROM_EMAIL` | Sender address for all emails | Recommended |
| `TWILIO_ACCOUNT_SID` | SMS delivery | Yes for SMS |
| `TWILIO_AUTH_TOKEN` | SMS delivery | Yes for SMS |
| `TWILIO_PHONE_NUMBER` | SMS sender number | Yes for SMS |
| `BLOB_Public_READ_WRITE_TOKEN` | Video uploads, thumbnail uploads (Vercel Blob) | Yes for video |
| `CRON_SECRET` | Auth for `/api/cron` and `/api/cron/gbp` | Yes for cron |

- No Resend webhook receiver to track email bounces/opens.
- No Twilio status callback to track SMS delivery.
- SMS opt-out handling — `STOP` keyword not handled anywhere (compliance gap).
- No Facebook or Yelp OAuth integration despite schema fields.

**User-facing impact:** Missing env var documentation will cause silent failures on new deployments. Email/SMS delivery works but has no feedback loop. SMS compliance gap is a legal risk.

**Recommended next action:** Update `.env.example` with all missing vars and their purpose.

---

## 12. Public Pages, Embed Routes, and Customer-Facing Flows

**Status: Mostly Done — one critical embed bug (see §6)**

**What works:**
- `/f/[slug]/`, `/r/[token]/`, `/review/[slug]/` — all three funnel entry points work.
- `/b/[slug]` — public business profile (reviews, testimonials, hours, social links, CTA, schema.org, AI summary).
- `/vt/[token]` — video recorder for customers.
- `/accept-invite` — team member invite acceptance.
- `/embed/widget.js` — widget script served via Next.js route at `/embed/widget.js/route.ts`. Fully functional, CORS-enabled.

**Missing/broken:**
- `/embed/vt/[id]` — **critical bug**: renders `<img>` instead of `<video>` when thumbnail exists (documented in §6).
- No SEO `generateMetadata` for `/f/[slug]/` funnels.
- No `robots.txt` rule blocking `/embed/*` from search indexing.

---

## 13. Marketing Page / Landing Page State

**Status: Not Done**

There is no public marketing or landing page. The root `/` route requires authentication and redirects unauthenticated visitors to `/login`. No `app/(marketing)/` or public homepage exists.

**User-facing impact:** No acquisition surface. Anyone visiting the domain without an account hits the login page directly.

---

## 14. Navigation, App Shell, UI Consistency, and Design Polish

**Status: Mostly Done — three nav issues**

**What works:**
- `src/components/app-shell.tsx` — consistent sidebar nav, flash toast system, `activeScreen` prop.
- `comingSoon` nav items are visually disabled (opacity, no click).

**Issues:**

1. **GBP nav labels are wrong** — `gbp-posts`/`gbp-photos`/`gbp-qa` keys are labeled "Rank Tracker / Competitors / Reports" with `comingSoon: true`, pointing to `/gbp/rank`, `/gbp/competitors`, `/gbp/reports` (non-existent routes). The real pages exist at `/gbp/posts`, `/gbp/photos`, `/gbp/qa` but are not linked from the sidebar. Fully built features are invisible to users.

2. **Billing nav missing** — `/billing` redirects to `/`; billing is absent from the nav.

3. **Dead analytics buttons** — "Export PDF" and "Share Report" have no handlers.

4. **Placeholder copy in campaigns** — `campaigns/[id]` has visible scaffolding description text.

**Recommended next action:** Fix GBP nav items to point to real existing pages. Immediate and high-impact.

---

## 15. Testing, Migrations, Deployment, and Production Readiness

**Status: Partially Done**

**What works:**
- 22 Prisma migrations applied cleanly; schema is up to date.
- `vercel-build` script: `prisma migrate deploy && next build` — migrations run on every Vercel deployment.
- Unit test files exist (`gbp-api.test.ts`, `gbp-scheduler.test.ts`, `google-*.test.ts`, `seo.test.ts`, `review-link-analytics.test.ts`) — Playwright is installed.
- Automation smoke test endpoint `/api/automation/smoke-test` — 26 assertions, dev-only, confirmed passing.
- TypeScript: 0 errors.
- Production build: all routes compile cleanly.

**Missing/broken:**
- **No test runner configured** — `package.json` has no `test` script, no Jest/Vitest config. `npm test` returns `Missing script: "test"`. Test files cannot be run.
- **No CI/CD pipeline** — no GitHub Actions, no automated test runs on PRs.
- **5+ env vars undocumented in `.env.example`** — silent failures on new deployments.
- **No health check endpoint** — no `/api/health` verifying DB connectivity.
- Analytics has no org scoping — data leak risk in multi-tenant scenario.
- Yelp schema fields exist (migration applied) but no integration code.

---

## Summary Table

| Product Area | Status | Confidence | Biggest Gap | Recommended Priority |
|---|---|---|---|---|
| Dashboard & Onboarding | ✅ Done | High | Billing is a redirect stub | P2 |
| Locations & Multi-Location | ✅ Done | High | Yelp schema ghost | P3 |
| Review Links & QR | ✅ Done | High | None critical | P3 |
| Review Funnel & Routing | ✅ Done | High | Custom domain not wired | P2 |
| Campaign Wizard & Campaigns | ⚠️ Partial | Medium | Placeholder copy, no bulk send, no delivery webhooks | P1 |
| Video Testimonials | ⚠️ Partial | High | **`/embed/vt/[id]` shows image not video — P0 bug** | P0 |
| Widgets & Embeds | ✅ Done | High | GBP nav mislabeled (blocks GBP posts/photos/Q&A) | P1 |
| Automation | ⚠️ Partial | High | No retry logic on failed jobs | P1 |
| Team & Access | ✅ Done | High | Session not invalidated on deactivation | P2 |
| Analytics & Reporting | ⚠️ Partial | Medium | **No org scoping — data leak risk; dead export buttons** | P0 |
| Integrations & Env | ⚠️ Partial | Medium | 7 env vars missing from `.env.example` | P1 |
| Public Pages & Embeds | ⚠️ Partial | High | Embed VT bug (same as row 6) | P0 |
| Marketing / Landing Page | ❌ Not Done | — | No public homepage | P2 |
| Navigation & UI Polish | ⚠️ Partial | High | GBP nav labels wrong (real pages unreachable) | P1 |
| Testing & Deployment | ⚠️ Partial | Medium | No test runner, no CI, missing env docs | P1 |

---

## Prioritized Implementation Roadmap

### P0 — Must fix before real customers

1. **Fix `/embed/vt/[id]` to render a video player** — 3-line change in `src/app/embed/vt/[id]/page.tsx`. Replace `<img>` with `<video poster={thumbnail}>`. Every current embed is broken.

2. **Fix analytics org scoping in `getAnalyticsData()`** — `src/lib/analytics.ts` queries all reviews/campaigns without filtering by org. Pass `organizationId` and add `where: { location: { organizationId } }` to all queries. Data leak risk.

3. **Document all missing env vars in `.env.example`** — add `RESEND_API_KEY`, `RESEND_FROM_EMAIL`, `TWILIO_ACCOUNT_SID`, `TWILIO_AUTH_TOKEN`, `TWILIO_PHONE_NUMBER`, `BLOB_Public_READ_WRITE_TOKEN`, `CRON_SECRET`. Undocumented vars cause silent feature failures.

### P1 — Needed for strong beta

4. **Fix GBP navigation** — `src/lib/navigation.ts` labels `gbp-posts`/`gbp-photos`/`gbp-qa` as "Rank Tracker / Competitors / Reports" with `comingSoon: true`. Rename to "GBP Posts", "GBP Photos", "Q&A" pointing to their real routes (`/gbp/posts`, `/gbp/photos`, `/gbp/qa`). These are fully built but unreachable from the nav.

5. **Add automation job retry logic** — add `attemptCount Int @default(0)` + `maxAttempts Int @default(3)` to `AutomationJob`, retry on failure in `executePendingAutomationJobs`. Failed jobs currently stay stuck permanently.

6. **Remove placeholder copy from `campaigns/[id]`** — replace scaffolding text with real descriptive copy.

7. **Add test runner** — add Vitest to `package.json`, wire existing `.test.ts` files. `npm test` currently errors.

### P2 — Polish / Conversion / Scale Improvements

8. **Session invalidation on deactivation** — deactivated members stay "logged in" (session cookie persists) and see 404s until expiry. Store a `disabledAt` timestamp and check it in `getCurrentMembership`.

9. **Landing / marketing page** — the root `/` requires auth; unauthenticated visitors hit login directly. Add a lightweight public homepage.

10. **Billing integration** — `/billing` currently `redirect("/")`. Integrate Stripe/Paddle or mark it clearly unavailable.

11. **Delivery feedback loop** — add Resend webhook receiver and Twilio status callback to update `CampaignRecipient.status` from `SENT` → `OPENED`/`DELIVERED`/`BOUNCED`. Currently all sends are fire-and-forget.

12. **Campaign bulk send** — current campaign creation sends to one contact at a time. Add CSV/list-based bulk send for agency workflows.

---

## Recommended Claude Implementation Prompts

### Prompt 1 — P0: Fix embed VT video player (5 min)

> Fix the video embed bug in `src/app/embed/vt/[id]/page.tsx`. Currently, when a thumbnail URL exists the page renders `<img src={thumbnailUrl}>` instead of a video player — every embedded testimonial with a thumbnail shows a static non-playable image. Replace the conditional render with a single `<video>` element that always renders with `src={testimonial.videoUrl}`, `poster={thumbnailUrl ?? undefined}`, `controls`, `playsInline`, and `autoPlay={false}`, styled `max-h-screen w-full max-w-3xl`. Run `npm run typecheck && npm run build`. Commit as `"fix: embed VT route renders video player with poster thumbnail instead of static image"`. Do not change any other files.

### Prompt 2 — P0: Fix analytics org scoping

> Fix a data scope bug in `src/lib/analytics.ts`. The `getAnalyticsData()` function queries all reviews and campaign recipients without filtering by organization. Accept `organizationId: string` as a parameter and add location-scoped filtering: for reviews, join through location (`where: { location: { organizationId } }`); for campaign recipients, join through campaign and location. Update the call site in `src/app/analytics/page.tsx` to pass `membership.organizationId`. Run typecheck and build. Do not change the analytics UI structure — only the data layer.

### Prompt 3 — P1: Fix GBP navigation

> Fix the GBP navigation in `src/lib/navigation.ts`. Currently the nav items for GBP Posts, Photos, and Q&A are labeled "Rank Tracker", "Competitors", "Reports" with `comingSoon: true`, pointing to `/gbp/rank`, `/gbp/competitors`, `/gbp/reports` (non-existent routes). The real pages exist at `/gbp/posts`, `/gbp/photos`, `/gbp/qa`. Update these three nav items: change labels to "GBP Posts", "GBP Photos", "Q&A", update hrefs to the real routes, remove `comingSoon: true`, verify the `activeScreen` prop on each GBP sub-page matches the corrected keys. Run typecheck and build. Do not change any page content.

### Prompt 4 — P1: Automation job retry

> Add retry logic to the automation job queue. Schema change: add `attemptCount Int @default(0)` and `maxAttempts Int @default(3)` to the `AutomationJob` model in `prisma/schema.prisma`. Run `npx prisma migrate dev --name add_automation_job_retry_fields`. In `executePendingAutomationJobs()` in `src/lib/automation-engine.ts`, on job failure: increment `attemptCount`, only set `status=failed` if `attemptCount >= maxAttempts`, otherwise reset to `status=pending` for the next run cycle and preserve `errorMessage`. Update the Queue tab in `src/app/automation/[id]/automation-observe-client.tsx` to show attempt count on failed/retrying jobs. Run typecheck, build, and the smoke test (`POST /api/automation/smoke-test`). Commit as `"feat(automation): add job retry with attemptCount and maxAttempts"`.

### Prompt 5 — P1: Env var documentation + test runner

> Two small tasks in one commit. (1) Update `.env.example` to document all missing env vars: `RESEND_API_KEY`, `RESEND_FROM_EMAIL`, `TWILIO_ACCOUNT_SID`, `TWILIO_AUTH_TOKEN`, `TWILIO_PHONE_NUMBER`, `BLOB_Public_READ_WRITE_TOKEN`, and `CRON_SECRET`. Add a clear comment for each explaining what feature requires it and whether it is optional or required. (2) Add Vitest as a dev dependency (`npm install -D vitest`) and add `"test": "vitest run"` to the `scripts` section of `package.json`. Verify `npm test` runs the existing `.test.ts` files without errors. Run typecheck and build. Commit as `"chore: document missing env vars and add vitest test runner"`.

---

*Report generated 2026-06-09 from codebase inspection at commit `2a2eb49`.*
