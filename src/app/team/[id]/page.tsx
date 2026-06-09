export const dynamic = "force-dynamic";

import Link from "next/link";
import { notFound } from "next/navigation";
import { AppShell } from "@/components/app-shell";
import { CopyButton } from "@/components/copy-button";
import { resetInvite, deactivateMember, reactivateMember, transferOwnership } from "@/app/team/actions";
import { OwnershipTransferForm } from "./ownership-transfer-form";
import { Field, OutcomeCard, StatCard } from "@/components/ui";
import {
  formatAccessSummary,
  formatMembershipRole,
  formatMembershipStatus,
  getAssignedLocations,
  getPermissionList,
  getTeamMemberById,
} from "@/lib/team";
import { requireTeamAccessPage } from "@/lib/page-guards";
import { MemberEditForm } from "./member-edit-form";

export default async function TeamMemberDetailPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
}) {
  const currentMembership = await requireTeamAccessPage();
  const { id } = await params;
  const query = await searchParams;
  const flash = typeof query?.flash === "string" ? query.flash : null;
  const tone  =
    typeof query?.tone === "string" && ["success", "error", "info"].includes(query.tone)
      ? (query.tone as "success" | "error" | "info")
      : "success";

  const member = await getTeamMemberById(id, currentMembership.organizationId);
  if (!member) notFound();

  const locations   = getAssignedLocations(member);
  const permissions = getPermissionList(member);
  const role        = formatMembershipRole(member.role);
  const status      = formatMembershipStatus(member.status);
  const isOwner     = member.role === "OWNER";
  const isPending   = member.status === "INVITED";
  const isDisabled  = member.status === "DISABLED";

  const appUrl    = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";
  const inviteUrl = member.inviteToken ? `${appUrl}/accept-invite?token=${member.inviteToken}` : null;

  const allLocations = member.organization.locations.map((l) => ({
    id: l.id, name: l.name, city: l.city, state: l.state,
  }));
  const currentLocationIds = member.locationAccess.map((la) => la.locationId);

  return (
    <AppShell activeScreen="team" flash={flash ? { message: flash, tone } : null}>
      <div className="space-y-6">

        {/* Header */}
        <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <Link href="/team" className="text-sm font-semibold text-indigo-600">← Back to team</Link>
            <p className="mt-4 text-sm font-semibold uppercase tracking-[0.22em] text-indigo-600">User Detail</p>
            <h2 className="mt-2 text-4xl font-semibold tracking-tight text-slate-950">{member.user.name}</h2>
            <p className="mt-3 max-w-3xl text-slate-600">{member.user.email}</p>
          </div>
          {isPending && (
            <form action={resetInvite.bind(null, member.id)}>
              <button className="rounded-2xl border border-slate-200 bg-white px-5 py-3 text-sm font-semibold text-slate-700 shadow-sm hover:border-slate-300">
                Reset Invite
              </button>
            </form>
          )}
        </div>

        {/* Stats */}
        <div className="grid gap-4 xl:grid-cols-3">
          <StatCard title="Current Role"    value={role}                         meta={`Status: ${status}`} />
          <StatCard title="Access Scope"    value={formatAccessSummary(member)}  meta={`Locations: ${locations.length}`} />
          <StatCard title="Permission Count" value={String(permissions.length)}  meta="Determined by role" />
        </div>

        {/* Invite link for pending members */}
        {isPending && inviteUrl && (
          <section className="rounded-3xl border border-indigo-200 bg-indigo-50 p-6 shadow-sm">
            <p className="text-sm font-semibold uppercase tracking-[0.22em] text-indigo-700">Pending invite</p>
            <p className="mt-2 text-sm text-slate-700">
              This user hasn't accepted their invite yet. Share the link below or reset it to generate a new one.
            </p>
            <div className="mt-4 flex flex-col gap-3 sm:flex-row sm:items-center">
              <div className="flex-1 rounded-2xl border border-indigo-200 bg-white px-4 py-3 text-sm font-medium text-slate-900 break-all">
                {inviteUrl}
              </div>
              <CopyButton value={inviteUrl} label="Copy link" copiedLabel="Copied!" />
            </div>
          </section>
        )}

        {/* Profile + Access Health */}
        <div className="grid gap-6 xl:grid-cols-[1.05fr_0.95fr]">
          <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
            <h3 className="text-xl font-semibold text-slate-950">Profile</h3>
            <div className="mt-6 grid gap-4 md:grid-cols-2">
              <Field label="Full Name" value={member.user.name} />
              <Field label="Email"     value={member.user.email} />
              <Field label="Role"      value={role} />
              <Field label="Status"    value={status} />
            </div>
            <div className="mt-6">
              <p className="mb-3 text-sm font-semibold text-slate-700">Assigned Locations</p>
              <div className="flex flex-wrap gap-2">
                {locations.length === 0
                  ? <p className="text-sm text-slate-400">None assigned</p>
                  : locations.map((loc) => (
                    <Link
                      key={loc.id}
                      href={`/locations/${loc.id}`}
                      className="rounded-full border border-slate-200 bg-slate-50 px-3 py-2 text-xs font-semibold uppercase tracking-[0.14em] text-slate-600 hover:border-slate-300 hover:text-slate-900"
                    >
                      {loc.name}
                    </Link>
                  ))}
              </div>
            </div>
          </section>

          <aside className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
            <h3 className="text-xl font-semibold text-slate-950">Access Health</h3>
            <div className="mt-6 space-y-4">
              <OutcomeCard
                title="Account status"
                count={status}
                tone={status === "Active" ? "positive" : status === "Invited" ? "warning" : "neutral"}
              />
              <OutcomeCard title="Access scope"    count={formatAccessSummary(member)} tone="neutral" />
              <OutcomeCard
                title="Location coverage"
                count={isOwner ? "All locations (owner)" : locations.length > 1 ? "Multi-site" : locations.length === 1 ? "Single-site" : "No sites"}
                tone="neutral"
              />
            </div>
          </aside>
        </div>

        {/* Role Editor + Location picker */}
        {!isDisabled && (
          <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
            <h3 className="text-xl font-semibold text-slate-950">Role & Access</h3>
            <p className="mt-2 mb-6 text-sm text-slate-500">
              Change this member's role and location assignments. Changes take effect immediately.
            </p>
            <MemberEditForm
              membershipId={member.id}
              currentRole={member.role}
              locationAccess={currentLocationIds}
              allLocations={allLocations}
              currentUserRole={currentMembership.role}
              isOwner={isOwner}
            />
          </section>
        )}

        {/* Read-only Permission Matrix */}
        <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
          <h3 className="text-xl font-semibold text-slate-950">Permissions</h3>
          <p className="mt-2 mb-5 text-sm text-slate-400">
            Permissions are determined by the member's role and cannot be set individually.
          </p>
          <div className="grid gap-3 sm:grid-cols-2 md:grid-cols-3">
            {[
              "Manage billing", "Edit automations", "Invite team", "View all reviews",
              "Reply to reviews", "Send requests", "View location reports", "Manage contacts",
              "Export reports", "Monitor review trends", "View launch checklist", "View dashboards",
            ].map((permission) => {
              const enabled = permissions.includes(permission);
              return (
                <div
                  key={permission}
                  className={`rounded-2xl border px-4 py-3 flex items-center gap-3 ${
                    enabled ? "border-emerald-200 bg-emerald-50" : "border-slate-100 bg-slate-50"
                  }`}
                >
                  <span className={`text-sm ${enabled ? "text-emerald-600" : "text-slate-300"}`}>
                    {enabled ? "✓" : "✕"}
                  </span>
                  <p className={`text-sm font-medium ${enabled ? "text-emerald-800" : "text-slate-400"}`}>
                    {permission}
                  </p>
                </div>
              );
            })}
          </div>
        </section>

        {/* Ownership Transfer — only visible to the current owner, for non-owner active members */}
        {currentMembership.role === "OWNER" && !isOwner && member.status === "ACTIVE" && (
          <section className="rounded-3xl border border-amber-200 bg-white p-6 shadow-sm">
            <p className="text-sm font-semibold uppercase tracking-[0.22em] text-amber-600">Transfer Ownership</p>
            <h3 className="mt-2 text-xl font-semibold text-slate-950">Transfer workspace ownership</h3>
            <p className="mt-2 mb-6 text-sm text-slate-500">
              Transfer full ownership of this workspace to <strong>{member.user.name}</strong>.
              This action is permanent and will immediately change both roles.
            </p>
            <OwnershipTransferForm
              membershipId={member.id}
              targetName={member.user.name}
              transferAction={transferOwnership}
            />
          </section>
        )}

        {/* Danger Zone */}
        <section className="rounded-3xl border border-red-100 bg-white p-6 shadow-sm">
          <p className="text-sm font-semibold uppercase tracking-[0.22em] text-red-500">Danger Zone</p>
          <h3 className="mt-2 text-xl font-semibold text-slate-950">
            {isDisabled ? "Reactivate member" : "Deactivate member"}
          </h3>
          <p className="mt-2 text-sm text-slate-500">
            {isDisabled
              ? "Reactivating will restore workspace access with their previous role and permissions."
              : "Deactivating will immediately revoke workspace access. The user cannot sign in while deactivated."}
          </p>
          {isOwner && !isDisabled && (
            <p className="mt-3 text-sm text-amber-700 font-medium">
              ⚠ Owner accounts require a second active owner before they can be deactivated.
            </p>
          )}
          <div className="mt-4">
            {isDisabled ? (
              <form action={reactivateMember.bind(null, member.id)}>
                <button
                  type="submit"
                  className="rounded-2xl border border-emerald-200 bg-emerald-50 px-5 py-3 text-sm font-semibold text-emerald-700 shadow-sm hover:border-emerald-300"
                >
                  Reactivate member
                </button>
              </form>
            ) : (
              <form action={deactivateMember.bind(null, member.id)}>
                <button
                  type="submit"
                  className="rounded-2xl border border-red-200 bg-red-50 px-5 py-3 text-sm font-semibold text-red-700 shadow-sm hover:border-red-300"
                >
                  Deactivate member
                </button>
              </form>
            )}
          </div>
        </section>

      </div>
    </AppShell>
  );
}
