# Onboarding Wizard Design

## Goal

Guide new users from signup to their first value moment — a location with Google connected and contacts ready to campaign — via a focused 3-step wizard. Users who skip can resume from a persistent dashboard checklist.

## Architecture

A dedicated `/onboarding` route with its own minimal layout (no AppShell). The index page (`/onboarding`) is a smart redirect that inspects the user's current data and forwards to whichever step is needed next. The dashboard gains a checklist component that derives completion state from existing data and shows until all steps are done or the user dismisses it.

After signup, users are redirected to `/onboarding` instead of `/`.

---

## Data Model

### Schema change

```prisma
model Organization {
  // ... existing fields
  onboardingDismissedAt DateTime?
}
```

### Migration

```sql
ALTER TABLE "Organization" ADD COLUMN "onboardingDismissedAt" TIMESTAMP(3);
```

No other schema changes. Step completion is derived from existing data:
- **Location done** → `organization.locations.length > 0`
- **Google done** → any location has `googleLocationName` set (i.e., a `GoogleAccountConnection` exists for the org)
- **Contacts done** → `contacts.length > 0` for the org

---

## Route Structure

```
src/app/onboarding/
  layout.tsx            — minimal layout: logo, 3-step progress bar, "Skip for now →" link
  page.tsx              — smart redirect to next incomplete step (or / if all done)
  location/page.tsx     — Step 1: add first location
  google/page.tsx       — Step 2: connect Google Business
  contacts/page.tsx     — Step 3: add first contacts
  actions.ts            — dismissOnboarding server action
```

---

## Layout (`src/app/onboarding/layout.tsx`)

- No AppShell — standalone page like `/suspended`
- Calls `requireActiveMembershipPage()` (not `requireSuperAdmin`) — regular users go through onboarding
- Header: WeHearYou logo (left) + "Skip for now →" link to `/` (right)
- Below header: 3-step progress bar showing which steps are done/active/pending
- Progress bar derives state from the same data checks as the smart redirect
- `<main>` wraps children in a centered `max-w-xl` container

---

## Smart Redirect (`src/app/onboarding/page.tsx`)

```
1. No locations          → redirect /onboarding/location
2. No Google connection  → redirect /onboarding/google
3. No contacts           → redirect /onboarding/contacts
4. All done              → redirect /
```

Checks performed server-side against the current org's data.

---

## Step 1: Location (`src/app/onboarding/location/page.tsx`)

Simplified location creation form — name, city, state, address (optional). Reuses the existing `createLocation` server action from `src/app/locations/actions.ts`.

**Fields:**
- Location name (required)
- City (required)
- State (required)
- Address (optional)

On submit: creates the location, then redirects to `/onboarding/google`.

No Google Places autocomplete in the wizard — that complexity belongs in the full location settings page. Users can enhance their location later.

---

## Step 2: Google (`src/app/onboarding/google/page.tsx`)

Two sub-states on this page:

**State A — Not connected yet:**
Shows a "Connect Google account →" button that initiates the existing Google OAuth flow at `/api/integrations/google/connect`. The OAuth callback (`/api/integrations/google/callback`) must redirect back to `/onboarding/google?connected=1` after a successful connection instead of `/integrations`.

Pass a `returnTo` or `state` parameter through the OAuth flow to control the post-callback redirect. The exact mechanism follows the existing OAuth implementation pattern.

**State B — Connected, needs location mapping:**
After OAuth (`?connected=1`), the page detects the Google connection exists and shows the `GoogleLocationsSearchList` component (already used in `/integrations`) to let the user pick their Google Business listing and map it to their WeHearYou location.

On successful mapping: redirect to `/onboarding/contacts`.

**Skip:** "Skip for now →" in the layout header exits to `/` at any time.

---

## Step 3: Contacts (`src/app/onboarding/contacts/page.tsx`)

Two entry points:

**Import CSV** — links to `/contacts/import` (existing page). After import, the user is returned to the dashboard (CSV import already handles its own redirect).

**Add manually** — inline form on the page: name, email (optional), phone (optional). Reuses the existing `createContact` server action from `src/app/contacts/actions.ts`. On submit: creates the contact, redirects to `/` with a success banner.

"Finish setup →" button submits the manual form. "Skip for now →" in the header exits to `/`.

---

## Dashboard Checklist

A new component `src/components/onboarding-checklist.tsx` rendered at the top of `src/app/page.tsx` (the main dashboard).

**Visibility:** Shown when:
- `onboardingDismissedAt` is null, AND
- At least one step is incomplete

Hidden automatically when all 3 steps are complete OR when dismissed.

**Items:**
1. Add your first location → `/onboarding/location`
2. Connect Google Business → `/onboarding/google`
3. Add your first contacts → `/onboarding/contacts`

Each item shows a checkmark when its condition is met, line-through on the label, and hides the CTA link. A progress bar fills as steps complete (0%, 33%, 67%, 100%).

**Dismiss:** A "Dismiss" link at the bottom calls `dismissOnboarding` server action, which sets `organization.onboardingDismissedAt = now()`. The checklist disappears immediately (revalidatePath).

---

## Server Actions (`src/app/onboarding/actions.ts`)

| Action | Description |
|---|---|
| `dismissOnboarding()` | Sets `org.onboardingDismissedAt = now()` for the current org |

All other onboarding actions reuse existing server actions (`createLocation`, `createContact`).

---

## Signup Change

In `src/app/signup/actions.ts`, after successful account creation, change the final redirect from `redirect("/")` to `redirect("/onboarding")`.

---

## File Map

| File | Change |
|---|---|
| `prisma/schema.prisma` | Add `onboardingDismissedAt DateTime?` to Organization |
| `prisma/migrations/20260526_add_onboarding/migration.sql` | ALTER TABLE |
| `src/app/signup/actions.ts` | Change post-signup redirect to `/onboarding` |
| `src/app/onboarding/layout.tsx` | **New** — minimal layout with progress bar + skip link |
| `src/app/onboarding/page.tsx` | **New** — smart redirect |
| `src/app/onboarding/location/page.tsx` | **New** — Step 1 form |
| `src/app/onboarding/google/page.tsx` | **New** — Step 2: OAuth + location mapping |
| `src/app/onboarding/contacts/page.tsx` | **New** — Step 3: CSV import link + manual add form |
| `src/app/onboarding/actions.ts` | **New** — `dismissOnboarding` |
| `src/components/onboarding-checklist.tsx` | **New** — dashboard checklist component |
| `src/app/page.tsx` | Add `<OnboardingChecklist>` at top of dashboard |
| `src/app/api/integrations/google/callback/route.ts` | Support `returnTo=/onboarding/google` after OAuth |

---

## What Is NOT Changing

- Location creation logic — reused as-is
- Contact creation logic — reused as-is
- Google OAuth flow — reused, callback gets `returnTo` support added
- `GoogleLocationsSearchList` component — reused as-is
- AppShell and org-scoped nav — untouched
- Existing `/locations/new`, `/contacts/new`, `/integrations` pages — untouched
