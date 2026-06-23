"use client";

import { useState } from "react";
import { generateCaseResponseDraft } from "../actions";

export function CaseResponseDraft({ caseId }: { caseId: string }) {
  const [draft, setDraft] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  const generate = async () => {
    setLoading(true);
    setError(null);
    const res = await generateCaseResponseDraft(caseId);
    setLoading(false);
    if (!res.success) {
      setError(res.error ?? "Could not generate a draft.");
      return;
    }
    setDraft(res.draft ?? "");
  };

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(draft);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      /* ignore */
    }
  };

  return (
    <div>
      <button type="button" onClick={generate} disabled={loading}
        className="inline-flex items-center gap-2 rounded-2xl bg-indigo-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-indigo-700 disabled:opacity-50">
        {loading ? "Drafting…" : "✨ Draft Response"}
      </button>
      {error && <p className="mt-2 text-sm text-rose-600">{error}</p>}
      {draft && (
        <div className="mt-3">
          <textarea value={draft} onChange={(e) => setDraft(e.target.value)} rows={6}
            className="w-full resize-y rounded-xl border border-slate-200 bg-slate-50 px-3 py-3 text-sm leading-7 text-slate-800" />
          <div className="mt-2 flex items-center gap-3">
            <button type="button" onClick={copy} className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50">{copied ? "Copied!" : "Copy"}</button>
            <span className="text-xs text-slate-400">Review and edit before sending. Nothing is sent automatically.</span>
          </div>
        </div>
      )}
    </div>
  );
}
