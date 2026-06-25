"use client";
import { useState, useEffect, useRef } from "react";
import { Icon, type IconName } from "@/components/icon";
import "./funnel.css";

export const RATING_LABELS: Record<number, string> = {
  1: "Poor",
  2: "Needs Improvement",
  3: "Okay",
  4: "Good",
  5: "Excellent",
};

/* ── BizHeader ─────────────────────────────────────────────────────────── */

interface BizProps {
  name: string;
  location: string;
  initial: string;
  hue: number;
  logoUrl: string | null;
}

interface BizHeaderProps {
  biz: BizProps;
  size?: "md" | "lg";
}

export const BizHeader = ({ biz, size = "md" }: BizHeaderProps) => (
  <div style={{ display: "flex", alignItems: "center", gap: size === "lg" ? 13 : 11, justifyContent: "center" }}>
    {biz.logoUrl ? (
      <img
        src={biz.logoUrl}
        alt={biz.name}
        style={{ width: 48, height: 48, borderRadius: 13, objectFit: "contain", flex: "none" }}
      />
    ) : (
      <span style={{
        width: size === "lg" ? 48 : 40,
        height: size === "lg" ? 48 : 40,
        borderRadius: size === "lg" ? 13 : 11,
        flex: "none",
        display: "grid",
        placeItems: "center",
        color: "#fff",
        fontWeight: 700,
        fontSize: size === "lg" ? 22 : 18,
        background: `linear-gradient(145deg, hsl(${biz.hue} 56% 44%), hsl(${biz.hue} 60% 30%))`,
        boxShadow: "var(--shadow-sm)",
      }}>{biz.initial}</span>
    )}
    <div style={{ textAlign: "left" }}>
      <div style={{ fontSize: size === "lg" ? 17 : 15, fontWeight: 660, letterSpacing: "-.01em" }}>{biz.name}</div>
      <div style={{ fontSize: size === "lg" ? 12.5 : 11.5, color: "var(--ink-400)", display: "flex", alignItems: "center", gap: 4 }}>
        <Icon name="pin" size={11} />{biz.location}
      </div>
    </div>
  </div>
);

/* ── Stepper ────────────────────────────────────────────────────────────── */

interface StepperProps {
  step: number;
  total: number;
  tone?: "accent";
}

export const Stepper = ({ step, total, tone = "accent" }: StepperProps) => (
  <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
    {Array.from({ length: total }).map((_, i) => {
      const done = i < step, cur = i === step;
      return (
        <span key={i} style={{
          height: 5,
          flex: 1,
          borderRadius: 999,
          transition: "background .3s, transform .3s",
          background: done || cur ? "var(--accent)" : "var(--ink-200)",
          transform: cur ? "scaleY(1.4)" : "none",
          transformOrigin: "center",
        }} />
      );
    })}
  </div>
);

/* ── StepLabel ──────────────────────────────────────────────────────────── */

interface StepLabelProps {
  step: number;
  total: number;
  label: string;
}

export const StepLabel = ({ step, total, label }: StepLabelProps) => (
  <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 9 }}>
    <span className="eyebrow" style={{ color: "var(--accent-strong)" }}>{label}</span>
    <span className="tnum" style={{ fontSize: 11.5, color: "var(--ink-400)", fontWeight: 600 }}>Step {step + 1} of {total}</span>
  </div>
);

/* ── FChip ──────────────────────────────────────────────────────────────── */

interface FChipProps {
  label: string;
  active: boolean;
  onClick: () => void;
}

export const FChip = ({ label, active, onClick }: FChipProps) => (
  <button onClick={onClick} className="tap" data-active={active} style={{
    display: "inline-flex",
    alignItems: "center",
    gap: 7,
    minHeight: 44,
    padding: "0 17px",
    borderRadius: 999,
    cursor: "pointer",
    fontSize: 14.5,
    fontWeight: 560,
    fontFamily: "inherit",
    lineHeight: 1.1,
    transition: "background .14s, border-color .14s, color .14s, transform .08s",
    border: active ? "1.5px solid var(--accent)" : "1.5px solid var(--ink-200)",
    background: active ? "var(--accent)" : "var(--white)",
    color: active ? "var(--accent-fg)" : "var(--ink-700)",
    boxShadow: active ? "var(--shadow-sm)" : "var(--shadow-xs)",
  }}>
    {active && <Icon name="check" size={15} />}
    {label}
  </button>
);

