export const dynamic = "force-dynamic";

import Link from "next/link";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { AppShell } from "@/components/app-shell";
import { FormSubmitButton } from "@/components/form-submit-button";
import { deleteLocation, saveAutomationSettings } from "@/app/locations/actions";
import { formatDateTime } from "@/lib/campaigns";
import { buildGoogleSyncSummary, buildLocationSyncErrorMessage } from "@/lib/google-sync-summary";
import { formatRelativeSyncTime, getLocationById, getLocationMappingOptions } from "@/lib/locations";
import { requireLocationAccessPage } from "@/lib/page-guards";
import { deriveLocationStatus, isMiniSiteProfileComplete } from "@/lib/location-status";
import { computeMiniSiteSetupChecklist } from "@/lib/minisite-setup";
import { getMiniSiteAnalytics } from "@/lib/review-link-analytics";
import { getLocationRequestPerformance } from "@/lib/request-performance";
import { type ReviewFilter } from "@/lib/review-filtering";
import { LocationHeader } from "./_components/location-header";
import { SummaryCards, type SummaryCardsData } from "./_components/summary-cards";
import { MiniSitePreview } from "./_components/minisite-preview";
import { MiniSiteSettings } from "./_components/minisite-settings";
import { ReviewAssistantSettings } from "./_components/review-assistant-settings";
import { ResolutionSettings } from "./_components/resolution-settings";
import { LocationReviewsPanel } from "./_components/location-reviews-panel";
import { RequestPerformance } from "./_components/request-performance";
import { ConnectedSources, type SourceRow } from "./_components/connected-sources";
import { LocationDetailsCard } from "./_components/location-details-card";
import { LocationTabs, type LocationTab } from "./_components/location-tabs";
import { Icon } from "@/components/icon";

