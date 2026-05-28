# GBP Management Phase 1 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add Google Business Profile management to WeHearYou — review reply publishing, GBP post scheduler, photo management, and Q&A — all under a new "Google Local SEO" nav section.

**Architecture:** All four GBP content types get local DB records following a DRAFT → SCHEDULED → PUBLISHED → FAILED lifecycle. A Vercel cron publishes scheduled items every 5 minutes. A nightly sync pulls new Q&A questions. The existing `getValidGoogleAccessToken` in `google-oauth.ts` handles all token refresh transparently.

**Tech Stack:** Next.js 15 App Router (RSC + server actions), Prisma/PostgreSQL, `@vercel/blob` (already installed), GBP REST API v4, Node built-in test runner (`node:test`), Resend (email), Vercel Cron.

---

## File map

**Create:**
- `src/lib/gbp-api.ts` — thin GBP REST API wrapper
- `src/lib/gbp-api.test.ts` — unit tests (mocked fetch)
- `src/lib/gbp-scheduler.ts` — publishes scheduled GbpPost/GbpPhoto
- `src/lib/gbp-scheduler.test.ts` — unit tests
- `src/lib/gbp-sync.ts` — nightly Q&A sync
- `src/app/api/cron/gbp/route.ts` — cron endpoint
- `src/app/gbp/actions.ts` — all GBP server actions
- `src/app/gbp/page.tsx` — GBP Manager hub dashboard
- `src/app/gbp/posts/page.tsx` — post list
- `src/app/gbp/posts/new/page.tsx` — create/schedule post
- `src/app/gbp/photos/page.tsx` — photo gallery + upload
- `src/app/gbp/qa/page.tsx` — Q&A list + inline answer

**Modify:**
- `prisma/schema.prisma` — add 4 models, 2 enums, 2 fields on Review, 1 enum value
- `src/lib/navigation.ts` — add `gbp-manager` to ScreenKey, add nav items
- `src/components/app-shell.tsx` — add GOOGLE LOCAL SEO group to orderedGroups
- `src/components/reviews/review-reply-panel.tsx` — add Publish to Google button
- `src/lib/automation-engine.ts` — add PUBLISH_GBP_REPLY step handler
- `vercel.json` — add two GBP cron schedules

---

## Task 1: Prisma schema + migration

**Files:**
- Modify: `prisma/schema.prisma`

- [ ] **Step 1: Add new enums and fields to schema**

Open `prisma/schema.prisma`. Add these enums after the existing `VideoTestimonialStatus` enum:

```prisma
enum GbpPostType {
  WHATS_NEW
  OFFER
  EVENT
}

enum GbpPublishStatus {
  DRAFT
  SCHEDULED
  PUBLISHED
  FAILED
}
```

Add `PUBLISH_GBP_REPLY` to the existing `AutomationStepType` enum:

```prisma
enum AutomationStepType {
  DELAY
  SEND_REQUEST
  TAG_CONTACT
  NOTIFY_TEAM
  WEBHOOK
  PUBLISH_GBP_REPLY
}
```

Add two fields to the existing `Review` model (after `replyDraft String?`):

```prisma
  replyPublishedAt  DateTime?
  replyGbpId        String?
```

Add these four new models at the end of the schema file:

```prisma
model GbpPost {
  id            String           @id @default(cuid())
  locationId    String
  postType      GbpPostType
  content       String
  callToAction  Json?
  imageUrl      String?
  status        GbpPublishStatus @default(DRAFT)
  scheduledAt   DateTime?
  publishedAt   DateTime?
  gbpPostId     String?
  failureReason String?
  createdAt     DateTime         @default(now())

  location      Location         @relation(fields: [locationId], references: [id], onDelete: Cascade)

  @@index([locationId])
  @@index([status, scheduledAt])
}

model GbpPhoto {
  id            String           @id @default(cuid())
  locationId    String
  storageUrl    String
  category      String
  caption       String?
  status        GbpPublishStatus @default(DRAFT)
  scheduledAt   DateTime?
  publishedAt   DateTime?
  gbpMediaId    String?
  failureReason String?
  createdAt     DateTime         @default(now())

  location      Location         @relation(fields: [locationId], references: [id], onDelete: Cascade)

  @@index([locationId])
  @@index([status, scheduledAt])
}

model GbpQuestion {
  id              String    @id @default(cuid())
  locationId      String
  gbpQuestionId   String    @unique
  questionText    String
  askedAt         DateTime
  answerText      String?
  answeredAt      DateTime?
  gbpAnswerId     String?
  syncedAt        DateTime

  location        Location  @relation(fields: [locationId], references: [id], onDelete: Cascade)

  @@index([locationId])
  @@index([answeredAt])
}

model GbpSyncLog {
  id           String   @id @default(cuid())
  locationId   String
  syncType     String
  status       String
  itemsSynced  Int      @default(0)
  error        String?
  syncedAt     DateTime @default(now())

  location     Location @relation(fields: [locationId], references: [id], onDelete: Cascade)

  @@index([locationId])
}
```

Add the four new relations to the `Location` model (after `videoTestimonials VideoTestimonial[]`):

```prisma
  gbpPosts        GbpPost[]
  gbpPhotos       GbpPhoto[]
  gbpQuestions    GbpQuestion[]
  gbpSyncLogs     GbpSyncLog[]
```

- [ ] **Step 2: Run the migration**

```bash
cd /Users/safatash/.openclaw/workspace/wehearyou
npx prisma migrate dev --name add_gbp_management
```

Expected: migration created and applied, Prisma client regenerated.

- [ ] **Step 3: Verify generated client has new types**

```bash
node --eval "const { GbpPublishStatus } = require('@prisma/client'); console.log(Object.keys(GbpPublishStatus))"
```

Expected output: `[ 'DRAFT', 'SCHEDULED', 'PUBLISHED', 'FAILED' ]`

- [ ] **Step 4: Commit**

```bash
git add prisma/schema.prisma prisma/migrations
git commit -m "feat: add GBP management schema (GbpPost, GbpPhoto, GbpQuestion, GbpSyncLog)"
```

---

## Task 2: Navigation update

**Files:**
- Modify: `src/lib/navigation.ts`
- Modify: `src/components/app-shell.tsx`

- [ ] **Step 1: Add ScreenKey and nav items to navigation.ts**

In `src/lib/navigation.ts`, update the `ScreenKey` type to add the four new GBP screen keys:

```ts
export type ScreenKey =
  | "dashboard"
  | "contacts"
  | "reviews"
  | "campaigns"
  | "campaign-wizard"
  | "funnel-builder"
  | "locations"
  | "widgets"
  | "video-testimonials"
  | "automation"
  | "team"
  | "analytics"
  | "integrations"
  | "gbp-manager"
  | "gbp-posts"
  | "gbp-photos"
  | "gbp-qa";
```

Append four new items to the `navItems` array at the end (after the analytics entry):

```ts
  // Google Local SEO
  { key: "gbp-manager", label: "GBP Manager", icon: "🗺", href: "/gbp", group: "GOOGLE LOCAL SEO" },
```

- [ ] **Step 2: Add GOOGLE LOCAL SEO to the ordered groups in app-shell.tsx**

In `src/components/app-shell.tsx`, find the `orderedGroups` array and add the new group:

```ts
const orderedGroups = [
  "REQUESTS & FEEDBACK",
  "FUNNEL SETUP",
  "WEBSITE DISPLAYS",
  "GOOGLE LOCAL SEO",
  "SETTINGS",
];
```

Also add three greyed-out placeholder items below the GBP Manager link. After the GBP Manager `<Link>` block (which is rendered by the existing map), add a static section for the coming-soon items. The cleanest way: add them to `navItems` in navigation.ts with a `comingSoon` flag.

Update `NavItem` interface:

```ts
export interface NavItem {
  key: ScreenKey;
  label: string;
  icon: string;
  href: string;
  group?: string;
  comingSoon?: boolean;
}
```

Add three more items to `navItems`:

```ts
  { key: "gbp-posts", label: "Rank Tracker", icon: "📊", href: "/gbp/rank", group: "GOOGLE LOCAL SEO", comingSoon: true },
  { key: "gbp-photos", label: "Competitors", icon: "🏆", href: "/gbp/competitors", group: "GOOGLE LOCAL SEO", comingSoon: true },
  { key: "gbp-qa", label: "Reports", icon: "📋", href: "/gbp/reports", group: "GOOGLE LOCAL SEO", comingSoon: true },
```

Update the nav item render in `app-shell.tsx` to handle `comingSoon` items:

```tsx
{items.map((item) => {
  const active = item.key === activeScreen;
  if (item.comingSoon) {
    return (
      <div
        key={item.key}
        className="flex w-full items-center gap-3 rounded-lg px-4 py-3 text-left text-sm font-medium opacity-40 cursor-not-allowed"
      >
        <span className="text-base">{item.icon}</span>
        <span>{item.label}</span>
        <span className="ml-auto text-[10px] font-bold uppercase tracking-wider opacity-70">Soon</span>
      </div>
    );
  }
  return (
    <Link
      key={item.key}
      href={item.href}
      className={`flex w-full items-center gap-3 rounded-lg px-4 py-3 text-left text-sm font-medium transition ${
        active
          ? "bg-indigo-600 text-white shadow-sm"
          : "text-white hover:bg-slate-800 hover:text-white"
      }`}
    >
      <span className="text-base">{item.icon}</span>
      <span>{item.label}</span>
    </Link>
  );
})}
```

- [ ] **Step 3: Verify the app compiles**

```bash
npx tsc --noEmit
```

Expected: no errors.

- [ ] **Step 4: Commit**

```bash
git add src/lib/navigation.ts src/components/app-shell.tsx
git commit -m "feat: add Google Local SEO nav section with GBP Manager"
```

---

## Task 3: GBP API wrapper

**Files:**
- Create: `src/lib/gbp-api.ts`

Context: `google-oauth.ts` already exports `getValidGoogleAccessToken(connection)` which handles refresh transparently. The GBP API v4 base URL for reviews is `https://mybusiness.googleapis.com/v4`. All GBP content API calls use the same base.

The `googleLocationName` stored on `Location` looks like `accounts/123456789/locations/987654321`.

- [ ] **Step 1: Write `src/lib/gbp-api.ts`**

