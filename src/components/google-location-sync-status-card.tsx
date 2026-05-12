import { buildGoogleLastSyncResultSummary } from "@/lib/google-sync-summary";
import { formatRelativeSyncTime } from "@/lib/locations";

type GoogleLocationSyncStatusCardProps = {
  name: string;
  lastSyncStatus?: string | null;
  lastSyncAt?: Date | string | null;
  fallbackSyncAt?: Date | string | null;
  lastSyncImportedCount?: number | null;
  lastSyncUpdatedCount?: number | null;
  lastSyncSkippedCount?: number | null;
  lastSyncFetchedCount?: number | null;
  lastSyncMessage?: string | null;
};

export function GoogleLocationSyncStatusCard({
  name,
  lastSyncStatus,
  lastSyncAt,
  fallbackSyncAt,
  lastSyncImportedCount,
  lastSyncUpdatedCount,
  lastSyncSkippedCount,
  lastSyncFetchedCount,
  lastSyncMessage,
}: GoogleLocationSyncStatusCardProps) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-slate-50 p-3 text-sm text-slate-700">
      <div className="flex items-center justify-between gap-3">
        <p className="font-semibold text-slate-900">{name}</p>
        <span
          className={`rounded-full px-2 py-1 text-[11px] font-semibold uppercase tracking-[0.18em] ${
            lastSyncStatus === "error"
              ? "bg-rose-100 text-rose-700"
              : lastSyncAt
                ? "bg-indigo-100 text-indigo-700"
                : "bg-slate-200 text-slate-600"
          }`}
        >
          {lastSyncStatus === "error" ? "Failed" : lastSyncAt ? "Synced" : "No sync yet"}
        </span>
      </div>
      <p className="mt-2">Last synced: {formatRelativeSyncTime(lastSyncAt ?? fallbackSyncAt)}</p>
      {typeof lastSyncImportedCount === "number" || typeof lastSyncUpdatedCount === "number" || typeof lastSyncSkippedCount === "number" ? (
        <p className="mt-1">
          Last result: {buildGoogleLastSyncResultSummary({
            createdCount: lastSyncImportedCount ?? 0,
            updatedCount: lastSyncUpdatedCount ?? 0,
            skippedCount: lastSyncSkippedCount ?? 0,
            totalCount: lastSyncFetchedCount ?? 0,
          })}
        </p>
      ) : null}
      {lastSyncMessage ? <p className="mt-1 text-rose-700">Last error: {lastSyncMessage}</p> : null}
    </div>
  );
}