export default async function LocationDetailPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
}) {
  const { id } = await params;
  const query = (await searchParams) ?? {};
  await requireLocationAccessPage(id);
  const location = await getLocationById(id);

  if (!location) {
    notFound();
  }

  const mappingOptions = await getLocationMappingOptions(location.id);
  const lastSyncedLabel = formatRelativeSyncTime(location.lastSyncAt ?? location.googleConnection?.lastSyncedAt);
  const syncState = typeof query.sync === "string" ? query.sync : undefined;
  const syncMessage = typeof query.message === "string" ? query.message : undefined;
  const flash = typeof query.flash === "string" ? query.flash : null;
  const tone = typeof query.tone === "string" && ["success", "error", "info"].includes(query.tone) ? (query.tone as "success" | "error" | "info") : "success";
  const createdCount = typeof query.created === "string" ? Number(query.created) : 0;
  const updatedCount = typeof query.updated === "string" ? Number(query.updated) : 0;
  const skippedCount = typeof query.skipped === "string" ? Number(query.skipped) : 0;
  const totalCount = typeof query.total === "string" ? Number(query.total) : 0;

  // ── Derived data ────────────────────────────────────────────────────────
  const profile = location.publicProfile;
  const connectedSources = [
    location.googleLocationName ? "Google" : null,
    location.yelpBusinessId ? "Yelp" : null,
    profile?.facebookUrl ? "Facebook" : null,
  ].filter(Boolean) as string[];
  const hasConnectedSource = connectedSources.length > 0;
  const profileComplete = isMiniSiteProfileComplete({ phone: profile?.phone ?? null, websiteUrl: profile?.websiteUrl ?? null });
  const hasFeaturedReview = location.reviews.some((r) => r.isFeatured);
  const status = deriveLocationStatus({
    miniSitePublished: location.miniSitePublished,
    miniSitePublishedAt: location.miniSitePublishedAt,
    hasConnectedSource,
    profileComplete,
  });
  const checklist = computeMiniSiteSetupChecklist({
    phone: profile?.phone ?? null,
    websiteUrl: profile?.websiteUrl ?? null,
    hasConnectedSource,
    hasFeaturedReview,
    miniSitePublished: location.miniSitePublished,
  });
  const analytics = await getMiniSiteAnalytics(location.id, 30);
  const perf = getLocationRequestPerformance(location);
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL?.replace(/\/$/, "") ?? "";
  const publicUrl = `${baseUrl}/b/${location.slug}`;
  const activeFilter = (typeof query.reviewFilter === "string" ? query.reviewFilter : "all") as ReviewFilter;
  const now = new Date();
  const newReviewsThisMonth = location.reviews.filter((r) => r.reviewedAt && r.reviewedAt.getMonth() === now.getMonth() && r.reviewedAt.getFullYear() === now.getFullYear()).length;
  const pendingReplies = location.reviews.filter((r) => !r.replyPublishedAt && !r.replySentAt).length;

  // ── ConnectedSources SourceRow[] ────────────────────────────────────────
  const sources: SourceRow[] = [
    {
      key: "google",
      label: "Google",
      connected: Boolean(location.googleLocationName),
      lastSyncedLabel: lastSyncedLabel ?? null,
      reviewsImported: location.googleReviewCount,
      rating: location.avgRating ?? null,
      syncStatus: location.lastSyncStatus ?? null,
      comingSoon: false,
    },
    {
      key: "yelp",
      label: "Yelp",
      connected: Boolean(location.yelpBusinessId),
      lastSyncedLabel: location.yelpLastSyncAt ? formatRelativeSyncTime(location.yelpLastSyncAt) ?? null : null,
      reviewsImported: location.yelpLastSyncCount ?? null,
      rating: null,
      syncStatus: location.yelpLastSyncStatus ?? null,
      comingSoon: false,
    },
    {
      key: "facebook",
      label: "Facebook",
      connected: false,
      lastSyncedLabel: null,
      reviewsImported: null,
      rating: null,
      syncStatus: null,
      comingSoon: false,
    },
    {
      key: "trustpilot",
      label: "Trustpilot",
      connected: false,
      lastSyncedLabel: null,
      reviewsImported: null,
      rating: null,
      syncStatus: null,
      comingSoon: true,
    },
  ];

  // ── LocationDetailsCard details ──────────────────────────────────────────
  const addressParts = [
    profile?.addressLine1,
    profile?.addressLine2,
    location.city,
    location.state,
    profile?.postalCode,
  ].filter(Boolean);
  const team = location.managerName ? [location.managerName] : [];

  const summaryCardsData: SummaryCardsData = {
    avgRating: location.avgRating ?? null,
    totalReviews: location.reviews.length,
    newReviewsThisMonth,
    pendingReplies,
    requestConversion: perf.conversionRate,
    pageViews: analytics.hasData ? analytics.pageViews : null,
    directionClicks: analytics.hasData ? analytics.directionsClicks : null,
    callClicks: analytics.hasData ? analytics.callClicks : null,
    websiteClicks: analytics.hasData ? analytics.websiteClicks : null,
  };

  const VALID_TABS: LocationTab[] = ["public", "settings", "assistant", "resolution", "reviews", "requests", "sources", "details"];
  const resolutionSettings = await prisma.resolutionAssistantSettings.findUnique({ where: { locationId: location.id } });
  const tab: LocationTab = typeof query.tab === "string" && (VALID_TABS as string[]).includes(query.tab) ? (query.tab as LocationTab) : "public";
  const incompleteSteps = checklist.filter((item) => !item.done);

  return (
    <AppShell activeScreen="locations" flash={flash ? { message: flash, tone } : null}>
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

        <LocationHeader
          location={location}
          publicUrl={publicUrl}
          status={status}
          connectedSources={connectedSources}
          avgRating={location.avgRating ?? null}
          totalReviews={location.reviews.length}
          published={location.miniSitePublished}
        />

        <SummaryCards data={summaryCardsData} />

        {incompleteSteps.length > 0 ? (
          <div className="flex flex-wrap items-center gap-3 rounded-2xl border border-[var(--warning)] bg-[var(--warning-soft)] px-5 py-4">
            <span className="grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-white/70 text-[#92400e]">
              <Icon name="bell" size={18} />
            </span>
            <div className="min-w-0 flex-1">
              <p className="text-sm font-semibold text-[#92400e]">This mini page needs setup before it can be published</p>
              <p className="mt-0.5 text-xs text-[#92400e]/80">
                {incompleteSteps.length} step{incompleteSteps.length > 1 ? "s" : ""} remaining: {incompleteSteps.map((s) => s.label).join(" · ")}
              </p>
            </div>
            <Link
              href="?tab=settings"
              scroll={false}
              className="shrink-0 rounded-xl bg-[var(--accent)] px-3.5 py-2 text-sm font-semibold !text-white hover:bg-[var(--accent-strong)]"
            >
              Finish setup
            </Link>
          </div>
        ) : null}

        <LocationTabs activeTab={tab} reviewCount={location.reviews.length} />

        {tab === "public" ? (
          <MiniSitePreview
            locationId={location.id}
            publicUrl={publicUrl}
            published={location.miniSitePublished}
            lastUpdated={profile?.updatedAt ? formatDateTime(profile.updatedAt) : "—"}
            checklist={checklist}
          />
        ) : null}

        {tab === "settings" ? (
          <div className="space-y-6">
            <MiniSiteSettings location={location} profile={profile ?? null} />
          </div>
        ) : null}

        {tab === "assistant" ? (
          <ReviewAssistantSettings location={location} profile={profile ?? null} />
        ) : null}

        {tab === "resolution" ? (
          <ResolutionSettings locationId={location.id} profile={profile ?? null} settings={resolutionSettings} />
        ) : null}

        {tab === "reviews" ? (
          <LocationReviewsPanel
            reviews={location.reviews}
            locationId={location.id}
            activeFilter={activeFilter}
          />
        ) : null}

        {tab === "requests" ? (
          <div className="space-y-6">
            <RequestPerformance perf={perf} locationId={location.id} />

            {/* Review Link section */}
            <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
              <p className="text-sm font-semibold uppercase tracking-[0.22em] text-indigo-600">Review Link</p>
              <h3 className="mt-2 text-xl font-semibold text-slate-950">Anonymous review link</h3>
              <p className="mt-2 text-sm text-slate-500">
                Share this link in email signatures, QR codes, or anywhere else you want to collect reviews.
              </p>
              <div className="mt-4 flex items-center gap-3">
                <code className="flex-1 rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-xs font-mono text-slate-700 truncate">
                  {`${process.env.NEXT_PUBLIC_APP_URL?.replace(/\/$/, "") ?? ""}/review/${location.slug}`}
                </code>
              </div>
              {!location.reviewLink && !location.googlePlaceId && (
                <p className="mt-3 text-xs text-amber-600">
                  ⚠ No Google review URL configured. Happy-path redirection will be disabled until a Google Place ID or review URL is set.
                </p>
              )}
            </section>
          </div>
        ) : null}

        {tab === "sources" ? (
          <div className="space-y-6">
            <ConnectedSources
              sources={sources}
              location={location}
              mappingOptions={mappingOptions}
            />

            {/* Google Reply Automation section */}
            <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
              <div className="flex items-center justify-between gap-4">
                <div>
                  <h3 className="text-xl font-semibold text-slate-950">Google Reply Automation</h3>
                  <p className="mt-2 text-sm text-slate-600">
                    Automatically send AI-generated replies to new Google reviews matching your criteria.
                  </p>
                </div>
              </div>

              <form action={saveAutomationSettings} className="mt-6 space-y-6">
                <input type="hidden" name="locationId" value={location.id} />

                <div className="space-y-4 rounded-2xl border border-slate-200 bg-slate-50 p-4">
                  <label className="flex items-center gap-3 cursor-pointer">
                    <input
                      type="checkbox"
                      name="googleAutoReplyEnabled"
                      value="true"
                      defaultChecked={location.googleAutoReplyEnabled ?? false}
                      className="h-4 w-4 rounded border-slate-300"
                    />
                    <span className="text-sm font-semibold text-slate-700">Enable automatic replies to Google reviews</span>
                  </label>

                  {location.googleAutoReplyEnabled && (
                    <div className="space-y-4 border-t border-slate-200 pt-4">
                      <div className="grid gap-4 md:grid-cols-2">
                        <label className="grid gap-2 text-sm font-semibold text-slate-700">
                          Minimum Rating to Auto-Send
                          <select name="googleAutoReplyThreshold" defaultValue={String(location.googleAutoReplyThreshold ?? 4)} className="rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm font-normal text-slate-700">
                            <option value="1">1+ stars (all reviews)</option>
                            <option value="2">2+ stars</option>
                            <option value="3">3+ stars</option>
                            <option value="4">4+ stars (default, positive reviews)</option>
                            <option value="5">5 stars only</option>
                          </select>
                          <span className="text-xs text-slate-500">Auto-send replies only to reviews with rating ≥ this threshold</span>
                        </label>

                        <label className="grid gap-2 text-sm font-semibold text-slate-700">
                          Daily Auto-Send Cap
                          <input
                            type="number"
                            name="googleAutoReplyDailyCap"
                            min="0"
                            max="100"
                            defaultValue={location.googleAutoReplyDailyCap ?? 0}
                            className="rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm font-normal text-slate-700"
                          />
                          <span className="text-xs text-slate-500">0 = unlimited. Caps reset at midnight UTC.</span>
                        </label>
                      </div>

                      {location.googleAutoReplyLastUsedAt && (
                        <div className="text-xs text-slate-600">
                          Last auto-send: {formatDateTime(location.googleAutoReplyLastUsedAt)}
                        </div>
                      )}

                      <div className="rounded-2xl bg-blue-50 p-3 text-sm text-blue-700">
                        <p className="font-semibold">ℹ️ How it works:</p>
                        <ul className="mt-2 space-y-1 pl-4 text-xs">
                          <li>• New Google reviews are checked against these settings</li>
                          <li>• AI generates a draft reply if needed</li>
                          <li>• Safety checks run automatically (blocks medical, legal, discrimination content)</li>
                          <li>• Only reviews matching the rating threshold are sent automatically</li>
                          <li>• All auto-sends are logged in audit trail</li>
                          <li>• You can still manually review/edit replies in the inbox</li>
                        </ul>
                      </div>
                    </div>
                  )}
                </div>

                <FormSubmitButton
                  idleLabel="Save Automation Settings"
                  pendingLabel="Saving..."
                  className="rounded-2xl bg-slate-950 px-4 py-3 text-sm font-semibold !text-white shadow-sm visited:!text-white hover:!text-white"
                />
              </form>
            </section>
          </div>
        ) : null}

        {tab === "details" ? (
          <div className="space-y-6">
            <LocationDetailsCard
              details={{
                address: addressParts.join(", "),
                phone: profile?.phone ?? null,
                website: profile?.websiteUrl ?? null,
                hours: profile?.googleHours ?? null,
                timezone: profile?.timezone ?? null,
                locationId: location.id,
                createdAt: location.createdAt,
                updatedAt: location.updatedAt,
                lastSyncedAt: location.lastSyncAt ?? location.googleConnection?.lastSyncedAt ?? null,
                team,
              }}
            />

            {/* Danger Zone section */}
            <section className="rounded-3xl border border-rose-200 bg-rose-50 p-6 shadow-sm">
              <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
                <div>
                  <h3 className="text-xl font-semibold text-rose-900">Danger Zone</h3>
                  <p className="mt-2 max-w-3xl text-sm text-rose-800">
                    Deleting this location will permanently remove its public profile, campaigns, contacts, reviews, and other location-specific data.
                  </p>
                </div>
                <form action={deleteLocation}>
                  <input type="hidden" name="locationId" value={location.id} />
                  <FormSubmitButton
                    idleLabel="Delete Location"
                    pendingLabel="Deleting..."
                    className="rounded-2xl bg-rose-600 px-5 py-3 text-sm font-semibold !text-white shadow-sm visited:!text-white hover:!text-white"
                  />
                </form>
              </div>
            </section>
          </div>
        ) : null}
      </div>
    </AppShell>
  );
}
