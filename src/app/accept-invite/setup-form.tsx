"use client";

import { useActionState } from "react";
import { acceptInvite, type AcceptInviteState } from "@/app/team/actions";

const initialState: AcceptInviteState = {};

export function AcceptInviteForm({ inviteToken }: { inviteToken: string }) {
  const [state, formAction, pending] = useActionState(acceptInvite, initialState);

  return (
    <form action={formAction} className="space-y-5">
      <input type="hidden" name="inviteToken" value={inviteToken} />

      <label className="grid gap-2 text-sm font-semibold text-slate-700">
        Password
        <input
          name="password"
          type="password"
          required
          minLength={8}
          autoComplete="new-password"
          className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm font-normal text-slate-700"
        />
      </label>

      <label className="grid gap-2 text-sm font-semibold text-slate-700">
        Confirm password
        <input
          name="confirmPassword"
          type="password"
          required
          minLength={8}
          autoComplete="new-password"
          className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm font-normal text-slate-700"
        />
      </label>

      {state.error ? (
        <div className="rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">{state.error}</div>
      ) : null}

      <button
        type="submit"
        disabled={pending}
        className="w-full rounded-2xl bg-slate-950 px-5 py-3 text-sm font-semibold text-white shadow-sm disabled:opacity-60"
      >
        {pending ? "Finishing setup..." : "Complete setup"}
      </button>
    </form>
  );
}

export function AcceptExistingInviteForm({ inviteToken, email }: { inviteToken: string; email: string | null }) {
  const [state, formAction, pending] = useActionState(acceptInvite, initialState);

  return (
    <form action={formAction} className="space-y-5">
      <input type="hidden" name="inviteToken" value={inviteToken} />

      <p className="text-sm leading-6 text-slate-600">
        You already have a WeHearYou account{email ? <> (<span className="font-semibold text-slate-900">{email}</span>)</> : null}. Accepting adds this
        access to your existing account — no new password needed. Sign in with your current password.
      </p>

      {state.error ? (
        <div className="rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">{state.error}</div>
      ) : null}

      <button
        type="submit"
        disabled={pending}
        className="w-full rounded-2xl bg-slate-950 px-5 py-3 text-sm font-semibold text-white shadow-sm disabled:opacity-60"
      >
        {pending ? "Accepting..." : "Accept invitation"}
      </button>
    </form>
  );
}
