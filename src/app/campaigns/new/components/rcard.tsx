import { ReactNode } from "react";

interface RCardProps {
  step: number;
  title: string;
  sub?: string;
  right?: ReactNode;
  children: ReactNode;
}

export function RCard({ step, title, sub, right, children }: RCardProps) {
  return (
    <div className="card" style={{ padding: "var(--card-pad)" }}>
      <div style={{ display: "flex", alignItems: "flex-start", gap: 13, marginBottom: 20 }}>
        <span
          style={{
            width: 28, height: 28, borderRadius: 8, flex: "none", display: "grid", placeItems: "center",
            background: "var(--accent-soft)", color: "var(--accent-strong)",
            fontSize: 13, fontWeight: 700, fontFamily: "var(--font-mono)",
          }}
        >
          {step}
        </span>
        <div style={{ minWidth: 0, flex: 1 }}>
          <h3 style={{ fontSize: 15.5, fontWeight: 660, letterSpacing: "-.01em", color: "var(--ink-900)" }}>{title}</h3>
          {sub ? <p style={{ fontSize: 12.5, color: "var(--ink-500)", marginTop: 3 }}>{sub}</p> : null}
        </div>
        {right ? <div style={{ flex: "none" }}>{right}</div> : null}
      </div>
      <div style={{ display: "flex", flexDirection: "column", gap: 18 }}>{children}</div>
    </div>
  );
}
