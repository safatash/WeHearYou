"use client";

import React, { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { Icon, type IconName } from "@/components/icon";
import { WidgetMockPreview, mapWidgetToPreviewSettings } from "@/components/widget-mock-preview";
import { deleteReviewWidget, duplicateReviewWidget } from "@/app/widgets/actions";

const st = (s: React.CSSProperties): React.CSSProperties => s;

export type IndexWidget = {
  id: string;
  name: string;
  layout: string;
  theme: string;
  widgetType: string | null;
  contentType: string;
  primaryColor: string | null;
  minRating: number;
  pageSize: number;
  showHeader: boolean;
  showDate: boolean;
  showReviewerName: boolean;
  showSourceLogo: boolean;
  isActive: boolean;
  reviewCount: number;
  updatedAt: string;
  locationName: string;
};

// type id -> label + icon (mirrors the mock's WIDGET_TYPES)
const TYPE_META: Record<string, { label: string; icon: IconName }> = {
  grid: { label: "Wall of Love", icon: "grid" },
  carousel: { label: "Review carousel", icon: "layers" },
  single: { label: "Single testimonial", icon: "film" },
  badge: { label: "Rating badge", icon: "star" },
  floating: { label: "Floating badge", icon: "chat" },
  cta: { label: "Collect reviews", icon: "send" },
};

const TYPE_HINTS: Array<{ label: string; icon: IconName }> = [
  { label: "Wall of Love", icon: "grid" },
  { label: "Review carousel", icon: "layers" },
  { label: "Single testimonial", icon: "film" },
  { label: "Rating badge", icon: "star" },
  { label: "Floating badge", icon: "chat" },
  { label: "Collect reviews", icon: "send" },
];

function previewType(w: IndexWidget): string {
  return (mapWidgetToPreviewSettings(w).type as string) || "grid";
}

function fmtDate(iso: string): string {
  try {
    return new Date(iso).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
  } catch {
    return "";
  }
}

/* live thumbnail of a widget on a faux page */
function WidgetThumb({ w }: { w: IndexWidget }) {
  const settings = { ...mapWidgetToPreviewSettings(w), device: "desktop" as const, maxReviews: Math.min(w.pageSize || 3, 3) };
  return (
    <div style={st({ height: 150, overflow: "hidden", position: "relative", background: w.theme === "dark" ? "#17171b" : "#fff", borderBottom: "1px solid var(--ink-200)" })}>
      <div style={st({ position: "absolute", top: 0, left: 0, width: 720, transformOrigin: "top left", transform: "scale(.52)", padding: 18, pointerEvents: "none" })}>
        <WidgetMockPreview settings={settings} />
      </div>
      <div style={st({ position: "absolute", inset: 0, background: `linear-gradient(180deg, transparent 60%, color-mix(in srgb, ${w.theme === "dark" ? "#17171b" : "#fff"} 92%, transparent))` })} />
    </div>
  );
}

function WidgetCard({ w }: { w: IndexWidget }) {
  const [menu, setMenu] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const h = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setMenu(false);
    };
    document.addEventListener("mousedown", h);
    return () => document.removeEventListener("mousedown", h);
  }, []);

  const meta = TYPE_META[previewType(w)] || TYPE_META.grid;
  const accent = w.primaryColor || "#4f46e5";

  return (
    <div className="card" style={st({ padding: 0, overflow: "hidden", display: "flex", flexDirection: "column" })}>
      <Link href={`/widgets/${w.id}`} className="tap" style={st({ display: "block", textDecoration: "none" })}>
        <WidgetThumb w={w} />
      </Link>
      <div style={st({ padding: 16, display: "flex", flexDirection: "column", gap: 12, flex: 1 })}>
        <div style={st({ display: "flex", alignItems: "flex-start", gap: 10 })}>
          <span style={st({ width: 34, height: 34, borderRadius: 9, flex: "none", display: "grid", placeItems: "center", background: "var(--accent-soft)", color: "var(--accent-strong)" })}>
            <Icon name={meta.icon} size={17} />
          </span>
          <div style={st({ minWidth: 0, flex: 1 })}>
            <div style={st({ fontSize: 14.5, fontWeight: 640, letterSpacing: "-.01em", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis", color: "var(--ink-900)" })}>{w.name}</div>
            <div style={st({ fontSize: 12, color: "var(--ink-400)", marginTop: 1 })}>{meta.label} · {w.locationName}</div>
          </div>
          <div ref={ref} style={st({ position: "relative" })}>
            <button onClick={() => setMenu((m) => !m)} className="btn btn-ghost btn-icon btn-sm" title="More" style={st({ width: 30, height: 30 })}>
              <Icon name="dots" size={16} />
            </button>
            {menu && (
              <div className="card" style={st({ position: "absolute", top: "calc(100% + 4px)", right: 0, width: 168, padding: 5, boxShadow: "var(--shadow-pop)", zIndex: 40 })}>
                <Link href={`/widgets/${w.id}`} className="tap" onClick={() => setMenu(false)} style={st({ width: "100%", display: "flex", alignItems: "center", gap: 9, padding: "8px 9px", borderRadius: "var(--r-sm)", textDecoration: "none", fontSize: 13, fontWeight: 520, color: "var(--ink-700)" })}>
                  <Icon name="sliders" size={15} />Edit
                </Link>
                <form action={duplicateReviewWidget}>
                  <input type="hidden" name="widgetId" value={w.id} />
                  <button type="submit" className="tap" style={st({ width: "100%", display: "flex", alignItems: "center", gap: 9, padding: "8px 9px", borderRadius: "var(--r-sm)", border: 0, cursor: "pointer", background: "transparent", textAlign: "left", fontSize: 13, fontWeight: 520, color: "var(--ink-700)" })}>
                    <Icon name="copy" size={15} />Duplicate
                  </button>
                </form>
                <form
                  action={deleteReviewWidget}
                  onSubmit={(e) => {
                    if (!window.confirm(`Delete “${w.name}”? This can't be undone.`)) e.preventDefault();
                  }}
                >
                  <input type="hidden" name="widgetId" value={w.id} />
                  <button type="submit" className="tap" style={st({ width: "100%", display: "flex", alignItems: "center", gap: 9, padding: "8px 9px", borderRadius: "var(--r-sm)", border: 0, cursor: "pointer", background: "transparent", textAlign: "left", fontSize: 13, fontWeight: 520, color: "var(--danger)" })}>
                    <Icon name="trash" size={15} />Delete
                  </button>
                </form>
              </div>
            )}
          </div>
        </div>
        <div style={st({ display: "flex", flexWrap: "wrap", gap: 6 })}>
          <span className="badge badge-neutral" style={st({ textTransform: "capitalize", whiteSpace: "nowrap" })}>{w.theme}</span>
          <span className="badge badge-neutral" style={st({ display: "inline-flex", alignItems: "center", gap: 5, whiteSpace: "nowrap" })}>
            <span style={st({ width: 9, height: 9, borderRadius: 3, background: accent })} />Accent
          </span>
          <span className="badge badge-neutral" style={st({ whiteSpace: "nowrap" })}>{w.reviewCount} {w.reviewCount === 1 ? "review" : "reviews"}</span>
        </div>
        <div style={st({ marginTop: "auto", display: "flex", alignItems: "center", gap: 8, paddingTop: 4, borderTop: "1px solid var(--ink-100)" })}>
          {w.isActive ? (
            <span className="badge badge-success"><span style={st({ width: 6, height: 6, borderRadius: "50%", background: "var(--success)" })} />Live</span>
          ) : (
            <span className="badge badge-neutral">Inactive</span>
          )}
          <span style={st({ fontSize: 11.5, color: "var(--ink-400)", marginLeft: "auto" })}>Edited {fmtDate(w.updatedAt)}</span>
        </div>
      </div>
    </div>
  );
}

function WidgetsEmpty() {
  return (
    <div style={st({ display: "grid", placeItems: "center", minHeight: "62vh" })}>
      <div style={st({ textAlign: "center", maxWidth: 460 })}>
        <div style={st({ width: 70, height: 70, borderRadius: 20, margin: "0 auto 20px", display: "grid", placeItems: "center", background: "var(--accent-soft)", color: "var(--accent-strong)", boxShadow: "var(--shadow-sm)" })}>
          <Icon name="grid" size={32} />
        </div>
        <h2 style={st({ fontSize: 22, fontWeight: 680, letterSpacing: "-.025em", color: "var(--ink-900)" })}>No widgets yet</h2>
        <p style={st({ fontSize: 14, color: "var(--ink-500)", marginTop: 9, lineHeight: 1.6 })}>
          Widgets embed your reviews, ratings, and video testimonials anywhere on your site. Create your first one — pick a style, customize it, and copy the embed code.
        </p>
        <div style={st({ display: "flex", justifyContent: "center", marginTop: 22 })}>
          <Link href="/widgets/new" className="btn btn-primary"><Icon name="plus" size={16} />Create a widget</Link>
        </div>
        <div style={st({ display: "flex", flexWrap: "wrap", gap: 8, justifyContent: "center", marginTop: 28 })}>
          {TYPE_HINTS.map((t) => (
            <span key={t.label} style={st({ display: "inline-flex", alignItems: "center", gap: 7, fontSize: 12.5, color: "var(--ink-500)", border: "1px solid var(--ink-200)", background: "var(--white)", borderRadius: 999, padding: "6px 12px", boxShadow: "var(--shadow-xs)" })}>
              <Icon name={t.icon} size={14} style={{ color: "var(--accent)" }} />{t.label}
            </span>
          ))}
        </div>
      </div>
    </div>
  );
}

export function WidgetsIndex({ widgets }: { widgets: IndexWidget[] }) {
  const count = widgets.length;
  return (
    <div style={st({ maxWidth: 1240, margin: "0 auto" })}>
      <div style={st({ display: "flex", alignItems: "flex-end", justifyContent: "space-between", gap: 16, flexWrap: "wrap", marginBottom: "var(--gutter)" })}>
        <div>
          <div className="eyebrow" style={st({ marginBottom: 6 })}>Widgets</div>
          <h1 style={st({ fontSize: 26, fontWeight: 680, letterSpacing: "-.025em", color: "var(--ink-900)" })}>Your widgets</h1>
          <p style={st({ fontSize: 13.5, color: "var(--ink-500)", marginTop: 5 })}>
            {count === 0 ? "Embeddable review displays for your site." : `${count} widget${count === 1 ? "" : "s"} · embed reviews anywhere on your site.`}
          </p>
        </div>
        {count > 0 && (
          <Link href="/widgets/new" className="btn btn-primary"><Icon name="plus" size={16} />New widget</Link>
        )}
      </div>

      {count === 0 ? (
        <WidgetsEmpty />
      ) : (
        <div style={st({ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(290px, 1fr))", gap: "var(--gutter)" })}>
          {widgets.map((w) => (
            <WidgetCard key={w.id} w={w} />
          ))}
          <Link href="/widgets/new" className="tap focus-ring" style={st({ minHeight: 240, border: "1.5px dashed var(--ink-300)", borderRadius: "var(--r-lg)", background: "var(--white)", textDecoration: "none", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 12, color: "var(--ink-500)" })}>
            <span style={st({ width: 46, height: 46, borderRadius: 13, display: "grid", placeItems: "center", background: "var(--accent-soft)", color: "var(--accent-strong)" })}>
              <Icon name="plus" size={22} />
            </span>
            <span style={st({ fontSize: 13.5, fontWeight: 580 })}>New widget</span>
          </Link>
        </div>
      )}
    </div>
  );
}
