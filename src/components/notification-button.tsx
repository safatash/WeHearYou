'use client';

export function NotificationButton() {
  return (
    <button
      style={{
        borderRadius: "var(--r-md)",
        border: "1px solid var(--ink-200)",
        background: "var(--white)",
        padding: "8px 12px",
        fontSize: 14,
        fontWeight: 600,
        color: "var(--ink-600)",
        cursor: "pointer",
        transition: "all 0.2s ease",
      }}
      onMouseEnter={(e) => {
        e.currentTarget.style.background = "var(--ink-50)";
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.background = "var(--white)";
      }}
    >
      🔔
    </button>
  );
}
