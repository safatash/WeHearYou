"use client";

import { useSyncExternalStore } from "react";
import Link from "next/link";
import { Icon } from "@/components/icon";

/**
 * Trial status banner.
 *
 * Two variants, because the countdown previously just vanished at expiry: the
 * banner was gated on `trialEndsAt > now`, so the moment the trial lapsed the
 * only prompt to pay disappeared and the product went quiet. A lapsed trial now
 * keeps a standing call to action.
 *
 * The ended variant deliberately does not claim access is blocked — enforcement
 * is still gated behind BILLING_ENFORCEMENT, so it would be untrue today.
 */

const DISMISS_KEYS = {
  countdown: "why_trial_banner_dismissed",
  ended: "why_trial_ended_banner_dismissed",
} as const;

type Variant = keyof typeof DISMISS_KEYS;

const listeners = new Set<() => void>();
function subscribe(cb: () => void) {
  listeners.add(cb);
  return () => listeners.delete(cb);
}
function readDismissed(key: string) {
  try {
    return sessionStorage.getItem(key) === "1";
  } catch {
    return false;
  }
}
function dismiss(key: string) {
  try {
    sessionStorage.setItem(key, "1");
  } catch {
    // ignore storage access errors
  }
  listeners.forEach((l) => l());
}

export type TrialBannerProps =
  | { ended: true; daysLeft?: never }
  | { ended?: false; daysLeft: number };

export function TrialBanner(props: TrialBannerProps) {
  const variant: Variant = props.ended ? "ended" : "countdown";
  const key = DISMISS_KEYS[variant];

  // Separate keys per variant: dismissing "3 days left" must not also hide the
  // ended banner when the trial lapses later in the same session.
  const dismissed = useSyncExternalStore(
    subscribe,
    () => readDismissed(key),
    () => false,
  );
  if (dismissed) return null;

  const urgent = variant === "ended" || props.daysLeft! <= 3;

  // Text colours use the -ink tokens: --warning is 2.15:1 and --accent-strong
  // 4.08:1 on their own soft fills, both below WCAG AA for this size.
  const bg = urgent ? "var(--warning-soft)" : "var(--accent-soft)";
  const border = urgent ? "color-mix(in srgb, var(--warning) 45%, var(--white))" : "var(--accent-border)";
  const fg = urgent ? "var(--warning-ink)" : "var(--accent-ink)";

  return (
    <div
      role="status"
      style={{
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        gap: 16,
        borderBottom: `1px solid ${border}`,
        background: bg,
        padding: "10px 16px",
      }}
      className="lg:px-8"
    >
      <p style={{ fontSize: 13.5, fontWeight: 600, color: fg, margin: 0 }}>
        <Icon name="sparkles" size={15} aria-hidden="true" style={{ verticalAlign: "-2px", marginRight: 6 }} />
        {props.ended ? (
          <>
            Your 14-day free trial has ended. Choose a plan to keep full access.{" "}
            <Link href="/billing" style={{ textDecoration: "underline", color: "inherit" }}>
              View plans →
            </Link>
          </>
        ) : (
          <>
            {props.daysLeft} day{props.daysLeft === 1 ? "" : "s"} left in your free trial — no credit card needed yet.{" "}
            <Link href="/billing" style={{ textDecoration: "underline", color: "inherit" }}>
              Upgrade now →
            </Link>
          </>
        )}
      </p>
      <button
        type="button"
        onClick={() => dismiss(key)}
        aria-label={props.ended ? "Dismiss trial ended notice" : "Dismiss trial notice"}
        className="focus-ring"
        style={{
          border: 0,
          background: "transparent",
          color: fg,
          cursor: "pointer",
          display: "grid",
          placeItems: "center",
          padding: 4,
          borderRadius: "var(--r-xs)",
          flex: "none",
        }}
      >
        <Icon name="close" size={16} />
      </button>
    </div>
  );
}
