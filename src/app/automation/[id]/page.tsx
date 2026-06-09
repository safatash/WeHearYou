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
import { RunsTab, QueueTab, type ObserveRun, type ObserveJob } from "./automation-observe-client";
import { validateAutomation, getProviderReadiness, type ValidationResult, type ProviderReadiness } from "@/lib/automation-validation";

// ── Tab definitions ──────────────────────────────────────────────────────────

const TABS = ["builder", "runs", "queue", "setup"] as const;
type Tab = (typeof TABS)[number];

function isTab(value: string | undefined): value is Tab {
  return TABS.includes(value as Tab);
}

// ── Page ─────────────────────────────────────────────────────────────────────

export default async function AutomationDetailPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ flash?: string; tab?: string }>;
}) {
  const { id } = await params;
  const query = await searchParams;
  const membership = await getCurrentMembership();
  if (!membership) notFound();

  const rawTab = query.tab;
  const activeTab: Tab = isTab(rawTab) ? rawTab : "builder";

  const automation = await prisma.automation.findFirst({
    where: { id, organizationId: membership.organizationId },
    include: { steps: { orderBy: { orderIndex: "asc" } } },
  });
  if (!automation) notFound();

  const flash = query.flash;
  const flashMessage =
    flash === "saved"               ? "Automation saved."                                              :
    flash === "step-added"          ? "Step added."                                                    :
    flash === "step-deleted"        ? "Step deleted."                                                  :
    flash === "enrolled"            ? "Contact enrolled successfully."                                 :
    flash === "activation-blocked"  ? "Cannot activate — fix the issues in the readiness checklist."  :
    null;
  const flashTone: "success" | "error" =
    flash === "activation-blocked" ? "error" : "success";

  // ── Validation (always computed for Builder tab readiness card) ──────────
  const provider     = getProviderReadiness();
  const validation   = validateAutomation(
    { triggerType: automation.triggerType, steps: automation.steps },
    provider
  );

  // ── Conditional queries per tab ──────────────────────────────────────────

  // Builder: contacts for manual enrollment
  let enrollContacts: Array<{ id: string; name: string; email: string | null; phone: string | null }> = [];
  if (activeTab === "builder" && automation.triggerType === "MANUAL_ENROLLMENT") {
    const locationIds = await getCurrentAccessibleLocationIds();
    enrollContacts = await prisma.contact.findMany({
      where: locationIds.length > 0 ? { locationId: { in: locationIds } } : {},
      select: { id: true, name: true, email: true, phone: true },
      orderBy: { name: "asc" },
      take: 200,
    });
  }

  // Runs tab
  let runs: ObserveRun[] = [];
  if (activeTab === "runs") {
    const raw = await prisma.automationRun.findMany({
      where: { automationId: automation.id },
      include: {
        contact:  { select: { id: true, name: true, email: true } },
        location: { select: { id: true, name: true } },
        jobs: {
          include: {
            automationStep: { select: { id: true, title: true, stepType: true } },
          },
          orderBy: { executeAt: "asc" },
        },
        stepExecutions: {
          include: {
            automationStep: { select: { id: true, title: true, stepType: true } },
          },
          orderBy: { startedAt: "asc" },
        },
      },
      orderBy: { createdAt: "desc" },
      take: 50,
    });

    runs = raw.map((r) => ({
      id:           r.id,
      status:       r.status,
      triggerEvent: r.triggerEvent,
      source:       r.source,
      createdAt:    r.createdAt.toISOString(),
      completedAt:  r.completedAt?.toISOString() ?? null,
      contactId:    r.contact.id,
      contactName:  r.contact.name,
      contactEmail: r.contact.email,
      locationId:   r.location.id,
      locationName: r.location.name,
      jobs: r.jobs.map((j) => ({
        id:           j.id,
        status:       j.status,
        executeAt:    j.executeAt.toISOString(),
        executedAt:   j.executedAt?.toISOString() ?? null,
        errorMessage: j.errorMessage,
        stepTitle:    j.automationStep.title,
        stepType:     j.automationStep.stepType,
      })),
      stepExecutions: r.stepExecutions.map((e) => ({
        id:               e.id,
        automationStepId: e.automationStepId,
        automationJobId:  e.automationJobId,
        campaignId:       e.campaignId,
        stepTitle:        e.automationStep.title,
        stepType:         e.automationStep.stepType,
        status:           e.status,
        detail:           e.detail,
        errorMessage:     e.errorMessage,
        startedAt:        e.startedAt.toISOString(),
        completedAt:      e.completedAt?.toISOString() ?? null,
      })),
      payloadPreview: r.payloadJson
        ? JSON.stringify(r.payloadJson, null, 2).slice(0, 800)
        : null,
    }));
  }

  // Queue tab
  let jobs: ObserveJob[] = [];
  if (activeTab === "queue") {
    const raw = await prisma.automationJob.findMany({
      where: { automationRun: { automationId: automation.id } },
      include: {
        automationStep: { select: { id: true, title: true, stepType: true } },
        automationRun: {
          select: {
            id: true,
            triggerEvent: true,
            contact:  { select: { name: true } },
            location: { select: { name: true } },
          },
        },
      },
      orderBy: { executeAt: "desc" },
      take: 100,
    });

    jobs = raw.map((j) => ({
      id:           j.id,
      status:       j.status,
      executeAt:    j.executeAt.toISOString(),
      executedAt:   j.executedAt?.toISOString() ?? null,
      errorMessage: j.errorMessage,
      attemptCount: j.attemptCount,
      maxAttempts:  j.maxAttempts,
      stepTitle:    j.automationStep.title,
      stepType:     j.automationStep.stepType,
      runId:        j.automationRun.id,
      runTrigger:   j.automationRun.triggerEvent,
      contactName:  j.automationRun.contact.name,
      locationName: j.automationRun.location.name,
    }));
  }

  // Setup: counts for badges (cheap, always loaded)
  const [runCount, pendingJobCount] = await Promise.all([
    prisma.automationRun.count({ where: { automationId: automation.id } }),
    prisma.automationJob.count({
      where: { status: "pending", automationRun: { automationId: automation.id } },
    }),
  ]);

  // provider is already computed above for validation; pass to Setup tab when active
  const providerStatus: ProviderReadiness | null = activeTab === "setup" ? provider : null;

  // ── Render ────────────────────────────────────────────────────────────────

  return (
    <AppShell activeScreen="automation" flash={flashMessage ? { tone: flashTone, message: flashMessage } : null}>
      <div className="space-y-6">
        {/* Header */}
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

        {/* Tab bar */}
        <nav className="flex gap-1 border-b border-slate-200 -mb-1">
          {[
            { key: "builder", label: "Builder", errorBadge: !automation.isActive && validation.errorCount > 0 ? validation.errorCount : null },
            { key: "runs",    label: "Runs",    badge: runCount > 0 ? runCount : null },
            { key: "queue",   label: "Queue",   badge: pendingJobCount > 0 ? pendingJobCount : null },
            { key: "setup",   label: "Setup" },
          ].map(({ key, label, badge, errorBadge }) => {
            const isActive = activeTab === key;
            return (
              <Link
                key={key}
                href={`?tab=${key}`}
                className={`relative flex items-center gap-1.5 px-4 py-2.5 text-sm font-medium border-b-2 transition-colors ${
                  isActive
                    ? "border-indigo-600 text-indigo-600"
                    : "border-transparent text-slate-600 hover:text-slate-900 hover:border-slate-300"
                }`}
              >
                {label}
                {badge != null && (
                  <span className={`inline-flex items-center justify-center rounded-full px-1.5 py-0.5 text-xs font-semibold leading-none ${
                    isActive ? "bg-indigo-100 text-indigo-700" : "bg-slate-100 text-slate-500"
                  }`}>
                    {badge > 99 ? "99+" : badge}
                  </span>
                )}
                {errorBadge != null && (
                  <span className="inline-flex items-center justify-center rounded-full bg-rose-100 px-1.5 py-0.5 text-xs font-semibold leading-none text-rose-700">
                    {errorBadge}
                  </span>
                )}
              </Link>
            );
          })}
        </nav>

        {/* ── BUILDER TAB ────────────────────────────────────────────────── */}
        {activeTab === "builder" && (
          <div className="grid gap-6 xl:grid-cols-[1fr_380px]">
            <div className="space-y-6">
              <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
                <p className="text-sm font-semibold uppercase tracking-[0.22em] text-indigo-600">Workflow Steps</p>
                <h3 className="mt-2 text-xl font-semibold text-slate-950">
                  {automation.steps.length === 0
                    ? "No steps yet"
                    : `${automation.steps.length} step${automation.steps.length === 1 ? "" : "s"}`}
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
                          ? Object.entries(step.configJson as Record<string, string>)
                              .map(([k, v]) => `${k}: ${v}`)
                              .join(" · ")
                          : null;
                      return (
                        <div key={step.id} className="flex w-full flex-col items-center">
                          <div className="w-full max-w-lg rounded-3xl border border-slate-200 bg-white px-5 py-4 shadow-sm">
                            <div className="flex items-start justify-between gap-3">
                              <div className="flex-1">
                                <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-400">
                                  {formatStepType(step.stepType)}
                                </p>
                                <p className="mt-1 font-semibold text-slate-900">{step.title}</p>
                                {step.description && (
                                  <p className="mt-1 text-sm text-slate-500">{step.description}</p>
                                )}
                                {config && <p className="mt-2 text-xs text-slate-400">{config}</p>}
                              </div>
                              <div className="flex items-center gap-2">
                                <span className="rounded-full bg-slate-100 px-2 py-1 text-xs font-semibold text-slate-500">
                                  #{index + 1}
                                </span>
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

              <ReadinessCard validation={validation} />

              <div className="rounded-3xl border border-red-100 bg-white p-6 shadow-sm">
                <p className="text-sm font-semibold uppercase tracking-[0.22em] text-red-500">Danger Zone</p>
                <h3 className="mt-2 text-xl font-semibold text-slate-950">Delete automation</h3>
                <p className="mt-2 text-sm text-slate-500">
                  Permanently deletes this automation and all its steps.
                </p>
                <div className="mt-4">
                  <DeleteAutomationButton automationId={automation.id} />
                </div>
              </div>
            </aside>
          </div>
        )}

        {/* ── RUNS TAB ────────────────────────────────────────────────────── */}
        {activeTab === "runs" && <RunsTab runs={runs} />}

        {/* ── QUEUE TAB ───────────────────────────────────────────────────── */}
        {activeTab === "queue" && <QueueTab jobs={jobs} />}

        {/* ── SETUP TAB ───────────────────────────────────────────────────── */}
        {activeTab === "setup" && providerStatus && (
          <SetupTab status={providerStatus} automationId={automation.id} />
        )}
      </div>
    </AppShell>
  );
}

// ── ReadinessCard (Builder tab sidebar) ─────────────────────────────────────

function ReadinessCard({ validation }: { validation: ValidationResult }) {
  const { canActivate, errorCount, warningCount, issues } = validation;

  const borderColor =
    errorCount > 0   ? "border-rose-200"    :
    warningCount > 0 ? "border-amber-200"   :
                       "border-emerald-200";

  const headerColor =
    errorCount > 0   ? "text-rose-500"   :
    warningCount > 0 ? "text-amber-500"  :
                       "text-emerald-600";

  const heading =
    errorCount > 0      ? `${errorCount} issue${errorCount > 1 ? "s" : ""} must be fixed`   :
    warningCount > 0    ? `Ready — ${warningCount} warning${warningCount > 1 ? "s" : ""}`     :
                          "Ready to activate";

  return (
    <div className={`rounded-3xl border bg-white p-6 shadow-sm ${borderColor}`}>
      <p className={`text-sm font-semibold uppercase tracking-[0.22em] ${headerColor}`}>Readiness</p>
      <h3 className="mt-2 text-lg font-semibold text-slate-950">{heading}</h3>

      {issues.length === 0 ? (
        <p className="mt-3 flex items-center gap-2 text-sm text-emerald-700">
          <span className="text-base">✓</span> All checks passed — safe to activate.
        </p>
      ) : (
        <div className="mt-4 space-y-2">
          {issues.map((issue, i) => (
            <div
              key={i}
              className={`rounded-xl px-4 py-3 ${
                issue.severity === "error"
                  ? "border border-rose-100 bg-rose-50"
                  : "border border-amber-100 bg-amber-50"
              }`}
            >
              <p className={`text-sm font-medium ${
                issue.severity === "error" ? "text-rose-800" : "text-amber-800"
              }`}>
                {issue.severity === "error" ? "✕" : "⚠"} {issue.message}
              </p>
              <p className={`mt-1 text-xs leading-relaxed ${
                issue.severity === "error" ? "text-rose-600" : "text-amber-700"
              }`}>
                {issue.hint}
              </p>
            </div>
          ))}

          {!canActivate && (
            <p className="pt-1 text-xs text-slate-400">
              Fix all ✕ errors before setting this automation to Active.{" "}
              <Link href="?tab=setup" className="text-indigo-500 hover:underline">Setup tab</Link>
              {" "}shows provider configuration.
            </p>
          )}
        </div>
      )}
    </div>
  );
}

// ── SetupTab (server-rendered, inline) ───────────────────────────────────────

function ProviderCard({
  title,
  ok,
  children,
}: {
  title: string;
  ok: boolean;
  children: React.ReactNode;
}) {
  return (
    <div className={`rounded-2xl border p-5 ${ok ? "border-emerald-200 bg-emerald-50/40" : "border-amber-200 bg-amber-50/40"}`}>
      <div className="flex items-center gap-2 mb-3">
        <span className={`text-lg ${ok ? "text-emerald-500" : "text-amber-500"}`}>{ok ? "✓" : "⚠"}</span>
        <p className="font-semibold text-slate-900 text-sm">{title}</p>
        <span className={`ml-auto rounded-full px-2 py-0.5 text-xs font-semibold uppercase tracking-wide ${
          ok ? "bg-emerald-100 text-emerald-700" : "bg-amber-100 text-amber-700"
        }`}>
          {ok ? "Ready" : "Not configured"}
        </span>
      </div>
      <div className="text-sm text-slate-600 space-y-1">{children}</div>
    </div>
  );
}

function SetupTab({ status, automationId }: { status: ProviderReadiness; automationId: string }) {
  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";
  const webhookUrl = `${appUrl}/api/webhooks/automation`;
  const cronUrl    = `${appUrl}/api/automation/run-pending`;

  return (
    <div className="space-y-6">
      {/* Provider readiness */}
      <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
        <p className="text-sm font-semibold uppercase tracking-[0.22em] text-indigo-600">Providers</p>
        <h3 className="mt-2 text-xl font-semibold text-slate-950">Delivery readiness</h3>
        <p className="mt-1 mb-5 text-sm text-slate-500">
          Environment variables that control email, SMS, and webhook authentication.
          Secret values are never shown.
        </p>
        <div className="grid gap-4 sm:grid-cols-2">
          <ProviderCard title="Resend Email" ok={status.hasResendApiKey}>
            <p>
              <span className="font-medium">RESEND_API_KEY:</span>{" "}
              {status.hasResendApiKey
                ? "Set ✓"
                : <span className="text-amber-700">Not set — email delivery disabled</span>}
            </p>
            <p>
              <span className="font-medium">RESEND_FROM_EMAIL:</span>{" "}
              {status.hasResendFromEmail
                ? "Set ✓"
                : <span className="text-amber-700">Not set — will use Resend default sender</span>}
            </p>
          </ProviderCard>

          <ProviderCard title="Twilio SMS" ok={status.hasTwilioConfig}>
            <p>
              <span className="font-medium">TWILIO credentials:</span>{" "}
              {status.hasTwilioConfig
                ? "All three set ✓"
                : <span className="text-amber-700">Missing — set TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN, TWILIO_PHONE_NUMBER</span>}
            </p>
            {status.hasTwilioPhone && (
              <p className="text-xs text-slate-500">
                Sending from: <span className="font-medium text-slate-700">{process.env.TWILIO_PHONE_NUMBER}</span>
              </p>
            )}
          </ProviderCard>

          <ProviderCard title="Webhook Secret" ok={status.hasWebhookSecret}>
            <p>
              <span className="font-medium">AUTOMATION_WEBHOOK_SECRET:</span>{" "}
              {status.hasWebhookSecret
                ? "Set ✓ — HMAC-SHA256 signature verification active"
                : <span className="text-amber-700">Not set — all inbound webhook requests will be rejected</span>}
            </p>
          </ProviderCard>

          <ProviderCard title="Runner Secret" ok={status.hasRunnerSecret}>
            <p>
              <span className="font-medium">AUTOMATION_RUNNER_SECRET:</span>{" "}
              {status.hasRunnerSecret
                ? status.runnerSecretUsesFallback
                  ? "Falling back to AUTOMATION_WEBHOOK_SECRET ✓"
                  : "Set ✓"
                : <span className="text-amber-700">Not set — cron runner will reject all requests</span>}
            </p>
          </ProviderCard>
        </div>
      </section>

      {/* Integration URLs */}
      <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
        <p className="text-sm font-semibold uppercase tracking-[0.22em] text-indigo-600">Endpoints</p>
        <h3 className="mt-2 text-xl font-semibold text-slate-950">Integration URLs</h3>
        <p className="mt-1 mb-5 text-sm text-slate-500">
          Use these when configuring your CRM webhook or cron scheduler.
        </p>
        <div className="space-y-4">
          <div>
            <p className="text-xs font-semibold uppercase tracking-widest text-slate-400 mb-1">Inbound Webhook (POST)</p>
            <p className="text-xs text-slate-500 mb-2">
              Include <code className="rounded bg-slate-100 px-1 py-0.5">x-automation-signature</code> +{" "}
              <code className="rounded bg-slate-100 px-1 py-0.5">x-automation-timestamp</code> headers.
            </p>
            <div className="rounded-xl bg-slate-50 border border-slate-200 px-4 py-2.5">
              <code className="text-xs text-slate-700 break-all">{webhookUrl}</code>
            </div>
          </div>
          <div>
            <p className="text-xs font-semibold uppercase tracking-widest text-slate-400 mb-1">Cron / Job Runner (POST)</p>
            <p className="text-xs text-slate-500 mb-2">
              Call every 5–15 min with{" "}
              <code className="rounded bg-slate-100 px-1 py-0.5">x-automation-runner-secret</code> header.
              Processes up to 25 due jobs per invocation.
            </p>
            <div className="rounded-xl bg-slate-50 border border-slate-200 px-4 py-2.5">
              <code className="text-xs text-slate-700 break-all">{cronUrl}</code>
            </div>
          </div>
        </div>
      </section>

      {/* Webhook payload reference */}
      <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
        <p className="text-sm font-semibold uppercase tracking-[0.22em] text-indigo-600">Reference</p>
        <h3 className="mt-2 text-xl font-semibold text-slate-950">Webhook payload shape</h3>
        <p className="mt-1 mb-4 text-sm text-slate-500">
          Example JSON body for the inbound webhook endpoint.
        </p>
        <pre className="rounded-xl bg-slate-900 text-slate-100 text-xs p-4 overflow-x-auto leading-relaxed">
{`{
  "eventType": "appointment_completed",
  "locationId": "<your location id>",
  "contact": {
    "firstName": "Jane",
    "lastName": "Smith",
    "email": "jane@example.com",
    "phone": "+15550001234",
    "preferredChannel": "EMAIL"
  },
  "metadata": {
    "occurredAt": "${new Date().toISOString()}",
    "source": "acme-crm",
    "workflowName": "Post-appointment follow-up"
  }
}`}
        </pre>
      </section>
    </div>
  );
}
