# Yelp Review Integration Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Let users connect a Yelp business URL to a location, scrape reviews from the public Yelp page, store them in the existing `Review` table, and sync them on a schedule.

**Architecture:** User provides their `yelp.com/biz/...` URL on the location detail page. A server action fetches the Yelp page, extracts JSON-LD structured data (no extra dependencies needed), and upserts reviews into the existing `Review` table with `source: YELP`. A cron job re-syncs all connected Yelp locations daily. No OAuth — Yelp public pages are publicly accessible.

**Tech Stack:** Next.js 14 App Router, Prisma + PostgreSQL, server actions, native `fetch` + JSON-LD regex parsing (no new npm dependencies).

---

## File Map

| File | Change |
|---|---|
| `prisma/schema.prisma` | Add `YELP` to `ReviewSource` enum; add 7 Yelp fields to `Location` model |
| `prisma/migrations/20260525_add_yelp_integration/migration.sql` | SQL for enum value + new columns |
| `src/lib/yelp-scraper.ts` | **New** — fetch Yelp page, parse JSON-LD, return typed reviews |
| `src/app/locations/actions.ts` | Add `connectYelp`, `syncYelpReviews`, `disconnectYelp` server actions |
| `src/lib/yelp-sync-cron.ts` | **New** — sync all Yelp-connected locations in batch |
| `src/app/api/cron/route.ts` | Call `syncAllYelpLocations()` from cron |
| `src/app/locations/[id]/page.tsx` | Add Yelp connect/sync section after Google section, before Danger Zone |

---

## Task 1: Schema — add YELP to ReviewSource + Yelp fields to Location

**Files:**
- Modify: `prisma/schema.prisma`
- Create: `prisma/migrations/20260525_add_yelp_integration/migration.sql`

- [ ] **Step 1: Add YELP to ReviewSource enum in schema.prisma**

Open `prisma/schema.prisma`. Find the `ReviewSource` enum (currently lines ~52-55):

```prisma
enum ReviewSource {
  GOOGLE
  FACEBOOK
  YELP
  INTERNAL
}
```

- [ ] **Step 2: Add Yelp fields to the Location model in schema.prisma**

In the `Location` model, after the `googleConnectedAt` field (around line 205), add:

```prisma
  yelpBusinessUrl     String?
  yelpBusinessName    String?
  yelpBusinessId      String?
  yelpConnectedAt     DateTime?
  yelpLastSyncAt      DateTime?
  yelpLastSyncStatus  String?
  yelpLastSyncCount   Int?
```

- [ ] **Step 3: Create the migration directory and SQL file**

```bash
mkdir -p prisma/migrations/20260525_add_yelp_integration
```

Create `prisma/migrations/20260525_add_yelp_integration/migration.sql`:

```sql
-- Add YELP to ReviewSource enum
ALTER TYPE "ReviewSource" ADD VALUE 'YELP';

-- Add Yelp fields to Location
ALTER TABLE "Location" ADD COLUMN "yelpBusinessUrl" TEXT;
ALTER TABLE "Location" ADD COLUMN "yelpBusinessName" TEXT;
ALTER TABLE "Location" ADD COLUMN "yelpBusinessId" TEXT;
ALTER TABLE "Location" ADD COLUMN "yelpConnectedAt" TIMESTAMP(3);
ALTER TABLE "Location" ADD COLUMN "yelpLastSyncAt" TIMESTAMP(3);
ALTER TABLE "Location" ADD COLUMN "yelpLastSyncStatus" TEXT;
ALTER TABLE "Location" ADD COLUMN "yelpLastSyncCount" INTEGER;
```

- [ ] **Step 4: Apply the migration**

```bash
npx prisma migrate dev --name add_yelp_integration
```

Expected: `✓ Generated Prisma Client` and no errors. The dev database now has the new columns.

- [ ] **Step 5: Regenerate Prisma client and verify**

```bash
npx prisma generate
```

