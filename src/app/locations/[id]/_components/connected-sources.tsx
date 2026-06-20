import { FormSubmitButton } from "@/components/form-submit-button";
import {
  mapLocationToGoogle,
  syncGoogleReviews,
  refreshGoogleLocationDetails,
} from "@/app/locations/actions";
import { buildGoogleLastSyncResultSummary } from "@/lib/google-sync-summary";
import type { getLocationMappingOptions } from "@/lib/locations";

export type SourceRow = {
  key: "google" | "facebook" | "yelp" | "trustpilot";
  label: string;
  connected: boolean;
  lastSyncedLabel: string | null;
  reviewsImported: number | null;
  rating: number | null;
  syncStatus: string | null;
  comingSoon: boolean;
};

type LocationFields = {
  id: string;
  googlePlaceId: string | null;
  googleConnectionId: string | null;
  googleLocationName: string | null;
  googleMappingHealth: { status: string; message?: string };
  lastSyncStatus: string | null;
  lastSyncAt: Date | null;
  lastSyncMessage: string | null;
  lastSyncImportedCount: number | null;
  lastSyncUpdatedCount: number | null;
  lastSyncSkippedCount: number | null;
  lastSyncFetchedCount: number | null;
  googleReviewCount: number;
};

type MappingOptions = Awaited<ReturnType<typeof getLocationMappingOptions>>;

