export function StatusBadge({ status, hasVideo }: { status: string; hasVideo: boolean }) {
  if (!hasVideo) {
    return <span className="inline-block rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold uppercase tracking-wide text-slate-500">Awaiting</span>;
  }
  if (status === "APPROVED") {
    return <span className="inline-block rounded-full bg-emerald-50 px-3 py-1 text-xs font-semibold uppercase tracking-wide text-emerald-700">Published</span>;
  }
  if (status === "REJECTED") {
    return <span className="inline-block rounded-full bg-rose-50 px-3 py-1 text-xs font-semibold uppercase tracking-wide text-rose-700">Rejected</span>;
  }
  return <span className="inline-block rounded-full bg-amber-50 px-3 py-1 text-xs font-semibold uppercase tracking-wide text-amber-700">Pending</span>;
}
