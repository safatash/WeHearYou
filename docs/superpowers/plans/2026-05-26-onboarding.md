# Onboarding Wizard Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Guide new users from signup to their first value moment via a 3-step `/onboarding` wizard (location → Google → contacts), with a persistent dashboard checklist until all steps are done or dismissed.

**Architecture:** A dedicated `/onboarding` route with a minimal layout (no AppShell) plus a smart redirect `page.tsx` that inspects org data and forwards to the next incomplete step. The dashboard gains an `OnboardingChecklist` component rendered at the top of `src/app/page.tsx`. Step completion is derived from existing data (no new DB columns), and the org gains an `onboardingDismissedAt` column to track explicit dismiss.

**Tech Stack:** Next.js 14 App Router (RSC, server actions), Prisma, TypeScript, Tailwind CSS

---

## Critical Architecture Note

The signup flow (`src/app/signup/actions.ts`) redirects to `/login?flash=...`, **not** to `/`. There is no post-signup redirect to change. Instead, `src/app/page.tsx` (the dashboard) checks onboarding completion and redirects to `/onboarding` for users who haven't finished setup. This gate catches all new users after login.

---

## File Map

| File | Change |
|---|---|
| `prisma/schema.prisma` | Add `onboardingDismissedAt DateTime?` to Organization |
| `prisma/migrations/20260526_add_onboarding_dismissed/migration.sql` | ALTER TABLE |
| `src/lib/google-oauth.ts` | Add `returnTo?` to `createOAuthState`, `parseOAuthState`, `buildGoogleOAuthUrl` |
| `src/app/api/integrations/google/callback/route.ts` | Use `parsedState.returnTo` when present |
| `src/app/onboarding/actions.ts` | **New** — `dismissOnboarding`, `createLocationForOnboarding`, `createContactForOnboarding`, `mapLocationToGoogleForOnboarding` |
| `src/app/onboarding/layout.tsx` | **New** — minimal layout with progress bar + skip link |
| `src/app/onboarding/page.tsx` | **New** — smart redirect to next incomplete step |
| `src/app/onboarding/location/page.tsx` | **New** — Step 1: name, city, state, address form |
| `src/app/onboarding/google/page.tsx` | **New** — Step 2: OAuth connect + location mapping |
| `src/app/onboarding/contacts/page.tsx` | **New** — Step 3: CSV import link + manual add form |
| `src/components/onboarding-checklist.tsx` | **New** — dashboard checklist component |
| `src/app/page.tsx` | Add onboarding redirect check + `<OnboardingChecklist>` |

---

## Task 1: Schema + Migration

**Files:**
- Modify: `prisma/schema.prisma`
- Create: `prisma/migrations/20260526_add_onboarding_dismissed/migration.sql`

- [ ] **Step 1: Add field to schema**

In `prisma/schema.prisma`, add `onboardingDismissedAt` to the Organization model (after `suspendedAt`):

```prisma
model Organization {
  id                    String                  @id @default(cuid())
  name                  String
  slug                  String                  @unique
  website               String?
  aiReplyEnabled        Boolean                 @default(false)
  suspendedAt           DateTime?
  onboardingDismissedAt DateTime?
  createdAt             DateTime                @default(now())
  updatedAt             DateTime                @updatedAt

  users             UserMembership[]
  locations         Location[]
  automations       Automation[]
  googleConnections GoogleAccountConnection[]
  reviewWidgets     ReviewWidget[]
}
```

- [ ] **Step 2: Create migration directory and file**

```bash
mkdir -p prisma/migrations/20260526_add_onboarding_dismissed
```

Create `prisma/migrations/20260526_add_onboarding_dismissed/migration.sql`:

```sql
-- AlterTable
ALTER TABLE "Organization" ADD COLUMN "onboardingDismissedAt" TIMESTAMP(3);
```

- [ ] **Step 3: Apply migration and regenerate client**

```bash
cd /Users/safatash/.openclaw/workspace/wehearyou
npx prisma migrate deploy
npx prisma generate
```

Expected: `1 migration applied`, then `Generated Prisma Client`.

- [ ] **Step 4: Commit**

```bash
git add prisma/schema.prisma prisma/migrations/20260526_add_onboarding_dismissed/
git commit -m "feat: add onboardingDismissedAt to Organization"
```

---

## Task 2: Google OAuth `returnTo` Support

**Files:**
- Modify: `src/lib/google-oauth.ts`
- Modify: `src/app/api/integrations/google/callback/route.ts`

- [ ] **Step 1: Update `createOAuthState` to accept `returnTo`**

In `src/lib/google-oauth.ts`, replace:

```typescript
export function buildGoogleOAuthUrl({ organizationId, connectionId }: { organizationId: string; connectionId?: string }) {
  const { clientId, redirectUri } = getGoogleOAuthConfig();
  const state = createOAuthState({ organizationId, connectionId });
```

With:

```typescript
export function buildGoogleOAuthUrl({ organizationId, connectionId, returnTo }: { organizationId: string; connectionId?: string; returnTo?: string }) {
  const { clientId, redirectUri } = getGoogleOAuthConfig();
  const state = createOAuthState({ organizationId, connectionId, returnTo });
```

- [ ] **Step 2: Update `createOAuthState` signature**

In `src/lib/google-oauth.ts`, replace:

```typescript
export function createOAuthState(payload: { organizationId: string; connectionId?: string }) {
  return Buffer.from(JSON.stringify({ ...payload, nonce: crypto.randomUUID() })).toString("base64url");
}
```

With:

```typescript
export function createOAuthState(payload: { organizationId: string; connectionId?: string; returnTo?: string }) {
  return Buffer.from(JSON.stringify({ ...payload, nonce: crypto.randomUUID() })).toString("base64url");
}
```

- [ ] **Step 3: Update `parseOAuthState` return type**

In `src/lib/google-oauth.ts`, replace:

