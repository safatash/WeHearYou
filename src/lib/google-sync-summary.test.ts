import assert from "node:assert/strict";
import test from "node:test";
import {
  aggregateGoogleSyncCounts,
  buildBulkGoogleSyncSummary,
  buildGoogleLastSyncResultSummary,
  buildGoogleSyncErrorMessage,
  buildGoogleSyncSummary,
  buildLocationSyncErrorMessage,
  buildRetryGoogleSyncSummary,
  buildSingleLocationGoogleSyncSummary,
} from "./google-sync-summary";

test("buildGoogleSyncSummary includes imported, updated, unchanged, and fetched counts", () => {
  const summary = buildGoogleSyncSummary({
    createdCount: 3,
    updatedCount: 2,
    skippedCount: 5,
    totalCount: 10,
  });

  assert.equal(summary, "Sync complete, 3 imported, 2 updated, 5 unchanged, 10 fetched from Google.");
});

test("buildGoogleLastSyncResultSummary formats last sync counts", () => {
  const summary = buildGoogleLastSyncResultSummary({
    createdCount: 1,
    updatedCount: 2,
    skippedCount: 3,
    totalCount: 6,
  });

  assert.equal(summary, "1 imported, 2 updated, 3 unchanged, 6 fetched");
});

test("buildSingleLocationGoogleSyncSummary includes the location name and counts", () => {
  const summary = buildSingleLocationGoogleSyncSummary("Downtown Dental", {
    createdCount: 1,
    updatedCount: 2,
    skippedCount: 3,
    totalCount: 6,
  });

  assert.equal(summary, "Downtown Dental synced, 1 imported, 2 updated, 3 unchanged, 6 fetched from Google.");
});

test("aggregateGoogleSyncCounts totals counts across synced locations", () => {
  const totals = aggregateGoogleSyncCounts([
    { createdCount: 3, updatedCount: 1, skippedCount: 4, totalCount: 8 },
    { createdCount: 2, updatedCount: 5, skippedCount: 1, totalCount: 8 },
  ]);

  assert.deepEqual(totals, {
    syncedLocations: 2,
    createdCount: 5,
    updatedCount: 6,
    skippedCount: 5,
    totalCount: 16,
  });
});

test("buildBulkGoogleSyncSummary includes location and count totals", () => {
  const summary = buildBulkGoogleSyncSummary({
    syncedLocations: 2,
    failedLocations: 0,
    createdCount: 5,
    updatedCount: 6,
    skippedCount: 5,
    totalCount: 16,
  });

  assert.equal(summary, "Bulk sync complete, 2 locations synced, 5 imported, 6 updated, 5 unchanged, 16 fetched from Google.");
});

test("buildBulkGoogleSyncSummary includes partial failure totals", () => {
  const summary = buildBulkGoogleSyncSummary({
    syncedLocations: 2,
    failedLocations: 1,
    createdCount: 5,
    updatedCount: 6,
    skippedCount: 5,
    totalCount: 16,
  });

  assert.equal(summary, "Bulk sync partially complete, 2 locations synced, 1 failed, 5 imported, 6 updated, 5 unchanged, 16 fetched from Google.");
});

test("buildRetryGoogleSyncSummary includes retry totals", () => {
  const summary = buildRetryGoogleSyncSummary({
    syncedLocations: 2,
    failedLocations: 0,
    createdCount: 5,
    updatedCount: 6,
    skippedCount: 5,
    totalCount: 16,
  });

  assert.equal(summary, "Retry complete, 2 failed locations re-synced, 5 imported, 6 updated, 5 unchanged, 16 fetched from Google.");
});

test("buildRetryGoogleSyncSummary includes partial retry totals", () => {
  const summary = buildRetryGoogleSyncSummary({
    syncedLocations: 2,
    failedLocations: 1,
    createdCount: 5,
    updatedCount: 6,
    skippedCount: 5,
    totalCount: 16,
  });

  assert.equal(summary, "Retry partially complete, 2 failed locations re-synced, 1 still failing, 5 imported, 6 updated, 5 unchanged, 16 fetched from Google.");
});

test("buildGoogleSyncErrorMessage formats optional error details", () => {
  assert.equal(buildGoogleSyncErrorMessage("token expired"), "Google sync failed, token expired.");
  assert.equal(buildGoogleSyncErrorMessage(), "Google sync failed.");
});

test("buildLocationSyncErrorMessage formats optional error details", () => {
  assert.equal(buildLocationSyncErrorMessage("mapping missing"), "Sync failed, mapping missing.");
  assert.equal(buildLocationSyncErrorMessage(), "Sync failed.");
});
