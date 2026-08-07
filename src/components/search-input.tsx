"use client";

import { Icon } from "@/components/icon";

/**
 * Global search field.
 *
 * NOTE: there is no search backend or results route yet — this control is
 * currently inert. It is rendered disabled and labelled as such rather than
 * accepting input it cannot act on, because a search box that silently does
 * nothing is a trust problem, not a cosmetic one. Wire it to a results route
 * and drop `disabled` when the backend lands.
 */
export function SearchInput() {
  return (
    <div style={{ position: "relative", display: "flex", alignItems: "center", maxWidth: 320, flex: 1 }}>
      <span
        aria-hidden="true"
        style={{ position: "absolute", left: 11, display: "flex", color: "var(--ink-400)", pointerEvents: "none" }}
      >
        <Icon name="search" size={15} />
      </span>
      <label htmlFor="global-search" className="sr-only">
        Search
      </label>
      <input
        id="global-search"
        type="search"
        placeholder="Search (coming soon)"
        disabled
        title="Global search is not available yet"
        style={{
          width: "100%",
          borderRadius: "var(--r-full)",
          border: "1px solid var(--ink-200)",
          background: "var(--ink-50)",
          padding: "8px 14px 8px 32px",
          fontSize: 13.5,
          color: "var(--ink-600)",
          cursor: "not-allowed",
        }}
      />
    </div>
  );
}
