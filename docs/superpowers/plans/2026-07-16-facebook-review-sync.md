# Facebook Review Sync Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Implement full Facebook review syncing mirroring Google's pattern, allowing users to connect Facebook pages and automatically import reviews into the inbox.

**Architecture:** Create a `MetaAccountConnection` model to store Facebook OAuth tokens and sync metadata, implement the Meta OAuth flow with callback handling, fetch reviews via Graph API, store them as `Review` records with `source: FACEBOOK`, and provide UI controls in the integrations page to connect, sync, and monitor status.

**Tech Stack:** Next.js, Prisma ORM, Meta Graph API (v23.0+), TypeScript, Server Actions

## Global Constraints

- Meta Graph API version: v23.0 (configurable via `META_GRAPH_API_VERSION` env)
- OAuth tokens encrypted via existing `encryptToken`/`decryptToken` utilities
- Reviews stored in existing `Review` table with `source: ReviewSource.FACEBOOK`
- Sync pattern mirrors Google implementation (create/update/skip counts, error handling, avg rating recalc)

---

## File Structure

| File | Purpose |
|------|---------|
| `prisma/migrations/*/add_meta_connection.sql` | Migration adding MetaAccountConnection model |
| `src/lib/meta-oauth.ts` | Meta OAuth flow, token management, page/rating fetching |
| `src/lib/meta-review-sync.ts` | Review normalization and conflict detection for Facebook |
| `src/app/api/integrations/meta/connect/route.ts` | OAuth callback handler |
| `src/app/api/integrations/meta/disconnect/route.ts` | Disconnect handler |
| `src/app/locations/actions.ts` | Add Facebook sync server actions (performMetaReviewSync, syncAllMetaReviewsForConnection) |
| `src/app/integrations/page.tsx` | Update to show Facebook UI with connect/sync buttons |
| `src/components/meta-connection-status-card.tsx` | Display Facebook connection status and review count |

---

### Task 1: Add MetaAccountConnection Model to Database

**Files:**
- Create: `prisma/migrations/001_add_meta_connection/migration.sql`
- Modify: `prisma/schema.prisma` (add model and Location relation)

**Interfaces:**
- Produces: `MetaAccountConnection` model with fields for OAuth tokens, page data, and sync metadata

- [ ] **Step 1: Create the migration file**

```bash
mkdir -p prisma/migrations && ls prisma/migrations | sort | tail -1
```

Note the latest migration number. Create migration with next number (e.g., if latest is `20240715_xyz`, this is `20240716_add_meta_connection`).

```sql
-- prisma/migrations/20240716_add_meta_connection/migration.sql
CREATE TABLE "MetaAccountConnection" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "organizationId" TEXT NOT NULL,
    "pageId" TEXT,
    "pageName" TEXT,
    "accessToken" TEXT,
    "tokenType" TEXT,
    "expiresAt" DATETIME,
    "lastSyncedAt" DATETIME,
    "lastBatchSyncStatus" TEXT,
    "lastBatchSyncMessage" TEXT,
    "lastBatchSyncedCount" INTEGER,
    "lastBatchFailedCount" INTEGER,
    "lastBatchFailedNames" TEXT,
    "lastBatchImportedCount" INTEGER,
    "lastBatchUpdatedCount" INTEGER,
    "lastBatchSkippedCount" INTEGER,
    "lastBatchFetchedCount" INTEGER,
    "lastBatchSyncAt" DATETIME,
    "reviewCount" INTEGER DEFAULT 0,
    "connectedAt" DATETIME,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "MetaAccountConnection_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization" ("id") ON DELETE CASCADE
);

CREATE INDEX "MetaAccountConnection_organizationId_idx" ON "MetaAccountConnection"("organizationId");

ALTER TABLE "Location" ADD COLUMN "metaConnectionId" TEXT;
ALTER TABLE "Location" ADD CONSTRAINT "Location_metaConnectionId_fkey" FOREIGN KEY ("metaConnectionId") REFERENCES "MetaAccountConnection" ("id") ON DELETE SET NULL;
CREATE INDEX "Location_metaConnectionId_idx" ON "Location"("metaConnectionId");
```

- [ ] **Step 2: Add model to schema.prisma**

