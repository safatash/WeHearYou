"use client";

import { useState } from "react";

// ── Serialisable types passed from the server ────────────────────────────────

export type RunJob = {
  id: string;
  status: string;
  executeAt: string;
  executedAt: string | null;
  errorMessage: string | null;
  stepTitle: string;
  stepType: string;
};

export type StepExecution = {
  id: string;
  automationStepId: string;
  automationJobId: string | null;
  campaignId: string | null;
  stepTitle: string;
  stepType: string;
  status: string;
  detail: string | null;
  errorMessage: string | null;
  startedAt: string;
  completedAt: string | null;
};

export type ObserveRun = {
  id: string;
  status: string;
  triggerEvent: string;
  source: string | null;
  createdAt: string;
  completedAt: string | null;
  contactId: string;
  contactName: string;
  contactEmail: string | null;
  locationId: string;
  locationName: string;
  jobs: RunJob[];
  stepExecutions: StepExecution[];
  payloadPreview: string | null; // JSON string, first 800 chars
};

export type ObserveJob = {
  id: string;
  status: string;
  executeAt: string;
  executedAt: string | null;
  errorMessage: string | null;
  stepTitle: string;
  stepType: string;
  runId: string;
  runTrigger: string;
  contactName: string;
  locationName: string;
};

// ── Helpers ──────────────────────────────────────────────────────────────────

function statusPill(status: string) {
  const map: Record<string, string> = {
    running:    "bg-blue-50 text-blue-700",
    scheduled:  "bg-amber-50 text-amber-700",
    completed:  "bg-emerald-50 text-emerald-700",
    failed:     "bg-rose-50 text-rose-700",
    pending:    "bg-slate-100 text-slate-500",
    processing: "bg-indigo-50 text-indigo-700",
  };
  return (
    <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-semibold uppercase tracking-wide ${map[status] ?? "bg-slate-100 text-slate-500"}`}>
      {status}
    </span>
  );
}

function stepTypePill(type: string) {
  const map: Record<string, string> = {
    SEND_REQUEST:    "bg-indigo-50 text-indigo-600",
    DELAY:           "bg-amber-50 text-amber-700",
    TAG_CONTACT:     "bg-teal-50 text-teal-700",
    NOTIFY_TEAM:     "bg-purple-50 text-purple-700",
    WEBHOOK:         "bg-orange-50 text-orange-700",
    PUBLISH_GBP_REPLY: "bg-blue-50 text-blue-700",
  };
  const label = type.replace(/_/g, " ").toLowerCase().replace(/\b\w/g, (c) => c.toUpperCase());
  return (
    <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${map[type] ?? "bg-slate-100 text-slate-500"}`}>
      {label}
    </span>
  );
}

function fmt(iso: string | null | undefined) {
  if (!iso) return "—";
  const d = new Date(iso);
  return d.toLocaleString(undefined, { dateStyle: "short", timeStyle: "short" });
}

function relTime(iso: string) {
  const diff = Date.now() - new Date(iso).getTime();
  if (diff < 60_000) return "just now";
  if (diff < 3_600_000) return `${Math.floor(diff / 60_000)}m ago`;
  if (diff < 86_400_000) return `${Math.floor(diff / 3_600_000)}h ago`;
  return `${Math.floor(diff / 86_400_000)}d ago`;
}

// ── RunDetailPanel ────────────────────────────────────────────────────────────

