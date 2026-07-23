export const dynamic = "force-dynamic";

import { AppShell } from "@/components/app-shell";
import { Icon } from "@/components/icon";
import { requireActiveMembershipPage } from "@/lib/page-guards";
import { canManageBilling, type TeamMemberWithRelations } from "@/lib/team";
import { PLANS, PLAN_IDS, DEFAULT_PLAN_ID, isPlanId, type Plan, type PlanId } from "@/lib/plans";
import { isUnlimited } from "@/lib/plan-features";
import { SubscribeButton, ManageBillingButton } from "./billing-actions";

const fmt = (n: number) => (isUnlimited(n) ? "Unlimited" : n.toLocaleString());
const day = 24 * 60 * 60 * 1000;

function planRows(plan: Plan): Array<{ label: string; value: string }> {
  return [
    { label: "Locations", value: fmt(plan.limits.locations) },
    { label: "Team members", value: fmt(plan.limits.teamMembers) },
    { label: "Review requests / mo", value: fmt(plan.limits.reviewRequestsPerMonth) },
    { label: "Contacts", value: fmt(plan.limits.contacts) },
    { label: "Review widgets", value: fmt(plan.limits.widgets) },
  ];
}

const FEATURE_LABELS: Array<[keyof Plan["features"], string]> = [
  ["automation", "Automation"],
  ["videoTestimonials", "Video testimonials"],
  ["aiReplyAssistant", "AI reply assistant"],
  ["resolutionCases", "Resolution cases"],
  ["facebookIntegration", "Facebook integration"],
  ["webhookIntegration", "Webhooks"],
  ["whiteLabelBranding", "White-label branding"],
];

