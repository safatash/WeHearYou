import assert from "node:assert/strict";
import test from "node:test";
import {
  buildIntegrationBatchSyncSuccessParams,
  buildIntegrationErrorParams,
  buildIntegrationSingleSyncSuccessParams,
  buildLocationSyncErrorParams,
  buildLocationSyncSuccessParams,
} from "./google-sync-redirects";

test("buildLocationSyncSuccessParams includes sync counts and summary", () => {
  const params = buildLocationSyncSuccessParams({
    createdCount: 3,
    updatedCount: 2,
    skippedCount: 5,
    totalCount: 10,
  });

  assert.equal(
    params.toString(),
    "sync=success&created=3&updated=2&skipped=5&total=10&message=Sync+complete%2C+3+imported%2C+2+updated%2C+5+unchanged%2C+10+fetched+from+Google.",
  );
});

test("buildLocationSyncErrorParams includes error state and message", () => {
  const params = buildLocationSyncErrorParams("mapping missing");
  assert.equal(params.toString(), "sync=error&message=mapping+missing");
});

test("buildIntegrationSingleSyncSuccessParams includes location and counts", () => {
  const params = buildIntegrationSingleSyncSuccessParams("Downtown Dental", {
    createdCount: 1,
    updatedCount: 2,
    skippedCount: 3,
    totalCount: 6,
  });

  assert.equal(params.toString(), "google=sync-success&location=Downtown+Dental&created=1&updated=2&skipped=3&total=6");
});

test("buildIntegrationBatchSyncSuccessParams includes aggregated totals and failures", () => {
  const params = buildIntegrationBatchSyncSuccessParams("bulk-sync-partial", {
    syncedLocations: 2,
    failedLocations: 1,
    failedLocationNames: ["Uptown Dental"],
    createdCount: 5,
    updatedCount: 6,
    skippedCount: 5,
    totalCount: 16,
  });

  assert.equal(params.toString(), "google=bulk-sync-partial&locations=2&failed=1&failedNames=Uptown+Dental&created=5&updated=6&skipped=5&total=16");
});

test("buildIntegrationErrorParams includes error state and message", () => {
  const params = buildIntegrationErrorParams("retry-sync-error", "token expired");
  assert.equal(params.toString(), "google=retry-sync-error&message=token+expired");
});
