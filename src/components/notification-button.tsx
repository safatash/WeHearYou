"use client";

import { Icon } from "@/components/icon";

/**
 * Notifications entry point.
 *
 * Was a raw 🔔 emoji in a bordered box: no accessible name, inconsistent glyph
 * rendering across platforms, and a target below the 40px minimum. Now a
 * canonical icon button.
 */
export function NotificationButton() {
  return (
    <button type="button" className="icon-btn focus-ring" aria-label="Notifications">
      <Icon name="bell" size={18} aria-hidden="true" />
    </button>
  );
}
