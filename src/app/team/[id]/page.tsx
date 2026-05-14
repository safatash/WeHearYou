export const dynamic = "force-dynamic";

import Link from "next/link";
import { notFound } from "next/navigation";
import { AppShell } from "@/components/app-shell";
import { resetInvite } from "@/app/team/actions";
import { Field, OutcomeCard, StatCard } from "@/components/ui";
import { formatAccessSummary, formatMembershipRole, formatMembershipStatus, getAssignedLocations, getPermissionList, getTeamMemberById } from "@/lib/team";
import { requireTeamAccessPage } from "@/lib/page-guards";

const allRoles = ["Agency Admin", "Location Manager", "Analyst", "Support"] as const;
const permissionLibrary = [
  "Manage billing",
  "Edit automations",
  "Invite team",
  "View all reviews",
  "Reply to reviews",
  "Send requests",
  "View location reports",
  "Manage contacts",
  "Export reports",
  "Monitor review trends",
  "View launch checklist",
  "View dashboards",
];

export default async function TeamMemberDetailPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
}) {
  const membership = await requireTeamAccessPage();
  const { id } = await params;
  const query = await searchParams;
  const flash = typeof query?.flash === "string" ? query.flash : null;
  const tone = typeof query?.tone === "string" && ["success", "error", "info"].includes(query.tone) ? (query.tone as "success" | "error" | "info") : "success";
  const member = await getTeamMemberById(id, membership.organizationId);

  if (!member) {
    notFound();
  }

  const locations = getAssignedLocations(member);
  const permissions = getPermissionList(member);
  const role = formatMembershipRole(member.role);
  const status = formatMembershipStatus(member.status);

  return (
    <AppShell activeScreen="team" flash={flash ? { message: flash, tone } : null}>
      <div className="space-y-6">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <Link href="/team" className="text-sm font-semibold text-indigo-600">
              ← Back to team
            </Link>
            <p className="mt-4 text-sm font-semibold uppercase tracking-[0.22em] text-indigo-600">User Detail</p>
            <h2 className="mt-2 text-4xl font-semibold tracking-tight text-slate-950">{member.user.name}</h2>
            <p className="mt-3 max-w-3xl text-slate-600">
              A user profile and role editor view for agency accounts, with scoped location access and granular permissions.
            </p>
          </div>
          <div className="flex gap-3">
            <form action={resetInvite.bind(null, member.id)}>
              <button className="rounded-2xl border border-slate-200 bg-white px-5 py-3 text-sm font-semibold text-slate-700 shadow-sm">Reset Invite</button>
            </form>
            <button className="rounded-2xl bg-slate-950 px-5 py-3 text-sm font-semibold !text-white shadow-sm visited:!text-white hover:!text-white">Save Role Changes</button>
          </div>
        </div>

        <div className="grid gap-4 xl:grid-cols-3">
          <StatCard title="Current Role" value={role} meta={`Status: ${status}`} />
          <StatCard title="Access Scope" value={formatAccessSummary(member)} meta={`Locations: ${locations.length}`} />
          <StatCard title="Permission Count" value={String(permissions.length)} meta="Assigned capabilities" />
        </div>

        <div className="grid gap-6 xl:grid-cols-[1.05fr_0.95fr]">
          <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
            <h3 className="text-xl font-semibold text-slate-950">Profile</h3>
            <div className="mt-6 grid gap-4 md:grid-cols-2">
              <Field label="Full Name" value={member.user.name} />
              <Field label="Email" value={member.user.email} />
              <Field label="Role" value={role} />
              <Field label="Status" value={status} />
            </div>

            <div className="mt-6">
              <p className="mb-3 text-sm font-semibold text-slate-700">Assigned Locations</p>
              <div className="flex flex-wrap gap-2">
                {locations.map((location) => (
                  <Link
                    key={location.id}
                    href={`/locations/${location.id}`}
                    className="rounded-full border border-slate-200 bg-slate-50 px-3 py-2 text-xs font-semibold uppercase tracking-[0.14em] text-slate-600 hover:border-slate-300 hover:text-slate-900"
                  >
                    {location.name}
                  </Link>
                ))}
              </div>
            </div>
          </section>

          <aside className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
            <h3 className="text-xl font-semibold text-slate-950">Access Health</h3>
            <div className="mt-6 space-y-4">
              <OutcomeCard title="User is active" count={status === "Active" ? "Yes" : "Pending"} tone={status === "Active" ? "positive" : "warning"} />
              <OutcomeCard title="Scoped access applied" count={formatAccessSummary(member)} tone="neutral" />
              <OutcomeCard title="Location coverage" count={locations.length > 1 ? "Multi-site" : locations.length === 1 ? "Single-site" : "No sites"} tone="neutral" />
            </div>
          </aside>
        </div>

        <div className="grid gap-6 xl:grid-cols-[0.95fr_1.05fr]">
          <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
            <h3 className="text-xl font-semibold text-slate-950">Role Editor</h3>
            <div className="mt-6 grid gap-3">
              {allRoles.map((roleOption) => {
                const active = role === roleOption;
                return (
                  <button
                    key={roleOption}
                    className={`rounded-2xl border px-4 py-4 text-left transition ${active ? "border-indigo-200 bg-indigo-50" : "border-slate-200 bg-white hover:border-slate-300 hover:bg-slate-50"}`}
                  >
                    <p className={`font-semibold ${active ? "text-indigo-700" : "text-slate-900"}`}>{roleOption}</p>
                    <p className="mt-1 text-sm text-slate-600">
                      {roleOption === "Agency Admin"
                        ? "Full workspace access"
                        : roleOption === "Location Manager"
                          ? "Manage assigned locations"
                          : roleOption === "Analyst"
                            ? "Read-only analytics and exports"
                            : "Support-level access for operations"}
                    </p>
                  </button>
                );
              })}
            </div>
          </section>

          <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
            <h3 className="text-xl font-semibold text-slate-950">Permission Matrix</h3>
            <div className="mt-6 grid gap-3 sm:grid-cols-2">
              {permissionLibrary.map((permission) => {
                const enabled = permissions.includes(permission);
                return (
                  <div
                    key={permission}
                    className={`rounded-2xl border px-4 py-4 ${enabled ? "border-emerald-200 bg-emerald-50" : "border-slate-200 bg-slate-50"}`}
                  >
                    <div className="flex items-center justify-between gap-3">
                      <p className={`text-sm font-semibold ${enabled ? "text-emerald-800" : "text-slate-700"}`}>{permission}</p>
                      <button className={`relative h-7 w-12 rounded-full ${enabled ? "bg-emerald-500" : "bg-slate-300"}`}>
                        <span className={`absolute top-1 h-5 w-5 rounded-full bg-white shadow-sm ${enabled ? "left-6" : "left-1"}`} />
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          </section>
        </div>
      </div>
    </AppShell>
  );
}
