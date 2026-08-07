"use client";

import { Icon } from "@/components/icon";

/**
 * Global search, per design-reference/screens/app.jsx (TopActions).
 *
 * NOTE: there is still no search backend or results route, so the field is
 * rendered disabled and labelled rather than accepting input it cannot act on.
 * Drop `disabled`, restore the ⌘K hint and wire a results route when the
 * backend lands.
 */
export function SearchInput() {
  return (
    <div style={{ position: "relative", width: 230 }} className="hidden md:block">
      <span
        aria-hidden="true"
        style={{ position: "absolute", left: 11, top: 11, display: "flex", color: "var(--ink-400)", pointerEvents: "none" }}
      >
        <Icon name="search" size={16} />
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
          height: 38,
          paddingLeft: 34,
          paddingRight: 12,
          borderRadius: "var(--r-sm)",
          border: "1px solid var(--ink-200)",
          background: "var(--ink-50)",
          fontSize: 13.5,
          color: "var(--ink-600)",
          cursor: "not-allowed",
        }}
      />
    </div>
  );
}
