"use client";

import React, { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { Icon, type IconName } from "@/components/icon";
import { WidgetMockPreview, mapWidgetToPreviewSettings } from "@/components/widget-mock-preview";
import {
  createDraftReviewWidget,
  deleteReviewWidget,
  duplicateReviewWidget,
  bulkDeleteWidgets,
  bulkToggleWidgetsActive,
} from "@/app/widgets/actions";

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
    <div style={st({ height: 150, overflow: "hidden", position: "relative", background: w.theme === "dark" ? "#17171b" : "#fff", borderBottom: "1px solid var(--ink-200)", borderTopLeftRadius: "var(--r-md)", borderTopRightRadius: "var(--r-md)" })}>
      <div style={st({ position: "absolute", top: 0, left: 0, width: 720, transformOrigin: "top left", transform: "scale(.52)", padding: 18, pointerEvents: "none" })}>
        <WidgetMockPreview settings={settings} />
      </div>
      <div style={st({ position: "absolute", inset: 0, background: `linear-gradient(180deg, transparent 60%, color-mix(in srgb, ${w.theme === "dark" ? "#17171b" : "#fff"} 92%, transparent))` })} />
    </div>
  );
}

function WidgetCard({
  w,
  selected,
  onToggleSelect,
}: {
  w: IndexWidget;
  selected: boolean;
  onToggleSelect: (id: string) => void;
}) {
  const [menu, setMenu] = useState(false);
  const [hovered, setHovered] = useState(false);
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
  const showCheckbox = hovered || selected;

  return (
    <div
      className="card"
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={st({
        padding: 0,
        display: "flex",
        flexDirection: "column",
        position: "relative",
        zIndex: menu ? 30 : undefined,
        outline: selected ? `2px solid var(--accent)` : undefined,
        outlineOffset: selected ? 2 : undefined,
        transition: "outline 0.1s",
      })}
    >
      {/* Hover-reveal checkbox */}
      <button
        type="button"
        onClick={(e) => { e.preventDefault(); onToggleSelect(w.id); }}
        aria-label={selected ? "Deselect widget" : "Select widget"}
        style={st({
          position: "absolute",
          top: 10,
          left: 10,
          zIndex: 20,
          width: 22,
          height: 22,
          borderRadius: 6,
          border: selected ? "2px solid var(--accent)" : "2px solid rgba(255,255,255,.7)",
          background: selected ? "var(--accent)" : "rgba(255,255,255,.85)",
          backdropFilter: "blur(4px)",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          cursor: "pointer",
          opacity: showCheckbox ? 1 : 0,
          transition: "opacity 0.15s, background 0.1s, border-color 0.1s",
          boxShadow: "0 1px 4px rgba(0,0,0,.18)",
          padding: 0,
        })}
      >
        {selected && (
          <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
            <path d="M2 6l3 3 5-5" stroke="#fff" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        )}
      </button>

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
                    if (!window.confirm(`Delete "${w.name}"? This can't be undone.`)) e.preventDefault();
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

/* ── Sticky bulk action bar ─────────────────────────────────────────────────── */
function BulkActionBar({
  selectedIds,
  widgets,
  onClear,
  onSelectAll,
  totalCount,
}: {
  selectedIds: Set<string>;
  widgets: IndexWidget[];
  onClear: () => void;
  onSelectAll: () => void;
  totalCount: number;
}) {
  const count = selectedIds.size;
  const [confirmDelete, setConfirmDelete] = useState(false);

  // Determine mixed/all-active/all-inactive state of selection
  const selectedWidgets = widgets.filter((w) => selectedIds.has(w.id));
  const allActive = selectedWidgets.every((w) => w.isActive);
  const allInactive = selectedWidgets.every((w) => !w.isActive);
  // If mixed, show both buttons; if all active, show Deactivate; if all inactive, show Activate
  const showActivate = !allActive;
  const showDeactivate = !allInactive;

  const idsValue = Array.from(selectedIds).join(",");

  if (count === 0) return null;

  return (
    <div
      style={st({
        position: "fixed",
        bottom: 28,
        left: "50%",
        transform: "translateX(-50%)",
        zIndex: 100,
        display: "flex",
        alignItems: "center",
        gap: 10,
        background: "var(--ink-900)",
        color: "#fff",
        borderRadius: 999,
        padding: "10px 14px 10px 18px",
        boxShadow: "0 8px 32px rgba(0,0,0,.28), 0 2px 8px rgba(0,0,0,.18)",
        whiteSpace: "nowrap",
        minWidth: 0,
        animation: "why-bar-in 0.18s cubic-bezier(.34,1.56,.64,1)",
      })}
    >
      <style>{`@keyframes why-bar-in{from{opacity:0;transform:translateX(-50%) translateY(12px)}to{opacity:1;transform:translateX(-50%) translateY(0)}}`}</style>

      {/* Count + select-all */}
      <span style={st({ fontSize: 13.5, fontWeight: 620, color: "#fff", marginRight: 2 })}>
        {count} selected
      </span>
      {count < totalCount && (
        <button
          type="button"
          onClick={onSelectAll}
          style={st({ fontSize: 12.5, color: "rgba(255,255,255,.55)", background: "none", border: "none", cursor: "pointer", padding: "0 4px", textDecoration: "underline", textUnderlineOffset: 2 })}
        >
          Select all {totalCount}
        </button>
      )}

      <div style={st({ width: 1, height: 20, background: "rgba(255,255,255,.15)", margin: "0 4px" })} />

      {/* Activate */}
      {showActivate && (
        <form action={bulkToggleWidgetsActive}>
          <input type="hidden" name="widgetIds" value={idsValue} />
          <input type="hidden" name="isActive" value="true" />
          <button
            type="submit"
            style={st({ display: "flex", alignItems: "center", gap: 6, fontSize: 13, fontWeight: 580, color: "#fff", background: "rgba(255,255,255,.1)", border: "1px solid rgba(255,255,255,.15)", borderRadius: 999, padding: "6px 13px", cursor: "pointer", transition: "background .15s" })}
          >
            <svg width="13" height="13" viewBox="0 0 13 13" fill="none"><circle cx="6.5" cy="6.5" r="5.5" stroke="currentColor" strokeWidth="1.4"/><circle cx="6.5" cy="6.5" r="2.5" fill="currentColor"/></svg>
            Activate
          </button>
        </form>
      )}

      {/* Deactivate */}
      {showDeactivate && (
        <form action={bulkToggleWidgetsActive}>
          <input type="hidden" name="widgetIds" value={idsValue} />
          <input type="hidden" name="isActive" value="false" />
          <button
            type="submit"
            style={st({ display: "flex", alignItems: "center", gap: 6, fontSize: 13, fontWeight: 580, color: "rgba(255,255,255,.8)", background: "rgba(255,255,255,.08)", border: "1px solid rgba(255,255,255,.12)", borderRadius: 999, padding: "6px 13px", cursor: "pointer", transition: "background .15s" })}
          >
            <svg width="13" height="13" viewBox="0 0 13 13" fill="none"><circle cx="6.5" cy="6.5" r="5.5" stroke="currentColor" strokeWidth="1.4" strokeDasharray="3 2"/></svg>
            Deactivate
          </button>
        </form>
      )}

      {/* Delete */}
      {!confirmDelete ? (
        <button
          type="button"
          onClick={() => setConfirmDelete(true)}
          style={st({ display: "flex", alignItems: "center", gap: 6, fontSize: 13, fontWeight: 580, color: "#fca5a5", background: "rgba(239,68,68,.12)", border: "1px solid rgba(239,68,68,.25)", borderRadius: 999, padding: "6px 13px", cursor: "pointer", transition: "background .15s" })}
        >
          <Icon name="trash" size={13} />Delete
        </button>
      ) : (
        <form
          action={bulkDeleteWidgets}
          style={st({ display: "flex", alignItems: "center", gap: 6 })}
        >
          <input type="hidden" name="widgetIds" value={idsValue} />
          <span style={st({ fontSize: 12.5, color: "#fca5a5" })}>Delete {count}?</span>
          <button
            type="submit"
            style={st({ fontSize: 13, fontWeight: 680, color: "#fff", background: "#ef4444", border: "none", borderRadius: 999, padding: "6px 13px", cursor: "pointer" })}
          >
            Confirm
          </button>
          <button
            type="button"
            onClick={() => setConfirmDelete(false)}
            style={st({ fontSize: 13, color: "rgba(255,255,255,.55)", background: "none", border: "none", cursor: "pointer", padding: "6px 4px" })}
          >
            Cancel
          </button>
        </form>
      )}

      <div style={st({ width: 1, height: 20, background: "rgba(255,255,255,.15)", margin: "0 4px" })} />

      {/* Clear */}
      <button
        type="button"
        onClick={onClear}
        aria-label="Clear selection"
        style={st({ width: 28, height: 28, borderRadius: "50%", display: "flex", alignItems: "center", justifyContent: "center", background: "rgba(255,255,255,.1)", border: "none", cursor: "pointer", color: "rgba(255,255,255,.7)", flexShrink: 0 })}
      >
        <svg width="11" height="11" viewBox="0 0 11 11" fill="none"><path d="M1 1l9 9M10 1L1 10" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round"/></svg>
      </button>
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
        <form action={createDraftReviewWidget} style={st({ display: "flex", justifyContent: "center", marginTop: 22 })}>
          <button type="submit" className="btn btn-primary"><Icon name="plus" size={16} />Create a widget</button>
        </form>
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
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

  const toggleSelect = (id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  };

  const clearSelection = () => setSelectedIds(new Set());
  const selectAll = () => setSelectedIds(new Set(widgets.map((w) => w.id)));

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
          <form action={createDraftReviewWidget}>
            <button type="submit" className="btn btn-primary"><Icon name="plus" size={16} />New widget</button>
          </form>
        )}
      </div>

      {count === 0 ? (
        <WidgetsEmpty />
      ) : (
        <>
          <div style={st({ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(290px, 1fr))", gap: "var(--gutter)" })}>
            {widgets.map((w) => (
              <WidgetCard
                key={w.id}
                w={w}
                selected={selectedIds.has(w.id)}
                onToggleSelect={toggleSelect}
              />
            ))}
            <form action={createDraftReviewWidget} style={st({ display: "flex" })}>
              <button type="submit" className="tap focus-ring" style={st({ width: "100%", minHeight: 240, border: "1.5px dashed var(--ink-300)", borderRadius: "var(--r-lg)", background: "var(--white)", cursor: "pointer", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 12, color: "var(--ink-500)" })}>
                <span style={st({ width: 46, height: 46, borderRadius: 13, display: "grid", placeItems: "center", background: "var(--accent-soft)", color: "var(--accent-strong)" })}>
                  <Icon name="plus" size={22} />
                </span>
                <span style={st({ fontSize: 13.5, fontWeight: 580 })}>New widget</span>
              </button>
            </form>
          </div>

          <BulkActionBar
            selectedIds={selectedIds}
            widgets={widgets}
            onClear={clearSelection}
            onSelectAll={selectAll}
            totalCount={count}
          />
        </>
      )}
    </div>
  );
}
