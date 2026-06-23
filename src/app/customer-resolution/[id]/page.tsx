export const dynamic = "force-dynamic";

import Link from "next/link";
import { notFound } from "next/navigation";
import { AppShell } from "@/components/app-shell";
import { getCurrentAccessibleLocationIds } from "@/lib/current-scope";
import { getResolutionCaseById } from "@/lib/resolution-cases";
import { updateCaseStatus, addCaseNote } from "../actions";
import { CaseResponseDraft } from "./case-response-draft";

const PRIORITY_BADGE: Record<string, string> = {
  CRITICAL: "bg-rose-100 text-rose-700",
  HIGH: "bg-amber-100 text-amber-700",
  MEDIUM: "bg-slate-100 text-slate-600",
  LOW: "bg-slate-100 text-slate-500",
};
const STATUS_ACTIONS: { status: string; label: string }[] = [
  { status: "CONTACTED", label: "Mark Contacted" },
  { status: "IN_PROGRESS", label: "Mark In Progress" },
  { status: "RESOLVED", label: "Mark Resolved" },
  { status: "CLOSED", label: "Close Case" },
];
const fmt = (s: string) => s.replace(/_/g, " ").toLowerCase().replace(/\b\w/g, (c) => c.toUpperCase());

function Card({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
      <h3 className="text-sm font-semibold uppercase tracking-[0.16em] text-slate-500">{title}</h3>
      <div className="mt-3">{children}</div>
    </section>
  );
}

export default async function CaseDetailPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
}) {
  const { id } = await params;
  const query = (await searchParams) ?? {};
  const flash = typeof query.flash === "string" ? query.flash : null;
  const tone = typeof query.tone === "string" && ["success", "error", "info"].includes(query.tone) ? (query.tone as "success" | "error" | "info") : "success";

  const locationIds = await getCurrentAccessibleLocationIds();
  const c = await getResolutionCaseById(id, locationIds);
  if (!c) notFound();

  return (
    <AppShell activeScreen="customer-resolution" flash={flash ? { message: flash, tone } : null}>
      <div className="space-y-6">
        <Link href="/customer-resolution" className="text-sm font-semibold text-indigo-600">← All cases</Link>

        <header className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
          <div className="flex flex-wrap items-center gap-3">
            <h2 className="text-2xl font-semibold tracking-tight text-slate-950">{c.customerName || "Anonymous customer"}</h2>
            <span className="tabular-nums text-slate-600">{c.rating}★</span>
            <span className={`rounded-full px-2.5 py-1 text-[11px] font-semibold ${PRIORITY_BADGE[c.priority]}`}>{c.priority}</span>
            <span className="rounded-full bg-slate-100 px-2.5 py-1 text-[11px] font-semibold text-slate-600">{fmt(c.status)}</span>
          </div>
          <p className="mt-1 text-sm text-slate-500">{c.location.name} · {c.createdAt.toLocaleString()}</p>
          <div className="mt-4 flex flex-wrap gap-2">
            {STATUS_ACTIONS.map((a) => (
              <form key={a.status} action={updateCaseStatus}>
                <input type="hidden" name="caseId" value={c.id} />
                <input type="hidden" name="status" value={a.status} />
                <button type="submit" className="rounded-2xl border border-slate-200 bg-white px-3 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50">{a.label}</button>
              </form>
            ))}
          </div>
        </header>

        <div className="grid gap-6 xl:grid-cols-[1.5fr_1fr]">
          <div className="space-y-6">
            {c.issueCategories.length > 0 && (
              <Card title="Selected issues">
                <div className="flex flex-wrap gap-2">
                  {c.issueCategories.map((i) => <span key={i} className="rounded-full bg-slate-100 px-3 py-1 text-xs font-medium text-slate-700">{i}</span>)}
                </div>
              </Card>
            )}
            {c.aiSummary && (
              <Card title="AI summary">
                <p className="whitespace-pre-wrap text-sm leading-7 text-slate-700">{c.aiSummary}</p>
              </Card>
            )}
            <Card title="Customer feedback">
              <p className="whitespace-pre-wrap text-sm leading-7 text-slate-800">{c.finalFeedback}</p>
              {c.aiClearFeedback && c.aiClearFeedback !== c.finalFeedback && (
                <details className="mt-3 text-xs text-slate-500">
                  <summary className="cursor-pointer font-semibold">Original (before clarity edit)</summary>
                  <p className="mt-2 whitespace-pre-wrap">{c.originalFeedback}</p>
                </details>
              )}
            </Card>
            <Card title="Draft a response">
              <CaseResponseDraft caseId={c.id} />
            </Card>
            <Card title="Timeline & notes">
              <div className="space-y-3">
                {c.notes.map((n) => (
                  <div key={n.id} className="rounded-xl border border-slate-100 bg-slate-50 p-3">
                    <div className="flex items-center justify-between text-xs text-slate-400">
                      <span className="font-semibold uppercase tracking-wide">{fmt(n.kind)}</span>
                      <span>{n.createdAt.toLocaleString()}{n.membership?.user?.name ? ` · ${n.membership.user.name}` : ""}</span>
                    </div>
                    <p className="mt-1 whitespace-pre-wrap text-sm text-slate-700">{n.body}</p>
                  </div>
                ))}
              </div>
              <form action={addCaseNote} className="mt-4 flex gap-2">
                <input type="hidden" name="caseId" value={c.id} />
                <input name="body" placeholder="Add an internal note…" required className="flex-1 rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm" />
                <button type="submit" className="rounded-xl bg-slate-950 px-4 py-2 text-sm font-semibold text-white">Add</button>
              </form>
            </Card>
          </div>

          <div className="space-y-6">
            <Card title="Requested outcome">
              <p className="text-sm text-slate-700">{c.requestedOutcome || "Not specified"}</p>
            </Card>
            <Card title="Contact preference">
              <p className="text-sm font-medium text-slate-800">{c.contactPreference === "NONE" ? "No contact requested" : `By ${c.contactPreference.toLowerCase()}`}</p>
              <dl className="mt-2 space-y-1 text-sm text-slate-600">
                {c.customerEmail && <div><dt className="inline font-semibold text-slate-900">Email:</dt> {c.customerEmail}</div>}
                {c.customerPhone && <div><dt className="inline font-semibold text-slate-900">Phone:</dt> {c.customerPhone}</div>}
              </dl>
            </Card>
            {c.followUps.length > 0 && (
              <Card title="Follow-up">
                {c.followUps.map((f) => (
                  <p key={f.id} className="text-sm text-slate-700">
                    {f.respondedAt ? `Customer replied: ${f.response}${f.responseDetail ? ` — ${f.responseDetail}` : ""}` : `Sent ${f.sentAt?.toLocaleDateString() ?? ""} — awaiting reply`}
                  </p>
                ))}
              </Card>
            )}
          </div>
        </div>
      </div>
    </AppShell>
  );
}