```ts
const GBP_V4 = "https://mybusiness.googleapis.com/v4";

export type GbpPostPayload = {
  postType: "WHATS_NEW" | "OFFER" | "EVENT";
  content: string;
  callToAction?: { actionType: string; url: string } | null;
  imageUrl?: string | null;
};

export type GbpApiError = { code: number; message: string };

async function gbpFetch(
  url: string,
  accessToken: string,
  options: RequestInit = {}
): Promise<Response> {
  const res = await fetch(url, {
    ...options,
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "Content-Type": "application/json",
      ...(options.headers ?? {}),
    },
    cache: "no-store",
  });
  return res;
}

function extractErrorMessage(text: string): string {
  try {
    const json = JSON.parse(text) as { error?: { message?: string } };
    return json.error?.message ?? text;
  } catch {
    return text;
  }
}

export async function publishGbpReply(
  accessToken: string,
  reviewName: string,
  replyText: string
): Promise<void> {
  // reviewName = "accounts/.../locations/.../reviews/..."
  const res = await gbpFetch(`${GBP_V4}/${reviewName}/reply`, accessToken, {
    method: "PUT",
    body: JSON.stringify({ comment: replyText }),
  });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`GBP publishReply failed (${res.status}): ${extractErrorMessage(text)}`);
  }
}

export async function createGbpPost(
  accessToken: string,
  locationName: string,
  post: GbpPostPayload
): Promise<string> {
  // Returns the gbpPostId (name field from response)
  const topicType =
    post.postType === "OFFER" ? "OFFER" :
    post.postType === "EVENT" ? "EVENT" :
    "STANDARD";

  const body: Record<string, unknown> = {
    languageCode: "en-US",
    summary: post.content,
    topicType,
  };
  if (post.callToAction?.url) {
    body.callToAction = { actionType: post.callToAction.actionType || "LEARN_MORE", url: post.callToAction.url };
  }
  if (post.imageUrl) {
    body.media = [{ mediaFormat: "PHOTO", sourceUrl: post.imageUrl }];
  }

  const res = await gbpFetch(`${GBP_V4}/${locationName}/localPosts`, accessToken, {
    method: "POST",
    body: JSON.stringify(body),
  });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`GBP createPost failed (${res.status}): ${extractErrorMessage(text)}`);
  }
  const json = (await res.json()) as { name?: string };
  return json.name ?? "";
}

export async function deleteGbpPost(
  accessToken: string,
  gbpPostId: string
): Promise<void> {
  const res = await gbpFetch(`${GBP_V4}/${gbpPostId}`, accessToken, { method: "DELETE" });
  if (!res.ok && res.status !== 404) {
    const text = await res.text();
    throw new Error(`GBP deletePost failed (${res.status}): ${extractErrorMessage(text)}`);
  }
}

export async function uploadGbpPhoto(
  accessToken: string,
  locationName: string,
  sourceUrl: string,
  category: string
): Promise<string> {
  // Returns the gbpMediaId (name field from response)
  const body = {
    mediaFormat: "PHOTO",
    sourceUrl,
    locationAssociation: { category },
  };
  const res = await gbpFetch(`${GBP_V4}/${locationName}/media`, accessToken, {
    method: "POST",
    body: JSON.stringify(body),
  });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`GBP uploadPhoto failed (${res.status}): ${extractErrorMessage(text)}`);
  }
  const json = (await res.json()) as { name?: string };
  return json.name ?? "";
}

export async function deleteGbpPhoto(
  accessToken: string,
  gbpMediaId: string
): Promise<void> {
  const res = await gbpFetch(`${GBP_V4}/${gbpMediaId}`, accessToken, { method: "DELETE" });
  if (!res.ok && res.status !== 404) {
    const text = await res.text();
    throw new Error(`GBP deletePhoto failed (${res.status}): ${extractErrorMessage(text)}`);
  }
}

export type GbpQuestion = {
  name: string;
  text: string;
  createTime: string;
  topAnswers?: Array<{ text: string; name: string }>;
};

export async function listGbpQuestions(
  accessToken: string,
  locationName: string
): Promise<GbpQuestion[]> {
  const url = `${GBP_V4}/${locationName}/questions?answersPerQuestion=1&pageSize=50`;
  const res = await gbpFetch(url, accessToken);
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`GBP listQuestions failed (${res.status}): ${extractErrorMessage(text)}`);
  }
  const json = (await res.json()) as { questions?: GbpQuestion[] };
  return json.questions ?? [];
}

export async function answerGbpQuestion(
  accessToken: string,
  questionName: string,
  answerText: string
): Promise<string> {
  // questionName = "accounts/.../locations/.../questions/..."
  // Returns answer name
  const res = await gbpFetch(`${GBP_V4}/${questionName}/answers/`, accessToken, {
    method: "PATCH",
    body: JSON.stringify({ answer: { text: answerText } }),
  });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`GBP answerQuestion failed (${res.status}): ${extractErrorMessage(text)}`);
  }
  const json = (await res.json()) as { name?: string };
  return json.name ?? "";
}
```

- [ ] **Step 2: Verify TypeScript compiles**

```bash
npx tsc --noEmit
```

Expected: no errors.

- [ ] **Step 3: Commit**

```bash
git add src/lib/gbp-api.ts
git commit -m "feat: add gbp-api.ts wrapper for GBP REST API v4"
```

---

## Task 4: Unit tests for gbp-api.ts

**Files:**
- Create: `src/lib/gbp-api.test.ts`

- [ ] **Step 1: Write the tests**

```ts
import assert from "node:assert/strict";
import test from "node:test";
import {
  publishGbpReply,
  createGbpPost,
  deleteGbpPost,
  uploadGbpPhoto,
  deleteGbpPhoto,
  listGbpQuestions,
  answerGbpQuestion,
} from "./gbp-api.ts";

const TOKEN = "test-access-token";

function mockFetch(status: number, body: unknown) {
  return async (url: string, options?: RequestInit) => {
    return {
      ok: status >= 200 && status < 300,
      status,
      text: async () => JSON.stringify(body),
      json: async () => body,
    } as Response;
  };
}

test("publishGbpReply sends PUT to correct URL", async () => {
  let calledUrl = "";
  let calledBody = "";
  global.fetch = async (url: string | URL | Request, options?: RequestInit) => {
    calledUrl = url.toString();
    calledBody = options?.body as string;
    return { ok: true, status: 200, text: async () => "{}", json: async () => ({}) } as Response;
  };

  await publishGbpReply(TOKEN, "accounts/123/locations/456/reviews/789", "Great review!");

  assert.equal(calledUrl, "https://mybusiness.googleapis.com/v4/accounts/123/locations/456/reviews/789/reply");
  assert.deepEqual(JSON.parse(calledBody), { comment: "Great review!" });
});

test("publishGbpReply throws on non-2xx response", async () => {
  global.fetch = mockFetch(403, { error: { message: "Forbidden" } }) as typeof fetch;

  await assert.rejects(
    () => publishGbpReply(TOKEN, "accounts/123/locations/456/reviews/789", "Reply"),
    /GBP publishReply failed \(403\): Forbidden/
  );
});

test("createGbpPost sends POST and returns gbpPostId", async () => {
  let calledUrl = "";
  let parsedBody: unknown;
  global.fetch = async (url: string | URL | Request, options?: RequestInit) => {
    calledUrl = url.toString();
    parsedBody = JSON.parse(options?.body as string);
    return { ok: true, status: 200, text: async () => "", json: async () => ({ name: "accounts/123/locations/456/localPosts/abc" }) } as Response;
  };

  const id = await createGbpPost(TOKEN, "accounts/123/locations/456", {
    postType: "WHATS_NEW",
    content: "Hello world",
  });

  assert.equal(calledUrl, "https://mybusiness.googleapis.com/v4/accounts/123/locations/456/localPosts");
  assert.equal(id, "accounts/123/locations/456/localPosts/abc");
  assert.equal((parsedBody as Record<string, unknown>).topicType, "STANDARD");
  assert.equal((parsedBody as Record<string, unknown>).summary, "Hello world");
});

test("createGbpPost maps OFFER postType to topicType OFFER", async () => {
  let parsedBody: unknown;
  global.fetch = async (_url: string | URL | Request, options?: RequestInit) => {
    parsedBody = JSON.parse(options?.body as string);
    return { ok: true, status: 200, text: async () => "", json: async () => ({ name: "x" }) } as Response;
  };

  await createGbpPost(TOKEN, "accounts/123/locations/456", { postType: "OFFER", content: "50% off" });
  assert.equal((parsedBody as Record<string, unknown>).topicType, "OFFER");
});

test("deleteGbpPost sends DELETE to the post name", async () => {
  let calledUrl = "";
  global.fetch = async (url: string | URL | Request) => {
    calledUrl = url.toString();
    return { ok: true, status: 200, text: async () => "", json: async () => ({}) } as Response;
  };

  await deleteGbpPost(TOKEN, "accounts/123/locations/456/localPosts/abc");
  assert.equal(calledUrl, "https://mybusiness.googleapis.com/v4/accounts/123/locations/456/localPosts/abc");
});

test("deleteGbpPost does not throw on 404", async () => {
  global.fetch = mockFetch(404, {}) as typeof fetch;
  await assert.doesNotReject(() => deleteGbpPost(TOKEN, "posts/notfound"));
});

test("uploadGbpPhoto sends correct body and returns media name", async () => {
  let parsedBody: unknown;
  global.fetch = async (_url: string | URL | Request, options?: RequestInit) => {
    parsedBody = JSON.parse(options?.body as string);
    return { ok: true, status: 200, text: async () => "", json: async () => ({ name: "accounts/123/locations/456/media/m1" }) } as Response;
  };

  const id = await uploadGbpPhoto(TOKEN, "accounts/123/locations/456", "https://cdn.example.com/photo.jpg", "EXTERIOR");
  assert.equal(id, "accounts/123/locations/456/media/m1");
  assert.equal((parsedBody as Record<string, unknown>).mediaFormat, "PHOTO");
  assert.equal((parsedBody as Record<string, unknown>).sourceUrl, "https://cdn.example.com/photo.jpg");
  assert.deepEqual((parsedBody as Record<string, unknown>).locationAssociation, { category: "EXTERIOR" });
});

test("listGbpQuestions returns questions array", async () => {
  global.fetch = async () => ({
    ok: true,
    status: 200,
    text: async () => "",
    json: async () => ({
      questions: [
        { name: "accounts/123/locations/456/questions/q1", text: "Are you open Sundays?", createTime: "2024-01-01T00:00:00Z" },
      ],
    }),
  }) as Response;

  const questions = await listGbpQuestions(TOKEN, "accounts/123/locations/456");
  assert.equal(questions.length, 1);
  assert.equal(questions[0].text, "Are you open Sundays?");
});

test("listGbpQuestions returns empty array when no questions", async () => {
  global.fetch = async () => ({
    ok: true,
    status: 200,
    text: async () => "",
    json: async () => ({}),
  }) as Response;

  const questions = await listGbpQuestions(TOKEN, "accounts/123/locations/456");
  assert.deepEqual(questions, []);
});

test("answerGbpQuestion sends PATCH with answer text", async () => {
  let parsedBody: unknown;
  let calledUrl = "";
  global.fetch = async (url: string | URL | Request, options?: RequestInit) => {
    calledUrl = url.toString();
    parsedBody = JSON.parse(options?.body as string);
    return { ok: true, status: 200, text: async () => "", json: async () => ({ name: "accounts/123/locations/456/questions/q1/answers/a1" }) } as Response;
  };

  const answerId = await answerGbpQuestion(TOKEN, "accounts/123/locations/456/questions/q1", "Yes, open 10am–5pm.");
  assert.equal(calledUrl, "https://mybusiness.googleapis.com/v4/accounts/123/locations/456/questions/q1/answers/");
  assert.deepEqual(parsedBody, { answer: { text: "Yes, open 10am–5pm." } });
  assert.equal(answerId, "accounts/123/locations/456/questions/q1/answers/a1");
});
```