function RunDetailPanel({ run }: { run: ObserveRun }) {
  const [showPayload, setShowPayload] = useState(false);

  return (
    <div className="border-t border-slate-100 bg-slate-50 px-6 py-4 space-y-4">
      {/* Step executions */}
      {run.stepExecutions.length > 0 ? (
        <div>
          <p className="mb-2 text-xs font-semibold uppercase tracking-widest text-slate-400">Step Outcomes</p>
          <div className="space-y-2">
            {run.stepExecutions.map((exec) => (
              <div key={exec.id} className="rounded-xl border border-slate-200 bg-white px-4 py-3">
                <div className="flex flex-wrap items-center gap-3">
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-slate-900 truncate">{exec.stepTitle}</p>
                    <p className="text-xs text-slate-500 truncate mt-0.5">{exec.detail ?? "—"}</p>
                  </div>
                  {stepTypePill(exec.stepType)}
                  {statusPill(exec.status)}
                  <div className="text-xs text-slate-500 text-right ml-auto space-y-0.5">
                    {exec.completedAt
                      ? <p title={fmt(exec.completedAt)}>Done {relTime(exec.completedAt)}</p>
                      : <p className="text-amber-500">Pending</p>
                    }
                  </div>
                </div>
                {/* Campaign link */}
                {exec.campaignId && (
                  <div className="mt-2 flex items-center gap-2">
                    <span className="inline-flex items-center rounded-full bg-indigo-50 px-2 py-0.5 text-xs font-medium text-indigo-600">
                      Campaign created
                    </span>
                    <a
                      href={`/campaigns/${exec.campaignId}`}
                      className="text-xs text-indigo-600 hover:underline"
                      target="_blank"
                      rel="noreferrer"
                    >
                      View campaign →
                    </a>
                  </div>
                )}
                {exec.errorMessage && (
                  <div className="mt-2 rounded-lg bg-rose-50 border border-rose-100 px-3 py-2 text-xs text-rose-700">
                    {exec.errorMessage}
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      ) : (
        <p className="text-xs text-slate-400 italic">No step execution records yet — this run may predate persistence, or all steps were DELAY steps.</p>
      )}

      {/* Queued jobs (secondary — shows execute-at timing for scheduled steps) */}
      {run.jobs.length > 0 && (
        <div>
          <p className="mb-2 text-xs font-semibold uppercase tracking-widest text-slate-400">Queued Job Timings</p>
          <div className="space-y-1.5">
            {run.jobs.map((job) => (
              <div key={job.id} className="rounded-lg border border-slate-100 bg-white px-3 py-2 flex flex-wrap items-center gap-2 text-xs">
                {statusPill(job.status)}
                <span className="text-slate-700 flex-1 truncate">{job.stepTitle}</span>
                <span className="text-slate-400">Execute at: <span className="font-medium text-slate-600">{fmt(job.executeAt)}</span></span>
                {job.executedAt && <span className="text-slate-400">Done: <span className="font-medium text-slate-600">{fmt(job.executedAt)}</span></span>}
                {job.errorMessage && <span className="text-rose-600 truncate">{job.errorMessage}</span>}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Payload toggle */}
      {run.payloadPreview && (
        <div>
          <button
            onClick={() => setShowPayload((v) => !v)}
            className="text-xs font-medium text-indigo-600 hover:text-indigo-800"
          >
            {showPayload ? "Hide" : "Show"} trigger payload ↕
          </button>
          {showPayload && (
            <pre className="mt-2 rounded-xl bg-slate-900 text-slate-100 text-xs p-4 overflow-x-auto whitespace-pre-wrap break-all leading-relaxed">
              {run.payloadPreview}
            </pre>
          )}
        </div>
      )}
    </div>
  );
}

// ── RunsTab ───────────────────────────────────────────────────────────────────

export function RunsTab({ runs }: { runs: ObserveRun[] }) {
  const [expanded, setExpanded] = useState<string | null>(null);

  if (runs.length === 0) {
    return (
      <div className="rounded-3xl border border-slate-200 bg-white p-10 text-center shadow-sm">
        <p className="text-sm font-medium text-slate-500">No runs yet</p>
        <p className="mt-1 text-xs text-slate-400">Runs appear here once the automation is triggered via webhook, cron, or manual enrollment.</p>
      </div>
    );
  }

  return (
    <div className="rounded-3xl border border-slate-200 bg-white shadow-sm overflow-hidden">
      <div className="px-6 py-4 border-b border-slate-100">
        <p className="text-sm font-semibold text-slate-950">Recent runs <span className="ml-1 text-slate-400 font-normal">({runs.length})</span></p>
        <p className="text-xs text-slate-400 mt-0.5">Showing up to 50 most recent. Click a row to expand step detail.</p>
      </div>
      <div className="divide-y divide-slate-100">
        {runs.map((run) => {
          const isExpanded = expanded === run.id;
          const hasError = run.jobs.some((j) => j.errorMessage) || run.status === "failed";
          return (
            <div key={run.id}>
              <button
                className="w-full text-left px-6 py-4 hover:bg-slate-50 transition-colors focus:outline-none focus:bg-slate-50"
                onClick={() => setExpanded(isExpanded ? null : run.id)}
              >
                <div className="flex flex-wrap items-center gap-3">
                  {/* Status */}
                  <div className="flex-shrink-0">{statusPill(run.status)}</div>

                  {/* Contact + location */}
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-slate-900 truncate">
                      {run.contactName}
                      {run.contactEmail && (
                        <span className="ml-1.5 text-xs font-normal text-slate-400">({run.contactEmail})</span>
                      )}
                    </p>
                    <p className="text-xs text-slate-500 truncate">{run.locationName}</p>
                  </div>

                  {/* Trigger + source */}
                  <div className="hidden sm:block text-center">
                    <p className="text-xs font-medium text-slate-700 capitalize">{run.triggerEvent.replace(/_/g, " ")}</p>
                    {run.source && <p className="text-xs text-slate-400">{run.source}</p>}
                  </div>

                  {/* Jobs count */}
                  {run.jobs.length > 0 && (
                    <span className="hidden md:inline-flex items-center rounded-full bg-indigo-50 px-2 py-0.5 text-xs font-medium text-indigo-600">
                      {run.jobs.length} job{run.jobs.length !== 1 ? "s" : ""}
                    </span>
                  )}

                  {/* Error indicator */}
                  {hasError && (
                    <span className="inline-flex items-center rounded-full bg-rose-50 px-2 py-0.5 text-xs font-medium text-rose-600">
                      error
                    </span>
                  )}

                  {/* Campaign badge */}
                  {run.stepExecutions.some((e) => e.campaignId) && (
                    <span className="hidden md:inline-flex items-center rounded-full bg-teal-50 px-2 py-0.5 text-xs font-medium text-teal-600">
                      campaign
                    </span>
                  )}

                  {/* Time */}
                  <div className="text-right text-xs text-slate-400 flex-shrink-0">
                    <p title={fmt(run.createdAt)}>{relTime(run.createdAt)}</p>
                    {run.completedAt && (
                      <p className="text-slate-300" title={fmt(run.completedAt)}>done {relTime(run.completedAt)}</p>
                    )}
                  </div>

                  {/* Expand indicator */}
                  <span className="text-slate-300 flex-shrink-0">{isExpanded ? "▲" : "▼"}</span>
                </div>
              </button>
              {isExpanded && <RunDetailPanel run={run} />}
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ── QueueTab ──────────────────────────────────────────────────────────────────

export function QueueTab({ jobs }: { jobs: ObserveJob[] }) {
  const pending  = jobs.filter((j) => j.status === "pending");
  const other    = jobs.filter((j) => j.status !== "pending");

  if (jobs.length === 0) {
    return (
      <div className="rounded-3xl border border-slate-200 bg-white p-10 text-center shadow-sm">
        <p className="text-sm font-medium text-slate-500">Queue is empty</p>
        <p className="mt-1 text-xs text-slate-400">Delayed SEND_REQUEST steps appear here until the cron runner executes them.</p>
      </div>
    );
  }

  function JobTable({ rows, label }: { rows: ObserveJob[]; label: string }) {
    if (rows.length === 0) return null;
    return (
      <div className="rounded-3xl border border-slate-200 bg-white shadow-sm overflow-hidden">
        <div className="px-6 py-4 border-b border-slate-100">
          <p className="text-sm font-semibold text-slate-950">{label} <span className="text-slate-400 font-normal">({rows.length})</span></p>
        </div>
        <div className="divide-y divide-slate-100">
          {rows.map((job) => (
            <div key={job.id} className="px-6 py-4">
              <div className="flex flex-wrap items-center gap-3">
                {statusPill(job.status)}
                {stepTypePill(job.stepType)}
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-slate-900 truncate">{job.stepTitle}</p>
                  <p className="text-xs text-slate-500 truncate">
                    {job.contactName} · {job.locationName} · {job.runTrigger.replace(/_/g, " ")}
                  </p>
                </div>
                <div className="text-xs text-slate-500 text-right space-y-0.5">
                  <p>Execute at: <span className="font-medium text-slate-700">{fmt(job.executeAt)}</span></p>
                  {job.executedAt && <p>Executed: <span className="font-medium text-slate-700">{fmt(job.executedAt)}</span></p>}
                </div>
              </div>
              {job.errorMessage && (
                <div className="mt-2 rounded-lg bg-rose-50 border border-rose-100 px-3 py-2 text-xs text-rose-700">
                  {job.errorMessage}
                </div>
              )}
            </div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <JobTable rows={pending} label="Pending jobs" />
      <JobTable rows={other}   label="Completed / failed jobs" />
    </div>
  );
}
