"use client";

import { Icon, type IconName } from "@/components/icon";

interface OptionCardProps {
  icon?: IconName;
  title: string;
  desc: string;
  on: boolean;
  onClick: () => void;
  kind?: "radio" | "check";
}

export function OptionCard({ icon, title, desc, on, onClick, kind = "radio" }: OptionCardProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="tap focus-ring"
      aria-pressed={on}
      style={{
        display: "flex", alignItems: "flex-start", gap: 12, padding: 14, borderRadius: "var(--r-md)",
        cursor: "pointer", textAlign: "left", width: "100%",
        border: on ? "1.5px solid var(--accent)" : "1px solid var(--ink-200)",
        background: on ? "var(--accent-softer)" : "var(--white)",
        boxShadow: on ? "0 0 0 3px var(--accent-ring)" : "none",
        transition: "all .14s",
      }}
    >
      {icon ? (
        <span
          style={{
            width: 36, height: 36, borderRadius: 9, flex: "none", display: "grid", placeItems: "center",
            background: on ? "var(--accent)" : "var(--ink-100)", color: on ? "#fff" : "var(--ink-500)", transition: "all .14s",
          }}
        >
          <Icon name={icon} size={18} />
        </span>
      ) : null}
      <span style={{ flex: 1, minWidth: 0 }}>
        <span style={{ display: "block", fontSize: 14, fontWeight: 620, color: "var(--ink-900)" }}>{title}</span>
        <span style={{ display: "block", fontSize: 12, color: "var(--ink-400)", marginTop: 2, lineHeight: 1.4 }}>{desc}</span>
      </span>
      <span
        style={{
          width: 20, height: 20, flex: "none", borderRadius: kind === "radio" ? "50%" : 6, display: "grid", placeItems: "center",
          border: on ? "0" : "1.5px solid var(--ink-300)", background: on ? "var(--accent)" : "transparent", color: "#fff", marginTop: 1,
        }}
      >
        {on ? <Icon name="check" size={13} /> : null}
      </span>
    </button>
  );
}
