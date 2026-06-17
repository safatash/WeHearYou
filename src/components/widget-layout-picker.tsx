"use client";

import React, { useState } from "react";
import Link from "next/link";
import { isRedirectError } from "next/dist/client/components/redirect-error";
import { Icon, type IconName } from "@/components/icon";
import { WidgetMockPreview, type PreviewSettings } from "@/components/widget-mock-preview";
import { createReviewWidget } from "@/app/widgets/actions";

const st = (s: React.CSSProperties): React.CSSProperties => s;

type Location = {
  id: string;
  name: string;
  canCreateWidget: boolean;
  guidance: string;
  reviewCount: number;
  videoTestimonialCount?: number;
};

type LayoutOption = {
  value: string;
  label: string;
  description: string;
  icon: IconName;
  previewType: PreviewSettings["type"];
  badge?: "Popular" | "Hot";
};

const LAYOUTS: LayoutOption[] = [
  { value: "grid", label: "Wall of Love", description: "Multi-column masonry of reviews", icon: "grid", previewType: "grid", badge: "Hot" },
  { value: "carousel", label: "Review carousel", description: "Rotating single-review slides", icon: "layers", previewType: "carousel", badge: "Popular" },
  { value: "slider", label: "Slider", description: "Horizontal scrolling reviews", icon: "layers", previewType: "carousel" },
  { value: "list", label: "List", description: "Vertical stacked reviews", icon: "grid", previewType: "grid" },
  { value: "masonry", label: "Masonry", description: "Pinterest-style variable heights", icon: "grid", previewType: "grid" },
  { value: "badge", label: "Rating badge", description: "Compact score + stars", icon: "star", previewType: "badge" },
  { value: "floating", label: "Floating badge", description: "Sticky corner pill", icon: "chat", previewType: "floating" },
];

interface WidgetLayoutPickerProps {
  locations: Location[];
}

