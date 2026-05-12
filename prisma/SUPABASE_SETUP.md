# WeHearYou Supabase setup

This project already has a Prisma schema and is a better home for the Google reviews SaaS work than `agency-dashboard`.

## Important current state

- Current Prisma datasource: SQLite
- Existing domain model already includes:
  - `Organization`
  - `Location`
  - `GoogleAccountConnection`
  - `Review`
  - `ReviewWidget`
- That means WeHearYou should evolve its existing schema, not import a separate parallel reviews schema from another project.

## Recommended next step

Switch **this** project from SQLite to PostgreSQL/Supabase first.

## 1. Create Supabase project

In Supabase:
- New project
- Name: `wehearyou`
- Choose region
- Set DB password

## 2. Get the direct Postgres URI

Supabase dashboard:
- Project Settings
- Database
- Connection string
- Choose `URI`

Use the direct URI, not pooled, when possible for Prisma migrations.

Example:

```env
DATABASE_URL="postgresql://postgres:YOUR_PASSWORD@db.xxxxx.supabase.co:5432/postgres?schema=public"
```

## 3. Update local env

Edit `.env` in this project and replace the SQLite value with the Supabase Postgres URL.

## 4. Switch Prisma datasource

Update `prisma/schema.prisma`:

```prisma
datasource db {
  provider = "postgresql"
  url      = env("DATABASE_URL")
}
```

## 5. Create migration

From project root:

```bash
npm run prisma:migrate -- --name init_supabase
npm run prisma:generate
```

## 6. Verify tables in Supabase

Use:
- Supabase Table Editor
- or `npm run prisma:studio`

## Recommended modeling direction after DB switch

Do **not** add a second separate `google_reviews` schema family here.

Instead, keep using and extending:
- `GoogleAccountConnection`
- `Location`
- `Review`
- `ReviewWidget`

That is the cleaner path for WeHearYou.

## After the DB switch

Then implement:
1. Google OAuth connect flow
2. list available GBP locations for connected account
3. allow user to bind a GBP location to a `Location`
4. sync Google reviews into `Review`
5. feed widgets from `ReviewWidget` + `Review`