Then confirm the types exist:
```bash
node -e "const { PrismaClient } = require('@prisma/client'); console.log('YELP in ReviewSource:', !!require('@prisma/client').ReviewSource.YELP)"
```

Expected output: `YELP in ReviewSource: true`

- [ ] **Step 6: Commit**

```bash
git add prisma/schema.prisma prisma/migrations/20260525_add_yelp_integration/
git commit -m "feat: add YELP to ReviewSource enum and Yelp fields to Location"
```

---

## Task 2: Yelp scraper library

**Files:**
- Create: `src/lib/yelp-scraper.ts`

- [ ] **Step 1: Create `src/lib/yelp-scraper.ts` with the following content**

```typescript
export type YelpReview = {
  externalId: string;
  reviewerName: string;
  rating: number;
  body: string;
  reviewedAt: Date | null;
  sourceReviewUrl: string;
};

export type YelpBusinessInfo = {
  name: string;
  businessId: string;
  avgRating: number | null;
  reviewCount: number;
};

export type YelpScrapeResult = {
  business: YelpBusinessInfo;
  reviews: YelpReview[];
};

export function extractYelpSlug(url: string): string | null {
  const match = url.match(/yelp\.com\/biz\/([a-zA-Z0-9_-]+)/);
  return match?.[1] ?? null;
}

function parseJsonLdBlocks(html: string): Record<string, unknown>[] {
  const results: Record<string, unknown>[] = [];
  const regex = /<script[^>]+type="application\/ld\+json"[^>]*>([\s\S]*?)<\/script>/g;
  let match;
  while ((match = regex.exec(html)) !== null) {
    try {
      const parsed = JSON.parse(match[1]);
      if (typeof parsed === "object" && parsed !== null) {
        results.push(parsed as Record<string, unknown>);
      }
    } catch {
      // skip malformed blocks
    }
  }
  return results;
}

const BUSINESS_TYPES = new Set([
  "LocalBusiness",
  "Restaurant",
  "FoodEstablishment",
  "HealthAndBeautyBusiness",
  "HomeAndConstructionBusiness",
  "LodgingBusiness",
  "Hotel",
  "AutoDealer",
  "AutomotiveBusiness",
  "ProfessionalService",
  "EntertainmentBusiness",
  "SportsActivityLocation",
  "FinancialService",
  "MedicalBusiness",
  "Store",
]);

function isBusinessBlock(block: Record<string, unknown>): boolean {
  const type = block["@type"];
  if (typeof type === "string") return BUSINESS_TYPES.has(type);
  if (Array.isArray(type)) return (type as string[]).some((t) => BUSINESS_TYPES.has(t));
  return false;
}

export async function scrapeYelpBusiness(yelpUrl: string): Promise<YelpScrapeResult> {
  const slug = extractYelpSlug(yelpUrl);
  if (!slug) {
    throw new Error("Invalid Yelp business URL. Expected format: https://www.yelp.com/biz/your-business-name");
  }

  const normalized = `https://www.yelp.com/biz/${slug}`;

  const res = await fetch(normalized, {
    headers: {
      "User-Agent":
        "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
      Accept: "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
      "Accept-Language": "en-US,en;q=0.9",
    },
    // Bypass Next.js fetch cache — always get fresh data
    cache: "no-store",
  });

  if (res.status === 404) {
    throw new Error(`Yelp business not found at ${normalized}. Check the URL and try again.`);
  }
  if (!res.ok) {
    throw new Error(`Yelp returned HTTP ${res.status}. The page may be temporarily unavailable.`);
  }

  const html = await res.text();
  const blocks = parseJsonLdBlocks(html);
  const bizBlock = blocks.find(isBusinessBlock);

  if (!bizBlock) {
    throw new Error(
      "Could not find business data on this Yelp page. Make sure the URL points to a Yelp business listing (e.g. https://www.yelp.com/biz/your-business)."
    );
  }

  const name = typeof bizBlock["name"] === "string" ? bizBlock["name"] : slug;

  const aggRating = bizBlock["aggregateRating"] as Record<string, unknown> | undefined;
  const avgRating =
    aggRating && typeof aggRating["ratingValue"] !== "undefined"
      ? parseFloat(String(aggRating["ratingValue"]))
      : null;
  const reviewCount =
    aggRating && typeof aggRating["reviewCount"] !== "undefined"
      ? parseInt(String(aggRating["reviewCount"]), 10)
      : 0;

  const rawReviews = Array.isArray(bizBlock["review"])
    ? (bizBlock["review"] as Record<string, unknown>[])
    : [];

  const reviews: YelpReview[] = rawReviews.map((r) => {
    const authorRaw = r["author"];
    const authorName =
      typeof authorRaw === "string"
        ? authorRaw
        : typeof authorRaw === "object" && authorRaw !== null && typeof (authorRaw as Record<string, unknown>)["name"] === "string"
        ? (authorRaw as Record<string, unknown>)["name"] as string
        : "Anonymous";

    const datePublished = typeof r["datePublished"] === "string" ? r["datePublished"] : "";

    const ratingBlock = r["reviewRating"] as Record<string, unknown> | undefined;
    const ratingValue = ratingBlock ? parseInt(String(ratingBlock["ratingValue"] ?? "5"), 10) : 5;
    const rating = Math.max(1, Math.min(5, isNaN(ratingValue) ? 5 : ratingValue));

    const body =
      typeof r["reviewBody"] === "string"
        ? r["reviewBody"]
        : typeof r["description"] === "string"
        ? r["description"]
        : "";

    // Stable dedup key: slug + author + date
    const externalId = `yelp-${slug}-${Buffer.from(authorName + datePublished).toString("base64").slice(0, 32)}`;

    return {
      externalId,
      reviewerName: authorName,
      rating,
      body,
      reviewedAt: datePublished ? new Date(datePublished) : null,
      sourceReviewUrl: normalized,
    };
  });

  return {
    business: { name, businessId: slug, avgRating, reviewCount },
    reviews,
  };
}
```

- [ ] **Step 2: Smoke-test the scraper locally**

In a terminal:
```bash
node -e "
const { scrapeYelpBusiness } = require('./src/lib/yelp-scraper.ts');
" 2>&1 | head -5
```

This will error (can't run TS directly) — that's expected. Instead, start the dev server and create a temporary test route:

```bash
npm run dev
```

Then in another terminal:
```bash
curl -s "http://localhost:3000/api/dev/reload-prisma" | head -2
```

(This just confirms the dev server is healthy. Full scraper testing happens in Task 3 when the action is wired up.)

- [ ] **Step 3: Commit**

```bash
git add src/lib/yelp-scraper.ts
git commit -m "feat: add Yelp page scraper using JSON-LD structured data"
```

---

## Task 3: connectYelp, syncYelpReviews, disconnectYelp server actions

**Files:**
- Modify: `src/app/locations/actions.ts`

Add the following three functions at the end of `src/app/locations/actions.ts`, before the final closing brace (if any). The file already starts with `"use server"` and imports `{ prisma }`, `{ redirect }`, `{ ReviewSource, ReviewStatus }`, and `{ requireLocationAccess }`.

- [ ] **Step 1: Add the import for the Yelp scraper at the top of actions.ts**

After the existing imports (around line 23), add:

```typescript
import { scrapeYelpBusiness, extractYelpSlug } from "@/lib/yelp-scraper";
```

- [ ] **Step 2: Add `connectYelp` action at the end of actions.ts**

```typescript
export async function connectYelp(formData: FormData) {
  const locationId = String(formData.get("locationId") ?? "").trim();
  const rawUrl = String(formData.get("yelpUrl") ?? "").trim();

  if (!locationId) throw new Error("Location is required");

  await requireLocationAccess(locationId);

  const slug = extractYelpSlug(rawUrl);
  if (!slug) {
    redirect(
      `/locations/${locationId}?flash=${encodeURIComponent(
        "Enter a valid Yelp business URL, e.g. https://www.yelp.com/biz/your-business"
      )}&tone=error`
    );
  }

  let result;
  try {
    result = await scrapeYelpBusiness(rawUrl);
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Could not load Yelp page";
    redirect(`/locations/${locationId}?flash=${encodeURIComponent(msg)}&tone=error`);
  }

  await prisma.location.update({
    where: { id: locationId },
    data: {
      yelpBusinessUrl: `https://www.yelp.com/biz/${result.business.businessId}`,
      yelpBusinessName: result.business.name,
      yelpBusinessId: result.business.businessId,
      yelpConnectedAt: new Date(),
      yelpLastSyncStatus: null,
      yelpLastSyncAt: null,
      yelpLastSyncCount: null,
    },
  });

  redirect(
    `/locations/${locationId}?flash=${encodeURIComponent(
      `Yelp connected: ${result.business.name} (${result.business.reviewCount} reviews found)`
    )}&tone=success`
  );
}
```

- [ ] **Step 3: Add `syncYelpReviews` action at the end of actions.ts**

```typescript
export async function syncYelpReviews(formData: FormData) {
  const locationId = String(formData.get("locationId") ?? "").trim();
  if (!locationId) throw new Error("Location is required");

  await requireLocationAccess(locationId);

  const location = await prisma.location.findUnique({
    where: { id: locationId },
    select: { id: true, yelpBusinessUrl: true },
  });

  if (!location?.yelpBusinessUrl) {
    redirect(`/locations/${locationId}?flash=${encodeURIComponent("Connect a Yelp business first")}&tone=error`);
  }

  let result;
  try {
    result = await scrapeYelpBusiness(location.yelpBusinessUrl);
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Yelp sync failed";
    await prisma.location.update({
      where: { id: locationId },
      data: { yelpLastSyncStatus: "error", yelpLastSyncAt: new Date() },
    });
    redirect(`/locations/${locationId}?flash=${encodeURIComponent(msg)}&tone=error`);
  }

  let imported = 0;
  let updated = 0;

  for (const review of result.reviews) {
    const existing = await prisma.review.findFirst({
      where: { locationId, source: ReviewSource.YELP, externalId: review.externalId },
      select: { id: true, body: true, rating: true },
    });

    if (!existing) {
      await prisma.review.create({
        data: {
          locationId,
          source: ReviewSource.YELP,
          externalId: review.externalId,
          reviewerName: review.reviewerName,
          rating: review.rating,
          body: review.body,
          reviewedAt: review.reviewedAt,
          sourceReviewUrl: review.sourceReviewUrl,
          status: ReviewStatus.PUBLISHED,
        },
      });
      imported++;
    } else if (existing.body !== review.body || existing.rating !== review.rating) {
      await prisma.review.update({
        where: { id: existing.id },
        data: { body: review.body, rating: review.rating },
      });
      updated++;
    }
  }

  await prisma.location.update({
    where: { id: locationId },
    data: {
      yelpLastSyncAt: new Date(),
      yelpLastSyncStatus: "success",
      yelpLastSyncCount: result.reviews.length,
    },
  });

  redirect(
    `/locations/${locationId}?flash=${encodeURIComponent(
      `Yelp sync complete: ${imported} new, ${updated} updated (${result.reviews.length} total on page)`
    )}&tone=success`
  );
}
```

- [ ] **Step 4: Add `disconnectYelp` action at the end of actions.ts**

```typescript
export async function disconnectYelp(formData: FormData) {
  const locationId = String(formData.get("locationId") ?? "").trim();
  if (!locationId) throw new Error("Location is required");

  await requireLocationAccess(locationId);

  await prisma.location.update({
    where: { id: locationId },
    data: {
      yelpBusinessUrl: null,
      yelpBusinessName: null,
      yelpBusinessId: null,
      yelpConnectedAt: null,
      yelpLastSyncAt: null,
      yelpLastSyncStatus: null,
      yelpLastSyncCount: null,
    },
  });

  redirect(
    `/locations/${locationId}?flash=${encodeURIComponent("Yelp disconnected. Existing Yelp reviews are kept.")}&tone=success`
  );
}
```

- [ ] **Step 5: Verify TypeScript compiles**

```bash
npx tsc --noEmit 2>&1 | grep -i "yelp\|error" | head -20
```

Expected: no errors mentioning `yelp`.

- [ ] **Step 6: Commit**

```bash
git add src/app/locations/actions.ts src/lib/yelp-scraper.ts
git commit -m "feat: add connectYelp, syncYelpReviews, disconnectYelp server actions"
```

---

## Task 4: Yelp section UI on location detail page

**Files:**
- Modify: `src/app/locations/[id]/page.tsx`

Add the Yelp section between the Google Mapping section (`</section>` ending the aside around line 518) and the Danger Zone section (around line 522). Also add the three new action imports.

- [ ] **Step 1: Add imports at the top of the location detail page**

The existing import line (line 8) reads:
```typescript
import { deleteLocation, mapLocationToGoogle, refreshGoogleLocationDetails, saveLocationSettings, syncGoogleReviews } from "@/app/locations/actions";
```

Change it to:
```typescript
import { connectYelp, deleteLocation, disconnectYelp, mapLocationToGoogle, refreshGoogleLocationDetails, saveLocationSettings, syncGoogleReviews, syncYelpReviews } from "@/app/locations/actions";
```

- [ ] **Step 2: Add Yelp review count to the data fetched in the page**

The page calls `getLocationById(id)` which already includes all Location fields via `locationInclude`. Add a Yelp review count query alongside the existing `googleReviewCount`. But since the page is a Server Component, `getLocationById` already returns all the new Yelp fields from the Location model automatically (no change to `locations.ts` needed).

After the `const location = await getLocationById(id);` line (and its null check), add:

```typescript
  const yelpReviewCount = await import("@/lib/prisma").then(({ prisma }) =>
    prisma.review.count({ where: { locationId: location.id, source: "YELP" } })
  );
