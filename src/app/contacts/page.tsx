import Link from "next/link";
import { AppShell } from "@/components/app-shell";
import { formatContactSource, formatContactStatus, formatLastInvite, getContacts } from "@/lib/contacts";
import { getCurrentAccessibleLocationIds } from "@/lib/current-scope";

export default async function ContactsPage() {
  const locationIds = await getCurrentAccessibleLocationIds();
  const contacts = await getContacts(locationIds);

  return (
    <AppShell activeScreen="contacts">
      <div className="space-y-6">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p className="text-sm font-semibold uppercase tracking-[0.22em] text-indigo-600">Contacts</p>
            <h2 className="mt-2 text-3xl font-semibold tracking-tight text-slate-950">Contact list from manual, CSV, and webhook sources</h2>
            <p className="mt-3 max-w-3xl text-slate-600">
              This maps directly to the plugin&apos;s contact management layer, including manual add, CSV import, duplicate-safe records, and last invite tracking.
            </p>
          </div>
          <div className="flex gap-3">
            <Link href="/contacts/import" className="rounded-2xl border border-slate-200 bg-white px-5 py-3 text-sm font-semibold text-slate-700 shadow-sm">
              Import CSV
            </Link>
            <Link href="/contacts/new" className="rounded-2xl bg-slate-950 px-5 py-3 text-sm font-semibold !text-white shadow-sm visited:!text-white hover:!text-white">
              Add Contact
            </Link>
          </div>
        </div>

        <div className="rounded-3xl border border-slate-200 bg-white p-4 shadow-sm">
          <div className="overflow-x-auto">
            <table className="min-w-full text-left text-sm">
              <thead>
                <tr className="border-b border-slate-200 text-slate-500">
                  <th className="px-4 py-4 font-medium">Name</th>
                  <th className="px-4 py-4 font-medium">Email</th>
                  <th className="px-4 py-4 font-medium">Phone</th>
                  <th className="px-4 py-4 font-medium">Source</th>
                  <th className="px-4 py-4 font-medium">Status</th>
                  <th className="px-4 py-4 font-medium">Last Invite</th>
                </tr>
              </thead>
              <tbody>
                {contacts.map((contact) => (
                  <tr key={contact.id} className="border-b border-slate-100 text-slate-700 last:border-b-0">
                    <td className="px-4 py-4 font-medium text-slate-900">
                      <Link href={`/contacts/${contact.id}`} className="text-slate-900 hover:text-indigo-600">
                        {contact.name}
                      </Link>
                    </td>
                    <td className="px-4 py-4">{contact.email}</td>
                    <td className="px-4 py-4">{contact.phone}</td>
                    <td className="px-4 py-4">{formatContactSource(contact.source)}</td>
                    <td className="px-4 py-4">
                      <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold uppercase tracking-[0.18em] text-slate-600">
                        {formatContactStatus(contact.status)}
                      </span>
                    </td>
                    <td className="px-4 py-4">{formatLastInvite(contact.lastInvitedAt)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </AppShell>
  );
}
