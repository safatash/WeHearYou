import Link from "next/link";
import { AppShell } from "@/components/app-shell";
import { createAutomation } from "@/app/automation/actions";

export default function NewAutomationPage() {
  return (
    <AppShell activeScreen="automation">
      <div className="space-y-6">
        <div>
          <p className="text-sm font-semibold uppercase tracking-[0.22em] text-indigo-600">Automation Builder</p>
          <h2 className="mt-2 text-3xl font-semibold tracking-tight text-slate-950">New Automation</h2>
          <p className="mt-3 max-w-3xl text-slate-600">
            Create a new workflow automation. You can add steps after creating it.
          </p>
        </div>

        <div className="max-w-xl rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
          <form action={createAutomation} className="space-y-5">
            <div>
              <label className="mb-2 block text-sm font-semibold text-slate-700" htmlFor="name">
                Automation Name
              </label>
              <input
                id="name"
                name="name"
                type="text"
                required
                placeholder="e.g. Post-appointment review request"
                className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-900 placeholder-slate-400 focus:border-indigo-400 focus:outline-none focus:ring-2 focus:ring-indigo-100"
              />
            </div>

            <div>
              <label className="mb-2 block text-sm font-semibold text-slate-700" htmlFor="triggerType">
                Trigger
              </label>
              <select
                id="triggerType"
                name="triggerType"
                required
                className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-900 focus:border-indigo-400 focus:outline-none focus:ring-2 focus:ring-indigo-100"
              >
                <option value="">Select a trigger...</option>
                <option value="APPOINTMENT_COMPLETED">Appointment Completed</option>
                <option value="PROJECT_COMPLETED">Project Completed</option>
                <option value="WEBHOOK_EVENT">Webhook Event</option>
                <option value="MANUAL_ENROLLMENT">Manual Enrollment</option>
              </select>
            </div>

            <div className="flex gap-3 pt-2">
              <button
                type="submit"
                className="rounded-2xl bg-slate-950 px-5 py-3 text-sm font-semibold text-white shadow-sm hover:bg-slate-800 transition"
                style={{ color: "white" }}
              >
                Create Automation
              </button>
              <Link
                href="/automation"
                className="rounded-2xl border border-slate-200 bg-white px-5 py-3 text-sm font-semibold text-slate-700 shadow-sm hover:bg-slate-50 transition"
              >
                Cancel
              </Link>
            </div>
          </form>
        </div>
      </div>
    </AppShell>
  );
}
