import Link from "next/link";
import { syncGoogleReviewsFromLocationsList } from "@/app/locations/actions";
import { FormSubmitButton } from "@/components/form-submit-button";
import { Icon } from "@/components/icon";
import { InlineStars } from "@/components/rating-display";
import { SOURCE_META, type LocationReputation } from "@/lib/location-reputation";
import type { getLocations } from "@/lib/locations";

type LocationWithHealth = Awaited<ReturnType<typeof getLocations>>[number];

/** Tiny inline trend sparkline rendered from cumulative-average points (0-5). */
function Sparkline({ points, tone }: { points: number[]; tone: "accent" | "warning" }) {
  const w = 108;
  const h = 40;
  const min = Math.min(...points);
  const max = Math.max(...points);
  const span = max - min || 1;
  const stroke = tone === "warning" ? "#d97706" : "#4f46e5";
  const coords = points.map((p, i) => {
    const x = points.length === 1 ? w : (i * w) / (points.length - 1);
    const y = h - 4 - ((p - min) / span) * (h - 8);
    return `${x.toFixed(1)},${y.toFixed(1)}`;
  });
  return (
    <svg width={w} height={h} viewBox={`0 0 ${w} ${h}`} className="shrink-0" aria-hidden="true">
      <polyline points={coords.join(" ")} fill="none" stroke={stroke} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function MiniStat({ label, value, warn }: { label: string; value: string | number; warn?: boolean }) {
  return (
    <div className="bg-white px-3 py-2.5 text-center">
      <div className={`text-base font-semibold tracking-tight ${warn ? "text-amber-600" : "text-slate-900"}`}>{value}</div>
      <div className="mt-0.5 text-[11px] text-slate-500">{label}</div>
    </div>
  );
}

export function LocationCard({ location, reputation }: { location: LocationWithHealth; reputation: LocationReputation }) {
  const attention = reputation.health === "attention";
  const up = reputation.ratingDelta !== null && reputation.ratingDelta >= 0;

  const canRetrySync =
    location.lastSyncStatus === "error" && Boolean(location.googleLocationName) && location.googleMappingHealth?.status !== "malformed";

  return (
    <div className="flex flex-col gap-4 rounded-3xl border border-slate-200/80 bg-white p-5 shadow-[0_12px_32px_rgba(15,23,42,0.05)]">
      {/* header */}
      <div className="flex items-start gap-3">
        <span
          className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl"
          style={{ background: `hsl(${reputation.hue} 42% 94%)`, color: `hsl(${reputation.hue} 55% 32%)` }}
        >
          <Icon name="pin" size={20} />
        </span>
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <h3 className="truncate text-base font-semibold tracking-tight text-slate-950">
              <Link href={`/locations/${location.id}`} className="hover:text-indigo-600">
                {location.name}
              </Link>
            </h3>
            <span
              className={`inline-flex shrink-0 items-center gap-1.5 rounded-full px-2.5 py-0.5 text-[11px] font-semibold ${
                attention ? "bg-amber-50 text-amber-700" : "bg-emerald-50 text-emerald-700"
              }`}
            >
              <span className={`h-1.5 w-1.5 rounded-full ${attention ? "bg-amber-500" : "bg-emerald-500"}`} />
              {attention ? "Needs attention" : "Healthy"}
            </span>
          </div>
          <p className="mt-1 truncate text-xs text-slate-500">
            {location.city}, {location.state}
          </p>
        </div>
      </div>

      {/* rating + trend */}
      <div className="flex items-center justify-between gap-3">
        <div>
          <div className="flex items-baseline gap-2">
            <span className="text-3xl font-semibold tracking-tight text-slate-950">{reputation.rating !== null ? reputation.rating.toFixed(1) : "—"}</span>
            {reputation.rating !== null ? <InlineStars value={reputation.rating} size={15} /> : null}
          </div>
          <div className="mt-1.5 flex items-center gap-2">
            <span className="text-xs text-slate-500">{reputation.reviewCount.toLocaleString()} reviews</span>
            {reputation.ratingDelta !== null && reputation.ratingDelta !== 0 ? (
              <span
                className={`inline-flex items-center gap-0.5 rounded-full px-1.5 py-0.5 text-[11px] font-semibold ${
                  up ? "bg-emerald-50 text-emerald-700" : "bg-rose-50 text-rose-700"
                }`}
              >
                <Icon name="arrowUp" size={10} style={{ transform: up ? "none" : "rotate(180deg)" }} />
                {up ? "+" : ""}
                {reputation.ratingDelta.toFixed(1)}
              </span>
            ) : null}
          </div>
        </div>
        {reputation.spark.length > 0 ? <Sparkline points={reputation.spark} tone={attention ? "warning" : "accent"} /> : null}
      </div>

      {/* mini stats */}
      <div className="grid grid-cols-3 gap-px overflow-hidden rounded-2xl border border-slate-200 bg-slate-200">
        <MiniStat label="Response rate" value={reputation.responseRate !== null ? `${reputation.responseRate}%` : "—"} warn={reputation.responseRate !== null && reputation.responseRate < 75} />
        <MiniStat label="Pending" value={reputation.pending} warn={reputation.pending >= 5} />
        <MiniStat label="New (30d)" value={reputation.newThisMonth} />
      </div>

      {/* sources + gbp */}
      <div className="flex items-center gap-2.5">
        <div className="flex items-center">
          {reputation.sources.map((s, i) => {
            const m = SOURCE_META[s];
            return (
              <span
                key={s}
                title={m.label}
                className={`flex h-5 w-5 items-center justify-center rounded-md border-[1.5px] border-white text-[10px] font-bold text-white ${m.dotClass} ${i === 0 ? "" : "-ml-1.5"}`}
              >
                {m.letter}
              </span>
            );
          })}
        </div>
        <span className="text-[11px] text-slate-500">
          {reputation.sources.length} {reputation.sources.length === 1 ? "source" : "sources"}
        </span>
        <span className={`ml-auto inline-flex items-center gap-1.5 text-[11px] font-medium ${reputation.gbpConnected ? "text-emerald-600" : "text-slate-400"}`}>
          <Icon name={reputation.gbpConnected ? "check" : "plug"} size={13} />
          {reputation.gbpConnected ? "Google Business linked" : "GBP not linked"}
        </span>
      </div>

      <div className="h-px bg-slate-100" />

      {canRetrySync ? (
        <form action={syncGoogleReviewsFromLocationsList}>
          <input type="hidden" name="locationId" value={location.id} />
          <FormSubmitButton
            idleLabel="Retry sync"
            pendingLabel="Retrying..."
            className="w-full rounded-2xl border border-rose-200 bg-rose-50 px-3 py-2 text-xs font-semibold text-rose-700 hover:border-rose-300 hover:text-rose-800 disabled:cursor-not-allowed disabled:border-slate-200 disabled:bg-white disabled:text-slate-400"
          />
        </form>
      ) : null}

      {/* actions */}
      <div className="flex gap-2">
        <Link
          href={`/locations/${location.id}`}
          className="flex flex-1 items-center justify-center gap-1.5 rounded-2xl border border-slate-200 bg-white px-3 py-2 text-sm font-semibold text-slate-700 hover:border-slate-300 hover:text-slate-950"
        >
          <Icon name="star" size={14} />
          View details
        </Link>
        <Link
          href={`/locations/${location.id}`}
          title="Manage settings"
          className="flex items-center justify-center rounded-2xl border border-slate-200 bg-white px-3 py-2 text-slate-600 hover:border-slate-300 hover:text-slate-950"
        >
          <Icon name="settings" size={15} />
        </Link>
      </div>
    </div>
  );
}
