import assert from "node:assert/strict";
import test from "node:test";
import { buildBulkGoogleSyncRedirect, buildRetryGoogleSyncRedirect } from "./google-batch-sync-actions";

test("buildBulkGoogleSyncRedirect returns a partial success redirect with aggregated totals", () => {
  const result = buildBulkGoogleSyncRedirect({
    results: [
      { createdCount: 2, updatedCount: 1, skippedCount: 3, totalCount: 6 },
      { createdCount: 3, updatedCount: 5, skippedCount: 2, totalCount: 10 },
    ],
    failedLocationNames: ["Chelsea Dental"],
  });

  assert.deepEqual(result, {
    status: "partial",
    message: "Failed locations: Chelsea Dental",
    redirectPath: "/integrations?google=bulk-sync-partial&locations=2&failed=1&failedNames=Chelsea+Dental&created=5&updated=6&skipped=5&total=16",
    totals: {
      syncedLocations: 2,
      failedLocations: 1,
      failedLocationNames: ["Chelsea Dental"],
      createdCount: 5,
      updatedCount: 6,
      skippedCount: 5,
      totalCount: 16,
    },
  });
});

test("buildBulkGoogleSyncRedirect returns an error redirect when all locations fail", () => {
  const result = buildBulkGoogleSyncRedirect({
    results: [],
    failedLocationNames: ["Chelsea Dental", "Uptown Dental"],
  });

  assert.deepEqual(result, {
    status: "error",
    message: "Bulk Google review sync failed for all mapped locations",
    redirectPath: "/integrations?google=bulk-sync-error&message=Bulk+Google+review+sync+failed+for+all+mapped+locations",
    totals: {
      syncedLocations: 0,
      failedLocations: 2,
      failedLocationNames: ["Chelsea Dental", "Uptown Dental"],
      createdCount: 0,
      updatedCount: 0,
      skippedCount: 0,
      totalCount: 0,
    },
  });
});

test("buildBulkGoogleSyncRedirect returns a success redirect when no locations fail", () => {
  const result = buildBulkGoogleSyncRedirect({
    results: [{ createdCount: 1, updatedCount: 2, skippedCount: 3, totalCount: 6 }],
    failedLocationNames: [],
  });

  assert.deepEqual(result, {
    status: "success",
    message: null,
    redirectPath: "/integrations?google=bulk-sync-success&locations=1&failed=0&failedNames=&created=1&updated=2&skipped=3&total=6",
    totals: {
      syncedLocations: 1,
      failedLocations: 0,
      failedLocationNames: [],
      createdCount: 1,
      updatedCount: 2,
      skippedCount: 3,
      totalCount: 6,
    },
  });
});

test("buildRetryGoogleSyncRedirect returns a partial retry redirect with aggregated totals", () => {
  const result = buildRetryGoogleSyncRedirect({
    results: [
      { createdCount: 2, updatedCount: 1, skippedCount: 3, totalCount: 6 },
      { createdCount: 3, updatedCount: 5, skippedCount: 2, totalCount: 10 },
    ],
    failedLocationNames: ["Chelsea Dental"],
  });

  assert.deepEqual(result, {
    status: "partial",
    message: "Still failing: Chelsea Dental",
    redirectPath: "/integrations?google=retry-sync-partial&locations=2&failed=1&failedNames=Chelsea+Dental&created=5&updated=6&skipped=5&total=16",
    totals: {
      syncedLocations: 2,
      failedLocations: 1,
      failedLocationNames: ["Chelsea Dental"],
      createdCount: 5,
      updatedCount: 6,
      skippedCount: 5,
      totalCount: 16,
    },
  });
});

test("buildRetryGoogleSyncRedirect returns an error redirect when all retries fail", () => {
  const result = buildRetryGoogleSyncRedirect({
    results: [],
    failedLocationNames: ["Chelsea Dental", "Uptown Dental"],
  });

  assert.deepEqual(result, {
    status: "error",
    message: "Retry sync failed for all selected locations",
    redirectPath: "/integrations?google=retry-sync-error&message=Retry+sync+failed+for+all+selected+locations",
    totals: {
      syncedLocations: 0,
      failedLocations: 2,
      failedLocationNames: ["Chelsea Dental", "Uptown Dental"],
      createdCount: 0,
      updatedCount: 0,
      skippedCount: 0,
      totalCount: 0,
    },
  });
});

test("buildRetryGoogleSyncRedirect returns a success redirect when all retries succeed", () => {
  const result = buildRetryGoogleSyncRedirect({
    results: [{ createdCount: 1, updatedCount: 2, skippedCount: 3, totalCount: 6 }],
    failedLocationNames: [],
  });

  assert.deepEqual(result, {
    status: "success",
    message: null,
    redirectPath: "/integrations?google=retry-sync-success&locations=1&failed=0&failedNames=&created=1&updated=2&skipped=3&total=6",
    totals: {
      syncedLocations: 1,
      failedLocations: 0,
      failedLocationNames: [],
      createdCount: 1,
      updatedCount: 2,
      skippedCount: 3,
      totalCount: 6,
    },
  });
});
