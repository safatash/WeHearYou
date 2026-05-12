import type { AggregatedGoogleSyncCounts, GoogleSyncCounts } from "./google-sync-summary";
import { buildIntegrationBatchSyncSuccessParams, buildLocationSyncSuccessParams } from "./google-sync-redirects";

export function buildLocationDetailSyncSuccessPath(locationId: string, result: GoogleSyncCounts) {
  const params = buildLocationSyncSuccessParams(result);
  return `/locations/${locationId}?${params.toString()}`;
}

export function buildIntegrationsBatchSyncSuccessPath(
  state: "bulk-sync-success" | "retry-sync-success" | "bulk-sync-partial" | "retry-sync-partial",
  result: AggregatedGoogleSyncCounts & { failedLocations: number; failedLocationNames?: string[] },
) {
  const params = buildIntegrationBatchSyncSuccessParams(state, result);
  return `/integrations?${params.toString()}`;
}
