"use server";

import Link from "next/link";
import {
  disconnectGoogleConnection,
  linkFacebookPageToLocation,
  refreshGoogleConnection,
  retryFailedGoogleSyncs,
  syncAllGoogleReviewsForConnection,
  syncFacebookReviews,
  syncGoogleReviewsFromIntegrations,
  unlinkFacebookPage,
} from "@/app/locations/actions";
import { AppShell } from "@/components/app-shell";
import { FormSubmitButton } from "@/components/form-submit-button";
import { GoogleBatchSyncResultCard } from "@/components/google-batch-sync-result-card";
import { GoogleLocationSyncStatusCard } from "@/components/google-location-sync-status-card";
import { GoogleLocationsSearchList } from "@/components/google-locations-search-list";
import { GoogleSyncBanner } from "@/components/google-sync-banner";
import { getFacebookConnections, getFacebookOAuthConfig } from "@/lib/facebook-oauth";
import { getGoogleConnections, getGoogleOAuthConfig } from "@/lib/google-oauth";
import { formatRelativeSyncTime } from "@/lib/locations";
import { requireActiveMembershipPage } from "@/lib/page-guards";
import { prisma } from "@/lib/prisma";

export default async function IntegrationsPage({ searchParams }: { searchParams?: Promise<Record<string, string | string[] | undefined>> }) {
  const params = (await searchParams) ?? {};

  // Google banner params
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

  // Facebook banner params
  const facebookState = typeof params.facebook === "string" ? params.facebook : undefined;
  const fbCreated = typeof params.created === "string" ? Number(params.created) : 0;
  const fbUpdated = typeof params.updated === "string" ? Number(params.updated) : 0;
  const fbTotal = typeof params.total === "string" ? Number(params.total) : 0;

  const membership = await requireActiveMembershipPage();
  const googleConnections = await getGoogleConnections(membership.organizationId);
  const googleConfig = getGoogleOAuthConfig();
  const googleReady = Boolean(googleConfig.clientId && googleConfig.clientSecret && googleConfig.redirectUri);

  const facebookConnections = await getFacebookConnections(membership.organizationId);
  const facebookConfig = getFacebookOAuthConfig();
  const facebookReady = Boolean(facebookConfig.appId && facebookConfig.appSecret);

  // Load all org locations for the page-picker dropdown.
  const orgLocations = await prisma.location.findMany({
    where: { organizationId: membership.organizationId },
    select: { id: true, name: true },
    orderBy: { name: "asc" },
  });

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

        {/* Facebook banner */}
        {facebookState && (
          <div
            className={`rounded-2xl px-4 py-3 text-sm font-medium ${
              facebookState === "connected"
                ? "bg-emerald-50 text-emerald-800"
                : facebookState === "disconnected"
                  ? "bg-slate-100 text-slate-700"
                  : facebookState === "sync-success"
                    ? "bg-emerald-50 text-emerald-800"
                    : facebookState === "linked" || facebookState === "unlinked"
                      ? "bg-indigo-50 text-indigo-800"
                      : "bg-rose-50 text-rose-800"
            }`}
          >
            {facebookState === "connected" && "Facebook connected successfully. Your pages are ready to link to locations."}
            {facebookState === "disconnected" && "Facebook connection removed."}
            {facebookState === "sync-success" && `Facebook sync complete — ${fbCreated} imported, ${fbUpdated} updated, ${fbTotal} fetched.`}
            {facebookState === "linked" && "Facebook page linked to location."}
            {facebookState === "unlinked" && "Facebook page unlinked from location."}
            {facebookState === "error" && `Facebook error: ${syncMessage ?? "unknown error"}`}
            {facebookState === "sync-error" && `Facebook sync failed: ${syncMessage ?? "unknown error"}`}
            {facebookState === "callback_failed" && "Facebook OAuth callback failed. Please try connecting again."}
            {facebookState === "invalid_state" && "Facebook OAuth state was invalid or expired. Please try again."}
            {facebookState === "missing_params" && "Facebook OAuth response was missing required parameters."}
          </div>
        )}

        {/* Top cards grid */}
        <div className="grid gap-6 md:grid-cols-2 xl:grid-cols-3">
          {/* Google card */}
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

          {/* Facebook card */}
          <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
            <div className="flex items-center justify-between gap-4">
              <div>
                <h3 className="text-xl font-semibold text-slate-950">Facebook</h3>
                <p className="mt-2 text-sm text-slate-600">Bring Facebook Page reviews into the inbox beside Google feedback.</p>
              </div>
              <span
                className={`rounded-full px-3 py-1 text-xs font-semibold uppercase tracking-[0.18em] ${
                  facebookConnections.length > 0 ? "bg-emerald-50 text-emerald-700" : facebookReady ? "bg-slate-100 text-slate-600" : "bg-amber-50 text-amber-700"
                }`}
              >
                {facebookConnections.length > 0 ? "Connected" : facebookReady ? "Ready" : "Needs config"}
              </span>
            </div>
            <div className="mt-8 space-y-3 rounded-2xl bg-slate-50 px-4 py-4 text-sm text-slate-700">
              <p>
                <span className="font-semibold">App config:</span> {facebookReady ? "Present" : "Missing FACEBOOK_APP_ID / FACEBOOK_APP_SECRET"}
              </p>
              <p>
                <span className="font-semibold">Connections:</span> {facebookConnections.length}
              </p>
              <p>
                <span className="font-semibold">Linked pages:</span> {facebookConnections.reduce((sum, c) => sum + c.pages.filter((p) => p.locationId).length, 0)}
              </p>
              <p>
                <span className="font-semibold">Imported reviews:</span> {facebookConnections.reduce((sum, c) => sum + c.reviewCount, 0)}
              </p>
            </div>
            <div className="mt-6 flex gap-3">
              <Link
                href={facebookReady ? "/api/integrations/facebook/connect" : "/integrations"}
                className={`rounded-2xl px-4 py-3 text-sm font-semibold shadow-sm ${facebookReady ? "bg-[#1877F2] !text-white visited:!text-white hover:!text-white hover:bg-[#166FE5]" : "border border-slate-200 bg-white text-slate-400"}`}
              >
                {facebookConnections.length > 0 ? "Reconnect Facebook" : "Connect Facebook"}
              </Link>
            </div>
          </div>

          {/* Webhook card */}
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

        {/* Google connections section */}
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
                      This Google account connected without the Business Profile scope needed to load GBP locations. Use the <span className="font-semibold">Reconnect / refresh</span> button below, then approve the requested Google Business permissions again.
                    </div>
                  ) : null}

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

                  {connection.googleLocations.length > 0 ? (
                    <GoogleLocationsSearchList googleLocations={connection.googleLocations} />
                  ) : null}
                </div>
              ))}
            </div>
          </section>
        ) : null}

        {/* Facebook connections section */}
        {facebookConnections.length > 0 ? (
          <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
            <h3 className="text-xl font-semibold text-slate-950">Facebook Connections</h3>
            <div className="mt-6 space-y-6">
              {facebookConnections.map((connection) => (
                <div key={connection.id} className="rounded-2xl border border-slate-200 p-4">
                  <div className="flex items-start justify-between gap-4">
                    <div>
                      <p className="font-semibold text-slate-900">{connection.userName ?? "Facebook account"}</p>
                      {connection.userEmail ? <p className="mt-0.5 text-sm text-slate-500">{connection.userEmail}</p> : null}
                      <p className="mt-1 text-sm text-slate-600">Last synced: {formatRelativeSyncTime(connection.lastSyncedAt)}</p>
                      <p className="mt-1 text-sm text-slate-600">Imported Facebook reviews: {connection.reviewCount}</p>
                      {connection.lastSyncStatus === "error" && connection.lastSyncMessage ? (
                        <p className="mt-1 text-sm text-rose-600">Sync error: {connection.lastSyncMessage}</p>
                      ) : null}
                    </div>
                    <Link
                      href={`/api/integrations/facebook/disconnect?connectionId=${connection.id}`}
                      className="shrink-0 rounded-2xl border border-slate-200 bg-white px-3 py-2 text-sm font-medium text-slate-700 hover:border-slate-300 hover:text-slate-950"
                    >
                      Disconnect
                    </Link>
                  </div>

                  {connection.fetchError ? (
                    <div className="mt-3 rounded-2xl border border-amber-200 bg-amber-50 p-3 text-sm text-amber-800">
                      Could not load Facebook pages: {connection.fetchError}. Try reconnecting.
                    </div>
                  ) : null}

                  {/* Pages list */}
                  {connection.pages.length > 0 ? (
                    <div className="mt-4">
                      <p className="text-sm font-semibold text-slate-700">Your Facebook Pages</p>
                      <div className="mt-3 space-y-3">
                        {connection.pages.map((page) => (
                          <div key={page.id} className="flex items-center justify-between gap-4 rounded-2xl border border-slate-100 bg-slate-50 px-4 py-3">
                            <div className="min-w-0">
                              <p className="truncate font-medium text-slate-900">{page.pageName}</p>
                              <p className="mt-0.5 text-xs text-slate-500">Page ID: {page.pageId}</p>
                              {page.location ? (
                                <p className="mt-0.5 text-xs text-emerald-700">
                                  Linked to: <span className="font-medium">{page.location.name}</span>
                                  {page.lastSyncedAt ? ` · Last synced ${formatRelativeSyncTime(page.lastSyncedAt)}` : ""}
                                </p>
                              ) : (
                                <p className="mt-0.5 text-xs text-slate-400">Not linked to a location</p>
                              )}
                              {page.lastSyncStatus === "error" && page.lastSyncMessage ? (
                                <p className="mt-0.5 text-xs text-rose-600">{page.lastSyncMessage}</p>
                              ) : null}
                            </div>
                            <div className="flex shrink-0 flex-wrap gap-2">
                              {page.location ? (
                                <>
                                  <form action={syncFacebookReviews}>
                                    <input type="hidden" name="locationId" value={page.location.id} />
                                    <FormSubmitButton
                                      idleLabel="Sync now"
                                      pendingLabel="Syncing..."
                                      className="rounded-2xl border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm font-medium text-emerald-700 hover:border-emerald-300 hover:text-emerald-800"
                                    />
                                  </form>
                                  <form action={unlinkFacebookPage}>
                                    <input type="hidden" name="facebookPageId" value={page.id} />
                                    <FormSubmitButton
                                      idleLabel="Unlink"
                                      pendingLabel="Unlinking..."
                                      className="rounded-2xl border border-slate-200 bg-white px-3 py-2 text-sm font-medium text-slate-600 hover:border-slate-300 hover:text-slate-950"
                                    />
                                  </form>
                                </>
                              ) : (
                                <form action={linkFacebookPageToLocation} className="flex items-center gap-2">
                                  <input type="hidden" name="facebookPageId" value={page.id} />
                                  <select
                                    name="locationId"
                                    className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-700 focus:border-indigo-400 focus:outline-none focus:ring-1 focus:ring-indigo-400"
                                    defaultValue=""
                                  >
                                    <option value="" disabled>Pick a location…</option>
                                    {orgLocations.map((loc) => (
                                      <option key={loc.id} value={loc.id}>{loc.name}</option>
                                    ))}
                                  </select>
                                  <FormSubmitButton
                                    idleLabel="Link &amp; sync"
                                    pendingLabel="Linking..."
                                    className="rounded-2xl border border-[#1877F2] bg-[#1877F2] px-3 py-2 text-sm font-medium !text-white visited:!text-white hover:bg-[#166FE5] hover:!text-white"
                                  />
                                </form>
                              )}
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  ) : (
                    <p className="mt-4 text-sm text-slate-500">No Facebook Pages found for this account. Make sure you manage at least one Page.</p>
                  )}

                  {/* Pages available from API but not yet saved */}
                  {connection.facebookPages.length > connection.pages.length ? (
                    <div className="mt-4 rounded-2xl border border-indigo-100 bg-indigo-50 p-3 text-sm text-indigo-800">
                      {connection.facebookPages.length - connection.pages.length} additional page(s) found on your Facebook account.{" "}
                      <Link href="/api/integrations/facebook/connect" className="font-semibold underline">
                        Reconnect
                      </Link>{" "}
                      to import them.
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
