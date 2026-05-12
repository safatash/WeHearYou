import type { ReactNode } from "react";

type Tone = "positive" | "warning" | "neutral";

export function StatCard({ title, value, meta }: { title: string; value: string | number; meta: string }) {
  return (
    <div className="rounded-[28px] border border-slate-200/80 bg-white p-6 shadow-[0_12px_32px_rgba(15,23,42,0.05)]">
      <p className="text-sm font-semibold text-slate-500">{title}</p>
      <p className="mt-3 text-4xl font-semibold tracking-tight text-slate-950">{value}</p>
      <p className="mt-3 text-sm leading-6 text-slate-500">{meta}</p>
    </div>
  );
}

export function OutcomeCard({ title, count, tone }: { title: string; count: string; tone: Tone }) {
  const toneClasses =
    tone === "positive"
      ? "bg-emerald-50 text-emerald-700"
      : tone === "warning"
        ? "bg-amber-50 text-amber-700"
        : "bg-slate-100 text-slate-600";

  return (
    <div className="rounded-2xl border border-slate-100 bg-slate-50/90 p-4">
      <div className="flex items-center justify-between gap-3">
        <p className="font-semibold text-slate-900">{title}</p>
        <span className={`rounded-full px-3 py-1 text-xs font-semibold uppercase tracking-[0.18em] ${toneClasses}`}>
          {count}
        </span>
      </div>
    </div>
  );
}

export function Field({ label, value, multiline = false }: { label: string; value: string; multiline?: boolean }) {
  return (
    <div>
      <p className="mb-2 text-sm font-semibold text-slate-700">{label}</p>
      {multiline ? (
        <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-4 text-sm leading-7 text-slate-600">
          {value}
        </div>
      ) : (
        <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-600">
          {value}
        </div>
      )}
    </div>
  );
}

export function SectionHeading({ eyebrow, title, description, actions }: { eyebrow?: string; title: string; description?: string; actions?: ReactNode }) {
  return (
    <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
      <div>
        {eyebrow ? <p className="text-sm font-semibold uppercase tracking-[0.22em] text-indigo-600">{eyebrow}</p> : null}
        <h2 className="mt-2 text-4xl font-semibold tracking-tight text-slate-950">{title}</h2>
        {description ? <p className="mt-3 max-w-3xl text-slate-600">{description}</p> : null}
      </div>
      {actions ? <div className="flex flex-wrap gap-3">{actions}</div> : null}
    </div>
  );
}

export function PrimaryButton({ children }: { children: ReactNode }) {
  return <span className="inline-flex rounded-2xl bg-slate-950 px-5 py-3 text-sm font-semibold text-white shadow-sm">{children}</span>;
}

export function SecondaryButton({ children }: { children: ReactNode }) {
  return <span className="inline-flex rounded-2xl border border-slate-200 bg-white px-5 py-3 text-sm font-semibold text-slate-700 shadow-sm">{children}</span>;
}
