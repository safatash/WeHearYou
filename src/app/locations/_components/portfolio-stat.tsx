import { Icon, type IconName } from "@/components/icon";

/**
 * Compact portfolio summary tile: icon + label + value.
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
    <div className="flex items-center gap-3 rounded-3xl border border-slate-200/80 bg-white p-4 shadow-[0_12px_32px_rgba(15,23,42,0.05)]">
      <span
        className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl ${
          warning ? "bg-amber-50 text-amber-600" : "bg-indigo-50 text-indigo-600"
        }`}
      >
        <Icon name={icon} size={18} />
      </span>
      <div className="min-w-0">
        <p className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">{label}</p>
        <p className="mt-1 flex items-baseline gap-1">
          <span className={`text-2xl font-semibold tracking-tight ${warning ? "text-amber-600" : "text-slate-950"}`}>{value}</span>
          {suffix ? <span className={`text-base font-semibold ${suffix === "★" ? "text-amber-400" : "text-slate-400"}`}>{suffix}</span> : null}
        </p>
      </div>
    </div>
  );
}
