/* GBP Manager — shared UI atoms specific to this app.
   The ConfirmWrite modal embodies the product rule: every write to the Google
   Business Profile API is gated behind an explicit user confirmation, and AI
   output is never published without a human approving it first. */

const { useState: useStateGC, useEffect: useEffectGC, useRef: useRefGC, createContext: createCtxGC, useContext: useCtxGC } = React;

/* ---------- Toast ---------- */
const GToastCtx = createCtxGC(() => {});
const useToast = () => useCtxGC(GToastCtx);
const ToastProvider = ({ children }) => {
  const [toast, setToast] = useStateGC(null);
  const tRef = useRefGC(null);
  const fire = (msg, opts = {}) => { setToast({ msg, ...opts }); clearTimeout(tRef.current); tRef.current = setTimeout(() => setToast(null), opts.duration || 2600); };
  return (
    <GToastCtx.Provider value={fire}>
      {children}
      {toast && (
        <div className="anim-up" style={{ position: "fixed", bottom: 24, left: "50%", transform: "translateX(-50%)", zIndex: 400,
          background: "var(--ink-900)", color: "#fff", padding: "11px 16px", borderRadius: "var(--r-md)", fontSize: 13.3, fontWeight: 540,
          display: "flex", alignItems: "center", gap: 10, boxShadow: "var(--shadow-lg)", maxWidth: 460 }}>
          <Icon name={toast.icon || "check"} size={16} style={{ color: toast.tone === "danger" ? "var(--danger)" : "var(--accent)", flex: "none" }} />
          <span style={{ textWrap: "pretty" }}>{toast.msg}</span>
        </div>
      )}
    </GToastCtx.Provider>
  );
};

/* ---------- ConfirmWrite — gate for every Google API write ----------
   Renders a modal that shows exactly what will be sent to Google, the target
   profile, and the API method. Nothing reaches Google until the user confirms. */
