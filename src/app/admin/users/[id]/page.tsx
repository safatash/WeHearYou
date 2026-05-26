export const dynamic = "force-dynamic";

import { notFound } from "next/navigation";
import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { promoteToSuperAdmin, revokeSuperAdmin } from "@/app/admin/actions";
import { FormSubmitButton } from "@/components/form-submit-button";

export default async function AdminUserDetailPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
}) {
  const { id } = await params;
  const qp = (await searchParams) ?? {};
  const flash = typeof qp.flash === "string" ? qp.flash : null;

  const user = await prisma.user.findUnique({
    where: { id },
    include: {
      memberships: {
        include: {
          organization: { select: { id: true, name: true, suspendedAt: true } },
        },
        orderBy: { createdAt: "asc" },
      },
      sessions: {
        orderBy: { expires: "desc" },
        take: 1,
        select: { expires: true },
      },
    },
  });

  if (!user) notFound();

  const lastSession = user.sessions[0];

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <Link href="/admin/users" className="text-sm font-semibold text-indigo-600">
          ← Users
        </Link>
      </div>

      {flash && (
        <div className="rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm font-medium text-emerald-800">
          {flash}
        </div>
      )}

      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-slate-950">{user.name}</h1>
          <p className="mt-1 text-sm text-slate-500">{user.email}</p>
        </div>
        {user.isSuperAdmin && (
          <span className="rounded-full bg-rose-100 px-3 py-1 text-xs font-bold uppercase tracking-wide text-rose-700">
            Superadmin
          </span>
        )}
      </div>

      <div className="grid gap-6 xl:grid-cols-2">
        {/* User info */}
        <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
          <h2 className="text-lg font-semibold text-slate-950">Account details</h2>
          <dl className="mt-4 space-y-3 text-sm">
            <div className="flex justify-between">
              <dt className="font-medium text-slate-500">User ID</dt>
              <dd className="font-mono text-xs text-slate-700">{user.id}</dd>
            </div>
            <div className="flex justify-between">
              <dt className="font-medium text-slate-500">Email</dt>
              <dd className="text-slate-700">{user.email}</dd>
            </div>
            <div className="flex justify-between">
              <dt className="font-medium text-slate-500">Joined</dt>
              <dd className="text-slate-700">{user.createdAt.toLocaleDateString()}</dd>
            </div>
            <div className="flex justify-between">
              <dt className="font-medium text-slate-500">Last session</dt>
              <dd className="text-slate-700">
                {lastSession ? lastSession.expires.toLocaleDateString() : "Never"}
              </dd>
            </div>
          </dl>
        </section>

        {/* Memberships */}
        <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
          <h2 className="text-lg font-semibold text-slate-950">Organizations</h2>
          <div className="mt-4 divide-y divide-slate-100">
            {user.memberships.length === 0 ? (
              <p className="py-3 text-sm text-slate-400">No organization memberships.</p>
            ) : (
              user.memberships.map((m) => (
                <div key={m.id} className="flex items-center justify-between py-3">
                  <div>
                    <Link
                      href={`/admin/orgs/${m.organization.id}`}
                      className="font-medium text-slate-900 hover:text-indigo-600"
                    >
                      {m.organization.name}
                    </Link>
                    <p className="text-xs text-slate-400 uppercase tracking-wide">{m.role} · {m.status}</p>
                  </div>
                  {m.organization.suspendedAt && (
                    <span className="text-xs font-semibold text-rose-600">Suspended</span>
                  )}
                </div>
              ))
            )}
          </div>
        </section>

        {/* Superadmin control */}
        <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
          <h2 className="text-lg font-semibold text-slate-950">Superadmin access</h2>
          <p className="mt-2 text-sm text-slate-500">
            {user.isSuperAdmin
              ? "This user has full superadmin access to the platform."
              : "This user does not have superadmin access."}
          </p>
          <div className="mt-4">
            <form action={user.isSuperAdmin ? revokeSuperAdmin : promoteToSuperAdmin}>
              <input type="hidden" name="userId" value={user.id} />
              <FormSubmitButton
                idleLabel={user.isSuperAdmin ? "Revoke superadmin" : "Promote to superadmin"}
                pendingLabel={user.isSuperAdmin ? "Revoking..." : "Promoting..."}
                className={`rounded-2xl px-4 py-2.5 text-sm font-semibold ${
                  user.isSuperAdmin
                    ? "border border-rose-200 bg-rose-50 text-rose-700 hover:bg-rose-100"
                    : "bg-indigo-600 text-white hover:bg-indigo-700"
                }`}
              />
            </form>
          </div>
        </section>
      </div>
    </div>
  );
}
