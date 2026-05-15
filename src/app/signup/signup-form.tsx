"use client";

import { useActionState } from "react";
import { signUp, type SignUpState } from "@/app/signup/actions";

const initialState: SignUpState = {};

export function SignUpForm() {
  const [state, formAction, pending] = useActionState(signUp, initialState);

  return (
    <form action={formAction} className="space-y-5">
      <label className="grid gap-2 text-sm font-semibold text-slate-700">
        Full name
        <input
          name="name"
          type="text"
          required
          autoComplete="name"
          className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm font-normal text-slate-700"
        />
      </label>
      <label className="grid gap-2 text-sm font-semibold text-slate-700">
        Work email
        <input
          name="email"
          type="email"
          required
          autoComplete="email"
          className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm font-normal text-slate-700"
        />
      </label>
      <label className="grid gap-2 text-sm font-semibold text-slate-700">
        Organization name
        <input
          name="organizationName"
          type="text"
          required
          autoComplete="organization"
          className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm font-normal text-slate-700"
        />
      </label>
      <label className="grid gap-2 text-sm font-semibold text-slate-700">
        Website <span className="font-normal text-slate-400">optional</span>
        <input
          name="website"
          type="url"
          placeholder="https://example.com"
          autoComplete="url"
          className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm font-normal text-slate-700"
        />
      </label>
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
        {pending ? "Creating account..." : "Create account"}
      </button>
    </form>
  );
}
