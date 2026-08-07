"use client";

import { Icon } from "@/components/icon";

/**
 * Notifications entry point. Ghost icon button per
 * design-reference/screens/app.jsx (TopActions) — the bordered box was a
 * repo-local invention, and the 🔔 emoji before that had no accessible name.
 */
export function NotificationButton({ unread = false }: { unread?: boolean }) {
  return (
    <button
      type="button"
      className="btn btn-ghost btn-icon focus-ring"
      aria-label={unread ? "Notifications, unread" : "Notifications"}
      style={{ position: "relative" }}
    >
      <Icon name="bell" size={18} aria-hidden="true" />
      {unread && (
        <span
          aria-hidden="true"
          style={{
            position: "absolute",
            top: 7,
            right: 8,
            width: 7,
            height: 7,
            borderRadius: "50%",
            background: "var(--danger)",
            border: "2px solid var(--white)",
          }}
        />
      )}
    </button>
  );
}
