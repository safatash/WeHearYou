import assert from "node:assert/strict";
import test from "node:test";
import { buildIntegrationsBatchSyncSuccessPath, buildLocationDetailSyncSuccessPath } from "./google-sync-action-paths";

test("buildLocationDetailSyncSuccessPath creates the expected location redirect path", () => {
  const path = buildLocationDetailSyncSuccessPath("loc_123", {
    createdCount: 3,
    updatedCount: 2,
    skippedCount: 5,
    totalCount: 10,
  });

  assert.equal(
    path,
    "/locations/loc_123?sync=success&created=3&updated=2&skipped=5&total=10&message=Sync+complete%2C+3+imported%2C+2+updated%2C+5+unchanged%2C+10+fetched+from+Google.",
  );
});

test("buildIntegrationsBatchSyncSuccessPath creates the expected integrations redirect path", () => {
  const path = buildIntegrationsBatchSyncSuccessPath("bulk-sync-partial", {
    syncedLocations: 2,
    failedLocations: 1,
    failedLocationNames: ["Uptown Dental"],
    createdCount: 5,
    updatedCount: 6,
    skippedCount: 5,
    totalCount: 16,
  });

  assert.equal(
    path,
    "/integrations?google=bulk-sync-partial&locations=2&failed=1&failedNames=Uptown+Dental&created=5&updated=6&skipped=5&total=16",
  );
});

test("buildIntegrationsBatchSyncSuccessPath matches retry sync action redirects for partial results", () => {
  const syncedResults = [
    {
      createdCount: 2,
      updatedCount: 1,
      skippedCount: 3,
      totalCount: 6,
    },
    {
      createdCount: 3,
      updatedCount: 5,
      skippedCount: 2,
      totalCount: 10,
    },
  ];
  const failedLocationNames = ["Chelsea Dental"];

  const totals = {
    syncedLocations: syncedResults.length,
    failedLocations: failedLocationNames.length,
    failedLocationNames,
    createdCount: syncedResults.reduce((sum, result) => sum + result.createdCount, 0),
    updatedCount: syncedResults.reduce((sum, result) => sum + result.updatedCount, 0),
    skippedCount: syncedResults.reduce((sum, result) => sum + result.skippedCount, 0),
    totalCount: syncedResults.reduce((sum, result) => sum + result.totalCount, 0),
  };

  assert.equal(
    buildIntegrationsBatchSyncSuccessPath("retry-sync-partial", totals),
    "/integrations?google=retry-sync-partial&locations=2&failed=1&failedNames=Chelsea+Dental&created=5&updated=6&skipped=5&total=16",
  );
});
