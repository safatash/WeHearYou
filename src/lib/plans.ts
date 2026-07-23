/**
 * Single source of truth for subscription plans: pricing, Stripe price IDs, and
 * feature limits. Change plans here only — never hardcode plan names, prices, or
 * feature flags anywhere else in the app.
 *
 * `UNLIMITED` is represented as `Infinity` in limits; helpers in
 * `plan-features.ts` treat it accordingly.
 */

export const UNLIMITED = Infinity;

export type PlanFeatures = {
  automation: boolean;
  videoTestimonials: boolean;
  aiReplyAssistant: boolean;
  resolutionCases: boolean;
  facebookIntegration: boolean;
  webhookIntegration: boolean;
  whiteLabelBranding: boolean;
};

export type PlanLimits = {
  locations: number;
  teamMembers: number;
  reviewRequestsPerMonth: number;
  contacts: number;
  widgets: number;
  videoTestimonials: number;
  activeAutomations: number;
  analyticsWindowDays: number;
};

export type Plan = {
  id: PlanId;
  name: string;
  tagline: string;
  monthlyPriceUsd: number;
  stripePriceId: string;
  limits: PlanLimits;
  features: PlanFeatures;
};

export const PLANS = {
  starter: {
    id: "starter",
    name: "Starter",
    tagline: "Solo operators and single-location businesses.",
    monthlyPriceUsd: 19,
    stripePriceId: process.env.STRIPE_PRICE_STARTER ?? "",
    limits: {
      locations: 1,
      teamMembers: 1,
      reviewRequestsPerMonth: 100,
      contacts: 500,
      widgets: 3,
      videoTestimonials: 0,
      activeAutomations: 0,
      analyticsWindowDays: 30,
    },
    features: {
      automation: false,
      videoTestimonials: false,
      aiReplyAssistant: false,
      resolutionCases: false,
      facebookIntegration: false,
      webhookIntegration: false,
      whiteLabelBranding: false,
    },
  },
  growth: {
    id: "growth",
    name: "Growth",
    tagline: "Growing, multi-location businesses with small teams.",
    monthlyPriceUsd: 49,
    stripePriceId: process.env.STRIPE_PRICE_GROWTH ?? "",
    limits: {
      locations: 3,
      teamMembers: 5,
      reviewRequestsPerMonth: 500,
      contacts: 5000,
      widgets: 10,
      videoTestimonials: 50,
      activeAutomations: 1,
      analyticsWindowDays: 90,
    },
    features: {
      automation: true,
      videoTestimonials: true,
      aiReplyAssistant: true,
      resolutionCases: true,
      facebookIntegration: true,
      webhookIntegration: false,
      whiteLabelBranding: false,
    },
  },
  pro: {
    id: "pro",
    name: "Pro",
    tagline: "Agencies, franchises, and power users.",
    monthlyPriceUsd: 199,
    stripePriceId: process.env.STRIPE_PRICE_PRO ?? "",
    limits: {
      locations: UNLIMITED,
      teamMembers: UNLIMITED,
      reviewRequestsPerMonth: UNLIMITED,
      contacts: UNLIMITED,
      widgets: UNLIMITED,
      videoTestimonials: UNLIMITED,
      activeAutomations: UNLIMITED,
      analyticsWindowDays: 365,
    },
    features: {
      automation: true,
      videoTestimonials: true,
      aiReplyAssistant: true,
      resolutionCases: true,
      facebookIntegration: true,
      webhookIntegration: true,
      whiteLabelBranding: true,
    },
  },
} as const satisfies Record<string, Plan>;

export type PlanId = "starter" | "growth" | "pro";

export const PLAN_IDS: PlanId[] = ["starter", "growth", "pro"];

export const DEFAULT_PLAN_ID: PlanId = "starter";

/** Ordered lowest → highest, for "requires at least X" comparisons. */
export const PLAN_RANK: Record<PlanId, number> = { starter: 0, growth: 1, pro: 2 };

export function isPlanId(value: string | null | undefined): value is PlanId {
  return value === "starter" || value === "growth" || value === "pro";
}

/** Look up the plan whose Stripe price ID matches (used by webhooks). */
export function planIdForPriceId(priceId: string | null | undefined): PlanId | null {
  if (!priceId) return null;
  for (const id of PLAN_IDS) {
    if (PLANS[id].stripePriceId && PLANS[id].stripePriceId === priceId) return id;
  }
  return null;
}