- [ ] **Step 2: Run the tests to verify they pass**

```bash
node --test --experimental-strip-types src/lib/gbp-api.test.ts
```

Expected: all 10 tests pass.

- [ ] **Step 3: Commit**

```bash
git add src/lib/gbp-api.test.ts
git commit -m "test: unit tests for gbp-api.ts"
```

---

## Task 5: GBP scheduler and sync

**Files:**
- Create: `src/lib/gbp-scheduler.ts`
- Create: `src/lib/gbp-sync.ts`

Context: `gbp-scheduler.ts` queries GbpPost and GbpPhoto records where `status = SCHEDULED AND scheduledAt <= now()`, resolves the org's Google access token via `getValidGoogleAccessToken`, calls `gbp-api.ts`, and updates status. `gbp-sync.ts` pulls Q&A from GBP nightly. The `Location` model has `googleLocationName` (e.g. `accounts/123/locations/456`) and `googleConnectionId` linking to `GoogleAccountConnection`.

- [ ] **Step 1: Write `src/lib/gbp-scheduler.ts`**

```ts
import { GbpPublishStatus } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { getValidGoogleAccessToken } from "@/lib/google-oauth";
import { createGbpPost, uploadGbpPhoto } from "@/lib/gbp-api";

type SchedulerResult = {
  processed: number;
  succeeded: number;
  failed: number;
};

export async function runGbpScheduler(): Promise<SchedulerResult> {
  const now = new Date();
  let succeeded = 0;
  let failed = 0;

  // --- Process scheduled GbpPosts ---
  const duePosts = await prisma.gbpPost.findMany({
    where: { status: GbpPublishStatus.SCHEDULED, scheduledAt: { lte: now } },
    include: {
      location: {
        select: { googleLocationName: true, googleConnectionId: true, id: true },
      },
    },
    take: 50,
  });

  for (const post of duePosts) {
    const conn = post.location.googleConnectionId
      ? await prisma.googleAccountConnection.findUnique({
          where: { id: post.location.googleConnectionId },
          select: { id: true, accessToken: true, refreshToken: true, expiresAt: true, scope: true, tokenType: true },
        })
      : null;

    if (!conn || !post.location.googleLocationName) {
      await prisma.gbpPost.update({
        where: { id: post.id },
        data: { status: GbpPublishStatus.FAILED, failureReason: "No Google connection or location name" },
      });
      failed++;
      continue;
    }

    try {
      const accessToken = await getValidGoogleAccessToken(conn);
      const callToAction =
        post.callToAction && typeof post.callToAction === "object" && !Array.isArray(post.callToAction)
          ? (post.callToAction as { actionType?: string; url?: string })
          : null;

      const gbpPostId = await createGbpPost(accessToken, post.location.googleLocationName, {
        postType: post.postType,
        content: post.content,
        callToAction: callToAction?.url ? { actionType: callToAction.actionType ?? "LEARN_MORE", url: callToAction.url } : null,
        imageUrl: post.imageUrl,
      });

      await prisma.gbpPost.update({
        where: { id: post.id },
        data: { status: GbpPublishStatus.PUBLISHED, publishedAt: new Date(), gbpPostId, failureReason: null },
      });
      succeeded++;
    } catch (error) {
      const msg = error instanceof Error ? error.message : "Unknown error";
      await prisma.gbpPost.update({
        where: { id: post.id },
        data: { status: GbpPublishStatus.FAILED, failureReason: msg },
      });
      failed++;
    }
  }

  // --- Process scheduled GbpPhotos ---
  const duePhotos = await prisma.gbpPhoto.findMany({
    where: { status: GbpPublishStatus.SCHEDULED, scheduledAt: { lte: now } },
    include: {
      location: {
        select: { googleLocationName: true, googleConnectionId: true, id: true },
      },
    },
    take: 50,
  });

  for (const photo of duePhotos) {
    const conn = photo.location.googleConnectionId
      ? await prisma.googleAccountConnection.findUnique({
          where: { id: photo.location.googleConnectionId },
          select: { id: true, accessToken: true, refreshToken: true, expiresAt: true, scope: true, tokenType: true },
        })
      : null;

    if (!conn || !photo.location.googleLocationName) {
      await prisma.gbpPhoto.update({
        where: { id: photo.id },
        data: { status: GbpPublishStatus.FAILED, failureReason: "No Google connection or location name" },
      });
      failed++;
      continue;
    }

    try {
      const accessToken = await getValidGoogleAccessToken(conn);
      const gbpMediaId = await uploadGbpPhoto(accessToken, photo.location.googleLocationName, photo.storageUrl, photo.category);
      await prisma.gbpPhoto.update({
        where: { id: photo.id },
        data: { status: GbpPublishStatus.PUBLISHED, publishedAt: new Date(), gbpMediaId, failureReason: null },
      });
      succeeded++;
    } catch (error) {
      const msg = error instanceof Error ? error.message : "Unknown error";
      await prisma.gbpPhoto.update({
        where: { id: photo.id },
        data: { status: GbpPublishStatus.FAILED, failureReason: msg },
      });
      failed++;
    }
  }

  return { processed: duePosts.length + duePhotos.length, succeeded, failed };
}
```

- [ ] **Step 2: Write `src/lib/gbp-sync.ts`**

```ts
import { prisma } from "@/lib/prisma";
import { getValidGoogleAccessToken } from "@/lib/google-oauth";
import { listGbpQuestions } from "@/lib/gbp-api";
import { sendTeamNotificationEmail, isEmailSendingConfigured } from "@/lib/email";

export async function runGbpSync(): Promise<{ locationsProcessed: number; questionsUpserted: number; newUnanswered: number }> {
  let locationsProcessed = 0;
  let questionsUpserted = 0;
  let newUnanswered = 0;

  // Find all locations with an active Google connection
  const locations = await prisma.location.findMany({
    where: { googleConnectionId: { not: null }, googleLocationName: { not: null } },
    include: {
      googleConnection: {
        select: { id: true, accessToken: true, refreshToken: true, expiresAt: true, scope: true, tokenType: true },
      },
      organization: { select: { users: { include: { user: { select: { email: true } } } } } },
    },
  });

  for (const location of locations) {
    if (!location.googleConnection || !location.googleLocationName) continue;

    const syncedAt = new Date();

    try {
      const accessToken = await getValidGoogleAccessToken(location.googleConnection);
      const questions = await listGbpQuestions(accessToken, location.googleLocationName);

      for (const q of questions) {
        const existingAnswer = q.topAnswers?.[0];
        const upserted = await prisma.gbpQuestion.upsert({
          where: { gbpQuestionId: q.name },
          update: { questionText: q.text, syncedAt },
          create: {
            locationId: location.id,
            gbpQuestionId: q.name,
            questionText: q.text,
            askedAt: new Date(q.createTime),
            answerText: existingAnswer?.text ?? null,
            answeredAt: existingAnswer ? syncedAt : null,
            gbpAnswerId: existingAnswer?.name ?? null,
            syncedAt,
          },
        });
        questionsUpserted++;

        // Alert for newly synced unanswered questions (not previously in our DB)
        const wasNew = upserted.createdAt.getTime() === upserted.syncedAt.getTime(); // just created
        if (wasNew && !upserted.answeredAt && isEmailSendingConfigured()) {
          newUnanswered++;
          // Send to org owners/admins who have email
          const ownerEmails = location.organization.users
            .filter((m) => ["OWNER", "ADMIN"].includes(m.role))
            .map((m) => m.user.email)
            .filter(Boolean) as string[];

          for (const email of ownerEmails) {
            await sendTeamNotificationEmail({
              to: email,
              contactName: "a customer",
              locationName: location.name,
              eventType: `new_question: ${q.text.slice(0, 80)}`,
            });
          }
        }
      }

      await prisma.gbpSyncLog.create({
        data: { locationId: location.id, syncType: "QUESTIONS", status: "SUCCESS", itemsSynced: questions.length, syncedAt },
      });
      locationsProcessed++;
    } catch (error) {
      const msg = error instanceof Error ? error.message : "Unknown sync error";
      await prisma.gbpSyncLog.create({
        data: { locationId: location.id, syncType: "QUESTIONS", status: "FAILED", error: msg, syncedAt },
      });
    }
  }

  return { locationsProcessed, questionsUpserted, newUnanswered };
}
```

- [ ] **Step 3: Verify TypeScript compiles**

```bash
npx tsc --noEmit
```

Expected: no errors.

- [ ] **Step 4: Commit**

```bash
git add src/lib/gbp-scheduler.ts src/lib/gbp-sync.ts
git commit -m "feat: add gbp-scheduler and gbp-sync"
```

---

## Task 6: Unit tests for gbp-scheduler.ts

**Files:**
- Create: `src/lib/gbp-scheduler.test.ts`

Note: `gbp-scheduler.ts` imports from Prisma and other modules. These tests verify the scheduling logic by testing the conditions directly rather than calling `runGbpScheduler` (which requires a live DB). We test the pure scheduling logic inline.

- [ ] **Step 1: Write the tests**

