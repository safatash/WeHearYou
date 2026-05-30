export const dynamic = "force-dynamic";

import { AppShell } from "@/components/app-shell";
import { prisma } from "@/lib/prisma";
import { getCurrentMembership } from "@/lib/authz";
import { getCurrentAccessibleLocationIds } from "@/lib/current-scope";
import { notFound } from "next/navigation";
import { answerGbpQuestionAction } from "@/app/gbp/actions";

export default async function GbpQaPage() {
  const membership = await getCurrentMembership();
  if (!membership) notFound();

  const locationIds = await getCurrentAccessibleLocationIds();
  const questions = await prisma.gbpQuestion.findMany({
    where: locationIds.length > 0 ? { locationId: { in: locationIds } } : {},
    include: { location: { select: { name: true } } },
    orderBy: [{ answeredAt: "asc" }, { askedAt: "desc" }],
    take: 100,
  });

  const unanswered = questions.filter((q) => !q.answeredAt);
  const answered = questions.filter((q) => q.answeredAt);

  return (
    <AppShell activeScreen="gbp-manager">
      <div className="space-y-6 max-w-3xl">
        <div>
          <a href="/gbp" className="text-sm text-indigo-600 hover:underline">← GBP Manager</a>
          <h2 className="mt-2 text-3xl font-semibold tracking-tight text-slate-950">Q&amp;A Management</h2>
          <p className="mt-1 text-sm text-slate-500">Questions are synced nightly from Google Business Profile.</p>
        </div>

        {questions.length === 0 ? (
          <div className="rounded-3xl border border-slate-200 bg-white p-12 text-center shadow-sm">
            <p className="text-lg font-semibold text-slate-700">No questions yet</p>
            <p className="mt-2 text-sm text-slate-500">Questions will appear here after the nightly sync.</p>
          </div>
        ) : (
          <>
            {unanswered.length > 0 && (
              <div className="rounded-3xl border border-amber-200 bg-white shadow-sm overflow-hidden">
                <div className="border-b border-amber-100 px-6 py-4">
                  <p className="text-sm font-semibold uppercase tracking-[0.18em] text-amber-600">{unanswered.length} Unanswered</p>
                </div>
                <div className="divide-y divide-slate-100">
                  {unanswered.map((q) => (
                    <div key={q.id} className="px-6 py-5">
                      <p className="font-semibold text-slate-900">{q.questionText}</p>
                      <p className="mt-1 text-xs text-slate-400">{q.location.name} · {q.askedAt.toLocaleDateString()}</p>
                      <form action={async (fd) => { await answerGbpQuestionAction(fd); }} className="mt-4 flex flex-col gap-3">
                        <input type="hidden" name="questionId" value={q.id} />
                        <textarea name="answerText" required rows={3} placeholder="Write your answer…"
                          className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-900 focus:border-indigo-400 focus:outline-none focus:ring-2 focus:ring-indigo-100" />
                        <div>
                          <button type="submit" className="rounded-2xl bg-indigo-600 px-4 py-2 text-sm font-semibold text-white hover:bg-indigo-700 transition">
                            Post Answer to Google ↗
                          </button>
                        </div>
                      </form>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {answered.length > 0 && (
              <div className="rounded-3xl border border-slate-200 bg-white shadow-sm overflow-hidden">
                <div className="border-b border-slate-100 px-6 py-4">
                  <p className="text-sm font-semibold uppercase tracking-[0.18em] text-slate-400">{answered.length} Answered</p>
                </div>
                <div className="divide-y divide-slate-100">
                  {answered.map((q) => (
                    <div key={q.id} className="px-6 py-5">
                      <p className="font-semibold text-slate-900">{q.questionText}</p>
                      <p className="mt-2 rounded-2xl bg-slate-50 px-4 py-3 text-sm text-slate-700">{q.answerText}</p>
                      <p className="mt-2 text-xs text-emerald-600 font-semibold">✓ Published · {q.answeredAt?.toLocaleDateString()}</p>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </AppShell>
  );
}
