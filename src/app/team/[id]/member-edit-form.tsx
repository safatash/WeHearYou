"use client";

import { useState, useActionState } from "react";
import { MembershipRole } from "@prisma/client";
import { updateMemberRole, type UpdateMemberRoleState } from "@/app/team/actions";

// ── Types ─────────────────────────────────────────────────────────────────────

type Location = {
  id: string;
  name: string;
  city: string;
  state: string;
};

type Props = {
  membershipId:    string;
  currentRole:     MembershipRole;
  locationAccess:  string[]; // currently assigned location IDs
  allLocations:    Location[];
  currentUserRole: MembershipRole;
  isOwner:         boolean; // true if the target member is an OWNER
};

// ── Role options visible to editors ──────────────────────────────────────────

const ROLE_LEVEL: Record<MembershipRole, number> = {
  OWNER: 5, ADMIN: 4, MANAGER: 3, ANALYST: 2, SUPPORT: 1,
};

const ROLE_META: Partial<Record<MembershipRole, { label: string; desc: string }>> = {
  ADMIN:   { label: "Agency Admin",      desc: "Full workspace access — all locations and settings" },
  MANAGER: { label: "Location Manager",  desc: "Manage assigned locations — reviews, requests, contacts" },
  ANALYST: { label: "Analyst",           desc: "Read-only dashboards and exports" },
  SUPPORT: { label: "Support",           desc: "Support-level access for operations" },
};

// Roles that need an explicit location selection
const LOCATION_SCOPED: MembershipRole[] = ["MANAGER", "SUPPORT"];

// ── Component ─────────────────────────────────────────────────────────────────

export function MemberEditForm({
  membershipId,
  currentRole,
  locationAccess,
  allLocations,
  currentUserRole,
  isOwner,
}: Props) {
  const [selectedRole, setSelectedRole] = useState<MembershipRole>(currentRole);
  const [state, formAction, pending] = useActionState<UpdateMemberRoleState, FormData>(
    updateMemberRole,
    {},
  );

  // Roles the current editor can assign (not higher than their own)
  const editableRoles = (Object.keys(ROLE_META) as MembershipRole[]).filter(
    (r) => ROLE_LEVEL[r] < ROLE_LEVEL[currentUserRole] || currentUserRole === "OWNER",
  );

  const needsLocations = LOCATION_SCOPED.includes(selectedRole);

  if (isOwner) {
    return (
      <div className="rounded-2xl border border-slate-200 bg-slate-50 px-5 py-4 text-sm text-slate-500">
        Owner role cannot be changed from this page.
      </div>
    );
  }

  return (
    <form action={formAction} className="space-y-6">
      <input type="hidden" name="membershipId" value={membershipId} />

      {/* Role selector */}
      <div className="grid gap-3">
        {editableRoles.map((role) => {
          const meta   = ROLE_META[role]!;
          const active = selectedRole === role;
          return (
            <label
              key={role}
              className={`flex cursor-pointer items-start gap-4 rounded-2xl border px-4 py-4 transition ${
                active
                  ? "border-indigo-200 bg-indigo-50"
                  : "border-slate-200 bg-white hover:border-slate-300 hover:bg-slate-50"
              }`}
            >
              <input
                type="radio"
                name="role"
                value={role}
                checked={active}
                onChange={() => setSelectedRole(role)}
                className="mt-0.5 h-4 w-4 accent-indigo-600"
              />
              <div>
                <p className={`font-semibold ${active ? "text-indigo-700" : "text-slate-900"}`}>
                  {meta.label}
                </p>
                <p className="mt-0.5 text-sm text-slate-500">{meta.desc}</p>
              </div>
            </label>
          );
        })}
      </div>

      {/* Location picker — only shown when role needs scoped locations */}
      {allLocations.length > 0 && (
        <div className={needsLocations ? "" : "opacity-40 pointer-events-none"}>
          <p className="mb-3 text-sm font-semibold text-slate-700">
            Assigned locations
            {!needsLocations && (
              <span className="ml-2 font-normal text-slate-400">
                (not applicable for this role)
              </span>
            )}
          </p>
          <div className="grid gap-3 md:grid-cols-2">
            {allLocations.map((loc) => (
              <label
                key={loc.id}
                className="flex items-start gap-3 rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-700"
              >
                <input
                  type="checkbox"
                  name="locationIds"
                  value={loc.id}
                  defaultChecked={locationAccess.includes(loc.id)}
                  className="mt-1 h-4 w-4"
                  disabled={!needsLocations}
                />
                <div>
                  <p className="font-semibold text-slate-900">{loc.name}</p>
                  <p className="mt-0.5 text-xs text-slate-500">{loc.city}, {loc.state}</p>
                </div>
              </label>
            ))}
          </div>
        </div>
      )}

      {state.error && (
        <div className="rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
          {state.error}
        </div>
      )}

      <div className="flex justify-end">
        <button
          type="submit"
          disabled={pending}
          className="rounded-2xl bg-slate-950 px-5 py-3 text-sm font-semibold text-white shadow-sm hover:bg-slate-800 disabled:opacity-60 transition"
        >
          {pending ? "Saving…" : "Save Role Changes"}
        </button>
      </div>
    </form>
  );
}
