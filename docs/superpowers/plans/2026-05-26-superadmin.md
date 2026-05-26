# Superadmin Role & Dashboard Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a platform-owner superadmin role with a dashboard at `/admin` to view all orgs/users and perform CRUD, suspend, and promote actions.

**Architecture:** `isSuperAdmin Boolean` on `User` + `suspendedAt DateTime?` on `Organization`. A `requireSuperAdmin()` guard protects every admin page and action. Suspended orgs are caught in `requireMembership()` and redirected to `/suspended`. All admin pages live under `src/app/admin/` with a standalone layout separate from the org `AppShell`.

**Tech Stack:** Next.js 14 App Router, Prisma + PostgreSQL. No new packages.

---

## File Map

| File | Change |
|---|---|
| `prisma/schema.prisma` | Add `isSuperAdmin Boolean @default(false)` to User; `suspendedAt DateTime?` to Organization |
| `prisma/migrations/20260526_add_superadmin/migration.sql` | ALTER TABLE for both columns |
| `src/lib/authz.ts` | Add `requireSuperAdmin()`; add suspension redirect to `requireMembership()` |
| `src/app/suspended/page.tsx` | **New** — public suspended account page |
| `src/app/admin/layout.tsx` | **New** — minimal admin layout (logo + nav + sign out) |
| `src/app/admin/page.tsx` | **New** — platform stats dashboard |
| `src/app/admin/orgs/page.tsx` | **New** — searchable org list |
| `src/app/admin/orgs/[id]/page.tsx` | **New** — org detail: edit, suspend, delete |
| `src/app/admin/users/page.tsx` | **New** — searchable user list |
| `src/app/admin/users/[id]/page.tsx` | **New** — user detail: promote/revoke superadmin |
| `src/app/admin/actions.ts` | **New** — all superadmin server actions |

---

## Task 1: Schema changes and migration

**Files:**
- Modify: `prisma/schema.prisma`
- Create: `prisma/migrations/20260526_add_superadmin/migration.sql`

- [ ] **Step 1: Add `isSuperAdmin` to the User model in `prisma/schema.prisma`**

Find the `User` model (around line 102). Add `isSuperAdmin` after `avatarUrl`:

```prisma
model User {
  id            String           @id @default(cuid())
  name          String
  email         String           @unique
  passwordHash  String?
  emailVerified DateTime?
  avatarUrl     String?
  isSuperAdmin  Boolean          @default(false)
  createdAt     DateTime         @default(now())
  updatedAt     DateTime         @updatedAt

  memberships UserMembership[]
  accounts    Account[]
  sessions    Session[]
}
```

- [ ] **Step 2: Add `suspendedAt` to the Organization model**

Find the `Organization` model (around line 86). Add `suspendedAt` after `aiReplyEnabled`:

```prisma
model Organization {
  id             String                  @id @default(cuid())
  name           String
  slug           String                  @unique
  website        String?
  aiReplyEnabled Boolean                 @default(false)
  suspendedAt    DateTime?
  createdAt      DateTime                @default(now())
  updatedAt      DateTime                @updatedAt

  users             UserMembership[]
  locations         Location[]
  automations       Automation[]
  googleConnections GoogleAccountConnection[]
  reviewWidgets     ReviewWidget[]
}
```

- [ ] **Step 3: Create the migration directory and SQL file**

```bash
mkdir -p prisma/migrations/20260526_add_superadmin
```

Create `prisma/migrations/20260526_add_superadmin/migration.sql`:

```sql
ALTER TABLE "User" ADD COLUMN "isSuperAdmin" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "Organization" ADD COLUMN "suspendedAt" TIMESTAMP(3);
```

- [ ] **Step 4: Apply the migration**

```bash
npx prisma migrate dev --name add_superadmin
```

Expected: `✓ Generated Prisma Client` with no errors. If it complains about the migration file already existing, run instead:

```bash
npx prisma db execute --schema=prisma/schema.prisma --stdin <<'EOF'
ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "isSuperAdmin" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "Organization" ADD COLUMN IF NOT EXISTS "suspendedAt" TIMESTAMP(3);
EOF
npx prisma generate
```

- [ ] **Step 5: Verify both fields exist in Prisma client**

```bash
node -e "const { Prisma } = require('@prisma/client'); console.log('isSuperAdmin:', 'isSuperAdmin' in Prisma.UserScalarFieldEnum, 'suspendedAt:', 'suspendedAt' in Prisma.OrganizationScalarFieldEnum)"
```

