export const dynamic = "force-dynamic";

import Link from "next/link";
import { redirect } from "next/navigation";
import { AppShell } from "@/components/app-shell";
import { OutcomeCard, PrimaryButton, SectionHeading, SecondaryButton, StatCard } from "@/components/ui";
import { getDashboardData } from "@/lib/dashboard";
import { getCurrentAccessibleLocationIds } from "@/lib/current-scope";
import { getCurrentMembership } from "@/lib/authz";
import { prisma } from "@/lib/prisma";
import { OnboardingChecklist } from "@/components/onboarding-checklist";

export default async function DashboardPage() {
  const membership = await getCurrentMembership();

  if (!membership) {
    redirect("/login");
  }

  const org = await prisma.organization.findUnique({
    where: { id: membership.organizationId },
    select: {
      onboardingDismissedAt: true,
      locations: {
        select: { id: true, googleLocationName: true },
        orderBy: { createdAt: "asc" },
        take: 1,
      },
      _count: { select: { locations: true } },
    },
  });

  const hasLocation = (org?._count.locations ?? 0) > 0;
  const hasGoogle = (org?.locations[0]?.googleLocationName ?? null) !== null;
  const contactCount = hasLocation
    ? await prisma.contact.count({ where: { locationId: org!.locations[0].id } })
    : 0;
  const hasContacts = contactCount > 0;

  const dismissed = Boolean(org?.onboardingDismissedAt);
  const allDone = hasLocation && hasGoogle && hasContacts;
  const showChecklist = !dismissed && !allDone;

  if (!hasLocation && !dismissed) {
    redirect("/onboarding");
  }

  const locationIds = await getCurrentAccessibleLocationIds();
  const dashboard = await getDashboardData(locationIds);

  return (
    <AppShell activeScreen="dashboard">
      <div className="space-y-6">
        {showChecklist && (
          <OnboardingChecklist
            hasLocation={hasLocation}
            hasGoogle={hasGoogle}
            hasContacts={hasContacts}
          />
        )}

        <SectionHeading
          eyebrow="Dashboard Overview"
          title="Review funnel performance across requests, redirects, and feedback"
          description="Built to feel like the grown-up product version of your plugin dashboard, with visibility into tokenized requests, public review wins, and private feedback capture."
          actions={
            <>
              <Link href="/campaigns/new">
                <PrimaryButton>Send New Request</PrimaryButton>
              </Link>
              <Link href="/funnel-preview">
                <SecondaryButton>View Funnel</SecondaryButton>
              </Link>
            </>
          }
        />

        <div className="grid gap-4 xl:grid-cols-3">
          <StatCard title="Total Reviews" value={dashboard.totalReviews} meta="Combined Google + Facebook reviews" />
          <StatCard title="Average Rating" value={dashboard.averageRating} meta="Live reputation score across channels" />
          <StatCard title="Request Conversion" value={dashboard.requestConversion} meta="Sent invite to meaningful funnel activity" />
        </div>

        <div className="grid gap-6 xl:grid-cols-[1.45fr_0.95fr]">
          <section className="rounded-[28px] border border-slate-200/80 bg-white p-6 shadow-[0_12px_32px_rgba(15,23,42,0.05)]">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-lg font-semibold text-slate-950">Review Trends</h3>
                <p className="mt-1 text-sm text-slate-500">Public review growth and funnel completions over the last 12 weeks</p>
              </div>
              <Link href="/analytics" className="rounded-full bg-emerald-50 px-3 py-1 text-xs font-semibold text-emerald-700">
                Live activity
              </Link>
            </div>
            <div className="mt-8 flex h-72 items-end gap-3">
              {dashboard.reviewTrendBars.map((bar, index) => (
                <div key={index} className="flex flex-1 flex-col items-center gap-3">
                  <div className="w-full rounded-t-2xl bg-gradient-to-t from-indigo-600 to-sky-400" style={{ height: `${bar * 1.6}px` }} />
                  <span className="text-xs text-slate-400">W{index + 1}</span>
                </div>
              ))}
            </div>
          </section>

          <div className="space-y-6">
            <section className="rounded-[28px] border border-slate-200/80 bg-white p-6 shadow-[0_12px_32px_rgba(15,23,42,0.05)]">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-lg font-semibold text-slate-950">Recent Funnel Outcomes</h3>
                  <p className="mt-1 text-sm text-slate-500">Quick preview of what happened after request sends</p>
                </div>
                <Link href="/reviews" className="text-sm font-semibold text-indigo-600">
                  Open inbox
                </Link>
              </div>
              <div className="mt-6 space-y-4">
                <OutcomeCard title="Redirected to Google" count={String(dashboard.funnelOutcomes.redirectedToGoogle)} tone="positive" />
                <OutcomeCard title="Private feedback captured" count={String(dashboard.funnelOutcomes.privateFeedback)} tone="warning" />
                <OutcomeCard title="Opened, awaiting response" count={String(dashboard.funnelOutcomes.awaitingResponse)} tone="neutral" />
                <OutcomeCard title="Webhook-triggered requests" count={String(dashboard.funnelOutcomes.webhookTriggered)} tone="neutral" />
              </div>
            </section>

            <section className="rounded-[28px] border border-slate-200/80 bg-white p-6 shadow-[0_12px_32px_rgba(15,23,42,0.05)]">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-lg font-semibold text-slate-950">Agency View</h3>
                  <p className="mt-1 text-sm text-slate-500">Manage multiple locations, each with its own links, contacts, and performance.</p>
                </div>
                <Link href="/locations" className="text-sm font-semibold text-indigo-600">
                  Open locations
                </Link>
              </div>
              <div className="mt-6 grid gap-3">
                {dashboard.locations.map((location) => (
                  <div key={location.id} className="rounded-2xl bg-slate-50 p-4">
                    <div className="flex items-center justify-between gap-3">
                      <p className="font-semibold text-slate-900">{location.name.replace("Nova Dental, ", "")}</p>
                      <span className={`rounded-full px-3 py-1 text-xs font-semibold uppercase tracking-[0.18em] ${location.status === "Active" ? "bg-emerald-50 text-emerald-700" : "bg-amber-50 text-amber-700"}`}>
                        {location.avgRating ? `${location.avgRating.toFixed(1)} ★` : location.status}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </section>
          </div>
        </div>
      </div>
    </AppShell>
  );
}
