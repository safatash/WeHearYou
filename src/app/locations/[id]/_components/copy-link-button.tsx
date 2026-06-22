"use client";
import { useState } from "react";

export function CopyLinkButton({ url, label = "Copy public link", className = "" }: { url: string; label?: string; className?: string }) {
  const [copied, setCopied] = useState(false);
  return (
    <button
      type="button"
      onClick={async () => {
        await navigator.clipboard.writeText(url);
        setCopied(true);
        setTimeout(() => setCopied(false), 1500);
      }}
      className={className || "inline-flex items-center gap-2 rounded-xl border border-[var(--ink-200)] bg-white px-3 py-2 text-sm font-semibold text-[var(--ink-700)] hover:bg-[var(--ink-50)] transition"}
    >
      {copied ? "Copied ✓" : label}
    </button>
  );
}
