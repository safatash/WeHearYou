export const dynamic = "force-dynamic";

import Link from "next/link";
import { AppShell } from "@/components/app-shell";
import { CopyButton } from "@/components/copy-button";
import { InviteUserForm } from "@/app/team/invite-user-form";
import { Field, OutcomeCard, StatCard } from "@/components/ui";
import { formatAccessSummary, formatMembershipRole, formatMembershipStatus, getAssignedLocations, getMembershipStats, getPermissionList, getTeamMembers } from "@/lib/team";
import { requireTeamAccessPage } from "@/lib/page-guards";

export default async function TeamPage({
  searchParams,
}: {
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
}) {
  const membership = await requireTeamAccessPage();
  const params = await searchParams;
  const flash = typeof params?.flash === "string" ? params.flash : null;
  const tone = typeof params?.tone === "string" && ["success", "error", "info"].includes(params.tone) ? (params.tone as "success" | "error" | "info") : "success";
  const inviteToken = typeof params?.invite === "string" ? params.invite : null;
  const members = await getTeamMembers(membership.organizationId);
  const stats = getMembershipStats(members);
  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";
  const inviteLocations = members[0]?.organization.locations.map((location) => ({
    id: location.id,
    name: location.name,
    city: location.city,
    state: location.state,
  })) ?? [];

  return (
    <AppShell activeScreen="team" flash={flash ? { message: flash, tone } : null}>
      <div className="space-y-6">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <p className="text-sm font-semibold uppercase tracking-[0.22em] text-indigo-600">Agency Team & Access</p>
            <h2 className="mt-2 text-4xl font-semibold tracking-tight text-slate-950">Users, roles, and permissions across your locations</h2>
            <p className="mt-3 max-w-3xl text-slate-600">
              This gives the prototype a proper agency-grade permission model, with agency admins, location managers, analysts, and scoped access by location.
            </p>
          </div>
          <div className="flex gap-3">
            <a href="#permission-defaults" className="rounded-2xl border border-slate-200 bg-white px-5 py-3 text-sm font-semibold text-slate-700 shadow-sm hover:border-slate-300">
              Role defaults ↓
            </a>
          </div>
        </div>

        <div className="grid gap-4 xl:grid-cols-3">
          <StatCard title="Active Users" value={String(stats.activeUsers)} meta={`${stats.invitedUsers} invited user pending`} />
          <StatCard title="Role Types" value={String(stats.roleTypes)} meta="Agency + location-based roles" />
          <StatCard title="Scoped Locations" value={String(stats.scopedLocations)} meta="Access rules applied per location" />
        </div>

        {inviteToken ? (
          <section className="rounded-3xl border border-indigo-200 bg-indigo-50 p-6 shadow-sm">
            <p className="text-sm font-semibold uppercase tracking-[0.22em] text-indigo-700">Invite created</p>
            <p className="mt-2 text-sm text-slate-700">
              Share this link with the invited user. It expires once accepted.
              {" "}An invite email was sent if Resend is configured.
            </p>
            <div className="mt-4 flex flex-col gap-3 sm:flex-row sm:items-center">
              <div className="flex-1 rounded-2xl border border-indigo-200 bg-white px-4 py-3 text-sm font-medium text-slate-900 break-all">
                {appUrl}/accept-invite?token={inviteToken}
              </div>
              <CopyButton value={`${appUrl}/accept-invite?token=${inviteToken}`} label="Copy link" copiedLabel="Copied!" />
            </div>
          </section>
        ) : null}

        <InviteUserForm locations={inviteLocations} />

        <div className="grid gap-6 xl:grid-cols-[1.15fr_0.85fr]">
          <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
            <div className="flex items-center justify-between">
              <h3 className="text-xl font-semibold text-slate-950">Team Members</h3>
              <span className="text-sm text-slate-500">Permission-aware roster</span>
            </div>
            <div className="mt-6 space-y-4">
              {members.map((member) => {
                const locations = getAssignedLocations(member);
                const permissions = getPermissionList(member);
                const role = formatMembershipRole(member.role);
                const status = formatMembershipStatus(member.status);

                return (
                  <div key={member.id} className="rounded-3xl border border-slate-200 p-5">
                    <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                      <div>
                        <h4 className="text-xl font-semibold text-slate-950">
                          <Link href={`/team/${member.id}`} className="hover:text-indigo-600">
                            {member.user.name}
                          </Link>
                        </h4>
                        <p className="mt-2 text-sm text-slate-600">{member.user.email}</p>
                        <div className="mt-4 flex flex-wrap gap-2">
                          <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold uppercase tracking-[0.18em] text-slate-600">
                            {role}
                          </span>
                          <span className={`rounded-full px-3 py-1 text-xs font-semibold uppercase tracking-[0.18em] ${status === "Active" ? "bg-emerald-50 text-emerald-700" : "bg-amber-50 text-amber-700"}`}>
                            {status}
                          </span>
                        </div>
                      </div>

                      <div className="grid gap-2 text-sm text-slate-600">
                        <p>
                          <span className="font-semibold text-slate-900">Access:</span> {formatAccessSummary(member)}
                        </p>
                        <p>
                          <span className="font-semibold text-slate-900">Locations:</span> {locations.map((location) => location.name).join(", ") || "None assigned"}
                        </p>
                        <Link href={`/team/${member.id}`} className="text-sm font-semibold text-indigo-600">
                          Open user details
                        </Link>
                      </div>
                    </div>

                    <div className="mt-5 flex flex-wrap gap-2">
                      {permissions.map((permission) => (
                        <span key={permission} className="rounded-full border border-slate-200 bg-slate-50 px-3 py-2 text-xs font-semibold uppercase tracking-[0.14em] text-slate-600">
                          {permission}
                        </span>
                      ))}
                    </div>
                  </div>
                );
              })}
            </div>
          </section>

          <aside className="space-y-6">
            <section id="permission-defaults" className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
              <h3 className="text-xl font-semibold text-slate-950">Permission Defaults</h3>
              <div className="mt-6 space-y-4">
                <Field label="Agency Admin" value="Full access to billing, automations, all locations, team management" multiline />
                <Field label="Location Manager" value="Scoped to assigned locations, can reply to reviews and send requests" multiline />
                <Field label="Analyst" value="Read-only dashboard and export permissions" multiline />
              </div>
            </section>

            <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
              <h3 className="text-xl font-semibold text-slate-950">Access Health</h3>
              <div className="mt-6 space-y-4">
                <OutcomeCard title="Least-privilege roles applied" count="Yes" tone="positive" />
                <OutcomeCard title="Pending invites" count={String(stats.invitedUsers)} tone="warning" />
                <OutcomeCard title="Locations with managers" count={String(stats.scopedLocations)} tone="neutral" />
              </div>
            </section>
          </aside>
        </div>
      </div>
    </AppShell>
  );
}
