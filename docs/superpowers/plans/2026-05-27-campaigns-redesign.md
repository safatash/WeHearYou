# Campaigns Page Redesign Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Visual refresh of the campaigns list page (`/campaigns`) to match the new dashboard style — color-coded status pills, channel dots, dashboard-style header, and an empty state.

**Architecture:** Pure UI change — `src/app/campaigns/page.tsx` is fully rewritten. No data layer, schema, or routing changes. All existing helpers from `src/lib/campaigns.ts` (`formatCampaignStatus`, `formatChannel`, `formatDateTime`, `getCampaigns`) are kept as-is.

**Tech Stack:** Next.js App Router (RSC), Tailwind CSS, TypeScript, Prisma enums (`CampaignStatus`, `PreferredChannel`).

---

## File Map

| File | Change |
|------|--------|
| `src/app/campaigns/page.tsx` | Full rewrite (101 lines → ~130 lines) |

---

### Task 1: Rewrite the campaigns list page

**Files:**
- Modify: `src/app/campaigns/page.tsx`

**Context:** Spec at `docs/superpowers/specs/2026-05-27-campaigns-redesign.md`. Approved mockup at `.superpowers/brainstorm/10193-1779901839/content/campaigns-full-mockup.html`. The current file is 101 lines and will be fully replaced — the data-fetching logic is kept verbatim, only the JSX and two new helper functions change.

- [ ] **Step 1: TypeScript-check the current file to establish a baseline**

```bash
npx tsc --noEmit 2>&1 | head -30
```

