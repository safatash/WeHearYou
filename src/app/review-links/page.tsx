export const dynamic = "force-dynamic";

import { redirect } from "next/navigation";
import { AppShell } from "@/components/app-shell";
import { getCurrentMembership } from "@/lib/authz";
import { prisma } from "@/lib/prisma";
import { buildGoogleWriteReviewLink } from "@/lib/locations";
import { getLocationAnalytics } from "@/lib/review-link-analytics";
import { ReviewLinksClient } from "./review-links-client";

export default async function ReviewLinksPage() {
  const membership = await getCurrentMembership();
  if (!membership) redirect("/sign-in");

  const locations = await prisma.location.findMany({
    where: { organizationId: membership.organizationId },
    select: {
      id: true,
      name: true,
      slug: true,
      reviewLink: true,
      googlePlaceId: true,
    },
    orderBy: { name: "asc" },
  });

  const appUrl = process.env.NEXT_PUBLIC_APP_URL?.replace(/\/$/, "") ?? "";

  const statsPerLocation = await Promise.all(
    locations.map((loc) => getLocationAnalytics(loc.id, 30)),
  );
  const totalViews = statsPerLocation.reduce((sum, s) => sum + s.uniqueViews, 0);
  const totalHappy = statsPerLocation.reduce((sum, s) => sum + s.happyClicks, 0);
  const totalUnhappy = statsPerLocation.reduce((sum, s) => sum + s.unhappyClicks, 0);

  const locationData = locations.map((loc) => ({
    id: loc.id,
    name: loc.name,
    slug: loc.slug,
    reviewUrl: `${appUrl}/review/${loc.slug}`,
    hasGoogleUrl: Boolean(loc.reviewLink ?? buildGoogleWriteReviewLink(loc.googlePlaceId)),
  }));

  return (
    <AppShell activeScreen="review-links">
      <div className="space-y-6">
        {/* Header */}
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.22em] text-indigo-600">
            Requests &amp; Feedback
          </p>
          <h2 className="mt-1.5 text-3xl font-bold tracking-tight text-slate-950">
            Review Links
          </h2>
          <p className="mt-2 max-w-2xl text-sm text-slate-500">
            Anonymous links for emails, QR codes, invoices, and websites. Happy clicks go straight to Google — unhappy clicks go to private feedback.
          </p>
        </div>

        {/* Stats strip */}
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
          {[
            { label: "Locations", value: locations.length },
            { label: "Views (30d)", value: totalViews },
            { label: "Happy (30d)", value: totalHappy },
            { label: "Unhappy (30d)", value: totalUnhappy },
          ].map((stat) => (
            <div
              key={stat.label}
              className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm text-center"
            >
              <p className="text-2xl font-bold text-slate-950">{stat.value}</p>
              <p className="text-xs text-slate-500 mt-1">{stat.label}</p>
            </div>
          ))}
        </div>

        {/* Content */}
        {locations.length === 0 ? (
          <div className="rounded-3xl border border-slate-200 bg-white p-8 shadow-sm text-center">
            <p className="text-sm font-semibold text-slate-900">No locations yet.</p>
            <p className="mt-2 text-sm text-slate-500">
              Add a location first to generate review links.
            </p>
          </div>
        ) : (
          <ReviewLinksClient
            locations={locationData}
            appUrl={appUrl}
          />
        )}
      </div>
    </AppShell>
  );
}
