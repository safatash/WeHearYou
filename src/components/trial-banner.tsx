"use client";

import { useSyncExternalStore } from "react";
import Link from "next/link";
import { Icon } from "@/components/icon";

const KEY = "why_trial_banner_dismissed";

const listeners = new Set<() => void>();
function subscribe(cb: () => void) {
  listeners.add(cb);
  return () => listeners.delete(cb);
}
function getSnapshot() {
  try {
    return sessionStorage.getItem(KEY) === "1";
  } catch {
    return false;
  }
}
function getServerSnapshot() {
  return false;
}
function dismiss() {
  try {
    sessionStorage.setItem(KEY, "1");
  } catch {
    // ignore storage access errors
  }
  listeners.forEach((l) => l());
}

export function TrialBanner({ daysLeft }: { daysLeft: number }) {
  const dismissed = useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
  if (dismissed) return null;

  const urgent = daysLeft <= 3;
  const bg = urgent ? "var(--warning-soft)" : "var(--accent-soft)";
  const border = urgent ? "var(--warning)" : "var(--accent-border)";
  const fg = urgent ? "var(--warning)" : "var(--accent-strong)";

  return (
    <div
      style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 16, borderBottom: `1px solid ${border}`, background: bg, paddingLeft: 16, paddingRight: 16, paddingTop: 10, paddingBottom: 10 }}
      className="lg:px-8"
    >
      <p style={{ fontSize: 13.5, fontWeight: 600, color: fg, margin: 0 }}>
        🎉 {daysLeft} day{daysLeft === 1 ? "" : "s"} left in your free trial — no credit card needed yet.{" "}
        <Link href="/billing" style={{ textDecoration: "underline" }}>Upgrade now →</Link>
      </p>
      <button
        type="button"
        onClick={dismiss}
        aria-label="Dismiss"
        style={{ border: 0, background: "transparent", color: fg, cursor: "pointer", display: "grid", placeItems: "center", padding: 4 }}
      >
        <Icon name="close" size={16} />
      </button>
    </div>
  );
}
