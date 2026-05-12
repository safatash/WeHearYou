import { getGoogleBatchSyncResultCardCopy, type GoogleBatchSyncResultCardData } from "@/lib/google-batch-sync-result-card";

type GoogleBatchSyncResultCardProps = GoogleBatchSyncResultCardData;

export function GoogleBatchSyncResultCard(props: GoogleBatchSyncResultCardProps) {
  const copy = getGoogleBatchSyncResultCardCopy(props);

  if (!copy) {
    return null;
  }

  return (
    <div className="mt-2 rounded-2xl border border-slate-200 bg-slate-50 p-3 text-sm text-slate-700">
      <p>
        <span className="font-semibold">Last batch sync:</span> {copy.statusLabel}
      </p>
      <p className="mt-1">
        <span className="font-semibold">Batch totals:</span> {copy.totalsLabel}
      </p>
      {copy.failedNamesLabel ? (
        <p className="mt-1">
          <span className="font-semibold">Failed locations:</span> {copy.failedNamesLabel}
        </p>
      ) : null}
      {copy.messageLabel ? (
        <p className="mt-1 text-rose-700">
          <span className="font-semibold">Batch message:</span> {copy.messageLabel}
        </p>
      ) : null}
      <p className="mt-1 text-xs text-slate-500">Recorded {copy.recordedAtLabel}</p>
    </div>
  );
}
