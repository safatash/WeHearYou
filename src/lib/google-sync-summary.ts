export type GoogleSyncCounts = {
  createdCount: number;
  updatedCount: number;
  skippedCount: number;
  totalCount: number;
};

export type AggregatedGoogleSyncCounts = GoogleSyncCounts & {
  syncedLocations: number;
};

export type GoogleSyncBatchResult = AggregatedGoogleSyncCounts & {
  failedLocations: number;
};

export function buildGoogleSyncSummary(result: GoogleSyncCounts) {
  return `Sync complete, ${result.createdCount} imported, ${result.updatedCount} updated, ${result.skippedCount} unchanged, ${result.totalCount} fetched from Google.`;
}

export function buildGoogleLastSyncResultSummary(result: Partial<GoogleSyncCounts>) {
  return `${result.createdCount ?? 0} imported, ${result.updatedCount ?? 0} updated, ${result.skippedCount ?? 0} unchanged, ${result.totalCount ?? 0} fetched`;
}

export function buildSingleLocationGoogleSyncSummary(locationName: string, result: GoogleSyncCounts) {
  return `${locationName} synced, ${result.createdCount} imported, ${result.updatedCount} updated, ${result.skippedCount} unchanged, ${result.totalCount} fetched from Google.`;
}

export function buildBulkGoogleSyncSummary(result: GoogleSyncBatchResult) {
  return result.failedLocations > 0
    ? `Bulk sync partially complete, ${result.syncedLocations} locations synced, ${result.failedLocations} failed, ${result.createdCount} imported, ${result.updatedCount} updated, ${result.skippedCount} unchanged, ${result.totalCount} fetched from Google.`
    : `Bulk sync complete, ${result.syncedLocations} locations synced, ${result.createdCount} imported, ${result.updatedCount} updated, ${result.skippedCount} unchanged, ${result.totalCount} fetched from Google.`;
}

export function buildRetryGoogleSyncSummary(result: GoogleSyncBatchResult) {
  return result.failedLocations > 0
    ? `Retry partially complete, ${result.syncedLocations} failed locations re-synced, ${result.failedLocations} still failing, ${result.createdCount} imported, ${result.updatedCount} updated, ${result.skippedCount} unchanged, ${result.totalCount} fetched from Google.`
    : `Retry complete, ${result.syncedLocations} failed locations re-synced, ${result.createdCount} imported, ${result.updatedCount} updated, ${result.skippedCount} unchanged, ${result.totalCount} fetched from Google.`;
}

export function buildGoogleSyncErrorMessage(message?: string) {
  return `Google sync failed${message ? `, ${message}.` : "."}`;
}

export function buildLocationSyncErrorMessage(message?: string) {
  return `Sync failed${message ? `, ${message}.` : "."}`;
}

export function aggregateGoogleSyncCounts(results: GoogleSyncCounts[]): AggregatedGoogleSyncCounts {
  return results.reduce<AggregatedGoogleSyncCounts>(
    (totals, result) => ({
      syncedLocations: totals.syncedLocations + 1,
      createdCount: totals.createdCount + result.createdCount,
      updatedCount: totals.updatedCount + result.updatedCount,
      skippedCount: totals.skippedCount + result.skippedCount,
      totalCount: totals.totalCount + result.totalCount,
    }),
    {
      syncedLocations: 0,
      createdCount: 0,
      updatedCount: 0,
      skippedCount: 0,
      totalCount: 0,
    },
  );
}
