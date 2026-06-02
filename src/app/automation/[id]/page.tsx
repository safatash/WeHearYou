export const dynamic = "force-dynamic";

import { notFound } from "next/navigation";
import Link from "next/link";
import { AppShell } from "@/components/app-shell";
import { prisma } from "@/lib/prisma";
import { getCurrentMembership } from "@/lib/authz";
import { getCurrentAccessibleLocationIds } from "@/lib/current-scope";
import { formatStepType, formatTriggerType } from "@/lib/automation";
import { updateAutomation } from "@/app/automation/actions";
import { AddStepForm, DeleteStepButton, DeleteAutomationButton, EnrollContactForm } from "@/app/automation/automation-client";

export default async function AutomationDetailPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ flash?: string }>;
}) {
  const { id } = await params;
  const query = await searchParams;
  const membership = await getCurrentMembership();
  if (!membership) notFound();

  const automation = await prisma.automation.findFirst({
    where: { id, organizationId: membership.organizationId },
    include: { steps: { orderBy: { orderIndex: "asc" } } },
  });

  if (!automation) notFound();

  const flash = query.flash;
  const flashMessage =
    flash === "saved" ? "Automation saved." :
    flash === "step-added" ? "Step added." :
    flash === "step-deleted" ? "Step deleted." :
    flash === "enrolled" ? "Contact enrolled successfully." :
    null;

  // Load contacts for manual enrollment
  let enrollContacts: Array<{ id: string; name: string; email: string | null; phone: string | null }> = [];
  if (automation.triggerType === "MANUAL_ENROLLMENT") {
    const locationIds = await getCurrentAccessibleLocationIds();
    enrollContacts = await prisma.contact.findMany({
      where: locationIds.length > 0 ? { locationId: { in: locationIds } } : {},
      select: { id: true, name: true, email: true, phone: true },
      orderBy: { name: "asc" },
      take: 200,
    });
  }

  return (
    <AppShell activeScreen="automation" flash={flashMessage ? { tone: "success", message: flashMessage } : null}>
      <div className="space-y-6">
        <div className="flex items-start justify-between gap-4">
          <div>
            <Link href="/automation" className="text-sm text-indigo-600 hover:underline">← All Automations</Link>
            <h2 className="mt-2 text-3xl font-semibold tracking-tight text-slate-950">{automation.name}</h2>
            <p className="mt-1 text-sm text-slate-500">Trigger: {formatTriggerType(automation.triggerType)}</p>
          </div>
          <span className={`mt-2 rounded-full px-3 py-1 text-xs font-semibold uppercase tracking-[0.18em] ${automation.isActive ? "bg-emerald-50 text-emerald-700" : "bg-slate-100 text-slate-600"}`}>
            {automation.isActive ? "Active" : "Paused"}
          </span>
        </div>

        <div className="grid gap-6 xl:grid-cols-[1fr_380px]">
          <div className="space-y-6">
            <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
              <p className="text-sm font-semibold uppercase tracking-[0.22em] text-indigo-600">Workflow Steps</p>
              <h3 className="mt-2 text-xl font-semibold text-slate-950">
                {automation.steps.length === 0 ? "No steps yet" : `${automation.steps.length} step${automation.steps.length === 1 ? "" : "s"}`}
              </h3>

              {automation.steps.length === 0 ? (
                <p className="mt-4 text-sm text-slate-500">Add your first step using the form below.</p>
              ) : (
                <div className="mt-6 flex flex-col items-center gap-2">
                  <div className="w-full max-w-lg rounded-2xl border border-indigo-100 bg-indigo-50 px-5 py-3 text-center text-sm font-semibold text-indigo-700">
                    ⚡ Trigger: {formatTriggerType(automation.triggerType)}
                  </div>
                  <div className="h-6 w-px bg-slate-300" />
                  {automation.steps.map((step, index) => {
                    const config =
                      step.configJson && typeof step.configJson === "object" && !Array.isArray(step.configJson)
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
                              <DeleteStepButton stepId={step.id} automationId={automation.id} />
                            </div>
                          </div>
                        </div>
                        {index < automation.steps.length - 1 && (
                          <div className="flex h-8 flex-col items-center justify-center">
                            <div className="h-5 w-px bg-slate-300" />
                            <div className="text-xs text-slate-400">↓</div>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </section>

            <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
              <p className="text-sm font-semibold uppercase tracking-[0.22em] text-indigo-600">Add Step</p>
              <h3 className="mt-2 text-xl font-semibold text-slate-950">New step</h3>
              <AddStepForm automationId={automation.id} />
            </section>

            {automation.triggerType === "MANUAL_ENROLLMENT" && (
              <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
                <p className="text-sm font-semibold uppercase tracking-[0.22em] text-indigo-600">Manual Enrollment</p>
                <h3 className="mt-2 text-xl font-semibold text-slate-950">Enroll a contact</h3>
                <p className="mt-2 text-sm text-slate-500">
                  Run this automation immediately for a specific contact.
                </p>
                <EnrollContactForm automationId={automation.id} contacts={enrollContacts} />
              </section>
            )}
          </div>

          <aside className="space-y-6">
            <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
              <p className="text-sm font-semibold uppercase tracking-[0.22em] text-indigo-600">Settings</p>
              <h3 className="mt-2 text-xl font-semibold text-slate-950">Edit automation</h3>
              <form action={updateAutomation} className="mt-5 space-y-4">
                <input type="hidden" name="automationId" value={automation.id} />
                <div>
                  <label className="mb-2 block text-sm font-semibold text-slate-700">Name</label>
                  <input name="name" type="text" required defaultValue={automation.name}
                    className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-900 focus:border-indigo-400 focus:outline-none focus:ring-2 focus:ring-indigo-100" />
                </div>
                <div>
                  <label className="mb-2 block text-sm font-semibold text-slate-700">Trigger</label>
                  <select name="triggerType" required defaultValue={automation.triggerType}
                    className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-900 focus:border-indigo-400 focus:outline-none focus:ring-2 focus:ring-indigo-100">
                    <option value="APPOINTMENT_COMPLETED">Appointment Completed</option>
                    <option value="PROJECT_COMPLETED">Project Completed</option>
                    <option value="WEBHOOK_EVENT">Webhook Event</option>
                    <option value="MANUAL_ENROLLMENT">Manual Enrollment</option>
                  </select>
                </div>
                <div>
                  <label className="mb-2 block text-sm font-semibold text-slate-700">Status</label>
                  <select name="isActive" defaultValue={automation.isActive ? "true" : "false"}
                    className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-900 focus:border-indigo-400 focus:outline-none focus:ring-2 focus:ring-indigo-100">
                    <option value="true">Active</option>
                    <option value="false">Paused</option>
                  </select>
                </div>
                <button type="submit"
                  className="w-full rounded-2xl bg-slate-950 px-5 py-3 text-sm font-semibold text-white shadow-sm hover:bg-slate-800 transition">
                  Save Changes
                </button>
              </form>
            </div>

            <div className="rounded-3xl border border-red-100 bg-white p-6 shadow-sm">
              <p className="text-sm font-semibold uppercase tracking-[0.22em] text-red-500">Danger Zone</p>
              <h3 className="mt-2 text-xl font-semibold text-slate-950">Delete automation</h3>
              <p className="mt-2 text-sm text-slate-500">Permanently deletes this automation and all its steps.</p>
              <div className="mt-4">
                <DeleteAutomationButton automationId={automation.id} />
              </div>
            </div>
          </aside>
        </div>
      </div>
    </AppShell>
  );
}
