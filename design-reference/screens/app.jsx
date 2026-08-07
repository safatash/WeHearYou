/* WeHearYou — app shell: navigation, topbar, routing, tweaks */

const { useState: useStateA, useEffect: useEffectA, useRef: useRefA } = React;

const NAV_GROUPS = [
  { label: null, items: [
    { id: "dashboard", label: "Dashboard", icon: "grid" },
  ]},
  { label: "Requests & Feedback", items: [
    { id: "contacts", label: "Contacts", icon: "users" },
    { id: "campaigns", label: "Review Requests", icon: "bell" },
    { id: "review-links", label: "Review Links", icon: "mail" },
    { id: "gbp-reviews", label: "Review Inbox", icon: "inbox" },
  ]},
  { label: "Funnel Setup", items: [
    { id: "wizard", label: "Campaign Wizard", icon: "sparkle" },
    { id: "funnel-builder", label: "Funnel Builder", icon: "layers" },
  ]},
  { label: "Website Displays", items: [
    { id: "locations", label: "Locations", icon: "pin" },
    { id: "widgets", label: "Widgets", icon: "widget" },
    { id: "video", label: "Video Testimonials", icon: "film" },
  ]},
  { label: "Google Business Profile", items: [
    { id: "gbp-manager", label: "GBP Manager", icon: "map" },
    { id: "gbp-drafts", label: "AI Reply Drafts", icon: "sparkle" },
    { id: "gbp-posts", label: "GBP Posts", icon: "megaphone" },
    { id: "gbp-scheduler", label: "Post Scheduler", icon: "calendar" },
    { id: "gbp-insights", label: "Insights", icon: "barChart" },
    { id: "gbp-audit", label: "Local SEO Audit", icon: "target" },
    { id: "gbp-locations", label: "Locations", icon: "pin" },
    { id: "gbp-tasks", label: "Tasks", icon: "listChecks" },
    { id: "gbp-settings", label: "Google Connection", icon: "plug" },
  ]},
  { label: "Settings", items: [
    { id: "automation", label: "Automation", icon: "sliders" },
    { id: "integrations", label: "Integrations", icon: "plug" },
  ]},
];
const NAV_FLAT = NAV_GROUPS.flatMap(g => g.items);
const NAV_FOOT = [
  { id: "foundations", label: "Design System", icon: "palette" },
];

/* ---- Logo ---- */
const Logo = ({ compact = false }) => (
  <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
    <span style={{ width: 30, height: 30, borderRadius: 9, flex: "none", display: "grid", placeItems: "center",
      background: "var(--accent)", color: "#fff", boxShadow: "var(--shadow-sm)" }}>
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none"><path d="M4 11.5a7.5 7.5 0 0 1 15 0c0 5-7 9.5-7 9.5" stroke="#fff" strokeWidth="2" strokeLinecap="round"/><path d="M8.5 11.5h.01M12 11.5h.01M15.5 11.5h.01" stroke="#fff" strokeWidth="2.4" strokeLinecap="round"/></svg>
    </span>
    {!compact && <span style={{ fontWeight: 700, fontSize: 16, letterSpacing: "-.02em" }}>WeHearYou</span>}
  </div>
);

