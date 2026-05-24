export const dynamic = "force-dynamic";

import { AppShell } from "@/components/app-shell";
import { WidgetLayoutPicker } from "@/components/widget-layout-picker";
import { requireActiveMembershipPage } from "@/lib/page-guards";
import { getWidgetEligibleLocations } from "@/lib/review-widgets";

export default async function NewWidgetPage() {
  const membership = await requireActiveMembershipPage();
  const locations = await getWidgetEligibleLocations(membership.organization.id);

  return (
    <AppShell activeScreen="widgets">
      <div className="space-y-8">
        <div className="border-b border-slate-200 pb-6">
          <p className="text-sm font-semibold uppercase tracking-[0.22em] text-indigo-600">Widget Showcase</p>
          <h2 className="mt-4 text-4xl font-bold tracking-tight text-slate-950">Select widget layout</h2>
          <p className="mt-3 text-base text-slate-600">
            Choose a layout — then give it a name and pick a location.
          </p>
        </div>
        <WidgetLayoutPicker locations={locations} />
      </div>
    </AppShell>
  );
}
