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

        {/* Greeting section with action buttons */}
        <div style={{ display: "flex", alignItems: "flex-end", justifyContent: "space-between", gap: 16, flexWrap: "wrap", marginBottom: "var(--gutter)" }}>
          <div>
            <h1 style={{ fontSize: 26, fontWeight: 680, letterSpacing: "-.025em", marginBottom: 8, color: "var(--ink-900)" }}>
              {greeting}
            </h1>
            <p style={{ fontSize: 15, color: "var(--ink-500)", margin: 0 }}>
              {dashboard.totalReviews} total reviews • {dashboard.googleAvgRating}★ average rating
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

        {/* Metrics grid */}
        <div className="metrics-grid" style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 12, marginBottom: "var(--gutter)" }}>
          <MetricCard label="Total Reviews" value={dashboard.totalReviews} />
          <MetricCard label="Avg. Rating" value={dashboard.googleAvgRating} />
          <MetricCard label="Response Rate" value={dashboard.requestConversion} />
          <MetricCard label="This Month" value={dashboard.googleReviewsThisMonth} />
        </div>

        {/* Main content grid */}
        <div className="main-grid" style={{ display: "grid", gridTemplateColumns: "2fr 1fr", gap: "var(--gutter)" }}>
          {/* Left column */}
          <div style={{ display: "flex", flexDirection: "column", gap: "var(--gutter)" }}>
            {/* Recent reviews */}
            <RecentReviewsSection reviews={dashboard.recentActivity} />

            {/* Funnel outcomes */}
            <FunnelOutcomesSection outcomes={dashboard.funnelOutcomes} />
          </div>

          {/* Right column */}
          <div style={{ display: "flex", flexDirection: "column", gap: "var(--gutter)" }}>
            {/* Quick stats */}
            <QuickStatsSection dashboard={dashboard} />
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

function MetricCard({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="card" style={{ padding: "var(--card-pad)", display: "flex", flexDirection: "column", gap: 8 }}>
      <p style={{ fontSize: 12, fontWeight: 600, color: "var(--ink-500)", margin: 0 }}>{label}</p>
      <p style={{ fontSize: 24, fontWeight: 680, color: "var(--ink-900)", margin: 0 }}>{value}</p>
    </div>
  );
}

function RecentReviewsSection({ reviews }: { reviews: any[] }) {
  return (
    <div className="card" style={{ padding: "var(--card-pad)" }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 16 }}>
        <h2 style={{ fontSize: 15, fontWeight: 640, color: "var(--ink-900)", margin: 0 }}>Recent activity</h2>
        <Link href="/reviews" style={{ fontSize: 13, color: "var(--accent)", fontWeight: 600, textDecoration: "none" }}>
          View all →
        </Link>
      </div>

      {reviews.length === 0 ? (
        <p style={{ fontSize: 13.5, color: "var(--ink-500)", margin: 0 }}>No activity yet</p>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
          {reviews.slice(0, 5).map((item: any, idx: number) => (
            <div key={idx} style={{ paddingBottom: 12, borderBottom: "1px solid var(--ink-150)" }}>
              <p style={{ fontSize: 13, color: "var(--ink-600)", margin: 0 }}>{item.description || item.type}</p>
              <p style={{ fontSize: 12, color: "var(--ink-400)", margin: "2px 0 0 0" }}>{item.location || "Unknown location"}</p>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function FunnelOutcomesSection({ outcomes }: { outcomes: any }) {
  return (
    <div className="card" style={{ padding: "var(--card-pad)" }}>
      <h2 style={{ fontSize: 15, fontWeight: 640, color: "var(--ink-900)", margin: "0 0 16px 0" }}>Funnel outcomes</h2>

      <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
        <OutcomeRow label="Google Reviews" value={outcomes.redirectedToGoogle} />
        <OutcomeRow label="Private Feedback" value={outcomes.privateFeedback} />
        <OutcomeRow label="Awaiting Response" value={outcomes.awaitingResponse} />
        <OutcomeRow label="Testimonials" value={outcomes.testimonials} />
      </div>
    </div>
  );
}

function OutcomeRow({ label, value }: { label: string; value: number }) {
  return (
    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: 10, background: "var(--ink-50)", borderRadius: "var(--r-sm)" }}>
      <p style={{ fontSize: 13, color: "var(--ink-700)", margin: 0, fontWeight: 600 }}>{label}</p>
      <p style={{ fontSize: 15, fontWeight: 680, color: "var(--ink-900)", margin: 0 }}>{value}</p>
    </div>
  );
}

function QuickStatsSection({ dashboard }: { dashboard: any }) {
  return (
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
                {dashboard.locations[0].avgRating?.toFixed(1)}★ ({dashboard.locations[0].reviewCount} reviews)
              </p>
            </>
          ) : (
            <p style={{ fontSize: 13, color: "var(--ink-400)" }}>No locations</p>
          )}
        </div>
      </div>
    </div>
  );
}