Expected: `isSuperAdmin: true suspendedAt: true`

- [ ] **Step 6: Commit**

```bash
git add prisma/schema.prisma prisma/migrations/20260526_add_superadmin/
git commit -m "feat: add isSuperAdmin to User and suspendedAt to Organization"
```

---

## Task 2: Auth guard and suspension check

**Files:**
- Modify: `src/lib/authz.ts`
- Create: `src/app/suspended/page.tsx`

- [ ] **Step 1: Add `requireSuperAdmin()` to `src/lib/authz.ts`**

Add this import at the top of `src/lib/authz.ts` — `redirect` is already available via Next.js but needs importing:

```typescript
import { redirect } from "next/navigation";
```

Then add `requireSuperAdmin()` at the end of the file:

```typescript
export async function requireSuperAdmin() {
  const session = await auth();
  const userId = session?.user?.id;

  if (!userId) {
    redirect("/login");
  }

  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { id: true, name: true, email: true, isSuperAdmin: true },
  });

  if (!user?.isSuperAdmin) {
    redirect("/login");
  }

  return user;
}
```

- [ ] **Step 2: Add suspension check to `requireMembership()` in `src/lib/authz.ts`**

`requireMembership()` is the private function (line ~56) called by every `require*` guard. The `membership.organization` is already included in the query and will now have `suspendedAt`. Add the check after the null guard:

```typescript
async function requireMembership() {
  const membership = await getCurrentMembership();

  if (!membership) {
    throw new Error("No active membership found");
  }

  if (membership.organization.suspendedAt) {
    redirect("/suspended");
  }

  return membership as TeamMemberWithRelations;
}
```

Note: `redirect` from `next/navigation` must be imported at the top of the file.

- [ ] **Step 3: Create `src/app/suspended/page.tsx`**

```tsx
export default function SuspendedPage() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-slate-50 px-4">
      <div className="w-full max-w-md rounded-3xl border border-slate-200 bg-white p-8 shadow-sm text-center">
        <p className="text-sm font-semibold uppercase tracking-[0.22em] text-rose-600">Account Suspended</p>
        <h1 className="mt-3 text-2xl font-semibold tracking-tight text-slate-950">
          Your account has been suspended
        </h1>
        <p className="mt-4 text-sm leading-7 text-slate-600">
          Access to your WeHearYou account has been temporarily suspended. Please contact support to resolve this.
        </p>
        <a
          href="mailto:support@wehearyou.com"
          className="mt-6 inline-block rounded-2xl bg-slate-950 px-5 py-3 text-sm font-semibold text-white"
        >
          Contact support
        </a>
      </div>
    </div>
  );
}
```

- [ ] **Step 4: Verify TypeScript compiles**

```bash
npx tsc --noEmit 2>&1 | grep -v "node_modules" | grep "error TS" | head -10
```

Expected: no new errors in `authz.ts` or `suspended/page.tsx`.

- [ ] **Step 5: Commit**

```bash
git add src/lib/authz.ts src/app/suspended/page.tsx
git commit -m "feat: add requireSuperAdmin guard and suspension redirect"
```

---

## Task 3: Admin layout

**Files:**
- Create: `src/app/admin/layout.tsx`

- [ ] **Step 1: Create `src/app/admin/layout.tsx`**

```tsx
import Link from "next/link";
import { requireSuperAdmin } from "@/lib/authz";

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  await requireSuperAdmin();

  return (
    <div className="min-h-screen bg-slate-50">
      <header className="border-b border-slate-200 bg-white">
        <div className="mx-auto flex max-w-7xl items-center justify-between gap-6 px-6 py-4">
          <div className="flex items-center gap-4">
            <Link href="/admin" className="text-lg font-bold tracking-tight text-slate-950">
              WeHearYou
            </Link>
            <span className="rounded-full bg-rose-100 px-2.5 py-0.5 text-xs font-bold uppercase tracking-wide text-rose-700">
              Superadmin
            </span>
          </div>
          <nav className="flex items-center gap-1">
            <Link
              href="/admin"
              className="rounded-xl px-3 py-2 text-sm font-medium text-slate-600 hover:bg-slate-100 hover:text-slate-900"
            >
              Dashboard
            </Link>
            <Link
              href="/admin/orgs"
              className="rounded-xl px-3 py-2 text-sm font-medium text-slate-600 hover:bg-slate-100 hover:text-slate-900"
            >
              Organizations
            </Link>
            <Link
              href="/admin/users"
              className="rounded-xl px-3 py-2 text-sm font-medium text-slate-600 hover:bg-slate-100 hover:text-slate-900"
            >
              Users
            </Link>
          </nav>
          <a
            href="/api/auth/signout"
            className="rounded-xl border border-slate-200 px-3 py-2 text-sm font-medium text-slate-600 hover:border-slate-300 hover:text-slate-900"
          >
            Sign out
          </a>
        </div>
      </header>
      <main className="mx-auto max-w-7xl px-6 py-8">{children}</main>
    </div>
  );
}
```