const ConfirmWrite = ({ open, onClose, onConfirm, title, intent = "write", confirmLabel, target, method, children, danger, busyLabel = "Writing to Google…" }) => {
  const [busy, setBusy] = useStateGC(false);
  useEffectGC(() => {
    if (!open) { setBusy(false); return; }
    const onKey = (e) => { if (e.key === "Escape" && !busy) onClose(); };
    document.addEventListener("keydown", onKey);
    const prev = document.body.style.overflow; document.body.style.overflow = "hidden";
    return () => { document.removeEventListener("keydown", onKey); document.body.style.overflow = prev; };
  }, [open, busy]);
  if (!open) return null;
  const confirm = async () => { setBusy(true); await new Promise(r => setTimeout(r, 750)); setBusy(false); onConfirm && onConfirm(); };
  return (
    <div onClick={() => !busy && onClose()} style={{ position: "fixed", inset: 0, zIndex: 350, background: "rgba(12,12,16,.5)", backdropFilter: "blur(3px)", display: "grid", placeItems: "center", padding: 20, animation: "fade .16s ease both" }}>
      <div onClick={e => e.stopPropagation()} className="card" style={{ width: "min(480px, 100%)", padding: 0, boxShadow: "var(--shadow-pop)", animation: "pop .16s ease both", overflow: "hidden" }}>
        <div style={{ padding: "20px 22px 16px", display: "flex", gap: 14 }}>
          <span style={{ width: 40, height: 40, borderRadius: 11, flex: "none", display: "grid", placeItems: "center",
            background: danger ? "var(--danger-soft)" : "var(--accent-soft)", color: danger ? "var(--danger)" : "var(--accent-strong)" }}>
            <Icon name={danger ? "alert" : "google"} size={20} />
          </span>
          <div style={{ flex: 1, minWidth: 0 }}>
            <h3 style={{ fontSize: 16.5, fontWeight: 660, letterSpacing: "-.01em" }}>{title}</h3>
            <p style={{ fontSize: 12.8, color: "var(--ink-500)", marginTop: 4, lineHeight: 1.5 }}>
              This will {intent} on your live Google Business Profile. Review the details before confirming.
            </p>
          </div>
        </div>
        {(target || method || children) && (
          <div style={{ margin: "0 22px", border: "1px solid var(--ink-200)", borderRadius: "var(--r-md)", background: "var(--ink-50)", overflow: "hidden" }}>
            {target && (
              <div style={{ display: "flex", alignItems: "center", gap: 9, padding: "11px 13px", borderBottom: (method || children) ? "1px solid var(--ink-150)" : 0 }}>
                <Icon name="pin" size={14} style={{ color: "var(--ink-400)" }} />
                <span style={{ fontSize: 12.5, color: "var(--ink-500)" }}>Target</span>
                <span style={{ marginLeft: "auto", fontSize: 12.8, fontWeight: 560 }}>{target}</span>
              </div>
            )}
            {children && <div style={{ padding: "12px 13px", borderBottom: method ? "1px solid var(--ink-150)" : 0 }}>{children}</div>}
            {method && (
              <div style={{ display: "flex", alignItems: "center", gap: 9, padding: "9px 13px", background: "var(--white)" }}>
                <Icon name="code" size={13} style={{ color: "var(--ink-400)" }} />
                <span className="mono" style={{ fontSize: 11.5, color: "var(--ink-500)" }}>{method}</span>
              </div>
            )}
          </div>
        )}
        <div style={{ display: "flex", alignItems: "center", gap: 9, padding: "16px 22px 20px" }}>
          <span style={{ fontSize: 11.5, color: "var(--ink-400)", display: "inline-flex", alignItems: "center", gap: 5 }}>
            <Icon name="lock" size={12} />Gated write
          </span>
          <button className="btn btn-ghost" style={{ marginLeft: "auto" }} onClick={onClose} disabled={busy}>Cancel</button>
          <button className={"btn " + (danger ? "btn-primary" : "btn-primary")} onClick={confirm} disabled={busy}
            style={danger ? { background: "var(--danger)" } : {}}>
            {busy ? <><Icon name="refresh" size={15} className="spin" />{busyLabel}</> : <><Icon name="check" size={15} />{confirmLabel || "Confirm & publish"}</>}
          </button>
        </div>
      </div>
    </div>
  );
};

/* ---------- Page header ---------- */
const PageHeader = ({ eyebrow, title, sub, actions }) => (
  <div style={{ display: "flex", alignItems: "flex-end", justifyContent: "space-between", gap: 16, flexWrap: "wrap", marginBottom: "var(--gutter)" }}>
    <div>
      {eyebrow && <div className="eyebrow" style={{ marginBottom: 6 }}>{eyebrow}</div>}
      <h1 style={{ fontSize: 26, fontWeight: 680, letterSpacing: "-.025em" }}>{title}</h1>
      {sub && <p style={{ fontSize: 13.5, color: "var(--ink-500)", marginTop: 5, maxWidth: 640, textWrap: "pretty" }}>{sub}</p>}
    </div>
    {actions && <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>{actions}</div>}
  </div>
);

/* page wrapper */
const Page = ({ children, max = 1240 }) => (
  <div style={{ maxWidth: max, margin: "0 auto", padding: "var(--gutter)" }} className="anim-up">{children}</div>
);

/* ---------- Section header (inside cards) ---------- */
const SecHead = ({ title, sub, action }) => (
  <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12, marginBottom: 4 }}>
    <div>
      <h3 style={{ fontSize: 15, fontWeight: 640, letterSpacing: "-.01em" }}>{title}</h3>
      {sub && <div style={{ fontSize: 12, color: "var(--ink-400)", marginTop: 2 }}>{sub}</div>}
    </div>
    {action}
  </div>
);

/* ---------- Stars compact reading from starRating ---------- */
const StarRow = ({ value, size = 13 }) => <Stars value={value} size={size} />;

