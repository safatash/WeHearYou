import Link from "next/link";
import { Icon } from "@/components/icon";
import { PLANS, type PlanId } from "@/lib/plans";

/**
 * Shown in place of a gated feature when the org's plan doesn't include it.
 * Purely presentational — callers decide when to render it (only while billing
 * is enforced). Links to /billing.
 */
export function UpgradeGate({
  feature,
  planRequired,
  description,
}: {
  feature: string;
  planRequired: PlanId;
  description?: string;
}) {
  const plan = PLANS[planRequired];
  return (
    <div
      className="card"
      style={{ padding: "40px 28px", textAlign: "center", display: "flex", flexDirection: "column", alignItems: "center", gap: 12 }}
    >
      <span
        style={{ width: 46, height: 46, borderRadius: "var(--r-md)", display: "grid", placeItems: "center", background: "var(--accent-soft)", color: "var(--accent-strong)" }}
      >
        <Icon name="lock" size={22} />
      </span>
      <div>
        <h3 style={{ fontSize: 16, fontWeight: 640, color: "var(--ink-900)" }}>{feature} is a {plan.name} feature</h3>
        <p style={{ fontSize: 13.5, color: "var(--ink-500)", marginTop: 6, maxWidth: 440, lineHeight: 1.5 }}>
          {description ?? `Upgrade to ${plan.name} to unlock ${feature.toLowerCase()}.`}
        </p>
      </div>
      <Link href="/billing" className="btn btn-primary" style={{ marginTop: 4 }}>
        <Icon name="bolt" size={16} />Upgrade to {plan.name}
      </Link>
    </div>
  );
}
