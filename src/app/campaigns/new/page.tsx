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
              Create a campaign to request reviews or video testimonials from your customers.
            </p>
          </div>
        </div>

        <form action={createCampaign} className="space-y-6">
          {/* Campaign Setup */}
          <section className="rounded-[28px] border border-slate-200/80 bg-white p-6 shadow-[0_12px_32px_rgba(15,23,42,0.05)]">
            <h3 className="text-lg font-semibold text-slate-950">Campaign Setup</h3>
            <div className="mt-5 space-y-4">
              <label className="grid gap-2 text-sm font-semibold text-slate-700">
                Campaign Name
                <input
                  type="text"
                  name="name"
                  placeholder="e.g. June Follow-up"
                  defaultValue="Manual review request"
                  className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm font-normal text-slate-700 focus:border-indigo-300 focus:outline-none"
                />
              </label>

              <fieldset>
                <legend className="text-sm font-semibold text-slate-700">Campaign Type</legend>
                <div className="mt-2 grid gap-3 sm:grid-cols-2">
                  <label className="flex cursor-pointer items-center gap-3 rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3.5 text-sm font-medium text-slate-700 hover:border-indigo-200 hover:bg-indigo-50 has-[:checked]:border-indigo-300 has-[:checked]:bg-indigo-50 has-[:checked]:text-indigo-800">
                    <input type="radio" name="destination" value="REVIEW" defaultChecked className="h-4 w-4 accent-indigo-600" />
                    Review Request
                  </label>
                  <label className="flex cursor-pointer items-center gap-3 rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3.5 text-sm font-medium text-slate-700 hover:border-indigo-200 hover:bg-indigo-50 has-[:checked]:border-indigo-300 has-[:checked]:bg-indigo-50 has-[:checked]:text-indigo-800">
                    <input type="radio" name="destination" value="VIDEO_TESTIMONIAL" className="h-4 w-4 accent-indigo-600" />
                    Video Testimonial
                  </label>
                </div>
              </fieldset>
            </div>
          </section>

          {/* Email Settings */}
          <section className="rounded-[28px] border border-slate-200/80 bg-white p-6 shadow-[0_12px_32px_rgba(15,23,42,0.05)]">
            <h3 className="text-lg font-semibold text-slate-950">Message</h3>
            <div className="mt-5 space-y-4">
              <label className="grid gap-2 text-sm font-semibold text-slate-700">
                Email Subject
                <input
                  type="text"
                  name="emailSubject"
                  placeholder="Leave blank for default subject"
                  className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm font-normal text-slate-700 focus:border-indigo-300 focus:outline-none"
                />
                <span className="text-xs font-normal text-slate-500">Default: &quot;How was your experience with [Location]?&quot;</span>
              </label>

              <label className="grid gap-2 text-sm font-semibold text-slate-700">
                Message Body (SMS)
                <textarea
                  name="messageBody"
                  placeholder="Optional SMS message. Leave blank for default."
                  rows={3}
                  className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm font-normal text-slate-700 focus:border-indigo-300 focus:outline-none"
                />
                <span className="text-xs font-normal text-slate-500">Used for SMS campaigns. Include {'{link}'} as placeholder for review link.</span>
              </label>
            </div>
          </section>

          {/* Recipients */}
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