```typescript
export function parseOAuthState(state: string) {
  try {
    return JSON.parse(Buffer.from(state, "base64url").toString("utf8")) as {
      organizationId: string;
      connectionId?: string;
      nonce: string;
    };
  } catch {
    return null;
  }
}
```

With:

```typescript
export function parseOAuthState(state: string) {
  try {
    return JSON.parse(Buffer.from(state, "base64url").toString("utf8")) as {
      organizationId: string;
      connectionId?: string;
      returnTo?: string;
      nonce: string;
    };
  } catch {
    return null;
  }
}
```

- [ ] **Step 4: Update callback to use `returnTo`**

In `src/app/api/integrations/google/callback/route.ts`, replace the success redirect inside the try block:

```typescript
    await upsertGoogleConnection({
      organizationId: parsedState.organizationId,
      providerAccountId: userInfo.sub,
      email: userInfo.email,
      accessToken: tokens.access_token,
      refreshToken: tokens.refresh_token,
      tokenType: tokens.token_type,
      scope: tokens.scope,
      expiresIn: tokens.expires_in,
    });

    return redirectToIntegrations("/integrations?google=connected");
```

With:

```typescript
    await upsertGoogleConnection({
      organizationId: parsedState.organizationId,
      providerAccountId: userInfo.sub,
      email: userInfo.email,
      accessToken: tokens.access_token,
      refreshToken: tokens.refresh_token,
      tokenType: tokens.token_type,
      scope: tokens.scope,
      expiresIn: tokens.expires_in,
    });

    const successPath = parsedState.returnTo
      ? `${parsedState.returnTo}?connected=1`
      : "/integrations?google=connected";
    return redirectToIntegrations(successPath);
```

- [ ] **Step 5: Verify TypeScript compiles**

```bash
cd /Users/safatash/.openclaw/workspace/wehearyou
npx tsc --noEmit
```

Expected: no errors related to these files.

- [ ] **Step 6: Commit**

```bash
git add src/lib/google-oauth.ts src/app/api/integrations/google/callback/route.ts
git commit -m "feat: add returnTo support to Google OAuth flow"
```

---

## Task 3: Onboarding Server Actions

**Files:**
- Create: `src/app/onboarding/actions.ts`

- [ ] **Step 1: Create the actions file**

Create `src/app/onboarding/actions.ts`:

```typescript
"use server";

import { ContactSource, PreferredChannel } from "@prisma/client";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { requireTeamManagement, requireLocationAccess } from "@/lib/authz";
import { getCurrentAccessibleLocationIds } from "@/lib/current-scope";

function normalize(value: FormDataEntryValue | null | undefined) {
  const text = typeof value === "string" ? value.trim() : "";
  return text.length > 0 ? text : null;
}

function slugify(value: string) {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .replace(/-{2,}/g, "-");
}

async function createUniqueSlug(organizationId: string, name: string) {
  const base = slugify(name) || "location";
  let slug = base;
  let suffix = 2;
  while (true) {
    const existing = await prisma.location.findUnique({
      where: { organizationId_slug: { organizationId, slug } },
      select: { id: true },
    });
    if (!existing) return slug;
    slug = `${base}-${suffix}`;
    suffix += 1;
  }
}

export async function dismissOnboarding() {
  const membership = await requireTeamManagement();
  await prisma.organization.update({
    where: { id: membership.organizationId },
    data: { onboardingDismissedAt: new Date() },
  });
  revalidatePath("/");
}

export async function createLocationForOnboarding(formData: FormData) {
  const membership = await requireTeamManagement();
  const name = normalize(formData.get("name"));
  const city = normalize(formData.get("city"));
  const state = normalize(formData.get("state"));
  const addressLine1 = normalize(formData.get("addressLine1"));

  if (!name || !city || !state) {
    redirect("/onboarding/location?error=" + encodeURIComponent("Name, city, and state are required."));
  }

  const slug = await createUniqueSlug(membership.organizationId, name);

  const location = await prisma.location.create({
    data: {
      organizationId: membership.organizationId,
      name,
      slug,
      city,
      state,
      status: "Launching",
      publicProfile: {
        create: {
          addressLine1,
          showReviews: true,
          showTestimonials: true,
          showMap: true,
          showHours: false,
          schemaEnabled: true,
        },
      },
    },
    select: { id: true },
  });

  revalidatePath("/");
  revalidatePath("/locations");
  redirect("/onboarding/google");
}

export async function createContactForOnboarding(formData: FormData) {
  const allowedLocationIds = await getCurrentAccessibleLocationIds();

  if (allowedLocationIds.length === 0) {
    redirect("/onboarding/contacts?error=" + encodeURIComponent("No location found. Complete step 1 first."));
  }

  const locationId = allowedLocationIds[0];
  const firstName = normalize(formData.get("firstName"));
  const lastName = normalize(formData.get("lastName"));
  const email = normalize(formData.get("email"));
  const phone = normalize(formData.get("phone"));

  if (!firstName && !lastName && !email && !phone) {
    redirect("/onboarding/contacts?error=" + encodeURIComponent("Add at least a name, email, or phone number."));
  }

  const fullName = [firstName, lastName].filter(Boolean).join(" ").trim();
  const name = fullName || email || phone || "Unnamed Contact";

  await prisma.contact.create({
    data: {
      locationId,
      firstName,
      lastName,
      name,
      email,
      phone,
      source: ContactSource.MANUAL,
      preferredChannel: PreferredChannel.SMS,
    },
  });

  revalidatePath("/");
  redirect("/?onboarding=done");
}

export async function mapLocationToGoogleForOnboarding(formData: FormData) {
  const locationId = String(formData.get("locationId") ?? "").trim();
  const googleConnectionId = String(formData.get("googleConnectionId") ?? "").trim();
  const googleLocationPayload = String(formData.get("googleLocationPayload") ?? "").trim();

  if (!locationId || !googleConnectionId || !googleLocationPayload) {
    redirect("/onboarding/google?error=" + encodeURIComponent("Select a Google Business location to continue."));
  }

  const membership = await requireLocationAccess(locationId);

  const connection = await prisma.googleAccountConnection.findFirst({
    where: { id: googleConnectionId, organizationId: membership.organizationId },
    select: { id: true },
  });

  if (!connection) {
    redirect("/onboarding/google?error=" + encodeURIComponent("Google connection not found."));
  }

  const parsed = JSON.parse(googleLocationPayload) as {
    googleLocationId: string;
    googleLocationName: string;
    googlePlaceId?: string;
    reviewLink?: string;
    mapsUri?: string;
  };

  await prisma.location.update({
    where: { id: locationId },
    data: {
      googleConnectionId,
      googleLocationId: parsed.googleLocationId,
      googlePlaceId: parsed.googlePlaceId || null,
      googleLocationName: parsed.googleLocationName,
      googleConnectedAt: new Date(),
      reviewLink: parsed.reviewLink || null,
      publicProfile: {
        upsert: {
          update: { googleMapsUrl: parsed.mapsUri || null },
          create: { googleMapsUrl: parsed.mapsUri || null },
        },
      },
    },
  });

  revalidatePath("/");
  revalidatePath("/integrations");
  redirect("/onboarding/contacts");
}
```

