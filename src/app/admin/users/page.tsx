export const dynamic = "force-dynamic";

import Link from "next/link";
import { prisma } from "@/lib/prisma";

export default async function AdminUsersPage() {
  const users = await prisma.user.findMany({
    orderBy: { createdAt: "desc" },
    select: {
      id: true,
      name: true,
      email: true,
      isSuperAdmin: true,
      createdAt: true,
      memberships: {
        select: {
          organization: { select: { name: true } },
        },
      },
    },
  });

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight text-slate-950">Users</h1>
        <p className="mt-1 text-sm text-slate-500">{users.length} total</p>
      </div>

      <div className="rounded-3xl border border-slate-200 bg-white shadow-sm overflow-hidden">
        <table className="min-w-full text-left text-sm">
          <thead className="border-b border-slate-200 bg-slate-50">
            <tr>
              <th className="px-6 py-4 font-semibold text-slate-700">Name</th>
              <th className="px-6 py-4 font-semibold text-slate-700">Email</th>
              <th className="px-6 py-4 font-semibold text-slate-700">Organizations</th>
              <th className="px-6 py-4 font-semibold text-slate-700">Role</th>
              <th className="px-6 py-4 font-semibold text-slate-700">Joined</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {users.map((user) => (
              <tr key={user.id} className="hover:bg-slate-50">
                <td className="px-6 py-4">
                  <Link href={`/admin/users/${user.id}`} className="font-medium text-slate-900 hover:text-indigo-600">
                    {user.name}
                  </Link>
                </td>
                <td className="px-6 py-4 text-slate-500">{user.email}</td>
                <td className="px-6 py-4 text-slate-500 text-xs">
                  {user.memberships.map((m) => m.organization.name).join(", ") || "—"}
                </td>
                <td className="px-6 py-4">
                  {user.isSuperAdmin ? (
                    <span className="rounded-full bg-rose-100 px-2.5 py-0.5 text-xs font-semibold text-rose-700">
                      Superadmin
                    </span>
                  ) : (
                    <span className="text-xs text-slate-400">Member</span>
                  )}
                </td>
                <td className="px-6 py-4 text-slate-400 text-xs">{user.createdAt.toLocaleDateString()}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