/* ---- Location switcher ---- */
const LocationSwitcher = ({ loc, setLoc }) => {
  const [open, setOpen] = useStateA(false);
  const ref = useRefA(null);
  useEffectA(() => {
    const h = e => { if (ref.current && !ref.current.contains(e.target)) setOpen(false); };
    document.addEventListener("mousedown", h); return () => document.removeEventListener("mousedown", h);
  }, []);
  return (
    <div ref={ref} style={{ position: "relative" }}>
      <button onClick={() => setOpen(o => !o)} className="tap focus-ring"
        style={{ display: "flex", alignItems: "center", gap: 10, padding: "6px 10px 6px 8px", borderRadius: "var(--r-sm)",
          border: "1px solid var(--ink-200)", background: "var(--white)", cursor: "pointer", boxShadow: "var(--shadow-xs)" }}>
        <span style={{ width: 28, height: 28, borderRadius: 7, flex:"none", display: "grid", placeItems: "center", background: "var(--accent-soft)", color: "var(--accent-strong)" }}>
          <Icon name="pin" size={15}/>
        </span>
        <span style={{ textAlign: "left", lineHeight: 1.25, whiteSpace: "nowrap" }}>
          <span style={{ display: "block", fontSize: 13, fontWeight: 600 }}>{loc.name}</span>
          <span style={{ display: "block", fontSize: 11.5, color: "var(--ink-400)" }}>{loc.area}</span>
        </span>
        <Icon name="chevDown" size={15} style={{ color: "var(--ink-400)", transform: open?"rotate(180deg)":"none", transition: "transform .15s" }}/>
      </button>
      {open && (
        <div className="card" style={{ position: "absolute", top: "calc(100% + 6px)", left: 0, width: 280, padding: 6, boxShadow: "var(--shadow-pop)", zIndex: 50, animation: "pop .14s ease both" }}>
          <div className="eyebrow" style={{ padding: "8px 10px 6px" }}>Switch location</div>
          {LOCATIONS.map(l => {
            const active = l.id === loc.id;
            return (
              <button key={l.id} onClick={() => { setLoc(l); setOpen(false); }} className="tap"
                style={{ width: "100%", display: "flex", alignItems: "center", gap: 10, padding: "9px 10px", borderRadius: "var(--r-sm)", border: 0, cursor: "pointer",
                  background: active?"var(--accent-soft)":"transparent", textAlign: "left" }}>
                <span style={{ width: 26, height: 26, borderRadius: 7, flex:"none", display: "grid", placeItems: "center",
                  background: active?"var(--accent)":"var(--ink-100)", color: active?"#fff":"var(--ink-500)" }}>
                  <Icon name={l.id==="all"?"grid":"pin"} size={14}/>
                </span>
                <span style={{ flex: 1, minWidth: 0 }}>
                  <span style={{ display: "block", fontSize: 13, fontWeight: 560 }}>{l.name}</span>
                  <span style={{ display: "block", fontSize: 11.5, color: "var(--ink-400)" }}>{l.area}</span>
                </span>
                {l.status === "attention" && <span className="badge badge-warning" style={{ height: 18, fontSize: 10.5 }}>Low</span>}
                <span className="tnum" style={{ fontSize: 12, color: "var(--ink-400)" }}>{l.rating}★</span>
                {active && <Icon name="check" size={15} style={{ color: "var(--accent)" }}/>}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
};

/* ---- Top bar (shared) ---- */
const TopActions = () => {
  const [q, setQ] = useStateA("");
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
      <div style={{ position: "relative", width: 230 }} className="search-box">
        <Icon name="search" size={16} style={{ position: "absolute", left: 11, top: 11, color: "var(--ink-400)" }}/>
        <input className="input focus-ring" value={q} onChange={e=>setQ(e.target.value)} placeholder="Search…" style={{ paddingLeft: 34, paddingRight: 52, height: 38 }}/>
        <span style={{ position: "absolute", right: 8, top: 9, display: "flex", gap: 3 }}>
          <span className="kbd">⌘</span><span className="kbd">K</span>
        </span>
      </div>
      <button className="btn btn-ghost btn-icon" title="Notifications" style={{ position: "relative" }}>
        <Icon name="bell" size={18}/>
        <span style={{ position: "absolute", top: 7, right: 8, width: 7, height: 7, borderRadius: "50%", background: "var(--danger)", border: "2px solid var(--white)" }}/>
      </button>
      <button className="btn btn-ghost btn-icon" title="Help"><Icon name="help" size={18}/></button>
      <div style={{ width: 1, height: 24, background: "var(--ink-200)" }}/>
      <button className="tap focus-ring" style={{ display: "flex", alignItems: "center", gap: 8, padding: "4px 6px 4px 4px", borderRadius: "var(--r-full)", border: 0, background: "transparent", cursor: "pointer" }}>
        <Avatar name="Sarah Klein" size={30}/>
        <Icon name="chevDown" size={14} style={{ color: "var(--ink-400)" }}/>
      </button>
    </div>
  );
};

/* ---- Sidebar ---- */
const NavItem = ({ item, active, onClick, horizontal }) => (
  <button onClick={onClick} className="tap focus-ring"
    style={{ display: "flex", alignItems: "center", gap: 10, width: horizontal?"auto":"100%",
      padding: horizontal ? "8px 12px" : "9px 11px", borderRadius: "var(--r-sm)", border: 0, cursor: "pointer", position: "relative",
      background: active ? (horizontal?"var(--ink-100)":"var(--accent-soft)") : "transparent",
      color: active ? (horizontal?"var(--ink-900)":"var(--accent-strong)") : "var(--ink-600)",
      fontSize: 13.5, fontWeight: active?580:500, textAlign: "left", whiteSpace: "nowrap" }}>
    <Icon name={item.icon} size={18} stroke={active?1.8:1.6}/>
    <span>{item.label}</span>
    {item.badge && <span className="tnum" style={{ marginLeft: "auto", background: active?"var(--accent)":"var(--ink-200)", color: active?"#fff":"var(--ink-600)", fontSize: 11, fontWeight: 700, borderRadius: 999, padding: "1px 7px" }}>{item.badge}</span>}
  </button>
);

const Sidebar = ({ route, setRoute }) => (
  <aside style={{ width: "var(--sidebar-w)", flex: "none", borderRight: "1px solid var(--ink-200)", background: "var(--white)",
    display: "flex", flexDirection: "column", height: "100%", position: "sticky", top: 0 }}>
    <div style={{ padding: "18px 16px 14px" }}><Logo/></div>
    <div style={{ padding: "0 12px", flex: 1, overflowY: "auto" }}>
      {NAV_GROUPS.map((group, gi) => (
        <div key={gi} style={{ marginTop: gi === 0 ? 0 : 16 }}>
          {group.label && (
            <div className="eyebrow" style={{ padding: "0 11px", marginBottom: 6 }}>{group.label}</div>
          )}
          <div style={{ display: "flex", flexDirection: "column", gap: 2 }}>
            {group.items.map(it => <NavItem key={it.id} item={it} active={route===it.id} onClick={() => setRoute(it.id)}/>)}
          </div>
        </div>
      ))}
      <div className="hr" style={{ margin: "16px 4px 14px" }}/>
      <div style={{ display: "flex", flexDirection: "column", gap: 2 }}>
        {NAV_FOOT.map(it => <NavItem key={it.id} item={it} active={route===it.id} onClick={() => setRoute(it.id)}/>)}
      </div>
    </div>
    {/* upgrade card */}
    <div style={{ padding: 12 }}>
      <div style={{ borderRadius: "var(--r-md)", border: "1px solid var(--ink-200)", padding: 14, background: "linear-gradient(160deg, var(--accent-softer), var(--white))" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 6 }}>
          <Icon name="sparkle" size={16} style={{ color: "var(--accent)" }}/>
          <span style={{ fontSize: 13, fontWeight: 620 }}>Pro trial</span>
        </div>
        <p style={{ fontSize: 12, color: "var(--ink-500)", lineHeight: 1.5, marginBottom: 10 }}>9 days left. Unlock unlimited campaigns & AI replies.</p>
        <button className="btn btn-primary btn-sm" style={{ width: "100%" }}>Upgrade</button>
      </div>
    </div>
  </aside>
);

/* ---- Placeholder for unbuilt routes ---- */
const Placeholder = ({ item }) => (
  <div style={{ maxWidth: 1240, margin: "0 auto", padding: "var(--gutter)" }}>
    <div style={{ display: "grid", placeItems: "center", minHeight: "60vh" }}>
      <div style={{ textAlign: "center", maxWidth: 420 }}>
        <div style={{ width: 64, height: 64, borderRadius: 18, margin: "0 auto 18px", display: "grid", placeItems: "center", background: "var(--accent-soft)", color: "var(--accent-strong)" }}>
          <Icon name={item.icon} size={30}/>
        </div>
        <h2 style={{ fontSize: 20, fontWeight: 680, letterSpacing: "-.02em" }}>{item.label}</h2>
        <p style={{ fontSize: 14, color: "var(--ink-500)", marginTop: 8, lineHeight: 1.6 }}>
          This area is part of the redesign roadmap. The <b>Dashboard</b> and <b>Design System</b> are built out — the rest reuse these same components and patterns.
        </p>
        <div style={{ display: "flex", gap: 10, justifyContent: "center", marginTop: 20 }}>
          <button className="btn btn-secondary" onClick={() => window.__setRoute && window.__setRoute("dashboard")}><Icon name="grid" size={16}/>Back to dashboard</button>
          <button className="btn btn-primary" onClick={() => window.__setRoute && window.__setRoute(item.id==="campaigns" ? "wizard" : item.id)}><Icon name="plus" size={16}/>New {item.label.toLowerCase().replace(/s$/, "")}</button>
        </div>
      </div>
    </div>
  </div>
);

/* ================= App ================= */
const TWEAK_DEFAULTS = /*EDITMODE-BEGIN*/{
  "nav": "sidebar",
  "accent": "#37aeb7",
  "density": "comfortable",
  "chartStyle": "area"
}/*EDITMODE-END*/;

function App() {
  const [t, setTweak] = useTweaks(TWEAK_DEFAULTS);
  const getInitial = () => {
    const h = (window.location.hash || "").replace("#", "");
    const ids = [...NAV_FLAT, ...NAV_FOOT].map(n => n.id).concat(["wizard"]);
    return ids.includes(h) ? h : "campaigns";
  };
  const [route, setRoute] = useStateA(getInitial);
  const [loc, setLoc] = useStateA(LOCATIONS[0]);
  const [detailLoc, setDetailLoc] = useStateA(null);
  const [miniSite, setMiniSite] = useStateA(null);
  const [gbpDetail, setGbpDetail] = useStateA(null);
  const go = (r) => { setDetailLoc(null); setMiniSite(null); setGbpDetail(null); setRoute(r); };
  /* GBP screens use bare route names internally — map them to the integrated gbp-* routes */
  const gbpRouteMap = { dashboard: "gbp-manager", reviews: "gbp-reviews", drafts: "gbp-drafts", posts: "gbp-posts", scheduler: "gbp-scheduler", insights: "gbp-insights", audit: "gbp-audit", locations: "gbp-locations", tasks: "gbp-tasks", settings: "gbp-settings" };
  const gbpGo = (r, opts = {}) => {
    if (r === "locations") { setGbpDetail(opts.detail || null); setRoute("gbp-locations"); }
    else { setGbpDetail(null); setRoute(gbpRouteMap[r] || r); }
    const main = document.getElementById("why-main"); if (main) main.scrollTop = 0;
  };
  useEffectA(() => { window.__setRoute = go; }, []);
  useEffectA(() => { try { window.history.replaceState(null, "", "#" + route); } catch (e) {} }, [route]);

  const navItem = [...NAV_FLAT, ...NAV_FOOT].find(n => n.id === route);
  const isTop = t.nav === "topnav";

  // Public mini-site is a full-screen takeover (no app chrome)
  if (miniSite) {
    const m = buildLocationModel(LOCATIONS.find(l => l.id === miniSite) || LOCATIONS[0]);
    return (
      <div className={t.density === "compact" ? "density-compact" : ""} style={{ "--accent": t.accent, height: "100%", display: "flex", flexDirection: "column", background: "var(--page)" }}>
        <div style={{ flex: "none", height: 52, borderBottom: "1px solid var(--ink-200)", background: "var(--ink-900)", color: "#fff",
          display: "flex", alignItems: "center", gap: 14, padding: "0 18px" }}>
          <button onClick={() => setMiniSite(null)} className="tap" style={{ display: "inline-flex", alignItems: "center", gap: 7, background: "rgba(255,255,255,.12)", color: "#fff", border: 0, height: 32, padding: "0 12px", borderRadius: "var(--r-sm)", cursor: "pointer", fontSize: 13, fontWeight: 540 }}>
            <Icon name="arrowRight" size={15} style={{ transform: "rotate(180deg)" }} />Back to admin
          </button>
          <span style={{ display: "inline-flex", alignItems: "center", gap: 7, fontSize: 12.5, color: "rgba(255,255,255,.65)" }}>
            <Icon name="eye" size={14} />Public preview
          </span>
          <span style={{ marginLeft: "auto", fontFamily: "var(--font-mono)", fontSize: 12.5, color: "rgba(255,255,255,.8)", display: "inline-flex", alignItems: "center", gap: 7 }}>
            <Icon name="link" size={13} />{m.publicUrl}
          </span>
        </div>
        <div style={{ flex: 1, overflowY: "auto", minHeight: 0 }}>
          <MiniSite model={m} />
        </div>
      </div>
    );
  }

  // Campaign wizard is a focused full-screen takeover (no app chrome)
  if (route === "wizard") {
    return (
      <div className={t.density === "compact" ? "density-compact" : ""} style={{ "--accent": t.accent, height: "100%" }}>
        <CampaignWizard onExit={() => setRoute("campaigns")}/>
        <TweaksPanel>
          <TweakSection label="Theme" />
          <TweakColor label="Accent" value={t.accent} options={["#37aeb7","#4f46e5","#2563eb","#7c3aed","#e0533d"]} onChange={v => setTweak("accent", v)} />
          <TweakRadio label="Density" value={t.density} options={[{value:"comfortable",label:"Comfortable"},{value:"compact",label:"Compact"}]} onChange={v => setTweak("density", v)} />
        </TweaksPanel>
      </div>
    );
  }

  const content = route === "dashboard" ? <Dashboard tweaks={t}/>
    : route === "widgets" ? <WidgetsPage/>
    : route === "video" ? <VideoTestimonials/>
    : route === "locations" ? (
        detailLoc
          ? <LocationDetail locId={detailLoc} onBack={() => setDetailLoc(null)} onOpenMiniSite={(id) => setMiniSite(id)} onSendRequest={() => go("campaigns")} />
          : <Locations onOpenDetail={setDetailLoc} />
      )
    : route === "review-links" ? <ReviewLinks/>
    : route === "campaigns" ? <ReviewRequest onExit={() => setRoute("dashboard")}/>
    : route === "foundations" ? <Foundations/>
    : route === "gbp-manager" ? <GBPDashboard tweaks={t} go={gbpGo}/>
    : route === "gbp-reviews" ? <GBPReviews go={gbpGo}/>
    : route === "gbp-drafts" ? <GBPDrafts go={gbpGo}/>
    : route === "gbp-posts" ? <GBPPosts go={gbpGo}/>
    : route === "gbp-scheduler" ? <GBPScheduler go={gbpGo}/>
    : route === "gbp-insights" ? <GBPInsights tweaks={t}/>
    : route === "gbp-audit" ? <GBPAudit go={gbpGo}/>
    : route === "gbp-locations" ? (
        gbpDetail
          ? <GBPLocationDetail locId={gbpDetail} onBack={() => setGbpDetail(null)} go={gbpGo}/>
          : <GBPLocations go={gbpGo} openDetail={(id) => { setGbpDetail(id); setRoute("gbp-locations"); }}/>
      )
    : route === "gbp-tasks" ? <GBPTasks go={gbpGo}/>
    : route === "gbp-settings" ? <GBPSettings/>
    : route === "funnel-builder" ? <FunnelBuilder go={setRoute}/>
    : route === "contacts" ? <Contacts/>
    : <Placeholder item={navItem}/>;

  return (
    <ToastProvider>
    <div className={t.density === "compact" ? "density-compact" : ""}
      style={{ "--accent": t.accent, height: "100%", display: "flex", flexDirection: isTop ? "column" : "row", background: "var(--page)" }}>

      {/* SIDEBAR layout */}
      {!isTop && <Sidebar route={route} setRoute={go}/>}

      <div style={{ flex: 1, minWidth: 0, display: "flex", flexDirection: "column", height: "100%" }}>
        {/* TOP BAR */}
        <header style={{ height: "var(--topbar-h)", flex: "none", borderBottom: "1px solid var(--ink-200)", background: "color-mix(in srgb, var(--white) 80%, transparent)",
          backdropFilter: "blur(8px)", position: "sticky", top: 0, zIndex: 30,
          display: "flex", alignItems: "center", gap: 16, padding: "0 var(--gutter)" }}>
          {isTop && <Logo/>}
          {isTop ? (
            <nav style={{ display: "flex", gap: 4, marginLeft: 8, flexWrap: "wrap" }} className="topnav">
              {NAV_FLAT.map(it => <NavItem key={it.id} item={it} active={route===it.id} onClick={() => go(it.id)} horizontal/>)}
            </nav>
          ) : (
            <LocationSwitcher loc={loc} setLoc={setLoc}/>
          )}
          <div style={{ marginLeft: "auto", display: "flex", alignItems: "center", gap: 12 }}>
            {isTop && <LocationSwitcher loc={loc} setLoc={setLoc}/>}
            <TopActions/>
          </div>
        </header>

        {/* SCROLL AREA */}
        <main id="why-main" style={{ flex: 1, overflowY: "auto", minHeight: 0 }}>
          {content}
        </main>
      </div>

      {/* TWEAKS */}
      <TweaksPanel>
        <TweakSection label="Navigation" />
        <TweakRadio label="Layout" value={t.nav} options={[{value:"sidebar",label:"Sidebar"},{value:"topnav",label:"Top nav"}]} onChange={v => setTweak("nav", v)} />
        <TweakSection label="Theme" />
        <TweakColor label="Accent" value={t.accent} options={["#37aeb7","#4f46e5","#2563eb","#7c3aed","#e0533d"]} onChange={v => setTweak("accent", v)} />
        <TweakRadio label="Density" value={t.density} options={[{value:"comfortable",label:"Comfortable"},{value:"compact",label:"Compact"}]} onChange={v => setTweak("density", v)} />
        <TweakSection label="Dashboard" />
        <TweakRadio label="Rating chart" value={t.chartStyle} options={[{value:"area",label:"Area"},{value:"bars",label:"Bars"}]} onChange={v => setTweak("chartStyle", v)} />
      </TweaksPanel>
    </div>
    </ToastProvider>
  );
}

ReactDOM.createRoot(document.getElementById("root")).render(<App/>);