- [ ] **Step 2: Verify TypeScript compiles**

```bash
npx tsc --noEmit 2>&1 | grep "admin/layout" | head -5
```

Expected: no output (no errors).

- [ ] **Step 3: Commit**

```bash
git add src/app/admin/layout.tsx
git commit -m "feat: add admin layout with superadmin guard"
```

---

## Task 4: Admin dashboard page

**Files:**
- Create: `src/app/admin/page.tsx`

- [ ] **Step 1: Create `src/app/admin/page.tsx`**

```tsx
export const dynamic = "force-dynamic";

import Link from "next/link";
import { prisma } from "@/lib/prisma";

export default async function AdminDashboardPage() {
  const [orgCount, userCount, locationCount, reviewCount] = await Promise.all([
    prisma.organization.count(),
    prisma.user.count(),
    prisma.location.count(),
    prisma.review.count(),
  ]);

  const recentOrgs = await prisma.organization.findMany({
    orderBy: { createdAt: "desc" },
    take: 5,
    select: { id: true, name: true, slug: true, suspendedAt: true, createdAt: true },
  });

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight text-slate-950">Platform overview</h1>
        <p className="mt-1 text-sm text-slate-500">Real-time stats across all organizations.</p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {[
          { label: "Organizations", value: orgCount },
          { label: "Users", value: userCount },
          { label: "Locations", value: locationCount },
          { label: "Reviews", value: reviewCount },
        ].map(({ label, value }) => (
          <div key={label} className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
            <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">{label}</p>
            <p className="mt-2 text-3xl font-semibold text-slate-950">{value.toLocaleString()}</p>
          </div>
        ))}
      </div>

      <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold text-slate-950">Recent organizations</h2>
          <Link href="/admin/orgs" className="text-sm font-semibold text-indigo-600 hover:text-indigo-700">
            View all →
          </Link>
        </div>
        <div className="mt-4 divide-y divide-slate-100">
          {recentOrgs.map((org) => (
            <div key={org.id} className="flex items-center justify-between py-3">
              <div>
                <Link href={`/admin/orgs/${org.id}`} className="font-medium text-slate-900 hover:text-indigo-600">
                  {org.name}
                </Link>
                <p className="text-xs text-slate-400">{org.slug}</p>
              </div>
              {org.suspendedAt ? (
                <span className="rounded-full bg-rose-100 px-2.5 py-0.5 text-xs font-semibold text-rose-700">
                  Suspended
                </span>
              ) : (
                <span className="rounded-full bg-emerald-50 px-2.5 py-0.5 text-xs font-semibold text-emerald-700">
                  Active
                </span>
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Verify TypeScript compiles**

```bash
npx tsc --noEmit 2>&1 | grep "admin/page" | head -5
```

Expected: no output.

- [ ] **Step 3: Commit**

```bash
git add src/app/admin/page.tsx
git commit -m "feat: add admin dashboard with platform stats"
```

---

## Task 5: Admin server actions

**Files:**
- Create: `src/app/admin/actions.ts`

- [ ] **Step 1: Create `src/app/admin/actions.ts`**

```typescript
"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { requireSuperAdmin } from "@/lib/authz";

export async function updateOrgAsAdmin(formData: FormData) {
  await requireSuperAdmin();

  const orgId = String(formData.get("orgId") ?? "").trim();
  const name = String(formData.get("name") ?? "").trim();
  const slug = String(formData.get("slug") ?? "").trim();
  const website = String(formData.get("website") ?? "").trim() || null;

  if (!orgId || !name || !slug) {
    throw new Error("Organization ID, name, and slug are required");
  }

  await prisma.organization.update({
    where: { id: orgId },
    data: { name, slug, website },
  });

  revalidatePath(`/admin/orgs/${orgId}`);
  redirect(`/admin/orgs/${orgId}?flash=Organization+updated`);
}

