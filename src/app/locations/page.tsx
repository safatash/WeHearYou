export const dynamic = "force-dynamic";

import Link from "next/link";
import { AppShell } from "@/components/app-shell";
import { Icon } from "@/components/icon";
import { PortfolioStat } from "@/app/locations/_components/portfolio-stat";
import { LocationCard } from "@/app/locations/_components/location-card";
import { buildGoogleSyncSummary, buildLocationSyncErrorMessage } from "@/lib/google-sync-summary";
import { getLocationPortfolioStats, getLocations } from "@/lib/locations";
import { buildLocationReputation } from "@/lib/location-reputation";
import { getCurrentAccessibleLocationIds } from "@/lib/current-scope";
import { getCurrentMembership } from "@/lib/authz";
import { limitReached } from "@/lib/plan-features";

export default async function LocationsPage({ searchParams }: { searchParams?: Promise<Record<string, string | string[] | undefined>> }) {
  const params = (await searchParams) ?? {};
  const syncState = typeof params.sync === "string" ? params.sync : undefined;
  const syncMessage = typeof params.message === "string" ? params.message : undefined;
  const createdCount = typeof params.created === "string" ? Number(params.created) : 0;
  const updatedCount = typeof params.updated === "string" ? Number(params.updated) : 0;
  const skippedCount = typeof params.skipped === "string" ? Number(params.skipped) : 0;
  const totalCount = typeof params.total === "string" ? Number(params.total) : 0;
  const locationIds = await getCurrentAccessibleLocationIds();
  const locations = await getLocations(locationIds);
  const membership = await getCurrentMembership();
  const atLocationLimit = limitReached(membership?.organization.planId, "locations", locations.length);
  const portfolio = getLocationPortfolioStats(locations);
  const cards = locations.map((location) => ({ location, reputation: buildLocationReputation(location) }));
  const attentionCount = cards.filter((c) => c.reputation.health === "attention").length;

  return (
    <AppShell activeScreen="locations">
      <div style={{ maxWidth: 1240, margin: "0 auto", padding: "var(--gutter)" }}>
        {syncState === "success" ? (
          <div
            className="card"
            style={{ padding: "11px 14px", marginBottom: "var(--gutter)", fontSize: 13, background: "var(--success-soft)", borderColor: "color-mix(in srgb, var(--success) 26%, var(--white))", color: "var(--success)" }}
          >
            {buildGoogleSyncSummary({ createdCount, updatedCount, skippedCount, totalCount })}
          </div>
        ) : null}

        {syncState === "error" ? (
          <div
            className="card"
            style={{ padding: "11px 14px", marginBottom: "var(--gutter)", fontSize: 13, background: "var(--danger-soft)", borderColor: "color-mix(in srgb, var(--danger) 26%, var(--white))", color: "var(--danger)" }}
          >
            {buildLocationSyncErrorMessage(syncMessage)}
          </div>
        ) : null}

        {/* header */}
        <div style={{ display: "flex", alignItems: "flex-end", justifyContent: "space-between", gap: 16, flexWrap: "wrap", marginBottom: "var(--gutter)" }}>
          <div style={{ minWidth: 0 }}>
            <div className="eyebrow" style={{ marginBottom: 6 }}>Portfolio</div>
            <h1 style={{ fontSize: 26, fontWeight: 680, letterSpacing: "-.025em" }}>Locations</h1>
            <p style={{ fontSize: 13.5, color: "var(--ink-500)", marginTop: 5 }}>
              Monitor reputation across your {portfolio.totalLocations} {portfolio.totalLocations === 1 ? "location" : "locations"}
              {attentionCount > 0 ? (
                <> — <b style={{ color: "var(--warning)" }}>{attentionCount} need{attentionCount > 1 ? "" : "s"} attention</b></>
              ) : null}
              .
            </p>
          </div>
          <div style={{ display: "flex", gap: 10 }}>
            <button type="button" className="btn btn-secondary">Invite manager</button>
            {atLocationLimit ? (
              <Link
                href="/billing"
                title="You've reached your plan's location limit. Upgrade to add more."
                className="btn btn-secondary"
                style={{ opacity: 0.6 }}
              >
                <Icon name="plus" size={16} />Add location
              </Link>
            ) : (
              <Link href="/locations/new" className="btn btn-primary">
                <Icon name="plus" size={16} />Add location
              </Link>
            )}
          </div>
        </div>

        {/* portfolio summary */}
        <div className="loc-stats" style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: "var(--gutter)", marginBottom: "var(--gutter)" }}>
          <PortfolioStat icon="pin" label="Locations" value={portfolio.totalLocations} />
          <PortfolioStat icon="star" label="Avg rating" value={portfolio.portfolioRatingValue.toFixed(1)} suffix="★" />
          <PortfolioStat icon="chat" label="Total reviews" value={portfolio.totalReviews.toLocaleString()} />
          <PortfolioStat icon="inbox" label="Pending replies" value={portfolio.totalPending} tone={portfolio.totalPending > 5 ? "warning" : "default"} />
        </div>

        {cards.length === 0 ? (
          <div className="card" style={{ padding: "48px 20px", textAlign: "center", border: "1px dashed var(--ink-300)", boxShadow: "none" }}>
            <p style={{ fontSize: 15, fontWeight: 640, color: "var(--ink-900)" }}>No locations yet</p>
            <p style={{ fontSize: 13, color: "var(--ink-500)", marginTop: 6 }}>Add your first location to start tracking reputation across the portfolio.</p>
            <Link href="/locations/new" className="btn btn-primary" style={{ marginTop: 18 }}>
              <Icon name="plus" size={16} />Add location
            </Link>
          </div>
        ) : (
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(372px, 1fr))", gap: "var(--gutter)" }}>
            {cards.map(({ location, reputation }) => (
              <LocationCard key={location.id} location={location} reputation={reputation} />
            ))}
          </div>
        )}
      </div>
    </AppShell>
  );
}