- [ ] **Step 2: Verify TypeScript compiles**

```bash
cd /Users/safatash/.openclaw/workspace/wehearyou
npx tsc --noEmit
```

Expected: no errors.

- [ ] **Step 3: Commit**

```bash
git add src/app/onboarding/actions.ts
git commit -m "feat: add onboarding server actions"
```

---

## Task 4: Onboarding Layout

**Files:**
- Create: `src/app/onboarding/layout.tsx`

The layout fetches membership to compute progress. It does NOT redirect — the child pages (`page.tsx`) handle redirects. The progress bar derives step state from org data.

- [ ] **Step 1: Create layout**

Create `src/app/onboarding/layout.tsx`:

```tsx
import Link from "next/link";
import { redirect } from "next/navigation";
import { getCurrentMembership } from "@/lib/authz";
import { prisma } from "@/lib/prisma";

export default async function OnboardingLayout({ children }: { children: React.ReactNode }) {
  const membership = await getCurrentMembership();

  if (!membership) {
    redirect("/login");
  }

  const org = await prisma.organization.findUnique({
    where: { id: membership.organizationId },
    select: {
      locations: {
        select: { id: true, googleLocationName: true },
        orderBy: { createdAt: "asc" },
        take: 1,
      },
      _count: { select: { locations: true } },
    },
  });

  const hasLocation = (org?._count.locations ?? 0) > 0;
  const hasGoogle = (org?.locations[0]?.googleLocationName ?? null) !== null;

  const contactCount = hasLocation
    ? await prisma.contact.count({
        where: { locationId: org!.locations[0].id },
      })
    : 0;
  const hasContacts = contactCount > 0;

  const steps = [
    { label: "Location", done: hasLocation },
    { label: "Google", done: hasGoogle },
    { label: "Contacts", done: hasContacts },
  ];

  return (
    <div className="min-h-screen bg-slate-50">
      <header className="flex items-center justify-between px-6 py-4 border-b border-slate-200 bg-white">
        <span className="text-[15px] font-bold tracking-tight text-slate-950">WeHearYou</span>
        <Link href="/" className="text-[13px] font-medium text-slate-500 hover:text-slate-900">
          Skip for now →
        </Link>
      </header>

      <div className="mx-auto max-w-xl px-4 pt-10">
        <div className="flex items-center gap-0 mb-10">
          {steps.map((step, i) => (
            <div key={step.label} className="flex items-center flex-1">
              <div className="flex items-center gap-2">
                <div
                  className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0 ${
                    step.done
                      ? "bg-indigo-600 text-white"
                      : "bg-slate-100 text-slate-400"
                  }`}
                >
                  {step.done ? "✓" : i + 1}
                </div>
                <span
                  className={`text-xs font-semibold whitespace-nowrap ${
                    step.done ? "text-indigo-600" : "text-slate-400"
                  }`}
                >
                  {step.label}
                </span>
              </div>
              {i < steps.length - 1 && (
                <div
                  className={`flex-1 h-0.5 mx-2 rounded-full ${
                    step.done ? "bg-indigo-600" : "bg-slate-200"
                  }`}
                />
              )}
            </div>
          ))}
        </div>

        {children}
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Verify TypeScript compiles**

```bash
cd /Users/safatash/.openclaw/workspace/wehearyou
npx tsc --noEmit
```

Expected: no errors.

- [ ] **Step 3: Commit**

```bash
git add src/app/onboarding/layout.tsx
git commit -m "feat: add onboarding layout with progress bar"
```

---

## Task 5: Smart Redirect Page

**Files:**
- Create: `src/app/onboarding/page.tsx`

- [ ] **Step 1: Create the smart redirect**

Create `src/app/onboarding/page.tsx`:

```tsx
import { redirect } from "next/navigation";
import { getCurrentMembership } from "@/lib/authz";
import { prisma } from "@/lib/prisma";

export default async function OnboardingPage() {
  const membership = await getCurrentMembership();

  if (!membership) {
    redirect("/login");
  }

  const org = await prisma.organization.findUnique({
    where: { id: membership.organizationId },
    select: {
      locations: {
        select: { id: true, googleLocationName: true },
        orderBy: { createdAt: "asc" },
        take: 1,
      },
      _count: { select: { locations: true } },
    },
  });

  const hasLocation = (org?._count.locations ?? 0) > 0;

  if (!hasLocation) {
    redirect("/onboarding/location");
  }

  const hasGoogle = (org?.locations[0]?.googleLocationName ?? null) !== null;

  if (!hasGoogle) {
    redirect("/onboarding/google");
  }

  const contactCount = await prisma.contact.count({
    where: { locationId: org!.locations[0].id },
  });

  if (contactCount === 0) {
    redirect("/onboarding/contacts");
  }

  redirect("/");
}
```

