"use client";

import { useEffect, useRef, useState } from "react";

/* ---------- Tiny sparkline ---------- */
export function Sparkline({
  data = [],
  w = 96,
  h = 30,
  color = "var(--accent)",
  fill = true,
}: {
  data: number[];
  w?: number;
  h?: number;
  color?: string;
  fill?: boolean;
}) {
  if (data.length < 2) return <svg width={w} height={h} />;
  const max = Math.max(...data);
  const min = Math.min(...data);
  const rng = max - min || 1;
  const pts = data.map((d, i) => [(i / (data.length - 1)) * w, h - 4 - ((d - min) / rng) * (h - 8)] as const);
  const line = pts.map((p, i) => `${i ? "L" : "M"}${p[0].toFixed(1)},${p[1].toFixed(1)}`).join(" ");
  const area = `${line} L${w},${h} L0,${h} Z`;
  const gid = useRef("sg" + Math.random().toString(36).slice(2, 7)).current;
  const last = pts[pts.length - 1];
  return (
    <svg viewBox={`0 0 ${w} ${h}`} width={w} height={h} style={{ display: "block", overflow: "visible" }}>
      <defs>
        <linearGradient id={gid} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor={color} stopOpacity="0.18" />
          <stop offset="1" stopColor={color} stopOpacity="0" />
        </linearGradient>
      </defs>
      {fill && <path d={area} fill={`url(#${gid})`} />}
      <path d={line} fill="none" stroke={color} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
      <circle cx={last[0]} cy={last[1]} r="2.4" fill={color} />
    </svg>
  );
}

/* ---------- Rating + volume trend ---------- */
export type TrendPoint = { t: string; rating: number; volume: number };

export function RatingTrendChart({ data, height = 224 }: { data: TrendPoint[]; height?: number }) {
  const [hover, setHover] = useState<number | null>(null);
  const wrapRef = useRef<HTMLDivElement>(null);
  const [w, setW] = useState(680);

  useEffect(() => {
    const ro = new ResizeObserver((es) => {
      for (const e of es) setW(e.contentRect.width);
    });
    if (wrapRef.current) ro.observe(wrapRef.current);
    return () => ro.disconnect();
  }, []);

  if (data.length < 2) {
    return (
      <div style={{ height, display: "grid", placeItems: "center", color: "var(--ink-400)", fontSize: 13 }}>
        Not enough data yet
      </div>
    );
  }

  const padL = 8;
  const padR = 8;
  const padT = 14;
  const padB = 26;
  const h = height;
  const innerW = w - padL - padR;
  const innerH = h - padT - padB;
  const rMin = 4.0;
  const rMax = 5.0;
  const x = (i: number) => padL + (i / (data.length - 1)) * innerW;
  const y = (r: number) => padT + (1 - (Math.min(Math.max(r, rMin), rMax) - rMin) / (rMax - rMin)) * innerH;

  const linePts = data.map((d, i) => [x(i), y(d.rating)] as const);
  const linePath = linePts.map((p, i) => `${i ? "L" : "M"}${p[0].toFixed(1)},${p[1].toFixed(1)}`).join(" ");
  const areaPath = `${linePath} L${x(data.length - 1)},${padT + innerH} L${padL},${padT + innerH} Z`;
  const gridYs = [4.0, 4.25, 4.5, 4.75, 5.0];

  return (
    <div ref={wrapRef} style={{ position: "relative", width: "100%" }} onMouseLeave={() => setHover(null)}>
      <svg viewBox={`0 0 ${w} ${h}`} width="100%" height={h} style={{ display: "block", overflow: "visible" }}>
        <defs>
          <linearGradient id="rtArea" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0" stopColor="var(--accent)" stopOpacity="0.16" />
            <stop offset="1" stopColor="var(--accent)" stopOpacity="0" />
          </linearGradient>
        </defs>
        {gridYs.map((g) => (
          <g key={g}>
            <line x1={padL} x2={w - padR} y1={y(g)} y2={y(g)} stroke="var(--ink-150)" strokeWidth="1" />
            <text x={w - padR} y={y(g) - 4} textAnchor="end" fontSize="10.5" fill="var(--ink-400)" fontFamily="var(--font-mono)">
              {g.toFixed(2)}
            </text>
          </g>
        ))}

        <path d={areaPath} fill="url(#rtArea)" />
        <path d={linePath} fill="none" stroke="var(--accent)" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" />
        {linePts.map((p, i) => (
          <circle
            key={i}
            cx={p[0]}
            cy={p[1]}
            r={hover === i ? 4.5 : 3}
            fill="#fff"
            stroke="var(--accent)"
            strokeWidth="2"
            style={{ transition: "r .12s" }}
          />
        ))}

        {data.map((_, i) => (
          <rect
            key={i}
            x={x(i) - innerW / data.length / 2}
            y={0}
            width={innerW / data.length}
            height={h}
            fill="transparent"
            onMouseEnter={() => setHover(i)}
          />
        ))}
        {hover !== null && (
          <line x1={x(hover)} x2={x(hover)} y1={padT} y2={padT + innerH} stroke="var(--ink-300)" strokeWidth="1" strokeDasharray="3 3" />
        )}

        {data.map((d, i) =>
          i % 2 === 0 ? (
            <text key={i} x={x(i)} y={h - 7} textAnchor="middle" fontSize="10.5" fill="var(--ink-400)">
              {d.t}
            </text>
          ) : null,
        )}
      </svg>

      {hover !== null && (
        <div
          style={{
            position: "absolute",
            left: `${(x(hover) / w) * 100}%`,
            top: 2,
            transform: "translateX(-50%)",
            background: "var(--ink-900)",
            color: "#fff",
            borderRadius: 8,
            padding: "7px 10px",
            pointerEvents: "none",
            fontSize: 12,
            boxShadow: "var(--shadow-lg)",
            whiteSpace: "nowrap",
            zIndex: 5,
          }}
        >
          <div style={{ fontWeight: 600, marginBottom: 2 }}>{data[hover].t}</div>
          <div style={{ display: "flex", gap: 10, color: "var(--ink-300)" }}>
            <span>
              <b style={{ color: "#fff" }} className="tnum">
                {data[hover].rating.toFixed(1)}★
              </b>{" "}
              avg
            </span>
            <span>
              <b style={{ color: "#fff" }} className="tnum">
                {data[hover].volume}
              </b>{" "}
              reviews
            </span>
          </div>
        </div>
      )}
    </div>
  );
}

