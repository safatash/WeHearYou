import Link from "next/link";
import { AppShell } from "@/components/app-shell";
import { OutcomeCard, StatCard } from "@/components/ui";
import { getAnalyticsData } from "@/lib/analytics";

export default async function AnalyticsPage() {
  const analytics = await getAnalyticsData();

  return (
    <AppShell activeScreen="analytics">
      <div className="space-y-6">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <p className="text-sm font-semibold uppercase tracking-[0.22em] text-indigo-600">Analytics & Reporting</p>
            <h2 className="mt-2 text-4xl font-semibold tracking-tight text-slate-950">Performance drilldowns across reviews, funnel behavior, and response trends</h2>
            <p className="mt-3 max-w-3xl text-slate-600">
              This is the analytics layer for WeHearYou, the kind of reporting view agencies expect when they want to prove ROI and monitor location-level reputation performance.
            </p>
          </div>
          <div className="flex gap-3">
            <button className="rounded-2xl border border-slate-200 bg-white px-5 py-3 text-sm font-semibold text-slate-700 shadow-sm">Export PDF</button>
            <button className="rounded-2xl bg-slate-950 px-5 py-3 text-sm font-semibold !text-white shadow-sm visited:!text-white hover:!text-white">Share Report</button>
          </div>
        </div>

        <div className="grid gap-4 xl:grid-cols-4">
          <StatCard title="Review Volume" value={analytics.reviewVolume} meta="Across all connected channels" />
          <StatCard title="Average Rating" value={analytics.averageRating} meta="Weighted reputation score" />
          <StatCard title="Response Rate" value={analytics.responseRate} meta="Invite to action completion" />
          <StatCard title="Avg. Response Time" value={analytics.avgResponseTime} meta="Business follow-up speed trend" />
        </div>

        <div className="grid gap-6 xl:grid-cols-[1.2fr_0.8fr]">
          <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-lg font-semibold text-slate-950">Review Growth</h3>
                <p className="mt-1 text-sm text-slate-500">12-week trend across public reviews and captured feedback</p>
              </div>
              <Link href="/reviews" className="text-sm font-semibold text-indigo-600">
                Open inbox
              </Link>
            </div>
            <div className="mt-8 flex h-72 items-end gap-3">
              {analytics.reviewGrowthBars.map((bar, index) => (
                <div key={index} className="flex flex-1 flex-col items-center gap-3">
                  <div className="w-full rounded-t-2xl bg-gradient-to-t from-indigo-600 to-sky-400" style={{ height: `${bar * 1.6}px` }} />
                  <span className="text-xs text-slate-400">W{index + 1}</span>
                </div>
              ))}
            </div>
          </section>

          <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-lg font-semibold text-slate-950">Sentiment Mix</h3>
                <p className="mt-1 text-sm text-slate-500">How feedback is trending across your customer base</p>
              </div>
              <span className="rounded-full bg-emerald-50 px-3 py-1 text-xs font-semibold text-emerald-700">Live</span>
            </div>
            <div className="mt-6 space-y-4">
              {analytics.sentimentMix.map((item) => (
                <OutcomeCard key={item.label} title={item.label} count={item.value} tone={item.tone} />
              ))}
            </div>
          </section>
        </div>

        <div className="grid gap-6 xl:grid-cols-[0.95fr_1.05fr]">
          <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-semibold text-slate-950">Response Time Trend</h3>
              <span className="text-sm text-slate-500">Lower is better</span>
            </div>
            <div className="mt-8 flex h-64 items-end gap-3">
              {analytics.responseTimeBars.map((bar, index) => (
                <div key={index} className="flex flex-1 flex-col items-center gap-3">
                  <div className="w-full rounded-t-2xl bg-gradient-to-t from-emerald-500 to-teal-300" style={{ height: `${bar * 10}px` }} />
                  <span className="text-xs text-slate-400">W{index + 1}</span>
                </div>
              ))}
            </div>
          </section>

          <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-semibold text-slate-950">Channel Breakdown</h3>
              <span className="text-sm text-slate-500">Source-level reporting</span>
            </div>
            <div className="mt-6 space-y-3">
              {analytics.channelBreakdown.map((item) => (
                <div key={item.label} className="rounded-2xl border border-slate-200 p-4">
                  <div className="flex items-center justify-between gap-4">
                    <div>
                      <p className="font-semibold text-slate-900">{item.label}</p>
                      <p className="mt-1 text-sm text-slate-600">{item.volume}</p>
                    </div>
                    <span className="rounded-full bg-emerald-50 px-3 py-1 text-xs font-semibold uppercase tracking-[0.18em] text-emerald-700">
                      {item.trend}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </section>
        </div>
      </div>
    </AppShell>
  );
}
