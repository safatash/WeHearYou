import assert from "node:assert/strict";
import test from "node:test";
import { buildGoogleBatchSyncResult } from "./google-batch-sync";

test("buildGoogleBatchSyncResult aggregates sync totals and failed names", () => {
  const result = buildGoogleBatchSyncResult(
    [
      { createdCount: 3, updatedCount: 1, skippedCount: 4, totalCount: 8 },
      { createdCount: 2, updatedCount: 5, skippedCount: 1, totalCount: 8 },
    ],
    ["Uptown Dental", "Westside Dental"],
  );

  assert.deepEqual(result, {
    syncedLocations: 2,
    failedLocations: 2,
    failedLocationNames: ["Uptown Dental", "Westside Dental"],
    createdCount: 5,
    updatedCount: 6,
    skippedCount: 5,
    totalCount: 16,
  });
});

test("buildGoogleBatchSyncResult handles zero failures", () => {
  const result = buildGoogleBatchSyncResult([{ createdCount: 1, updatedCount: 0, skippedCount: 2, totalCount: 3 }], []);

  assert.deepEqual(result, {
    syncedLocations: 1,
    failedLocations: 0,
    failedLocationNames: [],
    createdCount: 1,
    updatedCount: 0,
    skippedCount: 2,
    totalCount: 3,
  });
});
