import { createLocationForOnboarding } from "@/app/onboarding/actions";
import { FormSubmitButton } from "@/components/form-submit-button";

export default async function OnboardingLocationPage({
  searchParams,
}: {
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
}) {
  const params = (await searchParams) ?? {};
  const error = typeof params.error === "string" ? params.error : undefined;

  return (
    <div className="rounded-3xl border border-slate-200 bg-white p-8 shadow-[0_12px_32px_rgba(15,23,42,0.06)]">
      <p className="text-[11px] font-bold uppercase tracking-[0.16em] text-indigo-600 mb-2">Step 1 of 3</p>
      <h2 className="text-[22px] font-bold tracking-tight text-slate-950 mb-1">Add your first location</h2>
      <p className="text-sm text-slate-500 mb-7 leading-relaxed">
        Each location gets its own review funnel, contacts, and Google connection.
      </p>

      {error && (
        <div className="mb-5 rounded-2xl bg-rose-50 border border-rose-200 px-4 py-3 text-sm text-rose-700">
          {error}
        </div>
      )}

      <form action={createLocationForOnboarding} className="space-y-4">
        <div>
          <label className="block text-[13px] font-semibold text-slate-700 mb-1.5">
            Location name
          </label>
          <input
            name="name"
            required
            placeholder="e.g. Downtown Clinic"
            className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-2.5 text-sm text-slate-900 placeholder:text-slate-400 focus:border-indigo-400 focus:outline-none focus:ring-2 focus:ring-indigo-100"
          />
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-[13px] font-semibold text-slate-700 mb-1.5">City</label>
            <input
              name="city"
              required
              placeholder="Austin"
              className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-2.5 text-sm text-slate-900 placeholder:text-slate-400 focus:border-indigo-400 focus:outline-none focus:ring-2 focus:ring-indigo-100"
            />
          </div>
          <div>
            <label className="block text-[13px] font-semibold text-slate-700 mb-1.5">State</label>
            <input
              name="state"
              required
              placeholder="TX"
              className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-2.5 text-sm text-slate-900 placeholder:text-slate-400 focus:border-indigo-400 focus:outline-none focus:ring-2 focus:ring-indigo-100"
            />
          </div>
        </div>

        <div>
          <label className="block text-[13px] font-semibold text-slate-700 mb-1.5">
            Address <span className="font-normal text-slate-400">(optional)</span>
          </label>
          <input
            name="addressLine1"
            placeholder="123 Main St"
            className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-2.5 text-sm text-slate-900 placeholder:text-slate-400 focus:border-indigo-400 focus:outline-none focus:ring-2 focus:ring-indigo-100"
          />
        </div>

        <div className="flex items-center justify-end pt-2">
          <FormSubmitButton
            idleLabel="Continue →"
            pendingLabel="Saving..."
            className="rounded-2xl bg-slate-950 px-6 py-2.5 text-sm font-semibold text-white hover:bg-slate-800 disabled:opacity-50"
          />
        </div>
      </form>
    </div>
  );
}
