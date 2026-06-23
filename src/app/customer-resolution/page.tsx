export const dynamic = "force-dynamic";

import Link from "next/link";
import { ResolutionPriority, ResolutionStatus } from "@prisma/client";
import { AppShell } from "@/components/app-shell";
import { getCurrentAccessibleLocationIds } from "@/lib/current-scope";
import { getResolutionCases } from "@/lib/resolution-cases";
import { getResolutionStats } from "@/lib/resolution-analytics";

const PRIORITY_BADGE: Record<string, string> = {
  CRITICAL: "bg-rose-100 text-rose-700",
  HIGH: "bg-amber-100 text-amber-700",
  MEDIUM: "bg-slate-100 text-slate-600",
  LOW: "bg-slate-100 text-slate-500",
};

const STATUS_BADGE: Record<string, string> = {
  NEW: "bg-indigo-50 text-indigo-700",
  NEEDS_RESPONSE: "bg-amber-50 text-amber-700",
  CONTACTED: "bg-sky-50 text-sky-700",
  IN_PROGRESS: "bg-sky-50 text-sky-700",
  RESOLVED: "bg-emerald-50 text-emerald-700",
  CLOSED: "bg-slate-100 text-slate-500",
};

const fmtStatus = (s: string) => s.replace(/_/g, " ").toLowerCase().replace(/\b\w/g, (c) => c.toUpperCase());

function StatTile({ label, value, tone }: { label: string; value: string | number; tone?: "warning" }) {
  return (
    <div className="rounded-3xl border border-slate-200/80 bg-white p-4 shadow-[0_12px_32px_rgba(15,23,42,0.05)]">
      <p className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">{label}</p>
      <p className={`mt-1 text-2xl font-semibold tracking-tight ${tone === "warning" ? "text-amber-600" : "text-slate-950"}`}>{value}</p>
    </div>
  );
}

export default async function CustomerResolutionPage({ searchParams }: { searchParams?: Promise<Record<string, string | string[] | undefined>> }) {
  const params = (await searchParams) ?? {};
  const statusFilter = typeof params.status === "string" && params.status in ResolutionStatus ? (params.status as ResolutionStatus) : undefined;
  const priorityFilter = typeof params.priority === "string" && params.priority in ResolutionPriority ? (params.priority as ResolutionPriority) : undefined;

  const locationIds = await getCurrentAccessibleLocationIds();
  const [stats, cases] = await Promise.all([
    getResolutionStats(locationIds, 30),
    getResolutionCases(locationIds, { status: statusFilter, priority: priorityFilter }),
  ]);

  return (
    <AppShell activeScreen="customer-resolution">
      <div className="space-y-6">
        <div>
          <p className="text-sm font-semibold uppercase tracking-[0.22em] text-indigo-600">Customer Resolution</p>
          <h2 className="mt-2 text-4xl font-semibold tracking-tight text-slate-950">Resolution cases</h2>
          <p className="mt-3 max-w-3xl text-slate-600">Unhappy-customer feedback, organized into actionable cases you can triage, respond to, and follow up on.</p>
        </div>

        <div className="grid grid-cols-2 gap-4 lg:grid-cols-6">
          <StatTile label="New" value={stats.newCases} />
          <StatTile label="High priority" value={stats.highPriority} tone={stats.highPriority > 0 ? "warning" : undefined} />
          <StatTile label="Resolved" value={stats.resolved} />
          <StatTile label="Resolution rate" value={`${Math.round(stats.resolutionRate * 100)}%`} />
          <StatTile label="Avg rating" value={stats.averageRating.toFixed(1)} />
          <StatTile label="Contact requested" value={stats.contactRequested} />
        </div>

        {/* Filters */}
        <div className="flex flex-wrap gap-2">
          <Link href="/customer-resolution" className={`rounded-2xl px-4 py-2 text-sm font-semibold ${!statusFilter && !priorityFilter ? "bg-slate-950 text-white" : "border border-slate-200 bg-white text-slate-700"}`}>All</Link>
          {(["NEW", "NEEDS_RESPONSE", "IN_PROGRESS", "RESOLVED"] as const).map((s) => (
            <Link key={s} href={`/customer-resolution?status=${s}`} className={`rounded-2xl px-4 py-2 text-sm font-semibold ${statusFilter === s ? "bg-slate-950 text-white" : "border border-slate-200 bg-white text-slate-700"}`}>{fmtStatus(s)}</Link>
          ))}
          {(["HIGH", "CRITICAL"] as const).map((p) => (
            <Link key={p} href={`/customer-resolution?priority=${p}`} className={`rounded-2xl px-4 py-2 text-sm font-semibold ${priorityFilter === p ? "bg-slate-950 text-white" : "border border-slate-200 bg-white text-slate-700"}`}>{fmtStatus(p)}</Link>
          ))}
        </div>

        <section className="overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm">
          {cases.length === 0 ? (
            <p className="p-10 text-center text-sm text-slate-500">No resolution cases yet.</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead className="border-b border-slate-200 bg-slate-50 text-xs font-semibold uppercase tracking-wide text-slate-500">
                  <tr>
                    <th className="px-4 py-3">Customer</th>
                    <th className="px-4 py-3">Rating</th>
                    <th className="px-4 py-3">Priority</th>
                    <th className="px-4 py-3">Issues</th>
                    <th className="px-4 py-3">Contact</th>
                    <th className="px-4 py-3">Status</th>
                    <th className="px-4 py-3">Created</th>
                    <th className="px-4 py-3"></th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {cases.map((c) => (
                    <tr key={c.id} className="hover:bg-slate-50">
                      <td className="px-4 py-3 font-medium text-slate-900">
                        {c.customerName || "Anonymous"}
                        <div className="text-xs text-slate-400">{c.location.name}</div>
                      </td>
                      <td className="px-4 py-3 tabular-nums text-slate-700">{c.rating}★</td>
                      <td className="px-4 py-3"><span className={`rounded-full px-2.5 py-1 text-[11px] font-semibold ${PRIORITY_BADGE[c.priority]}`}>{c.priority}</span></td>
                      <td className="px-4 py-3 text-xs text-slate-500">{c.issueCategories.slice(0, 2).join(", ")}{c.issueCategories.length > 2 ? "…" : ""}</td>
                      <td className="px-4 py-3 text-xs text-slate-500">{c.contactPreference === "NONE" ? "—" : c.contactPreference.toLowerCase()}</td>
                      <td className="px-4 py-3"><span className={`rounded-full px-2.5 py-1 text-[11px] font-semibold ${STATUS_BADGE[c.status]}`}>{fmtStatus(c.status)}</span></td>
                      <td className="px-4 py-3 text-xs text-slate-500">{c.createdAt.toLocaleDateString("en-US", { month: "short", day: "numeric" })}</td>
                      <td className="px-4 py-3"><Link href={`/customer-resolution/${c.id}`} className="text-sm font-semibold text-indigo-600">Open</Link></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>
      </div>
    </AppShell>
  );
}
