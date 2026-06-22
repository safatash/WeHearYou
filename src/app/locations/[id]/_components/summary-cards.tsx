import { Icon, type IconName } from "@/components/icon";

function MetricCard({
  icon,
  label,
  value,
  sub,
  hint,
}: {
  icon: IconName;
  label: string;
  value: string | number | null;
  sub?: string;
  hint?: string;
}) {
  const empty = value === null || value === undefined;
  return (
    <div className="flex flex-col gap-2 rounded-2xl border border-[var(--ink-200)] bg-white p-4 shadow-[var(--shadow-sm)]">
      <div className="flex items-center gap-2">
        <span className="grid h-7 w-7 shrink-0 place-items-center rounded-lg bg-[var(--accent-soft)] text-[var(--accent-strong)]">
          <Icon name={icon} size={15} />
        </span>
        <span className="text-xs font-semibold text-[var(--ink-500)]">{label}</span>
      </div>
      <span className="text-2xl font-semibold tabular-nums tracking-tight text-[var(--ink-900)]">{empty ? "—" : value}</span>
      <span className="text-xs text-[var(--ink-400)]">{empty ? hint ?? "Tracking starts when published" : sub ?? " "}</span>
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
    <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
      <MetricCard icon="star" label="Average rating" value={data.avgRating ? data.avgRating.toFixed(1) : null} sub="across all sources" hint="No reviews yet" />
      <MetricCard icon="chat" label="Total reviews" value={data.totalReviews} sub={`${data.newReviewsThisMonth} new this month`} />
      <MetricCard icon="send" label="Request conversion" value={pct(data.requestConversion)} sub="requests answered" hint="No requests sent yet" />
      <MetricCard icon="inbox" label="Pending replies" value={data.pendingReplies} sub="awaiting response" />
      <MetricCard icon="eye" label="Public page views" value={data.pageViews} sub="last 30 days" />
      <MetricCard icon="external" label="Website clicks" value={data.websiteClicks} sub="from public page" />
      <MetricCard icon="pin" label="Directions" value={data.directionClicks} sub="map clicks" />
      <MetricCard icon="phone" label="Calls" value={data.callClicks} sub="tap-to-call" />
    </div>
  );
}