export function WidgetLayoutPicker({ locations }: WidgetLayoutPickerProps) {
  const [selectedLayout, setSelectedLayout] = useState<string | null>(null);
  const [widgetName, setWidgetName] = useState("");
  const [locationId, setLocationId] = useState("");
  const [isSaving, setIsSaving] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const eligibleLocations = locations.filter((l) => l.canCreateWidget);
  const selected = LAYOUTS.find((l) => l.value === selectedLayout) ?? null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedLayout || !widgetName.trim() || !locationId) return;
    setIsSaving(true);
    setErrorMessage(null);
    const formData = new FormData();
    formData.append("layout", selectedLayout);
    formData.append("name", widgetName.trim());
    formData.append("locationId", locationId);
    formData.append("contentType", "TEXT");
    if (selectedLayout === "floating") formData.append("widgetType", "FLOATING");
    try {
      await createReviewWidget(formData);
    } catch (err) {
      if (isRedirectError(err)) throw err;
      setErrorMessage("Something went wrong. Please try again.");
      setIsSaving(false);
    }
  };

  return (
    <div style={st({ maxWidth: 1240, margin: "0 auto", paddingBottom: 120 })}>
      {/* header */}
      <div style={st({ marginBottom: "var(--gutter)" })}>
        <Link href="/widgets" className="tap focus-ring" style={st({ display: "inline-flex", alignItems: "center", gap: 6, textDecoration: "none", color: "var(--ink-500)", fontSize: 12.5, fontWeight: 560, padding: "2px 0", marginBottom: 8 })}>
          <Icon name="chevDown" size={15} style={{ transform: "rotate(90deg)" }} />All widgets
        </Link>
        <div className="eyebrow" style={st({ marginBottom: 6 })}>Widgets</div>
        <h1 style={st({ fontSize: 26, fontWeight: 680, letterSpacing: "-.025em", color: "var(--ink-900)" })}>New widget</h1>
        <p style={st({ fontSize: 13.5, color: "var(--ink-500)", marginTop: 5 })}>Pick a layout, name it, and choose a location.</p>
      </div>

      {/* layout cards */}
      <div style={st({ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))", gap: "var(--gutter)" })}>
        {LAYOUTS.map((layout) => {
          const active = selectedLayout === layout.value;
          return (
            <button
              key={layout.value}
              type="button"
              onClick={() => setSelectedLayout((p) => (p === layout.value ? null : layout.value))}
              className="tap focus-ring"
              style={st({
                textAlign: "left", cursor: "pointer", padding: 0, display: "flex", flexDirection: "column",
                borderRadius: "var(--r-md)", overflow: "hidden", background: "var(--white)",
                border: active ? "1.5px solid var(--accent)" : "1px solid var(--ink-200)",
                boxShadow: active ? "0 0 0 3px var(--accent-ring)" : "var(--shadow-xs)",
              })}
            >
              <div style={st({ position: "relative", height: 150, overflow: "hidden", background: "#fff", borderBottom: "1px solid var(--ink-200)" })}>
                {layout.badge && (
                  <span className="badge" style={st({ position: "absolute", top: 10, right: 10, zIndex: 2, background: layout.badge === "Hot" ? "var(--danger)" : "var(--accent)", color: "#fff", fontWeight: 700 })}>{layout.badge}</span>
                )}
                <div style={st({ position: "absolute", top: 0, left: 0, width: 720, transformOrigin: "top left", transform: "scale(.52)", padding: 18, pointerEvents: "none" })}>
                  <WidgetMockPreview settings={{ type: layout.previewType, theme: "light", accent: "#4f46e5", maxReviews: 3, aiSummary: false }} />
                </div>
                <div style={st({ position: "absolute", inset: 0, background: "linear-gradient(180deg, transparent 62%, color-mix(in srgb, #fff 92%, transparent))" })} />
              </div>
              <div style={st({ display: "flex", alignItems: "center", gap: 10, padding: 16 })}>
                <span style={st({ width: 34, height: 34, borderRadius: 9, flex: "none", display: "grid", placeItems: "center", background: active ? "var(--accent)" : "var(--accent-soft)", color: active ? "#fff" : "var(--accent-strong)" })}>
                  <Icon name={layout.icon} size={17} />
                </span>
                <div style={st({ minWidth: 0, flex: 1 })}>
                  <div style={st({ fontSize: 14, fontWeight: 640, color: "var(--ink-900)" })}>{layout.label}</div>
                  <div style={st({ fontSize: 12, color: "var(--ink-400)", marginTop: 1 })}>{layout.description}</div>
                </div>
                <span className={active ? "badge" : "badge badge-neutral"} style={active ? st({ background: "var(--accent)", color: "#fff", fontWeight: 600 }) : undefined}>
                  {active ? "✓ Selected" : "Select"}
                </span>
              </div>
            </button>
          );
        })}
      </div>

      {/* sticky action bar */}
      <div
        style={st({
          position: "fixed", left: 0, right: 0, bottom: 0, zIndex: 50,
          transform: selected ? "translateY(0)" : "translateY(110%)",
          transition: "transform .28s cubic-bezier(.2,.8,.2,1)",
          background: "var(--white)", borderTop: "1px solid var(--ink-200)", boxShadow: "var(--shadow-pop)",
        })}
      >
        <form onSubmit={handleSubmit} style={st({ maxWidth: 1240, margin: "0 auto", padding: "14px var(--gutter)", display: "flex", alignItems: "center", gap: 14, flexWrap: "wrap" })}>
          <div style={st({ flex: "none" })}>
            <div className="eyebrow" style={st({ fontSize: 10.5 })}>Selected</div>
            <div style={st({ fontSize: 16, fontWeight: 680, color: "var(--ink-900)" })}>{selected?.label ?? "—"}</div>
          </div>

          <div style={st({ display: "flex", gap: 10, flex: 1, minWidth: 240 })}>
            <input
              type="text"
              required
              value={widgetName}
              onChange={(e) => setWidgetName(e.target.value)}
              placeholder="Widget name (e.g. Homepage reviews)"
              style={st({ flex: 1, minWidth: 0, borderRadius: "var(--r-sm)", border: "1px solid var(--ink-200)", background: "var(--ink-50)", padding: "10px 13px", fontSize: 13.5, color: "var(--ink-900)", outline: "none" })}
            />
            {eligibleLocations.length === 0 ? (
              <span style={st({ flex: 1, fontSize: 12.5, color: "#92690a", background: "color-mix(in srgb, var(--accent) 0%, #fef9c3)", border: "1px solid #fde68a", borderRadius: "var(--r-sm)", padding: "10px 13px" })}>
                No eligible locations yet — sync Google reviews first.
              </span>
            ) : (
              <select
                required
                value={locationId}
                onChange={(e) => setLocationId(e.target.value)}
                style={st({ flex: 1, minWidth: 0, borderRadius: "var(--r-sm)", border: "1px solid var(--ink-200)", background: "var(--ink-50)", padding: "10px 13px", fontSize: 13.5, color: "var(--ink-900)", outline: "none" })}
              >
                <option value="">Choose a location…</option>
                {eligibleLocations.map((loc) => (
                  <option key={loc.id} value={loc.id}>{loc.name} ({loc.reviewCount} reviews)</option>
                ))}
              </select>
            )}
          </div>

          {errorMessage && <span style={st({ fontSize: 13, color: "var(--danger)", flex: "none" })}>{errorMessage}</span>}

          <div style={st({ display: "flex", alignItems: "center", gap: 8, flex: "none" })}>
            <button type="button" className="btn btn-ghost btn-sm" onClick={() => setSelectedLayout(null)}>Cancel</button>
            <button type="submit" className="btn btn-primary" disabled={isSaving || !widgetName.trim() || !locationId || eligibleLocations.length === 0}>
              {isSaving ? "Creating…" : <>Create widget<Icon name="chevDown" size={15} style={{ transform: "rotate(-90deg)" }} /></>}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