- [ ] **Step 2: Commit**

```bash
git add src/app/onboarding/page.tsx
git commit -m "feat: add onboarding smart redirect"
```

---

## Task 6: Step 1 — Location Page

**Files:**
- Create: `src/app/onboarding/location/page.tsx`

- [ ] **Step 1: Create the location step page**

Create `src/app/onboarding/location/page.tsx`:

```tsx
import { createLocationForOnboarding } from "@/app/onboarding/actions";
import { FormSubmitButton } from "@/components/form-submit-button";

export default async function OnboardingLocationPage({
  searchParams,
}: {
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
}) {
  const params = (await searchParams) ?? {};
  const error = typeof params.error === "string" ? params.error : undefined;

  return (
    <div className="rounded-3xl border border-slate-200 bg-white p-8 shadow-[0_12px_32px_rgba(15,23,42,0.06)]">
      <p className="text-[11px] font-bold uppercase tracking-[0.16em] text-indigo-600 mb-2">Step 1 of 3</p>
      <h2 className="text-[22px] font-bold tracking-tight text-slate-950 mb-1">Add your first location</h2>
      <p className="text-sm text-slate-500 mb-7 leading-relaxed">
        Each location gets its own review funnel, contacts, and Google connection.
      </p>

      {error && (
        <div className="mb-5 rounded-2xl bg-rose-50 border border-rose-200 px-4 py-3 text-sm text-rose-700">
          {error}
        </div>
      )}

      <form action={createLocationForOnboarding} className="space-y-4">
        <div>
          <label className="block text-[13px] font-semibold text-slate-700 mb-1.5">
            Location name
          </label>
          <input
            name="name"
            required
            placeholder="e.g. Downtown Clinic"
            className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-2.5 text-sm text-slate-900 placeholder:text-slate-400 focus:border-indigo-400 focus:outline-none focus:ring-2 focus:ring-indigo-100"
          />
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-[13px] font-semibold text-slate-700 mb-1.5">City</label>
            <input
              name="city"
              required
              placeholder="Austin"
              className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-2.5 text-sm text-slate-900 placeholder:text-slate-400 focus:border-indigo-400 focus:outline-none focus:ring-2 focus:ring-indigo-100"
            />
          </div>
          <div>
            <label className="block text-[13px] font-semibold text-slate-700 mb-1.5">State</label>
            <input
              name="state"
              required
              placeholder="TX"
              className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-2.5 text-sm text-slate-900 placeholder:text-slate-400 focus:border-indigo-400 focus:outline-none focus:ring-2 focus:ring-indigo-100"
            />
          </div>
        </div>

        <div>
          <label className="block text-[13px] font-semibold text-slate-700 mb-1.5">
            Address <span className="font-normal text-slate-400">(optional)</span>
          </label>
          <input
            name="addressLine1"
            placeholder="123 Main St"
            className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-2.5 text-sm text-slate-900 placeholder:text-slate-400 focus:border-indigo-400 focus:outline-none focus:ring-2 focus:ring-indigo-100"
          />
        </div>

        <div className="flex items-center justify-end pt-2">
          <FormSubmitButton
            idleLabel="Continue →"
            pendingLabel="Saving..."
            className="rounded-2xl bg-slate-950 px-6 py-2.5 text-sm font-semibold text-white hover:bg-slate-800 disabled:opacity-50"
          />
        </div>
      </form>
    </div>
  );
}
```

- [ ] **Step 2: Commit**

```bash
git add src/app/onboarding/location/page.tsx
git commit -m "feat: add onboarding location step"
```

---

## Task 7: Step 2 — Google Page

**Files:**
- Create: `src/app/onboarding/google/page.tsx`
- Create: `src/app/onboarding/google/google-mapping-form.tsx`

This step has two states:
- **State A**: Not connected → show "Connect Google" button
- **State B**: Connected (`?connected=1`) → show location picker and mapping form

The `GoogleLocationsSearchList` component is display-only. We need a new client component `GoogleMappingForm` that renders selectable location cards and submits the `mapLocationToGoogleForOnboarding` action.

- [ ] **Step 1: Create the GoogleMappingForm client component**

Create `src/app/onboarding/google/google-mapping-form.tsx`:

