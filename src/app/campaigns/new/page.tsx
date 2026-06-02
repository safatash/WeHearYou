export const dynamic = "force-dynamic";

import Link from "next/link";
import { AppShell } from "@/components/app-shell";
import { createCampaign } from "@/app/campaigns/actions";
import { getContacts } from "@/lib/contacts";
import { getCurrentAccessibleLocationIds } from "@/lib/current-scope";
import { getLocations } from "@/lib/locations";
import { CampaignSubmitButton } from "./submit-button";
import { RecipientPicker } from "./recipient-picker";

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
              Choose your recipients and channel — we&apos;ll send each contact a personalized link.
            </p>
          </div>
        </div>

        <form action={createCampaign} className="space-y-6">
          <RecipientPicker
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

          <div className="flex justify-end gap-3">
            <Link
              href="/campaigns"
              className="rounded-2xl border border-slate-200 bg-white px-5 py-3 text-sm font-semibold text-slate-700 shadow-sm hover:border-slate-300"
            >
              Cancel
            </Link>
            <CampaignSubmitButton />
          </div>
        </form>
      </div>
    </AppShell>
  );
}
