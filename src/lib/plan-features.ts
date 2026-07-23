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