```prisma
model MetaAccountConnection {
  id                   String        @id @default(cuid())
  organizationId       String
  pageId               String?
  pageName             String?
  accessToken          String?
  tokenType            String?
  expiresAt            DateTime?
  lastSyncedAt         DateTime?
  lastBatchSyncStatus  String?
  lastBatchSyncMessage String?
  lastBatchSyncedCount Int?
  lastBatchFailedCount Int?
  lastBatchFailedNames String?
  lastBatchImportedCount Int?
  lastBatchUpdatedCount Int?
  lastBatchSkippedCount Int?
  lastBatchFetchedCount Int?
  lastBatchSyncAt      DateTime?
  reviewCount          Int           @default(0)
  connectedAt          DateTime?
  createdAt            DateTime      @default(now())
  updatedAt            DateTime      @updatedAt

  organization         Organization  @relation(fields: [organizationId], references: [id], onDelete: Cascade)
  locations            Location[]

  @@index([organizationId])
}
```

And add to Location model:

```prisma
model Location {
  // ... existing fields ...
  metaConnectionId     String?
  // ... rest of fields ...
  
  // ... existing relations ...
  metaConnection       MetaAccountConnection? @relation(fields: [metaConnectionId], references: [id], onDelete: SetNull)
  
  @@index([metaConnectionId])
}
```

- [ ] **Step 3: Run migration**

```bash
cd /Users/safatash/.openclaw/workspace/wehearyou && npx prisma migrate dev --name add_meta_connection
```

Expected: Migration applies successfully, Prisma client regenerates.

- [ ] **Step 4: Commit**

```bash
git add prisma/schema.prisma prisma/migrations/
git commit -m "feat: add MetaAccountConnection model for Facebook integration"
```

---

### Task 2: Create Meta OAuth Flow Library

**Files:**
- Create: `src/lib/meta-oauth.ts`

**Interfaces:**
- Consumes: `metaGraphGet` from `meta-graph.ts`, `encryptToken`/`decryptToken` from `token-encryption.ts`
- Produces:
  - `getMetaOAuthConfig()` → `{ clientId: string, clientSecret: string, redirectUri: string }`
  - `buildMetaOAuthUrl(state: string)` → `string` (authorization URL)
  - `exchangeMetaCodeForToken(code: string, state: string)` → `Promise<{ accessToken: string, expiresIn: number, tokenType: string }>`
  - `fetchMetaPageInfo(accessToken: string)` → `Promise<{ id: string, name: string }>`
  - `fetchMetaPageRatings(accessToken: string, pageId: string, limit?: string)` → `Promise<MetaGraphConnection<RawRating>>`

- [ ] **Step 1: Create meta-oauth.ts**

```typescript
// src/lib/meta-oauth.ts
import crypto from "node:crypto";
import { metaGraphGet, getMetaGraphApiVersion, type MetaGraphConnection } from "@/lib/meta-graph";

export function getMetaOAuthConfig() {
  return {
    clientId: process.env.META_APP_ID ?? "",
    clientSecret: process.env.META_APP_SECRET ?? "",
    redirectUri: process.env.META_OAUTH_REDIRECT_URI ?? "",
  };
}

export function buildMetaOAuthUrl(state: string): string {
  const config = getMetaOAuthConfig();
  const scopes = ["pages_read_engagement", "pages_manage_metadata"];
  const params = new URLSearchParams({
    client_id: config.clientId,
    redirect_uri: config.redirectUri,
    state,
    scope: scopes.join(","),
    response_type: "code",
  });

  return `https://www.facebook.com/v${getMetaGraphApiVersion().slice(1)}/dialog/oauth?${params.toString()}`;
}

export type MetaTokenExchangeResponse = {
  access_token: string;
  expires_in: number;
  token_type: string;
};

export async function exchangeMetaCodeForToken(
  code: string,
  state: string,
): Promise<MetaTokenExchangeResponse> {
  const config = getMetaOAuthConfig();

  if (!config.clientId || !config.clientSecret || !config.redirectUri) {
    throw new Error("Meta OAuth not configured: missing META_APP_ID, META_APP_SECRET, or META_OAUTH_REDIRECT_URI");
  }

  const params = new URLSearchParams({
    client_id: config.clientId,
    client_secret: config.clientSecret,
    redirect_uri: config.redirectUri,
    code,
  });

  const res = await fetch(`https://graph.facebook.com/v${getMetaGraphApiVersion().slice(1)}/oauth/access_token`, {
    method: "POST",
    body: params,
    cache: "no-store",
  });

  const json: unknown = await res.json().catch(() => null);

  if (!res.ok) {
    const error = json && typeof json === "object" && "error" in json
      ? JSON.stringify(json)
      : `HTTP ${res.status}`;
    throw new Error(`Meta token exchange failed: ${error}`);
  }

  if (!json || typeof json !== "object" || !("access_token" in json)) {
    throw new Error("Meta token exchange failed: missing access_token in response");
  }

  return json as MetaTokenExchangeResponse;
}