/* ── ChipWrap ───────────────────────────────────────────────────────────── */

interface ChipWrapProps {
  children: React.ReactNode;
}

export const ChipWrap = ({ children }: ChipWrapProps) => (
  <div style={{ display: "flex", flexWrap: "wrap", gap: 10 }}>{children}</div>
);

/* ── BigBtn ─────────────────────────────────────────────────────────────── */

interface BigBtnProps {
  children: React.ReactNode;
  onClick?: () => void;
  variant?: "primary" | "secondary" | "ghost";
  disabled?: boolean;
  full?: boolean;
  icon?: IconName;
  style?: React.CSSProperties;
}

export const BigBtn = ({ children, onClick, variant = "primary", disabled, full = true, icon, style = {} }: BigBtnProps) => (
  <button onClick={onClick} disabled={disabled} className="tap" style={{
    display: "inline-flex",
    alignItems: "center",
    justifyContent: "center",
    gap: 9,
    width: full ? "100%" : "auto",
    minHeight: 52,
    padding: "0 24px",
    borderRadius: 14,
    cursor: disabled ? "not-allowed" : "pointer",
    fontSize: 15.5,
    fontWeight: 600,
    fontFamily: "inherit",
    border: "1.5px solid transparent",
    opacity: disabled ? 0.45 : 1,
    transition: "background .14s, border-color .14s, color .14s, transform .06s, box-shadow .14s",
    ...(variant === "primary"
      ? { background: "var(--accent)", color: "var(--accent-fg)", boxShadow: "var(--shadow-sm), inset 0 1px 0 rgba(255,255,255,.16)" }
      : variant === "secondary"
      ? { background: "var(--white)", color: "var(--ink-800)", borderColor: "var(--ink-200)", boxShadow: "var(--shadow-xs)" }
      : { background: "var(--ink-100)", color: "var(--ink-700)" }),
    ...style,
  }}>
    {children}{icon && <Icon name={icon} size={18} />}
  </button>
);

/* ── ActionPill ─────────────────────────────────────────────────────────── */

interface ActionPillProps {
  children: React.ReactNode;
  onClick?: () => void;
  active?: boolean;
  icon?: IconName;
  /** Teal-filled treatment (accent background, white text) — same pill shape as the others. */
  filled?: boolean;
}

export const ActionPill = ({ children, onClick, active, icon, filled }: ActionPillProps) => (
  <button onClick={onClick} className="tap" data-active={active} style={{
    display: "inline-flex",
    alignItems: "center",
    gap: 6,
    minHeight: 38,
    padding: "0 14px",
    borderRadius: 999,
    cursor: "pointer",
    fontSize: 13,
    fontWeight: 560,
    fontFamily: "inherit",
    transition: "background .14s, border-color .14s, color .14s",
    border: filled || active ? "1.5px solid var(--accent)" : "1px solid var(--ink-200)",
    background: filled ? "var(--accent)" : active ? "var(--accent-soft)" : "var(--white)",
    color: filled ? "var(--accent-fg)" : active ? "var(--accent-strong)" : "var(--ink-600)",
  }}>
    {icon && <Icon name={icon} size={14} />}{children}
  </button>
);

/* ── ReviewShimmer (AI transform loader, overlays the editor while a tool runs) ── */

export const ReviewShimmer = ({ label = "AI is writing…" }: { label?: string }) => (
  <div className="fk-shimmer-overlay" role="status" aria-live="polite">
    <span className="fk-shimmer-chip"><Icon name="sparkles" size={13} />{label}</span>
    <span className="fk-shimmer-line" style={{ width: "100%" }} />
    <span className="fk-shimmer-line" style={{ width: "94%" }} />
    <span className="fk-shimmer-line" style={{ width: "82%" }} />
    <span className="fk-shimmer-line" style={{ width: "66%" }} />
  </div>
);

/* ── StarPicker ─────────────────────────────────────────────────────────── */

interface StarPickerProps {
  value: number;
  onChange: (n: number) => void;
}