```tsx
"use client";

import { useState } from "react";
import type { GoogleBusinessLocation } from "@/lib/google-oauth";
import { mapLocationToGoogleForOnboarding } from "@/app/onboarding/actions";
import { FormSubmitButton } from "@/components/form-submit-button";

type Props = {
  locationId: string;
  googleConnectionId: string;
  googleLocations: Array<GoogleBusinessLocation & { accountName?: string; accountResourceName?: string }>;
};

export function GoogleMappingForm({ locationId, googleConnectionId, googleLocations }: Props) {
  const [query, setQuery] = useState("");
  const [selected, setSelected] = useState<GoogleBusinessLocation & { accountName?: string; accountResourceName?: string } | null>(null);

  const filtered = googleLocations.filter((loc) => {
    const q = query.toLowerCase();
    return (
      (loc.title ?? loc.name).toLowerCase().includes(q) ||
      (loc.accountName ?? "").toLowerCase().includes(q) ||
      (loc.storefrontAddress?.locality ?? "").toLowerCase().includes(q)
    );
  });

  const payload = selected
    ? JSON.stringify({
        googleLocationId: selected.name.split("/").pop() ?? selected.name,
        googleLocationName: selected.name,
        googlePlaceId: selected.metadata?.placeId,
        reviewLink: selected.metadata?.newReviewUri,
        mapsUri: selected.metadata?.mapsUri,
      })
    : "";

  return (
    <form action={mapLocationToGoogleForOnboarding}>
      <input type="hidden" name="locationId" value={locationId} />
      <input type="hidden" name="googleConnectionId" value={googleConnectionId} />
      <input type="hidden" name="googleLocationPayload" value={payload} />

      <input
        type="text"
        placeholder="Search locations..."
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-2.5 text-sm text-slate-900 placeholder:text-slate-400 focus:border-indigo-400 focus:outline-none focus:ring-2 focus:ring-indigo-100 mb-3"
      />

      <div className="space-y-2 max-h-64 overflow-y-auto mb-4">
        {filtered.map((loc) => {
          const isSelected = selected?.name === loc.name;
          return (
            <button
              key={loc.name}
              type="button"
              onClick={() => setSelected(isSelected ? null : loc)}
              className={`w-full text-left rounded-2xl border p-3 text-sm transition-colors ${
                isSelected
                  ? "border-indigo-400 bg-indigo-50"
                  : "border-slate-200 bg-white hover:border-slate-300"
              }`}
            >
              <p className="font-semibold text-slate-900">{loc.title ?? loc.name}</p>
              <p className="text-slate-500 mt-0.5">
                {[loc.storefrontAddress?.locality, loc.storefrontAddress?.administrativeArea]
                  .filter(Boolean)
                  .join(", ") || "Address not available"}
              </p>
            </button>
          );
        })}
        {filtered.length === 0 && (
          <p className="text-sm text-slate-400 py-2">No locations match your search.</p>
        )}
      </div>

      <div className="flex items-center justify-between">
        <span className="text-xs text-slate-400">
          {selected ? `Selected: ${selected.title ?? selected.name}` : "No location selected"}
        </span>
        <FormSubmitButton
          idleLabel="Map & Continue →"
          pendingLabel="Mapping..."
          disabled={!selected}
          className="rounded-2xl bg-slate-950 px-6 py-2.5 text-sm font-semibold text-white hover:bg-slate-800 disabled:opacity-40 disabled:cursor-not-allowed"
        />
      </div>
    </form>
  );
}
```

- [ ] **Step 2: Create the Google step page**

Create `src/app/onboarding/google/page.tsx`:

```tsx
import Link from "next/link";
import { redirect } from "next/navigation";
import { getCurrentMembership } from "@/lib/authz";
import { prisma } from "@/lib/prisma";
import { buildGoogleOAuthUrl, getGoogleConnections, getGoogleOAuthConfig } from "@/lib/google-oauth";
import { FormSubmitButton } from "@/components/form-submit-button";
import { GoogleMappingForm } from "./google-mapping-form";

export default async function OnboardingGooglePage({
  searchParams,
}: {
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
}) {
  const membership = await getCurrentMembership();

  if (!membership) {
    redirect("/login");
  }

  const params = (await searchParams) ?? {};
  const connected = params.connected === "1";
  const error = typeof params.error === "string" ? params.error : undefined;

  const googleConfig = getGoogleOAuthConfig();
  const googleReady = Boolean(googleConfig.clientId && googleConfig.clientSecret && googleConfig.redirectUri);

  const googleOAuthUrl = googleReady
    ? buildGoogleOAuthUrl({
        organizationId: membership.organizationId,
        returnTo: "/onboarding/google",
      })
    : null;

  const location = await prisma.location.findFirst({
    where: { organizationId: membership.organizationId },
    orderBy: { createdAt: "asc" },
    select: { id: true, googleLocationName: true },
  });

  if (!location) {
    redirect("/onboarding/location");
  }

  const alreadyMapped = Boolean(location.googleLocationName);

  if (alreadyMapped) {
    redirect("/onboarding/contacts");
  }

  const googleConnections = await getGoogleConnections(membership.organizationId);
  const hasConnection = googleConnections.length > 0;

  return (
    <div className="rounded-3xl border border-slate-200 bg-white p-8 shadow-[0_12px_32px_rgba(15,23,42,0.06)]">
      <p className="text-[11px] font-bold uppercase tracking-[0.16em] text-indigo-600 mb-2">Step 2 of 3</p>
      <h2 className="text-[22px] font-bold tracking-tight text-slate-950 mb-1">Connect Google Business</h2>
      <p className="text-sm text-slate-500 mb-7 leading-relaxed">
        Link your Google Business Profile so WeHearYou can sync your reviews and route customers to leave new ones.
      </p>

      {error && (
        <div className="mb-5 rounded-2xl bg-rose-50 border border-rose-200 px-4 py-3 text-sm text-rose-700">
          {error}
        </div>
      )}

      {!hasConnection ? (
        <div className="rounded-2xl border border-slate-200 bg-slate-50 p-6 text-center">
          <div className="w-10 h-10 rounded-full bg-[#4285F4] flex items-center justify-center mx-auto mb-3 text-white font-bold text-lg">
            G
          </div>
          <p className="text-sm font-semibold text-slate-900 mb-1">Connect with Google</p>
          <p className="text-xs text-slate-500 mb-5">
            You&apos;ll be redirected to sign in and grant access to your Business Profile.
          </p>
          {googleOAuthUrl ? (
            <Link
              href={googleOAuthUrl}
              className="inline-block rounded-2xl bg-[#4285F4] px-5 py-2.5 text-sm font-semibold text-white hover:bg-[#3367D6]"
            >
              Connect Google account →
            </Link>
          ) : (
            <p className="text-xs text-amber-700">Google OAuth is not configured. Contact your administrator.</p>
          )}
          <p className="mt-4 text-xs text-slate-400">
            WeHearYou only reads reviews and business info. We never post on your behalf.
          </p>
        </div>
      ) : (
        <div>
          {connected && (
            <div className="mb-5 rounded-2xl bg-emerald-50 border border-emerald-200 px-4 py-3 text-sm text-emerald-700 font-medium">
              Google account connected! Now select your business location below.
            </div>
          )}
          <p className="text-sm font-semibold text-slate-800 mb-3">
            Select your Google Business location to map to {location.id && "your location"}:
          </p>
          <GoogleMappingForm
            locationId={location.id}
            googleConnectionId={googleConnections[0].id}
            googleLocations={googleConnections[0].googleLocations}
          />
        </div>
      )}
    </div>
  );
}
```

