import Link from "next/link";
import { Fragment } from "react";
import { formatDateTime } from "@/lib/campaigns";
import type { RequestPerformance as RequestPerformanceData } from "@/lib/request-performance";

export function RequestPerformance({
  perf,
  locationId,
}: {
  perf: RequestPerformanceData;
  locationId: string;
}) {
  const fmtRate = (v: number | null) =>
    v === null ? "—" : `${Math.round(v * 100)}%`;

  const rows: Array<{ label: string; value: string }> = [
    { label: "Requests sent", value: String(perf.requestsSent) },
    { label: "Open rate", value: fmtRate(perf.openRate) },
    { label: "Click rate", value: fmtRate(perf.clickRate) },
    { label: "Review conversion", value: fmtRate(perf.conversionRate) },
    { label: "Best channel", value: perf.bestChannel ?? "—" },
    { label: "Latest campaign", value: perf.latestCampaignName ?? "—" },
    {
      label: "Last request sent",
      value: perf.lastRequestSentAt ? formatDateTime(perf.lastRequestSentAt) : "—",
    },
  ];

  return (
    <div className="rounded-2xl border border-[var(--ink-200)] bg-white p-6 shadow-[var(--shadow-sm)]">
      <h3 className="text-lg font-semibold text-slate-950">Request Performance</h3>

      <dl className="mt-5 grid grid-cols-[1fr_auto] gap-x-6 gap-y-3">
        {rows.map(({ label, value }) => (
          <Fragment key={label}>
            <dt className="text-sm text-slate-500">
              {label}
            </dt>
            <dd className="text-right text-sm font-semibold text-slate-900">
              {value}
            </dd>
          </Fragment>
        ))}
      </dl>

      <div className="mt-6 flex flex-col gap-2">
        <Link
          href={`/campaigns/new?locationId=${locationId}`}
          className="rounded-2xl bg-[var(--accent)] px-4 py-3 text-center text-sm font-semibold text-white"
        >
          Send new review request
        </Link>
        <Link
          href={`/campaigns/new?locationId=${locationId}`}
          className="rounded-2xl border border-[var(--ink-200)] bg-white px-4 py-3 text-center text-sm font-semibold text-slate-700"
        >
          Create campaign for this location
        </Link>
        <Link
          href={`/campaigns?locationId=${locationId}`}
          className="rounded-2xl border border-[var(--ink-200)] bg-white px-4 py-3 text-center text-sm font-semibold text-slate-700"
        >
          View campaign history
        </Link>
      </div>
    </div>
  );
}