export const StarPicker = ({ value, onChange }: StarPickerProps) => {
  const [hover, setHover] = useState(0);
  const shown = hover || value;
  return (
    <div style={{ textAlign: "center" }}>
      <div onMouseLeave={() => setHover(0)} style={{ display: "inline-flex", gap: 6 }}>
        {[1, 2, 3, 4, 5].map(n => {
          const on = n <= shown;
          return (
            <button
              key={n}
              onMouseEnter={() => setHover(n)}
              onClick={() => onChange(n)}
              aria-label={`${n} star${n > 1 ? "s" : ""}`}
              className="tap"
              style={{
                border: 0,
                background: "transparent",
                cursor: "pointer",
                padding: 4,
                lineHeight: 0,
                transform: on ? "scale(1)" : "scale(.94)",
                transition: "transform .16s cubic-bezier(.2,.7,.2,1)",
              }}
            >
              <svg
                viewBox="0 0 24 24"
                width="44"
                height="44"
                fill={on ? "var(--star)" : "none"}
                stroke={on ? "var(--star)" : "var(--ink-300)"}
                strokeWidth="1.6"
                strokeLinejoin="round"
                style={{
                  transition: "fill .16s, stroke .16s, filter .16s",
                  filter: on ? "drop-shadow(0 2px 5px color-mix(in srgb, var(--star) 45%, transparent))" : "none",
                }}
              >
                <path d="M12 2.5l2.9 6.06 6.6.86-4.85 4.55 1.24 6.58L12 18.6l-5.93 3.41 1.24-6.58L2.46 9.42l6.6-.86z" />
              </svg>
            </button>
          );
        })}
      </div>
      <div style={{ height: 22, marginTop: 6 }}>
        {shown > 0 && (
          <span
            key={shown}
            className="anim-up"
            style={{
              fontSize: 14.5,
              fontWeight: 640,
              color: shown >= 4 ? "var(--accent-strong)" : shown === 3 ? "var(--warning)" : "var(--ink-500)",
            }}
          >
            {RATING_LABELS[shown]}
          </span>
        )}
      </div>
    </div>
  );
};

/* ── AiThinking ─────────────────────────────────────────────────────────── */

interface AiThinkingProps {
  label?: string;
}

export const AiThinking = ({ label = "Writing your review…" }: AiThinkingProps) => (
  <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 16, padding: "40px 0" }}>
    <div style={{ position: "relative", width: 52, height: 52 }}>
      <span style={{ position: "absolute", inset: 0, borderRadius: "50%", border: "3px solid var(--accent-soft)" }} />
      <span style={{ position: "absolute", inset: 0, borderRadius: "50%", border: "3px solid transparent", borderTopColor: "var(--accent)", animation: "fkspin .8s linear infinite" }} />
      <Icon name="sparkles" size={20} style={{ position: "absolute", inset: 0, margin: "auto", color: "var(--accent-strong)" }} />
    </div>
    <span style={{ fontSize: 14, color: "var(--ink-500)", fontWeight: 540 }}>{label}</span>
  </div>
);

/* ── Confetti ───────────────────────────────────────────────────────────── */

interface ConfettiProps {
  fire: boolean;
}

export const Confetti = ({ fire }: ConfettiProps) => {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!fire || !ref.current) return;
    if (matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const host = ref.current;
    const colors = ["#37aeb7", "#f3a93c", "#15924f", "#4285f4", "#ec4899", "#8b5cf6"];
    const N = 90;
    for (let i = 0; i < N; i++) {
      const p = document.createElement("span");
      const sz = 6 + Math.random() * 7;
      p.style.cssText = `position:absolute;left:50%;top:34%;width:${sz}px;height:${sz * 0.6}px;background:${colors[i % colors.length]};border-radius:2px;pointer-events:none;opacity:1;will-change:transform,opacity;`;
      host.appendChild(p);
      const ang = (Math.PI * 2 * i) / N + Math.random() * 0.5;
      const vel = 120 + Math.random() * 260;
      const dx = Math.cos(ang) * vel, dy = Math.sin(ang) * vel - 120;
      const rot = (Math.random() * 720 - 360);
      p.animate([
        { transform: "translate(-50%,-50%) rotate(0deg)", opacity: 1 },
        { transform: `translate(calc(-50% + ${dx}px), calc(-50% + ${dy + 360}px)) rotate(${rot}deg)`, opacity: 0 },
      ], { duration: 1100 + Math.random() * 700, easing: "cubic-bezier(.15,.6,.4,1)", fill: "forwards" });
      setTimeout(() => p.remove(), 2000);
    }
  }, [fire]);
  return <div ref={ref} style={{ position: "absolute", inset: 0, overflow: "hidden", pointerEvents: "none", zIndex: 5 }} />;
};

