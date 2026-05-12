import { buildGoogleBatchSyncResult } from "./google-batch-sync";
import { buildIntegrationsBatchSyncSuccessPath } from "./google-sync-action-paths";
import { buildIntegrationErrorParams } from "./google-sync-redirects";

type GoogleBatchSyncActionInput = {
  results: Array<{
    createdCount: number;
    updatedCount: number;
    skippedCount: number;
    totalCount: number;
  }>;
  failedLocationNames: string[];
};

type GoogleBatchSyncActionOutcome = {
  status: "success" | "partial" | "error";
  message: string | null;
  redirectPath: string;
  totals: {
    syncedLocations: number;
    failedLocations: number;
    failedLocationNames: string[];
    createdCount: number;
    updatedCount: number;
    skippedCount: number;
    totalCount: number;
  };
};

export function buildBulkGoogleSyncRedirect({
  results,
  failedLocationNames,
}: GoogleBatchSyncActionInput): GoogleBatchSyncActionOutcome {
  if (results.length === 0) {
    const message = "Bulk Google review sync failed for all mapped locations";
    return {
      status: "error" as const,
      message,
      redirectPath: `/integrations?${buildIntegrationErrorParams("bulk-sync-error", message).toString()}`,
      totals: {
        syncedLocations: 0,
        failedLocations: failedLocationNames.length,
        failedLocationNames,
        createdCount: 0,
        updatedCount: 0,
        skippedCount: 0,
        totalCount: 0,
      },
    };
  }

  const totals = buildGoogleBatchSyncResult(results, failedLocationNames);
  const status: GoogleBatchSyncActionOutcome["status"] = failedLocationNames.length > 0 ? "partial" : "success";
  const state = failedLocationNames.length > 0 ? "bulk-sync-partial" : "bulk-sync-success";

  return {
    status,
    message: failedLocationNames.length > 0 ? `Failed locations: ${failedLocationNames.join(", ")}` : null,
    redirectPath: buildIntegrationsBatchSyncSuccessPath(state, totals),
    totals,
  };
}

export function buildRetryGoogleSyncRedirect({
  results,
  failedLocationNames,
}: GoogleBatchSyncActionInput): GoogleBatchSyncActionOutcome {
  if (results.length === 0) {
    const message = "Retry sync failed for all selected locations";
    return {
      status: "error" as const,
      message,
      redirectPath: `/integrations?${buildIntegrationErrorParams("retry-sync-error", message).toString()}`,
      totals: {
        syncedLocations: 0,
        failedLocations: failedLocationNames.length,
        failedLocationNames,
        createdCount: 0,
        updatedCount: 0,
        skippedCount: 0,
        totalCount: 0,
      },
    };
  }

  const totals = buildGoogleBatchSyncResult(results, failedLocationNames);
  const status: GoogleBatchSyncActionOutcome["status"] = failedLocationNames.length > 0 ? "partial" : "success";
  const state = failedLocationNames.length > 0 ? "retry-sync-partial" : "retry-sync-success";

  return {
    status,
    message: failedLocationNames.length > 0 ? `Still failing: ${failedLocationNames.join(", ")}` : null,
    redirectPath: buildIntegrationsBatchSyncSuccessPath(state, totals),
    totals,
  };
}
