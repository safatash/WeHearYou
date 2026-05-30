export const dynamic = "force-dynamic";

import Link from "next/link";
import { AppShell } from "@/components/app-shell";
import { prisma } from "@/lib/prisma";
import { getCurrentMembership } from "@/lib/authz";
import { getCurrentAccessibleLocationIds } from "@/lib/current-scope";
import { notFound } from "next/navigation";
import { GbpPublishStatus } from "@prisma/client";

export default async function GbpManagerPage() {
  const membership = await getCurrentMembership();
  if (!membership) notFound();

  const locationIds = await getCurrentAccessibleLocationIds();

  const locations = await prisma.location.findMany({
    where: {
      organizationId: membership.organizationId,
      ...(locationIds.length > 0 ? { id: { in: locationIds } } : {}),
    },
    select: {
      id: true,
      name: true,
      googleLocationName: true,
      googleConnectionId: true,
    },
    orderBy: { name: "asc" },
  });

  const stats = await Promise.all(
    locations.map(async (loc) => {
      const [pendingReplies, scheduledPosts, livePhotos, unansweredQa] = await Promise.all([
        prisma.review.count({ where: { locationId: loc.id, replyDraft: { not: null }, replyPublishedAt: null } }),
        prisma.gbpPost.count({ where: { locationId: loc.id, status: GbpPublishStatus.SCHEDULED } }),
        prisma.gbpPhoto.count({ where: { locationId: loc.id, status: GbpPublishStatus.PUBLISHED } }),
        prisma.gbpQuestion.count({ where: { locationId: loc.id, answeredAt: null } }),
      ]);

      let health = 100;
      if (pendingReplies > 0) health -= Math.min(pendingReplies * 5, 30);
      if (unansweredQa > 0) health -= Math.min(unansweredQa * 5, 20);
      if (livePhotos === 0) health -= 15;
      if (scheduledPosts === 0) health -= 10;
      health = Math.max(0, health);

      const healthColor = health >= 80 ? "text-emerald-600" : health >= 50 ? "text-amber-600" : "text-red-600";

      return { loc, pendingReplies, scheduledPosts, livePhotos, unansweredQa, health, healthColor };
    })
  );

  return (
    <AppShell activeScreen="gbp-manager">
      <div className="space-y-6">
        <div>
          <p className="text-sm font-semibold uppercase tracking-[0.22em] text-indigo-600">Google Local SEO</p>
          <h2 className="mt-2 text-3xl font-semibold tracking-tight text-slate-950">GBP Manager</h2>
          <p className="mt-1 text-sm text-slate-500">Manage your Google Business Profile content across all locations.</p>
        </div>

        <div className="flex gap-3">
          <Link href="/gbp/posts/new" className="rounded-2xl bg-slate-950 px-5 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-slate-800 transition">
            + New Post
          </Link>
          <Link href="/gbp/photos" className="rounded-2xl border border-slate-200 bg-white px-5 py-2.5 text-sm font-semibold text-slate-700 shadow-sm hover:border-slate-300 transition">
            Photos
          </Link>
          <Link href="/gbp/qa" className="rounded-2xl border border-slate-200 bg-white px-5 py-2.5 text-sm font-semibold text-slate-700 shadow-sm hover:border-slate-300 transition">
            Q&amp;A
          </Link>
        </div>

        {stats.length === 0 ? (
          <div className="rounded-3xl border border-slate-200 bg-white p-12 text-center shadow-sm">
            <p className="text-lg font-semibold text-slate-700">No locations yet</p>
            <p className="mt-2 text-sm text-slate-500">Add a location and connect it to Google Business Profile to get started.</p>
            <Link href="/locations" className="mt-6 inline-block rounded-2xl bg-indigo-600 px-5 py-2.5 text-sm font-semibold text-white hover:bg-indigo-700 transition">
              Go to Locations
            </Link>
          </div>
        ) : (
          <div className="grid gap-6 lg:grid-cols-2">
            {stats.map(({ loc, pendingReplies, scheduledPosts, livePhotos, unansweredQa, health, healthColor }) => (
              <div key={loc.id} className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <p className="font-semibold text-slate-900">{loc.name}</p>
                    {!loc.googleConnectionId ? (
                      <Link href="/integrations" className="mt-1 inline-block text-xs font-semibold text-amber-600 hover:underline">
                        Connect Google Business Profile →
                      </Link>
                    ) : (
                      <p className="mt-1 text-xs text-slate-400">GBP connected</p>
                    )}
                  </div>
                  <div className="text-right">
                    <p className="text-xs font-semibold uppercase tracking-wider text-slate-400">Health</p>
                    <p className={`text-2xl font-bold ${healthColor}`}>{health}/100</p>
                  </div>
                </div>

                <div className="mt-5 grid grid-cols-2 gap-3">
                  <Link href={`/reviews?locationId=${loc.id}`} className="rounded-2xl border border-slate-200 p-4 hover:border-indigo-200 hover:bg-indigo-50 transition">
                    <p className="text-xs font-semibold uppercase tracking-wider text-slate-400">Replies needed</p>
                    <p className={`mt-1 text-2xl font-bold ${pendingReplies > 0 ? "text-rose-600" : "text-slate-900"}`}>{pendingReplies}</p>
                  </Link>
                  <Link href="/gbp/posts" className="rounded-2xl border border-slate-200 p-4 hover:border-indigo-200 hover:bg-indigo-50 transition">
                    <p className="text-xs font-semibold uppercase tracking-wider text-slate-400">Posts scheduled</p>
                    <p className="mt-1 text-2xl font-bold text-slate-900">{scheduledPosts}</p>
                  </Link>
                  <Link href="/gbp/photos" className="rounded-2xl border border-slate-200 p-4 hover:border-indigo-200 hover:bg-indigo-50 transition">
                    <p className="text-xs font-semibold uppercase tracking-wider text-slate-400">Live photos</p>
                    <p className="mt-1 text-2xl font-bold text-slate-900">{livePhotos}</p>
                  </Link>
                  <Link href="/gbp/qa" className="rounded-2xl border border-slate-200 p-4 hover:border-indigo-200 hover:bg-indigo-50 transition">
                    <p className="text-xs font-semibold uppercase tracking-wider text-slate-400">Unanswered Q&amp;A</p>
                    <p className={`mt-1 text-2xl font-bold ${unansweredQa > 0 ? "text-amber-600" : "text-slate-900"}`}>{unansweredQa}</p>
                  </Link>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </AppShell>
  );
}
