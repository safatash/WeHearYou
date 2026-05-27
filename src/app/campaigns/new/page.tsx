export const dynamic = "force-dynamic";

import Link from "next/link";
import { AppShell } from "@/components/app-shell";
import { createCampaign } from "@/app/campaigns/actions";
import { getContacts } from "@/lib/contacts";
import { getCurrentAccessibleLocationIds } from "@/lib/current-scope";
import { getLocations } from "@/lib/locations";
import { CampaignSubmitButton } from "./submit-button";

export default async function NewCampaignPage() {
  const locationIds = await getCurrentAccessibleLocationIds();
  const [contacts, locations] = await Promise.all([
    getContacts(locationIds),
    getLocations(locationIds),
  ]);

  const defaultLocation = locations[0] ?? null;
  const preselectedContactIds = new Set<string>();

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
            <p className="mt-2 text-slate-500 text-sm">
              Choose your recipients, channels, and message — we'll send each contact a personalized link.
            </p>
          </div>
        </div>

        <form action={createCampaign} className="space-y-6">
          <div className="grid gap-6 xl:grid-cols-[1.1fr_0.9fr]">
            {/* Setup */}
            <section className="rounded-[28px] border border-slate-200/80 bg-white p-6 shadow-[0_12px_32px_rgba(15,23,42,0.05)]">
              <h3 className="text-lg font-semibold text-slate-950">Campaign setup</h3>
              <div className="mt-5 space-y-4">
                <label className="grid gap-1.5 text-sm font-semibold text-slate-700">
                  Campaign name
                  <input
                    name="name"
                    placeholder="e.g. Post-appointment follow-up"
                    className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm font-normal text-slate-700 placeholder:text-slate-400 focus:border-indigo-300 focus:outline-none"
                  />
                </label>

                <label className="grid gap-1.5 text-sm font-semibold text-slate-700">
                  Sending location
                  <select
                    name="locationId"
                    defaultValue={defaultLocation?.id}
                    className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm font-normal text-slate-700 focus:border-indigo-300 focus:outline-none"
                  >
                    {locations.map((location) => (
                      <option key={location.id} value={location.id}>
                        {location.name}
                      </option>
                    ))}
                  </select>
                </label>

                <fieldset>
                  <legend className="text-sm font-semibold text-slate-700">Delivery channels</legend>
                  <div className="mt-2 grid gap-3 sm:grid-cols-2">
                    {[
                      { value: "SMS", label: "SMS" },
                      { value: "EMAIL", label: "Email" },
                    ].map(({ value, label }) => (
                      <label
                        key={value}
                        className="flex cursor-pointer items-center gap-3 rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3.5 text-sm font-medium text-slate-700 hover:border-indigo-200 hover:bg-indigo-50 has-[:checked]:border-indigo-300 has-[:checked]:bg-indigo-50 has-[:checked]:text-indigo-800"
                      >
                        <input type="checkbox" name="channels" value={value} className="h-4 w-4 accent-indigo-600" />
                        {label}
                      </label>
                    ))}
                  </div>
                </fieldset>
              </div>
            </section>

            {/* Summary sidebar */}
            <aside className="rounded-[28px] border border-slate-200/80 bg-white p-6 shadow-[0_12px_32px_rgba(15,23,42,0.05)]">
              <h3 className="text-lg font-semibold text-slate-950">What happens next</h3>
              <div className="mt-5 space-y-4 text-sm text-slate-600">
                <div className="flex gap-3">
                  <span className="mt-0.5 flex h-5 w-5 flex-shrink-0 items-center justify-center rounded-full bg-indigo-100 text-xs font-bold text-indigo-700">1</span>
                  <p>Each selected contact gets a unique, tokenized review link via your chosen channel.</p>
                </div>
                <div className="flex gap-3">
                  <span className="mt-0.5 flex h-5 w-5 flex-shrink-0 items-center justify-center rounded-full bg-indigo-100 text-xs font-bold text-indigo-700">2</span>
                  <p>Contacts with a 4–5 star rating are guided to leave a Google review. Lower ratings are routed to private feedback.</p>
                </div>
                <div className="flex gap-3">
                  <span className="mt-0.5 flex h-5 w-5 flex-shrink-0 items-center justify-center rounded-full bg-indigo-100 text-xs font-bold text-indigo-700">3</span>
                  <p>Responses appear in your Reviews inbox and are tracked against this campaign.</p>
                </div>
              </div>
              <div className="mt-6 rounded-2xl border border-slate-100 bg-slate-50 p-4">
                <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">Available contacts</p>
                <p className="mt-1 text-2xl font-semibold text-slate-900">{contacts.length}</p>
                <p className="mt-0.5 text-xs text-slate-500">across {locations.length} location{locations.length !== 1 ? "s" : ""}</p>
              </div>
            </aside>
          </div>

          {/* Recipients + Message */}
          <div className="grid gap-6 xl:grid-cols-2">
            <section className="rounded-[28px] border border-slate-200/80 bg-white p-6 shadow-[0_12px_32px_rgba(15,23,42,0.05)]">
              <h3 className="text-lg font-semibold text-slate-950">Recipients</h3>
              <p className="mt-1 text-sm text-slate-500">Select the contacts to include in this send.</p>
              {contacts.length === 0 ? (
                <div className="mt-6 rounded-2xl border border-dashed border-slate-200 bg-slate-50 px-4 py-8 text-center text-sm text-slate-500">
                  No contacts yet.{" "}
                  <Link href="/contacts" className="font-semibold text-indigo-600 hover:text-indigo-700">
                    Add contacts →
                  </Link>
                </div>
              ) : (
                <div className="mt-4 max-h-96 overflow-y-auto space-y-2 pr-1">
                  {contacts.map((contact) => {
                    const selected = preselectedContactIds.has(contact.id);
                    return (
                      <label
                        key={contact.id}
                        className="flex cursor-pointer items-start gap-3 rounded-2xl border border-slate-200 p-4 hover:border-indigo-200 hover:bg-indigo-50 has-[:checked]:border-indigo-300 has-[:checked]:bg-indigo-50"
                      >
                        <input
                          type="checkbox"
                          name="contactIds"
                          value={contact.id}
                          defaultChecked={selected}
                          className="mt-0.5 h-4 w-4 accent-indigo-600"
                        />
                        <div className="min-w-0 flex-1">
                          <p className="font-semibold text-slate-900">{contact.name}</p>
                          <p className="mt-0.5 truncate text-xs text-slate-500">
                            {[contact.email, contact.phone].filter(Boolean).join(" · ") || "No contact info"}
                          </p>
                        </div>
                      </label>
                    );
                  })}
                </div>
              )}
            </section>

            <section className="rounded-[28px] border border-slate-200/80 bg-white p-6 shadow-[0_12px_32px_rgba(15,23,42,0.05)]">
              <h3 className="text-lg font-semibold text-slate-950">Message</h3>
              <p className="mt-1 text-sm text-slate-500">Customize the message your contacts receive.</p>
              <div className="mt-4 space-y-4">
                <label className="grid gap-1.5 text-sm font-semibold text-slate-700">
                  SMS message
                  <textarea
                    name="messageBody"
                    defaultValue={`Hi there, thanks for visiting ${defaultLocation?.name ?? "us"}. We'd really appreciate your feedback — it only takes a minute:`}
                    rows={4}
                    className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm font-normal leading-6 text-slate-700 placeholder:text-slate-400 focus:border-indigo-300 focus:outline-none"
                  />
                  <span className="text-xs font-normal text-slate-400">The review link is appended automatically.</span>
                </label>
                <label className="grid gap-1.5 text-sm font-semibold text-slate-700">
                  Email subject
                  <input
                    name="emailSubject"
                    defaultValue="How was your visit? We'd love your feedback"
                    className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm font-normal text-slate-700 placeholder:text-slate-400 focus:border-indigo-300 focus:outline-none"
                  />
                </label>
                <label className="grid gap-1.5 text-sm font-semibold text-slate-700">
                  Email body
                  <textarea
                    name="emailBody"
                    defaultValue={`Thanks for choosing ${defaultLocation?.name ?? "us"}. Please tap the secure link below to share your feedback — it helps us improve and helps others find us.`}
                    rows={4}
                    className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm font-normal leading-6 text-slate-700 placeholder:text-slate-400 focus:border-indigo-300 focus:outline-none"
                  />
                </label>
              </div>
            </section>
          </div>

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
