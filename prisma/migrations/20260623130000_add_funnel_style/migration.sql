-- prisma/migrations/20260623130000_add_funnel_style/migration.sql
ALTER TABLE "LocationPublicProfile" ADD COLUMN "funnelStyle" TEXT NOT NULL DEFAULT 'SIMPLE';