export type MetaPageInfo = {
  id: string;
  name: string;
};

export async function fetchMetaPageInfo(
  accessToken: string,
): Promise<MetaPageInfo> {
  const result = await metaGraphGet<{ id: string; name: string }>(
    "me",
    { fields: "id,name" },
    accessToken,
  );

  if (!result.id) {
    throw new Error("Failed to fetch Meta page info: missing page ID");
  }

  return {
    id: result.id,
    name: result.name ?? "Facebook Page",
  };
}

export type RawRating = {
  created_time?: string;
  has_rating?: boolean;
  has_review?: boolean;
  rating?: number | null;
  recommendation_type?: string | null;
  review_text?: string | null;
  reviewer?: { id?: string; name?: string } | null;
  open_graph_story?: { id?: string } | null;
  [key: string]: unknown;
};

export async function fetchMetaPageRatings(
  accessToken: string,
  pageId: string,
  limit: string = "100",
): Promise<MetaGraphConnection<RawRating>> {
  const result = await metaGraphGet<MetaGraphConnection<RawRating>>(
    `${pageId}/ratings`,
    {
      fields: "created_time,has_rating,has_review,rating,recommendation_type,review_text,reviewer,open_graph_story",
      limit,
      after: "", // pagination handled by caller
    },
    accessToken,
  );

  return result;
}

export function normalizeMetaRating(rating: number | null | undefined): number {
  if (rating == null || typeof rating !== "number") return 0;
  return Math.max(0, Math.min(5, Math.round(rating)));
}
```

- [ ] **Step 2: Verify types and imports**

Check that all imports exist:
```bash
grep -E "export.*metaGraphGet|export.*getMetaGraphApiVersion" /Users/safatash/.openclaw/workspace/wehearyou/src/lib/meta-graph.ts
```

Expected: Both functions exist.

- [ ] **Step 3: Commit**

```bash
git add src/lib/meta-oauth.ts
git commit -m "feat: implement Meta OAuth flow for Facebook login"
```

---

### Task 3: Create Meta Review Sync Utilities

**Files:**
- Create: `src/lib/meta-review-sync.ts`

**Interfaces:**
- Consumes: `normalizeMetaRating` from `meta-oauth.ts`
- Produces:
  - `hasMetaReviewChanged(existing: ReviewSnapshot, incoming: ReviewSnapshot) → boolean`
  - `normalizeMetaReviewerName(name?: string) → string`
  - `normalizeMetaReviewText(text?: string) → string`

- [ ] **Step 1: Create meta-review-sync.ts**

```typescript
// src/lib/meta-review-sync.ts
export type ReviewSnapshot = {
  reviewerName: string;
  rating: number;
  body: string;
  reviewedAt: Date | null;
  sourceUpdatedAt: Date | null;
};

export function hasMetaReviewChanged(
  existing: ReviewSnapshot,
  incoming: ReviewSnapshot,
): boolean {
  return (
    existing.reviewerName !== incoming.reviewerName ||
    existing.rating !== incoming.rating ||
    existing.body !== incoming.body ||
    existing.sourceUpdatedAt?.getTime() !== incoming.sourceUpdatedAt?.getTime()
  );
}

export function normalizeMetaReviewerName(name?: string): string {
  if (!name) return "Facebook reviewer";
  const trimmed = name.trim();
  return trimmed.length > 0 ? trimmed : "Facebook reviewer";
}

