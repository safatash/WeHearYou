import Link from "next/link";
import { notFound } from "next/navigation";
import { AppShell } from "@/components/app-shell";
import { updateContact } from "@/app/contacts/actions";
import {
  formatContactSource,
  formatContactStatus,
  formatLastInvite,
  formatPreferredChannel,
  getContactById,
} from "@/lib/contacts";
import { prisma } from "@/lib/prisma";

export default async function EditContactPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const [contact, locations] = await Promise.all([
    getContactById(id),
    prisma.location.findMany({
      orderBy: [{ createdAt: "asc" }],
      select: {
        id: true,
        name: true,
        city: true,
        state: true,
        status: true,
      },
    }),
  ]);

  if (!contact) {
    notFound();
  }

  return (
    <AppShell activeScreen="contacts">
      <div className="space-y-6">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <Link href={`/contacts/${contact.id}`} className="text-sm font-semibold text-indigo-600">
              ← Back to contact
            </Link>
            <p className="mt-4 text-sm font-semibold uppercase tracking-[0.22em] text-indigo-600">Edit Contact</p>
            <h2 className="mt-2 text-3xl font-semibold tracking-tight text-slate-950">{contact.name}</h2>
            <p className="mt-3 max-w-3xl text-slate-600">
              Update contact profile data, preferred channel, notes, and tags without leaving the review request workflow.
            </p>
          </div>
          <div className="flex gap-3">
            <Link href={`/contacts/${contact.id}`} className="rounded-2xl border border-slate-200 bg-white px-5 py-3 text-sm font-semibold text-slate-700 shadow-sm">
              Cancel
            </Link>
          </div>
        </div>

        <form action={updateContact} className="grid gap-6 xl:grid-cols-[1.1fr_0.9fr]">
          <input type="hidden" name="contactId" value={contact.id} />

          <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
            <div className="grid gap-4 md:grid-cols-2">
              <label className="grid gap-2 text-sm font-semibold text-slate-700">
                First name
                <input name="firstName" defaultValue={contact.firstName ?? ""} className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm font-normal text-slate-700" />
              </label>
              <label className="grid gap-2 text-sm font-semibold text-slate-700">
                Last name
                <input name="lastName" defaultValue={contact.lastName ?? ""} className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm font-normal text-slate-700" />
              </label>
              <label className="grid gap-2 text-sm font-semibold text-slate-700">
                Email
                <input name="email" type="email" defaultValue={contact.email ?? ""} className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm font-normal text-slate-700" />
              </label>
              <label className="grid gap-2 text-sm font-semibold text-slate-700">
                Phone
                <input name="phone" defaultValue={contact.phone ?? ""} className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm font-normal text-slate-700" />
              </label>
              <div className="grid gap-2 text-sm font-semibold text-slate-700">
                <span>Preferred channel</span>
                <div className="grid gap-3 sm:grid-cols-2">
                  <label className="flex items-start gap-3 rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm font-normal text-slate-700">
                    <input type="checkbox" name="preferredChannel" value="SMS" defaultChecked={contact.preferredChannel === "SMS"} className="mt-1 h-4 w-4" />
                    <div>
                      <p className="font-semibold text-slate-900">SMS</p>
                      <p className="mt-1 text-xs leading-5 text-slate-500">Use text messages for review requests.</p>
                    </div>
                  </label>
                  <label className="flex items-start gap-3 rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm font-normal text-slate-700">
                    <input type="checkbox" name="preferredChannel" value="EMAIL" defaultChecked={contact.preferredChannel === "EMAIL"} className="mt-1 h-4 w-4" />
                    <div>
                      <p className="font-semibold text-slate-900">Email</p>
                      <p className="mt-1 text-xs leading-5 text-slate-500">Use email when that is the better follow-up path.</p>
                    </div>
                  </label>
                </div>
              </div>
              <label className="grid gap-2 text-sm font-semibold text-slate-700">
                Location
                <select name="locationId" defaultValue={contact.locationId} className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm font-normal text-slate-700">
                  {locations.map((location) => (
                    <option key={location.id} value={location.id}>
                      {location.name}
                    </option>
                  ))}
                </select>
              </label>
            </div>

            <div className="mt-5 grid gap-4 md:grid-cols-2">
              <div className="grid gap-2 text-sm font-semibold text-slate-700">
                <span>Source</span>
                <input value={formatContactSource(contact.source)} disabled className="rounded-2xl border border-slate-200 bg-slate-100 px-4 py-3 text-sm font-normal text-slate-500" />
              </div>
              <div className="grid gap-2 text-sm font-semibold text-slate-700">
                <span>Status</span>
                <input value={formatContactStatus(contact.status)} disabled className="rounded-2xl border border-slate-200 bg-slate-100 px-4 py-3 text-sm font-normal text-slate-500" />
              </div>
              <label className="grid gap-2 text-sm font-semibold text-slate-700 md:col-span-2">
                Tags
                <input name="tags" defaultValue={contact.tags.map(({ tag }) => tag.name).join(", ")} className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm font-normal text-slate-700" />
              </label>
            </div>

            <div className="mt-5">
              <label className="grid gap-2 text-sm font-semibold text-slate-700">
                Notes
                <textarea
                  name="notes"
                  defaultValue={contact.notes ?? ""}
                  className="min-h-32 rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm font-normal leading-7 text-slate-700"
                />
              </label>
            </div>
          </section>

          <div className="space-y-6">
            <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
              <h3 className="text-xl font-semibold text-slate-950">Current record</h3>
              <div className="mt-5 space-y-3 text-sm text-slate-600">
                <div className="rounded-2xl bg-slate-50 p-4">Preferred channel: {formatPreferredChannel(contact.preferredChannel)}</div>
                <div className="rounded-2xl bg-slate-50 p-4">Last invite: {formatLastInvite(contact.lastInvitedAt)}</div>
                <div className="rounded-2xl bg-slate-50 p-4">Location: {contact.location.name}</div>
              </div>
            </section>

            <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
              <h3 className="text-xl font-semibold text-slate-950">Change summary</h3>
              <div className="mt-5 space-y-3 text-sm text-slate-600">
                <div className="rounded-2xl bg-slate-50 p-4">Preferred channel can be set with SMS and Email checkboxes. If both are checked, email is saved as the preferred channel for now.</div>
                <div className="rounded-2xl bg-slate-50 p-4">Tags help segment campaigns and surface higher-priority follow-ups.</div>
                <div className="rounded-2xl bg-slate-50 p-4">Location updates change which review link and automation defaults apply to the contact.</div>
              </div>
            </section>

            <div className="flex justify-end">
              <button type="submit" className="rounded-2xl bg-slate-950 px-5 py-3 text-sm font-semibold !text-white shadow-sm visited:!text-white hover:!text-white">
                Save Changes
              </button>
            </div>
          </div>
        </form>
      </div>
    </AppShell>
  );
}
