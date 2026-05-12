export const dynamic = "force-dynamic";

import Link from "next/link";
import { disconnectGoogleConnection, refreshGoogleConnection, retryFailedGoogleSyncs, syncAllGoogleReviewsForConnection, syncGoogleReviewsFromIntegrations } from "@/app/locations/actions";
import { AppShell } from "@/components/app-shell";
import { FormSubmitButton } from "@/components/form-submit-button";
import { GoogleBatchSyncResultCard } from "@/components/google-batch-sync-result-card";
import { GoogleLocationSyncStatusCard } from "@/components/google-location-sync-status-card";
import { GoogleSyncBanner } from "@/components/google-sync-banner";
import { getGoogleConnections, getGoogleOAuthConfig } from "@/lib/google-oauth";
import { formatRelativeSyncTime } from "@/lib/locations";

export default async function IntegrationsPage({ searchParams }: { searchParams?: Promise<Record<string, string | string[] | undefined>> }) {
  const params = (await searchParams) ?? {};
  const googleState = typeof params.google === "string" ? params.google : undefined;
  const syncedLocation = typeof params.location === "string" ? params.location : undefined;
  const createdCount = typeof params.created === "string" ? Number(params.created) : 0;
  const updatedCount = typeof params.updated === "string" ? Number(params.updated) : 0;
  const skippedCount = typeof params.skipped === "string" ? Number(params.skipped) : 0;
  const totalCount = typeof params.total === "string" ? Number(params.total) : 0;
  const syncedLocations = typeof params.locations === "string" ? Number(params.locations) : 0;
  const failedLocations = typeof params.failed === "string" ? Number(params.failed) : 0;
  const failedLocationNames = typeof params.failedNames === "string" && params.failedNames.length > 0 ? params.failedNames.split("|") : [];
  const syncMessage = typeof params.message === "string" ? params.message : typeof params.reason === "string" ? params.reason : undefined;
  const googleConnections = await getGoogleConnections();
  const googleConfig = getGoogleOAuthConfig();
  const googleReady = Boolean(googleConfig.clientId && googleConfig.clientSecret && googleConfig.redirectUri);

  return (
    <AppShell activeScreen="integrations">
      <div className="space-y-6">
        <div>
          <p className="text-sm font-semibold uppercase tracking-[0.22em] text-indigo-600">Integrations</p>
          <h2 className="mt-2 text-3xl font-semibold tracking-tight text-slate-950">Connect the same channels your plugin already depends on</h2>
        </div>

        <GoogleSyncBanner
          googleState={googleState}
          syncedLocation={syncedLocation}
          createdCount={createdCount}
          updatedCount={updatedCount}
          skippedCount={skippedCount}
          totalCount={totalCount}
          syncedLocations={syncedLocations}
          failedLocations={failedLocations}
          failedLocationNames={failedLocationNames}
          syncMessage={syncMessage}
        />

        <div className="grid gap-6 md:grid-cols-2 xl:grid-cols-3">
          <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
            <div className="flex items-center justify-between gap-4">
              <div>
                <h3 className="text-xl font-semibold text-slate-950">Google Business Profile</h3>
                <p className="mt-2 text-sm text-slate-600">Connect OAuth, sync reviews, map locations, and power website review widgets.</p>
              </div>
              <span className={`rounded-full px-3 py-1 text-xs font-semibold uppercase tracking-[0.18em] ${googleConnections.length > 0 ? "bg-emerald-50 text-emerald-700" : "bg-slate-100 text-slate-600"}`}>
                {googleConnections.length > 0 ? "Connected" : googleReady ? "Ready" : "Needs config"}
              </span>
            </div>
            <div className="mt-8 space-y-3 rounded-2xl bg-slate-50 px-4 py-4 text-sm text-slate-700">
              <p>
                <span className="font-semibold">OAuth config:</span> {googleReady ? "Present" : "Missing GOOGLE_CLIENT_ID / GOOGLE_CLIENT_SECRET / GOOGLE_OAUTH_REDIRECT_URI"}
              </p>
              <p>
                <span className="font-semibold">Redirect URI:</span> {googleConfig.redirectUri || "Not configured"}
              </p>
              <p>
                <span className="font-semibold">Connections:</span> {googleConnections.length}
              </p>
              <p>
                <span className="font-semibold">Connected locations:</span> {googleConnections.reduce((sum, connection) => sum + connection.locations.length, 0)}
              </p>
              <p>
                <span className="font-semibold">Discovered Google locations:</span> {googleConnections.reduce((sum, connection) => sum + connection.googleLocations.length, 0)}
              </p>
            </div>
            <div className="mt-6 flex gap-3">
              <Link
                href={googleReady ? "/api/integrations/google/connect" : "/integrations"}
                className={`rounded-2xl px-4 py-3 text-sm font-semibold shadow-sm ${googleReady ? "bg-slate-950 !text-white visited:!text-white hover:!text-white" : "border border-slate-200 bg-white text-slate-400"}`}
              >
                Connect Google
              </Link>
            </div>
          </div>

          <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
            <div className="flex items-center justify-between gap-4">
              <div>
                <h3 className="text-xl font-semibold text-slate-950">Facebook</h3>
                <p className="mt-2 text-sm text-slate-600">Bring Facebook reviews into the inbox beside Google feedback.</p>
              </div>
              <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold uppercase tracking-[0.18em] text-slate-600">Not Connected</span>
            </div>
          </div>

          <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
            <div className="flex items-center justify-between gap-4">
              <div>
                <h3 className="text-xl font-semibold text-slate-950">Webhook / Zapier</h3>
                <p className="mt-2 text-sm text-slate-600">Accept appointment_completed and project_completed events to send requests automatically.</p>
              </div>
              <span className="rounded-full bg-emerald-50 px-3 py-1 text-xs font-semibold uppercase tracking-[0.18em] text-emerald-700">Connected</span>
            </div>
          </div>
        </div>

        {googleConnections.length > 0 ? (
          <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
            <h3 className="text-xl font-semibold text-slate-950">Google Connections</h3>
            <div className="mt-6 space-y-4">
              {googleConnections.map((connection) => (
                <div key={connection.id} className="rounded-2xl border border-slate-200 p-4">
                  <p className="font-semibold text-slate-900">{connection.email ?? "Google account pending profile fetch"}</p>
                  <p className="mt-1 text-sm text-slate-600">Organization: {connection.organization.name}</p>
                  <p className="mt-1 text-sm text-slate-600">Mapped locations: {connection.locations.length}</p>
                  <p className="mt-1 text-sm text-slate-600">Available Google locations: {connection.googleLocations.length}</p>
                  <p className="mt-1 text-sm text-slate-600">Sync status: {connection.lastSyncedAt ? "Synced" : "Awaiting first sync"}</p>
                  <p className="mt-1 text-sm text-slate-600">Last synced: {formatRelativeSyncTime(connection.lastSyncedAt)}</p>
                  <p className="mt-1 text-sm text-slate-600">Imported Google reviews: {connection.reviewCount}</p>
                  <p className="mt-1 text-sm text-slate-600">
                    Token health: {connection.tokenStatus === "healthy" ? "Healthy" : connection.tokenStatus === "expiring" ? "Expiring soon" : connection.tokenStatus === "missing_refresh" ? "Needs reconnect" : "Refresh failed"}
                  </p>
                  <GoogleBatchSyncResultCard
                    status={connection.lastBatchSyncStatus}
                    syncedCount={connection.lastBatchSyncedCount}
                    failedCount={connection.lastBatchFailedCount}
                    importedCount={connection.lastBatchImportedCount}
                    updatedCount={connection.lastBatchUpdatedCount}
                    skippedCount={connection.lastBatchSkippedCount}
                    fetchedCount={connection.lastBatchFetchedCount}
                    failedNames={connection.lastBatchFailedNames}
                    message={connection.lastBatchSyncMessage}
                    syncedAt={connection.lastBatchSyncAt}
                  />
                  {connection.fetchError ? <p className="mt-2 text-sm text-amber-700">Location fetch error: {connection.fetchError}</p> : null}
                  {connection.fetchError?.includes("ACCESS_TOKEN_SCOPE_INSUFFICIENT") || connection.fetchError?.includes("insufficient authentication scopes") ? (
                    <div className="mt-3 rounded-2xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-800">
                      This Google account connected without the Business Profile scope needed to load GBP locations. Use <span className="font-semibold">Reconnect / refresh</span>, then approve the requested Google Business permissions again.
                    </div>
                  ) : null}

                  {connection.locations.length > 0 ? (
                    <div className="mt-4 space-y-4">
                      <div className="flex flex-wrap gap-2">
                        <form action={refreshGoogleConnection}>
                          <input type="hidden" name="googleConnectionId" value={connection.id} />
                          <FormSubmitButton
                            idleLabel={connection.tokenStatus === "healthy" ? "Refresh connection" : "Reconnect / refresh"}
                            pendingLabel="Refreshing connection..."
                            className="rounded-2xl border border-indigo-200 bg-indigo-50 px-3 py-2 text-sm font-medium text-indigo-700 hover:border-indigo-300 hover:text-indigo-800 disabled:cursor-not-allowed disabled:border-slate-200 disabled:bg-white disabled:text-slate-400"
                          />
                        </form>
                        <form action={syncAllGoogleReviewsForConnection}>
                          <input type="hidden" name="googleConnectionId" value={connection.id} />
                          <FormSubmitButton
                            idleLabel="Sync all mapped locations"
                            pendingLabel="Syncing connection..."
                            disabled={!connection.locations.some((location) => Boolean(location.googleLocationName))}
                            className="rounded-2xl border border-slate-900 bg-slate-900 px-3 py-2 text-sm font-medium !text-white visited:!text-white hover:!text-white disabled:cursor-not-allowed disabled:border-slate-200 disabled:bg-white disabled:text-slate-400"
                          />
                        </form>
                        <form action={disconnectGoogleConnection}>
                          <input type="hidden" name="googleConnectionId" value={connection.id} />
                          <FormSubmitButton
                            idleLabel="Disconnect"
                            pendingLabel="Disconnecting..."
                            className="rounded-2xl border border-slate-200 bg-white px-3 py-2 text-sm font-medium text-slate-700 hover:border-slate-300 hover:text-slate-950"
                          />
                        </form>
                        <form action={retryFailedGoogleSyncs}>
                          <input type="hidden" name="googleConnectionId" value={connection.id} />
                          <FormSubmitButton
                            idleLabel="Retry failed only"
                            pendingLabel="Retrying failed..."
                            disabled={!connection.locations.some((location) => location.lastSyncStatus === "error" && Boolean(location.googleLocationName))}
                            className="rounded-2xl border border-rose-200 bg-rose-50 px-3 py-2 text-sm font-medium text-rose-700 hover:border-rose-300 hover:text-rose-800 disabled:cursor-not-allowed disabled:border-slate-200 disabled:bg-white disabled:text-slate-400"
                          />
                        </form>
                        {connection.locations.map((location) =>
                          location.googleLocationName ? (
                            <form key={location.id} action={syncGoogleReviewsFromIntegrations}>
                              <input type="hidden" name="locationId" value={location.id} />
                              <FormSubmitButton
                                idleLabel={`${location.name} · Sync now`}
                                pendingLabel={`Syncing ${location.name}...`}
                                className="rounded-2xl border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm font-medium text-emerald-700 hover:border-emerald-300 hover:text-emerald-800 disabled:cursor-not-allowed disabled:opacity-70"
                              />
                            </form>
                          ) : (
                            <Link
                              key={location.id}
                              href={`/locations/${location.id}`}
                              className="rounded-2xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm font-medium text-slate-700 hover:border-slate-300 hover:text-slate-950"
                            >
                              {location.name} · Finish mapping
                            </Link>
                          ),
                        )}
                      </div>

                      <div className="grid gap-3 md:grid-cols-2">
                        {connection.locations.map((location) => (
                          <GoogleLocationSyncStatusCard
                            key={`${location.id}-status`}
                            name={location.name}
                            lastSyncStatus={location.lastSyncStatus}
                            lastSyncAt={location.lastSyncAt}
                            fallbackSyncAt={connection.lastSyncedAt}
                            lastSyncImportedCount={location.lastSyncImportedCount}
                            lastSyncUpdatedCount={location.lastSyncUpdatedCount}
                            lastSyncSkippedCount={location.lastSyncSkippedCount}
                            lastSyncFetchedCount={location.lastSyncFetchedCount}
                            lastSyncMessage={location.lastSyncMessage}
                          />
                        ))}
                      </div>
                    </div>
                  ) : null}

                  {connection.googleLocations.length > 0 ? (
                    <div className="mt-4 rounded-2xl bg-slate-50 p-4">
                      <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">Discovered Google Business Profile locations</p>
                      <div className="mt-3 space-y-3">
                        {connection.googleLocations.map((location) => (
                          <div key={location.name} className="rounded-2xl border border-slate-200 bg-white p-3 text-sm text-slate-700">
                            <p className="font-semibold text-slate-900">{location.title ?? location.name}</p>
                            <p className="mt-1 text-slate-600">Account: {location.accountName ?? location.accountResourceName ?? "Unknown account"}</p>
                            <p className="mt-1 text-slate-600">
                              {[location.storefrontAddress?.locality, location.storefrontAddress?.administrativeArea].filter(Boolean).join(", ") || "Address not available"}
                            </p>
                          </div>
                        ))}
                      </div>
                    </div>
                  ) : null}
                </div>
              ))}
            </div>
          </section>
        ) : null}
      </div>
    </AppShell>
  );
}