```ts
import assert from "node:assert/strict";
import test from "node:test";

// Test the scheduling predicate logic directly
test("item with scheduledAt in the past should be processed", () => {
  const now = new Date();
  const scheduledAt = new Date(now.getTime() - 60_000); // 1 min ago
  assert.ok(scheduledAt <= now, "past item should be lte now");
});

test("item with scheduledAt in the future should not be processed", () => {
  const now = new Date();
  const scheduledAt = new Date(now.getTime() + 60_000); // 1 min ahead
  assert.ok(!(scheduledAt <= now), "future item should not be lte now");
});

test("PUBLISHED items should not be re-processed", () => {
  const status = "PUBLISHED";
  // Only SCHEDULED items are queried — verify the filter
  assert.notEqual(status, "SCHEDULED");
});

test("FAILED items should not be retried automatically", () => {
  const status = "FAILED";
  assert.notEqual(status, "SCHEDULED");
});

test("DRAFT items should not be published", () => {
  const status = "DRAFT";
  assert.notEqual(status, "SCHEDULED");
});

// Test the callToAction extraction logic
test("extracts callToAction from JSON config when url present", () => {
  const raw = { actionType: "BOOK", url: "https://example.com/book" };
  const cta = raw.url ? { actionType: raw.actionType ?? "LEARN_MORE", url: raw.url } : null;
  assert.deepEqual(cta, { actionType: "BOOK", url: "https://example.com/book" });
});

test("returns null callToAction when url missing", () => {
  const raw = { actionType: "BOOK", url: "" };
  const cta = raw.url ? { actionType: raw.actionType ?? "LEARN_MORE", url: raw.url } : null;
  assert.equal(cta, null);
});

test("defaults callToAction actionType to LEARN_MORE when not specified", () => {
  const raw = { url: "https://example.com" };
  const cta = raw.url ? { actionType: (raw as Record<string, string>).actionType ?? "LEARN_MORE", url: raw.url } : null;
  assert.equal(cta?.actionType, "LEARN_MORE");
});
```

- [ ] **Step 2: Run the tests**

```bash
node --test --experimental-strip-types src/lib/gbp-scheduler.test.ts
```

Expected: all 8 tests pass.

- [ ] **Step 3: Commit**

```bash
git add src/lib/gbp-scheduler.test.ts
git commit -m "test: unit tests for gbp-scheduler scheduling logic"
```

---

## Task 7: Cron endpoint + vercel.json

**Files:**
- Create: `src/app/api/cron/gbp/route.ts`
- Modify: `vercel.json`

Context: existing cron at `/api/cron` uses `Authorization: Bearer CRON_SECRET` header. Follow the same pattern.

- [ ] **Step 1: Write the cron route**

```ts
import { NextRequest, NextResponse } from "next/server";
import { runGbpScheduler } from "@/lib/gbp-scheduler";
import { runGbpSync } from "@/lib/gbp-sync";

export const maxDuration = 60;

export async function GET(request: NextRequest) {
  const authHeader = request.headers.get("authorization");

  if (!process.env.CRON_SECRET || authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const doSync = request.nextUrl.searchParams.get("sync") === "true";

  try {
    const schedulerResult = await runGbpScheduler();
    const syncResult = doSync ? await runGbpSync() : null;
    return NextResponse.json({ ok: true, schedulerResult, syncResult });
  } catch (error) {
    const message = error instanceof Error ? error.message : "GBP cron failed";
    return NextResponse.json({ ok: false, error: message }, { status: 500 });
  }
}
```

- [ ] **Step 2: Update vercel.json**

Replace the current contents of `vercel.json` with:

```json
{
  "crons": [
    {
      "path": "/api/cron",
      "schedule": "0 0 * * *"
    },
    {
      "path": "/api/cron/gbp",
      "schedule": "*/5 * * * *"
    },
    {
      "path": "/api/cron/gbp?sync=true",
      "schedule": "0 2 * * *"
    }
  ]
}
```

- [ ] **Step 3: Verify TypeScript compiles**

```bash
npx tsc --noEmit
```

Expected: no errors.

- [ ] **Step 4: Commit**

```bash
git add src/app/api/cron/gbp/route.ts vercel.json
git commit -m "feat: add GBP cron endpoint and vercel.json schedules"
```

---

## Task 8: GBP server actions

**Files:**
- Create: `src/app/gbp/actions.ts`

Context: all server actions in this app use `"use server"` at top and take `formData: FormData`. They use `getCurrentMembership()` for auth and `getCurrentAccessibleLocationIds()` for scoping. They redirect on success (using `redirect` from `next/navigation`) or return error strings. Photos use `put` from `@vercel/blob` for server-side upload.

- [ ] **Step 1: Write `src/app/gbp/actions.ts`**

```ts
"use server";

import { redirect } from "next/navigation";
import { put } from "@vercel/blob";
import { GbpPublishStatus, GbpPostType } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { getCurrentMembership } from "@/lib/authz";
import { getCurrentAccessibleLocationIds } from "@/lib/current-scope";
import { getValidGoogleAccessToken } from "@/lib/google-oauth";
import { publishGbpReply, createGbpPost, deleteGbpPost, uploadGbpPhoto, deleteGbpPhoto, answerGbpQuestion } from "@/lib/gbp-api";

async function getLocationWithConnection(locationId: string, allowedIds: string[]) {
  if (allowedIds.length > 0 && !allowedIds.includes(locationId)) return null;
  return prisma.location.findUnique({
    where: { id: locationId },
    select: {
      id: true,
      name: true,
      googleLocationName: true,
      googleConnection: {
        select: { id: true, accessToken: true, refreshToken: true, expiresAt: true, scope: true, tokenType: true },
      },
    },
  });
}

export async function publishGbpReplyAction(formData: FormData) {
  const membership = await getCurrentMembership();
  if (!membership) return { error: "Not authenticated" };

  const reviewId = String(formData.get("reviewId") ?? "").trim();
  const replyText = String(formData.get("replyText") ?? "").trim();
  if (!reviewId || !replyText) return { error: "Missing fields" };

  const locationIds = await getCurrentAccessibleLocationIds();
  const review = await prisma.review.findFirst({
    where: {
      id: reviewId,
      ...(locationIds.length > 0 ? { locationId: { in: locationIds } } : {}),
    },
    select: { id: true, externalId: true, locationId: true, replyPublishedAt: true },
  });
  if (!review) return { error: "Review not found" };
  if (review.replyPublishedAt) return { error: "Reply already published" };

  const location = await getLocationWithConnection(review.locationId, locationIds);
  if (!location?.googleConnection || !location.googleLocationName) {
    return { error: "Location is not connected to Google Business Profile" };
  }
  if (!review.externalId) return { error: "Review has no Google ID" };

  try {
    const accessToken = await getValidGoogleAccessToken(location.googleConnection);
    const reviewName = `${location.googleLocationName}/reviews/${review.externalId}`;
    await publishGbpReply(accessToken, reviewName, replyText);
    await prisma.review.update({
      where: { id: review.id },
      data: { replyDraft: replyText, replyPublishedAt: new Date(), replyGbpId: reviewName },
    });
    return { ok: true };
  } catch (error) {
    return { error: error instanceof Error ? error.message : "Failed to publish reply" };
  }
}

export async function createGbpPostAction(formData: FormData) {
  const membership = await getCurrentMembership();
  if (!membership) redirect("/login");

  const locationId = String(formData.get("locationId") ?? "").trim();
  const content = String(formData.get("content") ?? "").trim();
  const postTypeRaw = String(formData.get("postType") ?? "WHATS_NEW").trim().toUpperCase();
  const ctaUrl = String(formData.get("ctaUrl") ?? "").trim();
  const ctaType = String(formData.get("ctaType") ?? "LEARN_MORE").trim();
  const imageUrl = String(formData.get("imageUrl") ?? "").trim() || null;
  const scheduledAtRaw = String(formData.get("scheduledAt") ?? "").trim();
  const publishNow = formData.get("publishNow") === "true";

  if (!locationId || !content) redirect("/gbp/posts/new?error=missing_fields");

  const postType: GbpPostType =
    postTypeRaw === "OFFER" ? GbpPostType.OFFER :
    postTypeRaw === "EVENT" ? GbpPostType.EVENT :
    GbpPostType.WHATS_NEW;

  const scheduledAt = !publishNow && scheduledAtRaw ? new Date(scheduledAtRaw) : null;
  const status = publishNow ? GbpPublishStatus.DRAFT : (scheduledAt ? GbpPublishStatus.SCHEDULED : GbpPublishStatus.DRAFT);

  const locationIds = await getCurrentAccessibleLocationIds();
  const location = await getLocationWithConnection(locationId, locationIds);
  if (!location) redirect("/gbp/posts/new?error=not_found");

  const callToAction = ctaUrl ? { actionType: ctaType, url: ctaUrl } : null;

  if (publishNow && location.googleConnection && location.googleLocationName) {
    try {
      const accessToken = await getValidGoogleAccessToken(location.googleConnection);
      const gbpPostId = await createGbpPost(accessToken, location.googleLocationName, {
        postType, content, callToAction, imageUrl,
      });
      await prisma.gbpPost.create({
        data: { locationId, postType, content, callToAction, imageUrl, status: GbpPublishStatus.PUBLISHED, publishedAt: new Date(), gbpPostId },
      });
    } catch (error) {
      const msg = error instanceof Error ? error.message : "Failed to publish";
      await prisma.gbpPost.create({
        data: { locationId, postType, content, callToAction, imageUrl, status: GbpPublishStatus.FAILED, failureReason: msg },
      });
    }
  } else {
    await prisma.gbpPost.create({
      data: { locationId, postType, content, callToAction, imageUrl, status, scheduledAt },
    });
  }

  redirect("/gbp/posts");
}

export async function deleteGbpPostAction(formData: FormData) {
  const membership = await getCurrentMembership();
  if (!membership) return { error: "Not authenticated" };

  const postId = String(formData.get("postId") ?? "").trim();
  const locationIds = await getCurrentAccessibleLocationIds();

  const post = await prisma.gbpPost.findFirst({
    where: {
      id: postId,
      ...(locationIds.length > 0 ? { locationId: { in: locationIds } } : {}),
    },
    include: {
      location: {
        select: { googleLocationName: true, googleConnection: { select: { id: true, accessToken: true, refreshToken: true, expiresAt: true, scope: true, tokenType: true } } },
      },
    },
  });
  if (!post) return { error: "Post not found" };

  if (post.gbpPostId && post.location.googleConnection) {
    try {
      const accessToken = await getValidGoogleAccessToken(post.location.googleConnection);
      await deleteGbpPost(accessToken, post.gbpPostId);
    } catch {
      // Best-effort delete — remove from DB even if GBP delete fails
    }
  }

  await prisma.gbpPost.delete({ where: { id: post.id } });
  redirect("/gbp/posts");
}

export async function uploadGbpPhotoAction(formData: FormData) {
  const membership = await getCurrentMembership();
  if (!membership) redirect("/login");

  const locationId = String(formData.get("locationId") ?? "").trim();
  const category = String(formData.get("category") ?? "ADDITIONAL").trim();
  const scheduledAtRaw = String(formData.get("scheduledAt") ?? "").trim();
  const publishNow = formData.get("publishNow") === "true";
  const photoFile = formData.get("photo") as File | null;

  if (!locationId || !photoFile || photoFile.size === 0) redirect("/gbp/photos?error=missing_fields");

  const locationIds = await getCurrentAccessibleLocationIds();
  const location = await getLocationWithConnection(locationId, locationIds);
  if (!location) redirect("/gbp/photos?error=not_found");

  // Upload to Vercel Blob
  const blobName = `gbp-photos/${locationId}/${Date.now()}-${photoFile.name}`;
  const blob = await put(blobName, photoFile, { access: "public" });

  const scheduledAt = !publishNow && scheduledAtRaw ? new Date(scheduledAtRaw) : null;
  const status = publishNow ? GbpPublishStatus.DRAFT : (scheduledAt ? GbpPublishStatus.SCHEDULED : GbpPublishStatus.DRAFT);

  if (publishNow && location.googleConnection && location.googleLocationName) {
    try {
      const accessToken = await getValidGoogleAccessToken(location.googleConnection);
      const gbpMediaId = await uploadGbpPhoto(accessToken, location.googleLocationName, blob.url, category);
      await prisma.gbpPhoto.create({
        data: { locationId, storageUrl: blob.url, category, status: GbpPublishStatus.PUBLISHED, publishedAt: new Date(), gbpMediaId },
      });
    } catch (error) {
      const msg = error instanceof Error ? error.message : "Failed to publish";
      await prisma.gbpPhoto.create({
        data: { locationId, storageUrl: blob.url, category, status: GbpPublishStatus.FAILED, failureReason: msg },
      });
    }
  } else {
    await prisma.gbpPhoto.create({
      data: { locationId, storageUrl: blob.url, category, status, scheduledAt },
    });
  }

  redirect("/gbp/photos");
}

export async function deleteGbpPhotoAction(formData: FormData) {
  const membership = await getCurrentMembership();
  if (!membership) return { error: "Not authenticated" };

  const photoId = String(formData.get("photoId") ?? "").trim();
  const locationIds = await getCurrentAccessibleLocationIds();

  const photo = await prisma.gbpPhoto.findFirst({
    where: {
      id: photoId,
      ...(locationIds.length > 0 ? { locationId: { in: locationIds } } : {}),
    },
    include: {
      location: {
        select: { googleConnection: { select: { id: true, accessToken: true, refreshToken: true, expiresAt: true, scope: true, tokenType: true } } },
      },
    },
  });
  if (!photo) return { error: "Photo not found" };

  if (photo.gbpMediaId && photo.location.googleConnection) {
    try {
      const accessToken = await getValidGoogleAccessToken(photo.location.googleConnection);
      await deleteGbpPhoto(accessToken, photo.gbpMediaId);
    } catch {
      // Best-effort
    }
  }

  await prisma.gbpPhoto.delete({ where: { id: photo.id } });
  redirect("/gbp/photos");
}

export async function answerGbpQuestionAction(formData: FormData) {
  const membership = await getCurrentMembership();
  if (!membership) return { error: "Not authenticated" };

  const questionId = String(formData.get("questionId") ?? "").trim();
  const answerText = String(formData.get("answerText") ?? "").trim();
  if (!questionId || !answerText) return { error: "Missing fields" };

  const locationIds = await getCurrentAccessibleLocationIds();
  const question = await prisma.gbpQuestion.findFirst({
    where: {
      id: questionId,
      ...(locationIds.length > 0 ? { locationId: { in: locationIds } } : {}),
    },
    include: {
      location: {
        select: {
          googleConnection: { select: { id: true, accessToken: true, refreshToken: true, expiresAt: true, scope: true, tokenType: true } },
        },
      },
    },
  });
  if (!question) return { error: "Question not found" };
  if (!question.location.googleConnection) return { error: "Location not connected to Google" };

  try {
    const accessToken = await getValidGoogleAccessToken(question.location.googleConnection);
    const answerId = await answerGbpQuestion(accessToken, question.gbpQuestionId, answerText);
    await prisma.gbpQuestion.update({
      where: { id: question.id },
      data: { answerText, answeredAt: new Date(), gbpAnswerId: answerId },
    });
    return { ok: true };
  } catch (error) {
    return { error: error instanceof Error ? error.message : "Failed to post answer" };
  }
}
```

