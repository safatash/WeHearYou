export const dynamic = "force-dynamic";

import Link from "next/link";
import { redirect } from "next/navigation";
import { AppShell } from "@/components/app-shell";
import { getDashboardData } from "@/lib/dashboard";
import { getCurrentAccessibleLocationIds } from "@/lib/current-scope";
import { getCurrentMembership } from "@/lib/authz";
import { prisma } from "@/lib/prisma";
import { OnboardingChecklist } from "@/components/onboarding-checklist";
import { canManageTeam } from "@/lib/team";

export default async function DashboardPage() {
  const membership = await getCurrentMembership();

  if (!membership) {
    redirect("/login");
  }

  const org = await prisma.organization.findUnique({
    where: { id: membership.organizationId },
    select: {
      onboardingDismissedAt: true,
      locations: {
        select: { id: true, googleLocationName: true },
        orderBy: { createdAt: "asc" },
        take: 1,
      },
      _count: { select: { locations: true } },
    },
  });

  const hasLocation = (org?._count.locations ?? 0) > 0;
  const hasGoogle = (org?.locations[0]?.googleLocationName ?? null) !== null;
  const contactCount = hasLocation
    ? await prisma.contact.count({ where: { locationId: org!.locations[0].id } })
    : 0;
  const hasContacts = contactCount > 0;

  const dismissed = Boolean(org?.onboardingDismissedAt);
  const allDone = hasLocation && hasGoogle && hasContacts;
  const showChecklist = !dismissed && !allDone;
  const canDismiss = canManageTeam(membership);

  if (!hasLocation && !dismissed) {
    redirect("/onboarding");
  }

  const locationIds = await getCurrentAccessibleLocationIds();
  const dashboard = await getDashboardData(locationIds);
  const userName = membership.user.name || "there";
  const greeting = getGreeting(userName);

  return (
    <AppShell activeScreen="dashboard">
      <div style={{ maxWidth: 1240, margin: "0 auto", padding: "var(--gutter)" }}>
        {showChecklist && (
          <OnboardingChecklist
            hasLocation={hasLocation}
            hasGoogle={hasGoogle}
            hasContacts={hasContacts}
            canDismiss={canDismiss}
          />
        )}

        {/* Header with greeting and action buttons */}
        <div style={{ display: "flex", alignItems: "flex-end", justifyContent: "space-between", gap: 16, flexWrap: "wrap", marginBottom: 32 }}>
          <div>
            <h1 style={{ fontSize: 26, fontWeight: 680, letterSpacing: "-.025em", marginBottom: 8, color: "var(--ink-900)" }}>
              {greeting}
            </h1>
            <p style={{ fontSize: 14, color: "var(--ink-500)", margin: 0 }}>
              You have <strong style={{ color: "var(--ink-700)" }}>{dashboard.funnelOutcomes.awaitingResponse} reviews</strong> waiting for a reply and <strong style={{ color: "var(--ink-700)" }}>8 campaigns</strong> running.
            </p>
          </div>
          <div style={{ display: "flex", gap: 12, alignItems: "center" }}>
            <Link href="/reviews" className="btn btn-secondary">
              📥 Review inbox
            </Link>
            <Link href="/campaigns/new" className="btn btn-primary">
              ➕ New campaign
            </Link>
          </div>
        </div>

        {/* SUNDAY, JUNE 14 date divider */}
        <div style={{ marginBottom: 20 }}>
          <p style={{ fontSize: 11, fontWeight: 700, color: "var(--ink-400)", textTransform: "uppercase", letterSpacing: "0.1em", margin: 0 }}>
            {new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' }).toUpperCase()}
          </p>
        </div>

        {/* Metrics grid - 4 columns */}
        <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 12, marginBottom: 32 }}>
          <DashboardMetricCard
            label="Total reviews"
            value={dashboard.totalReviews}
            change="+8.2"
            changeType="positive"
          />
          <DashboardMetricCard
            label="Average rating"
            value={`${dashboard.googleAvgRating}★`}
            change="+0.2"
            changeType="positive"
          />
          <DashboardMetricCard
            label="Response rate"
            value={`${dashboard.requestConversion}%`}
            change="+5.0"
            changeType="positive"
          />
          <DashboardMetricCard
            label="Pending replies"
            value={dashboard.funnelOutcomes.awaitingResponse}
            change="-3"
            changeType="negative"
          />
        </div>

        {/* Main content grid - 2/3 left, 1/3 right */}
        <div style={{ display: "grid", gridTemplateColumns: "2fr 1fr", gap: 28 }}>
          {/* Left column */}
          <div style={{ display: "flex", flexDirection: "column", gap: 28 }}>
            {/* Rating & volume trend chart */}
            <div className="card" style={{ padding: "var(--card-pad)" }}>
              <h2 style={{ fontSize: 15, fontWeight: 640, color: "var(--ink-900)", margin: "0 0 16px 0" }}>Rating & volume trend</h2>
              <p style={{ fontSize: 13, color: "var(--ink-500)", margin: 0 }}>Average star rating over the last 12 weeks</p>
              <div style={{ height: 200, marginTop: 16, background: "var(--ink-50)", borderRadius: "var(--r-sm)", display: "flex", alignItems: "flex-end", justifyContent: "space-around", padding: 16 }}>
                {/* Chart placeholder - showing mock bars */}
                {[40, 60, 50, 70, 65, 80, 75, 85, 90, 70, 65, 75].map((height, idx) => (
                  <div key={idx} style={{ width: 6, height: `${height}%`, background: "var(--accent)", borderRadius: 2 }} />
                ))}
              </div>
            </div>

            {/* Sentiment section */}
            <div className="card" style={{ padding: "var(--card-pad)" }}>
              <h2 style={{ fontSize: 15, fontWeight: 640, color: "var(--ink-900)", margin: "0 0 16px 0" }}>Sentiment</h2>
              <p style={{ fontSize: 13, color: "var(--ink-500)", margin: "0 0 16px 0" }}>Last 30 days</p>
              <div style={{ display: "flex", gap: 16 }}>
                <SentimentCard label="Positive" value={142} color="var(--success)" />
                <SentimentCard label="Neutral" value={45} color="var(--ink-400)" />
                <SentimentCard label="Negative" value={12} color="var(--danger)" />
              </div>
            </div>
          </div>

          {/* Right column */}
          <div style={{ display: "flex", flexDirection: "column", gap: 28 }}>
            {/* Quick stats sidebar */}
            <div className="card" style={{ padding: "var(--card-pad)" }}>
              <h2 style={{ fontSize: 15, fontWeight: 640, color: "var(--ink-900)", margin: "0 0 16px 0" }}>Quick stats</h2>

              <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
                <div>
                  <p style={{ fontSize: 11, fontWeight: 600, color: "var(--ink-500)", textTransform: "uppercase", letterSpacing: "0.05em", margin: "0 0 4px 0" }}>
                    Locations
                  </p>
                  <p style={{ fontSize: 20, fontWeight: 680, color: "var(--ink-900)", margin: 0 }}>{dashboard.locations.length}</p>
                </div>

                <div style={{ borderTop: "1px solid var(--ink-150)", paddingTop: 16 }}>
                  <p style={{ fontSize: 11, fontWeight: 600, color: "var(--ink-500)", textTransform: "uppercase", letterSpacing: "0.05em", margin: "0 0 4px 0" }}>
                    Top Location
                  </p>
                  {dashboard.locations.length > 0 ? (
                    <>
                      <p style={{ fontSize: 14, fontWeight: 620, color: "var(--ink-900)", margin: "0 0 2px 0" }}>
                        {dashboard.locations[0].name}
                      </p>
                      <p style={{ fontSize: 12, color: "var(--ink-500)", margin: 0 }}>
                        {dashboard.locations[0].avgRating?.toFixed(1)}★ ({dashboard.locations[0]._count.reviews} reviews)
                      </p>
                    </>
                  ) : (
                    <p style={{ fontSize: 13, color: "var(--ink-400)" }}>No locations</p>
                  )}
                </div>

                <div style={{ borderTop: "1px solid var(--ink-150)", paddingTop: 16 }}>
                  <p style={{ fontSize: 11, fontWeight: 600, color: "var(--ink-500)", textTransform: "uppercase", letterSpacing: "0.05em", margin: "0 0 4px 0" }}>
                    Recent Activity
                  </p>
                  <p style={{ fontSize: 13, color: "var(--ink-600)", margin: 0 }}>
                    {dashboard.recentActivity.length > 0
                      ? `${dashboard.recentActivity.length} activities`
                      : "No recent activity"}
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </AppShell>
  );
}

