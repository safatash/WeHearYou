export const dynamic = "force-dynamic";

import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { submitFollowUpResponse } from "./actions";

export default async function FollowUpPage({
  params,
  searchParams,
}: {
  params: Promise<{ token: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const { token } = await params;
  const query = await searchParams;
  const done = query.done === "1";

  const followUp = await prisma.resolutionFollowUp.findUnique({
    where: { token },
    include: { case: { include: { location: { select: { name: true } } } } },
  });
  if (!followUp) notFound();

  const field = "w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 text-sm text-slate-800";
  const businessName = followUp.case.location.name;

  return (
    <main className="min-h-screen bg-slate-50 px-4 py-10 text-slate-900 sm:px-6">
      <div className="mx-auto max-w-xl rounded-[32px] border border-slate-200 bg-white p-8 shadow-[0_16px_50px_rgba(15,23,42,0.08)] sm:p-10">
        {done || followUp.respondedAt ? (
          <div className="text-center">
            <h1 className="text-2xl font-semibold tracking-tight text-slate-950">Thank you for the update.</h1>
            <p className="mt-3 text-sm text-slate-600">{businessName} has received your response.</p>
          </div>
        ) : (
          <form action={submitFollowUpResponse}>
            <input type="hidden" name="token" value={token} />
            <h1 className="text-2xl font-semibold tracking-tight text-slate-950 sm:text-3xl">Has your concern been addressed?</h1>
            <p className="mt-2 text-sm text-slate-600">A quick update helps {businessName} make sure things are resolved.</p>
            <div className="mt-5 grid gap-2">
              {([["YES", "Yes"], ["PARTIALLY", "Partially"], ["NO", "No"]] as const).map(([val, label], i) => (
                <label key={val} className="flex items-center gap-3 rounded-xl border border-slate-200 px-4 py-3 text-sm font-medium text-slate-700">
                  <input type="radio" name="response" value={val} required={i === 0} />
                  {label}
                </label>
              ))}
            </div>
            <label className="mt-4 grid gap-1.5 text-sm font-semibold text-slate-700">
              What still needs attention? <span className="font-normal text-slate-400">(optional)</span>
              <textarea name="detail" rows={3} className={field} />
            </label>
            <button type="submit" className="mt-6 inline-flex rounded-2xl bg-indigo-600 px-5 py-3 text-sm font-semibold text-white hover:bg-indigo-700">Send update</button>
          </form>
        )}
      </div>
    </main>
  );
}
