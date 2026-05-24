export const dynamic = "force-dynamic";

import Link from "next/link";
import { AppShell } from "@/components/app-shell";
import { Field, OutcomeCard, StatCard } from "@/components/ui";
import { createCampaign } from "@/app/campaigns/actions";
import { getContacts } from "@/lib/contacts";
import { getCurrentAccessibleLocationIds } from "@/lib/current-scope";
import { getLocations } from "@/lib/locations";

export default async function NewCampaignPage() {
  const locationIds = await getCurrentAccessibleLocationIds();
  const [contacts, locations] = await Promise.all([
    getContacts(locationIds),
    getLocations(locationIds),
  ]);

  const selectedContacts = contacts.slice(0, 2);
  const primaryRecipient = selectedContacts[0];
  const defaultLocation = primaryRecipient?.location ?? locations[0] ?? null;
  const preselectedContactIds = new Set(selectedContacts.map((contact) => contact.id));

  return (
    <AppShell activeScreen="campaigns">
      <div className="space-y-6">
        <div className="space-y-4">
          <Link href="/campaigns" className="text-sm font-semibold text-indigo-600">
            ← Back to requests
          </Link>
          <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
            <div>
              <p className="text-sm font-semibold uppercase tracking-[0.22em] text-indigo-600">Request Composer</p>
              <h2 className="mt-2 text-4xl font-semibold tracking-tight text-slate-950">Create a new review request send</h2>
              <p className="mt-3 max-w-3xl text-slate-600">
                This is the manual send flow, choosing location, recipients, channels, timing, template, and destination behavior before the tokenized invites are created.
              </p>
            </div>
            <div className="rounded-2xl border border-indigo-100 bg-indigo-50 px-4 py-3 text-sm font-medium text-indigo-700">
              Real Prisma-backed send flow
            </div>
          </div>
        </div>

        <form action={createCampaign} className="space-y-6">
          <div className="grid gap-4 xl:grid-cols-3">
            <StatCard title="Selected Contacts" value={String(selectedContacts.length)} meta="Contacts preselected for this send" />
            <StatCard title="Channels" value="SMS + Email" meta="Select one or both delivery paths" />
            <StatCard title="Send Window" value="Now" meta="Creates campaign and recipients immediately" />
          </div>

          <div className="grid gap-6 xl:grid-cols-[1.05fr_0.95fr]">
            <section className="rounded-[28px] border border-slate-200/80 bg-white p-6 shadow-[0_12px_32px_rgba(15,23,42,0.05)]">
              <h3 className="text-xl font-semibold text-slate-950">Composer Setup</h3>
              <div className="mt-6 space-y-4">
                <label className="grid gap-2 text-sm font-semibold text-slate-700">
                  Campaign Name
                  <input name="name" defaultValue="Post-appointment SMS push" className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm font-normal text-slate-700" />
                </label>
                <label className="grid gap-2 text-sm font-semibold text-slate-700">
                  Sending Location
                  <select name="locationId" defaultValue={defaultLocation?.id ?? locations[0]?.id} className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm font-normal text-slate-700">
                    {locations.map((location) => (
                      <option key={location.id} value={location.id}>
                        {location.name}
                      </option>
                    ))}
                  </select>
                </label>
                <fieldset className="grid gap-3 text-sm font-semibold text-slate-700">
                  <legend>Request Channels</legend>
                  <div className="grid gap-3 md:grid-cols-3">
                    <label className="flex items-center gap-3 rounded-2xl border border-slate-200 bg-slate-50 px-4 py-4 text-sm font-semibold text-slate-700">
                      <input type="checkbox" name="channels" value="SMS" defaultChecked className="h-4 w-4" />
                      Send SMS requests
                    </label>
                    <label className="flex items-center gap-3 rounded-2xl border border-slate-200 bg-slate-50 px-4 py-4 text-sm font-semibold text-slate-700">
                      <input type="checkbox" name="channels" value="EMAIL" className="h-4 w-4" />
                      Send email requests
                    </label>
                    <label className="flex items-center gap-3 rounded-2xl border border-slate-200 bg-slate-50 px-4 py-4 text-sm font-semibold text-slate-700">
                      <input type="checkbox" name="channels" value="VIDEO_TESTIMONIAL" className="h-4 w-4" />
                      Video testimonial link
                    </label>
                  </div>
                </fieldset>
                <label className="grid gap-2 text-sm font-semibold text-slate-700">
                  Workflow Name
                  <input name="workflowName" defaultValue="Manual send" className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm font-normal text-slate-700" />
                </label>
                <label className="grid gap-2 text-sm font-semibold text-slate-700">
                  Destination
                  <textarea name="destination" defaultValue="4-5 stars redirect to Google, 1-3 stars collect private feedback" className="min-h-24 rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm font-normal leading-7 text-slate-700" />
                </label>
              </div>
            </section>

            <aside className="rounded-[28px] border border-slate-200/80 bg-white p-6 shadow-[0_12px_32px_rgba(15,23,42,0.05)]">
              <h3 className="text-xl font-semibold text-slate-950">Send Health</h3>
              <div className="mt-6 space-y-4">
                <OutcomeCard title="Location selected" count={defaultLocation ? "Yes" : "No"} tone="positive" />
                <OutcomeCard title="Recipients added" count={String(selectedContacts.length)} tone="positive" />
                <OutcomeCard title="Template personalized" count="Ready" tone="neutral" />
              </div>
            </aside>
          </div>

          <div className="grid gap-6 xl:grid-cols-[1fr_1fr]">
            <section className="rounded-[28px] border border-slate-200/80 bg-white p-6 shadow-[0_12px_32px_rgba(15,23,42,0.05)]">
              <div className="flex items-center justify-between">
                <h3 className="text-xl font-semibold text-slate-950">Recipients</h3>
                <span className="text-sm text-slate-500">Choose who gets this request</span>
              </div>
              <div className="mt-6 space-y-3">
                {contacts.map((contact) => {
                  const selected = preselectedContactIds.has(contact.id);
                  return (
                    <label
                      key={contact.id}
                      className={`block rounded-2xl border p-4 ${selected ? "border-indigo-200 bg-indigo-50" : "border-slate-200 bg-white"}`}
                    >
                      <div className="flex items-start gap-4">
                        <input type="checkbox" name="contactIds" value={contact.id} defaultChecked={selected} className="mt-1 h-4 w-4" />
                        <div className="flex-1">
                          <div className="flex items-center justify-between gap-4">
                            <div>
                              <p className="font-semibold text-slate-900">{contact.name}</p>
                              <p className="mt-1 text-sm text-slate-600">{contact.email ?? "No email"} · {contact.phone ?? "No phone"}</p>
                            </div>
                            {selected ? (
                              <span className="rounded-full bg-indigo-100 px-3 py-1 text-xs font-semibold uppercase tracking-[0.18em] text-indigo-700">
                                Selected
                              </span>
                            ) : null}
                          </div>
                        </div>
                      </div>
                    </label>
                  );
                })}
              </div>
            </section>

            <section className="rounded-[28px] border border-slate-200/80 bg-white p-6 shadow-[0_12px_32px_rgba(15,23,42,0.05)]">
              <div className="flex items-center justify-between">
                <h3 className="text-xl font-semibold text-slate-950">Message Preview</h3>
                <span className="text-sm text-slate-500">Stored on the campaign record</span>
              </div>
              <div className="mt-6 space-y-4">
                <label className="grid gap-2 text-sm font-semibold text-slate-700">
                  SMS Template
                  <textarea
                    name="messageBody"
                    defaultValue={`Hi ${primaryRecipient?.name ?? "there"}, thanks for visiting Nova Dental. We'd really appreciate your feedback: wehearyou.com/r/rr_tok_demo`}
                    className="min-h-28 rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm font-normal leading-7 text-slate-700"
                  />
                </label>
                <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-600">
                  <p className="font-semibold text-slate-900">Primary selected recipient</p>
                  <p className="mt-1">{primaryRecipient?.name ?? "No recipient selected"}</p>
                  <p className="mt-1">{primaryRecipient?.email ?? "No email on file"}</p>
                </div>
                <label className="grid gap-2 text-sm font-semibold text-slate-700">
                  Email Subject
                  <input name="emailSubject" defaultValue="How was your visit? We'd love your feedback" className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm font-normal text-slate-700" />
                </label>
                <Field
                  label="Email Body"
                  value="Thanks for choosing us. Please tap the secure review link below to rate your experience and share feedback with our team."
                  multiline
                />
              </div>
            </section>
          </div>

          <div className="flex justify-end gap-3">
            <Link href="/campaigns" className="rounded-2xl border border-slate-200 bg-white px-5 py-3 text-sm font-semibold text-slate-700 shadow-sm">
              Cancel
            </Link>
            <button
              type="submit"
              onClick={(e) => {
                const form = (e.target as HTMLButtonElement).closest('form') as HTMLFormElement;
                const contactCheckboxes = Array.from(form?.querySelectorAll('input[name="contactIds"]') || []) as HTMLInputElement[];
                const channelCheckboxes = Array.from(form?.querySelectorAll('input[name="channels"]') || []) as HTMLInputElement[];

                const anyContactChecked = contactCheckboxes.some((cb) => cb.checked);
                const anyChannelChecked = channelCheckboxes.some((cb) => cb.checked);

                if (!anyContactChecked) {
                  e.preventDefault();
                  alert("Please select at least one contact");
                  return;
                }

                if (!anyChannelChecked) {
                  e.preventDefault();
                  alert("Please select at least one request channel");
                  return;
                }
              }}
              className="rounded-2xl bg-slate-950 px-5 py-3 text-sm font-semibold !text-white shadow-sm visited:!text-white hover:!text-white"
            >
              Send Review Request
            </button>
          </div>
        </form>
      </div>
    </AppShell>
  );
}