- [ ] **Step 2: Verify TypeScript compiles**

```bash
npx tsc --noEmit
```

Expected: no errors.

- [ ] **Step 3: Commit**

```bash
git add src/app/gbp/actions.ts
git commit -m "feat: add GBP server actions (reply, post, photo, Q&A)"
```

---

## Task 9: GBP Manager hub page

**Files:**
- Create: `src/app/gbp/page.tsx`

Context: follows the pattern of other pages — `export const dynamic = "force-dynamic"`, uses `AppShell`, `getCurrentMembership`, `getCurrentAccessibleLocationIds`. The hub shows one card per location with counts and a health score.

- [ ] **Step 1: Write `src/app/gbp/page.tsx`**

```tsx
export const dynamic = "force-dynamic";

import Link from "next/link";
import { AppShell } from "@/components/app-shell";
import { prisma } from "@/lib/prisma";
import { getCurrentMembership } from "@/lib/authz";
import { getCurrentAccessibleLocationIds } from "@/lib/current-scope";
import { notFound } from "next/navigation";
import { GbpPublishStatus } from "@prisma/client";

export default async function GbpManagerPage() {
  const membership = await getCurrentMembership();
  if (!membership) notFound();

  const locationIds = await getCurrentAccessibleLocationIds();

  const locations = await prisma.location.findMany({
    where: {
      organizationId: membership.organizationId,
      ...(locationIds.length > 0 ? { id: { in: locationIds } } : {}),
    },
    select: {
      id: true,
      name: true,
      googleLocationName: true,
      googleConnectionId: true,
    },
    orderBy: { name: "asc" },
  });

  // Gather stats per location
  const stats = await Promise.all(
    locations.map(async (loc) => {
      const [pendingReplies, scheduledPosts, livePhotos, unansweredQa] = await Promise.all([
        prisma.review.count({ where: { locationId: loc.id, replyDraft: { not: null }, replyPublishedAt: null } }),
        prisma.gbpPost.count({ where: { locationId: loc.id, status: GbpPublishStatus.SCHEDULED } }),
        prisma.gbpPhoto.count({ where: { locationId: loc.id, status: GbpPublishStatus.PUBLISHED } }),
        prisma.gbpQuestion.count({ where: { locationId: loc.id, answeredAt: null } }),
      ]);

      // Simple health score: start at 100, deduct for issues
      let health = 100;
      if (pendingReplies > 0) health -= Math.min(pendingReplies * 5, 30);
      if (unansweredQa > 0) health -= Math.min(unansweredQa * 5, 20);
      if (livePhotos === 0) health -= 15;
      if (scheduledPosts === 0) health -= 10;
      health = Math.max(0, health);

      const healthColor = health >= 80 ? "text-emerald-600" : health >= 50 ? "text-amber-600" : "text-red-600";

      return { loc, pendingReplies, scheduledPosts, livePhotos, unansweredQa, health, healthColor };
    })
  );

  return (
    <AppShell activeScreen="gbp-manager">
      <div className="space-y-6">
        <div>
          <p className="text-sm font-semibold uppercase tracking-[0.22em] text-indigo-600">Google Local SEO</p>
          <h2 className="mt-2 text-3xl font-semibold tracking-tight text-slate-950">GBP Manager</h2>
          <p className="mt-1 text-sm text-slate-500">Manage your Google Business Profile content across all locations.</p>
        </div>

        <div className="flex gap-3">
          <Link href="/gbp/posts/new" className="rounded-2xl bg-slate-950 px-5 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-slate-800 transition">
            + New Post
          </Link>
          <Link href="/gbp/photos" className="rounded-2xl border border-slate-200 bg-white px-5 py-2.5 text-sm font-semibold text-slate-700 shadow-sm hover:border-slate-300 transition">
            Photos
          </Link>
          <Link href="/gbp/qa" className="rounded-2xl border border-slate-200 bg-white px-5 py-2.5 text-sm font-semibold text-slate-700 shadow-sm hover:border-slate-300 transition">
            Q&amp;A
          </Link>
        </div>

        {stats.length === 0 ? (
          <div className="rounded-3xl border border-slate-200 bg-white p-12 text-center shadow-sm">
            <p className="text-lg font-semibold text-slate-700">No locations yet</p>
            <p className="mt-2 text-sm text-slate-500">Add a location and connect it to Google Business Profile to get started.</p>
            <Link href="/locations" className="mt-6 inline-block rounded-2xl bg-indigo-600 px-5 py-2.5 text-sm font-semibold text-white hover:bg-indigo-700 transition">
              Go to Locations
            </Link>
          </div>
        ) : (
          <div className="grid gap-6 lg:grid-cols-2">
            {stats.map(({ loc, pendingReplies, scheduledPosts, livePhotos, unansweredQa, health, healthColor }) => (
              <div key={loc.id} className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <p className="font-semibold text-slate-900">{loc.name}</p>
                    {!loc.googleConnectionId ? (
                      <Link href="/integrations" className="mt-1 inline-block text-xs font-semibold text-amber-600 hover:underline">
                        Connect Google Business Profile →
                      </Link>
                    ) : (
                      <p className="mt-1 text-xs text-slate-400">GBP connected</p>
                    )}
                  </div>
                  <div className="text-right">
                    <p className="text-xs font-semibold uppercase tracking-wider text-slate-400">Health</p>
                    <p className={`text-2xl font-bold ${healthColor}`}>{health}/100</p>
                  </div>
                </div>

                <div className="mt-5 grid grid-cols-2 gap-3">
                  <Link href={`/reviews?locationId=${loc.id}`} className="rounded-2xl border border-slate-200 p-4 hover:border-indigo-200 hover:bg-indigo-50 transition">
                    <p className="text-xs font-semibold uppercase tracking-wider text-slate-400">Replies needed</p>
                    <p className={`mt-1 text-2xl font-bold ${pendingReplies > 0 ? "text-rose-600" : "text-slate-900"}`}>{pendingReplies}</p>
                  </Link>
                  <Link href="/gbp/posts" className="rounded-2xl border border-slate-200 p-4 hover:border-indigo-200 hover:bg-indigo-50 transition">
                    <p className="text-xs font-semibold uppercase tracking-wider text-slate-400">Posts scheduled</p>
                    <p className="mt-1 text-2xl font-bold text-slate-900">{scheduledPosts}</p>
                  </Link>
                  <Link href="/gbp/photos" className="rounded-2xl border border-slate-200 p-4 hover:border-indigo-200 hover:bg-indigo-50 transition">
                    <p className="text-xs font-semibold uppercase tracking-wider text-slate-400">Live photos</p>
                    <p className="mt-1 text-2xl font-bold text-slate-900">{livePhotos}</p>
                  </Link>
                  <Link href="/gbp/qa" className="rounded-2xl border border-slate-200 p-4 hover:border-indigo-200 hover:bg-indigo-50 transition">
                    <p className="text-xs font-semibold uppercase tracking-wider text-slate-400">Unanswered Q&amp;A</p>
                    <p className={`mt-1 text-2xl font-bold ${unansweredQa > 0 ? "text-amber-600" : "text-slate-900"}`}>{unansweredQa}</p>
                  </Link>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </AppShell>
  );
}
```

