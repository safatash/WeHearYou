"use client";

import Link from "next/link";
import { useEffect, useId, useState } from "react";
import { Icon } from "@/components/icon";
import { navItems, type ScreenKey, type NavItem } from "@/lib/navigation";

/**
 * The canonical navigation. One active treatment, one icon size, one section
 * label, and one source of selection (`aria-current="page"`) that both CSS and
 * assistive technology read.
 *
 * Below `lg` the sidebar becomes a dialog drawer behind a menu button. Before
 * this existed the sidebar was simply `hidden lg:flex`, so the entire
 * application was unnavigable on a phone.
 */

const GROUP_ORDER = [
  "REQUESTS & FEEDBACK",
  "FUNNEL SETUP",
  "WEBSITE DISPLAYS",
  "GOOGLE LOCAL SEO",
  "SETTINGS",
] as const;

function groupItems() {
  const ungrouped = navItems.filter((i) => !i.group);
  const grouped = new Map<string, NavItem[]>();
  for (const item of navItems) {
    if (!item.group) continue;
    const list = grouped.get(item.group) ?? [];
    list.push(item);
    grouped.set(item.group, list);
  }
  return { ungrouped, grouped };
}

function NavRow({
  item,
  active,
  onNavigate,
}: {
  item: NavItem;
  active: boolean;
  onNavigate?: () => void;
}) {
  const icon = <Icon name={item.icon} size={18} style={{ color: "currentColor" }} />;

  // "Coming soon" is not a link: it must not be focusable or activatable, and
  // the reason is spelled out rather than implied by dimming alone.
  if (item.comingSoon) {
    return (
      <span className="nav-item" aria-disabled="true">
        {icon}
        <span>{item.label}</span>
        <span className="badge badge-neutral" style={{ marginLeft: "auto" }}>
          Soon
        </span>
      </span>
    );
  }

  return (
    <Link
      href={item.href}
      className="nav-item"
      aria-current={active ? "page" : undefined}
      onClick={onNavigate}
    >
      {icon}
      <span>{item.label}</span>
    </Link>
  );
}

function NavList({
  activeScreen,
  onNavigate,
}: {
  activeScreen: ScreenKey;
  onNavigate?: () => void;
}) {
  const { ungrouped, grouped } = groupItems();
  return (
    <nav aria-label="Main" style={{ display: "flex", flexDirection: "column", gap: 22 }}>
      {ungrouped.length > 0 && (
        <div style={{ display: "flex", flexDirection: "column", gap: 2 }}>
          {ungrouped.map((item) => (
            <NavRow key={item.key} item={item} active={item.key === activeScreen} onNavigate={onNavigate} />
          ))}
        </div>
      )}

      {GROUP_ORDER.map((groupName) => {
        const items = grouped.get(groupName) ?? [];
        if (items.length === 0) return null;
        return (
          <div key={groupName}>
            <p className="nav-section-label">{groupName}</p>
            <div style={{ display: "flex", flexDirection: "column", gap: 2 }}>
              {items.map((item) => (
                <NavRow key={item.key} item={item} active={item.key === activeScreen} onNavigate={onNavigate} />
              ))}
            </div>
          </div>
        );
      })}
    </nav>
  );
}

function BrandMark() {
  return (
    <Link
      href="/"
      className="focus-ring"
      style={{ display: "flex", alignItems: "center", gap: 10, padding: "2px 4px", borderRadius: "var(--r-sm)" }}
    >
      <span
        aria-hidden="true"
        style={{
          display: "grid",
          placeItems: "center",
          height: 34,
          width: 34,
          borderRadius: "var(--r-md)",
          background: "var(--accent-solid)",
          color: "var(--accent-fg)",
          fontSize: 15,
          fontWeight: 700,
        }}
      >
        W
      </span>
      <span style={{ display: "flex", flexDirection: "column", lineHeight: 1.2 }}>
        <span style={{ fontSize: 14, fontWeight: 660, color: "var(--ink-900)" }}>WeHearYou</span>
        <span style={{ fontSize: 11.5, color: "var(--ink-500)" }}>Reputation</span>
      </span>
    </Link>
  );
}

/**
 * Trial card, per the design system's sidebar foot. A restrained
 * accent-softer → white gradient — not the indigo promo block that previously
 * occupied this slot. Renders only while a trial is actually running.
 */
