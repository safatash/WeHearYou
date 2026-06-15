export const dynamic = "force-dynamic";

import { AppShell } from "@/components/app-shell";
import { requireActiveMembershipPage } from "@/lib/page-guards";
import { WidgetStudio } from "@/app/widgets/widget-studio";

export default async function WidgetsPage() {
  await requireActiveMembershipPage();

  return (
    <AppShell activeScreen="widgets">
      <WidgetStudio />
    </AppShell>
  );
}