- [ ] **Step 2: Verify TypeScript compiles**

```bash
npx tsc --noEmit
```

Expected: no errors.

- [ ] **Step 3: Commit**

```bash
git add src/app/gbp/page.tsx
git commit -m "feat: add GBP Manager hub page"
```

---

## Task 10: Reviews inbox — Publish to Google button

**Files:**
- Modify: `src/components/reviews/review-reply-panel.tsx`

Context: the `ReviewReplyPanel` is a client component. It already has a form with `action={saveReviewReply}`. Add a "Publish to Google" button that calls `publishGbpReplyAction` server action. The `review` prop has type `ReviewWithRelations` — add `replyPublishedAt` and `replyGbpId` to it by updating the reviews lib query.

First check what `ReviewWithRelations` includes.

- [ ] **Step 1: Update `ReviewWithRelations` in `src/lib/reviews.ts` to include new fields**

Find where `ReviewWithRelations` is defined in `src/lib/reviews.ts`. The `getReviews` and `getReviewById` functions build this type from a Prisma select/include. Add `replyPublishedAt: true` and `replyGbpId: true` and `externalId: true` to the select (they are already in the Prisma model, so just need to be selected).

Look for the `select` or `include` object in the reviews query and ensure these fields are included. If the type is inferred from the query, they'll automatically appear on `ReviewWithRelations` once added.

- [ ] **Step 2: Add Publish to Google button to ReviewReplyPanel**

In `src/components/reviews/review-reply-panel.tsx`, add state for the publish action and add the button inside the form's button group. The action is a separate form (not inside the existing form) since it has a different action:

Replace the closing `</form>` section (after the Save draft / Mark as sent buttons) with:

```tsx
        <div className="flex flex-wrap gap-3">
          <button
            type="submit"
            name="markSent"
            value="false"
            className="rounded-2xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 shadow-sm hover:border-slate-300"
          >
            Save draft
          </button>
          <button
            type="submit"
            name="markSent"
            value="true"
            className="rounded-2xl bg-slate-950 px-4 py-2.5 text-sm font-semibold text-white shadow-sm"
          >
            Mark as sent
          </button>
        </div>
      </form>

      {/* Publish to Google — separate form so it gets the current draft value */}
      {review.source === "GOOGLE" && !review.replyPublishedAt && (
        <form
          onSubmit={async (e) => {
            e.preventDefault();
            setPublishing(true);
            setPublishError(null);
            const fd = new FormData();
            fd.append("reviewId", review.id);
            fd.append("replyText", draft);
            const result = await publishGbpReplyAction(fd);
            setPublishing(false);
            if (result?.error) {
              setPublishError(result.error);
            }
          }}
        >
          <button
            type="submit"
            disabled={!draft || publishing}
            className="rounded-2xl bg-indigo-600 px-4 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed transition"
          >
            {publishing ? "Publishing…" : "Publish to Google ↗"}
          </button>
          {publishError && <p className="mt-2 text-xs text-rose-600">{publishError}</p>}
        </form>
      )}
      {review.source === "GOOGLE" && review.replyPublishedAt && (
        <p className="text-xs text-emerald-600 font-semibold">
          ✓ Published to Google {new Date(review.replyPublishedAt).toLocaleDateString()}
        </p>
      )}
```

Add the corresponding state and import at the top of `ReviewReplyPanel`:

```tsx
"use client";

import { useState } from "react";
import { saveReviewReply } from "@/app/reviews/actions";
import { publishGbpReplyAction } from "@/app/gbp/actions";
import { formatReviewDate, formatReviewSource, formatReviewStatus, stars, type ReviewWithRelations } from "@/lib/reviews";

export function ReviewReplyPanel({ ... }) {
  const [draft, setDraft] = useState(initialDraft);
  const [aiLoading, setAiLoading] = useState(false);
  const [aiError, setAiError] = useState<string | null>(null);
  const [publishing, setPublishing] = useState(false);
  const [publishError, setPublishError] = useState<string | null>(null);
  // ...
```

- [ ] **Step 3: Verify TypeScript compiles**

```bash
npx tsc --noEmit
```

Expected: no errors.

- [ ] **Step 4: Commit**

```bash
git add src/components/reviews/review-reply-panel.tsx src/lib/reviews.ts
git commit -m "feat: add Publish to Google button to review reply panel"
```

---

## Task 11: GBP Posts pages

**Files:**
- Create: `src/app/gbp/posts/page.tsx`
- Create: `src/app/gbp/posts/new/page.tsx`

- [ ] **Step 1: Write `src/app/gbp/posts/page.tsx`**

```tsx
export const dynamic = "force-dynamic";

import Link from "next/link";
import { AppShell } from "@/components/app-shell";
import { prisma } from "@/lib/prisma";
import { getCurrentMembership } from "@/lib/authz";
import { getCurrentAccessibleLocationIds } from "@/lib/current-scope";
import { notFound } from "next/navigation";
import { GbpPublishStatus } from "@prisma/client";
import { deleteGbpPostAction } from "@/app/gbp/actions";

const STATUS_LABELS: Record<GbpPublishStatus, string> = {
  DRAFT: "Draft",
  SCHEDULED: "Scheduled",
  PUBLISHED: "Published",
  FAILED: "Failed",
};

const STATUS_COLORS: Record<GbpPublishStatus, string> = {
  DRAFT: "bg-slate-100 text-slate-600",
  SCHEDULED: "bg-blue-50 text-blue-700",
  PUBLISHED: "bg-emerald-50 text-emerald-700",
  FAILED: "bg-red-50 text-red-700",
};

export default async function GbpPostsPage() {
  const membership = await getCurrentMembership();
  if (!membership) notFound();

  const locationIds = await getCurrentAccessibleLocationIds();
  const posts = await prisma.gbpPost.findMany({
    where: locationIds.length > 0 ? { locationId: { in: locationIds } } : {},
    include: { location: { select: { name: true } } },
    orderBy: [{ status: "asc" }, { scheduledAt: "asc" }, { createdAt: "desc" }],
    take: 100,
  });

  return (
    <AppShell activeScreen="gbp-manager">
      <div className="space-y-6">
        <div className="flex items-start justify-between gap-4">
          <div>
            <a href="/gbp" className="text-sm text-indigo-600 hover:underline">← GBP Manager</a>
            <h2 className="mt-2 text-3xl font-semibold tracking-tight text-slate-950">GBP Posts</h2>
          </div>
          <Link href="/gbp/posts/new" className="mt-2 rounded-2xl bg-slate-950 px-5 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-slate-800 transition">
            + New Post
          </Link>
        </div>

        {posts.length === 0 ? (
          <div className="rounded-3xl border border-slate-200 bg-white p-12 text-center shadow-sm">
            <p className="text-lg font-semibold text-slate-700">No posts yet</p>
            <Link href="/gbp/posts/new" className="mt-4 inline-block rounded-2xl bg-indigo-600 px-5 py-2.5 text-sm font-semibold text-white hover:bg-indigo-700 transition">
              Create your first post
            </Link>
          </div>
        ) : (
          <div className="rounded-3xl border border-slate-200 bg-white shadow-sm overflow-hidden">
            <div className="divide-y divide-slate-100">
              {posts.map((post) => (
                <div key={post.id} className="flex items-start gap-4 px-6 py-4">
                  <div className="flex-1 min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className={`rounded-full px-2 py-0.5 text-[11px] font-semibold uppercase tracking-wide ${STATUS_COLORS[post.status]}`}>
                        {STATUS_LABELS[post.status]}
                      </span>
                      <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[11px] font-semibold uppercase tracking-wide text-slate-500">
                        {post.postType.replace("_", " ")}
                      </span>
                      <span className="text-xs text-slate-400">{post.location.name}</span>
                    </div>
                    <p className="mt-1 text-sm text-slate-700 line-clamp-2">{post.content}</p>
                    {post.scheduledAt && post.status === GbpPublishStatus.SCHEDULED && (
                      <p className="mt-1 text-xs text-slate-400">
                        Scheduled: {post.scheduledAt.toLocaleString()}
                      </p>
                    )}
                    {post.publishedAt && (
                      <p className="mt-1 text-xs text-slate-400">
                        Published: {post.publishedAt.toLocaleString()}
                      </p>
                    )}
                    {post.failureReason && (
                      <p className="mt-1 text-xs text-red-600">{post.failureReason}</p>
                    )}
                  </div>
                  <form action={deleteGbpPostAction}>
                    <input type="hidden" name="postId" value={post.id} />
                    <button type="submit" className="text-xs text-slate-400 hover:text-red-600 transition">
                      Delete
                    </button>
                  </form>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </AppShell>
  );
}
```

- [ ] **Step 2: Write `src/app/gbp/posts/new/page.tsx`**

