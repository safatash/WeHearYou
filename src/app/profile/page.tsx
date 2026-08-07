export const dynamic = "force-dynamic";

import { AppShell } from "@/components/app-shell";
import { requireTeamAccessPage } from "@/lib/page-guards";
import { prisma } from "@/lib/prisma";

function clientId(orgId: string) {
  return "WHY-" + orgId.slice(0, 8).toUpperCase();
}

export default async function ProfilePage() {
  const membership = await requireTeamAccessPage();
  const user = membership.user;

  const org = await prisma.organization.findUnique({
    where: { id: membership.organizationId },
    select: { id: true, name: true, slug: true, createdAt: true },
  });

  const initials = (user.name ?? "")
    .split(" ")
    .map((p: string) => p[0])
    .join("")
    .slice(0, 2)
    .toUpperCase() || "?";

  return (
    <AppShell activeScreen="dashboard">
      <div className="max-w-2xl space-y-6">
        <div>
          <p className="eyebrow">Account</p>
          <h2 className="page-title">Your profile</h2>
        </div>

        {/* User card */}
        <div className="rounded-3xl border border-slate-200 bg-white p-8 shadow-sm">
          <div className="flex items-center gap-5">
            <div className="btn btn-primary items-center justify-center">
              {initials}
            </div>
            <div>
              <p className="section-title">{user.name ?? "—"}</p>
              <p className="text-sm text-slate-500">{user.email}</p>
              <span className="mt-1 inline-block rounded-full bg-indigo-50 px-2.5 py-0.5 text-xs font-semibold text-indigo-700 capitalize">
                {membership.role.toLowerCase()}
              </span>
            </div>
          </div>
        </div>

        {/* Organization card */}
        {org && (
          <div className="rounded-3xl border border-slate-200 bg-white p-8 shadow-sm space-y-5">
            <h3 className="text-base font-semibold text-slate-900">Organization</h3>
            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">Name</p>
                <p className="mt-1 text-sm font-medium text-slate-900">{org.name}</p>
              </div>
              <div>
                <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">Slug</p>
                <p className="mt-1 text-sm font-medium text-slate-900">{org.slug}</p>
              </div>
              <div>
                <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">Client ID</p>
                <p className="mt-1 font-mono text-sm font-semibold text-indigo-700 tracking-wider">{clientId(org.id)}</p>
                <p className="mt-0.5 text-xs text-slate-400">Use this ID when contacting support.</p>
              </div>
              <div>
                <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">Member since</p>
                <p className="mt-1 text-sm font-medium text-slate-900">{org.createdAt.toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" })}</p>
              </div>
            </div>
          </div>
        )}
      </div>
    </AppShell>
  );
}