function TrialCard({ daysLeft, ended }: { daysLeft: number | null; ended?: boolean }) {
  return (
    <div style={{ padding: "12px 4px 4px" }}>
      <div
        style={{
          borderRadius: "var(--r-md)",
          border: "1px solid var(--ink-200)",
          padding: 14,
          background: "linear-gradient(160deg, var(--accent-softer), var(--white))",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 6 }}>
          <Icon name="sparkles" size={15} style={{ color: "var(--accent)" }} aria-hidden="true" />
          <span style={{ fontSize: 13, fontWeight: 620, color: "var(--ink-900)" }}>
            {ended ? "Trial ended" : "Pro trial"}
          </span>
        </div>
        <p style={{ fontSize: 12, color: "var(--ink-500)", lineHeight: 1.5, margin: "0 0 10px" }}>
          {ended
            ? "Your free trial is over. Choose a plan to keep full access."
            : `${daysLeft} ${daysLeft === 1 ? "day" : "days"} left. Unlock unlimited campaigns and AI replies.`}
        </p>
        <Link href="/billing" className="btn btn-primary btn-sm" style={{ width: "100%" }}>
          {ended ? "View plans" : "Upgrade"}
        </Link>
      </div>
    </div>
  );
}

/** Desktop rail. Hidden below `lg`, where MobileNav takes over. */
export function SidebarNav({ activeScreen, trialDaysLeft, trialEnded }: { activeScreen: ScreenKey; trialDaysLeft?: number | null; trialEnded?: boolean }) {
  return (
    <aside
      className="hidden lg:flex"
      style={{
        flexDirection: "column",
        gap: 26,
        width: "var(--sidebar-w)",
        flex: "none",
        borderRight: "1px solid var(--ink-200)",
        background: "var(--white)",
        padding: "20px 16px",
        position: "sticky",
        top: 0,
        height: "100vh",
        overflowY: "auto",
      }}
    >
      <BrandMark />
      <NavList activeScreen={activeScreen} />
      {(trialEnded || trialDaysLeft != null) && (
        <div style={{ marginTop: "auto" }}>
          <TrialCard daysLeft={trialDaysLeft ?? null} ended={trialEnded} />
        </div>
      )}
    </aside>
  );
}

/**
 * Mobile navigation drawer. Rendered as a modal dialog: Escape closes it, focus
 * returns to the trigger, and background scroll is locked while open.
 */
export function MobileNav({ activeScreen, trialDaysLeft, trialEnded }: { activeScreen: ScreenKey; trialDaysLeft?: number | null; trialEnded?: boolean }) {
  const [open, setOpen] = useState(false);
  const panelId = useId();

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    window.addEventListener("keydown", onKey);
    return () => {
      window.removeEventListener("keydown", onKey);
      document.body.style.overflow = previousOverflow;
    };
  }, [open]);

  return (
    <div className="lg:hidden">
      <button
        type="button"
        className="icon-btn"
        aria-label="Open navigation menu"
        aria-expanded={open}
        aria-controls={panelId}
        onClick={() => setOpen(true)}
      >
        <Icon name="menu" size={18} />
      </button>

      {open && (
        <div
          style={{ position: "fixed", inset: 0, zIndex: 60, display: "flex" }}
          role="dialog"
          aria-modal="true"
          aria-label="Main navigation"
        >
          <div
            style={{ position: "absolute", inset: 0, background: "rgba(15,17,23,.45)" }}
            onClick={() => setOpen(false)}
          />
          <div
            id={panelId}
            style={{
              position: "relative",
              width: "min(300px, 86vw)",
              background: "var(--white)",
              borderRight: "1px solid var(--ink-200)",
              padding: "16px 14px",
              overflowY: "auto",
              display: "flex",
              flexDirection: "column",
              gap: 22,
            }}
          >
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12 }}>
              <BrandMark />
              <button type="button" className="icon-btn" aria-label="Close navigation menu" onClick={() => setOpen(false)}>
                <Icon name="close" size={18} />
              </button>
            </div>
            <NavList activeScreen={activeScreen} onNavigate={() => setOpen(false)} />
            {(trialEnded || trialDaysLeft != null) && (
              <div style={{ marginTop: "auto" }}>
                <TrialCard daysLeft={trialDaysLeft ?? null} ended={trialEnded} />
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
