import { Icon, type IconName } from "@/components/icon";

/**
 * Compact portfolio summary tile: icon chip + label + value.
 * Mirrors the mockup's `PortStat` row used above the locations grid.
 */
export function PortfolioStat({
  icon,
  label,
  value,
  suffix,
  tone = "default",
}: {
  icon: IconName;
  label: string;
  value: string | number;
  suffix?: string;
  tone?: "default" | "warning";
}) {
  const warning = tone === "warning";
  return (
    <div className="card" style={{ padding: "16px 18px", display: "flex", alignItems: "center", gap: 13 }}>
      <span
        style={{
          width: 38, height: 38, borderRadius: 10, flex: "none", display: "grid", placeItems: "center",
          background: warning ? "var(--warning-soft)" : "var(--accent-soft)",
          color: warning ? "var(--warning)" : "var(--accent-strong)",
        }}
      >
        <Icon name={icon} size={18} />
      </span>
      <div style={{ minWidth: 0 }}>
        <div className="eyebrow" style={{ marginBottom: 5, whiteSpace: "nowrap" }}>{label}</div>
        <div style={{ display: "flex", alignItems: "baseline", gap: 3 }}>
          <span className="tnum" style={{ fontSize: 24, fontWeight: 700, letterSpacing: "-.02em", lineHeight: 1, color: warning ? "var(--warning)" : "var(--ink-900)" }}>
            {value}
          </span>
          {suffix ? <span style={{ fontSize: 14, fontWeight: 600, color: suffix === "★" ? "var(--star)" : "var(--ink-400)" }}>{suffix}</span> : null}
        </div>
      </div>
    </div>
  );
}
