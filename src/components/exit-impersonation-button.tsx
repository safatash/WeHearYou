'use client';

import { stopImpersonation } from "@/app/admin/actions";

export function ExitImpersonationButton() {
  return (
    <form action={stopImpersonation}>
      <button
        type="submit"
        style={{
          borderRadius: "var(--r-md)",
          background: "#78350f",
          paddingLeft: 12,
          paddingRight: 12,
          paddingTop: 6,
          paddingBottom: 6,
          fontSize: 12,
          fontWeight: 600,
          color: "white",
          cursor: "pointer",
          transition: "all 0.2s ease",
        }}
        onMouseEnter={(e) => {
          e.currentTarget.style.background = "#451a03";
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.background = "#78350f";
        }}
      >
        Exit impersonation
      </button>
    </form>
  );
}
