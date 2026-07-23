export const dynamic = "force-dynamic";

import Link from "next/link";
import { getCurrentMembership } from "@/lib/authz";

export default async function SuspendedPage() {
  const membership = await getCurrentMembership();
  const org = membership?.organization;

  const subActive = org?.stripeSubscriptionStatus === "active" || org?.stripeSubscriptionStatus === "trialing";
  const trialEnded = Boolean(org?.trialEndsAt && org.trialEndsAt < new Date() && !subActive && !org.stripeSubscriptionId);

  return (
    <div style={{ minHeight: "100vh", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", background: "var(--page)", padding: 16 }}>
      <div className="card" style={{ width: "100%", maxWidth: 460, padding: 32, textAlign: "center" }}>
        <p className="eyebrow" style={{ color: trialEnded ? "var(--accent-strong)" : "var(--danger)" }}>
          {trialEnded ? "Trial ended" : "Account suspended"}
        </p>
        <h1 style={{ marginTop: 12, fontSize: 22, fontWeight: 680, letterSpacing: "-.02em", color: "var(--ink-900)" }}>
          {trialEnded ? "Your free trial has ended" : "Your account has been suspended"}
        </h1>
        <p style={{ marginTop: 14, fontSize: 13.5, lineHeight: 1.6, color: "var(--ink-500)" }}>
          {trialEnded
            ? "Your 14-day free trial is over. Choose a plan to restore full access to your dashboard, reviews, and campaigns."
            : "Access to your WeHearYou account has been suspended. Please contact support to resolve this."}
        </p>
        <div style={{ marginTop: 24 }}>
          {trialEnded ? (
            <Link href="/billing" className="btn btn-primary">View plans</Link>
          ) : (
            <a href="mailto:support@wehearyou.app" className="btn btn-primary">Contact support</a>
          )}
        </div>
      </div>
    </div>
  );
}