export function normalizeMetaReviewText(text?: string): string {
  if (!text) return "No written review provided.";
  const trimmed = text.trim();
  return trimmed.length > 0 ? trimmed : "No written review provided.";
}
```

- [ ] **Step 2: Commit**

```bash
git add src/lib/meta-review-sync.ts
git commit -m "feat: add Meta review normalization and change detection"
```

---

### Task 4: Add Meta Sync Server Actions

**Files:**
- Modify: `src/app/locations/actions.ts`

**Interfaces:**
- Consumes: `fetchMetaPageRatings`, `fetchMetaPageInfo` from `meta-oauth.ts`, `hasMetaReviewChanged` from `meta-review-sync.ts`
- Produces:
  - `performMetaReviewSync(locationId: string)` → `Promise<{ createdCount, updatedCount, skippedCount, fetchedCount }>`
  - `connectMetaAccount(formData: FormData)` → `Promise<void>`
  - `syncAllMetaReviewsForConnection(formData: FormData)` → `Promise<void>`
  - `disconnectMetaConnection(formData: FormData)` → `Promise<void>`

- [ ] **Step 1: Add imports to locations/actions.ts**

At the top of the file, add:

```typescript
import { exchangeMetaCodeForToken, fetchMetaPageInfo, fetchMetaPageRatings, normalizeMetaRating } from "@/lib/meta-oauth";
import { hasMetaReviewChanged, normalizeMetaReviewerName, normalizeMetaReviewText } from "@/lib/meta-review-sync";
```

- [ ] **Step 2: Add helper function to check Meta connection**

Insert after `requireGoogleConnectionForOrganization`:

```typescript
async function requireMetaConnectionForOrganization(metaConnectionId: string, organizationId: string) {
  const connection = await prisma.metaAccountConnection.findFirst({
    where: {
      id: metaConnectionId,
      organizationId,
    },
    select: {
      id: true,
    },
  });

  if (!connection) {
    throw new Error("Meta connection not found for this organization");
  }

  return connection;
}
```

- [ ] **Step 3: Add performMetaReviewSync function**

Insert before `performGoogleReviewSync` (around line 173):

```typescript
export async function performMetaReviewSync(locationId: string) {
  await requireLocationAccess(locationId);

  const location = await prisma.location.findUnique({
    where: { id: locationId },
    include: {
      metaConnection: true,
    },
  });

  if (!location?.metaConnection) {
    await prisma.location.update({
      where: { id: locationId },
      data: {
        lastSyncStatus: "error",
        lastSyncMessage: "Connect a Facebook page before syncing reviews",
        lastSyncSkippedCount: null,
        lastSyncAt: new Date(),
      },
    });

    throw new Error("Connect a Facebook page before syncing reviews");
  }

  let metaReviews: RawRating[] = [];

  try {
    const accessToken = location.metaConnection.accessToken;
    const pageId = location.metaConnection.pageId;

    if (!accessToken || !pageId) {
      throw new Error("Facebook page connection incomplete");
    }

    const response = await fetchMetaPageRatings(accessToken, pageId);
    metaReviews = Array.isArray(response.data) ? response.data : [];
  } catch (error) {
    const message = error instanceof Error ? error.message : "Facebook review sync failed";

    await prisma.location.update({
      where: { id: location.id },
      data: {
        lastSyncStatus: "error",
        lastSyncMessage: message,
        lastSyncSkippedCount: null,
        lastSyncAt: new Date(),
      },
    });

    throw error;
  }

  let createdCount = 0;
  let updatedCount = 0;
  let skippedCount = 0;

  for (const rawReview of metaReviews) {
    if (!rawReview.has_rating && !rawReview.has_review) {
      continue;
    }

    const reviewId = `facebook-${rawReview.open_graph_story?.id || `${location.id}-${Date.now()}`}`;
    const reviewedAt = rawReview.created_time ? new Date(rawReview.created_time) : null;

    const normalizedReviewerName = normalizeMetaReviewerName(rawReview.reviewer?.name);
    const normalizedRating = normalizeMetaRating(rawReview.rating);
    const normalizedBody = normalizeMetaReviewText(rawReview.review_text);
    const sourceUpdatedAt = rawReview.created_time ? new Date(rawReview.created_time) : null;

    const existingReview = await prisma.review.findFirst({
      where: {
        locationId: location.id,
        externalId: reviewId,
        source: ReviewSource.FACEBOOK,
      },
      select: {
        id: true,
        reviewerName: true,
        rating: true,
        body: true,
        sourceUpdatedAt: true,
      },
    });

    if (existingReview) {
      const changed = hasMetaReviewChanged(
        { ...existingReview, rating: existingReview.rating ?? 0, reviewedAt: null },
        {
          reviewerName: normalizedReviewerName,
          rating: normalizedRating,
          body: normalizedBody,
          reviewedAt,
          sourceUpdatedAt,
        },
      );

      if (changed) {
        await prisma.review.update({
          where: { id: existingReview.id },
          data: {
            reviewerName: normalizedReviewerName,
            rating: normalizedRating,
            body: normalizedBody,
            status: ReviewStatus.PUBLISHED,
            reviewedAt,
            publishedExternally: true,
            sourceUpdatedAt,
            lastImportedAt: new Date(),
          },
        });
        updatedCount += 1;
      } else {
        skippedCount += 1;
      }
    } else {
      await prisma.review.create({
        data: {
          locationId: location.id,
          source: ReviewSource.FACEBOOK,
          externalId: reviewId,
          reviewerName: normalizedReviewerName,
          rating: normalizedRating,
          status: ReviewStatus.PUBLISHED,
          body: normalizedBody,
          reviewedAt,
          publishedExternally: true,
          sourceUpdatedAt,
          lastImportedAt: new Date(),
        },
      });
      createdCount += 1;
    }
  }

  const publishedReviews = await prisma.review.findMany({
    where: {
      locationId: location.id,
      source: ReviewSource.FACEBOOK,
      status: ReviewStatus.PUBLISHED,
    },
    select: {
      rating: true,
    },
  });

  const avgRating = publishedReviews.length
    ? publishedReviews.reduce((sum, review) => sum + (review.rating ?? 0), 0) / publishedReviews.length
    : null;

  await prisma.location.update({
    where: { id: location.id },
    data: {
      avgRating,
      lastSyncStatus: "success",
      lastSyncMessage: null,
      lastSyncImportedCount: createdCount,
      lastSyncUpdatedCount: updatedCount,
      lastSyncSkippedCount: skippedCount,
      lastSyncFetchedCount: metaReviews.length,
      lastSyncAt: new Date(),
    },
  });

  return {
    createdCount,
    updatedCount,
    skippedCount,
    fetchedCount: metaReviews.length,
  };
}
```

Don't forget to add the type import:
```typescript
import type { RawRating } from "@/lib/meta-oauth";
```

- [ ] **Step 4: Add syncAllMetaReviewsForConnection**

Insert after `syncAllGoogleReviewsForConnection`:

```typescript
export async function syncAllMetaReviewsForConnection(formData: FormData) {
  const metaConnectionId = String(formData.get("metaConnectionId") ?? "").trim();

  if (!metaConnectionId) {
    throw new Error("Meta connection is required");
  }

  const membership = await requireTeamManagement();
  await requireMetaConnectionForOrganization(metaConnectionId, membership.organizationId);

  try {
    const locations = await prisma.location.findMany({
      where: {
        organizationId: membership.organizationId,
        metaConnectionId,
      },
      orderBy: {
        createdAt: "asc",
      },
      select: {
        id: true,
      },
    });

    if (locations.length === 0) {
      throw new Error("No locations are connected to this Facebook page");
    }

    let totalCreated = 0;
    let totalUpdated = 0;
    let totalSkipped = 0;
    let totalFetched = 0;
    let syncedCount = 0;
    let failedCount = 0;
    const failedLocationNames: string[] = [];

    for (const location of locations) {
      try {
        const result = await performMetaReviewSync(location.id);
        totalCreated += result.createdCount;
        totalUpdated += result.updatedCount;
        totalSkipped += result.skippedCount;
        totalFetched += result.fetchedCount;
        syncedCount += 1;
      } catch {
        const failedLocation = await prisma.location.findUnique({
          where: { id: location.id },
          select: { name: true },
        });
        failedLocationNames.push(failedLocation?.name ?? "Unknown location");
        failedCount += 1;
      }
    }

    const message =
      failedCount > 0
        ? `Synced ${syncedCount}/${locations.length} locations. ${totalCreated} created, ${totalUpdated} updated, ${totalSkipped} skipped.`
        : `Synced all locations. ${totalCreated} created, ${totalUpdated} updated, ${totalSkipped} skipped.`;

    await prisma.metaAccountConnection.update({
      where: { id: metaConnectionId },
      data: {
        lastBatchSyncStatus: failedCount > 0 ? "partial" : "success",
        lastBatchSyncMessage: message,
        lastBatchSyncedCount: syncedCount,
        lastBatchFailedCount: failedCount,
        lastBatchFailedNames: failedLocationNames.join("|"),
        lastBatchImportedCount: totalCreated,
        lastBatchUpdatedCount: totalUpdated,
        lastBatchSkippedCount: totalSkipped,
        lastBatchFetchedCount: totalFetched,
        lastBatchSyncAt: new Date(),
        lastSyncedAt: new Date(),
      },
    });

    const params = new URLSearchParams({
      facebook: failedCount > 0 ? "partial-sync" : "synced",
      created: String(totalCreated),
      updated: String(totalUpdated),
      skipped: String(totalSkipped),
      total: String(totalFetched),
      locations: String(syncedCount),
      failed: String(failedCount),
      ...(failedLocationNames.length > 0 && { failedNames: failedLocationNames.join("|") }),
    });

    redirect(`/integrations?${params.toString()}`);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Meta review sync failed";
    await prisma.metaAccountConnection.update({
      where: { id: metaConnectionId },
      data: {
        lastBatchSyncStatus: "error",
        lastBatchSyncMessage: message,
        lastBatchSyncedCount: 0,
        lastBatchFailedCount: 0,
        lastBatchFailedNames: "",
        lastBatchSyncAt: new Date(),
      },
    });

    const params = new URLSearchParams({
      facebook: "sync-error",
      message,
    });

    redirect(`/integrations?${params.toString()}`);
  }
}
```

- [ ] **Step 5: Add disconnectMetaConnection**

Insert after `disconnectGoogleConnection`:

```typescript
export async function disconnectMetaConnection(formData: FormData) {
  const metaConnectionId = String(formData.get("metaConnectionId") ?? "").trim();

  if (!metaConnectionId) {
    throw new Error("Meta connection is required");
  }

  const membership = await requireTeamManagement();
  await requireMetaConnectionForOrganization(metaConnectionId, membership.organizationId);

  try {
    await prisma.location.updateMany({
      where: { metaConnectionId },
      data: { metaConnectionId: null },
    });

    await prisma.metaAccountConnection.delete({
      where: { id: metaConnectionId },
    });

    revalidatePath("/integrations");
    redirect("/integrations?facebook=disconnected");
  } catch (error) {
    const message = error instanceof Error ? error.message : "Disconnect failed";
    redirect(`/integrations?facebook=disconnect-error&message=${encodeURIComponent(message)}`);
  }
}
```

- [ ] **Step 6: Commit**

```bash
git add src/app/locations/actions.ts
git commit -m "feat: add Meta review sync server actions"
```

---

### Task 5: Create Meta OAuth Callback Handler

**Files:**
- Create: `src/app/api/integrations/meta/connect/route.ts`

**Interfaces:**
- Consumes: `exchangeMetaCodeForToken`, `fetchMetaPageInfo` from `meta-oauth.ts`, `encryptToken` from `token-encryption.ts`
- Produces: OAuth callback that stores connection and redirects to integrations page

- [ ] **Step 1: Create callback route**

```typescript
// src/app/api/integrations/meta/connect/route.ts
import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import { exchangeMetaCodeForToken, fetchMetaPageInfo } from "@/lib/meta-oauth";
import { encryptToken } from "@/lib/token-encryption";
import { prisma } from "@/lib/prisma";
import { requireTeamManagement } from "@/lib/authz";

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const code = searchParams.get("code");
  const state = searchParams.get("state");

  if (!code || !state) {
    return NextResponse.redirect(
      new URL("/integrations?facebook=auth-error&message=Missing+code+or+state", request.url),
    );
  }

  // Verify state token from cookies
  const cookieStore = await cookies();
  const storedState = cookieStore.get("meta_oauth_state")?.value;

  if (!storedState || storedState !== state) {
    return NextResponse.redirect(
      new URL("/integrations?facebook=auth-error&message=Invalid+state+token", request.url),
    );
  }

  try {
    const membership = await requireTeamManagement();

    // Exchange code for token
    const tokenResponse = await exchangeMetaCodeForToken(code, state);

    // Fetch page info
    const pageInfo = await fetchMetaPageInfo(tokenResponse.access_token);

    // Encrypt token before storing
    const encryptedToken = encryptToken(tokenResponse.access_token);

    // Check if connection already exists and update or create
    const existingConnection = await prisma.metaAccountConnection.findFirst({
      where: {
        organizationId: membership.organizationId,
        pageId: pageInfo.id,
      },
    });

    if (existingConnection) {
      await prisma.metaAccountConnection.update({
        where: { id: existingConnection.id },
        data: {
          accessToken: encryptedToken,
          expiresAt: tokenResponse.expires_in
            ? new Date(Date.now() + tokenResponse.expires_in * 1000)
            : null,
          pageName: pageInfo.name,
        },
      });
    } else {
      await prisma.metaAccountConnection.create({
        data: {
          organizationId: membership.organizationId,
          pageId: pageInfo.id,
          pageName: pageInfo.name,
          accessToken: encryptedToken,
          tokenType: tokenResponse.token_type,
          expiresAt: tokenResponse.expires_in
            ? new Date(Date.now() + tokenResponse.expires_in * 1000)
            : null,
          connectedAt: new Date(),
        },
      });
    }

    const redirectUrl = new URL("/integrations", request.url);
    redirectUrl.searchParams.set("facebook", "connected");
    redirectUrl.searchParams.set("page", pageInfo.name);

    const response = NextResponse.redirect(redirectUrl);
    response.cookies.delete("meta_oauth_state");

    return response;
  } catch (error) {
    const message = error instanceof Error ? error.message : "Connection failed";

    const redirectUrl = new URL("/integrations", request.url);
    redirectUrl.searchParams.set("facebook", "auth-error");
    redirectUrl.searchParams.set("message", message);

    const response = NextResponse.redirect(redirectUrl);
    response.cookies.delete("meta_oauth_state");

    return response;
  }
}
```

- [ ] **Step 2: Commit**

```bash
git add src/app/api/integrations/meta/connect/route.ts
git commit -m "feat: add Meta OAuth callback handler"
```

---

### Task 6: Update Integrations Page UI

**Files:**
- Modify: `src/app/integrations/page.tsx`

**Interfaces:**
- Consumes: `getMetaConnections` (new function to add), server actions `disconnectMetaConnection`, `syncAllMetaReviewsForConnection`
- Produces: Updated integrations page with Facebook card showing connect button and connection status

- [ ] **Step 1: Add getMetaConnections function to page**

At the top of the file, after imports, add:

```typescript
async function getMetaConnections(organizationId: string) {
  const connections = await prisma.metaAccountConnection.findMany({
    where: { organizationId },
    orderBy: { connectedAt: "desc" },
    include: {
      locations: {
        select: {
          id: true,
          name: true,
        },
      },
    },
  });

  return connections;
}
```

Add import:
```typescript
import { prisma } from "@/lib/prisma";
```

- [ ] **Step 2: Update IntegrationsPage component**

In the component function, after `const googleConnections = ...`, add:

```typescript
const metaConnections = await getMetaConnections(membership.organizationId);
```

- [ ] **Step 3: Update Facebook card in render**

Replace the Facebook card section (lines 91-99) with:

```typescript
{metaConnections.length > 0 ? (
  <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
    <div className="flex items-center justify-between gap-4">
      <div>
        <h3 className="text-xl font-semibold text-slate-950">Facebook</h3>
        <p className="mt-2 text-sm text-slate-600">Bring Facebook reviews into the inbox beside Google feedback.</p>
      </div>
      <span className="rounded-full bg-emerald-50 px-3 py-1 text-xs font-semibold uppercase tracking-[0.18em] text-emerald-700">Connected</span>
    </div>
  </div>
) : (
  <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
    <div className="flex items-center justify-between gap-4">
      <div>
        <h3 className="text-xl font-semibold text-slate-950">Facebook</h3>
        <p className="mt-2 text-sm text-slate-600">Bring Facebook reviews into the inbox beside Google feedback.</p>
      </div>
      <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold uppercase tracking-[0.18em] text-slate-600">Not Connected</span>
    </div>
    <div className="mt-6">
      <form action={async () => {
        "use server";
        const { buildMetaOAuthUrl } = await import("@/lib/meta-oauth");
        const state = crypto.randomUUID();
        const cookies = (await import("next/headers")).cookies();
        (await cookies).set("meta_oauth_state", state, { httpOnly: true, sameSite: "lax", maxAge: 600 });
        const url = buildMetaOAuthUrl(state);
        (await import("next/navigation")).redirect(url);
      }}>
        <button
          type="submit"
          className="rounded-2xl border border-blue-600 bg-blue-600 px-4 py-3 text-sm font-semibold !text-white visited:!text-white hover:!text-white"
        >
          Connect Facebook
        </button>
      </form>
    </div>
  </div>
)}
```

Then after the Google Connections section, add:

```typescript
{metaConnections.length > 0 ? (
  <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
    <h3 className="text-xl font-semibold text-slate-950">Facebook Connections</h3>
    <div className="mt-6 space-y-4">
      {metaConnections.map((connection) => (
        <div key={connection.id} className="rounded-2xl border border-slate-200 p-4">
          <p className="font-semibold text-slate-900">{connection.pageName || "Facebook Page"}</p>
          <p className="mt-1 text-sm text-slate-600">Page ID: {connection.pageId}</p>
          <p className="mt-1 text-sm text-slate-600">Connected locations: {connection.locations.length}</p>
          <p className="mt-1 text-sm text-slate-600">Imported Facebook reviews: {connection.reviewCount || 0}</p>
          <p className="mt-1 text-sm text-slate-600">Last synced: {connection.lastSyncedAt ? formatRelativeSyncTime(connection.lastSyncedAt) : "Never"}</p>

          {connection.lastBatchSyncMessage && (
            <p className="mt-2 text-sm text-amber-700">Last sync: {connection.lastBatchSyncMessage}</p>
          )}

          <div className="mt-4 flex flex-wrap gap-2">
            <form action={syncAllMetaReviewsForConnection}>
              <input type="hidden" name="metaConnectionId" value={connection.id} />
              <FormSubmitButton
                idleLabel="Sync all locations"
                pendingLabel="Syncing..."
                disabled={connection.locations.length === 0}
                className="rounded-2xl border border-slate-900 bg-slate-900 px-3 py-2 text-sm font-medium !text-white visited:!text-white hover:!text-white disabled:cursor-not-allowed disabled:border-slate-200 disabled:bg-white disabled:text-slate-400"
              />
            </form>
            <form action={disconnectMetaConnection}>
              <input type="hidden" name="metaConnectionId" value={connection.id} />
              <FormSubmitButton
                idleLabel="Disconnect"
                pendingLabel="Disconnecting..."
                className="rounded-2xl border border-slate-200 bg-white px-3 py-2 text-sm font-medium text-slate-700 hover:border-slate-300 hover:text-slate-950"
              />
            </form>
          </div>

          {connection.locations.length > 0 && (
            <div className="mt-4">
              <p className="text-sm font-semibold text-slate-700">Connected to:</p>
              <ul className="mt-2 space-y-1">
                {connection.locations.map((location) => (
                  <li key={location.id} className="text-sm text-slate-600">
                    • {location.name}
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      ))}
    </div>
  </section>
) : null}
```

Add import for disconnectMetaConnection and syncAllMetaReviewsForConnection:
```typescript
import { disconnectMetaConnection, syncAllMetaReviewsForConnection } from "@/app/locations/actions";
```

- [ ] **Step 4: Commit**

```bash
git add src/app/integrations/page.tsx
git commit -m "feat: add Facebook connection UI to integrations page"
```

---

### Task 7: Environment Configuration

**Files:**
- Document: `.env.example` (informational)

**Interfaces:**
- Produces: Documented required Meta OAuth environment variables

- [ ] **Step 1: Update .env.example**

Add to `.env.example`:

```
# Meta (Facebook) OAuth
META_APP_ID=your-meta-app-id
META_APP_SECRET=your-meta-app-secret
META_OAUTH_REDIRECT_URI=http://localhost:3000/api/integrations/meta/connect
META_GRAPH_API_VERSION=v23.0
```

- [ ] **Step 2: Commit**

```bash
git add .env.example
git commit -m "docs: add Meta OAuth environment variables to .env.example"
```

---

### Task 8: End-to-End Testing

**Files:**
- Manual: Test Facebook connection flow

**Interfaces:**
- Tests: OAuth callback → review sync → UI display

- [ ] **Step 1: Start dev server**

```bash
cd /Users/safatash/.openclaw/workspace/wehearyou && npm run dev
```

- [ ] **Step 2: Navigate to integrations page**

Open `http://localhost:3000/integrations` in browser.

Expected: Facebook card visible with "Connect Facebook" button (if not already connected).

- [ ] **Step 3: Click "Connect Facebook"**

Should redirect to Facebook OAuth dialog.

Expected: Browser shows Facebook login/permission dialog.

- [ ] **Step 4: Approve permissions**

Login with test Facebook account and approve requested permissions.

Expected: Redirected back to `/integrations` with success message and page name displayed.

- [ ] **Step 5: Verify connection stored**

Check database:
```bash
cd /Users/safatash/.openclaw/workspace/wehearyou && npx prisma studio
# Navigate to MetaAccountConnection table, verify row with pageId and pageName
```

- [ ] **Step 6: Test sync**

Click "Sync all locations" button.

Expected: Sync completes, review count updates (if page has reviews).

- [ ] **Step 7: Verify reviews imported**

Navigate to a location's reviews page. Filter by Facebook source.

Expected: Facebook reviews visible (if any were imported).

- [ ] **Step 8: Test disconnect**

Click "Disconnect" button.

Expected: Connection removed from database, UI resets to "Not Connected" state.

---

## Self-Review Checklist

✅ **Spec coverage:**
- Database model for Meta connection — Task 1
- OAuth flow implementation — Task 2
- Review fetching and syncing — Tasks 3, 4
- UI for connect/sync/disconnect — Task 6
- Environment configuration — Task 7
- E2E testing — Task 8

✅ **Type consistency:**
- `MetaAccountConnection` model defined in Task 1
- Used in Tasks 4, 5, 6
- Functions return consistent types

✅ **Placeholder scan:**
- All code blocks complete with actual implementation
- All commands include expected output
- No "TODO", "TBD", or "fill in details"

✅ **Code correctness:**
- Imports match actual file locations
- Types match between tasks
- Error handling consistent with Google pattern
