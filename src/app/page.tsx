export const dynamic = "force-dynamic";

import Link from "next/link";
import { redirect } from "next/navigation";
import { AppShell } from "@/components/app-shell";
import { getDashboardData, type DashboardMetric } from "@/lib/dashboard";
import { getReviewAssistantAnalytics, type AssistantAnalytics } from "@/lib/review-assistant-analytics";
import { getResolutionStats, type ResolutionStats } from "@/lib/resolution-analytics";
import { getCurrentAccessibleLocationIds } from "@/lib/current-scope";
import { getCurrentMembership } from "@/lib/authz";
import { prisma } from "@/lib/prisma";
import { OnboardingChecklist } from "@/components/onboarding-checklist";
import { canManageTeam } from "@/lib/team";
import { Icon } from "@/components/icon";
import { Sparkline, RatingTrendChart, Donut, SourceBars } from "@/components/dashboard/charts";
import { RecentReviews } from "@/components/dashboard/recent-reviews";

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
  const assistant = await getReviewAssistantAnalytics(locationIds, 30);
  const resolution = await getResolutionStats(locationIds, 30);
  const userName = membership.user.name?.split(" ")[0] || "there";
  const greeting = getGreeting(userName);
  const dateLabel = new Date().toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric" });

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

        {/* Page header */}
        <div
          style={{
            display: "flex",
            alignItems: "flex-end",
            justifyContent: "space-between",
            gap: 16,
            flexWrap: "wrap",
            marginBottom: "var(--gutter)",
          }}
        >
          <div>
            <div className="eyebrow" style={{ marginBottom: 6 }}>
              {dateLabel}
            </div>
            <h1 style={{ fontSize: 26, fontWeight: 680, letterSpacing: "-.025em" }}>{greeting}</h1>
            <p style={{ fontSize: 13.5, color: "var(--ink-500)", marginTop: 5 }}>
              You have{" "}
              <b style={{ color: "var(--ink-800)" }}>{dashboard.funnelOutcomes.awaitingResponse} reviews</b>{" "}
              waiting for a reply and {dashboard.runningCampaigns} campaigns running.
            </p>
          </div>
          <div style={{ display: "flex", gap: 10 }}>
            <Link href="/reviews" className="btn btn-secondary">
              <Icon name="inbox" size={16} />
              Review inbox
            </Link>
            <Link href="/campaigns/new" className="btn btn-primary">
              <Icon name="plus" size={16} />
              New campaign
            </Link>
          </div>
        </div>

        {/* Metrics */}
        <div
          className="metrics-grid"
          style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: "var(--gutter)", marginBottom: "var(--gutter)" }}
        >
          {dashboard.metrics.map((m) => (
            <MetricCard key={m.key} m={m} />
          ))}
        </div>

        {/* AI Review Assistant */}
        {assistant.reviewsStarted > 0 || assistant.requestsSent > 0 ? (
          <AssistantWidgets a={assistant} />
        ) : null}

        {resolution.total > 0 ? <ResolutionWidgets r={resolution} /> : null}

        {/* Main grid */}
        <div
          className="main-grid"
          style={{ display: "grid", gridTemplateColumns: "minmax(0, 1.9fr) minmax(0, 1fr)", gap: "var(--gutter)", alignItems: "start" }}
        >
          {/* LEFT column */}
          <div style={{ display: "flex", flexDirection: "column", gap: "var(--gutter)" }}>
            {/* Rating trend */}
            <div className="card" style={{ padding: "var(--card-pad)" }}>
              <SectionHead
                title="Rating & volume trend"
                sub="Average star rating over the last 12 weeks"
                action={
                  <span className="badge badge-accent">
                    <span style={{ width: 7, height: 7, borderRadius: "50%", background: "var(--accent)" }} />
                    Avg rating
                  </span>
                }
              />
              <div style={{ marginTop: 14 }}>
                <RatingTrendChart data={dashboard.weeklyTrend} height={224} />
              </div>
            </div>

            {/* Recent reviews */}
            <div className="card" style={{ padding: "var(--card-pad)" }}>
              <SectionHead
                title="Recent reviews"
                sub="Across all connected sources"
                action={
                  <Link href="/reviews" className="btn btn-ghost btn-sm">
                    View all
                    <Icon name="chevRight" size={14} />
                  </Link>
                }
              />
              <RecentReviews reviews={dashboard.recentReviews} />
            </div>
          </div>

          {/* RIGHT column */}
          <div style={{ display: "flex", flexDirection: "column", gap: "var(--gutter)" }}>
            {/* Sentiment */}
            <div className="card" style={{ padding: "var(--card-pad)" }}>
              <SectionHead title="Sentiment" sub="Based on review ratings" />
              <div style={{ marginTop: 16, display: "grid", placeItems: "center" }}>
                <Donut data={dashboard.sentiment} centerLabel={`${dashboard.positivePct}%`} centerSub="Positive" />
              </div>
            </div>

            {/* Sources */}
            <div className="card" style={{ padding: "var(--card-pad)" }}>
              <SectionHead title="Review sources" sub="Where reviews come from" />
              <div style={{ marginTop: 16 }}>
                <SourceBars data={dashboard.sources} />
              </div>
            </div>

            {/* Locations */}
            <div className="card" style={{ padding: "var(--card-pad)" }}>
              <SectionHead title="Locations" sub={`${dashboard.locations.length} connected`} />
              <div style={{ marginTop: 4 }}>
                {dashboard.locations.length === 0 ? (
                  <p style={{ fontSize: 13, color: "var(--ink-400)", padding: "12px 0", margin: 0 }}>No locations yet</p>
                ) : (
                  dashboard.locations.slice(0, 4).map((loc) => <LocationRow key={loc.id} loc={loc} />)
                )}
              </div>
              <Link href="/locations" className="btn btn-secondary btn-sm" style={{ width: "100%", marginTop: 14 }}>
                Manage locations
                <Icon name="arrowRight" size={14} />
              </Link>
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

