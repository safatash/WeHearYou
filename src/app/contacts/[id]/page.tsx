export const dynamic = "force-dynamic";

import Link from "next/link";
import { notFound } from "next/navigation";
import { AppShell } from "@/components/app-shell";
import { Field, OutcomeCard, StatCard } from "@/components/ui";
import {
  formatContactSource,
  formatContactStatus,
  formatLastInvite,
  formatPreferredChannel,
  getContactById,
} from "@/lib/contacts";
import { getCurrentAccessibleLocationIds } from "@/lib/current-scope";

export default async function ContactDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const locationIds = await getCurrentAccessibleLocationIds();
  const contact = await getContactById(id, locationIds);

  if (!contact) {
    notFound();
  }

  const relatedCampaigns = contact.campaigns;
  const location = contact.location;

  return (
    <AppShell activeScreen="contacts">
      <div className="space-y-6">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <Link href="/contacts" className="text-sm font-semibold text-indigo-600">
              ← Back to contacts
            </Link>
            <p className="mt-4 text-sm font-semibold uppercase tracking-[0.22em] text-indigo-600">Contact Detail</p>
            <h2 className="mt-2 text-4xl font-semibold tracking-tight text-slate-950">{contact.name}</h2>
            <p className="mt-3 max-w-3xl text-slate-600">
              A fuller CRM-style contact profile, tying together source, request history, review behavior, and next-step actions.
            </p>
          </div>
          <div className="flex gap-3">
            <Link href={`/contacts/${contact.id}/edit`} className="rounded-2xl border border-slate-200 bg-white px-5 py-3 text-sm font-semibold text-slate-700 shadow-sm">
              Edit Contact
            </Link>
            <Link href="/campaigns/new" className="rounded-2xl bg-slate-950 px-5 py-3 text-sm font-semibold !text-white shadow-sm visited:!text-white hover:!text-white">
              Send Review Request
            </Link>
          </div>
        </div>

        <div className="grid gap-4 xl:grid-cols-3">
          <StatCard title="Contact Status" value={formatContactStatus(contact.status)} meta={`Preferred channel: ${formatPreferredChannel(contact.preferredChannel)}`} />
          <StatCard title="Last Invite" value={formatLastInvite(contact.lastInvitedAt)} meta={`Source: ${formatContactSource(contact.source)}`} />
          <StatCard title="Request Count" value={String(relatedCampaigns.length)} meta="All visible sends for this contact" />
        </div>

        <div className="grid gap-6 xl:grid-cols-[1.1fr_0.9fr]">
          <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
            <h3 className="text-xl font-semibold text-slate-950">Profile</h3>
            <div className="mt-6 grid gap-4 md:grid-cols-2">
              <Field label="Email" value={contact.email ?? "No email"} />
              <Field label="Phone" value={contact.phone ?? "No phone"} />
              <Field label="Source" value={formatContactSource(contact.source)} />
              <Field label="Preferred Channel" value={formatPreferredChannel(contact.preferredChannel)} />
              <Field label="Location" value={location ? location.name : "Unassigned"} />
              <Field label="Location Status" value={location ? location.status : "N/A"} />
            </div>
            <div className="mt-4">
              <Field label="Internal Notes" value={contact.notes ?? "No notes yet."} multiline />
            </div>
            <div className="mt-6 flex flex-wrap gap-2">
              {contact.tags.map(({ tag }) => (
                <span key={tag.id} className="rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold uppercase tracking-[0.18em] text-slate-600">
                  {tag.name}
                </span>
              ))}
            </div>
          </section>

          <aside className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
            <h3 className="text-xl font-semibold text-slate-950">Recent Outcomes</h3>
            <div className="mt-6 space-y-4">
              <OutcomeCard title="Requests sent" count={String(relatedCampaigns.length)} tone="neutral" />
              <OutcomeCard title="Opened or clicked" count={String(relatedCampaigns.filter((item) => item.status !== "SENT").length)} tone="positive" />
              <OutcomeCard title="Needs personal follow-up" count={contact.status === "NEEDS_FOLLOW_UP" ? "1" : "0"} tone="warning" />
            </div>
          </aside>
        </div>

        <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
          <div className="flex items-center justify-between">
            <h3 className="text-xl font-semibold text-slate-950">Request History</h3>
            <span className="text-sm text-slate-500">Clickable prototype timeline</span>
          </div>
          <div className="mt-6 overflow-x-auto">
            <table className="min-w-full text-left text-sm">
              <thead>
                <tr className="border-b border-slate-200 text-slate-500">
                  <th className="px-4 py-4 font-medium">Campaign</th>
                  <th className="px-4 py-4 font-medium">Status</th>
                  <th className="px-4 py-4 font-medium">Channel</th>
                  <th className="px-4 py-4 font-medium">Date Sent</th>
                  <th className="px-4 py-4 font-medium">Outcome</th>
                </tr>
              </thead>
              <tbody>
                {relatedCampaigns.map((recipient) => (
                  <tr key={recipient.id} className="border-b border-slate-100 text-slate-700 last:border-b-0">
                    <td className="px-4 py-4 font-medium text-slate-900">
                      <Link href={`/campaigns/${recipient.campaign.id}`} className="text-slate-900 hover:text-indigo-600">
                        #{recipient.campaign.id}
                      </Link>
                    </td>
                    <td className="px-4 py-4">{recipient.status}</td>
                    <td className="px-4 py-4">{recipient.campaign.channel}</td>
                    <td className="px-4 py-4">{formatLastInvite(recipient.sentAt)}</td>
                    <td className="px-4 py-4">{recipient.outcome ?? "Pending"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      </div>
    </AppShell>
  );
}