export function ConnectedSources({
  sources,
  location,
  mappingOptions,
}: {
  sources: SourceRow[];
  location: LocationFields;
  mappingOptions: MappingOptions;
}) {
  const fmtStat = (v: string | number | null) => (v === null ? "—" : String(v));

  return (
    <section
      id="connected-sources"
      className="rounded-2xl border border-[var(--ink-200)] bg-white p-6 shadow-[var(--shadow-sm)]"
    >
      <h3 className="text-lg font-semibold text-slate-950">Connected Sources</h3>
      <p className="mt-1 text-sm text-slate-500">
        Review platforms linked to this location for import and aggregation.
      </p>

      <div className="mt-5 space-y-4">
        {sources.map((source) => (
          <div
            key={source.key}
            className="rounded-2xl border border-slate-200 bg-slate-50 p-4"
          >
            <div className="flex items-center justify-between gap-4">
              <p className="font-semibold text-slate-900">{source.label}</p>
              {source.comingSoon ? (
                <span className="rounded-full border border-slate-200 bg-white px-3 py-1 text-xs font-semibold text-slate-400">
                  Coming soon
                </span>
              ) : source.connected ? (
                <span className="rounded-full bg-emerald-100 px-3 py-1 text-xs font-semibold text-emerald-700">
                  Connected
                </span>
              ) : (
                <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-500">
                  Not connected
                </span>
              )}
            </div>

            <dl className="mt-3 grid grid-cols-2 gap-x-4 gap-y-2 text-sm sm:grid-cols-4">
              <div>
                <dt className="text-xs text-slate-500">Last synced</dt>
                <dd className="font-semibold text-slate-800">{fmtStat(source.lastSyncedLabel)}</dd>
              </div>
              <div>
                <dt className="text-xs text-slate-500">Reviews imported</dt>
                <dd className="font-semibold text-slate-800">{fmtStat(source.reviewsImported)}</dd>
              </div>
              <div>
                <dt className="text-xs text-slate-500">Rating</dt>
                <dd className="font-semibold text-slate-800">{fmtStat(source.rating)}</dd>
              </div>
              <div>
                <dt className="text-xs text-slate-500">Sync status</dt>
                <dd className="font-semibold text-slate-800">{fmtStat(source.syncStatus)}</dd>
              </div>
            </dl>

            {/* Google-specific mapping and sync forms */}
            {source.key === "google" && source.connected && (
              <div className="mt-4 space-y-4">
                {mappingOptions.length === 0 ? (
                  <div className="rounded-2xl border border-dashed border-slate-200 bg-white px-4 py-4 text-sm text-slate-600">
                    No Google connections yet. Connect Google first from the integrations page.
                  </div>
                ) : (
                  mappingOptions.map(({ connection, googleLocations, fetchError }) => {
                    const suggestedMatches = location.googlePlaceId
                      ? googleLocations.filter(
                          (googleLocation) =>
                            googleLocation.metadata?.placeId === location.googlePlaceId,
                        )
                      : [];

                    return (
                      <div key={connection.id} className="rounded-2xl border border-slate-200 bg-white p-4">
                        <p className="font-semibold text-slate-900">
                          {connection.email ?? "Connected Google account"}
                        </p>
                        <p className="mt-1 text-sm text-slate-600">
                          Available Google locations: {googleLocations.length}
                        </p>
                        {fetchError ? (
                          <p className="mt-2 text-sm text-amber-700">{fetchError}</p>
                        ) : null}

                        {suggestedMatches.length > 0 ? (
                          <div className="mt-4 space-y-3 rounded-2xl border border-emerald-200 bg-emerald-50 p-4">
                            <p className="text-sm font-semibold text-emerald-800">
                              Suggested GBP match found from saved Place ID
                            </p>
                            {suggestedMatches.map((googleLocation) => (
                              <form
                                key={`${connection.id}-${googleLocation.name}-suggested`}
                                action={mapLocationToGoogle}
                                className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between"
                              >
                                <input type="hidden" name="locationId" value={location.id} />
                                <input
                                  type="hidden"
                                  name="googleConnectionId"
                                  value={connection.id}
                                />
                                <input
                                  type="hidden"
                                  name="googleLocationPayload"
                                  value={JSON.stringify({
                                    googleLocationId: googleLocation.name.split("/").pop(),
                                    googleLocationName: googleLocation.name,
                                    googlePlaceId: googleLocation.metadata?.placeId ?? "",
                                    reviewLink: googleLocation.metadata?.newReviewUri ?? "",
                                    mapsUri: googleLocation.metadata?.mapsUri ?? "",
                                    weekdayDescriptions:
                                      googleLocation.regularHours?.weekdayDescriptions ?? [],
                                  })}
                                />
                                <div>
                                  <p className="font-semibold text-slate-900">
                                    {googleLocation.title ?? googleLocation.name}
                                  </p>
                                  <p className="mt-1 text-sm text-slate-600">
                                    {[
                                      googleLocation.storefrontAddress?.locality,
                                      googleLocation.storefrontAddress?.administrativeArea,
                                    ]
                                      .filter(Boolean)
                                      .join(", ")}
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
                            <input
                              type="hidden"
                              name="googleConnectionId"
                              value={connection.id}
                            />

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
                                      weekdayDescriptions:
                                        googleLocation.regularHours?.weekdayDescriptions ?? [],
                                    })}
                                  >
                                    {googleLocation.title ?? googleLocation.name} ·{" "}
                                    {[
                                      googleLocation.storefrontAddress?.locality,
                                      googleLocation.storefrontAddress?.administrativeArea,
                                    ]
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
                    <span className="font-semibold">Sync status:</span>{" "}
                    {location.lastSyncStatus === "error"
                      ? "Failed"
                      : location.lastSyncAt
                        ? "Ready"
                        : "Awaiting first sync"}
                  </p>
                  <p className="mt-2">
                    <span className="font-semibold">Imported Google reviews:</span>{" "}
                    {location.googleReviewCount}
                  </p>
                  {typeof location.lastSyncImportedCount === "number" ||
                  typeof location.lastSyncUpdatedCount === "number" ||
                  typeof location.lastSyncSkippedCount === "number" ? (
                    <p className="mt-2">
                      <span className="font-semibold">Last result:</span>{" "}
                      {buildGoogleLastSyncResultSummary({
                        createdCount: location.lastSyncImportedCount ?? 0,
                        updatedCount: location.lastSyncUpdatedCount ?? 0,
                        skippedCount: location.lastSyncSkippedCount ?? 0,
                        totalCount: location.lastSyncFetchedCount ?? 0,
                      })}
                    </p>
                  ) : null}
                  {location.lastSyncMessage ? (
                    <p className="mt-2 text-rose-700">
                      <span className="font-semibold">Last error:</span>{" "}
                      {location.lastSyncMessage}
                    </p>
                  ) : null}
                  {location.googleMappingHealth.status === "malformed" ? (
                    <p className="mt-2 text-rose-700">
                      <span className="font-semibold">Mapping warning:</span>{" "}
                      {location.googleMappingHealth.message}
                    </p>
                  ) : null}
                </div>

                <form action={syncGoogleReviews}>
                  <input type="hidden" name="locationId" value={location.id} />
                  <FormSubmitButton
                    idleLabel="Sync Google Reviews"
                    pendingLabel="Syncing..."
                    disabled={
                      !location.googleConnectionId ||
                      !location.googleLocationName ||
                      location.googleMappingHealth.status === "malformed"
                    }
                    className={`rounded-2xl px-4 py-3 text-sm font-semibold shadow-sm ${
                      location.googleConnectionId &&
                      location.googleLocationName &&
                      location.googleMappingHealth.status !== "malformed"
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
            )}
          </div>
        ))}
      </div>
    </section>
  );
}
