export const dynamic = "force-dynamic";

import Link from "next/link";
import { AppShell } from "@/components/app-shell";
import { GooglePlacesSearch } from "@/components/google-places-search";
import { createLocation } from "@/app/locations/actions";
import { getGoogleConnections, getGooglePlacesConfig } from "@/lib/google-oauth";
import { requireActiveMembershipPage } from "@/lib/page-guards";
import { prisma } from "@/lib/prisma";

export default async function NewLocationPage({ searchParams }: { searchParams?: Promise<{ error?: string }> }) {
  const params = searchParams ? await searchParams : {};
  const errorMessage = typeof params.error === "string" ? params.error : null;
  const membership = await requireActiveMembershipPage();

  const [locations, googleConnections] = await Promise.all([
    prisma.location.findMany({
      where: { organizationId: membership.organizationId },
      orderBy: [{ createdAt: "asc" }],
      select: {
        id: true,
        name: true,
        city: true,
        state: true,
        status: true,
      },
    }),
    getGoogleConnections(membership.organizationId),
  ]);

  const googlePlacesReady = Boolean(getGooglePlacesConfig().apiKey);

  const discoveredGoogleLocations = googleConnections.flatMap((connection) =>
    connection.googleLocations.map((location) => ({
      connectionId: connection.id,
      connectionEmail: connection.email,
      label: location.title ?? location.name,
      city: location.storefrontAddress?.locality ?? "",
      state: location.storefrontAddress?.administrativeArea ?? "",
      addressLine1: location.storefrontAddress?.addressLines?.[0] ?? "",
      addressLine2: location.storefrontAddress?.addressLines?.slice(1).join(", ") ?? "",
      postalCode: location.storefrontAddress?.postalCode ?? "",
      googleLocationId: location.name.split("/").pop() ?? "",
      googleLocationName: location.name,
      googlePlaceId: location.metadata?.placeId ?? "",
      reviewLink: location.metadata?.newReviewUri ?? "",
      mapsUri: location.metadata?.mapsUri ?? "",
      weekdayDescriptions: location.regularHours?.weekdayDescriptions ?? [],
    })),
  );

  return (
    <AppShell activeScreen="locations">
      <div className="space-y-6">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p className="text-sm font-semibold uppercase tracking-[0.22em] text-indigo-600">Add Location</p>
            <h2 className="mt-2 text-3xl font-semibold tracking-tight text-slate-950">Create a new business location</h2>
            <p className="mt-3 max-w-3xl text-slate-600">
              Find the business from Google first so you can capture place ID, address details, and review destination automatically. Use manual entry when the business is not available yet.
            </p>
          </div>
          <div className="flex gap-3">
            <Link href="/locations" className="rounded-2xl border border-slate-200 bg-white px-5 py-3 text-sm font-semibold text-slate-700 shadow-sm">
              Cancel
            </Link>
          </div>
        </div>

        {errorMessage ? (
          <div className="rounded-2xl border border-rose-200 bg-rose-50 px-5 py-4 text-sm font-medium text-rose-800" role="alert">
            {errorMessage}
          </div>
        ) : null}

        <div className="grid gap-6 xl:grid-cols-[1.2fr_0.8fr]">
          <div className="space-y-6">
            <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <p className="text-sm font-semibold uppercase tracking-[0.18em] text-emerald-600">Recommended</p>
                  <h3 className="mt-2 text-xl font-semibold text-slate-950">Find business from Google</h3>
                  <p className="mt-2 text-sm text-slate-600">
                    Best for live businesses. This captures the Google Business Profile location or Google Place, place ID, review link, and address details up front.
                  </p>
                </div>
                <span className="rounded-full bg-emerald-50 px-3 py-1 text-xs font-semibold uppercase tracking-[0.18em] text-emerald-700">
                  {discoveredGoogleLocations.length} GBP found
                </span>
              </div>

              {discoveredGoogleLocations.length > 0 || googlePlacesReady ? (
                <form action={createLocation} className="mt-6 space-y-4">
                  <input type="hidden" name="mode" value="google" />

                  {googlePlacesReady ? (
                    <div className="space-y-3">
                      <p className="text-sm font-semibold text-slate-700">Search Google Places</p>
                      <GooglePlacesSearch />
                    </div>
                  ) : (
                    <div className="rounded-2xl border border-dashed border-amber-200 bg-amber-50 p-4 text-sm text-amber-800">
                      Google Places search is not configured yet. Add <span className="font-semibold">GOOGLE_PLACES_API_KEY</span> to enable business search by name or address.
                    </div>
                  )}

                  {googlePlacesReady && discoveredGoogleLocations.length > 0 ? (
                    <div className="rounded-2xl bg-slate-50 p-4 text-sm text-slate-600">Or choose from already connected Google Business Profile locations below.</div>
                  ) : null}

                  {discoveredGoogleLocations.length > 0 ? (
                    <>
                      <label className="grid gap-2 text-sm font-semibold text-slate-700">
                        Choose a connected Google business
                        <select
                          name="googleLocationPayload"
                          defaultValue=""
                          className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm font-normal text-slate-700"
                        >
                          <option value="" disabled>
                            Select a Google Business Profile location
                          </option>
                          {discoveredGoogleLocations.map((location) => (
                            <option
                              key={`${location.connectionId}:${location.googleLocationName}`}
                              value={JSON.stringify({
                                name: location.label,
                                city: location.city,
                                state: location.state,
                                postalCode: location.postalCode,
                                addressLine1: location.addressLine1,
                                addressLine2: location.addressLine2,
                                googleLocationId: location.googleLocationId,
                                googleLocationName: location.googleLocationName,
                                googlePlaceId: location.googlePlaceId,
                                reviewLink: location.reviewLink,
                                mapsUri: location.mapsUri,
                                weekdayDescriptions: location.weekdayDescriptions,
                              })}
                            >
                              {location.label} · {[location.city, location.state].filter(Boolean).join(", ")} · {location.connectionEmail ?? "Connected Google account"}
                            </option>
                          ))}
                        </select>
                      </label>

                      <label className="grid gap-2 text-sm font-semibold text-slate-700">
                        Source Google account
                        <select
                          name="googleConnectionId"
                          defaultValue={googleConnections.length === 1 ? googleConnections[0].id : ""}
                          className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm font-normal text-slate-700"
                        >
                          <option value="" disabled>
                            Select the connected account
                          </option>
                          {googleConnections.map((connection) => (
                            <option key={connection.id} value={connection.id}>
                              {connection.email ?? "Connected Google account"}
                            </option>
                          ))}
                        </select>
                      </label>
                    </>
                  ) : null}

                  <div className="rounded-2xl bg-slate-50 p-4 text-sm text-slate-600">
                    We&apos;ll create the location with status set to <span className="font-semibold text-slate-900">Launching</span>, attach the Google place ID, save the discovered address into the public profile, and carry over the Google review link when available. If you create from Places search only, the location will still need a Google Business Profile account connection before live review sync works.
                  </div>
                  <p className="text-xs text-slate-500">
                    Tip: use either Places search or the connected GBP picker above. If both are present, whichever selection fills <span className="font-semibold">googleLocationPayload</span> at submit time will be used.
                  </p>

                  <div className="flex justify-end">
                    <button type="submit" className="rounded-2xl bg-slate-950 px-5 py-3 text-sm font-semibold !text-white shadow-sm visited:!text-white hover:!text-white">
                      Create from Google
                    </button>
                  </div>
                </form>
              ) : (
                <div className="mt-6 rounded-2xl border border-dashed border-slate-200 bg-slate-50 p-4 text-sm text-slate-600">
                  No Google search source is available yet. Add GOOGLE_PLACES_API_KEY for Places search, connect Google Business Profile for discovered GBP locations, or use the manual fallback below.
                </div>
              )}
            </section>

            <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
              <div>
                <p className="text-sm font-semibold uppercase tracking-[0.18em] text-slate-500">Fallback</p>
                <h3 className="mt-2 text-xl font-semibold text-slate-950">Enter manually instead</h3>
                <p className="mt-2 text-sm text-slate-600">
                  Use this for pre-launch businesses, listings that are not in Google yet, or edge cases where Google data is wrong.
                </p>
              </div>

              <form action={createLocation} className="mt-6 grid gap-5 md:grid-cols-2">
                <input type="hidden" name="mode" value="manual" />
                <label className="grid gap-2 text-sm font-semibold text-slate-700 md:col-span-2">
                  Location name
                  <input name="name" placeholder="Nova Dental, Manhattan" className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm font-normal text-slate-700" />
                </label>
                <label className="grid gap-2 text-sm font-semibold text-slate-700 md:col-span-2">
                  Street address
                  <input name="addressLine1" placeholder="123 Main St" className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm font-normal text-slate-700" />
                </label>
                <label className="grid gap-2 text-sm font-semibold text-slate-700 md:col-span-2">
                  Address line 2
                  <input name="addressLine2" placeholder="Suite 400" className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm font-normal text-slate-700" />
                </label>
                <label className="grid gap-2 text-sm font-semibold text-slate-700">
                  City
                  <input name="city" placeholder="New York" className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm font-normal text-slate-700" />
                </label>
                <label className="grid gap-2 text-sm font-semibold text-slate-700">
                  State
                  <input name="state" placeholder="NY" className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm font-normal text-slate-700" />
                </label>
                <label className="grid gap-2 text-sm font-semibold text-slate-700">
                  ZIP / postal code
                  <input name="postalCode" placeholder="10001" className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm font-normal text-slate-700" />
                </label>
                <label className="grid gap-2 text-sm font-semibold text-slate-700 md:col-span-2">
                  Review link
                  <input name="reviewLink" placeholder="https://g.page/r/..." className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm font-normal text-slate-700" />
                </label>

                <div className="md:col-span-2 rounded-2xl bg-slate-50 p-4 text-sm text-slate-600">
                  We&apos;ll default the location status to <span className="font-semibold text-slate-900">Launching</span>. You can add Google mapping, automation, and the rest of the setup after creation.
                </div>

                <div className="md:col-span-2 flex justify-end">
                  <button type="submit" className="rounded-2xl border border-slate-200 bg-white px-5 py-3 text-sm font-semibold text-slate-700 shadow-sm">
                    Create manually
                  </button>
                </div>
              </form>
            </section>
          </div>

          <div className="space-y-6">
            <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
              <h3 className="text-lg font-semibold text-slate-950">Why this flow is better</h3>
              <div className="mt-5 space-y-3 text-sm text-slate-600">
                <div className="rounded-2xl bg-slate-50 p-4">Google-first creation gives you place ID early, which makes review-link generation and future enrichment much easier.</div>
                <div className="rounded-2xl bg-slate-50 p-4">Manual fallback still works for businesses that are not live in Google yet.</div>
                <div className="rounded-2xl bg-slate-50 p-4">Address data is captured at creation instead of being deferred to a later settings screen.</div>
              </div>
            </section>

            <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
              <h3 className="text-lg font-semibold text-slate-950">Existing portfolio</h3>
              <div className="mt-5 space-y-3">
                {locations.map((location) => (
                  <div key={location.id} className="rounded-2xl border border-slate-200 px-4 py-3">
                    <div className="flex items-center justify-between gap-3">
                      <div>
                        <p className="font-medium text-slate-900">{location.name}</p>
                        <p className="mt-1 text-sm text-slate-500">{location.city}, {location.state}</p>
                      </div>
                      <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold uppercase tracking-[0.18em] text-slate-600">
                        {location.status}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </section>
          </div>
        </div>
      </div>
    </AppShell>
  );
}
