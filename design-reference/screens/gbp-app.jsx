/* GBP Manager — app shell: sidebar nav, topbar, routing, tweaks. */

const { useState: useStateAP, useEffect: useEffectAP, useRef: useRefAP } = React;

const GBP_NAV = [
  { label: null, items: [{ id: "dashboard", label: "Dashboard", icon: "grid" }] },
  { label: "Reputation", items: [
    { id: "reviews", label: "Reviews", icon: "star" },
    { id: "drafts", label: "AI Reply Drafts", icon: "sparkle" },
  ]},
  { label: "Content", items: [
    { id: "posts", label: "Google Posts", icon: "megaphone" },
    { id: "scheduler", label: "Post Scheduler", icon: "calendar" },
  ]},
  { label: "Performance", items: [
    { id: "insights", label: "Insights", icon: "barChart" },
    { id: "audit", label: "Local SEO Audit", icon: "target" },
  ]},
  { label: "Manage", items: [
    { id: "locations", label: "Locations", icon: "pin" },
    { id: "tasks", label: "Tasks", icon: "listChecks" },
  ]},
  { label: "Account", items: [
    { id: "settings", label: "Google Connection", icon: "plug" },
  ]},
];
const NAV_FLAT_G = GBP_NAV.flatMap(g => g.items);
const NAV_BADGES = () => ({
  drafts: GBP_REPLY_DRAFTS.filter(d => d.status !== "confirmed").length,
  reviews: GBP_REVIEWS.filter(r => !r.reply).length,
  tasks: GBP_TASKS.filter(t => !t.done).length,
});

const GLogo = () => (
  <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
    <span style={{ width: 30, height: 30, borderRadius: 9, flex: "none", display: "grid", placeItems: "center", background: "var(--accent)", color: "#fff", boxShadow: "var(--shadow-sm)" }}>
      <Icon name="building" size={17} />
    </span>
    <span style={{ fontWeight: 700, fontSize: 15.5, letterSpacing: "-.02em" }}>GBP Manager</span>
  </div>
);

const GNavItem = ({ item, active, badge, onClick }) => (
  <button onClick={onClick} className="tap focus-ring" style={{ display: "flex", alignItems: "center", gap: 10, width: "100%", padding: "9px 11px", borderRadius: "var(--r-sm)", border: 0, cursor: "pointer",
    background: active ? "var(--accent-soft)" : "transparent", color: active ? "var(--accent-strong)" : "var(--ink-600)", fontSize: 13.5, fontWeight: active ? 580 : 500, textAlign: "left", whiteSpace: "nowrap" }}>
    <Icon name={item.icon} size={18} stroke={active ? 1.8 : 1.6} />
    <span>{item.label}</span>
    {badge > 0 && <span className="tnum" style={{ marginLeft: "auto", background: active ? "var(--accent)" : "var(--ink-200)", color: active ? "#fff" : "var(--ink-600)", fontSize: 11, fontWeight: 700, borderRadius: 999, padding: "1px 7px" }}>{badge}</span>}
  </button>
);

const GSidebar = ({ route, go }) => {
  const badges = NAV_BADGES();
  return (
    <aside style={{ width: "var(--sidebar-w)", flex: "none", borderRight: "1px solid var(--ink-200)", background: "var(--white)", display: "flex", flexDirection: "column", height: "100%", position: "sticky", top: 0 }}>
      <div style={{ padding: "18px 16px 14px" }}><GLogo /></div>
      <div style={{ padding: "0 12px", flex: 1, overflowY: "auto" }}>
        {GBP_NAV.map((group, gi) => (
          <div key={gi} style={{ marginTop: gi === 0 ? 0 : 16 }}>
            {group.label && <div className="eyebrow" style={{ padding: "0 11px", marginBottom: 6 }}>{group.label}</div>}
            <div style={{ display: "flex", flexDirection: "column", gap: 2 }}>
              {group.items.map(it => <GNavItem key={it.id} item={it} active={route === it.id} badge={badges[it.id]} onClick={() => go(it.id)} />)}
            </div>
          </div>
        ))}
      </div>
      <div style={{ padding: 12 }}>
        <div style={{ borderRadius: "var(--r-md)", border: "1px solid var(--ink-200)", padding: 14, background: "linear-gradient(160deg, var(--accent-softer), var(--white))" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 6 }}><Icon name="google" size={15} style={{ color: "var(--success)" }} /><span style={{ fontSize: 13, fontWeight: 620 }}>Google connected</span></div>
          <p style={{ fontSize: 12, color: "var(--ink-500)", lineHeight: 1.5, marginBottom: 10 }}>3 profiles syncing · last sync {GBP_CONNECTION.lastSync}.</p>
          <button className="btn btn-secondary btn-sm" style={{ width: "100%" }} onClick={() => go("settings")}>Manage connection</button>
        </div>
      </div>
    </aside>
  );
};

