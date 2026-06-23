export const dynamic = "force-dynamic";

import { notFound, redirect } from "next/navigation";
import { getRecipientByToken } from "@/lib/funnel";
import { prisma } from "@/lib/prisma";
import { buildIssueChips } from "@/lib/resolution-issues";
import { ResolutionWizard } from "./resolution-wizard";

export default async function ResolvePage({
  params,
  searchParams,
}: {
  params: Promise<{ token: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const { token } = await params;
  const query = await searchParams;
  const recipient = await getRecipientByToken(token);
  if (!recipient) notFound();

  const location = recipient.campaign.location;
  const settings = await prisma.resolutionAssistantSettings.findUnique({ where: { locationId: location.id } });

  // Graceful fallback to the plain feedback form if not enabled.
  if (!settings?.enabled) {
    redirect(`/r/${token}/feedback`);
  }

  const rating = Number(query.rating) || 1;
  const issueChips = buildIssueChips(location.publicProfile?.businessType);

  return (
    <main className="min-h-screen bg-slate-50 px-4 py-10 text-slate-900 sm:px-6">
      <div className="mx-auto max-w-2xl rounded-[32px] border border-slate-200 bg-white p-6 shadow-[0_16px_50px_rgba(15,23,42,0.08)] sm:p-10">
        {location.publicProfile?.logoUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={location.publicProfile.logoUrl} alt={`${location.name} logo`} className="mb-6 h-12 w-auto rounded-xl object-contain" />
        ) : null}
        <ResolutionWizard
          token={token}
          locationId={location.id}
          businessName={location.name}
          rating={rating}
          issueChips={issueChips}
          allowAiRewrite={settings.allowAiRewrite}
          prefillName={recipient.contact?.name ?? ""}
          prefillEmail={recipient.contact?.email ?? ""}
          prefillPhone={recipient.contact?.phone ?? ""}
        />
      </div>
    </main>
  );
}
