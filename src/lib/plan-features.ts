/**
 * Plan feature-gating helpers.
 *
 * `canUseFeature` / `getLimit` are pure lookups against the PLANS config.
 *
 * Enforcement is GATED behind the BILLING_ENFORCEMENT env flag. While it is off
 * (the default), the enforcement-aware helpers below always allow everything, so
 * introducing gates is a no-op for existing users. Flip BILLING_ENFORCEMENT=true
 * only once billing is live AND existing orgs have been assigned real plans.
 */

import { PLANS, DEFAULT_PLAN_ID, PLAN_RANK, UNLIMITED, isPlanId, type PlanId } from "@/lib/plans";

export type FeatureKey = keyof (typeof PLANS)["starter"]["features"];
export type LimitKey = keyof (typeof PLANS)["starter"]["limits"];

/** Whether billing gates/suspension are actively enforced. Off by default. */
export function billingEnforced(): boolean {
  return process.env.BILLING_ENFORCEMENT === "true";
}

/* ─── organization access state ───────────────────────────────────────────── */

/**
 * Whether an organization may use the product.
 *
 *  - `ACTIVE`        — full access
 *  - `SUSPENDED`     — a suspension has been recorded on the row
 *  - `TRIAL_EXPIRED` — the 14-day trial has run out with no paying subscription
 *
 * `SUSPENDED` and `TRIAL_EXPIRED` are kept distinct because they need different
 * handling: an expired trial is *persisted* as a suspension on first detection
 * so concurrent requests agree, whereas an already-recorded suspension needs no
 * write.
 */
export type OrganizationAccessState = "ACTIVE" | "SUSPENDED" | "TRIAL_EXPIRED";

/** The organization fields the classifier reads. Structural, so it accepts a
 *  Prisma row, a session-cached copy, or a test fixture. */
export type OrganizationAccessInput = {
  suspendedAt?: Date | null;
  trialEndsAt?: Date | null;
  stripeSubscriptionStatus?: string | null;
};

/** Stripe statuses that count as paying. Anything else (past_due, canceled,
 *  incomplete, unpaid, paused, or absent) does not restore access. */
const PAYING_SUBSCRIPTION_STATUSES = new Set(["active", "trialing"]);

export function hasPayingSubscription(status?: string | null): boolean {
  return PAYING_SUBSCRIPTION_STATUSES.has(String(status ?? "").trim().toLowerCase());
}

/**
 * Classify an organization's access state. Pure: no Prisma, no clock reads
 * beyond the injectable `now`, no env lookups — so it is fully testable and the
 * same answer can be computed on any surface.
 *
 * Order of precedence:
 *   1. A recorded suspension always blocks, even with a live subscription. An
 *      admin suspending an account must not be undone by billing state.
 *   2. A paying subscription grants access regardless of the trial date.
 *   3. No trial date means a legacy organization from before trials existed —
 *      those keep access rather than being locked out by a missing field.
 *   4. Otherwise the trial governs, and expires *at* `trialEndsAt`.
 */
export function classifyOrganizationAccess(
  org: OrganizationAccessInput,
  now: Date = new Date(),
): OrganizationAccessState {
  if (org.suspendedAt) return "SUSPENDED";
  if (hasPayingSubscription(org.stripeSubscriptionStatus)) return "ACTIVE";
  if (!org.trialEndsAt) return "ACTIVE";
  return org.trialEndsAt.getTime() <= now.getTime() ? "TRIAL_EXPIRED" : "ACTIVE";
}

/** Convenience predicate for callers that only need a yes/no. */
export function organizationHasAccess(org: OrganizationAccessInput, now: Date = new Date()): boolean {
  return classifyOrganizationAccess(org, now) === "ACTIVE";
}

function resolvePlanId(planId: string | null | undefined): PlanId {
  return isPlanId(planId) ? planId : DEFAULT_PLAN_ID;
}

/** Pure: does this plan include the feature? */
export function canUseFeature(planId: string | null | undefined, feature: FeatureKey): boolean {
  return PLANS[resolvePlanId(planId)].features[feature] ?? false;
}

/** Pure: numeric limit for this plan (Infinity for unlimited). */
export function getLimit(planId: string | null | undefined, limit: LimitKey): number {
  return PLANS[resolvePlanId(planId)].limits[limit] ?? 0;
}

export function isUnlimited(value: number): boolean {
  return value === UNLIMITED || !Number.isFinite(value);
}

/**
 * Enforcement-aware: is the feature available to this org right now?
 * Always true while BILLING_ENFORCEMENT is off.
 */
export function featureEnabledForOrg(planId: string | null | undefined, feature: FeatureKey): boolean {
  if (!billingEnforced()) return true;
  return canUseFeature(planId, feature);
}

/**
 * Enforcement-aware: has the org hit its limit for a countable resource?
 * Always false (never blocked) while BILLING_ENFORCEMENT is off.
 */
export function limitReached(planId: string | null | undefined, limit: LimitKey, currentCount: number): boolean {
  if (!billingEnforced()) return false;
  const max = getLimit(planId, limit);
  if (isUnlimited(max)) return false;
  return currentCount >= max;
}

/** The lowest plan that includes `feature` (for "Upgrade to X" prompts). */
export function lowestPlanWithFeature(feature: FeatureKey): PlanId {
  const ids = (Object.keys(PLANS) as PlanId[]).sort((a, b) => PLAN_RANK[a] - PLAN_RANK[b]);
  return ids.find((id) => PLANS[id].features[feature]) ?? "pro";
}
