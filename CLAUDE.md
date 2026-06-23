# Workspace Memory

## Project
**WeHearYou** - A review campaign funnel builder with public/private feedback routing.

## ⚠️ Database: production ≠ local
- **Production runs on Neon**; local `.env` `DATABASE_URL`/`DIRECT_URL` point at **Supabase**. They are SEPARATE databases and have drifted apart.
- **Consequence:** a `prisma db push` or hand-applied SQL/DB change locally only touches Supabase — it does NOT reach production. Verify schema changes against Neon explicitly.
- **Always ship schema changes as committed migrations** (never edit `schema.prisma` fields without a matching `prisma/migrations/*` file). `prisma migrate status` only checks migration *history*, not actual columns, so silent column drift won't surface until a query 500s (this is exactly what broke `/widgets`: 10 `ReviewWidget` columns added to the schema without a migration).
- **Vercel build** runs `prisma migrate deploy`; a failed migration marks the DB failed (**P3009**) and blocks all future deploys until resolved.
- **Neon migrate gotcha:** Prisma's advisory lock times out on Neon's pooler. For manual prod migrations use the **direct (non-pooler)** Neon URL, or apply idempotent `ADD COLUMN IF NOT EXISTS` SQL via a raw client and record the row in `_prisma_migrations` with the file's sha256 checksum.
- **Audit prod drift** read-only: `prisma migrate diff --from-url "$NEON_URL" --to-schema-datamodel prisma/schema.prisma --script` (a leftover `playing_with_neon` demo table is expected and harmless).

## Current Work
- ✅ Fixed campaign-wizard filter settings integration with public funnel
- ✅ Implemented conditional display: Filter OFF = all ratings → thanks page + Google review button
- ✅ Filter ON = ratings 1-3 → feedback form, ratings 4-5 → thanks + Google button
- ✅ Updated thanks page logic to respect filter settings properly

## Architecture Overview
- **Public funnel**: `/f/[slug]` - General public review landing page
- **Token-based funnel**: `/r/[token]` - SMS/campaign-specific review requests
- **Campaign wizard**: `/campaign-wizard` - Admin interface to configure funnel settings
- **Filter logic**: `negativeFilterEnabled` & `negativeFilterThreshold` control routing behavior

## Key Components
- `FunnelRatingForm` - Client component handling star rating interaction
- `submitPublicFunnelRating` - Server action processing form submissions
- `PublicFunnelPage` - Server component fetching location & profile settings
- `PublicFunnelThanksPage` - Thanks/confirmation page with Google review button

## Recent Fixes
1. **Filter settings not applying**: Added `filterEnabled` and `filterThreshold` props to FunnelRatingForm
2. **Thanks page logic error**: Fixed hardcoded `rating < 4` condition to only check `mode === "private"`
3. **Direct submission flow**: When filter OFF, all ratings bypass feedback form

## Testing Notes
- Verify SMS links work correctly (fixed route from `/f/{id}` to `/r/{token}`)
- Test both filter ON and OFF scenarios
- Confirm thanks page shows Google review button in all expected cases
