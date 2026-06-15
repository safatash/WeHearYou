export const dynamic = "force-dynamic";

import Link from "next/link";
import { CampaignStatus, PreferredChannel } from "@prisma/client";
import { AppShell } from "@/components/app-shell";
import { formatCampaignStatus, formatChannel, formatDateTime, getCampaigns } from "@/lib/campaigns";
import { getCurrentAccessibleLocationIds } from "@/lib/current-scope";

function getStatusColor(status: CampaignStatus): string {
  switch (status) {
    case CampaignStatus.COMPLETED:
    case CampaignStatus.CLICKED:
      return "var(--success)";
    case CampaignStatus.OPENED:
      return "var(--warning)";
    case CampaignStatus.SENT:
    case CampaignStatus.SCHEDULED:
      return "var(--accent)";
    case CampaignStatus.FAILED:
      return "var(--danger)";
    default:
      return "var(--ink-500)";
  }
}

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
      <div style={{ maxWidth: 1240, margin: "0 auto", padding: "var(--gutter)" }}>
        {createdCampaigns.length > 1 ? (
          <div style={{ padding: "14px 18px", borderRadius: "var(--r-md)", border: "1px solid var(--accent-border)", background: "var(--accent-soft)", marginBottom: "var(--gutter)" }}>
            <p style={{ fontWeight: 600, color: "var(--accent-strong)", fontSize: 13.5, margin: 0 }}>Created campaigns:</p>
            <div style={{ marginTop: 10, display: "flex", flexWrap: "wrap", gap: 12 }}>
              {createdCampaigns.map((campaign) => (
                <Link key={`${campaign.channel}-${campaign.id}`} href={`/campaigns/${campaign.id}`} style={{ fontWeight: 600, color: "var(--accent)", fontSize: 13.5, textDecoration: "none" }}>
                  {campaign.channel} campaign
                </Link>
              ))}
            </div>
          </div>
        ) : null}

        {/* Header */}
        <div style={{ display: "flex", alignItems: "flex-end", justifyContent: "space-between", gap: 16, flexWrap: "wrap", marginBottom: "var(--gutter)" }}>
          <div>
            <div className="eyebrow" style={{ marginBottom: 6 }}>
              Campaigns
            </div>
            <h1 style={{ fontSize: 26, fontWeight: 680, letterSpacing: "-.025em" }}>Campaign history</h1>
            <p style={{ fontSize: 13.5, color: "var(--ink-500)", marginTop: 5 }}>Review requests and send history</p>
          </div>
          <Link href="/campaigns/new" className="btn btn-primary">
            ➕ New campaign
          </Link>
        </div>

        {/* Table card */}
        <div className="card" style={{ padding: "var(--card-pad)", overflowX: "auto" }}>
          {campaigns.length === 0 ? (
            <div style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", padding: "60px 20px", textAlign: "center" }}>
              <p style={{ fontWeight: 600, color: "var(--ink-900)", fontSize: 14 }}>No campaigns yet</p>
              <p style={{ marginTop: 5, fontSize: 13.5, color: "var(--ink-500)" }}>Send your first review request to get started.</p>
              <Link href="/campaigns/new" className="btn btn-primary" style={{ marginTop: 16 }}>
                ➕ New campaign
              </Link>
            </div>
          ) : (
            <table style={{ minWidth: "100%", textAlign: "left", fontSize: 13.5 }}>
              <thead>
                <tr style={{ borderBottom: "1px solid var(--ink-200)", color: "var(--ink-500)" }}>
                  <th style={{ padding: "12px 16px", fontWeight: 560, fontSize: 11 }}>Contact</th>
                  <th style={{ padding: "12px 16px", fontWeight: 560, fontSize: 11 }}>Status</th>
                  <th style={{ padding: "12px 16px", fontWeight: 560, fontSize: 11 }}>Channel</th>
                  <th style={{ padding: "12px 16px", fontWeight: 560, fontSize: 11 }}>Date Sent</th>
                  <th style={{ padding: "12px 16px", fontWeight: 560, fontSize: 11 }}>Outcome</th>
                </tr>
              </thead>
              <tbody>
                {campaigns.map((campaign) => {
                  const firstRecipient = campaign.recipients[0];
                  const outcome = firstRecipient?.outcome ?? null;

                  return (
                    <tr key={campaign.id} style={{ borderBottom: "1px solid var(--ink-150)", color: "var(--ink-700)" }}>
                      <td style={{ padding: "12px 16px" }}>
                        <Link href={`/campaigns/${campaign.id}`} style={{ fontWeight: 560, color: "var(--accent)", textDecoration: "none" }}>
                          {firstRecipient?.contact.name ?? campaign.name}
                        </Link>
                        {campaign.recipients.length > 1 ? (
                          <p style={{ marginTop: 4, fontSize: 12, color: "var(--ink-400)" }}>
                            +{campaign.recipients.length - 1} more recipients
                          </p>
                        ) : null}
                      </td>
                      <td style={{ padding: "12px 16px" }}>
                        <span className="badge" style={{ fontSize: 11, background: "var(--accent-soft)", color: "var(--accent-strong)" }}>
                          {formatCampaignStatus(campaign.status)}
                        </span>
                      </td>
                      <td style={{ padding: "12px 16px" }}>
                        <span style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 13.5, color: "var(--ink-600)" }}>
                          <span
                            style={{
                              width: 8,
                              height: 8,
                              borderRadius: "50%",
                              background: campaign.channel === PreferredChannel.EMAIL ? "var(--accent)" : "var(--success)",
                              flexShrink: 0,
                            }}
                          />
                          {formatChannel(campaign.channel)}
                        </span>
                      </td>
                      <td style={{ padding: "12px 16px", fontSize: 13.5, color: "var(--ink-600)" }}>
                        {campaign.sendAt ? formatDateTime(campaign.sendAt) : <span style={{ color: "var(--ink-400)" }}>—</span>}
                      </td>
                      <td style={{ padding: "12px 16px", fontSize: 13.5 }}>
                        {outcome ? <span style={{ color: "var(--accent)", fontWeight: 600 }}>{outcome}</span> : <span style={{ color: "var(--ink-400)" }}>—</span>}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </AppShell>
  );
}