export async function suspendOrg(formData: FormData) {
  await requireSuperAdmin();

  const orgId = String(formData.get("orgId") ?? "").trim();
  if (!orgId) throw new Error("Organization ID is required");

  await prisma.organization.update({
    where: { id: orgId },
    data: { suspendedAt: new Date() },
  });

  revalidatePath(`/admin/orgs/${orgId}`);
  revalidatePath("/admin/orgs");
  redirect(`/admin/orgs/${orgId}?flash=Organization+suspended`);
}

export async function unsuspendOrg(formData: FormData) {
  await requireSuperAdmin();

  const orgId = String(formData.get("orgId") ?? "").trim();
  if (!orgId) throw new Error("Organization ID is required");

  await prisma.organization.update({
    where: { id: orgId },
    data: { suspendedAt: null },
  });

  revalidatePath(`/admin/orgs/${orgId}`);
  revalidatePath("/admin/orgs");
  redirect(`/admin/orgs/${orgId}?flash=Organization+reactivated`);
}

export async function deleteOrg(formData: FormData) {
  await requireSuperAdmin();

  const orgId = String(formData.get("orgId") ?? "").trim();
  if (!orgId) throw new Error("Organization ID is required");

  await prisma.organization.delete({ where: { id: orgId } });

  revalidatePath("/admin/orgs");
  redirect("/admin/orgs?flash=Organization+deleted");
}

export async function promoteToSuperAdmin(formData: FormData) {
  await requireSuperAdmin();

  const userId = String(formData.get("userId") ?? "").trim();
  if (!userId) throw new Error("User ID is required");

  await prisma.user.update({
    where: { id: userId },
    data: { isSuperAdmin: true },
  });

  revalidatePath(`/admin/users/${userId}`);
  redirect(`/admin/users/${userId}?flash=User+promoted+to+superadmin`);
}

export async function revokeSuperAdmin(formData: FormData) {
  await requireSuperAdmin();

  const userId = String(formData.get("userId") ?? "").trim();
  if (!userId) throw new Error("User ID is required");

  await prisma.user.update({
    where: { id: userId },
    data: { isSuperAdmin: false },
  });

  revalidatePath(`/admin/users/${userId}`);
  redirect(`/admin/users/${userId}?flash=Superadmin+access+revoked`);
}
```

- [ ] **Step 2: Verify TypeScript compiles**

```bash
npx tsc --noEmit 2>&1 | grep "admin/actions" | head -5
```

Expected: no output.

- [ ] **Step 3: Commit**

```bash
git add src/app/admin/actions.ts
git commit -m "feat: add superadmin server actions (CRUD orgs, suspend, promote)"
```

---

## Task 6: Admin orgs list page

**Files:**
- Create: `src/app/admin/orgs/page.tsx`

- [ ] **Step 1: Create `src/app/admin/orgs/page.tsx`**

```tsx
export const dynamic = "force-dynamic";

import Link from "next/link";
import { prisma } from "@/lib/prisma";