/* ---------- Donut (sentiment) ---------- */
export type DonutDatum = { name: string; value: number; color: string };

export function Donut({
  data,
  size = 132,
  thickness = 16,
  centerLabel,
  centerSub,
}: {
  data: DonutDatum[];
  size?: number;
  thickness?: number;
  centerLabel?: string;
  centerSub?: string;
}) {
  const [hover, setHover] = useState<number | null>(null);
  const r = (size - thickness) / 2;
  const C = 2 * Math.PI * r;
  const total = data.reduce((a, d) => a + d.value, 0) || 1;
  let acc = 0;
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 18 }}>
      <div style={{ position: "relative", width: size, height: size, flex: "none" }}>
        <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} style={{ transform: "rotate(-90deg)" }}>
          <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="var(--ink-100)" strokeWidth={thickness} />
          {data.map((d, i) => {
            const frac = d.value / total;
            const dash = frac * C;
            const off = acc * C;
            acc += frac;
            const active = hover === i;
            return (
              <circle
                key={i}
                cx={size / 2}
                cy={size / 2}
                r={r}
                fill="none"
                stroke={d.color}
                strokeWidth={active ? thickness + 3 : thickness}
                strokeDasharray={`${dash} ${C - dash}`}
                strokeDashoffset={-off}
                strokeLinecap="butt"
                onMouseEnter={() => setHover(i)}
                onMouseLeave={() => setHover(null)}
                style={{ transition: "stroke-width .14s", cursor: "default" }}
              />
            );
          })}
        </svg>
        <div style={{ position: "absolute", inset: 0, display: "grid", placeContent: "center", textAlign: "center" }}>
          <div className="tnum" style={{ fontSize: 26, fontWeight: 680, letterSpacing: "-.02em", lineHeight: 1 }}>
            {hover !== null ? data[hover].value + "%" : centerLabel}
          </div>
          <div style={{ fontSize: 11, color: "var(--ink-400)", marginTop: 3 }}>
            {hover !== null ? data[hover].name : centerSub}
          </div>
        </div>
      </div>
      <div style={{ display: "flex", flexDirection: "column", gap: 9 }}>
        {data.map((d, i) => (
          <div
            key={i}
            onMouseEnter={() => setHover(i)}
            onMouseLeave={() => setHover(null)}
            style={{
              display: "flex",
              alignItems: "center",
              gap: 8,
              cursor: "default",
              opacity: hover === null || hover === i ? 1 : 0.5,
              transition: "opacity .14s",
            }}
          >
            <span style={{ width: 9, height: 9, borderRadius: 3, background: d.color }} />
            <span style={{ fontSize: 12.5, color: "var(--ink-600)", minWidth: 58 }}>{d.name}</span>
            <span className="tnum" style={{ fontSize: 12.5, fontWeight: 620, marginLeft: "auto" }}>
              {d.value}%
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}

/* ---------- Source bars ---------- */
export type SourceDatum = { name: string; value: number; pct: number; color: string };

export function SourceBars({ data }: { data: SourceDatum[] }) {
  if (data.length === 0) {
    return <p style={{ fontSize: 13, color: "var(--ink-400)", margin: 0 }}>No review sources yet</p>;
  }
  const max = Math.max(...data.map((d) => d.value)) || 1;
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
      {data.map((d, i) => (
        <div key={d.name}>
          <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 6, fontSize: 12.5 }}>
            <span style={{ display: "inline-flex", alignItems: "center", gap: 7, color: "var(--ink-700)", fontWeight: 540 }}>
              <span style={{ width: 8, height: 8, borderRadius: 3, background: d.color }} />
              {d.name}
            </span>
            <span style={{ color: "var(--ink-400)" }}>
              <b className="tnum" style={{ color: "var(--ink-800)" }}>
                {d.value.toLocaleString()}
              </b>{" "}
              · {d.pct}%
            </span>
          </div>
          <div style={{ height: 8, borderRadius: 999, background: "var(--ink-100)", overflow: "hidden" }}>
            <div
              style={{
                height: "100%",
                borderRadius: 999,
                background: d.color,
                width: `${(d.value / max) * 100}%`,
                animation: `growW .9s ${i * 0.08}s cubic-bezier(.2,.7,.2,1) both`,
              }}
            />
          </div>
        </div>
      ))}
    </div>
  );
}

