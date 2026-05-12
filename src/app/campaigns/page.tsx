export const dynamic = "force-dynamic";

import Link from "next/link";
import { AppShell } from "@/components/app-shell";
import { formatCampaignStatus, formatChannel, formatDateTime, getCampaigns } from "@/lib/campaigns";
import { getCurrentAccessibleLocationIds } from "@/lib/current-scope";

export default async function CampaignsPage({
  searchParams,
}: {
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
}) {
  const params = (await searchParams) ?? {};
  const flash = typeof params.flash === "string" ? params.flash : null;
  const tone = typeof params.tone === "string" && ["success", "error", "info"].includes(params.tone) ? (params.tone as "success" | "error" | "info") : "success";
  const created = typeof params.created === "string" ? params.created : null;
  const createdCampaigns = created
    ? created
        .split(",")
        .map((entry) => {
          const [channel, id] = entry.split(":");
          return channel && id ? { channel, id } : null;
        })
        .filter((entry): entry is { channel: string; id: string } => Boolean(entry))
    : [];
  const locationIds = await getCurrentAccessibleLocationIds();
  const campaigns = await getCampaigns(locationIds);

  return (
    <AppShell activeScreen="campaigns" flash={flash ? { message: flash, tone } : null}>
      <div className="space-y-6">
        {createdCampaigns.length > 1 ? (
          <div className="rounded-2xl border border-indigo-200 bg-indigo-50 px-4 py-3 text-sm text-indigo-800">
            <p className="font-medium">Created campaigns:</p>
            <div className="mt-2 flex flex-wrap gap-3">
              {createdCampaigns.map((campaign) => (
                <Link key={`${campaign.channel}-${campaign.id}`} href={`/campaigns/${campaign.id}`} className="font-semibold text-indigo-700 underline decoration-indigo-300 underline-offset-4 hover:text-indigo-900">
                  {campaign.channel} campaign
                </Link>
              ))}
            </div>
          </div>
        ) : null}
        <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p className="text-sm font-semibold uppercase tracking-[0.22em] text-indigo-600">Review Requests</p>
            <h2 className="mt-2 text-3xl font-semibold tracking-tight text-slate-950">Tokenized request sends and campaign activity</h2>
            <p className="mt-3 max-w-3xl text-slate-600">
              This screen maps to the plugin&apos;s invite records, showing request status, send channel, and what happened after the contact received the funnel link.
            </p>
          </div>
          <Link href="/campaigns/new" className="rounded-2xl bg-slate-950 px-5 py-3 text-sm font-semibold !text-white shadow-sm visited:!text-white hover:!text-white">
            Send New Request
          </Link>
        </div>

        <div className="rounded-3xl border border-slate-200 bg-white p-4 shadow-sm">
          <div className="overflow-x-auto">
            <table className="min-w-full text-left text-sm">
              <thead>
                <tr className="border-b border-slate-200 text-slate-500">
                  <th className="px-4 py-4 font-medium">Contact Name</th>
                  <th className="px-4 py-4 font-medium">Status</th>
                  <th className="px-4 py-4 font-medium">Channel</th>
                  <th className="px-4 py-4 font-medium">Date Sent</th>
                  <th className="px-4 py-4 font-medium">Outcome</th>
                </tr>
              </thead>
              <tbody>
                {campaigns.map((campaign) => {
                  const firstRecipient = campaign.recipients[0];

                  return (
                    <tr key={campaign.id} className="border-b border-slate-100 text-slate-700 last:border-b-0">
                      <td className="px-4 py-4 font-medium text-slate-900">
                        <Link href={`/campaigns/${campaign.id}`} className="text-slate-900 hover:text-indigo-600">
                          {firstRecipient?.contact.name ?? campaign.name}
                        </Link>
                        {campaign.recipients.length > 1 ? (
                          <p className="mt-1 text-xs font-medium text-slate-400">+{campaign.recipients.length - 1} more recipients</p>
                        ) : null}
                      </td>
                      <td className="px-4 py-4">
                        <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold uppercase tracking-[0.18em] text-slate-600">
                          {formatCampaignStatus(campaign.status)}
                        </span>
                      </td>
                      <td className="px-4 py-4">{formatChannel(campaign.channel)}</td>
                      <td className="px-4 py-4">{formatDateTime(campaign.sendAt)}</td>
                      <td className="px-4 py-4">{firstRecipient?.outcome ?? "Pending"}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </AppShell>
  );
}