```

Wait — `prisma` is not directly imported in the page. Use a cleaner approach: import prisma at the top of the page file.

Add to the existing imports at the top of `src/app/locations/[id]/page.tsx`:

```typescript
import { prisma } from "@/lib/prisma";
```

Then after the `if (!location) { notFound(); }` block, add:

```typescript
  const yelpReviewCount = await prisma.review.count({
    where: { locationId: location.id, source: "YELP" },
  });
```

- [ ] **Step 3: Add the Yelp section JSX**

Insert the following section after the closing `</aside>` tag of the Google section (after line 519 `</div>` that closes `grid gap-6 xl:grid-cols-[1.1fr_0.9fr]`) and before `<section className="rounded-3xl border border-rose-200`:

```tsx
        <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
          <div className="flex items-center gap-3 mb-1">
            <span className="text-lg">🍽</span>
            <h3 className="text-xl font-semibold text-slate-950">Yelp Reviews</h3>
          </div>
          <p className="mt-1 mb-6 text-sm text-slate-600">
            Connect your Yelp business page to import reviews. Paste your Yelp business URL below.
          </p>

          {location.yelpBusinessUrl ? (
            <div className="space-y-4">
              <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-4 text-sm text-slate-700 space-y-1.5">
                <p><span className="font-semibold">Business:</span> {location.yelpBusinessName}</p>
                <p>
                  <span className="font-semibold">Yelp URL:</span>{" "}
                  <a href={location.yelpBusinessUrl} target="_blank" rel="noreferrer" className="text-indigo-600 underline">
                    {location.yelpBusinessUrl}
                  </a>
                </p>
                <p><span className="font-semibold">Yelp reviews imported:</span> {yelpReviewCount}</p>
                {location.yelpLastSyncAt && (
                  <p>
                    <span className="font-semibold">Last synced:</span>{" "}
                    {new Date(location.yelpLastSyncAt).toLocaleString()}
                    {location.yelpLastSyncStatus === "error" && (
                      <span className="ml-2 text-rose-600 font-semibold">— sync error</span>
                    )}
                  </p>
                )}
                {location.yelpLastSyncCount !== null && location.yelpLastSyncCount !== undefined && (
                  <p><span className="font-semibold">Last sync found:</span> {location.yelpLastSyncCount} reviews on page</p>
                )}
              </div>

              <div className="flex gap-3 flex-wrap">
                <form action={syncYelpReviews}>
                  <input type="hidden" name="locationId" value={location.id} />
                  <FormSubmitButton
                    idleLabel="Sync Yelp Reviews"
                    pendingLabel="Syncing..."
                    className="rounded-2xl bg-rose-600 px-4 py-3 text-sm font-semibold !text-white shadow-sm visited:!text-white hover:!text-white"
                  />
                </form>

                <form action={disconnectYelp}>
                  <input type="hidden" name="locationId" value={location.id} />
                  <FormSubmitButton
                    idleLabel="Disconnect Yelp"
                    pendingLabel="Disconnecting..."
                    className="rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm font-semibold text-slate-600 shadow-sm"
                  />
                </form>
              </div>
            </div>
          ) : (
            <form action={connectYelp} className="space-y-4">
              <input type="hidden" name="locationId" value={location.id} />
              <label className="grid gap-2 text-sm font-semibold text-slate-700">
                Yelp Business URL
                <input
                  name="yelpUrl"
                  type="url"
                  required
                  placeholder="https://www.yelp.com/biz/your-business-name"
                  className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm font-normal text-slate-700 placeholder:font-normal placeholder:text-slate-400"
                />
                <span className="text-xs font-normal text-slate-400">
                  Find your URL by searching your business on yelp.com and copying the address bar URL.
                </span>
              </label>
              <FormSubmitButton
                idleLabel="Connect Yelp"
                pendingLabel="Connecting..."
                className="rounded-2xl bg-rose-600 px-5 py-3 text-sm font-semibold !text-white shadow-sm visited:!text-white hover:!text-white"
              />
            </form>
          )}
        </section>
```