/* ---------- Star rating display ---------- */
export function Stars({ value = 0, size = 14, gap = 1.5 }: { value?: number; size?: number; gap?: number }) {
  const full = Math.floor(value);
  const frac = value - full;
  const path = "M12 3.6l2.6 5.3 5.8.85-4.2 4.1 1 5.78L12 17.9l-5.2 2.73 1-5.78-4.2-4.1 5.8-.85z";
  return (
    <span style={{ display: "inline-flex", gap }}>
      {[0, 1, 2, 3, 4].map((i) => {
        const fillAmt = i < full ? 1 : i === full ? frac : 0;
        return (
          <span key={i} style={{ position: "relative", width: size, height: size, display: "inline-block" }}>
            <svg viewBox="0 0 24 24" width={size} height={size} style={{ position: "absolute", inset: 0 }}>
              <path d={path} fill="#e6e6ea" />
            </svg>
            <span style={{ position: "absolute", inset: 0, width: `${fillAmt * 100}%`, overflow: "hidden" }}>
              <svg viewBox="0 0 24 24" width={size} height={size} style={{ display: "block" }}>
                <path d={path} fill="var(--star)" />
              </svg>
            </span>
          </span>
        );
      })}
    </span>
  );
}

/* ---------- Source brand tag ---------- */
const SOURCE_META: Record<string, { color: string; letter: string }> = {
  WeHearYou: { color: "#37AEB7", letter: "W" },
  Google: { color: "var(--src-google)", letter: "G" },
  Facebook: { color: "var(--src-facebook)", letter: "f" },
  Yelp: { color: "var(--src-yelp)", letter: "Y" },
  Trustpilot: { color: "var(--src-trustpilot)", letter: "T" },
};

export function SourceTag({ source, showLabel = true }: { source: string; showLabel?: boolean }) {
  const m = SOURCE_META[source] || { color: "var(--ink-400)", letter: "?" };
  return (
    <span className="badge badge-neutral" style={{ paddingLeft: 6 }}>
      <span
        style={{
          width: 14,
          height: 14,
          borderRadius: 4,
          background: m.color,
          color: "#fff",
          display: "inline-flex",
          alignItems: "center",
          justifyContent: "center",
          fontSize: 9.5,
          fontWeight: 800,
          fontFamily: "var(--font-mono)",
        }}
      >
        {m.letter}
      </span>
      {showLabel && source}
    </span>
  );
}

/* ---------- Avatar with deterministic color ---------- */
const AV_COLORS = ["#6366f1", "#0ea5e9", "#10b981", "#f59e0b", "#ef4444", "#8b5cf6", "#ec4899", "#14b8a6"];

export function Avatar({ name = "", size = 34 }: { name?: string; size?: number }) {
  const initials = name.split(" ").map((w) => w[0]).slice(0, 2).join("").toUpperCase() || "?";
  const ci = name.split("").reduce((a, c) => a + c.charCodeAt(0), 0) % AV_COLORS.length;
  const c = AV_COLORS[ci];
  return (
    <span
      style={{
        width: size,
        height: size,
        borderRadius: "50%",
        flex: "none",
        display: "inline-flex",
        alignItems: "center",
        justifyContent: "center",
        background: `color-mix(in srgb, ${c} 16%, #fff)`,
        color: c,
        fontSize: size * 0.36,
        fontWeight: 680,
        letterSpacing: "-.02em",
        border: `1px solid color-mix(in srgb, ${c} 22%, #fff)`,
      }}
    >
      {initials}
    </span>
  );
}
