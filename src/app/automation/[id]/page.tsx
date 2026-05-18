export const dynamic = "force-dynamic";

import { notFound } from "next/navigation";
import { AppShell } from "@/components/app-shell";
import { prisma } from "@/lib/prisma";
import { getCurrentMembership } from "@/lib/authz";
import { formatStepType, formatTriggerType } from "@/lib/automation";
import { updateAutomation, deleteAutomation, addStep, deleteStep } from "@/app/automation/actions";

function StepConfig({ stepType }: { stepType: string }) {
  if (stepType === "DELAY") {
    return (
      <div>
        <label className="mb-2 block text-sm font-semibold text-slate-700">Delay (hours)</label>
        <input
          name="delayHours"
          type="number"
          min="0"
          step="0.5"
          placeholder="e.g. 24"
          className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-900 placeholder-slate-400 focus:border-indigo-400 focus:outline-none focus:ring-2 focus:ring-indigo-100"
        />
      </div>
    );
  }

  if (stepType === "SEND_REQUEST") {
    return (
      <div className="space-y-3">
        <div>
          <label className="mb-2 block text-sm font-semibold text-slate-700">Channel</label>
          <select
            name="channel"
            className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-900 focus:border-indigo-400 focus:outline-none focus:ring-2 focus:ring-indigo-100"
          >
            <option value="EMAIL">Email</option>
            <option value="SMS">SMS</option>
          </select>
        </div>
        <div>
          <label className="mb-2 block text-sm font-semibold text-slate-700">Email Subject</label>
          <input
            name="emailSubject"
            type="text"
            placeholder="e.g. How was your experience?"
            className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-900 placeholder-slate-400 focus:border-indigo-400 focus:outline-none focus:ring-2 focus:ring-indigo-100"
          />
        </div>
        <div>
          <label className="mb-2 block text-sm font-semibold text-slate-700">Message Body</label>
          <textarea
            name="messageBody"
            rows={3}
            placeholder="Optional custom message..."
            className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-900 placeholder-slate-400 focus:border-indigo-400 focus:outline-none focus:ring-2 focus:ring-indigo-100"
          />
        </div>
      </div>
    );
  }

  if (stepType === "NOTIFY_TEAM") {
    return (
      <div>
        <label className="mb-2 block text-sm font-semibold text-slate-700">Notify Email</label>
        <input
          name="notifyEmail"
          type="email"
          placeholder="team@example.com"
          className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-900 placeholder-slate-400 focus:border-indigo-400 focus:outline-none focus:ring-2 focus:ring-indigo-100"
        />
      </div>
    );
  }

  if (stepType === "WEBHOOK") {
    return (
      <div>
        <label className="mb-2 block text-sm font-semibold text-slate-700">Webhook URL</label>
        <input
          name="webhookUrl"
          type="url"
          placeholder="https://..."
          className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-900 placeholder-slate-400 focus:border-indigo-400 focus:outline-none focus:ring-2 focus:ring-indigo-100"
        />
      </div>
    );
  }

  return null;
}