export default async function BillingPage({
  searchParams,
}: {
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
}) {
  const params = (await searchParams) ?? {};
  const membership = (await requireActiveMembershipPage()) as TeamMemberWithRelations;
  const org = membership.organization;
  const canManage = canManageBilling(membership);
  const justSubscribed = params.success === "1";

  const currentPlanId: PlanId = isPlanId(org.planId) ? org.planId : DEFAULT_PLAN_ID;
  const status = org.stripeSubscriptionStatus;
  const subscribed = Boolean(org.stripeSubscriptionId) && (status === "active" || status === "trialing");
  // A subscription that was started and then cancelled/lapsed: has a Stripe
  // customer but no active subscription now.
  const subscriptionEnded = !subscribed && (status === "canceled" || (Boolean(org.stripeCustomerId) && !org.stripeSubscriptionId));
  const now = new Date().getTime();
  const onTrial = !subscribed && !subscriptionEnded && org.trialEndsAt != null && org.trialEndsAt.getTime() > now;
  const trialEnded = !subscribed && !subscriptionEnded && org.trialEndsAt != null && org.trialEndsAt.getTime() <= now;
  const daysLeft = org.trialEndsAt ? Math.max(0, Math.ceil((org.trialEndsAt.getTime() - now) / day)) : 0;

  return (
    <AppShell activeScreen="billing">
      <div style={{ maxWidth: 1240, margin: "0 auto", padding: "var(--gutter)" }}>
        {/* Header */}
        <div style={{ marginBottom: "var(--gutter)" }}>
          <div className="eyebrow" style={{ marginBottom: 6 }}>Billing</div>
          <h1 style={{ fontSize: 26, fontWeight: 680, letterSpacing: "-.025em" }}>Plans &amp; billing</h1>
          <p style={{ fontSize: 13.5, color: "var(--ink-500)", marginTop: 5 }}>
            Manage your subscription and see what each plan includes.
          </p>
        </div>

        {justSubscribed ? (
          <div className="card" style={{ padding: "14px 18px", marginBottom: "var(--gutter)", borderColor: "var(--accent-border)", background: "var(--accent-soft)" }}>
            <p style={{ fontWeight: 600, color: "var(--accent-strong)", fontSize: 13.5 }}>
              <Icon name="check" size={15} style={{ marginRight: 8, verticalAlign: "middle" }} />
              Subscription active — thank you! It may take a moment to reflect below.
            </p>
          </div>
        ) : null}

        {/* Status card */}
        <div className="card" style={{ padding: "var(--card-pad)", marginBottom: "var(--gutter)", display: "flex", alignItems: "center", justifyContent: "space-between", gap: 16, flexWrap: "wrap" }}>
          <div>
            {subscribed ? (
              <>
                <div style={{ fontSize: 15, fontWeight: 640 }}>You&apos;re on the {PLANS[currentPlanId].name} plan.</div>
                <div style={{ fontSize: 13, color: "var(--ink-500)", marginTop: 4 }}>
                  {status === "trialing" ? "Trialing" : "Active"}
                  {org.currentPeriodEnd ? ` · Renews ${org.currentPeriodEnd.toLocaleDateString()}` : ""}
                </div>
              </>
            ) : subscriptionEnded ? (
              <>
                <div style={{ fontSize: 15, fontWeight: 640 }}>Your subscription has ended.</div>
                <div style={{ fontSize: 13, color: "var(--ink-500)", marginTop: 4 }}>You don&apos;t have an active plan. Subscribe below to restore full access.</div>
              </>
            ) : onTrial ? (
              <>
                <div style={{ fontSize: 15, fontWeight: 640 }}>You&apos;re on a free trial — {daysLeft} day{daysLeft === 1 ? "" : "s"} remaining.</div>
                <div style={{ fontSize: 13, color: "var(--ink-500)", marginTop: 4 }}>Choose a plan below to keep access after your trial. No credit card needed yet.</div>
              </>
            ) : trialEnded ? (
              <>
                <div style={{ fontSize: 15, fontWeight: 640 }}>Your free trial has ended.</div>
                <div style={{ fontSize: 13, color: "var(--ink-500)", marginTop: 4 }}>Choose a plan to restore full access.</div>
              </>
            ) : (
              <>
                <div style={{ fontSize: 15, fontWeight: 640 }}>Choose a plan.</div>
                <div style={{ fontSize: 13, color: "var(--ink-500)", marginTop: 4 }}>Pick the plan that fits your business.</div>
              </>
            )}
          </div>
          {canManage && (subscribed || (subscriptionEnded && org.stripeCustomerId)) ? <ManageBillingButton /> : null}
        </div>

        {!canManage ? (
          <div style={{ fontSize: 13, color: "var(--ink-500)", marginBottom: 16 }}>
            Only owners and admins can change billing.
          </div>
        ) : null}

        {/* Plan cards */}
        <div className="metrics-grid" style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: "var(--gutter)", alignItems: "stretch" }}>
          {PLAN_IDS.map((planId) => {
            const plan = PLANS[planId];
            const isCurrent = subscribed && planId === currentPlanId;
            const highlight = planId === "growth";
            return (
              <div
                key={planId}
                className="card"
                style={{ padding: "var(--card-pad)", display: "flex", flexDirection: "column", gap: 14, borderColor: highlight ? "var(--accent-border)" : undefined, boxShadow: highlight ? "var(--shadow-md)" : undefined }}
              >
                <div>
                  <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                    <span style={{ fontSize: 16, fontWeight: 680 }}>{plan.name}</span>
                    {isCurrent ? <span className="badge badge-accent">Current</span> : highlight ? <span className="badge badge-accent">Popular</span> : null}
                  </div>
                  <p style={{ fontSize: 12.5, color: "var(--ink-500)", marginTop: 4, lineHeight: 1.5, minHeight: 34 }}>{plan.tagline}</p>
                  <div style={{ marginTop: 8, display: "flex", alignItems: "baseline", gap: 4 }}>
                    <span style={{ fontSize: 30, fontWeight: 700, letterSpacing: "-.02em" }}>${plan.monthlyPriceUsd}</span>
                    <span style={{ fontSize: 13, color: "var(--ink-400)" }}>/ month</span>
                  </div>
                </div>

                <div style={{ borderTop: "1px solid var(--ink-150)", paddingTop: 12, display: "flex", flexDirection: "column", gap: 8 }}>
                  {planRows(plan).map((row) => (
                    <div key={row.label} style={{ display: "flex", justifyContent: "space-between", fontSize: 13 }}>
                      <span style={{ color: "var(--ink-500)" }}>{row.label}</span>
                      <span style={{ fontWeight: 600, color: "var(--ink-900)" }}>{row.value}</span>
                    </div>
                  ))}
                </div>

                <div style={{ borderTop: "1px solid var(--ink-150)", paddingTop: 12, display: "flex", flexDirection: "column", gap: 7 }}>
                  {FEATURE_LABELS.map(([key, label]) => {
                    const on = plan.features[key];
                    return (
                      <div key={key} style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 12.5, color: on ? "var(--ink-800)" : "var(--ink-400)" }}>
                        <Icon name={on ? "check" : "close"} size={14} style={{ color: on ? "var(--success)" : "var(--ink-300)" }} />
                        {label}
                      </div>
                    );
                  })}
                </div>

                <div style={{ marginTop: "auto", paddingTop: 6 }}>
                  {isCurrent ? (
                    <button type="button" disabled className="btn btn-secondary" style={{ width: "100%", justifyContent: "center", opacity: 0.7 }}>
                      Current plan
                    </button>
                  ) : canManage ? (
                    <SubscribeButton planId={planId} label={subscribed ? `Switch to ${plan.name}` : `Choose ${plan.name}`} variant={highlight ? "primary" : "secondary"} />
                  ) : (
                    <button type="button" disabled className="btn btn-secondary" style={{ width: "100%", justifyContent: "center", opacity: 0.6 }}>
                      {plan.name}
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </AppShell>
  );
}
