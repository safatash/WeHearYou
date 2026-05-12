"use client";

import { useState } from "react";

export function CopyButton({ value, label = "Copy", copiedLabel = "Copied" }: { value: string; label?: string; copiedLabel?: string }) {
  const [copied, setCopied] = useState(false);

  async function handleCopy() {
    if (typeof navigator === "undefined" || !navigator.clipboard?.writeText) {
      return;
    }

    await navigator.clipboard.writeText(value);
    setCopied(true);
    window.setTimeout(() => setCopied(false), 2000);
  }

  return (
    <button
      type="button"
      onClick={() => void handleCopy()}
      className="rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm font-semibold text-slate-700 shadow-sm hover:border-slate-300 hover:text-slate-950"
    >
      {copied ? copiedLabel : label}
    </button>
  );
}