function getGreeting(name: string): string {
  const hour = new Date().getHours();
  if (hour < 12) return `Good morning, ${name}`;
  if (hour < 18) return `Good afternoon, ${name}`;
  return `Good evening, ${name}`;
}

interface DashboardMetricCardProps {
  label: string;
  value: string | number;
  change: string;
  changeType: 'positive' | 'negative';
}

function DashboardMetricCard({ label, value, change, changeType }: DashboardMetricCardProps) {
  const changeColor = changeType === 'positive' ? 'var(--success)' : 'var(--danger)';

  return (
    <div className="card" style={{ padding: "var(--card-pad)", display: "flex", flexDirection: "column", gap: 12 }}>
      <p style={{ fontSize: 12, fontWeight: 600, color: "var(--ink-500)", margin: 0 }}>{label}</p>
      <div style={{ display: "flex", alignItems: "baseline", justifyContent: "space-between" }}>
        <p style={{ fontSize: 28, fontWeight: 680, color: "var(--ink-900)", margin: 0 }}>{value}</p>
        <p style={{ fontSize: 12, fontWeight: 600, color: changeColor, margin: 0 }}>{change}</p>
      </div>
      {/* Mini trend chart */}
      <div style={{ height: 30, background: "var(--ink-50)", borderRadius: 4, display: "flex", alignItems: "flex-end", justifyContent: "space-around", padding: "4px 6px", gap: 2 }}>
        {[30, 35, 32, 38, 40, 35, 42, 45, 48, 50, 55, 58].map((h, i) => (
          <div key={i} style={{ flex: 1, height: `${h}%`, background: changeColor, borderRadius: 1, opacity: 0.6 }} />
        ))}
      </div>
    </div>
  );
}

function SentimentCard({ label, value, color }: { label: string; value: number; color: string }) {
  return (
    <div style={{ flex: 1, textAlign: "center" }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "center", width: 60, height: 60, borderRadius: "50%", background: color, margin: "0 auto 8px", opacity: 0.2 }}></div>
      <p style={{ fontSize: 13, fontWeight: 600, color: "var(--ink-900)", margin: "0 0 4px 0" }}>{value}</p>
      <p style={{ fontSize: 12, color: "var(--ink-500)", margin: 0 }}>{label}</p>
    </div>
  );
}
