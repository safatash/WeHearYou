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

        {automations.length > 0 ? (
          <div className="space-y-3">
            {automations.map((automation: typeof automations[0]) => (
              <a
                key={automation.id}
                href={`/automation/${automation.id}`}
                className="flex items-center justify-between gap-4 rounded-3xl border border-slate-200 bg-white p-5 shadow-sm hover:border-indigo-200 hover:bg-indigo-50 transition"
              >
                <div>
                  <p className="font-semibold text-slate-900">{automation.name}</p>
                  <p className="mt-1 text-sm text-slate-500">Trigger: {formatTriggerType(automation.triggerType)} · {automation.steps.length} step{automation.steps.length === 1 ? "" : "s"}</p>
                </div>
                <span className={`shrink-0 rounded-full px-3 py-1 text-xs font-semibold uppercase tracking-[0.18em] ${automation.isActive ? "bg-emerald-100 text-emerald-700" : "bg-slate-100 text-slate-600"}`}>
                  {automation.isActive ? "Active" : "Paused"}
                </span>
              </a>
            ))}
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
