export const dynamic = "force-dynamic";

import Link from "next/link";
import { notFound } from "next/navigation";
import { AppShell } from "@/components/app-shell";
import { FormSubmitButton } from "@/components/form-submit-button";
import { Field, OutcomeCard, StatCard } from "@/components/ui";
import { resendCampaignInvites } from "@/app/campaigns/actions";
import { formatDateTime, getCampaignById } from "@/lib/campaigns";
import { getCurrentAccessibleLocationIds } from "@/lib/current-scope";

export default async function CampaignDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const locationIds = await getCurrentAccessibleLocationIds();
  const campaign = await getCampaignById(id, locationIds);

  if (!campaign) {
    notFound();
  }

  const firstRecipient = campaign.recipients[0];
  const token = firstRecipient?.token ?? "No token";
  const primaryOutcome = firstRecipient?.outcome ?? "Pending";

  return (
    <AppShell activeScreen="campaigns">
      <div className="space-y-6">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <Link href="/campaigns" className="text-sm font-semibold text-indigo-600">
              ← Back to requests
            </Link>
            <p className="mt-4 text-sm font-semibold uppercase tracking-[0.22em] text-indigo-600">Request Detail</p>
            <h2 className="mt-2 text-4xl font-semibold tracking-tight text-slate-950">{campaign.name}</h2>
            <p className="mt-3 max-w-3xl text-slate-600">
              This invite record now reads from Prisma, showing token metadata, delivery path, recipients, and what happened after send.
            </p>
          </div>
          <div className="flex gap-3">
            <form action={resendCampaignInvites}>
              <input type="hidden" name="campaignId" value={campaign.id} />
              <FormSubmitButton
                idleLabel="Resend Invite"
                pendingLabel="Resending..."
                className="rounded-2xl border border-slate-200 bg-white px-5 py-3 text-sm font-semibold text-slate-700 shadow-sm"
              />
            </form>
            <Link href="/campaigns/new" className="rounded-2xl bg-slate-950 px-5 py-3 text-sm font-semibold !text-white shadow-sm visited:!text-white hover:!text-white">
              Duplicate Request
            </Link>
          </div>
        </div>

        <div className="grid gap-4 xl:grid-cols-3">
          <StatCard title="Status" value={campaign.status} meta={`Outcome: ${primaryOutcome}`} />
          <StatCard title="Channel" value={campaign.channel} meta={`Workflow: ${campaign.workflowName ?? "Manual send"}`} />
          <StatCard title="Token" value={token} meta="Tokenized request link record" />
        </div>

        <div className="grid gap-6 xl:grid-cols-[1.1fr_0.9fr]">
          <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
            <h3 className="text-xl font-semibold text-slate-950">Request Metadata</h3>
            <div className="mt-6 grid gap-4 md:grid-cols-2">
              <Field label="Campaign" value={campaign.name} />
              <Field label="Date Sent" value={formatDateTime(campaign.sendAt)} />
              <Field label="Status" value={campaign.status} />
              <Field label="Channel" value={campaign.channel} />
              <Field label="Workflow" value={campaign.workflowName ?? "Manual send"} />
              <Field label="Location" value={campaign.location.name} />
            </div>
            <div className="mt-4">
              <Field label="Destination" value={campaign.destination ?? "No destination notes"} multiline />
            </div>
            <div className="mt-4">
              <Field label="Message Body" value={campaign.messageBody ?? "No message body saved"} multiline />
            </div>
          </section>

          <aside className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
            <h3 className="text-xl font-semibold text-slate-950">Outcome Snapshot</h3>
            <div className="mt-6 space-y-4">
              <OutcomeCard title="Invite delivered" count="Yes" tone="positive" />
              <OutcomeCard title="Recipients created" count={String(campaign.recipients.length)} tone="positive" />
              <OutcomeCard title="Public review redirect" count={primaryOutcome.includes("Google") ? "Yes" : "No"} tone="warning" />
            </div>

            <div className="mt-6 rounded-2xl border border-slate-200 bg-slate-50 p-4">
              <p className="text-sm font-semibold text-slate-900">Recipients</p>
              <div className="mt-3 space-y-3">
                {campaign.recipients.map((recipient) => (
                  <div key={recipient.id}>
                    <p className="text-sm text-slate-700">{recipient.contact.name}</p>
                    <Link href={`/contacts/${recipient.contact.id}`} className="text-sm font-semibold text-indigo-600">
                      Open contact profile
                    </Link>
                  </div>
                ))}
              </div>
            </div>
          </aside>
        </div>

        <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
          <h3 className="text-xl font-semibold text-slate-950">Recipient Timeline</h3>
          <div className="mt-6 space-y-4">
            {campaign.recipients.map((recipient) => (
              <div key={recipient.id} className="rounded-2xl border border-slate-200 p-4">
                <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">{formatDateTime(recipient.sentAt)}</p>
                <p className="mt-2 font-semibold text-slate-900">{recipient.contact.name} invited via {campaign.channel}</p>
                <p className="mt-1 text-sm text-slate-600">Token {recipient.token} created with status {recipient.status}.</p>
                <p className="mt-2 text-sm text-slate-600">Outcome: {recipient.outcome ?? "Pending"}</p>
              </div>
            ))}
          </div>
        </section>
      </div>
    </AppShell>
  );
}
