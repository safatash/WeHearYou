export const dynamic = "force-dynamic";

import Link from "next/link";
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
      <div className="space-y-6">
        <div className="space-y-4">
          <Link href="/campaigns" className="text-sm font-semibold text-indigo-600">
            ← Back to campaigns
          </Link>
          <div>
            <p className="text-sm font-semibold uppercase tracking-[0.22em] text-indigo-600">Campaigns</p>
            <h2 className="mt-2 text-3xl font-semibold tracking-tight text-slate-950">Send review requests</h2>
            <p className="mt-2 text-sm text-slate-500">
              Create a campaign to request reviews or video testimonials from your customers.
            </p>
          </div>
        </div>

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
      </div>
    </AppShell>
  );
}
