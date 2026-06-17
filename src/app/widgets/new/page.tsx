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
      <WidgetLayoutPicker locations={locations} />
    </AppShell>
  );
}
