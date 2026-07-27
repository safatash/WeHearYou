export const dynamic = "force-dynamic";

import { AppShell } from "@/components/app-shell";
import { getContacts } from "@/lib/contacts";
import { getCurrentAccessibleLocationIds } from "@/lib/current-scope";
import { getLocations } from "@/lib/locations";
import { CampaignFormClient } from "./campaign-form-client";

export default async function NewCampaignPage() {
  const locationIds = await getCurrentAccessibleLocationIds();
  const [contacts, locations] = await Promise.all([
    getContacts(locationIds),
    getLocations(locationIds),
  ]);

  return (
    <AppShell activeScreen="campaigns">
      <CampaignFormClient
        initialContacts={contacts.map((c) => ({
          id: c.id,
          name: c.name,
          email: c.email,
          phone: c.phone,
          locationId: c.locationId,
        }))}
        locations={locations.map((l) => ({ id: l.id, name: l.name }))}
        defaultLocationId={locations[0]?.id ?? null}
      />
    </AppShell>
  );
}
