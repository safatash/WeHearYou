export const dynamic = "force-dynamic";

import Link from "next/link";
import { AppShell } from "@/components/app-shell";
import { CreateWidgetModal } from "@/components/create-widget-modal";
import { requireActiveMembershipPage } from "@/lib/page-guards";
import { getOrganizationReviewWidgets, getWidgetEligibleLocations } from "@/lib/review-widgets";

function getStatusIcon(status: "healthy" | "inactive" | "sync_required" | "mapping_required") {
  switch (status) {
    case "healthy":
      return "✓";
    case "inactive":
      return "◯";
    case "sync_required":
      return "⟲";
    case "mapping_required":
    default:
      return "⚠";
  }
}

function statusClasses(status: "healthy" | "inactive" | "sync_required" | "mapping_required") {
  switch (status) {
    case "healthy":
      return "bg-emerald-50 text-emerald-700 border-emerald-200 animate-pulse";
    case "inactive":
      return "bg-slate-100 text-slate-600 border-slate-200";
    case "sync_required":
      return "bg-amber-50 text-amber-700 border-amber-200";
    case "mapping_required":
    default:
      return "bg-rose-50 text-rose-700 border-rose-200";
  }
}

export default async function WidgetsPage() {
  const membership = await requireActiveMembershipPage();
  const organization = membership.organization;

  const [widgets, locations] = await Promise.all([
    getOrganizationReviewWidgets(organization.id),
    getWidgetEligibleLocations(organization.id),
  ]);

  const hasWidgets = widgets.length > 0;

  return (
    <AppShell activeScreen="widgets">
      <div className="space-y-8">
        {/* Header */}
        <div>
          <p className="text-sm font-semibold uppercase tracking-[0.22em] text-indigo-600">Widgets</p>
          <h2 className="mt-2 text-4xl font-bold tracking-tight text-slate-950">
            Embeddable review <span className="bg-gradient-to-r from-indigo-600 to-indigo-500 bg-clip-text text-transparent">widgets</span>
          </h2>
          <p className="mt-3 max-w-2xl text-base text-slate-600">
            Share your customer success stories across the web. Create beautiful, responsive widgets that showcase your reviews and build social proof.
          </p>
        </div>

        {/* Main Content */}
        <div className="grid gap-8 lg:grid-cols-3">
          {/* Widgets List - Takes up 2 columns */}
          <div className="lg:col-span-2">
            <div className="space-y-3">
              {hasWidgets ? (
                <>
                  <div className="mb-4">
                    <h3 className="text-lg font-semibold text-slate-900">Your widgets</h3>
                    <p className="mt-1 text-sm text-slate-600">{widgets.length} widget{widgets.length !== 1 ? 's' : ''} active</p>
                  </div>
                  {widgets.map((widget) => (
                    <div
                      key={widget.id}
                      className="group rounded-2xl border border-slate-200 bg-white p-5 shadow-sm hover:shadow-md hover:border-indigo-200 transition-all duration-300 transform hover:scale-[1.02] hover:-translate-y-0.5"
                    >
                      <div className="flex flex-col gap-4">
                        <div className="flex items-start justify-between gap-4">
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-3">
                              <h4 className="text-lg font-semibold text-slate-950 truncate">{widget.name}</h4>
                              <span className={`flex-shrink-0 rounded-full border px-3 py-1.5 text-xs font-bold inline-flex items-center gap-1.5 ${statusClasses(widget.health.status)}`}>
                                <span className="text-sm">{getStatusIcon(widget.health.status)}</span>
                                {widget.health.status.replace(/_/g, " ")}
                              </span>
                            </div>
                            <p className="mt-2 text-sm text-slate-600">
                              📍 <span className="font-medium">{widget.location.name}</span>
                            </p>
                          </div>
                        </div>

                        <div className="flex flex-col gap-2 text-sm">
                          <p className="text-slate-600">{widget.health.message}</p>
                          <p className="text-slate-500 flex items-center gap-1.5">
                            ⭐ <span className="font-medium">{widget.health.reviewCount}</span> published reviews
                          </p>
                        </div>

                        <div className="flex items-center justify-between pt-2 border-t border-slate-100">
                          <Link
                            href={`/widgets/${widget.id}`}
                            className="text-sm font-semibold text-indigo-600 hover:text-indigo-700 transition-colors duration-200 flex items-center gap-1.5"
                          >
                            Manage widget →
                          </Link>
                        </div>
                      </div>
                    </div>
                  ))}
                </>
              ) : (
                <div className="rounded-2xl border-2 border-dashed border-slate-300 bg-gradient-to-br from-slate-50 to-slate-100 p-12 text-center">
                  <div className="text-4xl mb-3">🎉</div>
                  <h4 className="text-lg font-semibold text-slate-900">No widgets yet</h4>
                  <p className="mt-2 text-slate-600">
                    Create your first widget to start showcasing customer reviews on your website.
                  </p>
                  <p className="mt-3 text-sm text-slate-500">
                    You'll need a location with synced Google reviews to get started.
                  </p>
                </div>
              )}
            </div>
          </div>

          {/* Sidebar */}
          <div className="space-y-6">
            {/* Create Widget CTA */}
            <div className="rounded-2xl bg-gradient-to-br from-indigo-50 to-indigo-100 p-6 border border-indigo-200">
              <h3 className="text-lg font-bold text-indigo-950 mb-2">Ready to create?</h3>
              <p className="text-sm text-indigo-700 mb-4">
                Add a new widget to showcase reviews across your digital presence.
              </p>
              <CreateWidgetModal locations={locations} />
            </div>

            {/* Location Status */}
            <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
              <h4 className="text-sm font-semibold text-slate-900 uppercase tracking-[0.12em] mb-3">Location Status</h4>
              <div className="space-y-2">
                {locations.length > 0 ? (
                  locations.map((location) => (
                    <div key={location.id} className="text-sm">
                      <div className="flex items-center justify-between mb-1">
                        <span className="font-medium text-slate-900">{location.name}</span>
                        <span className={`text-xs font-bold px-2 py-1 rounded-full ${location.canCreateWidget ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-100 text-slate-600'}`}>
                          {location.canCreateWidget ? '✓ Ready' : '○ Not ready'}
                        </span>
                      </div>
                      <p className="text-xs text-slate-500">{location.guidance}</p>
                    </div>
                  ))
                ) : (
                  <p className="text-xs text-slate-500">No locations available</p>
                )}
              </div>
            </div>

            {/* Helpful Tips */}
            <div className="rounded-2xl bg-blue-50 border border-blue-200 p-5">
              <h4 className="text-sm font-semibold text-blue-950 mb-2">💡 Pro Tips</h4>
              <ul className="text-xs text-blue-900 space-y-1.5">
                <li className="flex gap-2">
                  <span>•</span>
                  <span>Widgets work best with 10+ reviews</span>
                </li>
                <li className="flex gap-2">
                  <span>•</span>
                  <span>Customize appearance in widget settings</span>
                </li>
                <li className="flex gap-2">
                  <span>•</span>
                  <span>Widgets auto-refresh with new reviews</span>
                </li>
              </ul>
            </div>
          </div>
        </div>
      </div>
    </AppShell>
  );
}
