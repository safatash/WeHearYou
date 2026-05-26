# Superadmin Role & Dashboard Design

## Goal

Add a platform-owner superadmin role that lets the WeHearYou operator view all organizations and users, and perform suspend/edit/delete actions on any org — completely separate from the org-scoped membership system.

## Architecture

A single `isSuperAdmin` flag on the `User` model identifies superadmins. A `requireSuperAdmin()` guard protects every admin page and action. The admin UI lives at `/admin/*` with its own minimal layout — no org AppShell, no org-scoped nav. Org suspension is tracked via a `suspendedAt` timestamp on `Organization`; suspended orgs redirect their members on login.

## Tech Stack

Next.js 14 App Router, Prisma + PostgreSQL. No new packages required.

---

## Data Model

### Schema changes

```prisma
model User {
  // ... existing fields
  isSuperAdmin  Boolean   @default(false)
}

model Organization {
  // ... existing fields
  suspendedAt   DateTime?
}
```

### Migration

```sql
ALTER TABLE "User" ADD COLUMN "isSuperAdmin" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "Organization" ADD COLUMN "suspendedAt" TIMESTAMP(3);
```

### Bootstrapping

Set the first superadmin directly in the DB:
```sql
UPDATE "User" SET "isSuperAdmin" = true WHERE email = 'safatash@gmail.com';
```

Only a superadmin can promote another user to superadmin — via the `/admin/users/[id]` page.

---

## Auth Guard

New function in `src/lib/authz.ts`:

```typescript
export async function requireSuperAdmin() {
  const session = await auth();
  const userId = session?.user?.id;
  if (!userId) redirect("/login");

  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { isSuperAdmin: true },
  });

  if (!user?.isSuperAdmin) redirect("/login");
  return user;
}
```

Every admin page and server action calls `requireSuperAdmin()` as its first statement.

---

## Suspended Org Enforcement

In `getCurrentMembership()` (existing function in `src/lib/authz.ts`), after fetching the membership, check `membership.organization.suspendedAt`. If set, redirect to `/suspended` — a public page explaining the account is suspended and to contact support.

The `Organization` query in `getCurrentMembership` already includes the org; add `suspendedAt` to the select.

---

## Route Structure

```
src/app/admin/
  layout.tsx                  — minimal layout: logo + "Superadmin" label + sign-out link
  page.tsx                    — /admin: platform stats dashboard
  orgs/
    page.tsx                  — /admin/orgs: searchable org list
    [id]/
      page.tsx                — /admin/orgs/[id]: org detail + actions
  users/
    page.tsx                  — /admin/users: searchable user list
    [id]/
      page.tsx                — /admin/users/[id]: user detail + promote/suspend
  actions.ts                  — all superadmin server actions
```

---

## Pages

### `/admin` — Platform Dashboard

Stats shown as cards:
- Total organizations
- Total users
- Total locations
- Total reviews

Quick links to `/admin/orgs` and `/admin/users`.

### `/admin/orgs` — Organization List

Table with columns: Name, Slug, Locations, Users, Created, Status (Active / Suspended).

Each row links to `/admin/orgs/[id]`. Search by name or slug (client-side filter on the loaded list — no pagination needed yet).

### `/admin/orgs/[id]` — Org Detail

Shows:
- Editable fields: name, slug, website (form → `updateOrgAsAdmin` server action)
- Members table: name, email, role, status
- Locations table: name, city, state, Google-connected (yes/no)
- Danger zone: Suspend / Unsuspend button, Delete button

**Suspend** sets `suspendedAt = now()`. **Unsuspend** sets `suspendedAt = null`. **Delete** hard-deletes the org (Prisma cascades handle related records).

### `/admin/users` — User List

Table: Name, Email, Orgs (count + names), Superadmin (yes/no), Created.

Search by name or email. Each row links to `/admin/users/[id]`.

### `/admin/users/[id]` — User Detail

Shows:
- User info: name, email, created, last session
- Memberships: org name, role, status
- Actions: Promote to superadmin / Revoke superadmin (toggle `isSuperAdmin`)

---

## Server Actions (`src/app/admin/actions.ts`)

| Action | Description |
|---|---|
| `updateOrgAsAdmin(formData)` | Edit org name, slug, website |
| `suspendOrg(formData)` | Set `suspendedAt = now()` |
| `unsuspendOrg(formData)` | Set `suspendedAt = null` |
| `deleteOrg(formData)` | Hard delete org |
| `promoteToSuperAdmin(formData)` | Set `user.isSuperAdmin = true` |
| `revokeSuperAdmin(formData)` | Set `user.isSuperAdmin = false` |

All actions call `requireSuperAdmin()` as first statement.

---

## Suspended Page

`src/app/suspended/page.tsx` — public page (no auth required), shown when a user's org is suspended. Simple message: "Your account has been suspended. Contact support at [email]."

---

## File Map

| File | Change |
|---|---|
| `prisma/schema.prisma` | Add `isSuperAdmin Boolean @default(false)` to User; add `suspendedAt DateTime?` to Organization |
| `prisma/migrations/20260526_add_superadmin/migration.sql` | ALTER TABLE for both columns |
| `src/lib/authz.ts` | Add `requireSuperAdmin()`; add suspension check to `getCurrentMembership()` |
| `src/app/suspended/page.tsx` | **New** — public suspended account page |
| `src/app/admin/layout.tsx` | **New** — minimal admin layout |
| `src/app/admin/page.tsx` | **New** — platform stats dashboard |
| `src/app/admin/orgs/page.tsx` | **New** — org list |
| `src/app/admin/orgs/[id]/page.tsx` | **New** — org detail + actions |
| `src/app/admin/users/page.tsx` | **New** — user list |
| `src/app/admin/users/[id]/page.tsx` | **New** — user detail + promote/revoke |
| `src/app/admin/actions.ts` | **New** — all superadmin server actions |

---

## What Is NOT Changing

- `MembershipRole` enum — untouched
- Billing / plan fields — not part of this spec
- The regular `AppShell` and org-scoped nav — untouched
- Existing `requireTeamManagement`, `requireBillingManagement` guards — untouched
