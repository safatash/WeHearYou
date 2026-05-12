import assert from "node:assert/strict";
import test from "node:test";
import { getGoogleSyncBannerCopy } from "./google-sync-banner";

test("getGoogleSyncBannerCopy returns null without a Google state", () => {
  assert.equal(
    getGoogleSyncBannerCopy({
      createdCount: 0,
      updatedCount: 0,
      skippedCount: 0,
      totalCount: 0,
      syncedLocations: 0,
      failedLocations: 0,
      failedLocationNames: [],
    }),
    null,
  );
});

test("getGoogleSyncBannerCopy formats bulk partial sync banners", () => {
  assert.deepEqual(
    getGoogleSyncBannerCopy({
      googleState: "bulk-sync-partial",
      createdCount: 5,
      updatedCount: 6,
      skippedCount: 5,
      totalCount: 16,
      syncedLocations: 2,
      failedLocations: 1,
      failedLocationNames: ["Chelsea Dental"],
    }),
    {
      tone: "warning",
      message: "Bulk sync partially complete, 2 locations synced, 1 failed, 5 imported, 6 updated, 5 unchanged, 16 fetched from Google.",
      detail: "Failed locations: Chelsea Dental",
    },
  );
});

test("getGoogleSyncBannerCopy formats retry partial sync banners", () => {
  assert.deepEqual(
    getGoogleSyncBannerCopy({
      googleState: "retry-sync-partial",
      createdCount: 5,
      updatedCount: 6,
      skippedCount: 5,
      totalCount: 16,
      syncedLocations: 2,
      failedLocations: 1,
      failedLocationNames: ["Chelsea Dental"],
    }),
    {
      tone: "warning",
      message: "Retry partially complete, 2 failed locations re-synced, 1 still failing, 5 imported, 6 updated, 5 unchanged, 16 fetched from Google.",
      detail: "Still failing: Chelsea Dental",
    },
  );
});

test("getGoogleSyncBannerCopy formats sync errors", () => {
  assert.deepEqual(
    getGoogleSyncBannerCopy({
      googleState: "sync-error",
      syncMessage: "token expired",
      createdCount: 0,
      updatedCount: 0,
      skippedCount: 0,
      totalCount: 0,
      syncedLocations: 0,
      failedLocations: 0,
      failedLocationNames: [],
    }),
    {
      tone: "error",
      message: "Google sync failed, token expired.",
      detail: null,
    },
  );
});

test("getGoogleSyncBannerCopy formats unknown states as info", () => {
  assert.deepEqual(
    getGoogleSyncBannerCopy({
      googleState: "needs-attention",
      createdCount: 0,
      updatedCount: 0,
      skippedCount: 0,
      totalCount: 0,
      syncedLocations: 0,
      failedLocations: 0,
      failedLocationNames: [],
    }),
    {
      tone: "info",
      message: "Google connection state: needs-attention",
      detail: null,
      highlight: "needs-attention",
    },
  );
});