- [ ] **Step 3: Verify TypeScript compiles**

```bash
cd /Users/safatash/.openclaw/workspace/wehearyou
npx tsc --noEmit
```

Expected: no errors.

- [ ] **Step 4: Commit**

```bash
git add src/app/onboarding/google/
git commit -m "feat: add onboarding Google step with OAuth and mapping form"
```

---

## Task 8: Step 3 — Contacts Page

**Files:**
- Create: `src/app/onboarding/contacts/page.tsx`

- [ ] **Step 1: Create the contacts step page**

Create `src/app/onboarding/contacts/page.tsx`:

```tsx
import Link from "next/link";
import { createContactForOnboarding } from "@/app/onboarding/actions";
import { FormSubmitButton } from "@/components/form-submit-button";

export default async function OnboardingContactsPage({
  searchParams,
}: {
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
}) {
  const params = (await searchParams) ?? {};
  const error = typeof params.error === "string" ? params.error : undefined;

  return (
    <div className="rounded-3xl border border-slate-200 bg-white p-8 shadow-[0_12px_32px_rgba(15,23,42,0.06)]">
      <p className="text-[11px] font-bold uppercase tracking-[0.16em] text-indigo-600 mb-2">Step 3 of 3</p>
      <h2 className="text-[22px] font-bold tracking-tight text-slate-950 mb-1">Add your first contacts</h2>
      <p className="text-sm text-slate-500 mb-7 leading-relaxed">
        Add customers you&apos;d like to reach out to for reviews. Import a CSV or add one manually to get started.
      </p>

      {error && (
        <div className="mb-5 rounded-2xl bg-rose-50 border border-rose-200 px-4 py-3 text-sm text-rose-700">
          {error}
        </div>
      )}

      <div className="grid grid-cols-2 gap-3 mb-6">
        <Link
          href="/contacts/import"
          className="rounded-2xl border-[1.5px] border-indigo-400 bg-indigo-50 p-4 block"
        >
          <p className="text-[13px] font-bold text-indigo-600 mb-1">Import CSV</p>
          <p className="text-xs text-indigo-500">Upload a spreadsheet with names, emails, and phone numbers</p>
        </Link>
        <div className="rounded-2xl border-[1.5px] border-slate-200 bg-slate-50 p-4">
          <p className="text-[13px] font-bold text-slate-800 mb-1">Add manually</p>
          <p className="text-xs text-slate-500">Enter a few contacts below to get started quickly</p>
        </div>
      </div>

      <form action={createContactForOnboarding} className="space-y-4">
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-[13px] font-semibold text-slate-700 mb-1.5">First name</label>
            <input
              name="firstName"
              placeholder="Jane"
              className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-2.5 text-sm text-slate-900 placeholder:text-slate-400 focus:border-indigo-400 focus:outline-none focus:ring-2 focus:ring-indigo-100"
            />
          </div>
          <div>
            <label className="block text-[13px] font-semibold text-slate-700 mb-1.5">Last name</label>
            <input
              name="lastName"
              placeholder="Smith"
              className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-2.5 text-sm text-slate-900 placeholder:text-slate-400 focus:border-indigo-400 focus:outline-none focus:ring-2 focus:ring-indigo-100"
            />
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-[13px] font-semibold text-slate-700 mb-1.5">
              Email <span className="font-normal text-slate-400">(optional)</span>
            </label>
            <input
              name="email"
              type="email"
              placeholder="jane@example.com"
              className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-2.5 text-sm text-slate-900 placeholder:text-slate-400 focus:border-indigo-400 focus:outline-none focus:ring-2 focus:ring-indigo-100"
            />
          </div>
          <div>
            <label className="block text-[13px] font-semibold text-slate-700 mb-1.5">
              Phone <span className="font-normal text-slate-400">(optional)</span>
            </label>
            <input
              name="phone"
              type="tel"
              placeholder="+1 555 000 0000"
              className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-2.5 text-sm text-slate-900 placeholder:text-slate-400 focus:border-indigo-400 focus:outline-none focus:ring-2 focus:ring-indigo-100"
            />
          </div>
        </div>

        <div className="flex items-center justify-end pt-2">
          <FormSubmitButton
            idleLabel="Finish setup →"
            pendingLabel="Saving..."
            className="rounded-2xl bg-slate-950 px-6 py-2.5 text-sm font-semibold text-white hover:bg-slate-800 disabled:opacity-50"
          />
        </div>
      </form>
    </div>
  );
}
```

- [ ] **Step 2: Commit**

```bash
git add src/app/onboarding/contacts/page.tsx
git commit -m "feat: add onboarding contacts step"
```

---

## Task 9: Dashboard Checklist Component

**Files:**
- Create: `src/components/onboarding-checklist.tsx`

- [ ] **Step 1: Create the checklist component**

Create `src/components/onboarding-checklist.tsx`:

```tsx
import Link from "next/link";
import { dismissOnboarding } from "@/app/onboarding/actions";
import { FormSubmitButton } from "@/components/form-submit-button";

type Props = {
  hasLocation: boolean;
  hasGoogle: boolean;
  hasContacts: boolean;
};

export function OnboardingChecklist({ hasLocation, hasGoogle, hasContacts }: Props) {
  const doneCount = [hasLocation, hasGoogle, hasContacts].filter(Boolean).length;
  const pct = Math.round((doneCount / 3) * 100);
  const subtitle =
    doneCount === 0
      ? "Complete these steps to start collecting reviews"
      : doneCount === 1
        ? "1 step done — keep going!"
        : "2 steps done — almost there!";

  const items = [
    {
      done: hasLocation,
      title: "Add your first location",
      desc: "Set up a location to start your review funnel",
      cta: "Set up →",
      href: "/onboarding/location",
    },
    {
      done: hasGoogle,
      title: "Connect Google Business",
      desc: "Sync reviews and route customers to your listing",
      cta: "Connect →",
      href: "/onboarding/google",
    },
    {
      done: hasContacts,
      title: "Add your first contacts",
      desc: "Import customers to start sending review requests",
      cta: "Add contacts →",
      href: "/onboarding/contacts",
    },
  ];

  return (
    <div className="rounded-[20px] border border-slate-200 bg-white p-6 shadow-[0_4px_16px_rgba(15,23,42,0.05)]">
      <div className="flex items-start justify-between mb-5">
        <div>
          <p className="text-[15px] font-bold text-slate-950">Finish setting up WeHearYou</p>
          <p className="text-xs text-slate-500 mt-0.5">{subtitle}</p>
        </div>
        <span className="text-[13px] font-bold text-indigo-600">{doneCount} / 3</span>
      </div>

      <div className="h-1 bg-slate-100 rounded-full overflow-hidden mb-5">
        <div
          className="h-full rounded-full bg-gradient-to-r from-indigo-600 to-indigo-400 transition-all duration-500"
          style={{ width: `${pct}%` }}
        />
      </div>

      <div className="space-y-2.5">
        {items.map((item) => (
          <div
            key={item.title}
            className={`flex items-center gap-3.5 rounded-2xl border p-3.5 ${
              item.done
                ? "border-emerald-200 bg-emerald-50"
                : "border-slate-200 bg-slate-50"
            }`}
          >
            <div
              className={`w-[22px] h-[22px] rounded-full border-2 flex items-center justify-center flex-shrink-0 text-[11px] font-bold ${
                item.done
                  ? "border-emerald-500 bg-emerald-500 text-white"
                  : "border-slate-300"
              }`}
            >
              {item.done ? "✓" : ""}
            </div>
            <div className="flex-1 min-w-0">
              <p
                className={`text-sm font-semibold ${
                  item.done ? "line-through text-slate-400" : "text-slate-900"
                }`}
              >
                {item.title}
              </p>
              <p className="text-xs text-slate-500 mt-0.5">{item.desc}</p>
            </div>
            {!item.done && (
              <Link
                href={item.href}
                className="text-xs font-semibold text-indigo-600 whitespace-nowrap hover:text-indigo-700"
              >
                {item.cta}
              </Link>
            )}
          </div>
        ))}
      </div>

      <form action={dismissOnboarding} className="mt-4">
        <button
          type="submit"
          className="text-xs text-slate-400 hover:text-slate-600 font-medium"
        >
          Dismiss
        </button>
      </form>
    </div>
  );
}
```

- [ ] **Step 2: Commit**

```bash
git add src/components/onboarding-checklist.tsx
git commit -m "feat: add OnboardingChecklist dashboard component"
```

---

## Task 10: Wire Dashboard Page

**Files:**
- Modify: `src/app/page.tsx`

The dashboard page needs to:
1. Check if onboarding is incomplete → redirect to `/onboarding`
2. Render `<OnboardingChecklist>` when incomplete and not dismissed

- [ ] **Step 1: Update `src/app/page.tsx`**

Replace the entire file with:

