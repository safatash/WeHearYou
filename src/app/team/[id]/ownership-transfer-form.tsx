"use client";

import { useState } from "react";

const CONFIRM_PHRASE = "transfer ownership";

export function OwnershipTransferForm({
  membershipId,
  targetName,
  transferAction,
}: {
  membershipId: string;
  targetName: string;
  transferAction: (formData: FormData) => Promise<void>;
}) {
  const [phrase, setPhrase] = useState("");
  const isConfirmed = phrase.trim().toLowerCase() === CONFIRM_PHRASE;

  return (
    <form action={transferAction} className="space-y-5">
      <input type="hidden" name="membershipId" value={membershipId} />

      {/* Consequence copy */}
      <div className="rounded-2xl border border-amber-200 bg-amber-50 px-5 py-4 space-y-2">
        <p className="text-sm font-semibold text-amber-900">Before you transfer</p>
        <ul className="list-disc list-inside space-y-1 text-sm text-amber-800">
          <li><strong>{targetName}</strong> will become the new workspace Owner.</li>
          <li>You will be demoted to Agency Admin immediately.</li>
          <li>You will lose the ability to transfer ownership again.</li>
          <li>This action cannot be undone without the new owner's cooperation.</li>
        </ul>
      </div>

      {/* Typed confirmation */}
      <div>
        <label className="block text-sm font-semibold text-slate-700 mb-2">
          Type <span className="font-mono font-bold text-slate-950">{CONFIRM_PHRASE}</span> to confirm
        </label>
        <input
          type="text"
          name="confirmPhrase"
          value={phrase}
          onChange={(e) => setPhrase(e.target.value)}
          autoComplete="off"
          spellCheck={false}
          placeholder={CONFIRM_PHRASE}
          className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-900 focus:border-indigo-400 focus:outline-none focus:ring-2 focus:ring-indigo-100"
        />
      </div>

      <button
        type="submit"
        disabled={!isConfirmed}
        className="w-full rounded-2xl border border-amber-300 bg-amber-100 px-5 py-3 text-sm font-semibold text-amber-900 shadow-sm transition hover:bg-amber-200 disabled:cursor-not-allowed disabled:opacity-40"
      >
        Transfer ownership to {targetName}
      </button>
    </form>
  );
}