const GLocationSwitcher = () => {
  const [open, setOpen] = useStateAP(false);
  const [sel, setSel] = useStateAP(GBP_ALL);
  const ref = useRefAP(null);
  useEffectAP(() => { const h = e => { if (ref.current && !ref.current.contains(e.target)) setOpen(false); }; document.addEventListener("mousedown", h); return () => document.removeEventListener("mousedown", h); }, []);
  const all = [GBP_ALL, ...GBP_LOCATIONS];
  return (
    <div ref={ref} style={{ position: "relative" }}>
      <button onClick={() => setOpen(o => !o)} className="tap focus-ring" style={{ display: "flex", alignItems: "center", gap: 10, padding: "6px 10px 6px 8px", borderRadius: "var(--r-sm)", border: "1px solid var(--ink-200)", background: "var(--white)", cursor: "pointer", boxShadow: "var(--shadow-xs)" }}>
        <span style={{ width: 28, height: 28, borderRadius: 7, flex: "none", display: "grid", placeItems: "center", background: "var(--accent-soft)", color: "var(--accent-strong)" }}><Icon name={sel.id === "all" ? "grid" : "pin"} size={15} /></span>
        <span style={{ textAlign: "left", lineHeight: 1.25, whiteSpace: "nowrap" }}>
          <span style={{ display: "block", fontSize: 13, fontWeight: 600 }}>{sel.id === "all" ? "All locations" : sel.area}</span>
          <span style={{ display: "block", fontSize: 11.5, color: "var(--ink-400)" }}>{sel.id === "all" ? sel.area : sel.title}</span>
        </span>
        <Icon name="chevDown" size={15} style={{ color: "var(--ink-400)", transform: open ? "rotate(180deg)" : "none", transition: "transform .15s" }} />
      </button>
      {open && (
        <div className="card" style={{ position: "absolute", top: "calc(100% + 6px)", left: 0, width: 280, padding: 6, boxShadow: "var(--shadow-pop)", zIndex: 50, animation: "pop .14s ease both" }}>
          <div className="eyebrow" style={{ padding: "8px 10px 6px" }}>Switch profile</div>
          {all.map(l => {
            const active = l.id === sel.id;
            return (
              <button key={l.id} onClick={() => { setSel(l); setOpen(false); }} className="tap" style={{ width: "100%", display: "flex", alignItems: "center", gap: 10, padding: "9px 10px", borderRadius: "var(--r-sm)", border: 0, cursor: "pointer", background: active ? "var(--accent-soft)" : "transparent", textAlign: "left" }}>
                <span style={{ width: 26, height: 26, borderRadius: 7, flex: "none", display: "grid", placeItems: "center", background: active ? "var(--accent)" : "var(--ink-100)", color: active ? "#fff" : "var(--ink-500)" }}><Icon name={l.id === "all" ? "grid" : "pin"} size={14} /></span>
                <span style={{ flex: 1, minWidth: 0 }}>
                  <span style={{ display: "block", fontSize: 13, fontWeight: 560 }}>{l.id === "all" ? "All locations" : l.area}</span>
                  <span style={{ display: "block", fontSize: 11.5, color: "var(--ink-400)" }}>{l.id === "all" ? l.area : l.city}</span>
                </span>
                {l.id !== "all" && !l.verified && <span className="badge badge-warning" style={{ height: 18, fontSize: 10.5 }}>Unverif.</span>}
                <span className="tnum" style={{ fontSize: 12, color: "var(--ink-400)" }}>{l.rating}★</span>
                {active && <Icon name="check" size={15} style={{ color: "var(--accent)" }} />}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
};

const GTopActions = () => (
  <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
    <div style={{ position: "relative", width: 230 }} className="search-box">
      <Icon name="search" size={16} style={{ position: "absolute", left: 11, top: 11, color: "var(--ink-400)" }} />
      <input className="input focus-ring" placeholder="Search reviews, posts…" style={{ paddingLeft: 34, paddingRight: 52, height: 38 }} />
      <span style={{ position: "absolute", right: 8, top: 9, display: "flex", gap: 3 }}><span className="kbd">⌘</span><span className="kbd">K</span></span>
    </div>
    <button className="btn btn-ghost btn-icon" title="Notifications" style={{ position: "relative" }}>
      <Icon name="bell" size={18} />
      <span style={{ position: "absolute", top: 7, right: 8, width: 7, height: 7, borderRadius: "50%", background: "var(--danger)", border: "2px solid var(--white)" }} />
    </button>
    <button className="btn btn-ghost btn-icon" title="Help"><Icon name="help" size={18} /></button>
    <div style={{ width: 1, height: 24, background: "var(--ink-200)" }} />
    <button className="tap focus-ring" style={{ display: "flex", alignItems: "center", gap: 8, padding: "4px 6px 4px 4px", borderRadius: "var(--r-full)", border: 0, background: "transparent", cursor: "pointer" }}>
      <Avatar name="Sarah Klein" size={30} /><Icon name="chevDown" size={14} style={{ color: "var(--ink-400)" }} />
    </button>
  </div>
);

const GBP_TWEAK_DEFAULTS = /*EDITMODE-BEGIN*/{
  "accent": "#37aeb7",
  "density": "comfortable",
  "chartStyle": "area"
}/*EDITMODE-END*/;

function GBPApp() {
  const [t, setTweak] = useTweaks(GBP_TWEAK_DEFAULTS);
  const validRoutes = NAV_FLAT_G.map(n => n.id);
  const getInitial = () => { const h = (window.location.hash || "").replace("#", ""); return validRoutes.includes(h) ? h : "dashboard"; };
  const [route, setRoute] = useStateAP(getInitial);
  const [detail, setDetail] = useStateAP(null);

  const go = (r, opts = {}) => { setDetail(opts.detail || null); setRoute(r); window.scrollTo && window.scrollTo(0, 0); const main = document.getElementById("gbp-main"); if (main) main.scrollTop = 0; };
  useEffectAP(() => { try { window.history.replaceState(null, "", "#" + route); } catch (e) {} }, [route]);
  const openDetail = (id) => { setDetail(id); setRoute("locations"); };

  let content;
  if (route === "dashboard") content = <GBPDashboard tweaks={t} go={go} />;
  else if (route === "reviews") content = <GBPReviews go={go} />;
  else if (route === "drafts") content = <GBPDrafts go={go} />;
  else if (route === "posts") content = <GBPPosts go={go} />;
  else if (route === "scheduler") content = <GBPScheduler go={go} />;
  else if (route === "insights") content = <GBPInsights tweaks={t} />;
  else if (route === "audit") content = <GBPAudit go={go} />;
  else if (route === "locations") content = detail ? <GBPLocationDetail locId={detail} onBack={() => setDetail(null)} go={go} /> : <GBPLocations go={go} openDetail={openDetail} />;
  else if (route === "tasks") content = <GBPTasks go={go} />;
  else if (route === "settings") content = <GBPSettings />;
  else content = <GBPDashboard tweaks={t} go={go} />;

  return (
    <ToastProvider>
      <div className={t.density === "compact" ? "density-compact" : ""} style={{ "--accent": t.accent, height: "100%", display: "flex", flexDirection: "row", background: "var(--page)" }}>
        <GSidebar route={detail ? "locations" : route} go={go} />
        <div style={{ flex: 1, minWidth: 0, display: "flex", flexDirection: "column", height: "100%" }}>
          <header style={{ height: "var(--topbar-h)", flex: "none", borderBottom: "1px solid var(--ink-200)", background: "color-mix(in srgb, var(--white) 80%, transparent)", backdropFilter: "blur(8px)", position: "sticky", top: 0, zIndex: 30, display: "flex", alignItems: "center", gap: 16, padding: "0 var(--gutter)" }}>
            <GLocationSwitcher />
            <div style={{ marginLeft: "auto", display: "flex", alignItems: "center", gap: 12 }}><GTopActions /></div>
          </header>
          <main id="gbp-main" style={{ flex: 1, overflowY: "auto", minHeight: 0 }}>{content}</main>
        </div>

        <TweaksPanel>
          <TweakSection label="Theme" />
          <TweakColor label="Accent" value={t.accent} options={["#37aeb7", "#1a73e8", "#4f46e5", "#1f8a5b", "#7c3aed"]} onChange={v => setTweak("accent", v)} />
          <TweakRadio label="Density" value={t.density} options={[{ value: "comfortable", label: "Comfortable" }, { value: "compact", label: "Compact" }]} onChange={v => setTweak("density", v)} />
          <TweakSection label="Charts" />
          <TweakRadio label="Trend style" value={t.chartStyle} options={[{ value: "area", label: "Area" }, { value: "bars", label: "Bars" }]} onChange={v => setTweak("chartStyle", v)} />
        </TweaksPanel>
      </div>
    </ToastProvider>
  );
}

ReactDOM.createRoot(document.getElementById("root")).render(<GBPApp />);