function SectionHead({ title, sub, action }: { title: string; sub?: string; action?: React.ReactNode }) {
  return (
    <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 4 }}>
      <div>
        <h3 style={{ fontSize: 15, fontWeight: 640, letterSpacing: "-.01em" }}>{title}</h3>
        {sub && <div style={{ fontSize: 12, color: "var(--ink-400)", marginTop: 2 }}>{sub}</div>}
      </div>
      {action}
    </div>
  );
}

function AssistantWidgets({ a }: { a: AssistantAnalytics }) {
  const pct = (n: number) => `${Math.round(n * 100)}%`;
  const tiles: { label: string; value: string }[] = [
    { label: "Review requests sent", value: a.requestsSent.toLocaleString() },
    { label: "Reviews started", value: a.reviewsStarted.toLocaleString() },
    { label: "AI reviews generated", value: a.aiGenerated.toLocaleString() },
    { label: "Reviews copied", value: a.reviewsCopied.toLocaleString() },
    { label: "Google click rate", value: pct(a.googleClickRate) },
    { label: "Destination click rate", value: pct(a.destinationClickRate) },
    { label: "Completion rate", value: pct(a.completionRate) },
    { label: "Private feedback", value: a.privateFeedback.toLocaleString() },
  ];
  return (
    <div style={{ marginBottom: "var(--gutter)" }}>
      <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 10 }}>
        <Icon name="sparkles" size={16} />
        <h2 style={{ fontSize: 14, fontWeight: 680, letterSpacing: "-.01em", color: "var(--ink-900)" }}>AI Review Assistant</h2>
        <span style={{ fontSize: 12, color: "var(--ink-400)" }}>last 30 days</span>
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: "var(--gutter)" }} className="metrics-grid">
        {tiles.map((t) => (
          <div key={t.label} className="card" style={{ padding: "14px 16px" }}>
            <div className="tnum" style={{ fontSize: 22, fontWeight: 700, letterSpacing: "-.02em", color: "var(--ink-900)" }}>{t.value}</div>
            <div style={{ fontSize: 11.5, color: "var(--ink-500)", marginTop: 4 }}>{t.label}</div>
          </div>
        ))}
      </div>
    </div>
  );
}

