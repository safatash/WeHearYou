export const dynamic = "force-dynamic";

import { AppShell } from "@/components/app-shell";
import { NewContactForm } from "@/app/contacts/new/new-contact-form";
import { getCurrentAccessibleLocationIds } from "@/lib/current-scope";
import { getLocations } from "@/lib/locations";
import { requireContactManagementPage } from "@/lib/page-guards";

export default async function NewContactPage() {
  const locationIds = await getCurrentAccessibleLocationIds();
  const locations = (await getLocations(locationIds)).map((location) => ({
    id: location.id,
    name: location.name,
    city: location.city,
    state: location.state,
  }));

  if (locations[0]) {
    await requireContactManagementPage(locations[0].id);
  }

  return (
    <AppShell activeScreen="contacts">
      <NewContactForm locations={locations} />
    </AppShell>
  );
}
