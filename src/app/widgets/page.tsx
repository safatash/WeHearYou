export const dynamic = "force-dynamic";

import Link from "next/link";
import { AppShell } from "@/components/app-shell";
import { requireActiveMembershipPage } from "@/lib/page-guards";
import { getOrganizationReviewWidgets } from "@/lib/review-widgets";
import { deleteReviewWidget } from "@/app/widgets/actions";

export default async function WidgetsPage() {
  const membership = await requireActiveMembershipPage();
  const organization = membership.organization;

  const widgets = await getOrganizationReviewWidgets(organization.id);

  const hasWidgets = widgets.length > 0;

  return (
    <AppShell activeScreen="widgets">
      <div className="space-y-8">
        {/* Header with CTA */}
        <div className="flex items-end justify-between gap-6">
          <div className="flex-1">
            <p className="text-sm font-semibold uppercase tracking-[0.22em] text-indigo-600">Widget Showcase</p>
            <h2 className="mt-2 text-4xl font-bold tracking-tight text-slate-950">Your embeddable widgets</h2>
            <p className="mt-3 max-w-2xl text-base text-slate-600">
              Manage and customize widgets to showcase customer reviews across your website and digital presence.
            </p>
          </div>
          <div className="flex-shrink-0 w-56">
            <Link
              href="/widgets/new"
              className="block w-full rounded-lg bg-gradient-to-r from-indigo-600 to-indigo-700 hover:from-indigo-700 hover:to-indigo-800 px-5 py-3 text-sm font-semibold text-white shadow-lg hover:shadow-xl transition-all duration-300 text-center"
            >
              ✨ Create New Widget
            </Link>
          </div>
        </div>

        {/* Main Content Grid */}
        <div className="grid gap-8 lg:grid-cols-4">
          {/* Widgets List - Takes up 3 columns */}
          <div className="lg:col-span-3">
            {hasWidgets ? (
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="text-xl font-semibold text-slate-900">Your widgets</h3>
                    <p className="mt-1 text-sm text-slate-600">{widgets.length} widget{widgets.length !== 1 ? 's' : ''} configured</p>
                  </div>
                </div>

                <div className="space-y-2">
                  {widgets.map((widget) => (
                    <div key={widget.id} className="flex items-stretch gap-2">
                      <Link
                        href={`/widgets/${widget.id}`}
                        className="group flex-1 block rounded-lg border border-slate-200 bg-white p-4 shadow-sm hover:shadow-md hover:border-indigo-300 transition-all duration-200"
                      >
                        <div className="space-y-2">
                          {/* Title and Location */}
                          <div>
                            <p className="text-sm text-slate-600">
                              {widget.name}
                            </p>
                            <h4 className="text-lg font-semibold text-slate-950 group-hover:text-indigo-600 transition-colors flex items-center gap-1.5">
                              📍 {widget.location.name}
                            </h4>
                          </div>

                          {/* Status and Reviews */}
                          <div className="flex items-center gap-6 text-xs">
                            <div>
                              <p className="text-slate-600 uppercase tracking-wide font-medium">Status</p>
                              <p className="text-slate-900 font-medium">{widget.health.message}</p>
                            </div>
                            <div>
                              <p className="text-slate-600 uppercase tracking-wide font-medium">Reviews</p>
                              <p className="text-slate-900 font-medium">⭐ {widget.health.reviewCount}</p>
                            </div>
                          </div>

                          {/* CTA */}
                          <div className="pt-1.5 border-t border-slate-100">
                            <span className="text-xs font-semibold text-indigo-600 group-hover:text-indigo-700 transition-colors flex items-center gap-1.5">
                              Manage widget →
                            </span>
                          </div>
                        </div>
                      </Link>
                      <form action={deleteReviewWidget} className="flex-shrink-0">
                        <input type="hidden" name="widgetId" value={widget.id} />
                        <button
                          type="submit"
                          className="h-full rounded-lg border border-rose-200 bg-rose-50 px-3 text-sm font-medium text-rose-600 hover:bg-rose-100 hover:border-rose-300 transition-colors"
                        >
                          Delete
                        </button>
                      </form>
                    </div>
                  ))}
                </div>
              </div>
            ) : (
              <div className="rounded-xl border-2 border-dashed border-slate-300 bg-gradient-to-br from-slate-50 to-slate-100 p-12 text-center">
                <div className="text-5xl mb-4">📭</div>
                <h4 className="text-lg font-semibold text-slate-900">No widgets yet</h4>
                <p className="mt-2 text-slate-600">
                  Create your first widget to start showcasing customer reviews on your website.
                </p>
                <p className="mt-2 text-sm text-slate-500">
                  You&apos;ll need a location with synced Google reviews to get started.
                </p>
              </div>
            )}
          </div>

          {/* Sidebar */}
          <div className="space-y-6">
            {/* Quick Stats */}
            <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
              <h4 className="text-sm font-semibold text-slate-900 uppercase tracking-[0.12em] mb-4">Quick Stats</h4>
              <div className="space-y-3">
                <div>
                  <p className="text-xs text-slate-600 uppercase tracking-wide font-medium">Total Widgets</p>
                  <p className="text-2xl font-bold text-slate-900">{widgets.length}</p>
                </div>
                <div>
                  <p className="text-xs text-slate-600 uppercase tracking-wide font-medium">Total Reviews</p>
                  <p className="text-2xl font-bold text-slate-900">{widgets.reduce((sum, w) => sum + w.health.reviewCount, 0)}</p>
                </div>
              </div>
            </div>

          </div>
        </div>
      </div>
    </AppShell>
  );
}
