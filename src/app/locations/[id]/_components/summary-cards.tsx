function MetricCard({ label, value, hint }: { label: string; value: string | number | null; hint?: string }) {
  const empty = value === null || value === undefined;
  return (
    <div className="rounded-2xl border border-[var(--ink-200)] bg-white p-4 shadow-[var(--shadow-sm)]">
      <p className="text-xs font-semibold uppercase tracking-wide text-[var(--ink-500)]">{label}</p>
      <p className="mt-1 text-2xl font-semibold tabular-nums text-[var(--ink-900)]">{empty ? "—" : value}</p>
      {empty && <p className="mt-0.5 text-xs text-[var(--ink-400)]">{hint ?? "Tracking starts when published"}</p>}
    </div>
  );
}

export type SummaryCardsData = {
  avgRating: number | null;
  totalReviews: number;
  newReviewsThisMonth: number;
  pendingReplies: number;
  requestConversion: number | null;
  pageViews: number | null;
  directionClicks: number | null;
  callClicks: number | null;
  websiteClicks: number | null;
};

const pct = (n: number | null) => (n === null ? null : `${Math.round(n * 100)}%`);

export function SummaryCards({ data }: { data: SummaryCardsData }) {
  return (
    <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
      <MetricCard label="Average rating" value={data.avgRating ? data.avgRating.toFixed(1) : null} hint="No reviews yet" />
      <MetricCard label="Total reviews" value={data.totalReviews} />
      <MetricCard label="New reviews this month" value={data.newReviewsThisMonth} />
      <MetricCard label="Pending replies" value={data.pendingReplies} />
      <MetricCard label="Request conversion" value={pct(data.requestConversion)} hint="No requests sent yet" />
      <MetricCard label="Mini-site page views" value={data.pageViews} />
      <MetricCard label="Direction clicks" value={data.directionClicks} />
      <MetricCard label="Call clicks" value={data.callClicks} />
      <MetricCard label="Website clicks" value={data.websiteClicks} />
    </div>
  );
}
