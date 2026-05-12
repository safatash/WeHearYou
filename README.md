# WeHearYou

WeHearYou is a Next.js + Prisma app for managing review requests, reputation funnels, location mini-sites, automations, and Google Business Profile syncs.

## What works right now

- Dashboard and analytics views backed by real Prisma data
- Contacts, campaigns, reviews, locations, team, settings, automation, and funnel pages
- Public location mini-sites at `/b/[slug]`
- Token-based review funnel routes at `/r/[token]`
- Google Business Profile mapping and sync UI
- Graceful handling when Google OAuth env vars are missing

## Tech stack

- Next.js 16
- React 19
- Prisma 6
- PostgreSQL/Supabase for the application database
- Tailwind CSS 4

## Local setup

### 1. Install dependencies

```bash
npm install
```

### 2. Create your environment file

```bash
cp .env.example .env
```

### 3. Prepare the database

For a fast local setup against PostgreSQL/Supabase, use Prisma push + seed:

```bash
npm run prisma:generate
npm run prisma:push
npm run prisma:seed
```

If you prefer migrations during local development:

```bash
npm run prisma:generate
npm run prisma:migrate
npm run prisma:seed
```

### 4. Start the app

```bash
npm run dev
```

Open:

- App: <http://localhost:3000>
- Example public mini-site: <http://localhost:3000/b/brooklyn>

## Environment variables

### Required

- `DATABASE_URL`

PostgreSQL/Supabase example:

```env
DATABASE_URL="postgresql://postgres:YOUR_PASSWORD@db.YOUR_PROJECT_REF.supabase.co:5432/postgres?schema=public"
```

The current Prisma datasource is PostgreSQL, so a SQLite URL such as `file:./prisma/dev.db` will fail Prisma validation. Use a local PostgreSQL database for local development or a Supabase direct PostgreSQL URI for hosted development and production.

### Optional, required for Google OAuth/sync

If these are missing, the app still runs, but Google connect will redirect back into the app with a helpful config error.

- `GOOGLE_CLIENT_ID`
- `GOOGLE_CLIENT_SECRET`
- `GOOGLE_OAUTH_REDIRECT_URI`
- `GOOGLE_PLACES_API_KEY`
- `NEXT_PUBLIC_APP_URL`

Local example:

```env
GOOGLE_CLIENT_ID=""
GOOGLE_CLIENT_SECRET=""
GOOGLE_OAUTH_REDIRECT_URI="http://localhost:3000/api/integrations/google/callback"
GOOGLE_PLACES_API_KEY=""
NEXT_PUBLIC_APP_URL="http://localhost:3000"
```

## Seeded demo data

The seed creates a working starter org with:

- Nova Dental organization
- multiple locations
- contacts
- campaigns and recipients
- reviews
- automation steps
- location public profile data

That means these routes should be useful immediately after seeding:

- `/`
- `/settings`
- `/automation`
- `/funnel-builder`
- `/funnel-preview`
- `/integrations`
- `/locations`
- `/b/brooklyn`

## Common commands

```bash
npm run dev
npm run lint
npm run build
npm run prisma:generate
npm run prisma:push
npm run prisma:migrate
npm run prisma:seed
npm run prisma:studio
```

## Smoke-test checklist

After setup, verify:

- dashboard loads
- settings loads and saves org fields
- automation page shows seeded workflow
- funnel builder and preview show location-backed content
- integrations page loads cleanly
- locations and a location detail page load
- public mini-site loads at `/b/brooklyn`
- token funnel routes load for seeded tokens

## Notes on Google OAuth and Places

Google connect depends on valid OAuth credentials and a matching redirect URI configured in Google Cloud.

Google Places search depends on a valid Places API key with the Places API enabled.

For local development, use:

```env
GOOGLE_OAUTH_REDIRECT_URI="http://localhost:3000/api/integrations/google/callback"
```

and make sure the same URI is registered in your Google OAuth app.