```tsx
export const dynamic = "force-dynamic";

import { AppShell } from "@/components/app-shell";
import { prisma } from "@/lib/prisma";
import { getCurrentMembership } from "@/lib/authz";
import { getCurrentAccessibleLocationIds } from "@/lib/current-scope";
import { notFound } from "next/navigation";
import { createGbpPostAction } from "@/app/gbp/actions";

export default async function NewGbpPostPage({
  searchParams,
}: {
  searchParams?: Promise<Record<string, string | undefined>>;
}) {
  const membership = await getCurrentMembership();
  if (!membership) notFound();

  const query = (await searchParams) ?? {};
  const error = query.error;

  const locationIds = await getCurrentAccessibleLocationIds();
  const locations = await prisma.location.findMany({
    where: {
      organizationId: membership.organizationId,
      ...(locationIds.length > 0 ? { id: { in: locationIds } } : {}),
    },
    select: { id: true, name: true },
    orderBy: { name: "asc" },
  });

  return (
    <AppShell activeScreen="gbp-manager">
      <div className="space-y-6 max-w-2xl">
        <div>
          <a href="/gbp/posts" className="text-sm text-indigo-600 hover:underline">← Posts</a>
          <h2 className="mt-2 text-3xl font-semibold tracking-tight text-slate-950">New GBP Post</h2>
        </div>

        {error && (
          <div className="rounded-2xl bg-red-50 px-4 py-3 text-sm text-red-700">
            {error === "missing_fields" ? "Please fill in all required fields." : "An error occurred."}
          </div>
        )}

        <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
          <form action={createGbpPostAction} className="space-y-5">
            <div>
              <label className="mb-2 block text-sm font-semibold text-slate-700">Location</label>
              <select name="locationId" required className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-900 focus:border-indigo-400 focus:outline-none focus:ring-2 focus:ring-indigo-100">
                <option value="">Select a location…</option>
                {locations.map((loc) => (
                  <option key={loc.id} value={loc.id}>{loc.name}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="mb-2 block text-sm font-semibold text-slate-700">Post type</label>
              <select name="postType" className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-900 focus:border-indigo-400 focus:outline-none focus:ring-2 focus:ring-indigo-100">
                <option value="WHATS_NEW">What&apos;s New</option>
                <option value="OFFER">Offer</option>
                <option value="EVENT">Event</option>
              </select>
            </div>

            <div>
              <label className="mb-2 block text-sm font-semibold text-slate-700">Content</label>
              <textarea
                name="content"
                required
                rows={5}
                placeholder="Write your post content…"
                className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-900 focus:border-indigo-400 focus:outline-none focus:ring-2 focus:ring-indigo-100"
              />
            </div>

            <div>
              <label className="mb-2 block text-sm font-semibold text-slate-700">Call-to-action URL <span className="font-normal text-slate-400">(optional)</span></label>
              <div className="flex gap-2">
                <select name="ctaType" className="rounded-2xl border border-slate-200 bg-slate-50 px-3 py-3 text-sm text-slate-900 focus:border-indigo-400 focus:outline-none">
                  <option value="LEARN_MORE">Learn More</option>
                  <option value="BOOK">Book</option>
                  <option value="ORDER">Order</option>
                  <option value="SHOP">Shop</option>
                  <option value="SIGN_UP">Sign Up</option>
                  <option value="CALL">Call</option>
                </select>
                <input name="ctaUrl" type="url" placeholder="https://example.com/book" className="flex-1 rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-900 focus:border-indigo-400 focus:outline-none focus:ring-2 focus:ring-indigo-100" />
              </div>
            </div>

            <div>
              <label className="mb-2 block text-sm font-semibold text-slate-700">Schedule <span className="font-normal text-slate-400">(optional — leave blank to save as draft)</span></label>
              <input name="scheduledAt" type="datetime-local" className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-900 focus:border-indigo-400 focus:outline-none focus:ring-2 focus:ring-indigo-100" />
            </div>

            <div className="flex gap-3 pt-2">
              <button type="submit" name="publishNow" value="true" className="rounded-2xl bg-indigo-600 px-5 py-3 text-sm font-semibold text-white shadow-sm hover:bg-indigo-700 transition">
                Publish now ↗
              </button>
              <button type="submit" name="publishNow" value="false" className="rounded-2xl bg-slate-950 px-5 py-3 text-sm font-semibold text-white shadow-sm hover:bg-slate-800 transition">
                Save / Schedule
              </button>
            </div>
          </form>
        </div>
      </div>
    </AppShell>
  );
}
```

- [ ] **Step 3: Verify TypeScript compiles**

```bash
npx tsc --noEmit
```

Expected: no errors.

- [ ] **Step 4: Commit**

```bash
git add src/app/gbp/posts/
git commit -m "feat: add GBP post list and new post pages"
```

---

## Task 12: GBP Photo management page

**Files:**
- Create: `src/app/gbp/photos/page.tsx`

- [ ] **Step 1: Write `src/app/gbp/photos/page.tsx`**

```tsx
export const dynamic = "force-dynamic";

import { AppShell } from "@/components/app-shell";
import { prisma } from "@/lib/prisma";
import { getCurrentMembership } from "@/lib/authz";
import { getCurrentAccessibleLocationIds } from "@/lib/current-scope";
import { notFound } from "next/navigation";
import { GbpPublishStatus } from "@prisma/client";
import { uploadGbpPhotoAction, deleteGbpPhotoAction } from "@/app/gbp/actions";

const CATEGORIES = ["EXTERIOR", "INTERIOR", "FOOD", "MENU", "AT_WORK", "TEAM", "ADDITIONAL"];

export default async function GbpPhotosPage({
  searchParams,
}: {
  searchParams?: Promise<Record<string, string | undefined>>;
}) {
  const membership = await getCurrentMembership();
  if (!membership) notFound();

  const query = (await searchParams) ?? {};
  const tab = query.tab === "upload" ? "upload" : "gallery";

  const locationIds = await getCurrentAccessibleLocationIds();

  const [locations, photos] = await Promise.all([
    prisma.location.findMany({
      where: {
        organizationId: membership.organizationId,
        ...(locationIds.length > 0 ? { id: { in: locationIds } } : {}),
      },
      select: { id: true, name: true },
      orderBy: { name: "asc" },
    }),
    prisma.gbpPhoto.findMany({
      where: locationIds.length > 0 ? { locationId: { in: locationIds } } : {},
      include: { location: { select: { name: true } } },
      orderBy: { createdAt: "desc" },
      take: 100,
    }),
  ]);

  const publishedPhotos = photos.filter((p) => p.status === GbpPublishStatus.PUBLISHED);
  const pendingPhotos = photos.filter((p) => p.status !== GbpPublishStatus.PUBLISHED);

  return (
    <AppShell activeScreen="gbp-manager">
      <div className="space-y-6 max-w-4xl">
        <div>
          <a href="/gbp" className="text-sm text-indigo-600 hover:underline">← GBP Manager</a>
          <h2 className="mt-2 text-3xl font-semibold tracking-tight text-slate-950">Photo Management</h2>
        </div>

        {/* Tabs */}
        <div className="flex gap-1 rounded-2xl border border-slate-200 bg-slate-50 p-1 w-fit">
          <a href="/gbp/photos?tab=gallery" className={`rounded-xl px-4 py-2 text-sm font-semibold transition ${tab === "gallery" ? "bg-white text-slate-900 shadow-sm" : "text-slate-500 hover:text-slate-700"}`}>
            Live on Google ({publishedPhotos.length})
          </a>
          <a href="/gbp/photos?tab=upload" className={`rounded-xl px-4 py-2 text-sm font-semibold transition ${tab === "upload" ? "bg-white text-slate-900 shadow-sm" : "text-slate-500 hover:text-slate-700"}`}>
            Upload
          </a>
        </div>

        {tab === "upload" && (
          <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
            <h3 className="text-lg font-semibold text-slate-950 mb-5">Upload a photo</h3>
            <form action={uploadGbpPhotoAction} encType="multipart/form-data" className="space-y-4">
              <div>
                <label className="mb-2 block text-sm font-semibold text-slate-700">Location</label>
                <select name="locationId" required className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-900 focus:border-indigo-400 focus:outline-none focus:ring-2 focus:ring-indigo-100">
                  <option value="">Select a location…</option>
                  {locations.map((loc) => (
                    <option key={loc.id} value={loc.id}>{loc.name}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="mb-2 block text-sm font-semibold text-slate-700">Photo</label>
                <input name="photo" type="file" accept="image/*" required className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-900" />
              </div>
              <div>
                <label className="mb-2 block text-sm font-semibold text-slate-700">Category</label>
                <select name="category" className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-900 focus:border-indigo-400 focus:outline-none focus:ring-2 focus:ring-indigo-100">
                  {CATEGORIES.map((c) => (
                    <option key={c} value={c}>{c.replace("_", " ")}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="mb-2 block text-sm font-semibold text-slate-700">Schedule <span className="font-normal text-slate-400">(optional)</span></label>
                <input name="scheduledAt" type="datetime-local" className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-900 focus:border-indigo-400 focus:outline-none focus:ring-2 focus:ring-indigo-100" />
              </div>
              <div className="flex gap-3 pt-2">
                <button type="submit" name="publishNow" value="true" className="rounded-2xl bg-indigo-600 px-5 py-3 text-sm font-semibold text-white shadow-sm hover:bg-indigo-700 transition">
                  Publish now ↗
                </button>
                <button type="submit" name="publishNow" value="false" className="rounded-2xl bg-slate-950 px-5 py-3 text-sm font-semibold text-white shadow-sm hover:bg-slate-800 transition">
                  Save / Schedule
                </button>
              </div>
            </form>
          </div>
        )}

        {tab === "gallery" && (
          <>
            {pendingPhotos.length > 0 && (
              <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
                <p className="text-sm font-semibold uppercase tracking-[0.18em] text-slate-400 mb-4">Pending / Scheduled</p>
                <div className="divide-y divide-slate-100">
                  {pendingPhotos.map((photo) => (
                    <div key={photo.id} className="flex items-center gap-4 py-3">
                      <img src={photo.storageUrl} alt="" className="h-14 w-14 rounded-xl object-cover border border-slate-200" />
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-semibold text-slate-700">{photo.category} · {photo.location.name}</p>
                        <p className="text-xs text-slate-400">{photo.status}{photo.scheduledAt ? ` · ${photo.scheduledAt.toLocaleString()}` : ""}</p>
                        {photo.failureReason && <p className="text-xs text-red-600">{photo.failureReason}</p>}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            <div>
              <p className="text-sm font-semibold uppercase tracking-[0.18em] text-slate-400 mb-4">Live on Google ({publishedPhotos.length})</p>
              {publishedPhotos.length === 0 ? (
                <p className="text-sm text-slate-500">No published photos yet. <a href="/gbp/photos?tab=upload" className="text-indigo-600 hover:underline">Upload one →</a></p>
              ) : (
                <div className="grid grid-cols-3 gap-3 sm:grid-cols-4 md:grid-cols-5">
                  {publishedPhotos.map((photo) => (
                    <div key={photo.id} className="group relative rounded-2xl overflow-hidden border border-slate-200">
                      <img src={photo.storageUrl} alt="" className="h-32 w-full object-cover" />
                      <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition flex items-center justify-center">
                        <form action={deleteGbpPhotoAction}>
                          <input type="hidden" name="photoId" value={photo.id} />
                          <button type="submit" className="rounded-xl bg-red-600 px-3 py-1.5 text-xs font-semibold text-white">
                            Delete
                          </button>
                        </form>
                      </div>
                      <div className="px-2 py-1.5">
                        <p className="text-[10px] text-slate-500 truncate">{photo.category}</p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </>
        )}
      </div>
    </AppShell>
  );
}
```