```tsx
export const dynamic = "force-dynamic";

import Link from "next/link";
import { redirect } from "next/navigation";
import { AppShell } from "@/components/app-shell";
import { OutcomeCard, PrimaryButton, SectionHeading, SecondaryButton, StatCard } from "@/components/ui";
import { getDashboardData } from "@/lib/dashboard";
import { getCurrentAccessibleLocationIds } from "@/lib/current-scope";
import { getCurrentMembership } from "@/lib/authz";
import { prisma } from "@/lib/prisma";
import { OnboardingChecklist } from "@/components/onboarding-checklist";

export default async function DashboardPage() {
  const membership = await getCurrentMembership();

  if (!membership) {
    redirect("/login");
  }

  const org = await prisma.organization.findUnique({
    where: { id: membership.organizationId },
    select: {
      onboardingDismissedAt: true,
      locations: {
        select: { id: true, googleLocationName: true },
        orderBy: { createdAt: "asc" },
        take: 1,
      },
      _count: { select: { locations: true } },
    },
  });

  const hasLocation = (org?._count.locations ?? 0) > 0;
  const hasGoogle = (org?.locations[0]?.googleLocationName ?? null) !== null;
  const contactCount = hasLocation
    ? await prisma.contact.count({ where: { locationId: org!.locations[0].id } })
    : 0;
  const hasContacts = contactCount > 0;

  const dismissed = Boolean(org?.onboardingDismissedAt);
  const allDone = hasLocation && hasGoogle && hasContacts;
  const showChecklist = !dismissed && !allDone;

  if (!hasLocation && !dismissed) {
    redirect("/onboarding");
  }

  const locationIds = await getCurrentAccessibleLocationIds();
  const dashboard = await getDashboardData(locationIds);

  return (
    <AppShell activeScreen="dashboard">
      <div className="space-y-6">
        {showChecklist && (
          <OnboardingChecklist
            hasLocation={hasLocation}
            hasGoogle={hasGoogle}
            hasContacts={hasContacts}
          />
        )}

        <SectionHeading
          eyebrow="Dashboard Overview"
          title="Review funnel performance across requests, redirects, and feedback"
          description="Built to feel like the grown-up product version of your plugin dashboard, with visibility into tokenized requests, public review wins, and private feedback capture."
          actions={
            <>
              <Link href="/campaigns/new">
                <PrimaryButton>Send New Request</PrimaryButton>
              </Link>
              <Link href="/funnel-preview">
                <SecondaryButton>View Funnel</SecondaryButton>
              </Link>
            </>
          }
        />

        <div className="grid gap-4 xl:grid-cols-3">
          <StatCard title="Total Reviews" value={dashboard.totalReviews} meta="Combined Google + Facebook reviews" />
          <StatCard title="Average Rating" value={dashboard.averageRating} meta="Live reputation score across channels" />
          <StatCard title="Request Conversion" value={dashboard.requestConversion} meta="Sent invite to meaningful funnel activity" />
        </div>

        <div className="grid gap-6 xl:grid-cols-[1.45fr_0.95fr]">
          <section className="rounded-[28px] border border-slate-200/80 bg-white p-6 shadow-[0_12px_32px_rgba(15,23,42,0.05)]">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-lg font-semibold text-slate-950">Review Trends</h3>
                <p className="mt-1 text-sm text-slate-500">Public review growth and funnel completions over the last 12 weeks</p>
              </div>
              <Link href="/analytics" className="rounded-full bg-emerald-50 px-3 py-1 text-xs font-semibold text-emerald-700">
                Live activity
              </Link>
            </div>
            <div className="mt-8 flex h-72 items-end gap-3">
              {dashboard.reviewTrendBars.map((bar, index) => (
                <div key={index} className="flex flex-1 flex-col items-center gap-3">
                  <div className="w-full rounded-t-2xl bg-gradient-to-t from-indigo-600 to-sky-400" style={{ height: `${bar * 1.6}px` }} />
                  <span className="text-xs text-slate-400">W{index + 1}</span>
                </div>
              ))}
            </div>
          </section>

          <div className="space-y-6">
            <section className="rounded-[28px] border border-slate-200/80 bg-white p-6 shadow-[0_12px_32px_rgba(15,23,42,0.05)]">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-lg font-semibold text-slate-950">Recent Funnel Outcomes</h3>
                  <p className="mt-1 text-sm text-slate-500">Quick preview of what happened after request sends</p>
                </div>
                <Link href="/reviews" className="text-sm font-semibold text-indigo-600">
                  Open inbox
                </Link>
              </div>
              <div className="mt-6 space-y-4">
                <OutcomeCard title="Redirected to Google" count={String(dashboard.funnelOutcomes.redirectedToGoogle)} tone="positive" />
                <OutcomeCard title="Private feedback captured" count={String(dashboard.funnelOutcomes.privateFeedback)} tone="warning" />
                <OutcomeCard title="Opened, awaiting response" count={String(dashboard.funnelOutcomes.awaitingResponse)} tone="neutral" />
                <OutcomeCard title="Webhook-triggered requests" count={String(dashboard.funnelOutcomes.webhookTriggered)} tone="neutral" />
              </div>
            </section>

            <section className="rounded-[28px] border border-slate-200/80 bg-white p-6 shadow-[0_12px_32px_rgba(15,23,42,0.05)]">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-lg font-semibold text-slate-950">Agency View</h3>
                  <p className="mt-1 text-sm text-slate-500">Manage multiple locations, each with its own links, contacts, and performance.</p>
                </div>
                <Link href="/locations" className="text-sm font-semibold text-indigo-600">
                  Open locations
                </Link>
              </div>
              <div className="mt-6 grid gap-3">
                {dashboard.locations.map((location) => (
                  <div key={location.id} className="rounded-2xl bg-slate-50 p-4">
                    <div className="flex items-center justify-between gap-3">
                      <p className="font-semibold text-slate-900">{location.name.replace("Nova Dental, ", "")}</p>
                      <span className={`rounded-full px-3 py-1 text-xs font-semibold uppercase tracking-[0.18em] ${location.status === "Active" ? "bg-emerald-50 text-emerald-700" : "bg-amber-50 text-amber-700"}`}>
                        {location.avgRating ? `${location.avgRating.toFixed(1)} ★` : location.status}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </section>
          </div>
        </div>
      </div>
    </AppShell>
  );
}
```

- [ ] **Step 2: Verify TypeScript compiles**

```bash
cd /Users/safatash/.openclaw/workspace/wehearyou
npx tsc --noEmit
```

Expected: no errors.

- [ ] **Step 3: Start dev server and smoke-test**

```bash
npm run dev
```

Navigate to `http://localhost:3000`:
- If logged in as an org with no locations: should redirect to `/onboarding`
- `/onboarding` should redirect to `/onboarding/location`
- `/onboarding/location` should show the 3-step layout with the location form
- After submitting the form: redirects to `/onboarding/google`
- After all steps complete: dashboard shows checklist until dismissed

- [ ] **Step 4: Commit**

```bash
git add src/app/page.tsx
git commit -m "feat: wire onboarding checklist and redirect to dashboard"
```

---

## Self-Review Checklist

Spec coverage vs plan:

| Spec requirement | Task |
|---|---|
| `onboardingDismissedAt` on Organization | Task 1 |
| Smart redirect at `/onboarding` | Task 5 |
| Minimal layout with progress bar + skip link | Task 4 |
| Step 1: location form (name, city, state, address optional) | Task 6 |
| Step 2: Google OAuth connect | Task 7 |
| Step 2: Google location mapping | Task 7 |
| OAuth callback `returnTo` support | Task 2 |
| Step 3: CSV import link | Task 8 |
| Step 3: manual contact add | Task 8 |
| `dismissOnboarding` server action | Task 3 |
| Dashboard checklist with progress bar | Task 9 |
| Dashboard redirects to `/onboarding` for new users | Task 10 |
| Checklist auto-hides when all done or dismissed | Task 10 |

**Note on signup redirect:** The spec says to change the post-signup redirect, but signup goes to `/login`, not `/`. The dashboard redirect in Task 10 achieves the same result for all new users after login.
