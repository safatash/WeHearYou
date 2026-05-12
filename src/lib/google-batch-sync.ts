import { aggregateGoogleSyncCounts, type GoogleSyncBatchResult, type GoogleSyncCounts } from "./google-sync-summary";

export function buildGoogleBatchSyncResult(results: GoogleSyncCounts[], failedLocationNames: string[]): GoogleSyncBatchResult & {
  failedLocationNames: string[];
} {
  return {
    ...aggregateGoogleSyncCounts(results),
    failedLocations: failedLocationNames.length,
    failedLocationNames,
  };
}
