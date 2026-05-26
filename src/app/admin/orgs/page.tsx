export const dynamic = "force-dynamic";

import Link from "next/link";
import { prisma } from "@/lib/prisma";

export default async function AdminOrgsPage({
  searchParams,
}: {
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
}) {
  const params = (await searchParams) ?? {};
  const flash = typeof params.flash === "string" ? params.flash : null;

  const orgs = await prisma.organization.findMany({
    orderBy: { createdAt: "desc" },
    select: {
      id: true,
      name: true,
      slug: true,
      suspendedAt: true,
      createdAt: true,
      _count: {
        select: { users: true, locations: true },
      },
    },
  });

  return (
    <div className="space-y-6">
      {flash && (
        <div className="rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm font-medium text-emerald-800">
          {flash}
        </div>
      )}

      <div className="flex items-end justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-slate-950">Organizations</h1>
          <p className="mt-1 text-sm text-slate-500">{orgs.length} total</p>
        </div>
      </div>

      <div className="rounded-3xl border border-slate-200 bg-white shadow-sm overflow-hidden">
        <table className="min-w-full text-left text-sm">
          <thead className="border-b border-slate-200 bg-slate-50">
            <tr>
              <th className="px-6 py-4 font-semibold text-slate-700">Name</th>
              <th className="px-6 py-4 font-semibold text-slate-700">Slug</th>
              <th className="px-6 py-4 font-semibold text-slate-700">Users</th>
              <th className="px-6 py-4 font-semibold text-slate-700">Locations</th>
              <th className="px-6 py-4 font-semibold text-slate-700">Status</th>
              <th className="px-6 py-4 font-semibold text-slate-700">Created</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {orgs.map((org) => (
              <tr key={org.id} className="hover:bg-slate-50">
                <td className="px-6 py-4">
                  <Link href={`/admin/orgs/${org.id}`} className="font-medium text-slate-900 hover:text-indigo-600">
                    {org.name}
                  </Link>
                </td>
                <td className="px-6 py-4 text-slate-500">{org.slug}</td>
                <td className="px-6 py-4 text-slate-700">{org._count.users}</td>
                <td className="px-6 py-4 text-slate-700">{org._count.locations}</td>
                <td className="px-6 py-4">
                  {org.suspendedAt ? (
                    <span className="rounded-full bg-rose-100 px-2.5 py-0.5 text-xs font-semibold text-rose-700">
                      Suspended
                    </span>
                  ) : (
                    <span className="rounded-full bg-emerald-50 px-2.5 py-0.5 text-xs font-semibold text-emerald-700">
                      Active
                    </span>
                  )}
                </td>
                <td className="px-6 py-4 text-slate-500 text-xs">
                  {org.createdAt.toLocaleDateString()}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
