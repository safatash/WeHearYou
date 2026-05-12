import { buildGoogleLastSyncResultSummary } from "./google-sync-summary";
import { formatRelativeSyncTime } from "./relative-time";

export type GoogleBatchSyncResultCardData = {
  status?: string | null;
  syncedCount?: number | null;
  failedCount?: number | null;
  importedCount?: number | null;
  updatedCount?: number | null;
  skippedCount?: number | null;
  fetchedCount?: number | null;
  failedNames?: string | null;
  message?: string | null;
  syncedAt?: Date | string | null;
};

export function getGoogleBatchSyncResultCardCopy({
  status,
  syncedCount,
  failedCount,
  importedCount,
  updatedCount,
  skippedCount,
  fetchedCount,
  failedNames,
  message,
  syncedAt,
}: GoogleBatchSyncResultCardData) {
  if (typeof syncedCount !== "number" && typeof failedCount !== "number") {
    return null;
  }

  return {
    statusLabel: status === "partial" ? "Partially complete" : status === "error" ? "Failed" : "Successful",
    totalsLabel: `${buildGoogleLastSyncResultSummary({
      createdCount: importedCount ?? 0,
      updatedCount: updatedCount ?? 0,
      skippedCount: skippedCount ?? 0,
      totalCount: fetchedCount ?? 0,
    })}, ${syncedCount ?? 0} synced, ${failedCount ?? 0} failed`,
    failedNamesLabel: failedNames ? failedNames.split("|").join(", ") : null,
    messageLabel: message ?? null,
    recordedAtLabel: formatRelativeSyncTime(syncedAt),
  };
}
