import {
  buildBulkGoogleSyncSummary,
  buildGoogleSyncErrorMessage,
  buildRetryGoogleSyncSummary,
  buildSingleLocationGoogleSyncSummary,
} from "./google-sync-summary";

type GoogleSyncBannerState = {
  googleState?: string;
  syncedLocation?: string;
  createdCount: number;
  updatedCount: number;
  skippedCount: number;
  totalCount: number;
  syncedLocations: number;
  failedLocations: number;
  failedLocationNames: string[];
  syncMessage?: string;
};

export function getGoogleSyncBannerCopy({
  googleState,
  syncedLocation,
  createdCount,
  updatedCount,
  skippedCount,
  totalCount,
  syncedLocations,
  failedLocations,
  failedLocationNames,
  syncMessage,
}: GoogleSyncBannerState) {
  if (!googleState) {
    return null;
  }

  if (googleState === "sync-success") {
    return {
      tone: "success" as const,
      message: buildSingleLocationGoogleSyncSummary(syncedLocation ?? "Location", {
        createdCount,
        updatedCount,
        skippedCount,
        totalCount,
      }),
      detail: null,
    };
  }

  if (googleState === "bulk-sync-success" || googleState === "bulk-sync-partial") {
    return {
      tone: googleState === "bulk-sync-partial" ? ("warning" as const) : ("success" as const),
      message: buildBulkGoogleSyncSummary({
        syncedLocations,
        failedLocations,
        createdCount,
        updatedCount,
        skippedCount,
        totalCount,
      }),
      detail: googleState === "bulk-sync-partial" && failedLocationNames.length > 0 ? `Failed locations: ${failedLocationNames.join(", ")}` : null,
    };
  }

  if (googleState === "retry-sync-success" || googleState === "retry-sync-partial") {
    return {
      tone: googleState === "retry-sync-partial" ? ("warning" as const) : ("success" as const),
      message: buildRetryGoogleSyncSummary({
        syncedLocations,
        failedLocations,
        createdCount,
        updatedCount,
        skippedCount,
        totalCount,
      }),
      detail: googleState === "retry-sync-partial" && failedLocationNames.length > 0 ? `Still failing: ${failedLocationNames.join(", ")}` : null,
    };
  }

  if (googleState === "sync-error" || googleState === "bulk-sync-error" || googleState === "retry-sync-error") {
    return {
      tone: "error" as const,
      message: buildGoogleSyncErrorMessage(syncMessage),
      detail: null,
    };
  }

  if (googleState === "connected") {
    return {
      tone: "success" as const,
      message: syncMessage ?? "Google Business Profile connected successfully.",
      detail: syncMessage ? null : "You can now map discovered Google locations to WeHearYou locations and sync reviews.",
    };
  }

  if (googleState === "error") {
    return {
      tone: "warning" as const,
      message: "Google connection was cancelled or denied.",
      detail: syncMessage ?? "Try again when you are ready to approve access.",
    };
  }

  if (googleState === "missing_params") {
    return {
      tone: "error" as const,
      message: "Google OAuth callback was missing required parameters.",
      detail: "The authorization response did not include the code or state values needed to finish setup.",
    };
  }

  if (googleState === "invalid_state") {
    return {
      tone: "error" as const,
      message: "Google OAuth state validation failed.",
      detail: "The callback could not be trusted. Start the Google connect flow again.",
    };
  }

  if (googleState === "callback_failed") {
    return {
      tone: "error" as const,
      message: "Google OAuth completed, but WeHearYou could not finish connecting the account.",
      detail: syncMessage ?? "Check your Google OAuth configuration and try again.",
    };
  }

  return {
    tone: "info" as const,
    message: `Google connection state: ${googleState}`,
    detail: null,
    highlight: googleState,
  };
}