/* ---------- AI badge ---------- */
const AIBadge = ({ label = "AI draft" }) => (
  <span className="badge badge-accent" style={{ paddingLeft: 6 }}>
    <Icon name="sparkle" size={11} />{label}
  </span>
);

/* ---------- "Never auto-published" inline notice ---------- */
const GatedNotice = ({ children, icon = "shield" }) => (
  <div style={{ display: "flex", alignItems: "flex-start", gap: 9, padding: "10px 12px", borderRadius: "var(--r-md)", background: "var(--accent-softer)", border: "1px solid var(--accent-border)" }}>
    <Icon name={icon} size={15} style={{ color: "var(--accent-strong)", flex: "none", marginTop: 1 }} />
    <span style={{ fontSize: 12.3, color: "var(--ink-600)", lineHeight: 1.5, textWrap: "pretty" }}>{children}</span>
  </div>
);

/* ---------- Empty state ---------- */
const EmptyState = ({ icon, title, sub, action }) => (
  <div style={{ display: "grid", placeItems: "center", padding: "48px 20px", textAlign: "center" }}>
    <div style={{ maxWidth: 360 }}>
      <div style={{ width: 56, height: 56, borderRadius: 15, margin: "0 auto 14px", display: "grid", placeItems: "center", background: "var(--accent-soft)", color: "var(--accent-strong)" }}>
        <Icon name={icon} size={26} />
      </div>
      <h3 style={{ fontSize: 16, fontWeight: 640 }}>{title}</h3>
      {sub && <p style={{ fontSize: 13, color: "var(--ink-500)", marginTop: 6, lineHeight: 1.55 }}>{sub}</p>}
      {action && <div style={{ marginTop: 16 }}>{action}</div>}
    </div>
  </div>
);

/* ---------- Location pill (compact, for cards/rows) ---------- */
const LocPill = ({ loc }) => (
  <span style={{ display: "inline-flex", alignItems: "center", gap: 5, fontSize: 11.5, color: "var(--ink-400)" }}>
    <Icon name="pin" size={12} />{loc}
  </span>
);

/* ---------- Donut-free progress ring (profile completeness, audit score) ---------- */
const ScoreRing = ({ value, size = 64, thickness = 7, label, tone }) => {
  const r = (size - thickness) / 2;
  const C = 2 * Math.PI * r;
  const col = tone === "danger" ? "var(--danger)" : tone === "warning" ? "var(--warning)" : value >= 85 ? "var(--success)" : value >= 70 ? "var(--accent)" : "var(--warning)";
  return (
    <div style={{ position: "relative", width: size, height: size, flex: "none" }}>
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} style={{ transform: "rotate(-90deg)" }}>
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="var(--ink-150)" strokeWidth={thickness} />
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke={col} strokeWidth={thickness} strokeLinecap="round"
          strokeDasharray={`${(value / 100) * C} ${C}`} style={{ transition: "stroke-dasharray .9s cubic-bezier(.2,.7,.2,1)" }} />
      </svg>
      <div style={{ position: "absolute", inset: 0, display: "grid", placeContent: "center", textAlign: "center" }}>
        <span className="tnum" style={{ fontSize: size * 0.3, fontWeight: 700, letterSpacing: "-.02em", lineHeight: 1, color: col }}>{value}</span>
        {label && <span style={{ fontSize: 9, color: "var(--ink-400)" }}>{label}</span>}
      </div>
    </div>
  );
};

/* spin keyframe for busy buttons */
const __gbpSpin = document.createElement("style");
__gbpSpin.textContent = "@keyframes gbpspin{to{transform:rotate(360deg)}} .spin{animation:gbpspin .7s linear infinite}";
document.head.appendChild(__gbpSpin);

Object.assign(window, {
  ToastProvider, useToast, ConfirmWrite, PageHeader, Page, SecHead, StarRow,
  AIBadge, GatedNotice, EmptyState, LocPill, ScoreRing,
});
