export const dynamic = "force-dynamic";

import Link from "next/link";
import { AppShell } from "@/components/app-shell";
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
      <div className="space-y-6">
        {syncState === "success" ? (
          <div className="rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-800">
            {buildGoogleSyncSummary({
              createdCount,
              updatedCount,
              skippedCount,
              totalCount,
            })}
          </div>
        ) : null}

        {syncState === "error" ? (
          <div className="rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-800">
            {buildLocationSyncErrorMessage(syncMessage)}
          </div>
        ) : null}

        <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <p className="text-sm font-semibold uppercase tracking-[0.22em] text-indigo-600">Portfolio</p>
            <h2 className="mt-2 text-4xl font-semibold tracking-tight text-slate-950">Locations</h2>
            <p className="mt-3 max-w-3xl text-slate-600">
              Monitor reputation across your {portfolio.totalLocations} {portfolio.totalLocations === 1 ? "location" : "locations"}
              {attentionCount > 0 ? (
                <>
                  {" "}
                  — <span className="font-semibold text-amber-600">{attentionCount} need{attentionCount > 1 ? "" : "s"} attention</span>
                </>
              ) : null}
              .
            </p>
          </div>
          <div className="flex gap-3">
            <button className="rounded-2xl border border-slate-200 bg-white px-5 py-3 text-sm font-semibold text-slate-700 shadow-sm">Invite Manager</button>
            {atLocationLimit ? (
              <Link href="/billing" title="You've reached your plan's location limit. Upgrade to add more." className="rounded-2xl border border-slate-200 bg-slate-100 px-5 py-3 text-sm font-semibold text-slate-400 shadow-sm">
                Add Location
              </Link>
            ) : (
              <Link href="/locations/new" className="rounded-2xl bg-slate-950 px-5 py-3 text-sm font-semibold !text-white shadow-sm visited:!text-white hover:!text-white">
                Add Location
              </Link>
            )}
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4 xl:grid-cols-4">
          <PortfolioStat icon="pin" label="Locations" value={portfolio.totalLocations} />
          <PortfolioStat icon="star" label="Avg rating" value={portfolio.portfolioRatingValue.toFixed(1)} suffix="★" />
          <PortfolioStat icon="chat" label="Total reviews" value={portfolio.totalReviews.toLocaleString()} />
          <PortfolioStat icon="inbox" label="Pending replies" value={portfolio.totalPending} tone={portfolio.totalPending > 5 ? "warning" : "default"} />
        </div>

        {cards.length === 0 ? (
          <div className="rounded-3xl border border-dashed border-slate-300 bg-white p-12 text-center">
            <p className="text-base font-semibold text-slate-900">No locations yet</p>
            <p className="mt-2 text-sm text-slate-500">Add your first location to start tracking reputation across the portfolio.</p>
            <Link href="/locations/new" className="mt-5 inline-flex rounded-2xl bg-slate-950 px-5 py-3 text-sm font-semibold !text-white shadow-sm hover:!text-white">
              Add Location
            </Link>
          </div>
        ) : (
          <div className="grid gap-5 [grid-template-columns:repeat(auto-fill,minmax(340px,1fr))]">
            {cards.map(({ location, reputation }) => (
              <LocationCard key={location.id} location={location} reputation={reputation} />
            ))}
          </div>
        )}
      </div>
    </AppShell>
  );
}
