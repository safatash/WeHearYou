'use client';

export function SearchInput() {
  return (
    <input
      type="text"
      placeholder="Search..."
      style={{
        borderRadius: "9999px",
        border: "1px solid var(--ink-200)",
        background: "var(--white)",
        padding: "8px 16px",
        fontSize: 14,
        color: "var(--ink-600)",
        width: 256,
        transition: "all 0.2s ease",
      }}
      onFocus={(e) => {
        e.currentTarget.style.borderColor = "var(--accent)";
        e.currentTarget.style.boxShadow = "0 0 0 3px var(--accent-ring)";
      }}
      onBlur={(e) => {
        e.currentTarget.style.borderColor = "var(--ink-200)";
        e.currentTarget.style.boxShadow = "none";
      }}
    />
  );
}
