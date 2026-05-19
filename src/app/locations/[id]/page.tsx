export const dynamic = "force-dynamic";

import Link from "next/link";
import { notFound } from "next/navigation";
import { AppShell } from "@/components/app-shell";
import { FormSubmitButton } from "@/components/form-submit-button";
import { Field, OutcomeCard, StatCard } from "@/components/ui";
import { deleteLocation, mapLocationToGoogle, refreshGoogleLocationDetails, saveLocationSettings, syncGoogleReviews } from "@/app/locations/actions";
import { formatCampaignStatus, formatDateTime } from "@/lib/campaigns";
import { formatPreferredChannel } from "@/lib/contacts";
import { buildGoogleLastSyncResultSummary, buildGoogleSyncSummary, buildLocationSyncErrorMessage } from "@/lib/google-sync-summary";
import { buildGoogleWriteReviewLink, formatRelativeSyncTime, getLocationById, getLocationMappingOptions } from "@/lib/locations";
import { requireLocationAccessPage } from "@/lib/page-guards";

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
  const requestCount = location.campaigns.reduce((sum, campaign) => sum + campaign.recipients.length, 0);
  const publicProfile = location.publicProfile;
  const derivedReviewLink = location.reviewLink ?? buildGoogleWriteReviewLink(location.googlePlaceId);
  const lastSyncedLabel = formatRelativeSyncTime(location.lastSyncAt ?? location.googleConnection?.lastSyncedAt);
  const lastSyncedMeta = location.lastSyncAt
    ? formatDateTime(location.lastSyncAt)
    : location.googleConnection?.lastSyncedAt
      ? formatDateTime(location.googleConnection.lastSyncedAt)
      : "Run a review sync after mapping Google";
  const syncState = typeof query.sync === "string" ? query.sync : undefined;
  const syncMessage = typeof query.message === "string" ? query.message : undefined;
  const flash = typeof query.flash === "string" ? query.flash : null;
  const tone = typeof query.tone === "string" && ["success", "error", "info"].includes(query.tone) ? (query.tone as "success" | "error" | "info") : "success";
  const createdCount = typeof query.created === "string" ? Number(query.created) : 0;
  const updatedCount = typeof query.updated === "string" ? Number(query.updated) : 0;
  const skippedCount = typeof query.skipped === "string" ? Number(query.skipped) : 0;
  const totalCount = typeof query.total === "string" ? Number(query.total) : 0;

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

        <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <Link href="/locations" className="text-sm font-semibold text-indigo-600">
              ← Back to locations
            </Link>
            <p className="mt-4 text-sm font-semibold uppercase tracking-[0.22em] text-indigo-600">Location Detail</p>
            <h2 className="mt-2 text-4xl font-semibold tracking-tight text-slate-950">{location.name}</h2>
            <p className="mt-3 max-w-3xl text-slate-600">
              A location-specific operating view with local review links, assigned contacts, request activity, and launch readiness.
            </p>
          </div>
          <div className="flex gap-3">
            <Link href={`/b/${location.slug}`} target="_blank" rel="noreferrer" className="rounded-2xl border border-slate-200 bg-white px-5 py-3 text-sm font-semibold text-slate-700 shadow-sm">
              Open Mini-site
            </Link>
            <Link href="/campaigns/new" className="rounded-2xl bg-slate-950 px-5 py-3 text-sm font-semibold !text-white shadow-sm visited:!text-white hover:!text-white">
              Send Local Request
            </Link>
          </div>
        </div>

        <div className="grid gap-4 xl:grid-cols-4">
          <StatCard title="Status" value={location.status} meta={`${location.city}, ${location.state}`} />
          <StatCard title="Average Rating" value={location.avgRating ? `${location.avgRating.toFixed(1)} ★` : "No rating"} meta="Location reputation score" />
          <StatCard title="Managed Contacts" value={String(location.contacts.length)} meta="Contacts currently assigned here" />
          <StatCard title="Last Synced" value={lastSyncedLabel} meta={lastSyncedMeta} />
        </div>

        <div className="grid gap-6 xl:grid-cols-5 xl:items-start">
          <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm xl:col-span-3">
            <div className="flex items-center justify-between gap-4">
              <div>
                <h3 className="text-xl font-semibold text-slate-950">Location Settings</h3>
                <p className="mt-2 text-sm text-slate-600">Manage both the business record and customer-facing mini-site from one place.</p>
              </div>
              <Link href={`/b/${location.slug}`} target="_blank" rel="noreferrer" className="shrink-0 text-sm font-semibold text-indigo-600">
                View mini-site
              </Link>
            </div>

            <form action={saveLocationSettings} className="mt-6 space-y-8">
              <input type="hidden" name="locationId" value={location.id} />

              <div className="space-y-4">
                <div>
                  <p className="text-sm font-semibold uppercase tracking-[0.18em] text-slate-500">Business</p>
                  <p className="mt-1 text-sm text-slate-600">Core business identity and operational fields for this location.</p>
                </div>

                <div className="grid gap-4 md:grid-cols-2">
                  <label className="grid gap-2 text-sm font-semibold text-slate-700">
                    Location Name
                    <input name="name" defaultValue={location.name} className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm font-normal text-slate-700" />
                  </label>
                  <label className="grid gap-2 text-sm font-semibold text-slate-700">
                    Manager
                    <input name="managerName" defaultValue={location.managerName ?? ""} placeholder="Store manager or operator" className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm font-normal text-slate-700" />
                  </label>
                  <label className="grid gap-2 text-sm font-semibold text-slate-700">
                    City
                    <input name="city" defaultValue={location.city} className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm font-normal text-slate-700" />
                  </label>
                  <label className="grid gap-2 text-sm font-semibold text-slate-700">
                    State
                    <input name="state" defaultValue={location.state} className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm font-normal text-slate-700" />
                  </label>
                  <label className="grid gap-2 text-sm font-semibold text-slate-700">
                    Status
                    <input name="status" defaultValue={location.status} className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm font-normal text-slate-700" />
                  </label>
                  <Field label="Current Slug" value={location.slug} />
                </div>
              </div>

              <div className="space-y-4 border-t border-slate-200 pt-6">
                <div>
                  <p className="text-sm font-semibold uppercase tracking-[0.18em] text-slate-500">Public Presence</p>
                  <p className="mt-1 text-sm text-slate-600">Customer-facing content, business contact info, and local landing page details.</p>
                </div>

                <div className="grid gap-4 md:grid-cols-2">
                  <label className="grid gap-2 text-sm font-semibold text-slate-700">
                    Headline
                    <input name="headline" defaultValue={publicProfile?.headline ?? location.name} className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm font-normal text-slate-700" />
                  </label>
                  <label className="grid gap-2 text-sm font-semibold text-slate-700">
                    Business Type
                    <input name="businessType" defaultValue={publicProfile?.businessType ?? "LocalBusiness"} className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm font-normal text-slate-700" />
                  </label>
                  <label className="grid gap-2 text-sm font-semibold text-slate-700 md:col-span-2">
                    Subheadline
                    <textarea name="subheadline" defaultValue={publicProfile?.subheadline ?? ""} className="min-h-24 rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm font-normal leading-7 text-slate-700" />
                  </label>
                  <label className="grid gap-2 text-sm font-semibold text-slate-700">
                    Phone
                    <input name="phone" defaultValue={publicProfile?.phone ?? ""} className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm font-normal text-slate-700" />
                  </label>
                  <label className="grid gap-2 text-sm font-semibold text-slate-700">
                    Email
                    <input name="email" defaultValue={publicProfile?.email ?? ""} className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm font-normal text-slate-700" />
                  </label>
                  <label className="grid gap-2 text-sm font-semibold text-slate-700">
                    Address Line 1
                    <input name="addressLine1" defaultValue={publicProfile?.addressLine1 ?? ""} className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm font-normal text-slate-700" />
                  </label>
                  <label className="grid gap-2 text-sm font-semibold text-slate-700">
                    Address Line 2
                    <input name="addressLine2" defaultValue={publicProfile?.addressLine2 ?? ""} className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm font-normal text-slate-700" />
                  </label>
                  <label className="grid gap-2 text-sm font-semibold text-slate-700">
                    Postal Code
                    <input name="postalCode" defaultValue={publicProfile?.postalCode ?? ""} className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm font-normal text-slate-700" />
                  </label>
                  <label className="grid gap-2 text-sm font-semibold text-slate-700">
                    Custom Domain
                    <input name="customDomain" defaultValue={publicProfile?.customDomain ?? ""} className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm font-normal text-slate-700" />
                  </label>
                  <div className="grid gap-2 text-sm font-semibold text-slate-700 md:col-span-2">
                    <span>Logo</span>
                    <input type="hidden" name="existingLogoUrl" value={publicProfile?.logoUrl ?? ""} />
                    <input name="logoFile" type="file" accept="image/png,image/jpeg,image/webp,image/svg+xml" className="rounded-2xl border border-dashed border-slate-300 bg-slate-50 px-4 py-3 text-sm font-normal text-slate-700 file:mr-3 file:rounded-xl file:border-0 file:bg-slate-900 file:px-3 file:py-2 file:text-sm file:font-semibold file:text-white" />
                    {publicProfile?.logoUrl ? (
                      <div className="flex items-center gap-4 rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3">
                        <img src={publicProfile.logoUrl} alt={`${location.name} logo`} className="h-14 w-14 rounded-2xl object-contain" />
                        <p className="text-sm font-normal text-slate-600">Current logo will stay in place unless you upload a new one.</p>
                      </div>
                    ) : (
                      <p className="text-sm font-normal text-slate-500">Upload a logo for the mini-site and funnel pages.</p>
                    )}
                  </div>
                  <div className="grid gap-2 text-sm font-semibold text-slate-700 md:col-span-2">
                    <span>Cover image <span className="font-normal text-slate-400">(shown as hero banner on mini-site)</span></span>
                    <input type="hidden" name="existingHeroImageUrl" value={publicProfile?.heroImageUrl ?? ""} />
                    <input name="heroImageFile" type="file" accept="image/png,image/jpeg,image/webp" className="rounded-2xl border border-dashed border-slate-300 bg-slate-50 px-4 py-3 text-sm font-normal text-slate-700 file:mr-3 file:rounded-xl file:border-0 file:bg-slate-900 file:px-3 file:py-2 file:text-sm file:font-semibold file:text-white" />
                    {publicProfile?.heroImageUrl ? (
                      <div className="flex items-center gap-4 rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3">
                        <img src={publicProfile.heroImageUrl} alt="Cover" className="h-14 w-24 rounded-xl object-cover" />
                        <p className="text-sm font-normal text-slate-600">Current cover image. Upload a new one to replace it.</p>
                      </div>
                    ) : (
                      <p className="text-sm font-normal text-slate-500">Recommended: 1200×400px or wider. Shows as the banner at the top of your mini-site.</p>
                    )}
                  </div>
                </div>
              </div>

              <div className="space-y-4 border-t border-slate-200 pt-6">
                <div>
                  <p className="text-sm font-semibold uppercase tracking-[0.18em] text-slate-500">Conversion & Actions</p>
                  <p className="mt-1 text-sm text-slate-600">Where customers are sent next from the mini-site and review funnel.</p>
                </div>

                <div className="grid gap-4 md:grid-cols-2">
                  <label className="grid gap-2 text-sm font-semibold text-slate-700">
                    Review Link
                    <input
                      name="reviewLink"
                      defaultValue={derivedReviewLink ?? ""}
                      placeholder={location.googlePlaceId ? "Auto-falls back to Google write-review link from Place ID" : "Paste a public review destination"}
                      className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm font-normal text-slate-700"
                    />
                  </label>
                  <label className="grid gap-2 text-sm font-semibold text-slate-700">
                    CTA Label
                    <input name="ctaLabel" defaultValue={publicProfile?.ctaLabel ?? "Book now"} className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm font-normal text-slate-700" />
                  </label>
                  <label className="grid gap-2 text-sm font-semibold text-slate-700">
                    CTA URL
                    <input name="ctaUrl" defaultValue={publicProfile?.ctaUrl ?? publicProfile?.bookingUrl ?? ""} className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm font-normal text-slate-700" />
                  </label>
                  <label className="grid gap-2 text-sm font-semibold text-slate-700">
                    Booking URL
                    <input name="bookingUrl" defaultValue={publicProfile?.bookingUrl ?? ""} className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm font-normal text-slate-700" />
                  </label>
                </div>
              </div>

              <div className="space-y-4 border-t border-slate-200 pt-6">
                <div>
                  <p className="text-sm font-semibold uppercase tracking-[0.18em] text-slate-500">Social Media</p>
                  <p className="mt-1 text-sm text-slate-600">Optional social links that appear on the mini-site.</p>
                </div>

                <div className="grid gap-4 md:grid-cols-2">
                  <label className="grid gap-2 text-sm font-semibold text-slate-700">
                    Facebook URL
                    <input name="facebookUrl" defaultValue={publicProfile?.facebookUrl ?? ""} className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm font-normal text-slate-700" />
                  </label>
                  <label className="grid gap-2 text-sm font-semibold text-slate-700">
                    X URL
                    <input name="xUrl" defaultValue={publicProfile?.xUrl ?? ""} className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm font-normal text-slate-700" />
                  </label>
                  <label className="grid gap-2 text-sm font-semibold text-slate-700">
                    Instagram URL
                    <input name="instagramUrl" defaultValue={publicProfile?.instagramUrl ?? ""} className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm font-normal text-slate-700" />
                  </label>
                  <label className="grid gap-2 text-sm font-semibold text-slate-700">
                    LinkedIn URL
                    <input name="linkedinUrl" defaultValue={publicProfile?.linkedinUrl ?? ""} className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm font-normal text-slate-700" />
                  </label>
                  <label className="grid gap-2 text-sm font-semibold text-slate-700">
                    YouTube URL
                    <input name="youtubeUrl" defaultValue={publicProfile?.youtubeUrl ?? ""} className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm font-normal text-slate-700" />
                  </label>
                  <label className="grid gap-2 text-sm font-semibold text-slate-700">
                    TikTok URL
                    <input name="tiktokUrl" defaultValue={publicProfile?.tiktokUrl ?? ""} className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm font-normal text-slate-700" />
                  </label>
                </div>
              </div>

              <div className="space-y-4 border-t border-slate-200 pt-6">
                <div>
                  <p className="text-sm font-semibold uppercase tracking-[0.18em] text-slate-500">Display Options</p>
                  <p className="mt-1 text-sm text-slate-600">Visual and SEO-related controls for the public mini-site.</p>
                </div>

                <div className="grid gap-4 md:grid-cols-2">
                  <label className="grid gap-2 text-sm font-semibold text-slate-700">
                    Theme
                    <input name="theme" defaultValue={publicProfile?.theme ?? "light"} className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm font-normal text-slate-700" />
                  </label>
                </div>

                <div className="grid gap-4 md:grid-cols-2">
                  <label className="flex items-center gap-3 rounded-2xl border border-slate-200 bg-slate-50 px-4 py-4 text-sm font-semibold text-slate-700">
                    <input type="checkbox" name="showReviews" defaultChecked={publicProfile?.showReviews ?? true} className="h-4 w-4" />
                    Show public reviews
                  </label>
                  <label className="flex items-center gap-3 rounded-2xl border border-slate-200 bg-slate-50 px-4 py-4 text-sm font-semibold text-slate-700">
                    <input type="checkbox" name="showTestimonials" defaultChecked={publicProfile?.showTestimonials ?? true} className="h-4 w-4" />
                    Show internal testimonials
                  </label>
                  <label className="flex items-center gap-3 rounded-2xl border border-slate-200 bg-slate-50 px-4 py-4 text-sm font-semibold text-slate-700">
                    <input type="checkbox" name="showMap" defaultChecked={publicProfile?.showMap ?? true} className="h-4 w-4" />
                    Show map section
                  </label>
                  <label className="flex items-center gap-3 rounded-2xl border border-slate-200 bg-slate-50 px-4 py-4 text-sm font-semibold text-slate-700">
                    <input type="checkbox" name="schemaEnabled" defaultChecked={publicProfile?.schemaEnabled ?? true} className="h-4 w-4" />
                    Enable schema markup
                  </label>
                  <label className="flex items-center gap-3 rounded-2xl border border-slate-200 bg-slate-50 px-4 py-4 text-sm font-semibold text-slate-700">
                    <input type="checkbox" name="showHours" defaultChecked={publicProfile?.showHours ?? false} className="h-4 w-4" />
                    Show hours section
                  </label>
                </div>
              </div>

              <div className="grid gap-4 border-t border-slate-200 pt-6 md:grid-cols-2">
                <Field label="Google Account" value={location.googleConnection?.email ?? (location.googlePlaceId ? "Place matched, connection not linked yet" : "Not connected")} />
                <Field label="Google Location" value={location.googleLocationName ?? "Not mapped"} />
                <Field label="Google Place ID" value={location.googlePlaceId ?? "Not captured"} />
              </div>

              {location.googleMappingHealth.status === "malformed" ? (
                <div className="rounded-2xl border border-rose-200 bg-rose-50 px-4 py-4 text-sm text-rose-800">
                  <p className="font-semibold">Malformed Google mapping detected</p>
                  <p className="mt-1">{location.googleMappingHealth.message}</p>
                </div>
              ) : null}

              <div className="rounded-2xl bg-slate-50 p-4 text-sm text-slate-600">
                Renaming a location will update its mini-site slug automatically when needed.
              </div>

              <FormSubmitButton
                idleLabel="Save Location Settings"
                pendingLabel="Saving..."
                className="rounded-2xl bg-slate-950 px-5 py-3 text-sm font-semibold !text-white shadow-sm visited:!text-white hover:!text-white"
              />
            </form>
          </section>

          <aside className="space-y-6 xl:col-span-2 xl:sticky xl:top-6">
            <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
              <h3 className="text-xl font-semibold text-slate-950">Performance Snapshot</h3>
              <div className="mt-6 space-y-4">
                <OutcomeCard title="Assigned contacts" count={String(location.contacts.length)} tone="neutral" />
                <OutcomeCard title="Requests sent" count={String(requestCount)} tone="positive" />
                <OutcomeCard title="Google reviews imported" count={String(location.googleReviewCount)} tone="positive" />
                <OutcomeCard title="Needs rollout work" count={location.status === "Launching" ? "Yes" : "No"} tone="warning" />
              </div>
            </section>

            <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
              <div className="flex items-center justify-between gap-4">
                <div>
                  <h3 className="text-xl font-semibold text-slate-950">Google Mapping & Review Sync</h3>
                  <p className="mt-2 text-sm text-slate-600">Map this location to a connected Google Business Profile entry, then import live Google reviews into the inbox and mini-site.</p>
                </div>
              </div>

              <div className="mt-6 space-y-4">
                {mappingOptions.length === 0 ? (
                  <div className="rounded-2xl border border-dashed border-slate-200 bg-slate-50 px-4 py-4 text-sm text-slate-600">
                    No Google connections yet. Connect Google first from the integrations page.
                  </div>
                ) : (
                  mappingOptions.map(({ connection, googleLocations, fetchError }) => {
                    const suggestedMatches = location.googlePlaceId
                      ? googleLocations.filter((googleLocation) => googleLocation.metadata?.placeId === location.googlePlaceId)
                      : [];

                    return (
                      <div key={connection.id} className="rounded-2xl border border-slate-200 p-4">
                        <p className="font-semibold text-slate-900">{connection.email ?? "Connected Google account"}</p>
                        <p className="mt-1 text-sm text-slate-600">Available Google locations: {googleLocations.length}</p>
                        {fetchError ? <p className="mt-2 text-sm text-amber-700">{fetchError}</p> : null}

                        {suggestedMatches.length > 0 ? (
                          <div className="mt-4 space-y-3 rounded-2xl border border-emerald-200 bg-emerald-50 p-4">
                            <p className="text-sm font-semibold text-emerald-800">Suggested GBP match found from saved Place ID</p>
                            {suggestedMatches.map((googleLocation) => (
                              <form key={`${connection.id}-${googleLocation.name}-suggested`} action={mapLocationToGoogle} className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                                <input type="hidden" name="locationId" value={location.id} />
                                <input type="hidden" name="googleConnectionId" value={connection.id} />
                                <input
                                  type="hidden"
                                  name="googleLocationPayload"
                                value={JSON.stringify({
                                  googleLocationId: googleLocation.name.split("/").pop(),
                                  googleLocationName: googleLocation.name,
                                  googlePlaceId: googleLocation.metadata?.placeId ?? "",
                                  reviewLink: googleLocation.metadata?.newReviewUri ?? "",
                                  mapsUri: googleLocation.metadata?.mapsUri ?? "",
                                  weekdayDescriptions: googleLocation.regularHours?.weekdayDescriptions ?? [],
                                })}
                              />
                                <div>
                                  <p className="font-semibold text-slate-900">{googleLocation.title ?? googleLocation.name}</p>
                                  <p className="mt-1 text-sm text-slate-600">
                                    {[googleLocation.storefrontAddress?.locality, googleLocation.storefrontAddress?.administrativeArea].filter(Boolean).join(", ")}
                                  </p>
                                </div>
                                <button
                                  type="submit"
                                  className="rounded-2xl bg-emerald-600 px-4 py-3 text-sm font-semibold !text-white shadow-sm visited:!text-white hover:!text-white"
                                >
                                  Link suggested match
                                </button>
                              </form>
                            ))}
                          </div>
                        ) : null}

                        {googleLocations.length > 0 ? (
                          <form action={mapLocationToGoogle} className="mt-4 space-y-3">
                            <input type="hidden" name="locationId" value={location.id} />
                            <input type="hidden" name="googleConnectionId" value={connection.id} />

                            <label className="grid gap-2 text-sm font-semibold text-slate-700">
                              Select Google Business Profile location
                              <select
                                name="googleLocationPayload"
                                defaultValue=""
                                className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm font-normal text-slate-700"
                              >
                                <option value="" disabled>
                                  Choose a Google location
                                </option>
                                {googleLocations.map((googleLocation) => (
                                  <option
                                    key={googleLocation.name}
                                    value={JSON.stringify({
                                      googleLocationId: googleLocation.name.split("/").pop(),
                                      googleLocationName: googleLocation.name,
                                      googlePlaceId: googleLocation.metadata?.placeId ?? "",
                                      reviewLink: googleLocation.metadata?.newReviewUri ?? "",
                                      mapsUri: googleLocation.metadata?.mapsUri ?? "",
                                      weekdayDescriptions: googleLocation.regularHours?.weekdayDescriptions ?? [],
                                    })}
                                  >
                                    {googleLocation.title ?? googleLocation.name} · {[googleLocation.storefrontAddress?.locality, googleLocation.storefrontAddress?.administrativeArea]
                                      .filter(Boolean)
                                      .join(", ")}
                                  </option>
                                ))}
                              </select>
                            </label>

                            <button
                              type="submit"
                              className="rounded-2xl bg-slate-950 px-4 py-3 text-sm font-semibold !text-white shadow-sm visited:!text-white hover:!text-white"
                            >
                              Map Google Location
                            </button>
                          </form>
                        ) : null}
                      </div>
                    );
                  })
                )}

                <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-4 text-sm text-slate-700">
                  <p>
                    <span className="font-semibold">Sync status:</span> {location.lastSyncStatus === "error" ? "Failed" : location.lastSyncAt ? "Ready" : "Awaiting first sync"}
                  </p>
                  <p className="mt-2">
                    <span className="font-semibold">Last synced:</span> {lastSyncedLabel}
                  </p>
                  <p className="mt-2">
                    <span className="font-semibold">Imported Google reviews:</span> {location.googleReviewCount}
                  </p>
                  {typeof location.lastSyncImportedCount === "number" || typeof location.lastSyncUpdatedCount === "number" || typeof location.lastSyncSkippedCount === "number" ? (
                    <p className="mt-2">
                      <span className="font-semibold">Last result:</span> {buildGoogleLastSyncResultSummary({
                        createdCount: location.lastSyncImportedCount ?? 0,
                        updatedCount: location.lastSyncUpdatedCount ?? 0,
                        skippedCount: location.lastSyncSkippedCount ?? 0,
                        totalCount: location.lastSyncFetchedCount ?? 0,
                      })}
                    </p>
                  ) : null}
                  {location.lastSyncMessage ? (
                    <p className="mt-2 text-rose-700">
                      <span className="font-semibold">Last error:</span> {location.lastSyncMessage}
                    </p>
                  ) : null}
                  {location.googleMappingHealth.status === "malformed" ? (
                    <p className="mt-2 text-rose-700">
                      <span className="font-semibold">Mapping warning:</span> {location.googleMappingHealth.message}
                    </p>
                  ) : null}
                </div>

                <form action={syncGoogleReviews}>
                  <input type="hidden" name="locationId" value={location.id} />
                  <FormSubmitButton
                    idleLabel="Sync Google Reviews"
                    pendingLabel="Syncing..."
                    disabled={!location.googleConnectionId || !location.googleLocationName || location.googleMappingHealth.status === "malformed"}
                    className={`rounded-2xl px-4 py-3 text-sm font-semibold shadow-sm ${
                      location.googleConnectionId && location.googleLocationName && location.googleMappingHealth.status !== "malformed"
                        ? "bg-emerald-600 !text-white visited:!text-white hover:!text-white disabled:cursor-not-allowed disabled:opacity-70"
                        : "border border-slate-200 bg-white text-slate-400"
                    }`}
                  />
                </form>

                <form action={refreshGoogleLocationDetails}>
                  <input type="hidden" name="locationId" value={location.id} />
                  <FormSubmitButton
                    idleLabel="Refresh Google Details"
                    pendingLabel="Refreshing..."
                    className="rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm font-semibold text-slate-700 shadow-sm"
                  />
                </form>
              </div>
            </section>
          </aside>
        </div>

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

        <div className="grid gap-6 xl:grid-cols-[1fr_1fr]">
          <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
            <div className="flex items-center justify-between">
              <h3 className="text-xl font-semibold text-slate-950">Assigned Contacts</h3>
              <span className="text-sm text-slate-500">Local CRM view</span>
            </div>
            <div className="mt-6 space-y-3">
              {location.contacts.map((contact) => (
                <Link
                  key={contact.id}
                  href={`/contacts/${contact.id}`}
                  className="block rounded-2xl border border-slate-200 p-4 transition hover:border-slate-300 hover:bg-slate-50"
                >
                  <div className="flex items-center justify-between gap-4">
                    <div>
                      <p className="font-semibold text-slate-900">{contact.name}</p>
                      <p className="mt-1 text-sm text-slate-600">{contact.email ?? "No email"}</p>
                    </div>
                    <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold uppercase tracking-[0.18em] text-slate-600">
                      {formatPreferredChannel(contact.preferredChannel)}
                    </span>
                  </div>
                </Link>
              ))}
            </div>
          </section>

          <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
            <div className="flex items-center justify-between">
              <h3 className="text-xl font-semibold text-slate-950">Local Request Activity</h3>
              <span className="text-sm text-slate-500">Recent sends</span>
            </div>
            <div className="mt-6 space-y-3">
              {location.campaigns.map((campaign) => {
                const firstRecipient = campaign.recipients[0];

                return (
                  <Link
                    key={campaign.id}
                    href={`/campaigns/${campaign.id}`}
                    className="block rounded-2xl border border-slate-200 p-4 transition hover:border-slate-300 hover:bg-slate-50"
                  >
                    <div className="flex items-center justify-between gap-4">
                      <div>
                        <p className="font-semibold text-slate-900">{campaign.name}</p>
                        <p className="mt-1 text-sm text-slate-600">
                          {formatDateTime(campaign.sendAt)} · {firstRecipient?.outcome ?? "Pending"}
                        </p>
                      </div>
                      <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold uppercase tracking-[0.18em] text-slate-600">
                        {formatCampaignStatus(campaign.status)}
                      </span>
                    </div>
                  </Link>
                );
              })}
            </div>
          </section>
        </div>
      </div>
    </AppShell>
  );
}
