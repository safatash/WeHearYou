"use client";

import { useEffect, useState } from "react";

export function FlashToast({
  tone = "success",
  message,
}: {
  tone?: "success" | "error" | "info";
  message: string;
}) {
  const [visible, setVisible] = useState(true);

  useEffect(() => {
    const timer = window.setTimeout(() => setVisible(false), 3200);
    return () => window.clearTimeout(timer);
  }, []);

  if (!visible || !message) {
    return null;
  }

  const toneClasses =
    tone === "error"
      ? "border-rose-200 bg-rose-50 text-rose-800"
      : tone === "info"
        ? "border-indigo-200 bg-indigo-50 text-indigo-800"
        : "border-emerald-200 bg-emerald-50 text-emerald-800";

  return (
    <div className={`rounded-2xl border px-4 py-3 text-sm shadow-sm ${toneClasses}`}>
      <div className="flex items-start justify-between gap-3">
        <p>{message}</p>
        <button type="button" onClick={() => setVisible(false)} className="font-semibold opacity-70 hover:opacity-100">
          ×
        </button>
      </div>
    </div>
  );
}
