"use client";

import { useActionState } from "react";
import { inviteTeamMember, type InviteTeamMemberState } from "@/app/team/actions";

const initialState: InviteTeamMemberState = {};

export function InviteUserForm({
  locations,
}: {
  locations: Array<{ id: string; name: string; city: string; state: string }>;
}) {
  const [state, formAction, pending] = useActionState(inviteTeamMember, initialState);

  return (
    <form action={formAction} className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h3 className="text-xl font-semibold text-slate-950">Invite user</h3>
          <p className="mt-2 text-sm leading-6 text-slate-600">
            Create an invited team member and assign their role and location scope before they set their password.
          </p>
        </div>
      </div>

      <div className="mt-6 grid gap-4 md:grid-cols-2">
        <label className="grid gap-2 text-sm font-semibold text-slate-700">
          Full name
          <input name="name" required className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm font-normal text-slate-700" />
        </label>
        <label className="grid gap-2 text-sm font-semibold text-slate-700">
          Email
          <input name="email" type="email" required className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm font-normal text-slate-700" />
        </label>
        <label className="grid gap-2 text-sm font-semibold text-slate-700 md:col-span-2">
          Role
          <select name="role" defaultValue="MANAGER" className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm font-normal text-slate-700">
            <option value="ADMIN">Agency Admin</option>
            <option value="MANAGER">Location Manager</option>
            <option value="ANALYST">Analyst</option>
            <option value="SUPPORT">Support</option>
          </select>
        </label>
      </div>

      <div className="mt-6">
        <p className="text-sm font-semibold text-slate-700">Assigned locations</p>
        <div className="mt-3 grid gap-3 md:grid-cols-2">
          {locations.map((location) => (
            <label key={location.id} className="flex items-start gap-3 rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-700">
              <input type="checkbox" name="locationIds" value={location.id} className="mt-1 h-4 w-4" />
              <div>
                <p className="font-semibold text-slate-900">{location.name}</p>
                <p className="mt-1 text-xs text-slate-500">{location.city}, {location.state}</p>
              </div>
            </label>
          ))}
        </div>
      </div>

      {state.error ? (
        <div className="mt-4 rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">{state.error}</div>
      ) : null}

      <div className="mt-6 flex justify-end">
        <button type="submit" disabled={pending} className="rounded-2xl bg-slate-950 px-5 py-3 text-sm font-semibold !text-white shadow-sm disabled:opacity-60">
          {pending ? "Creating invite..." : "Create invite"}
        </button>
      </div>
    </form>
  );
}