Expected: zero errors (or note any pre-existing ones so you don't confuse them with new ones).

- [ ] **Step 2: Replace `src/app/campaigns/page.tsx` with the rewritten version**

Write the full file content:

```tsx
export const dynamic = "force-dynamic";

import Link from "next/link";
import { CampaignStatus, PreferredChannel } from "@prisma/client";
import { AppShell } from "@/components/app-shell";
import { formatCampaignStatus, formatChannel, formatDateTime, getCampaigns } from "@/lib/campaigns";
import { getCurrentAccessibleLocationIds } from "@/lib/current-scope";

function statusPillClasses(status: CampaignStatus): string {
  switch (status) {
    case CampaignStatus.COMPLETED:
    case CampaignStatus.CLICKED:
      return "bg-emerald-100 text-emerald-800";
    case CampaignStatus.OPENED:
      return "bg-amber-100 text-amber-800";
    case CampaignStatus.SENT:
    case CampaignStatus.SCHEDULED:
      return "bg-indigo-100 text-indigo-800";
    case CampaignStatus.FAILED:
      return "bg-red-100 text-red-800";
    default:
      return "bg-slate-100 text-slate-600";
  }
}

function outcomeClasses(outcome: string): string {
  const lower = outcome.toLowerCase();
  if (lower.includes("google")) return "text-sm font-semibold text-emerald-600";
  if (lower.includes("feedback") || lower.includes("private")) return "text-sm font-semibold text-amber-600";
  return "text-sm text-slate-500";
}

export default async function CampaignsPage({
  searchParams,
}: {
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
}) {
  const params = (await searchParams) ?? {};
  const flash = typeof params.flash === "string" ? params.flash : null;
  const tone =
    typeof params.tone === "string" && ["success", "error", "info"].includes(params.tone)
      ? (params.tone as "success" | "error" | "info")
      : "success";
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
                <Link
                  key={`${campaign.channel}-${campaign.id}`}
                  href={`/campaigns/${campaign.id}`}
                  className="font-semibold text-indigo-700 underline decoration-indigo-300 underline-offset-4 hover:text-indigo-900"
                >
                  {campaign.channel} campaign
                </Link>
              ))}
            </div>
          </div>
        ) : null}

        <div className="flex items-start justify-between">
          <div>
            <h1 className="text-xl font-bold text-slate-900">Campaigns</h1>
            <p className="mt-0.5 text-sm text-slate-400">Review requests and send history</p>
          </div>
          <Link
            href="/campaigns/new"
            className="inline-flex items-center rounded-lg bg-indigo-600 px-4 py-2 text-sm font-semibold text-white hover:bg-indigo-700"
          >
            Send New Request
          </Link>
        </div>

        <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
          {campaigns.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 text-center">
              <p className="text-sm font-medium text-slate-900">No campaigns yet</p>
              <p className="mt-1 text-sm text-slate-400">Send your first review request to get started.</p>
              <Link
                href="/campaigns/new"
                className="mt-4 inline-flex items-center rounded-lg bg-indigo-600 px-4 py-2 text-sm font-semibold text-white hover:bg-indigo-700"
              >
                Send New Request
              </Link>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full text-left">
                <thead className="border-b border-slate-200 bg-slate-50">
                  <tr>
                    <th className="px-4 py-3 text-[10px] font-bold uppercase tracking-[.1em] text-slate-400">Contact</th>
                    <th className="px-4 py-3 text-[10px] font-bold uppercase tracking-[.1em] text-slate-400">Status</th>
                    <th className="px-4 py-3 text-[10px] font-bold uppercase tracking-[.1em] text-slate-400">Channel</th>
                    <th className="px-4 py-3 text-[10px] font-bold uppercase tracking-[.1em] text-slate-400">Date Sent</th>
                    <th className="px-4 py-3 text-[10px] font-bold uppercase tracking-[.1em] text-slate-400">Outcome</th>
                  </tr>
                </thead>
                <tbody>
                  {campaigns.map((campaign) => {
                    const firstRecipient = campaign.recipients[0];
                    const outcome = firstRecipient?.outcome ?? null;

                    return (
                      <tr key={campaign.id} className="border-b border-slate-100 last:border-b-0 hover:bg-slate-50/60">
                        <td className="px-4 py-3">
                          <Link
                            href={`/campaigns/${campaign.id}`}
                            className="text-sm font-semibold text-slate-900 hover:text-indigo-600"
                          >
                            {firstRecipient?.contact.name ?? campaign.name}
                          </Link>
                          {campaign.recipients.length > 1 ? (
                            <p className="mt-0.5 text-xs text-slate-400">
                              +{campaign.recipients.length - 1} more recipients
                            </p>
                          ) : null}
                        </td>
                        <td className="px-4 py-3">
                          <span
                            className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-[9px] font-bold uppercase tracking-[.1em] ${statusPillClasses(campaign.status)}`}
                          >
                            {formatCampaignStatus(campaign.status)}
                          </span>
                        </td>
                        <td className="px-4 py-3">
                          <span className="flex items-center text-sm text-slate-500">
                            <span
                              className={`mr-1.5 inline-block h-1.5 w-1.5 flex-shrink-0 rounded-full ${
                                campaign.channel === PreferredChannel.EMAIL ? "bg-indigo-400" : "bg-emerald-400"
                              }`}
                            />
                            {formatChannel(campaign.channel)}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-sm text-slate-500">
                          {campaign.sendAt ? (
                            formatDateTime(campaign.sendAt)
                          ) : (
                            <span className="text-slate-400">—</span>
                          )}
                        </td>
                        <td className="px-4 py-3">
                          {outcome ? (
                            <span className={outcomeClasses(outcome)}>{outcome}</span>
                          ) : (
                            <span className="text-slate-400">—</span>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </AppShell>
  );
}
```

- [ ] **Step 3: TypeScript-check to verify no new errors**

```bash
npx tsc --noEmit 2>&1 | head -30
```

Expected: same output as Step 1 (zero new errors introduced).

- [ ] **Step 4: Visual verification**

Ensure the dev server is running (`npm run dev`), then open **http://localhost:3000/campaigns**.

Verify each of the following:

| Item | Expected |
|------|----------|
| Page header | "Campaigns" bold title + "Review requests and send history" subtitle + indigo "Send New Request" button right-aligned |
| Table header row | Light `bg-slate-50` background, small uppercase column labels in muted slate |
| Completed/Clicked rows | Green pill |
| Opened rows | Amber pill |
| Sent/Scheduled rows | Indigo pill |
| Failed rows | Red pill |
| Draft rows | Slate pill |
| Email channel | Small indigo dot + "Email" |
| SMS channel | Small emerald dot + "SMS" |
| Outcome with "Google" | Emerald, bold |
| Outcome with "feedback"/"private" | Amber, bold |
| Outcome null | Slate "—" |
| Date null | Slate "—" |
| Multi-recipient row | "+N more recipients" sub-line in muted slate |
| Row hover | Subtle background tint |
| Empty state (if no campaigns) | Centered message + "Send New Request" button |

- [ ] **Step 5: Commit**

```bash
git add src/app/campaigns/page.tsx
git commit -m "feat: redesign campaigns list page with color-coded status pills and dashboard-style header"
```