export default async function AdminOrgsPage({
  searchParams,
}: {
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
}) {
  const params = (await searchParams) ?? {};
  const flash = typeof params.flash === "string" ? params.flash : null;

  const orgs = await prisma.organization.findMany({
    orderBy: { createdAt: "desc" },
    select: {
      id: true,
      name: true,
      slug: true,
      suspendedAt: true,
      createdAt: true,
      _count: {
        select: { users: true, locations: true },
      },
    },
  });

  return (
    <div className="space-y-6">
      {flash && (
        <div className="rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm font-medium text-emerald-800">
          {flash}
        </div>
      )}

      <div className="flex items-end justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-slate-950">Organizations</h1>
          <p className="mt-1 text-sm text-slate-500">{orgs.length} total</p>
        </div>
      </div>

      <div className="rounded-3xl border border-slate-200 bg-white shadow-sm overflow-hidden">
        <table className="min-w-full text-left text-sm">
          <thead className="border-b border-slate-200 bg-slate-50">
            <tr>
              <th className="px-6 py-4 font-semibold text-slate-700">Name</th>
              <th className="px-6 py-4 font-semibold text-slate-700">Slug</th>
              <th className="px-6 py-4 font-semibold text-slate-700">Users</th>
              <th className="px-6 py-4 font-semibold text-slate-700">Locations</th>
              <th className="px-6 py-4 font-semibold text-slate-700">Status</th>
              <th className="px-6 py-4 font-semibold text-slate-700">Created</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {orgs.map((org) => (
              <tr key={org.id} className="hover:bg-slate-50">
                <td className="px-6 py-4">
                  <Link href={`/admin/orgs/${org.id}`} className="font-medium text-slate-900 hover:text-indigo-600">
                    {org.name}
                  </Link>
                </td>
                <td className="px-6 py-4 text-slate-500">{org.slug}</td>
                <td className="px-6 py-4 text-slate-700">{org._count.users}</td>
                <td className="px-6 py-4 text-slate-700">{org._count.locations}</td>
                <td className="px-6 py-4">
                  {org.suspendedAt ? (
                    <span className="rounded-full bg-rose-100 px-2.5 py-0.5 text-xs font-semibold text-rose-700">
                      Suspended
                    </span>
                  ) : (
                    <span className="rounded-full bg-emerald-50 px-2.5 py-0.5 text-xs font-semibold text-emerald-700">
                      Active
                    </span>
                  )}
                </td>
                <td className="px-6 py-4 text-slate-500 text-xs">
                  {org.createdAt.toLocaleDateString()}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Verify TypeScript compiles**

```bash
npx tsc --noEmit 2>&1 | grep "admin/orgs/page" | head -5
```

Expected: no output.

- [ ] **Step 3: Commit**

```bash
git add src/app/admin/orgs/page.tsx
git commit -m "feat: add admin org list page"
```

---

## Task 7: Admin org detail page

**Files:**
- Create: `src/app/admin/orgs/[id]/page.tsx`

- [ ] **Step 1: Create `src/app/admin/orgs/[id]/page.tsx`**

```tsx
export const dynamic = "force-dynamic";

import { notFound } from "next/navigation";
import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { updateOrgAsAdmin, suspendOrg, unsuspendOrg, deleteOrg } from "@/app/admin/actions";
import { FormSubmitButton } from "@/components/form-submit-button";

export default async function AdminOrgDetailPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
}) {
  const { id } = await params;
  const qp = (await searchParams) ?? {};
  const flash = typeof qp.flash === "string" ? qp.flash : null;

  const org = await prisma.organization.findUnique({
    where: { id },
    include: {
      users: {
        include: { user: true },
        orderBy: { createdAt: "asc" },
      },
      locations: {
        orderBy: { createdAt: "asc" },
        select: { id: true, name: true, city: true, state: true, googleLocationName: true },
      },
    },
  });

  if (!org) notFound();

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <Link href="/admin/orgs" className="text-sm font-semibold text-indigo-600">
          ← Organizations
        </Link>
      </div>

      {flash && (
        <div className="rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm font-medium text-emerald-800">
          {flash}
        </div>
      )}

      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-slate-950">{org.name}</h1>
          <p className="mt-1 text-sm text-slate-500">/{org.slug}</p>
        </div>
        {org.suspendedAt && (
          <span className="rounded-full bg-rose-100 px-3 py-1 text-xs font-bold uppercase tracking-wide text-rose-700">
            Suspended
          </span>
        )}
      </div>

      <div className="grid gap-6 xl:grid-cols-2">
        {/* Edit form */}
        <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
          <h2 className="text-lg font-semibold text-slate-950">Edit organization</h2>
          <form action={updateOrgAsAdmin} className="mt-4 space-y-4">
            <input type="hidden" name="orgId" value={org.id} />
            <label className="grid gap-1.5 text-sm font-semibold text-slate-700">
              Name
              <input
                name="name"
                defaultValue={org.name}
                className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm font-normal text-slate-700 focus:border-indigo-300 focus:outline-none"
              />
            </label>
            <label className="grid gap-1.5 text-sm font-semibold text-slate-700">
              Slug
              <input
                name="slug"
                defaultValue={org.slug}
                className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm font-normal text-slate-700 focus:border-indigo-300 focus:outline-none"
              />
            </label>
            <label className="grid gap-1.5 text-sm font-semibold text-slate-700">
              Website
              <input
                name="website"
                defaultValue={org.website ?? ""}
                className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm font-normal text-slate-700 focus:border-indigo-300 focus:outline-none"
              />
            </label>
            <FormSubmitButton
              idleLabel="Save changes"
              pendingLabel="Saving..."
              className="rounded-2xl bg-slate-950 px-4 py-2.5 text-sm font-semibold text-white"
            />
          </form>
        </section>

        {/* Members */}
        <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
          <h2 className="text-lg font-semibold text-slate-950">Members ({org.users.length})</h2>
          <div className="mt-4 divide-y divide-slate-100">
            {org.users.map((m) => (
              <div key={m.id} className="flex items-center justify-between py-3">
                <div>
                  <Link href={`/admin/users/${m.userId}`} className="font-medium text-slate-900 hover:text-indigo-600">
                    {m.user.name}
                  </Link>
                  <p className="text-xs text-slate-400">{m.user.email}</p>
                </div>
                <span className="text-xs font-semibold uppercase tracking-wide text-slate-500">{m.role}</span>
              </div>
            ))}
          </div>
        </section>

        {/* Locations */}
        <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
          <h2 className="text-lg font-semibold text-slate-950">Locations ({org.locations.length})</h2>
          <div className="mt-4 divide-y divide-slate-100">
            {org.locations.map((loc) => (
              <div key={loc.id} className="flex items-center justify-between py-3">
                <div>
                  <p className="font-medium text-slate-900">{loc.name}</p>
                  <p className="text-xs text-slate-400">{loc.city}, {loc.state}</p>
                </div>
                {loc.googleLocationName ? (
                  <span className="text-xs font-semibold text-emerald-600">Google connected</span>
                ) : (
                  <span className="text-xs text-slate-400">No Google</span>
                )}
              </div>
            ))}
          </div>
        </section>

        {/* Danger zone */}
        <section className="rounded-3xl border border-rose-200 bg-white p-6 shadow-sm">
          <h2 className="text-lg font-semibold text-slate-950">Danger zone</h2>
          <div className="mt-4 space-y-3">
            <form action={org.suspendedAt ? unsuspendOrg : suspendOrg}>
              <input type="hidden" name="orgId" value={org.id} />
              <FormSubmitButton
                idleLabel={org.suspendedAt ? "Reactivate organization" : "Suspend organization"}
                pendingLabel={org.suspendedAt ? "Reactivating..." : "Suspending..."}
                className={`rounded-2xl px-4 py-2.5 text-sm font-semibold ${
                  org.suspendedAt
                    ? "bg-emerald-600 text-white"
                    : "border border-rose-200 bg-rose-50 text-rose-700 hover:bg-rose-100"
                }`}
              />
            </form>
            <form
              action={deleteOrg}
              onSubmit={(e) => {
                if (!confirm(`Permanently delete "${org.name}" and all its data? This cannot be undone.`)) {
                  e.preventDefault();
                }
              }}
            >
              <input type="hidden" name="orgId" value={org.id} />
              <FormSubmitButton
                idleLabel="Delete organization"
                pendingLabel="Deleting..."
                className="rounded-2xl bg-rose-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-rose-700"
              />
            </form>
          </div>
        </section>
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Verify TypeScript compiles**

```bash
npx tsc --noEmit 2>&1 | grep "admin/orgs/\[id\]" | head -5
```

Expected: no output.

- [ ] **Step 3: Commit**

```bash
git add src/app/admin/orgs/
git commit -m "feat: add admin org detail page with edit, suspend, delete"
```

---

## Task 8: Admin users list and detail pages

**Files:**
- Create: `src/app/admin/users/page.tsx`
- Create: `src/app/admin/users/[id]/page.tsx`

- [ ] **Step 1: Create `src/app/admin/users/page.tsx`**

```tsx
export const dynamic = "force-dynamic";

import Link from "next/link";
import { prisma } from "@/lib/prisma";

export default async function AdminUsersPage() {
  const users = await prisma.user.findMany({
    orderBy: { createdAt: "desc" },
    select: {
      id: true,
      name: true,
      email: true,
      isSuperAdmin: true,
      createdAt: true,
      memberships: {
        select: {
          organization: { select: { name: true } },
        },
      },
    },
  });

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight text-slate-950">Users</h1>
        <p className="mt-1 text-sm text-slate-500">{users.length} total</p>
      </div>

      <div className="rounded-3xl border border-slate-200 bg-white shadow-sm overflow-hidden">
        <table className="min-w-full text-left text-sm">
          <thead className="border-b border-slate-200 bg-slate-50">
            <tr>
              <th className="px-6 py-4 font-semibold text-slate-700">Name</th>
              <th className="px-6 py-4 font-semibold text-slate-700">Email</th>
              <th className="px-6 py-4 font-semibold text-slate-700">Organizations</th>
              <th className="px-6 py-4 font-semibold text-slate-700">Role</th>
              <th className="px-6 py-4 font-semibold text-slate-700">Joined</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {users.map((user) => (
              <tr key={user.id} className="hover:bg-slate-50">
                <td className="px-6 py-4">
                  <Link href={`/admin/users/${user.id}`} className="font-medium text-slate-900 hover:text-indigo-600">
                    {user.name}
                  </Link>
                </td>
                <td className="px-6 py-4 text-slate-500">{user.email}</td>
                <td className="px-6 py-4 text-slate-500 text-xs">
                  {user.memberships.map((m) => m.organization.name).join(", ") || "—"}
                </td>
                <td className="px-6 py-4">
                  {user.isSuperAdmin ? (
                    <span className="rounded-full bg-rose-100 px-2.5 py-0.5 text-xs font-semibold text-rose-700">
                      Superadmin
                    </span>
                  ) : (
                    <span className="text-xs text-slate-400">Member</span>
                  )}
                </td>
                <td className="px-6 py-4 text-slate-400 text-xs">{user.createdAt.toLocaleDateString()}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Create `src/app/admin/users/[id]/page.tsx`**

```tsx
export const dynamic = "force-dynamic";

import { notFound } from "next/navigation";
import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { promoteToSuperAdmin, revokeSuperAdmin } from "@/app/admin/actions";
import { FormSubmitButton } from "@/components/form-submit-button";

export default async function AdminUserDetailPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
}) {
  const { id } = await params;
  const qp = (await searchParams) ?? {};
  const flash = typeof qp.flash === "string" ? qp.flash : null;

  const user = await prisma.user.findUnique({
    where: { id },
    include: {
      memberships: {
        include: {
          organization: { select: { id: true, name: true, suspendedAt: true } },
        },
        orderBy: { createdAt: "asc" },
      },
      sessions: {
        orderBy: { expires: "desc" },
        take: 1,
        select: { expires: true },
      },
    },
  });

  if (!user) notFound();

  const lastSession = user.sessions[0];

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <Link href="/admin/users" className="text-sm font-semibold text-indigo-600">
          ← Users
        </Link>
      </div>

      {flash && (
        <div className="rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm font-medium text-emerald-800">
          {flash}
        </div>
      )}

      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-slate-950">{user.name}</h1>
          <p className="mt-1 text-sm text-slate-500">{user.email}</p>
        </div>
        {user.isSuperAdmin && (
          <span className="rounded-full bg-rose-100 px-3 py-1 text-xs font-bold uppercase tracking-wide text-rose-700">
            Superadmin
          </span>
        )}
      </div>

      <div className="grid gap-6 xl:grid-cols-2">
        {/* User info */}
        <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
          <h2 className="text-lg font-semibold text-slate-950">Account details</h2>
          <dl className="mt-4 space-y-3 text-sm">
            <div className="flex justify-between">
              <dt className="font-medium text-slate-500">User ID</dt>
              <dd className="font-mono text-xs text-slate-700">{user.id}</dd>
            </div>
            <div className="flex justify-between">
              <dt className="font-medium text-slate-500">Email</dt>
              <dd className="text-slate-700">{user.email}</dd>
            </div>
            <div className="flex justify-between">
              <dt className="font-medium text-slate-500">Joined</dt>
              <dd className="text-slate-700">{user.createdAt.toLocaleDateString()}</dd>
            </div>
            <div className="flex justify-between">
              <dt className="font-medium text-slate-500">Last session</dt>
              <dd className="text-slate-700">
                {lastSession ? lastSession.expires.toLocaleDateString() : "Never"}
              </dd>
            </div>
          </dl>
        </section>

        {/* Memberships */}
        <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
          <h2 className="text-lg font-semibold text-slate-950">Organizations</h2>
          <div className="mt-4 divide-y divide-slate-100">
            {user.memberships.length === 0 ? (
              <p className="py-3 text-sm text-slate-400">No organization memberships.</p>
            ) : (
              user.memberships.map((m) => (
                <div key={m.id} className="flex items-center justify-between py-3">
                  <div>
                    <Link
                      href={`/admin/orgs/${m.organization.id}`}
                      className="font-medium text-slate-900 hover:text-indigo-600"
                    >
                      {m.organization.name}
                    </Link>
                    <p className="text-xs text-slate-400 uppercase tracking-wide">{m.role} · {m.status}</p>
                  </div>
                  {m.organization.suspendedAt && (
                    <span className="text-xs font-semibold text-rose-600">Suspended</span>
                  )}
                </div>
              ))
            )}
          </div>
        </section>

        {/* Superadmin control */}
        <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
          <h2 className="text-lg font-semibold text-slate-950">Superadmin access</h2>
          <p className="mt-2 text-sm text-slate-500">
            {user.isSuperAdmin
              ? "This user has full superadmin access to the platform."
              : "This user does not have superadmin access."}
          </p>
          <div className="mt-4">
            <form action={user.isSuperAdmin ? revokeSuperAdmin : promoteToSuperAdmin}>
              <input type="hidden" name="userId" value={user.id} />
              <FormSubmitButton
                idleLabel={user.isSuperAdmin ? "Revoke superadmin" : "Promote to superadmin"}
                pendingLabel={user.isSuperAdmin ? "Revoking..." : "Promoting..."}
                className={`rounded-2xl px-4 py-2.5 text-sm font-semibold ${
                  user.isSuperAdmin
                    ? "border border-rose-200 bg-rose-50 text-rose-700 hover:bg-rose-100"
                    : "bg-indigo-600 text-white hover:bg-indigo-700"
                }`}
              />
            </form>
          </div>
        </section>
      </div>
    </div>
  );
}
```

- [ ] **Step 3: Verify TypeScript compiles**

```bash
npx tsc --noEmit 2>&1 | grep "admin/users" | head -10
```

Expected: no output.

- [ ] **Step 4: Commit**

```bash
git add src/app/admin/users/
git commit -m "feat: add admin user list and detail pages with promote/revoke"
```

---

## Task 9: Bootstrap and smoke test

- [ ] **Step 1: Set your account as superadmin in the database**

```bash
npx prisma db execute --schema=prisma/schema.prisma --stdin <<'EOF'
UPDATE "User" SET "isSuperAdmin" = true WHERE email = 'safatash@gmail.com';
EOF
```

Expected output: blank (success). Verify:

```bash
npx prisma db execute --schema=prisma/schema.prisma --stdin <<'EOF'
SELECT email, "isSuperAdmin" FROM "User" WHERE email = 'safatash@gmail.com';
EOF
```

Expected: one row with `isSuperAdmin = t`.

- [ ] **Step 2: Start the dev server and test**

```bash
npm run dev
```

1. Log in as `safatash@gmail.com`
2. Navigate to `http://localhost:3000/admin` — should see the platform stats dashboard
3. Navigate to `http://localhost:3000/admin/orgs` — should see org list
4. Click an org → edit name, click Save → should redirect with flash
5. Click "Suspend organization" → org status badge changes to Suspended
6. Navigate to `http://localhost:3000/admin/users` — should see user list
7. Click a non-superadmin user → click "Promote to superadmin" → badge appears

- [ ] **Step 3: Test suspension enforcement**

```bash
npx prisma db execute --schema=prisma/schema.prisma --stdin <<'EOF'
UPDATE "Organization" SET "suspendedAt" = NOW() WHERE slug = 'your-test-org-slug';
EOF
```

Log in as a member of that org → should be redirected to `/suspended`.

Unsuspend via the admin dashboard → should be able to log in normally again.

- [ ] **Step 4: Test non-superadmin cannot access /admin**

Log out, log in as a different user, navigate to `http://localhost:3000/admin` → should redirect to `/login`.

---

## Self-Review

**Spec coverage:**
- ✅ `isSuperAdmin` flag on User → Task 1
- ✅ `suspendedAt` on Organization → Task 1
- ✅ `requireSuperAdmin()` guard → Task 2
- ✅ Suspension redirect to `/suspended` → Task 2
- ✅ `/suspended` public page → Task 2
- ✅ Admin layout with nav → Task 3
- ✅ Platform stats dashboard → Task 4
- ✅ Org CRUD actions (update, suspend, unsuspend, delete) → Task 5
- ✅ Org list → Task 6
- ✅ Org detail (edit, suspend, delete, members, locations) → Task 7
- ✅ User list → Task 8
- ✅ User detail (memberships, promote/revoke) → Task 8
- ✅ Bootstrap SQL + smoke test → Task 9
- ✅ Only superadmin can promote → `promoteToSuperAdmin` calls `requireSuperAdmin()` first

**Placeholder scan:** None found — all code blocks are complete.

**Type consistency:** `requireSuperAdmin()` returns `{ id, name, email, isSuperAdmin }` and is called at the top of every action/layout. All action `formData` field names (`orgId`, `userId`) match the hidden inputs in the page forms.
