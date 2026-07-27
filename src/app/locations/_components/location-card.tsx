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
  const coords = points.map((p, i) => {
    const x = points.length === 1 ? w : (i * w) / (points.length - 1);
    const y = h - 4 - ((p - min) / span) * (h - 8);
    return `${x.toFixed(1)},${y.toFixed(1)}`;
  });
  return (
    <svg width={w} height={h} viewBox={`0 0 ${w} ${h}`} style={{ flex: "none" }} aria-hidden="true">
      <polyline
        points={coords.join(" ")}
        fill="none"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
        style={{ stroke: tone === "warning" ? "var(--warning)" : "var(--accent)" }}
      />
    </svg>
  );
}

function MiniStat({ label, value, warn }: { label: string; value: string | number; warn?: boolean }) {
  return (
    <div style={{ background: "var(--white)", padding: "11px 12px", textAlign: "center" }}>
      <div className="tnum" style={{ fontSize: 17, fontWeight: 680, letterSpacing: "-.02em", color: warn ? "var(--warning)" : "var(--ink-900)" }}>
        {value}
      </div>
      <div style={{ fontSize: 10.5, color: "var(--ink-400)", marginTop: 3 }}>{label}</div>
    </div>
  );
}

export function LocationCard({ location, reputation }: { location: LocationWithHealth; reputation: LocationReputation }) {
  const attention = reputation.health === "attention";
  const up = reputation.ratingDelta !== null && reputation.ratingDelta >= 0;
  const status = attention
    ? { label: "Needs attention", cls: "badge-warning", dot: "var(--warning)" }
    : { label: "Healthy", cls: "badge-success", dot: "var(--success)" };

  const canRetrySync =
    location.lastSyncStatus === "error" && Boolean(location.googleLocationName) && location.googleMappingHealth?.status !== "malformed";

  return (
    <div className="card loc-card" style={{ padding: "var(--card-pad)", display: "flex", flexDirection: "column", gap: 16 }}>
      {/* header */}
      <div style={{ display: "flex", alignItems: "flex-start", gap: 12 }}>
        <span
          style={{ width: 42, height: 42, borderRadius: 11, flex: "none", display: "grid", placeItems: "center", background: `hsl(${reputation.hue} 42% 94%)`, color: `hsl(${reputation.hue} 55% 32%)` }}
        >
          <Icon name="pin" size={20} />
        </span>
        <div style={{ minWidth: 0, flex: 1 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <h3 style={{ fontSize: 15.5, fontWeight: 660, letterSpacing: "-.01em", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis", minWidth: 0 }}>
              <Link href={`/locations/${location.id}`} className="tap" style={{ color: "var(--ink-900)" }}>
                {location.name}
              </Link>
            </h3>
            <span className={`badge ${status.cls}`} style={{ flex: "none" }}>
              <span style={{ width: 6, height: 6, borderRadius: "50%", background: status.dot }} />
              {status.label}
            </span>
          </div>
          <div style={{ fontSize: 12.5, color: "var(--ink-400)", marginTop: 3, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
            {location.city}, {location.state}
          </div>
        </div>
      </div>

      {/* rating + trend */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12 }}>
        <div>
          <div style={{ display: "flex", alignItems: "baseline", gap: 8 }}>
            <span className="tnum" style={{ fontSize: 32, fontWeight: 700, letterSpacing: "-.03em", lineHeight: 1 }}>
              {reputation.rating !== null ? reputation.rating.toFixed(1) : "—"}
            </span>
            {reputation.rating !== null ? <InlineStars value={reputation.rating} size={15} /> : null}
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 7, marginTop: 7 }}>
            <span className="tnum" style={{ fontSize: 12.5, color: "var(--ink-500)" }}>{reputation.reviewCount.toLocaleString()} reviews</span>
            {reputation.ratingDelta !== null && reputation.ratingDelta !== 0 ? (
              <span
                className="badge"
                style={{
                  height: 18, paddingLeft: 5, fontSize: 11,
                  background: `color-mix(in srgb, ${up ? "var(--success)" : "var(--danger)"} 12%, #fff)`,
                  color: up ? "var(--success)" : "var(--danger)",
                }}
              >
                <Icon name="arrowUp" size={10} style={{ transform: up ? "none" : "rotate(180deg)" }} />
                <span className="tnum">{up ? "+" : ""}{reputation.ratingDelta.toFixed(1)}</span>
              </span>
            ) : null}
          </div>
        </div>
        {reputation.spark.length > 0 ? <Sparkline points={reputation.spark} tone={attention ? "warning" : "accent"} /> : null}
      </div>

      {/* mini stats */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 1, background: "var(--ink-150)", border: "1px solid var(--ink-150)", borderRadius: "var(--r-md)", overflow: "hidden" }}>
        <MiniStat label="Response rate" value={reputation.responseRate !== null ? `${reputation.responseRate}%` : "—"} warn={reputation.responseRate !== null && reputation.responseRate < 75} />
        <MiniStat label="Pending" value={reputation.pending} warn={reputation.pending >= 5} />
        <MiniStat label="New (30d)" value={reputation.newThisMonth} />
      </div>

      {/* sources + gbp */}
      <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
        <div style={{ display: "flex", alignItems: "center" }}>
          {reputation.sources.map((s, i) => {
            const m = SOURCE_META[s];
            return (
              <span
                key={s}
                title={m.label}
                className={m.dotClass}
                style={{ width: 20, height: 20, borderRadius: 6, display: "grid", placeItems: "center", fontSize: 10, fontWeight: 800, fontFamily: "var(--font-mono)", color: "#fff", border: "1.5px solid var(--white)", marginLeft: i === 0 ? 0 : -6 }}
              >
                {m.letter}
              </span>
            );
          })}
        </div>
        <span style={{ fontSize: 11.5, color: "var(--ink-400)" }}>
          {reputation.sources.length} {reputation.sources.length === 1 ? "source" : "sources"}
        </span>
        <span style={{ marginLeft: "auto", display: "inline-flex", alignItems: "center", gap: 5, fontSize: 11.5, fontWeight: 540, color: reputation.gbpConnected ? "var(--success)" : "var(--ink-400)" }}>
          <Icon name={reputation.gbpConnected ? "check" : "plug"} size={13} />
          {reputation.gbpConnected ? "Google Business linked" : "GBP not linked"}
        </span>
      </div>

      <div className="hr" />

      {canRetrySync ? (
        <form action={syncGoogleReviewsFromLocationsList}>
          <input type="hidden" name="locationId" value={location.id} />
          <FormSubmitButton
            idleLabel="Retry sync"
            pendingLabel="Retrying..."
            className="btn btn-sm"
            style={{ width: "100%", background: "var(--danger-soft)", color: "var(--danger)", border: "1px solid color-mix(in srgb, var(--danger) 26%, var(--white))" }}
          />
        </form>
      ) : null}

      {/* actions */}
      <div style={{ display: "flex", gap: 8 }}>
        <Link href={`/locations/${location.id}`} className="btn btn-secondary btn-sm" style={{ flex: 1 }}>
          <Icon name="star" size={14} />
          View details
        </Link>
        <Link href={`/locations/${location.id}`} title="Manage settings" className="btn btn-secondary btn-sm btn-icon">
          <Icon name="settings" size={15} />
        </Link>
      </div>
    </div>
  );
}