/* ── SuccessCheck ───────────────────────────────────────────────────────── */

interface SuccessCheckProps {
  tone?: "accent" | "success";
  size?: number;
}

export const SuccessCheck = ({ tone = "accent", size = 76 }: SuccessCheckProps) => {
  const col = tone === "accent" ? "var(--accent)" : "var(--success)";
  return (
    <div style={{
      width: size,
      height: size,
      borderRadius: "50%",
      display: "grid",
      placeItems: "center",
      margin: "0 auto",
      background: tone === "accent" ? "var(--accent-soft)" : "var(--success-soft)",
      animation: "fkpop .4s cubic-bezier(.2,.7,.2,1) both",
    }}>
      <svg
        viewBox="0 0 24 24"
        width={size * 0.5}
        height={size * 0.5}
        fill="none"
        stroke={col}
        strokeWidth="2.6"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        <path
          d="M20 6L9 17l-5-5"
          style={{ strokeDasharray: 30, strokeDashoffset: 30, animation: "fkdraw .5s .15s cubic-bezier(.2,.7,.2,1) forwards" }}
        />
      </svg>
    </div>
  );
};

/* ── ScreenCard ─────────────────────────────────────────────────────────── */

interface ScreenCardProps {
  children: React.ReactNode;
}

export const ScreenCard = ({ children }: ScreenCardProps) => (
  <div className="fk-screencard">{children}</div>
);

/* ── Stars ──────────────────────────────────────────────────────────────── */

interface StarsProps {
  value?: number;
  size?: number;
  gap?: number;
}

export const Stars = ({ value = 0, size = 14, gap = 1.5 }: StarsProps) => {
  const full = Math.floor(value);
  const frac = value - full;
  return (
    <span style={{ display: "inline-flex", gap }}>
      {[0, 1, 2, 3, 4].map(i => {
        const fill = i < full ? 1 : (i === full ? frac : 0);
        return (
          <span key={i} style={{ position: "relative", width: size, height: size, display: "inline-block" }}>
            <svg viewBox="0 0 24 24" width={size} height={size} style={{ position: "absolute", inset: 0 }}>
              <path d="M12 3.6l2.6 5.3 5.8.85-4.2 4.1 1 5.78L12 17.9l-5.2 2.73 1-5.78-4.2-4.1 5.8-.85z" fill="#e6e6ea" />
            </svg>
            <span style={{ position: "absolute", inset: 0, width: `${fill * 100}%`, overflow: "hidden" }}>
              <svg viewBox="0 0 24 24" width={size} height={size} style={{ display: "block" }}>
                <path d="M12 3.6l2.6 5.3 5.8.85-4.2 4.1 1 5.78L12 17.9l-5.2 2.73 1-5.78-4.2-4.1 5.8-.85z" fill="var(--star)" />
              </svg>
            </span>
          </span>
        );
      })}
    </span>
  );
};

/* ── Avatar ─────────────────────────────────────────────────────────────── */

const AV_COLORS = ["#6366f1", "#0ea5e9", "#10b981", "#f59e0b", "#ef4444", "#8b5cf6", "#ec4899", "#14b8a6"];

interface AvatarProps {
  name?: string;
  size?: number;
  src?: string | null;
}

export const Avatar = ({ name = "", size = 34, src: _src = null }: AvatarProps) => {
  const initials = name.split(" ").map(w => (w[0] ?? "")).slice(0, 2).join("").toUpperCase();
  const ci = name.split("").reduce((a, c) => a + c.charCodeAt(0), 0) % AV_COLORS.length;
  const c = AV_COLORS[ci];
  return (
    <span style={{
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
    }}>
      {initials}
    </span>
  );
};