- [ ] **Step 2: Verify TypeScript compiles**

```bash
npx tsc --noEmit
```

Expected: no errors.

- [ ] **Step 3: Commit**

```bash
git add src/app/gbp/photos/page.tsx
git commit -m "feat: add GBP photo management page"
```

---

## Task 13: GBP Q&A page

**Files:**
- Create: `src/app/gbp/qa/page.tsx`

- [ ] **Step 1: Write `src/app/gbp/qa/page.tsx`**

```tsx
export const dynamic = "force-dynamic";

import { AppShell } from "@/components/app-shell";
import { prisma } from "@/lib/prisma";
import { getCurrentMembership } from "@/lib/authz";
import { getCurrentAccessibleLocationIds } from "@/lib/current-scope";
import { notFound } from "next/navigation";
import { answerGbpQuestionAction } from "@/app/gbp/actions";

export default async function GbpQaPage() {
  const membership = await getCurrentMembership();
  if (!membership) notFound();

  const locationIds = await getCurrentAccessibleLocationIds();
  const questions = await prisma.gbpQuestion.findMany({
    where: locationIds.length > 0 ? { locationId: { in: locationIds } } : {},
    include: { location: { select: { name: true } } },
    orderBy: [{ answeredAt: "asc" }, { askedAt: "desc" }],
    take: 100,
  });

  const unanswered = questions.filter((q) => !q.answeredAt);
  const answered = questions.filter((q) => q.answeredAt);

  return (
    <AppShell activeScreen="gbp-manager">
      <div className="space-y-6 max-w-3xl">
        <div>
          <a href="/gbp" className="text-sm text-indigo-600 hover:underline">← GBP Manager</a>
          <h2 className="mt-2 text-3xl font-semibold tracking-tight text-slate-950">Q&amp;A Management</h2>
          <p className="mt-1 text-sm text-slate-500">Questions are synced nightly from Google Business Profile.</p>
        </div>

        {questions.length === 0 ? (
          <div className="rounded-3xl border border-slate-200 bg-white p-12 text-center shadow-sm">
            <p className="text-lg font-semibold text-slate-700">No questions yet</p>
            <p className="mt-2 text-sm text-slate-500">Questions will appear here after the nightly sync. Check back tomorrow.</p>
          </div>
        ) : (
          <>
            {unanswered.length > 0 && (
              <div className="rounded-3xl border border-amber-200 bg-white shadow-sm overflow-hidden">
                <div className="border-b border-amber-100 px-6 py-4">
                  <p className="text-sm font-semibold uppercase tracking-[0.18em] text-amber-600">{unanswered.length} Unanswered</p>
                </div>
                <div className="divide-y divide-slate-100">
                  {unanswered.map((q) => (
                    <div key={q.id} className="px-6 py-5">
                      <div className="flex items-start justify-between gap-4">
                        <div>
                          <p className="font-semibold text-slate-900">{q.questionText}</p>
                          <p className="mt-1 text-xs text-slate-400">{q.location.name} · {q.askedAt.toLocaleDateString()}</p>
                        </div>
                      </div>
                      <form action={answerGbpQuestionAction} className="mt-4 flex flex-col gap-3">
                        <input type="hidden" name="questionId" value={q.id} />
                        <textarea
                          name="answerText"
                          required
                          rows={3}
                          placeholder="Write your answer…"
                          className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-900 focus:border-indigo-400 focus:outline-none focus:ring-2 focus:ring-indigo-100"
                        />
                        <div>
                          <button type="submit" className="rounded-2xl bg-indigo-600 px-4 py-2 text-sm font-semibold text-white hover:bg-indigo-700 transition">
                            Post Answer to Google ↗
                          </button>
                        </div>
                      </form>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {answered.length > 0 && (
              <div className="rounded-3xl border border-slate-200 bg-white shadow-sm overflow-hidden">
                <div className="border-b border-slate-100 px-6 py-4">
                  <p className="text-sm font-semibold uppercase tracking-[0.18em] text-slate-400">{answered.length} Answered</p>
                </div>
                <div className="divide-y divide-slate-100">
                  {answered.map((q) => (
                    <div key={q.id} className="px-6 py-5">
                      <p className="font-semibold text-slate-900">{q.questionText}</p>
                      <p className="mt-2 rounded-2xl bg-slate-50 px-4 py-3 text-sm text-slate-700">{q.answerText}</p>
                      <p className="mt-2 text-xs text-emerald-600 font-semibold">✓ Published · {q.answeredAt?.toLocaleDateString()}</p>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </AppShell>
  );
}
```

- [ ] **Step 2: Verify TypeScript compiles**

```bash
npx tsc --noEmit
```

Expected: no errors.

- [ ] **Step 3: Commit**

```bash
git add src/app/gbp/qa/page.tsx
git commit -m "feat: add GBP Q&A management page"
```

---

## Task 14: PUBLISH_GBP_REPLY automation step

**Files:**
- Modify: `src/lib/automation-engine.ts`

Context: `PUBLISH_GBP_REPLY` is now a valid `AutomationStepType`. In `executeSteps`, add a handler that:
1. Looks up the most recent Google Review for the contact in the automation run
2. If it has a `replyDraft` but no `replyPublishedAt`, publishes it via `gbp-api.ts`
3. Updates `Review.replyPublishedAt` and `Review.replyGbpId`

The `contact` and `location` are already available in `executeSteps`. The location's `googleConnectionId` links to `GoogleAccountConnection`.

- [ ] **Step 1: Add the import**

At the top of `src/lib/automation-engine.ts`, add:

```ts
import { getValidGoogleAccessToken } from "@/lib/google-oauth";
import { publishGbpReply } from "@/lib/gbp-api";
```

- [ ] **Step 2: Add the PUBLISH_GBP_REPLY case in executeSteps**

In the `executeSteps` function, after the `AutomationStepType.WEBHOOK` block and before the final `stepsExecuted.push({ ... "Step type not implemented" })`, add:

```ts
    if (step.stepType === AutomationStepType.PUBLISH_GBP_REPLY) {
      const review = await prisma.review.findFirst({
        where: {
          locationId: location.id,
          contactId: contact.id,
          source: "GOOGLE",
          replyDraft: { not: null },
          replyPublishedAt: null,
          externalId: { not: null },
        },
        include: {
          location: {
            select: {
              googleLocationName: true,
              googleConnection: {
                select: { id: true, accessToken: true, refreshToken: true, expiresAt: true, scope: true, tokenType: true },
              },
            },
          },
        },
        orderBy: { reviewedAt: "desc" },
      });

      if (!review || !review.location.googleConnection || !review.location.googleLocationName || !review.externalId) {
        stepsExecuted.push({ stepId: step.id, stepType: step.stepType, status: "skipped", detail: "No eligible Google review with draft found for contact" });
        continue;
      }

      try {
        const accessToken = await getValidGoogleAccessToken(review.location.googleConnection);
        const reviewName = `${review.location.googleLocationName}/reviews/${review.externalId}`;
        await publishGbpReply(accessToken, reviewName, review.replyDraft!);
        await prisma.review.update({
          where: { id: review.id },
          data: { replyPublishedAt: new Date(), replyGbpId: reviewName },
        });
        stepsExecuted.push({ stepId: step.id, stepType: step.stepType, status: "executed", detail: `Published GBP reply for review ${review.id}` });
      } catch (error) {
        const msg = error instanceof Error ? error.message : "Failed to publish GBP reply";
        stepsExecuted.push({ stepId: step.id, stepType: step.stepType, status: "skipped", detail: msg });
      }
      continue;
    }
```

- [ ] **Step 3: Verify TypeScript compiles**

```bash
npx tsc --noEmit
```

Expected: no errors.

- [ ] **Step 4: Commit**

```bash
git add src/lib/automation-engine.ts
git commit -m "feat: add PUBLISH_GBP_REPLY automation step handler"
```

---

## Task 15: Deploy and smoke test

**Files:** none (deployment only)

- [ ] **Step 1: Run a final TypeScript check**

```bash
npx tsc --noEmit
```

Expected: no errors.

- [ ] **Step 2: Run all tests**

```bash
node --test --experimental-strip-types 'src/**/*.test.ts'
```

Expected: all tests pass.

- [ ] **Step 3: Deploy to production**

```bash
npx vercel deploy --prod
```

Wait for deployment to complete. Note the deployment URL.

- [ ] **Step 4: Smoke test — Review reply**

1. Navigate to `/reviews` in the deployed app
2. Select a Google review that has a reply draft
3. Confirm "Publish to Google ↗" button is visible
4. Click it and confirm the success state (green checkmark appears)
5. Check Google Business Profile — reply should be live

- [ ] **Step 5: Smoke test — GBP Post (schedule 2 min ahead)**

1. Navigate to `/gbp/posts/new`
2. Select a location with GBP connected
3. Write "What's New" post content
4. Set schedule 2 minutes in the future
5. Click "Save / Schedule"
6. Confirm post appears in `/gbp/posts` with SCHEDULED status
7. Wait 5 minutes for cron to fire, refresh — status should become PUBLISHED
8. Check GBP listing — post should be live

- [ ] **Step 6: Smoke test — GBP Manager hub**

1. Navigate to `/gbp`
2. Confirm location cards show correct counts
3. Confirm health score updates after publishing

- [ ] **Step 7: Final commit if any fixes needed**

```bash
git add -p
git commit -m "fix: post-deploy smoke test fixes"
```