export default async function AutomationDetailPage({
  params,
  searchParams,
}: {
  params: { id: string };
  searchParams: { flash?: string };
}) {
  const membership = await getCurrentMembership();
  if (!membership) notFound();

  const automation = await prisma.automation.findFirst({
    where: { id: params.id, organizationId: membership.organizationId },
    include: {
      steps: { orderBy: { orderIndex: "asc" } },
    },
  });

  if (!automation) notFound();

  const flash = searchParams.flash;
  const flashMessage =
    flash === "saved" ? "Automation saved." :
    flash === "step-added" ? "Step added." :
    flash === "step-deleted" ? "Step deleted." :
    null;

  return (
    <AppShell activeScreen="automation" flash={flashMessage ? { tone: "success", message: flashMessage } : null}>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-start justify-between gap-4">
          <div>
            <a href="/automation" className="text-sm text-indigo-600 hover:underline">← All Automations</a>
            <h2 className="mt-2 text-3xl font-semibold tracking-tight text-slate-950">{automation.name}</h2>
            <p className="mt-1 text-sm text-slate-500">Trigger: {formatTriggerType(automation.triggerType)}</p>
          </div>
          <span className={`mt-2 rounded-full px-3 py-1 text-xs font-semibold uppercase tracking-[0.18em] ${automation.isActive ? "bg-emerald-50 text-emerald-700" : "bg-slate-100 text-slate-600"}`}>
            {automation.isActive ? "Active" : "Paused"}
          </span>
        </div>

        <div className="grid gap-6 xl:grid-cols-[1fr_380px]">
          {/* Left: Steps */}
          <div className="space-y-6">
            {/* Step flow */}
            <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
              <p className="text-sm font-semibold uppercase tracking-[0.22em] text-indigo-600">Workflow Steps</p>
              <h3 className="mt-2 text-xl font-semibold text-slate-950">
                {automation.steps.length === 0 ? "No steps yet" : `${automation.steps.length} step${automation.steps.length === 1 ? "" : "s"}`}
              </h3>

              {automation.steps.length === 0 ? (
                <p className="mt-4 text-sm text-slate-500">Add your first step using the form on the right.</p>
              ) : (
                <div className="mt-6 flex flex-col items-center gap-2">
                  {/* Trigger pill */}
                  <div className="w-full max-w-lg rounded-2xl border border-indigo-100 bg-indigo-50 px-5 py-3 text-center text-sm font-semibold text-indigo-700">
                    ⚡ Trigger: {formatTriggerType(automation.triggerType)}
                  </div>
                  <div className="h-6 w-px bg-slate-300" />

                  {automation.steps.map((step: { id: string; stepType: string; title: string; description: string | null; configJson: unknown; orderIndex: number }, index: number) => {
                    const config = (step.configJson && typeof step.configJson === "object" && !Array.isArray(step.configJson))
                      ? Object.entries(step.configJson as Record<string, string>).map(([k, v]) => `${k}: ${v}`).join(" · ")
                      : null;

                    return (
                      <div key={step.id} className="flex w-full flex-col items-center">
                        <div className="w-full max-w-lg rounded-3xl border border-slate-200 bg-white px-5 py-4 shadow-sm">
                          <div className="flex items-start justify-between gap-3">
                            <div className="flex-1">
                              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-400">{formatStepType(step.stepType)}</p>
                              <p className="mt-1 font-semibold text-slate-900">{step.title}</p>
                              {step.description && <p className="mt-1 text-sm text-slate-500">{step.description}</p>}
                              {config && <p className="mt-2 text-xs text-slate-400">{config}</p>}
                            </div>
                            <div className="flex items-center gap-2">
                              <span className="rounded-full bg-slate-100 px-2 py-1 text-xs font-semibold text-slate-500">#{index + 1}</span>
                              <form action={deleteStep}>
                                <input type="hidden" name="stepId" value={step.id} />
                                <input type="hidden" name="automationId" value={automation.id} />
                                <button
                                  type="submit"
                                  className="rounded-xl px-2 py-1 text-xs text-slate-400 hover:bg-red-50 hover:text-red-600 transition"
                                  onClick={(e) => { if (!confirm("Delete this step?")) e.preventDefault(); }}
                                >
                                  ✕
                                </button>
                              </form>
                            </div>
                          </div>
                        </div>
                        {index < automation.steps.length - 1 && (
                          <div className="flex h-8 flex-col items-center justify-center">
                            <div className="h-5 w-px bg-slate-300" />
                            <div className="text-slate-400 text-xs">↓</div>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </section>

            {/* Add Step form */}
            <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
              <p className="text-sm font-semibold uppercase tracking-[0.22em] text-indigo-600">Add Step</p>
              <h3 className="mt-2 text-xl font-semibold text-slate-950">New step</h3>

              <form action={addStep} className="mt-5 space-y-4">
                <input type="hidden" name="automationId" value={automation.id} />

                <div>
                  <label className="mb-2 block text-sm font-semibold text-slate-700">Step Type</label>
                  <select
                    name="stepType"
                    required
                    className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-900 focus:border-indigo-400 focus:outline-none focus:ring-2 focus:ring-indigo-100"
                    onChange={(e) => {
                      const configSections = document.querySelectorAll("[data-step-config]");
                      configSections.forEach((el) => (el as HTMLElement).style.display = "none");
                      const target = document.querySelector(`[data-step-config="${e.target.value}"]`);
                      if (target) (target as HTMLElement).style.display = "block";
                    }}
                  >
                    <option value="">Select step type...</option>
                    <option value="DELAY">Delay</option>
                    <option value="SEND_REQUEST">Send Review Request</option>
                    <option value="TAG_CONTACT">Tag Contact</option>
                    <option value="NOTIFY_TEAM">Notify Team</option>
                    <option value="WEBHOOK">Webhook</option>
                  </select>
                </div>

                <div>
                  <label className="mb-2 block text-sm font-semibold text-slate-700">Step Title</label>
                  <input
                    name="title"
                    type="text"
                    required
                    placeholder="e.g. Wait 24 hours, Send email request..."
                    className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-900 placeholder-slate-400 focus:border-indigo-400 focus:outline-none focus:ring-2 focus:ring-indigo-100"
                  />
                </div>

                <div>
                  <label className="mb-2 block text-sm font-semibold text-slate-700">Description (optional)</label>
                  <input
                    name="description"
                    type="text"
                    placeholder="Brief description of this step..."
                    className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-900 placeholder-slate-400 focus:border-indigo-400 focus:outline-none focus:ring-2 focus:ring-indigo-100"
                  />
                </div>

                {/* Step-type-specific config — shown/hidden via JS but all rendered for SSR */}
                <div data-step-config="DELAY" className="rounded-2xl border border-slate-100 bg-slate-50 p-4">
                  <label className="mb-2 block text-sm font-semibold text-slate-700">Delay (hours)</label>
                  <input
                    name="delayHours"
                    type="number"
                    min="0"
                    step="0.5"
                    placeholder="e.g. 24"
                    className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-900 placeholder-slate-400 focus:border-indigo-400 focus:outline-none focus:ring-2 focus:ring-indigo-100"
                  />
                </div>

                <div data-step-config="SEND_REQUEST" className="rounded-2xl border border-slate-100 bg-slate-50 p-4 space-y-3">
                  <div>
                    <label className="mb-2 block text-sm font-semibold text-slate-700">Channel</label>
                    <select
                      name="channel"
                      className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-900 focus:border-indigo-400 focus:outline-none focus:ring-2 focus:ring-indigo-100"
                    >
                      <option value="EMAIL">Email</option>
                      <option value="SMS">SMS</option>
                    </select>
                  </div>
                  <div>
                    <label className="mb-2 block text-sm font-semibold text-slate-700">Email Subject</label>
                    <input
                      name="emailSubject"
                      type="text"
                      placeholder="e.g. How was your experience?"
                      className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-900 placeholder-slate-400 focus:border-indigo-400 focus:outline-none focus:ring-2 focus:ring-indigo-100"
                    />
                  </div>
                  <div>
                    <label className="mb-2 block text-sm font-semibold text-slate-700">Message Body</label>
                    <textarea
                      name="messageBody"
                      rows={3}
                      placeholder="Optional custom message..."
                      className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-900 placeholder-slate-400 focus:border-indigo-400 focus:outline-none focus:ring-2 focus:ring-indigo-100"
                    />
                  </div>
                </div>

                <div data-step-config="NOTIFY_TEAM" className="rounded-2xl border border-slate-100 bg-slate-50 p-4">
                  <label className="mb-2 block text-sm font-semibold text-slate-700">Notify Email</label>
                  <input
                    name="notifyEmail"
                    type="email"
                    placeholder="team@example.com"
                    className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-900 placeholder-slate-400 focus:border-indigo-400 focus:outline-none focus:ring-2 focus:ring-indigo-100"
                  />
                </div>

                <div data-step-config="WEBHOOK" className="rounded-2xl border border-slate-100 bg-slate-50 p-4">
                  <label className="mb-2 block text-sm font-semibold text-slate-700">Webhook URL</label>
                  <input
                    name="webhookUrl"
                    type="url"
                    placeholder="https://..."
                    className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-900 placeholder-slate-400 focus:border-indigo-400 focus:outline-none focus:ring-2 focus:ring-indigo-100"
                  />
                </div>

                <button
                  type="submit"
                  className="rounded-2xl bg-indigo-600 px-5 py-3 text-sm font-semibold text-white shadow-sm hover:bg-indigo-700 transition"
                >
                  Add Step
                </button>
              </form>
            </section>
          </div>

          {/* Right: Settings */}
          <aside className="space-y-6">
            {/* Edit settings */}
            <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
              <p className="text-sm font-semibold uppercase tracking-[0.22em] text-indigo-600">Settings</p>
              <h3 className="mt-2 text-xl font-semibold text-slate-950">Edit automation</h3>

              <form action={updateAutomation} className="mt-5 space-y-4">
                <input type="hidden" name="automationId" value={automation.id} />

                <div>
                  <label className="mb-2 block text-sm font-semibold text-slate-700">Name</label>
                  <input
                    name="name"
                    type="text"
                    required
                    defaultValue={automation.name}
                    className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-900 focus:border-indigo-400 focus:outline-none focus:ring-2 focus:ring-indigo-100"
                  />
                </div>

                <div>
                  <label className="mb-2 block text-sm font-semibold text-slate-700">Trigger</label>
                  <select
                    name="triggerType"
                    required
                    defaultValue={automation.triggerType}
                    className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-900 focus:border-indigo-400 focus:outline-none focus:ring-2 focus:ring-indigo-100"
                  >
                    <option value="APPOINTMENT_COMPLETED">Appointment Completed</option>
                    <option value="PROJECT_COMPLETED">Project Completed</option>
                    <option value="WEBHOOK_EVENT">Webhook Event</option>
                    <option value="MANUAL_ENROLLMENT">Manual Enrollment</option>
                  </select>
                </div>

                <div>
                  <label className="mb-2 block text-sm font-semibold text-slate-700">Status</label>
                  <select
                    name="isActive"
                    defaultValue={automation.isActive ? "true" : "false"}
                    className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-900 focus:border-indigo-400 focus:outline-none focus:ring-2 focus:ring-indigo-100"
                  >
                    <option value="true">Active</option>
                    <option value="false">Paused</option>
                  </select>
                </div>

                <button
                  type="submit"
                  className="w-full rounded-2xl bg-slate-950 px-5 py-3 text-sm font-semibold text-white shadow-sm hover:bg-slate-800 transition"
                >
                  Save Changes
                </button>
              </form>
            </div>

            {/* Danger zone */}
            <div className="rounded-3xl border border-red-100 bg-white p-6 shadow-sm">
              <p className="text-sm font-semibold uppercase tracking-[0.22em] text-red-500">Danger Zone</p>
              <h3 className="mt-2 text-xl font-semibold text-slate-950">Delete automation</h3>
              <p className="mt-2 text-sm text-slate-500">This will permanently delete the automation and all its steps.</p>
              <form action={deleteAutomation} className="mt-4">
                <input type="hidden" name="automationId" value={automation.id} />
                <button
                  type="submit"
                  className="rounded-2xl border border-red-200 bg-red-50 px-5 py-3 text-sm font-semibold text-red-600 hover:bg-red-100 transition"
                  onClick={(e) => { if (!confirm("Delete this automation and all its steps? This cannot be undone.")) e.preventDefault(); }}
                >
                  Delete Automation
                </button>
              </form>
            </div>
          </aside>
        </div>
      </div>
    </AppShell>
  );
}
