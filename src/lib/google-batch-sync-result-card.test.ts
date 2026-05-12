import assert from "node:assert/strict";
import test from "node:test";
import { getGoogleBatchSyncResultCardCopy } from "./google-batch-sync-result-card";

test("getGoogleBatchSyncResultCardCopy returns null when no batch counts exist", () => {
  assert.equal(getGoogleBatchSyncResultCardCopy({}), null);
});

test("getGoogleBatchSyncResultCardCopy formats partial batch sync details", () => {
  const copy = getGoogleBatchSyncResultCardCopy({
    status: "partial",
    syncedCount: 2,
    failedCount: 1,
    importedCount: 5,
    updatedCount: 6,
    skippedCount: 5,
    fetchedCount: 16,
    failedNames: "Chelsea Dental|Uptown Dental",
    message: "Still failing: Chelsea Dental",
    syncedAt: new Date(Date.now() - 2 * 60 * 60 * 1000),
  });

  assert.deepEqual(copy, {
    statusLabel: "Partially complete",
    totalsLabel: "5 imported, 6 updated, 5 unchanged, 16 fetched, 2 synced, 1 failed",
    failedNamesLabel: "Chelsea Dental, Uptown Dental",
    messageLabel: "Still failing: Chelsea Dental",
    recordedAtLabel: "2h ago",
  });
});

test("getGoogleBatchSyncResultCardCopy defaults missing counts to zero and error status label", () => {
  const copy = getGoogleBatchSyncResultCardCopy({
    status: "error",
    failedCount: 3,
    syncedAt: "invalid-date",
  });

  assert.deepEqual(copy, {
    statusLabel: "Failed",
    totalsLabel: "0 imported, 0 updated, 0 unchanged, 0 fetched, 0 synced, 3 failed",
    failedNamesLabel: null,
    messageLabel: null,
    recordedAtLabel: "Unknown",
  });
});
