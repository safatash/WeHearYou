"use client";

import { useState } from "react";

export function PublicShareButton({ title, url }: { title: string; url: string }) {
  const [copied, setCopied] = useState(false);

  async function handleShare() {
    if (typeof navigator !== "undefined" && navigator.share) {
      try {
        await navigator.share({ title, url });
        return;
      } catch {
        // fall through to clipboard copy
      }
    }

    if (typeof navigator !== "undefined" && navigator.clipboard?.writeText) {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 2000);
    }
  }

  return (
    <button
      type="button"
      onClick={() => void handleShare()}
      className="rounded-2xl border border-slate-200 bg-white px-5 py-3 text-sm font-semibold !text-slate-950 visited:!text-slate-950 hover:!text-slate-950 shadow-sm transition hover:border-slate-300"
    >
      {copied ? "Link copied" : "Share"}
    </button>
  );
}
