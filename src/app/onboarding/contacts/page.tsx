import Link from "next/link";
import { createContactForOnboarding } from "@/app/onboarding/actions";
import { FormSubmitButton } from "@/components/form-submit-button";

export default async function OnboardingContactsPage({
  searchParams,
}: {
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
}) {
  const params = (await searchParams) ?? {};
  const error = typeof params.error === "string" ? params.error : undefined;

  return (
    <div className="rounded-3xl border border-slate-200 bg-white p-8 shadow-[0_12px_32px_rgba(15,23,42,0.06)]">
      <p className="text-[11px] font-bold uppercase tracking-[0.16em] text-indigo-600 mb-2">Step 3 of 3</p>
      <h2 className="text-[22px] font-bold tracking-tight text-slate-950 mb-1">Add your first contacts</h2>
      <p className="text-sm text-slate-500 mb-7 leading-relaxed">
        Add customers you&apos;d like to reach out to for reviews. Import a CSV or add one manually to get started.
      </p>

      {error && (
        <div className="mb-5 rounded-2xl bg-rose-50 border border-rose-200 px-4 py-3 text-sm text-rose-700">
          {error}
        </div>
      )}

      <div className="grid grid-cols-2 gap-3 mb-6">
        <Link
          href="/contacts/import"
          className="rounded-2xl border-[1.5px] border-indigo-400 bg-indigo-50 p-4 block"
        >
          <p className="text-[13px] font-bold text-indigo-600 mb-1">Import CSV</p>
          <p className="text-xs text-indigo-500">Upload a spreadsheet with names, emails, and phone numbers</p>
        </Link>
        <div className="rounded-2xl border-[1.5px] border-slate-200 bg-slate-50 p-4">
          <p className="text-[13px] font-bold text-slate-800 mb-1">Add manually</p>
          <p className="text-xs text-slate-500">Enter a few contacts below to get started quickly</p>
        </div>
      </div>

      <form action={createContactForOnboarding} className="space-y-4">
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-[13px] font-semibold text-slate-700 mb-1.5">First name</label>
            <input
              name="firstName"
              placeholder="Jane"
              className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-2.5 text-sm text-slate-900 placeholder:text-slate-400 focus:border-indigo-400 focus:outline-none focus:ring-2 focus:ring-indigo-100"
            />
          </div>
          <div>
            <label className="block text-[13px] font-semibold text-slate-700 mb-1.5">Last name</label>
            <input
              name="lastName"
              placeholder="Smith"
              className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-2.5 text-sm text-slate-900 placeholder:text-slate-400 focus:border-indigo-400 focus:outline-none focus:ring-2 focus:ring-indigo-100"
            />
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-[13px] font-semibold text-slate-700 mb-1.5">
              Email <span className="font-normal text-slate-400">(optional)</span>
            </label>
            <input
              name="email"
              type="email"
              placeholder="jane@example.com"
              className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-2.5 text-sm text-slate-900 placeholder:text-slate-400 focus:border-indigo-400 focus:outline-none focus:ring-2 focus:ring-indigo-100"
            />
          </div>
          <div>
            <label className="block text-[13px] font-semibold text-slate-700 mb-1.5">
              Phone <span className="font-normal text-slate-400">(optional)</span>
            </label>
            <input
              name="phone"
              type="tel"
              placeholder="+1 555 000 0000"
              className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-2.5 text-sm text-slate-900 placeholder:text-slate-400 focus:border-indigo-400 focus:outline-none focus:ring-2 focus:ring-indigo-100"
            />
          </div>
        </div>

        <div className="flex items-center justify-end pt-2">
          <FormSubmitButton
            idleLabel="Finish setup →"
            pendingLabel="Saving..."
            className="rounded-2xl bg-slate-950 px-6 py-2.5 text-sm font-semibold text-white hover:bg-slate-800 disabled:opacity-50"
          />
        </div>
      </form>
    </div>
  );
}
