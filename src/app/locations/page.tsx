export const dynamic = "force-dynamic";

import Link from "next/link";
import { syncGoogleReviewsFromLocationsList } from "@/app/locations/actions";
import { AppShell } from "@/components/app-shell";
import { FormSubmitButton } from "@/components/form-submit-button";
import { Field, StatCard } from "@/components/ui";
import { buildGoogleLastSyncResultSummary, buildGoogleSyncSummary, buildLocationSyncErrorMessage } from "@/lib/google-sync-summary";
import { formatRelativeSyncTime, getLocationPortfolioStats, getLocations } from "@/lib/locations";
import { getCurrentAccessibleLocationIds } from "@/lib/current-scope";

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
  const portfolio = getLocationPortfolioStats(locations);

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
            <p className="text-sm font-semibold uppercase tracking-[0.22em] text-indigo-600">Agency / Multi-location</p>
            <h2 className="mt-2 text-4xl font-semibold tracking-tight text-slate-950">Manage reputation across all business locations</h2>
            <p className="mt-3 max-w-3xl text-slate-600">
              This gives WeHearYou a stronger SaaS story, one account managing multiple locations, each with its own review link, contacts, workflows, and outcomes.
            </p>
          </div>
          <div className="flex gap-3">
            <button className="rounded-2xl border border-slate-200 bg-white px-5 py-3 text-sm font-semibold text-slate-700 shadow-sm">Invite Manager</button>
            <Link href="/locations/new" className="rounded-2xl bg-slate-950 px-5 py-3 text-sm font-semibold !text-white shadow-sm visited:!text-white hover:!text-white">
              Add Location
            </Link>
          </div>
        </div>

        <div className="grid gap-4 xl:grid-cols-3">
          <StatCard title="Total Locations" value={String(portfolio.totalLocations)} meta={`${portfolio.activeLocations} active, ${portfolio.launchingLocations} launching`} />
          <StatCard title="Managed Contacts" value={String(portfolio.totalContacts)} meta="Across all locations" />
          <StatCard title="Portfolio Rating" value={portfolio.portfolioRating} meta="Average reputation across portfolio" />
        </div>

        <div className="grid gap-6 xl:grid-cols-[1.15fr_0.85fr]">
          <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
            <div className="flex items-center justify-between">
              <h3 className="text-xl font-semibold text-slate-950">Locations</h3>
              <span className="text-sm text-slate-500">Portfolio view</span>
            </div>
            <div className="mt-6 space-y-4">
              {locations.map((location) => (
                <div key={location.id} className="rounded-3xl border border-slate-200 p-5">
                  <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                    <div>
                      <h4 className="text-xl font-semibold text-slate-950">
                        <Link href={`/locations/${location.id}`} className="hover:text-indigo-600">
                          {location.name}
                        </Link>
                      </h4>
                      <p className="mt-2 text-sm text-slate-600">
                        {location.city}, {location.state}
                      </p>
                      <div className="mt-4 flex flex-wrap gap-2">
                        <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold uppercase tracking-[0.18em] text-slate-600">
                          {location.status}
                        </span>
                        {location.avgRating ? (
                          <span className="rounded-full bg-emerald-50 px-3 py-1 text-xs font-semibold uppercase tracking-[0.18em] text-emerald-700">
                            {location.avgRating.toFixed(1)} ★
                          </span>
                        ) : null}
                        <span
                          className={`rounded-full px-3 py-1 text-xs font-semibold uppercase tracking-[0.18em] ${
                            location.googleMappingHealth?.status === "malformed"
                              ? "bg-rose-50 text-rose-700"
                              : location.lastSyncStatus === "error"
                                ? "bg-rose-50 text-rose-700"
                                : location.lastSyncAt || location.googleConnection?.lastSyncedAt
                                  ? "bg-indigo-50 text-indigo-700"
                                  : "bg-amber-50 text-amber-700"
                          }`}
                        >
                          {location.googleMappingHealth?.status === "malformed"
                            ? "Bad mapping"
                            : location.lastSyncStatus === "error"
                              ? "Sync failed"
                              : location.lastSyncAt || location.googleConnection?.lastSyncedAt
                                ? "Synced"
                                : location.googleLocationName
                                  ? "Ready to sync"
                                  : "Not synced"}
                        </span>
                      </div>
                    </div>

                    <div className="grid gap-2 text-sm text-slate-600">
                      <p>
                        <span className="font-semibold text-slate-900">Manager:</span> {location.managerName ?? "Unassigned"}
                      </p>
                      <p>
                        <span className="font-semibold text-slate-900">Contacts:</span> {location.contacts.length}
                      </p>
                      <p>
                        <span className="font-semibold text-slate-900">Review link:</span> {location.reviewLink ?? "Not configured"}
                      </p>
                      <p>
                        <span className="font-semibold text-slate-900">Last synced:</span> {formatRelativeSyncTime(location.lastSyncAt ?? location.googleConnection?.lastSyncedAt)}
                      </p>
                      {typeof location.lastSyncImportedCount === "number" || typeof location.lastSyncUpdatedCount === "number" || typeof location.lastSyncSkippedCount === "number" ? (
                        <p>
                          <span className="font-semibold text-slate-900">Last result:</span> {buildGoogleLastSyncResultSummary({
                            createdCount: location.lastSyncImportedCount ?? 0,
                            updatedCount: location.lastSyncUpdatedCount ?? 0,
                            skippedCount: location.lastSyncSkippedCount ?? 0,
                            totalCount: location.lastSyncFetchedCount ?? 0,
                          })}
                        </p>
                      ) : null}
                      {location.lastSyncMessage ? (
                        <p>
                          <span className="font-semibold text-slate-900">Last error:</span> {location.lastSyncMessage}
                        </p>
                      ) : null}
                      {location.googleMappingHealth?.status === "malformed" ? (
                        <p className="text-rose-700">
                          <span className="font-semibold text-rose-900">Mapping warning:</span> {location.googleMappingHealth.message}
                        </p>
                      ) : null}
                      <div className="flex flex-wrap items-center gap-3">
                        <Link href={`/locations/${location.id}`} className="text-sm font-semibold text-indigo-600">
                          Open location details
                        </Link>
                        {location.lastSyncStatus === "error" && location.googleLocationName && location.googleMappingHealth?.status !== "malformed" ? (
                          <form action={syncGoogleReviewsFromLocationsList}>
                            <input type="hidden" name="locationId" value={location.id} />
                            <FormSubmitButton
                              idleLabel="Retry sync"
                              pendingLabel="Retrying..."
                              className="rounded-2xl border border-rose-200 bg-rose-50 px-3 py-2 text-xs font-semibold text-rose-700 hover:border-rose-300 hover:text-rose-800 disabled:cursor-not-allowed disabled:border-slate-200 disabled:bg-white disabled:text-slate-400"
                            />
                          </form>
                        ) : null}
                      </div>
                    </div>
                  </div>

                  <div className="mt-5 flex flex-wrap gap-3">
                    {location.contacts.map((contact) => (
                      <Link
                        key={contact.id}
                        href={`/contacts/${contact.id}`}
                        className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm font-medium text-slate-700 hover:border-slate-300 hover:text-slate-950"
                      >
                        {contact.name}
                      </Link>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </section>

          <aside className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
            <h3 className="text-xl font-semibold text-slate-950">Location Defaults</h3>
            <div className="mt-6 space-y-4">
              <Field label="Brand Group" value="Nova Dental" />
              <Field label="Default Request Delay" value="2 hours after completion" />
              <Field label="Fallback Review Channel" value="Google Business Profile" />
              <Field label="Escalation Rule" value="Low ratings notify location manager and agency admin" multiline />
            </div>
          </aside>
        </div>
      </div>
    </AppShell>
  );
}
