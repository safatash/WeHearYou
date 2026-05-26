export const dynamic = "force-dynamic";

import Link from "next/link";
import { prisma } from "@/lib/prisma";

export default async function AdminDashboardPage() {
  const [orgCount, userCount, locationCount, reviewCount] = await Promise.all([
    prisma.organization.count(),
    prisma.user.count(),
    prisma.location.count(),
    prisma.review.count(),
  ]);

  const recentOrgs = await prisma.organization.findMany({
    orderBy: { createdAt: "desc" },
    take: 5,
    select: { id: true, name: true, slug: true, suspendedAt: true, createdAt: true },
  });

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight text-slate-950">Platform overview</h1>
        <p className="mt-1 text-sm text-slate-500">Real-time stats across all organizations.</p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {[
          { label: "Organizations", value: orgCount },
          { label: "Users", value: userCount },
          { label: "Locations", value: locationCount },
          { label: "Reviews", value: reviewCount },
        ].map(({ label, value }) => (
          <div key={label} className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
            <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">{label}</p>
            <p className="mt-2 text-3xl font-semibold text-slate-950">{value.toLocaleString()}</p>
          </div>
        ))}
      </div>

      <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold text-slate-950">Recent organizations</h2>
          <Link href="/admin/orgs" className="text-sm font-semibold text-indigo-600 hover:text-indigo-700">
            View all →
          </Link>
        </div>
        <div className="mt-4 divide-y divide-slate-100">
          {recentOrgs.map((org) => (
            <div key={org.id} className="flex items-center justify-between py-3">
              <div>
                <Link href={`/admin/orgs/${org.id}`} className="font-medium text-slate-900 hover:text-indigo-600">
                  {org.name}
                </Link>
                <p className="text-xs text-slate-400">{org.slug}</p>
              </div>
              {org.suspendedAt ? (
                <span className="rounded-full bg-rose-100 px-2.5 py-0.5 text-xs font-semibold text-rose-700">
                  Suspended
                </span>
              ) : (
                <span className="rounded-full bg-emerald-50 px-2.5 py-0.5 text-xs font-semibold text-emerald-700">
                  Active
                </span>
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