function ResolutionWidgets({ r }: { r: ResolutionStats }) {
  const tiles: { label: string; value: string }[] = [
    { label: "New cases", value: r.newCases.toLocaleString() },
    { label: "High priority", value: r.highPriority.toLocaleString() },
    { label: "Resolved", value: r.resolved.toLocaleString() },
    { label: "Resolution rate", value: `${Math.round(r.resolutionRate * 100)}%` },
    { label: "Avg rating", value: r.averageRating.toFixed(1) },
    { label: "Contact requested", value: r.contactRequested.toLocaleString() },
  ];
  return (
    <div style={{ marginBottom: "var(--gutter)" }}>
      <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 10 }}>
        <Icon name="shield" size={16} />
        <h2 style={{ fontSize: 14, fontWeight: 680, letterSpacing: "-.01em", color: "var(--ink-900)" }}>Customer Resolution</h2>
        <span style={{ fontSize: 12, color: "var(--ink-400)" }}>last 30 days</span>
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(6, 1fr)", gap: "var(--gutter)" }} className="metrics-grid">
        {tiles.map((t) => (
          <div key={t.label} className="card" style={{ padding: "14px 16px" }}>
            <div className="tnum" style={{ fontSize: 22, fontWeight: 700, letterSpacing: "-.02em", color: "var(--ink-900)" }}>{t.value}</div>
            <div style={{ fontSize: 11.5, color: "var(--ink-500)", marginTop: 4 }}>{t.label}</div>
          </div>
        ))}
      </div>
    </div>
  );
}

function MetricCard({ m }: { m: DashboardMetric }) {
  const positive = m.tone === "up" || m.tone === "down-good";
  const deltaColor = positive ? "var(--success)" : m.tone === "down" ? "var(--danger)" : "var(--ink-400)";
  const sparkColor = m.key === "pending" ? "var(--ink-400)" : "var(--accent)";
  const showDelta = m.delta !== null;
  const deltaDown = m.tone === "down" || m.tone === "down-good";

  return (
    <div className="card" style={{ padding: "var(--card-pad)", display: "flex", flexDirection: "column", gap: 10 }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
        <span style={{ fontSize: 12.5, color: "var(--ink-500)", fontWeight: 540 }}>{m.label}</span>
        {showDelta && (
          <span
            className="badge"
            style={{ background: `color-mix(in srgb, ${deltaColor} 12%, #fff)`, color: deltaColor, height: 20, paddingLeft: 6 }}
          >
            <Icon name="arrowUp" size={11} style={{ transform: deltaDown ? "rotate(180deg)" : "none" }} />
            <span className="tnum">
              {m.delta! > 0 ? "+" : ""}
              {m.delta}
              {m.key === "rating" ? "" : m.key === "pending" ? "" : "%"}
            </span>
          </span>
        )}
      </div>
      <div style={{ display: "flex", alignItems: "flex-end", justifyContent: "space-between", gap: 12 }}>
        <div style={{ display: "flex", alignItems: "baseline", gap: 3 }}>
          <span className="tnum" style={{ fontSize: 31, fontWeight: 680, letterSpacing: "-.03em", lineHeight: 1 }}>
            {m.value}
          </span>
          {m.suffix && (
            <span style={{ fontSize: 18, fontWeight: 600, color: m.key === "rating" ? "var(--star)" : "var(--ink-400)" }}>
              {m.suffix}
            </span>
          )}
        </div>
        <Sparkline data={m.spark} color={sparkColor} w={88} h={32} />
      </div>
      <div style={{ fontSize: 11.5, color: "var(--ink-400)" }}>{m.deltaLabel}</div>
    </div>
  );
}

function LocationRow({ loc }: { loc: { id: string; name: string; status: string; avgRating: number | null; _count: { reviews: number } } }) {
  const attention = loc.status !== "healthy" && loc.status !== "ACTIVE";
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 12, padding: "11px 4px", borderTop: "1px solid var(--ink-150)" }}>
      <span
        style={{
          width: 30,
          height: 30,
          borderRadius: 8,
          flex: "none",
          display: "grid",
          placeContent: "center",
          background: "var(--accent-soft)",
          color: "var(--accent-strong)",
        }}
      >
        <Icon name="pin" size={15} />
      </span>
      <div style={{ minWidth: 0, flex: 1 }}>
        <div style={{ fontSize: 13, fontWeight: 560, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
          {loc.name}
        </div>
        <div style={{ fontSize: 11.5, color: "var(--ink-400)" }} className="tnum">
          {loc._count.reviews.toLocaleString()} reviews
        </div>
      </div>
      <div style={{ textAlign: "right" }}>
        <div className="tnum" style={{ fontSize: 13.5, fontWeight: 640 }}>
          {loc.avgRating != null ? loc.avgRating.toFixed(1) : "—"}★
        </div>
        <div style={{ fontSize: 11, color: "var(--ink-400)" }}>avg rating</div>
      </div>
      <span
        className={`badge ${attention ? "badge-warning" : "badge-success"}`}
        style={{ width: 8, height: 8, padding: 0, borderRadius: "50%" }}
        title={loc.status}
      />
    </div>
  );
}
