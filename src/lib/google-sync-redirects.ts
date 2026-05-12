import { buildGoogleSyncSummary, type AggregatedGoogleSyncCounts, type GoogleSyncCounts } from "./google-sync-summary";

export function buildLocationSyncSuccessParams(result: GoogleSyncCounts) {
  return new URLSearchParams({
    sync: "success",
    created: String(result.createdCount),
    updated: String(result.updatedCount),
    skipped: String(result.skippedCount),
    total: String(result.totalCount),
    message: buildGoogleSyncSummary(result),
  });
}

export function buildLocationSyncErrorParams(message: string) {
  return new URLSearchParams({
    sync: "error",
    message,
  });
}

export function buildIntegrationSingleSyncSuccessParams(locationName: string, result: GoogleSyncCounts) {
  return new URLSearchParams({
    google: "sync-success",
    location: locationName,
    created: String(result.createdCount),
    updated: String(result.updatedCount),
    skipped: String(result.skippedCount),
    total: String(result.totalCount),
  });
}

export function buildIntegrationBatchSyncSuccessParams(
  state: "bulk-sync-success" | "retry-sync-success" | "bulk-sync-partial" | "retry-sync-partial",
  result: AggregatedGoogleSyncCounts & { failedLocations: number; failedLocationNames?: string[] },
) {
  return new URLSearchParams({
    google: state,
    locations: String(result.syncedLocations),
    failed: String(result.failedLocations),
    failedNames: (result.failedLocationNames ?? []).join("|"),
    created: String(result.createdCount),
    updated: String(result.updatedCount),
    skipped: String(result.skippedCount),
    total: String(result.totalCount),
  });
}

export function buildIntegrationErrorParams(state: "sync-error" | "bulk-sync-error" | "retry-sync-error", message: string) {
  return new URLSearchParams({
    google: state,
    message,
  });
}