- [ ] **Step 4: Verify TypeScript compiles**

```bash
npx tsc --noEmit 2>&1 | grep -i "error\|yelp" | head -20
```

Expected: no errors.

- [ ] **Step 5: Manual test**

1. Start the dev server: `npm run dev`
2. Navigate to `http://localhost:3000/locations/{any-location-id}`
3. Scroll to the new "Yelp Reviews" section — should show a URL input form
4. Paste a real Yelp business URL (e.g. `https://www.yelp.com/biz/nova-advertising-fairfax-2`) and click Connect
5. Should redirect back with a success flash showing the business name and review count
6. The Yelp section should now show the connected state with a Sync button
7. Click "Sync Yelp Reviews" — should import reviews and show the count
8. Check `http://localhost:3000/locations/{id}` again — the sync count should appear

- [ ] **Step 6: Commit**

```bash
git add src/app/locations/[id]/page.tsx
git commit -m "feat: add Yelp connect/sync/disconnect section to location detail page"
```

---

## Task 5: Yelp batch cron sync

**Files:**
- Create: `src/lib/yelp-sync-cron.ts`
- Modify: `src/app/api/cron/route.ts`

- [ ] **Step 1: Create `src/lib/yelp-sync-cron.ts`**

```typescript
import { prisma } from "@/lib/prisma";
import { ReviewSource, ReviewStatus } from "@prisma/client";
import { scrapeYelpBusiness } from "@/lib/yelp-scraper";

export async function syncAllYelpLocations(): Promise<{ synced: number; failed: number }> {
  const locations = await prisma.location.findMany({
    where: { yelpBusinessUrl: { not: null } },
    select: { id: true, yelpBusinessUrl: true },
  });

  let synced = 0;
  let failed = 0;

  for (const location of locations) {
    if (!location.yelpBusinessUrl) continue;

    try {
      const result = await scrapeYelpBusiness(location.yelpBusinessUrl);
      let imported = 0;
      let updated = 0;

      for (const review of result.reviews) {
        const existing = await prisma.review.findFirst({
          where: { locationId: location.id, source: ReviewSource.YELP, externalId: review.externalId },
          select: { id: true, body: true, rating: true },
        });

        if (!existing) {
          await prisma.review.create({
            data: {
              locationId: location.id,
              source: ReviewSource.YELP,
              externalId: review.externalId,
              reviewerName: review.reviewerName,
              rating: review.rating,
              body: review.body,
              reviewedAt: review.reviewedAt,
              sourceReviewUrl: review.sourceReviewUrl,
              status: ReviewStatus.PUBLISHED,
            },
          });
          imported++;
        } else if (existing.body !== review.body || existing.rating !== review.rating) {
          await prisma.review.update({
            where: { id: existing.id },
            data: { body: review.body, rating: review.rating },
          });
          updated++;
        }
      }

      await prisma.location.update({
        where: { id: location.id },
        data: {
          yelpLastSyncAt: new Date(),
          yelpLastSyncStatus: "success",
          yelpLastSyncCount: result.reviews.length,
        },
      });

      console.log(`[yelp-cron] ${location.id}: ${imported} imported, ${updated} updated`);
      synced++;
    } catch (err) {
      console.error(`[yelp-cron] ${location.id} failed:`, err instanceof Error ? err.message : err);
      await prisma.location.update({
        where: { id: location.id },
        data: { yelpLastSyncAt: new Date(), yelpLastSyncStatus: "error" },
      });
      failed++;
    }
  }

  return { synced, failed };
}
```

