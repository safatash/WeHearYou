import type { ReactNode } from "react";

/**
 * Shared surface primitives.
 *
 * These were the last holdout of the legacy Tailwind `slate-*` palette: 28px
 * radii, bespoke shadows, `text-4xl` headings and an indigo eyebrow, none of
 * which exist in the token system. They now read from the same tokens as the
 * rest of the app (see globals.css).
 *
 * `PrimaryButton` / `SecondaryButton` used to live here as near-black
 * (`bg-slate-950`) pills. They had no consumers and contradicted the canonical
 * `.btn` classes, so they are gone — use `.btn .btn-primary` / `.btn-secondary`.
 */

type Tone = "positive" | "warning" | "neutral";

/** A single headline figure. One radius, one shadow, one type scale. */
export function StatCard({ title, value, meta }: { title: string; value: string | number; meta: string }) {
  return (
    <div className="card" style={{ padding: "var(--card-pad)" }}>
      <p style={{ margin: 0, fontSize: 12.5, fontWeight: 580, color: "var(--ink-500)" }}>{title}</p>
      <p
        className="tnum"
        style={{ margin: "8px 0 0", fontSize: 30, fontWeight: 680, letterSpacing: "-0.025em", color: "var(--ink-900)" }}
      >
        {value}
      </p>
      <p style={{ margin: "8px 0 0", fontSize: 12.5, lineHeight: 1.5, color: "var(--ink-500)" }}>{meta}</p>
    </div>
  );
}

/**
 * A labelled count with a semantic tone. Tone drives a badge whose text is the
 * count itself, so the meaning never rests on colour alone.
 */
export function OutcomeCard({ title, count, tone }: { title: string; count: string; tone: Tone }) {
  const badgeClass =
    tone === "positive" ? "badge badge-success" : tone === "warning" ? "badge badge-warning" : "badge badge-neutral";

  return (
    <div
      style={{
        borderRadius: "var(--r-md)",
        border: "1px solid var(--ink-200)",
        background: "var(--ink-50)",
        padding: "12px 14px",
      }}
    >
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12 }}>
        <p style={{ margin: 0, fontSize: 13.5, fontWeight: 600, color: "var(--ink-800)" }}>{title}</p>
        <span className={badgeClass}>{count}</span>
      </div>
    </div>
  );
}

/** A read-only labelled value. */
export function Field({ label, value, multiline = false }: { label: string; value: string; multiline?: boolean }) {
  return (
    <div>
      <p style={{ margin: "0 0 6px", fontSize: 12.5, fontWeight: 580, color: "var(--ink-700)" }}>{label}</p>
      <div
        style={{
          borderRadius: "var(--r-sm)",
          border: "1px solid var(--ink-200)",
          background: "var(--ink-50)",
          padding: multiline ? "12px 14px" : "9px 12px",
          fontSize: 13.5,
          lineHeight: multiline ? 1.6 : 1.4,
          color: "var(--ink-700)",
        }}
      >
        {value}
      </div>
    </div>
  );
}

/**
 * The canonical page header. Eyebrow is optional and only earns its place when
 * it carries meaning the title cannot.
 */
export function SectionHeading({
  eyebrow,
  title,
  description,
  actions,
}: {
  eyebrow?: string;
  title: string;
  description?: string;
  actions?: ReactNode;
}) {
  return (
    <div className="page-header">
      <div style={{ minWidth: 0 }}>
        {eyebrow ? <p className="eyebrow" style={{ margin: "0 0 6px" }}>{eyebrow}</p> : null}
        <h1 className="page-title">{title}</h1>
        {description ? <p className="page-description">{description}</p> : null}
      </div>
      {actions ? <div className="page-actions">{actions}</div> : null}
    </div>
  );
}

/**
 * The shared empty state. Every module's "no data yet" should look like this so
 * a blank region always reads as deliberate rather than broken.
 */
export function EmptyState({
  title,
  body,
  action,
}: {
  title: string;
  body?: string;
  action?: ReactNode;
}) {
  return (
    <div className="empty-state">
      <p className="empty-state-title">{title}</p>
      {body ? <p className="empty-state-body">{body}</p> : null}
      {action ? <div style={{ marginTop: 14 }}>{action}</div> : null}
    </div>
  );
}
