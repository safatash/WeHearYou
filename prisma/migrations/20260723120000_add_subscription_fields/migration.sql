-- Subscription / billing fields on Organization.
-- Additive and non-breaking: all new columns are nullable except planId, which
-- has a default, so existing rows are unaffected. IF NOT EXISTS guards keep this
-- idempotent on Neon in case the columns were applied out of band.

ALTER TABLE "Organization" ADD COLUMN IF NOT EXISTS "planId" TEXT NOT NULL DEFAULT 'starter';
ALTER TABLE "Organization" ADD COLUMN IF NOT EXISTS "trialEndsAt" TIMESTAMP(3);
ALTER TABLE "Organization" ADD COLUMN IF NOT EXISTS "stripeCustomerId" TEXT;
ALTER TABLE "Organization" ADD COLUMN IF NOT EXISTS "stripeSubscriptionId" TEXT;
ALTER TABLE "Organization" ADD COLUMN IF NOT EXISTS "stripeSubscriptionStatus" TEXT;
ALTER TABLE "Organization" ADD COLUMN IF NOT EXISTS "currentPeriodEnd" TIMESTAMP(3);

CREATE UNIQUE INDEX IF NOT EXISTS "Organization_stripeCustomerId_key" ON "Organization"("stripeCustomerId");
CREATE UNIQUE INDEX IF NOT EXISTS "Organization_stripeSubscriptionId_key" ON "Organization"("stripeSubscriptionId");
