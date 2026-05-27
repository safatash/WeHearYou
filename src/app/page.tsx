export const dynamic = "force-dynamic";

import Link from "next/link";
import { redirect } from "next/navigation";
import { AppShell } from "@/components/app-shell";
import { getDashboardData } from "@/lib/dashboard";
import { getCurrentAccessibleLocationIds } from "@/lib/current-scope";
import { getCurrentMembership } from "@/lib/authz";
import { prisma } from "@/lib/prisma";
import { OnboardingChecklist } from "@/components/onboarding-checklist";
import { canManageTeam } from "@/lib/team";
import { formatRelativeSyncTime } from "@/lib/relative-time";

export default async function DashboardPage() {
  const membership = await getCurrentMembership();

  if (!membership) {
    redirect("/login");
  }

  const org = await prisma.organization.findUnique({
    where: { id: membership.organizationId },
    select: {
      onboardingDismissedAt: true,
      locations: {
        select: { id: true, googleLocationName: true },
        orderBy: { createdAt: "asc" },
        take: 1,
      },
      _count: { select: { locations: true } },
    },
  });

  const hasLocation = (org?._count.locations ?? 0) > 0;
  const hasGoogle = (org?.locations[0]?.googleLocationName ?? null) !== null;
  const contactCount = hasLocation
    ? await prisma.contact.count({ where: { locationId: org!.locations[0].id } })
    : 0;
  const hasContacts = contactCount > 0;

  const dismissed = Boolean(org?.onboardingDismissedAt);
  const allDone = hasLocation && hasGoogle && hasContacts;
  const showChecklist = !dismissed && !allDone;
  const canDismiss = canManageTeam(membership);

  if (!hasLocation && !dismissed) {
    redirect("/onboarding");
  }

  const locationIds = await getCurrentAccessibleLocationIds();
  const dashboard = await getDashboardData(locationIds);

  const sortedLocations = [...dashboard.locations].sort(
    (a, b) => (b.avgRating ?? 0) - (a.avgRating ?? 0),
  );

  return (
    <AppShell activeScreen="dashboard">
      <div className="space-y-6">
        {showChecklist && (
          <OnboardingChecklist
            hasLocation={hasLocation}
            hasGoogle={hasGoogle}
            hasContacts={hasContacts}
            canDismiss={canDismiss}
          />
        )}

        {/* Page header */}
        <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <h1 className="text-2xl font-bold text-slate-900">Dashboard</h1>
            <p className="mt-1 text-sm text-slate-500">Your reputation at a glance</p>
          </div>
          <div className="flex shrink-0 gap-3">
            <Link
              href="/funnel-preview"
              className="rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm font-medium text-slate-700 hover:border-slate-300"
            >
              View Funnel
            </Link>
            <Link
              href="/campaigns/new"
              className="rounded-xl bg-indigo-600 px-4 py-2 text-sm font-semibold text-white hover:bg-indigo-700"
            >
              Send New Request
            </Link>
          </div>
        </div>

        {/* Stat cards */}
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 md:grid-cols-3 xl:grid-cols-[1.4fr_1fr_1fr]">
          {/* Google Reviews — hero */}
          <div className="rounded-2xl border border-indigo-100 bg-white p-6 shadow-sm">
            <p className="text-xs font-bold uppercase tracking-widest text-slate-400">
              Google Reviews
            </p>
            <p className="mt-2 text-4xl font-extrabold text-indigo-700">
              {dashboard.channelBreakdown.google}
            </p>
            <p className="mt-1 text-sm font-semibold text-indigo-400">
              ★ {dashboard.googleAvgRating} average
            </p>
            {dashboard.googleReviewsThisMonth > 0 && (
              <p className="mt-1 text-xs font-semibold text-emerald-600">
                ↑ {dashboard.googleReviewsThisMonth} this month
              </p>
            )}
          </div>

          {/* Funnel Conversion */}
          <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
            <p className="text-xs font-bold uppercase tracking-widest text-slate-400">
              Funnel Conversion
            </p>
            <p className="mt-2 text-4xl font-extrabold text-slate-900">
              {dashboard.requestConversion}
            </p>
            <p className="mt-1 text-sm text-slate-400">sent → meaningful activity</p>
          </div>

          {/* Private Feedback */}
          <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
            <p className="text-xs font-bold uppercase tracking-widest text-slate-400">
              Private Feedback
            </p>
            <p
              className={`mt-2 text-4xl font-extrabold ${
                dashboard.funnelOutcomes.privateFeedback > 0
                  ? "text-amber-500"
                  : "text-slate-900"
              }`}
            >
              {dashboard.funnelOutcomes.privateFeedback}
            </p>
            <p className="mt-1 text-sm text-slate-400">private feedback</p>
            {dashboard.funnelOutcomes.privateFeedback > 0 ? (
              <p className="mt-1 text-xs font-semibold text-amber-500">needs attention</p>
            ) : (
              <p className="mt-1 text-xs font-semibold text-emerald-600">all clear</p>
            )}
          </div>
        </div>

        {/* Body grid */}
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-[1.4fr_1fr]">
          {/* Recent Activity */}
          <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
            <div className="mb-4 flex items-center justify-between">
              <h3 className="text-sm font-bold text-slate-900">Recent Activity</h3>
              <Link
                href="/reviews"
                className="text-xs font-semibold text-indigo-600 hover:text-indigo-800"
              >
                Open inbox →
              </Link>
            </div>
            <div className="space-y-2">
              {dashboard.recentActivity.length === 0 ? (
                <p className="text-sm text-slate-400">No reviews yet.</p>
              ) : (
                dashboard.recentActivity.map((item) => (
                  <div
                    key={item.createdAt.toISOString()}
                    className={`flex items-start gap-3 rounded-xl px-3 py-2.5 ${
                      item.isPrivate
                        ? "border-l-2 border-amber-400 bg-amber-50"
                        : "border-l-2 border-emerald-400 bg-slate-50"
                    }`}
                  >
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-semibold text-slate-900">
                        {item.reviewerName || "Anonymous"}
                      </p>
                      <p className="text-xs text-amber-400">{item.rating > 0 ? "★".repeat(item.rating) : "—"}</p>
                      <p className="text-xs text-slate-400">
                        {item.sourceLabel} · {formatRelativeSyncTime(item.createdAt)}
                      </p>
                    </div>
                    <span
                      className={`shrink-0 rounded-full px-2 py-0.5 text-xs font-bold uppercase tracking-wide ${
                        item.isPrivate
                          ? "bg-amber-100 text-amber-700"
                          : "bg-emerald-100 text-emerald-700"
                      }`}
                    >
                      {item.isPrivate ? "Private" : item.sourceLabel}
                    </span>
                  </div>
                ))
              )}
            </div>
          </div>

          {/* Locations + Funnel Outcomes */}
          <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
            <div className="mb-4 flex items-center justify-between">
              <h3 className="text-sm font-bold text-slate-900">Locations</h3>
              <Link
                href="/locations"
                className="text-xs font-semibold text-indigo-600 hover:text-indigo-800"
              >
                Manage →
              </Link>
            </div>
            <div className="space-y-2">
              {sortedLocations.length === 0 ? (
                <p className="text-sm text-slate-400">No locations yet.</p>
              ) : (
                sortedLocations.map((loc) => {
                  const displayName = loc.name.includes(", ")
                    ? loc.name.split(", ").slice(1).join(", ")
                    : loc.name;
                  const reviewCount = loc._count.reviews;
                  return (
                    <div
                      key={loc.id}
                      className="flex items-center justify-between rounded-xl bg-slate-50 px-3 py-2.5"
                    >
                      <div>
                        <p className="text-sm font-semibold text-slate-900">{displayName}</p>
                        <p className="text-xs text-slate-400">
                          {reviewCount} {reviewCount === 1 ? "review" : "reviews"} · {loc.status}
                        </p>
                      </div>
                      {loc.avgRating !== null && (
                        <span
                          className={`text-sm font-bold ${
                            loc.avgRating >= 4.5 ? "text-emerald-600" : "text-amber-500"
                          }`}
                        >
                          {loc.avgRating.toFixed(1)} ★
                        </span>
                      )}
                    </div>
                  );
                })
              )}
            </div>

            {/* Funnel Outcomes mini row */}
            <div className="mt-4 border-t border-slate-100 pt-4">
              <p className="mb-2 text-xs font-bold uppercase tracking-widest text-slate-400">
                Funnel Outcomes
              </p>
              <div className="grid grid-cols-3 gap-2">
                <div className="rounded-xl bg-emerald-50 p-2 text-center">
                  <p className="text-lg font-extrabold text-emerald-700">
                    {dashboard.funnelOutcomes.redirectedToGoogle}
                  </p>
                  <p className="text-xs font-semibold text-emerald-500">→ Google</p>
                </div>
                <div className="rounded-xl bg-amber-50 p-2 text-center">
                  <p className="text-lg font-extrabold text-amber-700">
                    {dashboard.funnelOutcomes.privateFeedback}
                  </p>
                  <p className="text-xs font-semibold text-amber-500">Feedback</p>
                </div>
                <div className="rounded-xl bg-slate-100 p-2 text-center">
                  <p className="text-lg font-extrabold text-slate-500">
                    {dashboard.funnelOutcomes.awaitingResponse}
                  </p>
                  <p className="text-xs font-semibold text-slate-400">Awaiting</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </AppShell>
  );
}
