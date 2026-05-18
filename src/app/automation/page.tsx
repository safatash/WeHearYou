export const dynamic = "force-dynamic";

import { AppShell } from "@/components/app-shell";
import { Field, StatCard } from "@/components/ui";
import { formatConfig, formatStepType, formatTriggerType, getAutomations } from "@/lib/automation";
import { getCurrentMembership } from "@/lib/authz";

export default async function AutomationPage() {
  const membership = await getCurrentMembership();
  const automations = membership ? await getAutomations(membership.organizationId) : [];
  const selectedAutomation = automations[0];
  const selectedNode = selectedAutomation?.steps[0];
  const totalSteps = automations.reduce((sum: number, automation: typeof automations[0]) => sum + automation.steps.length, 0);
  const activeAutomations = automations.filter((automation: typeof automations[0]) => automation.isActive).length;

  return (
    <AppShell activeScreen="automation">
      <div className="space-y-6">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <p className="text-sm font-semibold uppercase tracking-[0.22em] text-indigo-600">Automation Builder</p>
            <h2 className="mt-2 text-3xl font-semibold tracking-tight text-slate-950">Workflow automation</h2>
            <p className="mt-3 max-w-3xl text-slate-600">
              Build and manage automated workflows that trigger review requests and follow-ups.
            </p>
          </div>
          <a
            href="/automation/new"
            className="inline-flex rounded-2xl bg-slate-950 px-5 py-3 text-sm font-semibold text-white shadow-sm hover:bg-slate-800 transition whitespace-nowrap"
            style={{ color: "white" }}
          >
            + New Automation
          </a>
        </div>

        <div className="grid gap-4 xl:grid-cols-3">
          <StatCard title="Automations" value={automations.length} meta="Live workflows stored in Prisma" />
          <StatCard title="Active" value={activeAutomations} meta="Currently enabled and ready to run" />
          <StatCard title="Total Steps" value={totalSteps} meta="Combined actions across all automation records" />
        </div>

        {selectedAutomation && selectedNode ? (
          <div className="grid gap-6 xl:grid-cols-[1.4fr_0.85fr]">
            <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <p className="text-sm font-semibold uppercase tracking-[0.22em] text-indigo-600">Primary workflow</p>
                  <h3 className="mt-2 text-3xl font-semibold tracking-tight text-slate-950">{selectedAutomation.name}</h3>
                  <p className="mt-3 max-w-3xl text-slate-600">
                    This builder reads the real automation record, from inbound trigger to delayed send to downstream follow-up logic.
                  </p>
                </div>
                <span className={`rounded-full px-3 py-1 text-xs font-semibold uppercase tracking-[0.18em] ${selectedAutomation.isActive ? "bg-emerald-50 text-emerald-700" : "bg-slate-100 text-slate-600"}`}>
                  {selectedAutomation.isActive ? "Active" : "Paused"}
                </span>
              </div>

              <div className="mt-4 rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-600">
                Trigger: <span className="font-semibold text-slate-900">{formatTriggerType(selectedAutomation.triggerType)}</span>
              </div>

              <div className="mt-10 flex flex-col items-center gap-5">
                {selectedAutomation.steps.map((node, index) => (
                  <div key={node.id} className="flex w-full flex-col items-center">
                    <div className={`w-full max-w-xl rounded-3xl border px-6 py-5 text-left shadow-sm transition ${index === 0 ? "border-indigo-200 bg-indigo-50" : "border-slate-200 bg-white"}`}>
                      <div className="flex items-start justify-between gap-3">
                        <div>
                          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">{formatStepType(node.stepType)}</p>
                          <h4 className="mt-2 text-xl font-semibold text-slate-950">{node.title}</h4>
                        </div>
                        <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold uppercase tracking-[0.18em] text-slate-600">
                          Step {index + 1}
                        </span>
                      </div>
                      <p className="mt-2 text-sm text-slate-600">{node.description ?? "No description"}</p>
                      <p className="mt-3 text-sm text-slate-500">{formatConfig(node.configJson)}</p>
                    </div>
                    {index < selectedAutomation.steps.length - 1 ? (
                      <div className="flex h-16 flex-col items-center justify-center gap-1">
                        <div className="h-10 w-px bg-slate-300" />
                        <div className="text-slate-400">↓</div>
                      </div>
                    ) : null}
                  </div>
                ))}
              </div>
            </section>

            <aside className="space-y-6">
              <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
                <p className="text-sm font-semibold uppercase tracking-[0.22em] text-indigo-600">Selected step</p>
                <h3 className="mt-2 text-2xl font-semibold text-slate-950">{selectedNode.title}</h3>
                <div className="mt-6 space-y-4">
                  <Field label="Node Type" value={formatStepType(selectedNode.stepType)} />
                  <Field label="Label" value={selectedNode.title} />
                  <Field label="Description" value={selectedNode.description ?? "No description"} multiline />
                  <Field label="Config" value={formatConfig(selectedNode.configJson)} multiline />
                </div>
              </div>

              <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
                <p className="text-sm font-semibold uppercase tracking-[0.22em] text-indigo-600">Webhook MVP</p>
                <h3 className="mt-2 text-2xl font-semibold text-slate-950">Live automation endpoint</h3>
                <div className="mt-6 space-y-4 text-sm text-slate-600">
                  <p>The first execution path is now wired for webhook-triggered enrollment.</p>
                  <Field label="Route" value="POST /api/webhooks/automation" />
                  <Field label="Auth header" value="x-automation-secret: <AUTOMATION_WEBHOOK_SECRET>" />
                  <Field label="Supported events" value="appointment_completed, project_completed" />
                  <Field label="Runner route" value="POST /api/automation/run-pending" />
                  <Field label="Runner auth header" value="x-automation-runner-secret: <AUTOMATION_RUNNER_SECRET>" />
                  <Field
                    label="Payload"
                    value={JSON.stringify(
                      {
                        eventType: "appointment_completed",
                        locationId: "loc_123",
                        contact: {
                          firstName: "Ava",
                          lastName: "Johnson",
                          email: "ava@example.com",
                          phone: "+1 555 123 4567",
                          preferredChannel: "EMAIL",
                        },
                        metadata: {
                          workflowName: "Appointment completed webhook",
                          occurredAt: "2026-04-21T17:45:00.000Z",
                        },
                      },
                      null,
                      2,
                    )}
                    multiline
                  />
                </div>
              </div>

              <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
                <p className="text-sm font-semibold uppercase tracking-[0.22em] text-indigo-600">All workflows</p>
                <div className="mt-4 space-y-3">
                  {automations.map((automation) => (
                    <a key={automation.id} href={`/automation/${automation.id}`} className="block rounded-2xl border border-slate-200 bg-slate-50 p-4 hover:border-indigo-200 hover:bg-indigo-50 transition">
                      <div className="flex items-center justify-between gap-3">
                        <p className="font-semibold text-slate-900">{automation.name}</p>
                        <span className={`rounded-full px-2 py-1 text-[11px] font-semibold uppercase tracking-[0.18em] ${automation.isActive ? "bg-emerald-100 text-emerald-700" : "bg-slate-200 text-slate-600"}`}>
                          {automation.isActive ? "Active" : "Paused"}
                        </span>
                      </div>
                      <p className="mt-1 text-sm text-slate-600">Trigger: {formatTriggerType(automation.triggerType)}</p>
                      <p className="mt-1 text-sm text-slate-600">Steps: {automation.steps.length}</p>
                    </a>
                  ))}
                </div>
              </div>
            </aside>
          </div>
        ) : (
          <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
            <p className="text-sm font-semibold text-slate-900">No automations yet.</p>
            <p className="mt-2 text-sm text-slate-600">
              Create your first automation to start sending automated review requests.
            </p>
            <a
              href="/automation/new"
              className="mt-4 inline-flex rounded-2xl bg-slate-950 px-5 py-3 text-sm font-semibold text-white shadow-sm hover:bg-slate-800 transition"
              style={{ color: "white" }}
            >
              + New Automation
            </a>
          </div>
        )}
      </div>
    </AppShell>
  );
}
