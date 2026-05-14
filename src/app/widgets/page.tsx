export const dynamic = "force-dynamic";

import Link from "next/link";
import { AppShell } from "@/components/app-shell";
import { requireActiveMembershipPage } from "@/lib/page-guards";
import { getOrganizationReviewWidgets, getWidgetEligibleLocations } from "@/lib/review-widgets";
import { createReviewWidget } from "@/app/widgets/actions";

function statusClasses(status: "healthy" | "inactive" | "sync_required" | "mapping_required") {
  switch (status) {
    case "healthy":
      return "bg-emerald-50 text-emerald-700";
    case "inactive":
      return "bg-slate-100 text-slate-600";
    case "sync_required":
      return "bg-amber-50 text-amber-700";
    case "mapping_required":
    default:
      return "bg-rose-50 text-rose-700";
  }
}

export default async function WidgetsPage() {
  const membership = await requireActiveMembershipPage();
  const organization = membership.organization;

  const [widgets, locations] = await Promise.all([
    getOrganizationReviewWidgets(organization.id),
    getWidgetEligibleLocations(organization.id),
  ]);

  return (
    <AppShell activeScreen="widgets">
      <div className="space-y-6">
        <div>
          <p className="text-sm font-semibold uppercase tracking-[0.22em] text-indigo-600">Widgets</p>
          <h2 className="mt-2 text-3xl font-semibold tracking-tight text-slate-950">Embeddable review widgets</h2>
          <p className="mt-2 text-sm text-slate-600">Only locations with mapped Google profiles and synced reviews are ready for public widgets.</p>
        </div>

        <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
          <h3 className="text-xl font-semibold text-slate-950">Create widget</h3>
          <form action={createReviewWidget} className="mt-4 flex flex-wrap gap-3">
            <input
              name="name"
              placeholder="Main reviews widget"
              className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm"
            />
            <select name="locationId" className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm">
              <option value="">Choose location</option>
              {locations.map((location) => (
                <option key={location.id} value={location.id} disabled={!location.canCreateWidget}>
                  {location.name} {!location.canCreateWidget ? `(${location.guidance})` : `(${location.reviewCount} reviews)`}
                </option>
              ))}
            </select>
            <button className="rounded-2xl bg-slate-950 px-4 py-3 text-sm font-semibold text-white">
              Create widget
            </button>
          </form>
          <div className="mt-4 space-y-2 text-sm text-slate-600">
            {locations.map((location) => (
              <p key={`${location.id}-guidance`}>
                <span className="font-semibold text-slate-900">{location.name}:</span> {location.guidance}
              </p>
            ))}
          </div>
        </section>

        <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
          <h3 className="text-xl font-semibold text-slate-950">Existing widgets</h3>
          <div className="mt-4 space-y-3">
            {widgets.length > 0 ? (
              widgets.map((widget) => (
                <div key={widget.id} className="rounded-2xl border border-slate-200 p-4">
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <div>
                      <p className="font-semibold text-slate-900">{widget.name}</p>
                      <p className="mt-1 text-sm text-slate-600">Location: {widget.location.name}</p>
                    </div>
                    <span className={`rounded-full px-3 py-1 text-xs font-semibold uppercase tracking-[0.18em] ${statusClasses(widget.health.status)}`}>
                      {widget.health.status.replace("_", " ")}
                    </span>
                  </div>
                  <p className="mt-2 text-sm text-slate-600">{widget.health.message}</p>
                  <p className="mt-1 text-sm text-slate-500">Published Google reviews available: {widget.health.reviewCount}</p>
                  <Link href={`/widgets/${widget.id}`} className="mt-3 inline-block text-sm font-semibold text-indigo-600">
                    Manage widget
                  </Link>
                </div>
              ))
            ) : (
              <div className="rounded-2xl border border-dashed border-slate-300 bg-slate-50 p-6 text-sm text-slate-500">
                No widgets yet. Create one from a location with synced Google reviews.
              </div>
            )}
          </div>
        </section>
      </div>
    </AppShell>
  );
}