- [ ] **Step 2: Update `src/app/api/cron/route.ts` to call the Yelp sync**

Replace the entire file with:

```typescript
import { NextRequest, NextResponse } from "next/server";
import { executePendingAutomationJobs } from "@/lib/automation-engine";
import { syncAllYelpLocations } from "@/lib/yelp-sync-cron";

export async function GET(request: NextRequest) {
  const authHeader = request.headers.get("authorization");

  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const [automationResult, yelpResult] = await Promise.all([
      executePendingAutomationJobs(),
      syncAllYelpLocations(),
    ]);
    return NextResponse.json({ ok: true, automationResult, yelpResult });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Cron job failed";
    return NextResponse.json({ ok: false, error: message }, { status: 500 });
  }
}
```

- [ ] **Step 3: Verify TypeScript compiles**

```bash
npx tsc --noEmit 2>&1 | grep -i "error\|yelp" | head -20
```

Expected: no errors.

- [ ] **Step 4: Manual test the cron endpoint**

```bash
curl -s -H "Authorization: Bearer $(grep CRON_SECRET .env.local | cut -d= -f2)" \
  http://localhost:3000/api/cron | python3 -m json.tool
```

Expected: JSON with `ok: true`, `yelpResult: { synced: N, failed: 0 }`.

- [ ] **Step 5: Commit**

```bash
git add src/lib/yelp-sync-cron.ts src/app/api/cron/route.ts
git commit -m "feat: add Yelp batch sync to cron job"
```

---

## Self-Review

**Spec coverage:**
- ✅ User provides Yelp business URL → `connectYelp` action
- ✅ Reviews scraped from public Yelp page via JSON-LD → `yelp-scraper.ts`
- ✅ Reviews stored in existing `Review` table with `source: YELP` → `syncYelpReviews`
- ✅ Dedup by `externalId` → both sync actions check existing records
- ✅ Scheduled re-sync → `syncAllYelpLocations` in cron
- ✅ Disconnect flow → `disconnectYelp` clears fields, keeps reviews
- ✅ UI on location detail page → Task 4
- ✅ No new npm dependencies → native `fetch` + regex

**Placeholder scan:** None found.

**Type consistency:** `scrapeYelpBusiness` → `YelpScrapeResult` → used consistently in `connectYelp`, `syncYelpReviews`, `syncAllYelpLocations`. `extractYelpSlug` used in `connectYelp` only.
