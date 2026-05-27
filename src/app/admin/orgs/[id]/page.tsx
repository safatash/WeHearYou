export const dynamic = "force-dynamic";

import { notFound } from "next/navigation";
import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { updateOrgAsAdmin, suspendOrg, unsuspendOrg, startImpersonation } from "@/app/admin/actions";
import { FormSubmitButton } from "@/components/form-submit-button";
import { DeleteOrgButton } from "./delete-org-button";

export default async function AdminOrgDetailPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
}) {
  const { id } = await params;
  const qp = (await searchParams) ?? {};
  const flash = typeof qp.flash === "string" ? qp.flash : null;

  const org = await prisma.organization.findUnique({
    where: { id },
    include: {
      users: {
        include: { user: true },
        orderBy: { createdAt: "asc" },
      },
      locations: {
        orderBy: { createdAt: "asc" },
        select: { id: true, name: true, city: true, state: true, googleLocationName: true },
      },
    },
  });

  if (!org) notFound();

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <Link href="/admin/orgs" className="text-sm font-semibold text-indigo-600">
          ← Organizations
        </Link>
      </div>

      {flash && (
        <div className="rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm font-medium text-emerald-800">
          {flash}
        </div>
      )}

      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-slate-950">{org.name}</h1>
          <p className="mt-1 text-sm text-slate-500">/{org.slug}</p>
          <p className="mt-1 font-mono text-sm font-semibold text-indigo-700 tracking-wider">
            {"WHY-" + org.id.slice(0, 8).toUpperCase()}
          </p>
        </div>
        {org.suspendedAt && (
          <span className="rounded-full bg-rose-100 px-3 py-1 text-xs font-bold uppercase tracking-wide text-rose-700">
            Suspended
          </span>
        )}
      </div>

      <div className="grid gap-6 xl:grid-cols-2">
        {/* Edit form */}
        <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
          <h2 className="text-lg font-semibold text-slate-950">Edit organization</h2>
          <form action={updateOrgAsAdmin} className="mt-4 space-y-4">
            <input type="hidden" name="orgId" value={org.id} />
            <label className="grid gap-1.5 text-sm font-semibold text-slate-700">
              Name
              <input
                name="name"
                defaultValue={org.name}
                className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm font-normal text-slate-700 focus:border-indigo-300 focus:outline-none"
              />
            </label>
            <label className="grid gap-1.5 text-sm font-semibold text-slate-700">
              Slug
              <input
                name="slug"
                defaultValue={org.slug}
                className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm font-normal text-slate-700 focus:border-indigo-300 focus:outline-none"
              />
            </label>
            <label className="grid gap-1.5 text-sm font-semibold text-slate-700">
              Website
              <input
                name="website"
                defaultValue={org.website ?? ""}
                className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm font-normal text-slate-700 focus:border-indigo-300 focus:outline-none"
              />
            </label>
            <FormSubmitButton
              idleLabel="Save changes"
              pendingLabel="Saving..."
              className="rounded-2xl bg-slate-950 px-4 py-2.5 text-sm font-semibold text-white"
            />
          </form>
        </section>

        {/* Members */}
        <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
          <h2 className="text-lg font-semibold text-slate-950">Members ({org.users.length})</h2>
          <div className="mt-4 divide-y divide-slate-100">
            {org.users.map((m) => (
              <div key={m.id} className="flex items-center justify-between gap-3 py-3">
                <div>
                  <Link href={`/admin/users/${m.userId}`} className="font-medium text-slate-900 hover:text-indigo-600">
                    {m.user.name}
                  </Link>
                  <p className="text-xs text-slate-400">{m.user.email}</p>
                </div>
                <div className="flex items-center gap-3">
                  <span className="text-xs font-semibold uppercase tracking-wide text-slate-500">{m.role}</span>
                  <form action={startImpersonation}>
                    <input type="hidden" name="userId" value={m.userId} />
                    <button type="submit" className="rounded-xl border border-indigo-200 bg-indigo-50 px-3 py-1.5 text-xs font-semibold text-indigo-700 hover:bg-indigo-100 transition">
                      Log in as client
                    </button>
                  </form>
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* Locations */}
        <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
          <h2 className="text-lg font-semibold text-slate-950">Locations ({org.locations.length})</h2>
          <div className="mt-4 divide-y divide-slate-100">
            {org.locations.map((loc) => (
              <div key={loc.id} className="flex items-center justify-between py-3">
                <div>
                  <p className="font-medium text-slate-900">{loc.name}</p>
                  <p className="text-xs text-slate-400">{loc.city}, {loc.state}</p>
                </div>
                {loc.googleLocationName ? (
                  <span className="text-xs font-semibold text-emerald-600">Google connected</span>
                ) : (
                  <span className="text-xs text-slate-400">No Google</span>
                )}
              </div>
            ))}
          </div>
        </section>

        {/* Danger zone */}
        <section className="rounded-3xl border border-rose-200 bg-white p-6 shadow-sm">
          <h2 className="text-lg font-semibold text-slate-950">Danger zone</h2>
          <div className="mt-4 space-y-3">
            <form action={org.suspendedAt ? unsuspendOrg : suspendOrg}>
              <input type="hidden" name="orgId" value={org.id} />
              <FormSubmitButton
                idleLabel={org.suspendedAt ? "Reactivate organization" : "Suspend organization"}
                pendingLabel={org.suspendedAt ? "Reactivating..." : "Suspending..."}
                className={`rounded-2xl px-4 py-2.5 text-sm font-semibold ${
                  org.suspendedAt
                    ? "bg-emerald-600 text-white"
                    : "border border-rose-200 bg-rose-50 text-rose-700 hover:bg-rose-100"
                }`}
              />
            </form>
            <DeleteOrgButton orgId={org.id} orgName={org.name} />
          </div>
        </section>
      </div>
    </div>
  );
}
