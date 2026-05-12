import Link from "next/link";
import { AppShell } from "@/components/app-shell";
import { createContact } from "@/app/contacts/actions";
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
    status: location.status,
  }));

  if (locations[0]) {
    await requireContactManagementPage(locations[0].id);
  }

  const defaultLocation = locations[0];

  return (
    <AppShell activeScreen="contacts">
      <div className="space-y-6">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p className="text-sm font-semibold uppercase tracking-[0.22em] text-indigo-600">Add Contact</p>
            <h2 className="mt-2 text-3xl font-semibold tracking-tight text-slate-950">Create a new contact record</h2>
            <p className="mt-3 max-w-3xl text-slate-600">
              Add a contact manually, assign them to a location, set a preferred channel, and prepare them for future review request campaigns.
            </p>
          </div>
          <div className="flex gap-3">
            <Link href="/contacts" className="rounded-2xl border border-slate-200 bg-white px-5 py-3 text-sm font-semibold text-slate-700 shadow-sm">
              Cancel
            </Link>
          </div>
        </div>

        <form action={createContact} className="grid gap-6 xl:grid-cols-[1.2fr_0.8fr]">
          <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
            <div className="grid gap-5 md:grid-cols-2">
              <label className="grid gap-2 text-sm font-semibold text-slate-700">
                First name
                <input name="firstName" className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm font-normal text-slate-700" />
              </label>
              <label className="grid gap-2 text-sm font-semibold text-slate-700">
                Last name
                <input name="lastName" className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm font-normal text-slate-700" />
              </label>
              <label className="grid gap-2 text-sm font-semibold text-slate-700">
                Email
                <input name="email" type="email" className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm font-normal text-slate-700" />
              </label>
              <label className="grid gap-2 text-sm font-semibold text-slate-700">
                Phone
                <input name="phone" className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm font-normal text-slate-700" />
              </label>
              <div className="grid gap-2 text-sm font-semibold text-slate-700">
                <span>Preferred channel</span>
                <div className="grid gap-3 sm:grid-cols-2">
                  <label className="flex items-start gap-3 rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm font-normal text-slate-700">
                    <input type="checkbox" name="preferredChannel" value="SMS" defaultChecked className="mt-1 h-4 w-4" />
                    <div>
                      <p className="font-semibold text-slate-900">SMS</p>
                      <p className="mt-1 text-xs leading-5 text-slate-500">Use text messages for review requests.</p>
                    </div>
                  </label>
                  <label className="flex items-start gap-3 rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm font-normal text-slate-700">
                    <input type="checkbox" name="preferredChannel" value="EMAIL" className="mt-1 h-4 w-4" />
                    <div>
                      <p className="font-semibold text-slate-900">Email</p>
                      <p className="mt-1 text-xs leading-5 text-slate-500">Use email when that is the better follow-up path.</p>
                    </div>
                  </label>
                </div>
              </div>
              <label className="grid gap-2 text-sm font-semibold text-slate-700">
                Location
                <select name="locationId" defaultValue={defaultLocation?.id} className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm font-normal text-slate-700">
                  {locations.map((location) => (
                    <option key={location.id} value={location.id}>
                      {location.name}
                    </option>
                  ))}
                </select>
              </label>
            </div>

            <div className="mt-5 grid gap-5 md:grid-cols-2">
              <label className="grid gap-2 text-sm font-semibold text-slate-700">
                Tags
                <input name="tags" className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm font-normal text-slate-700" />
              </label>
              <label className="grid gap-2 text-sm font-semibold text-slate-700">
                Source
                <input value="Manual add" disabled className="rounded-2xl border border-slate-200 bg-slate-100 px-4 py-3 text-sm font-normal text-slate-500" />
              </label>
            </div>

            <div className="mt-5">
              <label className="grid gap-2 text-sm font-semibold text-slate-700">
                Notes
                <textarea
                  name="notes"
                  className="min-h-32 rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm font-normal leading-7 text-slate-700"
                />
              </label>
            </div>
          </section>

          <div className="space-y-6">
            <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
              <h3 className="text-lg font-semibold text-slate-950">Routing preview</h3>
              <p className="mt-2 text-sm text-slate-500">This contact will be available to request campaigns and automations immediately after save.</p>
              <div className="mt-5 space-y-3">
                <div className="rounded-2xl bg-slate-50 p-4">
                  <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">Assigned location</p>
                  <p className="mt-2 font-medium text-slate-900">{defaultLocation?.name ?? "No locations found"}</p>
                </div>
                <div className="rounded-2xl bg-slate-50 p-4">
                  <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">Default funnel channel</p>
                  <p className="mt-2 font-medium text-slate-900">SMS review request</p>
                </div>
                <div className="rounded-2xl bg-slate-50 p-4">
                  <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">Duplicate protection</p>
                  <p className="mt-2 font-medium text-slate-900">Checked on save against existing email and phone</p>
                </div>
              </div>
            </section>

            <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
              <h3 className="text-lg font-semibold text-slate-950">Available locations</h3>
              <div className="mt-5 space-y-3">
                {locations.map((location) => (
                  <div key={location.id} className="rounded-2xl border border-slate-200 px-4 py-3">
                    <div className="flex items-center justify-between gap-3">
                      <div>
                        <p className="font-medium text-slate-900">{location.name}</p>
                        <p className="mt-1 text-sm text-slate-500">{location.city}, {location.state}</p>
                      </div>
                      <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold uppercase tracking-[0.18em] text-slate-600">
                        {location.status}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </section>

            <div className="flex justify-end">
              <button type="submit" className="rounded-2xl bg-slate-950 px-5 py-3 text-sm font-semibold !text-white shadow-sm visited:!text-white hover:!text-white">
                Save Contact
              </button>
            </div>
          </div>
        </form>
      </div>
    </AppShell>
  );
}
