export const dynamic = "force-dynamic";

import { AppShell } from "@/components/app-shell";
import { prisma } from "@/lib/prisma";
import { requireActiveMembershipPage } from "@/lib/page-guards";
import { getAccessibleLocationIds } from "@/lib/scope";
import { CampaignWizard } from "@/app/campaign-wizard/wizard-client";

export default async function CampaignWizardPage() {
  const membership = await requireActiveMembershipPage();
  const locationIds = getAccessibleLocationIds(membership);

  const locations = await prisma.location.findMany({
    where: { id: { in: locationIds } },
    include: { publicProfile: true },
    orderBy: { createdAt: "asc" },
  });

  if (locations.length === 0) {
    return (
      <AppShell activeScreen="funnel-builder">
        <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
          <p className="text-sm font-semibold text-slate-900">No locations found.</p>
          <p className="mt-2 text-sm text-slate-600">Add a business location to start building a campaign.</p>
        </div>
      </AppShell>
    );
  }

  const appUrl = process.env.NEXT_PUBLIC_APP_URL?.replace(/\/$/, "") ?? "https://wehearyou.vercel.app";

  return (
    <AppShell activeScreen="funnel-builder">
      <div className="space-y-6">
        <div>
          <p className="text-sm font-semibold uppercase tracking-[0.22em] text-indigo-600">Campaign Wizard</p>
          <h2 className="mt-2 text-3xl font-semibold tracking-tight text-slate-950">Set up your review campaign</h2>
          <p className="mt-3 max-w-2xl text-slate-600">
            Configure your funnel, customize your message, set the review filter, and get your shareable link and QR code — all in one place.
          </p>
        </div>

        <CampaignWizard
          locations={locations.map((l) => ({
            id: l.id,
            name: l.name,
            slug: l.slug,
            city: l.city ?? "",
            state: l.state ?? "",
            reviewLink: l.reviewLink,
            publicProfile: l.publicProfile
              ? {
                  funnelRatingStyle: l.publicProfile.funnelRatingStyle,
                  funnelPromptTitle: l.publicProfile.funnelPromptTitle,
                  funnelPromptBody: l.publicProfile.funnelPromptBody,
                  negativeFilterEnabled: l.publicProfile.negativeFilterEnabled,
                  negativeFilterThreshold: l.publicProfile.negativeFilterThreshold,
                }
              : null,
          }))}
          appUrl={appUrl}
        />
      </div>
    </AppShell>
  );
}
