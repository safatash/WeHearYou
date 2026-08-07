/* WeHearYou — Locations: portfolio overview + per-location reputation cards + detail drawer */

const { useState: useStateL, useEffect: useEffectL } = React;

const realLocs = () => LOCATIONS.filter(l => l.id !== "all");

/* small stacked source letter badges */
const SourceDots = ({ sources = [] }) => (
  <div style={{ display: "flex", alignItems: "center" }}>
    {sources.map((s, i) => {
      const m = SOURCE_META[s] || { color: "var(--ink-400)", letter: "?" };
      return (
        <span key={s} title={s} style={{ width: 20, height: 20, borderRadius: 6, background: m.color, color: "#fff",
          display: "grid", placeItems: "center", fontSize: 10, fontWeight: 800, fontFamily: "var(--font-mono)",
          border: "1.5px solid var(--white)", marginLeft: i === 0 ? 0 : -6 }}>{m.letter}</span>
      );
    })}
  </div>
);

const statusMeta = (status) => status === "attention"
  ? { label: "Needs attention", cls: "badge-warning", dot: "var(--warning)" }
  : { label: "Healthy", cls: "badge-success", dot: "var(--success)" };

/* ---------- location card ---------- */
const LocationCard = ({ l, onOpen }) => {
  const sm = statusMeta(l.status);
  const up = l.deltaRating >= 0;
  return (
    <div className="card loc-card" style={{ padding: "var(--card-pad)", display: "flex", flexDirection: "column", gap: 16 }}>
      {/* head */}
      <div style={{ display: "flex", alignItems: "flex-start", gap: 12 }}>
        <span style={{ width: 42, height: 42, borderRadius: 11, flex: "none", display: "grid", placeItems: "center",
          background: `hsl(${l.hue} 42% 94%)`, color: `hsl(${l.hue} 55% 32%)` }}>
          <Icon name="pin" size={20} />
        </span>
        <div style={{ minWidth: 0, flex: 1 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <h3 style={{ fontSize: 15.5, fontWeight: 660, letterSpacing: "-.01em", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{l.area}</h3>
            <span className={`badge ${sm.cls}`}><span className="dot" style={{ background: sm.dot }} />{sm.label}</span>
          </div>
          <div style={{ fontSize: 12.5, color: "var(--ink-400)", marginTop: 3, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
            {l.address} · {l.city}
          </div>
        </div>
      </div>

      {/* rating + trend */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12 }}>
        <div>
          <div style={{ display: "flex", alignItems: "baseline", gap: 8 }}>
            <span className="tnum" style={{ fontSize: 32, fontWeight: 700, letterSpacing: "-.03em", lineHeight: 1 }}>{l.rating}</span>
            <Stars value={l.rating} size={15} />
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 7, marginTop: 7 }}>
            <span className="tnum" style={{ fontSize: 12.5, color: "var(--ink-500)" }}>{l.reviews.toLocaleString()} reviews</span>
            <span className="badge" style={{ height: 18, paddingLeft: 5, fontSize: 11,
              background: `color-mix(in srgb, ${up ? "var(--success)" : "var(--danger)"} 12%, #fff)`, color: up ? "var(--success)" : "var(--danger)" }}>
              <Icon name="arrowUp" size={10} style={{ transform: up ? "none" : "rotate(180deg)" }} />
              <span className="tnum">{up ? "+" : ""}{l.deltaRating}</span>
            </span>
          </div>
        </div>
        <Sparkline data={l.spark} color={l.status === "attention" ? "var(--warning)" : "var(--accent)"} w={108} h={40} />
      </div>

      {/* mini stats */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 1, background: "var(--ink-150)",
        border: "1px solid var(--ink-150)", borderRadius: "var(--r-md)", overflow: "hidden" }}>
        {[
          { k: "Response rate", v: l.responseRate + "%", warn: l.responseRate < 75 },
          { k: "Pending", v: l.pending, warn: l.pending >= 5 },
          { k: "New (30d)", v: l.newThisMonth },
        ].map(s => (
          <div key={s.k} style={{ background: "var(--white)", padding: "11px 12px", textAlign: "center" }}>
            <div className="tnum" style={{ fontSize: 17, fontWeight: 680, letterSpacing: "-.02em", color: s.warn ? "var(--warning)" : "var(--ink-900)" }}>{s.v}</div>
            <div style={{ fontSize: 10.5, color: "var(--ink-400)", marginTop: 3 }}>{s.k}</div>
          </div>
        ))}
      </div>

      {/* sources + gbp */}
      <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
        <SourceDots sources={l.sources} />
        <span style={{ fontSize: 11.5, color: "var(--ink-400)" }}>{l.sources.length} sources</span>
        <span style={{ marginLeft: "auto", display: "inline-flex", alignItems: "center", gap: 5, fontSize: 11.5, fontWeight: 540,
          color: l.gbpConnected ? "var(--success)" : "var(--ink-400)" }}>
          <Icon name={l.gbpConnected ? "check" : "plug"} size={13} />{l.gbpConnected ? "Google Business linked" : "GBP not linked"}
        </span>
      </div>

      <div className="hr" />

      {/* actions */}
      <div style={{ display: "flex", gap: 8 }}>
        <button className="btn btn-secondary btn-sm" style={{ flex: 1 }} onClick={() => onOpen(l)}><Icon name="star" size={14} />View details</button>
        <button className="btn btn-secondary btn-sm btn-icon" title="Manage settings"><Icon name="gear" size={15} /></button>
        <button className="btn btn-secondary btn-sm btn-icon" title="More"><Icon name="dots" size={15} /></button>
      </div>
    </div>
  );
};

/* ---------- detail drawer ---------- */
const LocationDrawer = ({ l, onClose }) => {
  useEffectL(() => {
    const onKey = (e) => { if (e.key === "Escape") onClose(); };
    document.addEventListener("keydown", onKey);
    const prev = document.body.style.overflow; document.body.style.overflow = "hidden";
    return () => { document.removeEventListener("keydown", onKey); document.body.style.overflow = prev; };
  }, [l.id]);

  const recent = REVIEWS.filter(r => r.loc === l.area);
  const sm = statusMeta(l.status);

  return (
    <div onClick={onClose} style={{ position: "fixed", inset: 0, zIndex: 200, background: "rgba(12,12,16,.5)", backdropFilter: "blur(3px)",
      display: "flex", justifyContent: "flex-end", animation: "fade .18s ease both" }}>
      <div onClick={(e) => e.stopPropagation()} className="loc-drawer"
        style={{ width: "min(540px, 94vw)", height: "100%", background: "var(--white)", boxShadow: "-20px 0 60px rgba(0,0,0,.28)",
          display: "flex", flexDirection: "column", animation: "slideIn .24s cubic-bezier(.2,.7,.2,1) both" }}>
        {/* header banner */}
        <div style={{ position: "relative", padding: "22px 24px", background: `linear-gradient(135deg, hsl(${l.hue} 45% 30%), hsl(${l.hue + 30} 48% 18%))`, color: "#fff" }}>
          <button onClick={onClose} className="btn btn-icon btn-sm" title="Close"
            style={{ position: "absolute", top: 16, right: 16, background: "rgba(255,255,255,.16)", color: "#fff", border: 0 }}><Icon name="close" size={17} /></button>
          <div style={{ display: "inline-flex", alignItems: "center", gap: 7, fontSize: 11, fontWeight: 600, letterSpacing: ".06em", textTransform: "uppercase", opacity: .85 }}>
            <Icon name="pin" size={13} />{l.name}
          </div>
          <h2 style={{ fontSize: 24, fontWeight: 700, letterSpacing: "-.02em", marginTop: 8 }}>{l.area}</h2>
          <div style={{ fontSize: 13, opacity: .9, marginTop: 4 }}>{l.address} · {l.city}</div>
          <div style={{ display: "flex", alignItems: "center", gap: 10, marginTop: 16 }}>
            <span className="tnum" style={{ fontSize: 30, fontWeight: 720, letterSpacing: "-.03em" }}>{l.rating}</span>
            <div>
              <Stars value={l.rating} size={15} />
              <div style={{ fontSize: 12, opacity: .9, marginTop: 2 }} className="tnum">{l.reviews.toLocaleString()} reviews</div>
            </div>
          </div>
        </div>

        <div style={{ flex: 1, overflowY: "auto", padding: 24, display: "flex", flexDirection: "column", gap: 22 }}>
          {/* status + contact */}
          <div style={{ display: "flex", flexWrap: "wrap", gap: 10 }}>
            <span className={`badge ${sm.cls}`}><span className="dot" style={{ background: sm.dot }} />{sm.label}</span>
            <span className="badge badge-neutral"><Icon name="clock" size={12} />{l.hours}</span>
            <span className="badge badge-neutral"><Icon name="bell" size={12} />{l.phone}</span>
          </div>

          {/* stats grid */}
          <div style={{ display: "grid", gridTemplateColumns: "repeat(2, 1fr)", gap: 12 }}>
            {[
              { k: "Response rate", v: l.responseRate + "%", icon: "reply", warn: l.responseRate < 75 },
              { k: "Pending replies", v: l.pending, icon: "inbox", warn: l.pending >= 5 },
              { k: "New reviews (30d)", v: l.newThisMonth, icon: "sparkle" },
              { k: "Rating trend", v: (l.deltaRating >= 0 ? "+" : "") + l.deltaRating, icon: "chart", warn: l.deltaRating < 0 },
            ].map(s => (
              <div key={s.k} style={{ border: "1px solid var(--ink-200)", borderRadius: "var(--r-md)", padding: 14 }}>
                <div style={{ display: "flex", alignItems: "center", gap: 7, color: "var(--ink-400)", fontSize: 12 }}>
                  <Icon name={s.icon} size={14} />{s.k}
                </div>
                <div className="tnum" style={{ fontSize: 22, fontWeight: 700, letterSpacing: "-.02em", marginTop: 8, color: s.warn ? "var(--warning)" : "var(--ink-900)" }}>{s.v}</div>
              </div>
            ))}
          </div>

          {/* manager + connections */}
          <div>
            <div className="eyebrow" style={{ marginBottom: 10 }}>Location manager</div>
            <div style={{ display: "flex", alignItems: "center", gap: 11 }}>
              <Avatar name={l.manager} size={38} />
              <div><div style={{ fontSize: 13.5, fontWeight: 600 }}>{l.manager}</div><div style={{ fontSize: 12, color: "var(--ink-400)" }}>Practice lead</div></div>
              <button className="btn btn-ghost btn-sm" style={{ marginLeft: "auto" }}><Icon name="send" size={13} />Message</button>
            </div>
          </div>

          <div>
            <div className="eyebrow" style={{ marginBottom: 10 }}>Connected sources</div>
            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              {["Google", "Facebook", "Yelp", "Trustpilot"].map(src => {
                const on = l.sources.includes(src);
                const m = SOURCE_META[src];
                return (
                  <div key={src} style={{ display: "flex", alignItems: "center", gap: 10, padding: "9px 11px", border: "1px solid var(--ink-200)", borderRadius: "var(--r-sm)" }}>
                    <span style={{ width: 22, height: 22, borderRadius: 6, background: m.color, color: "#fff", display: "grid", placeItems: "center", fontSize: 10.5, fontWeight: 800, fontFamily: "var(--font-mono)" }}>{m.letter}</span>
                    <span style={{ fontSize: 13, fontWeight: 540 }}>{src}</span>
                    {on
                      ? <span className="badge badge-success" style={{ marginLeft: "auto" }}><Icon name="check" size={11} />Connected</span>
                      : <button className="btn btn-secondary btn-sm" style={{ marginLeft: "auto" }}>Connect</button>}
                  </div>
                );
              })}
            </div>
          </div>

          {/* recent reviews */}
          <div>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 10 }}>
              <div className="eyebrow">Recent reviews</div>
              <button className="btn btn-ghost btn-sm">View all<Icon name="chevRight" size={13} /></button>
            </div>
            {recent.length === 0 ? (
              <div style={{ fontSize: 13, color: "var(--ink-400)", padding: "16px 0" }}>No recent reviews for this location.</div>
            ) : (
              <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
                {recent.map(r => (
                  <div key={r.id} style={{ display: "flex", gap: 11 }}>
                    <Avatar name={r.name} size={34} />
                    <div style={{ minWidth: 0, flex: 1 }}>
                      <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
                        <span style={{ fontSize: 13, fontWeight: 600 }}>{r.name}</span>
                        <Stars value={r.rating} size={12} />
                        <span style={{ fontSize: 11.5, color: "var(--ink-400)", marginLeft: "auto" }}>{r.time}</span>
                      </div>
                      <p style={{ fontSize: 12.8, color: "var(--ink-600)", lineHeight: 1.5, marginTop: 4, textWrap: "pretty" }}>{r.text}</p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        <div style={{ display: "flex", gap: 10, padding: "14px 24px", borderTop: "1px solid var(--ink-150)" }}>
          <button className="btn btn-secondary" style={{ flex: 1 }}><Icon name="external" size={15} />Open on Google</button>
          <button className="btn btn-primary" style={{ flex: 1 }}><Icon name="reply" size={15} />Reply to reviews</button>
        </div>
      </div>
    </div>
  );
};

/* ---------- portfolio stat ---------- */
const PortStat = ({ label, value, suffix, icon, tone }) => (
  <div className="card" style={{ padding: "16px 18px", display: "flex", alignItems: "center", gap: 13 }}>
    <span style={{ width: 38, height: 38, borderRadius: 10, flex: "none", display: "grid", placeItems: "center",
      background: tone === "warning" ? "var(--warning-soft)" : "var(--accent-soft)", color: tone === "warning" ? "var(--warning)" : "var(--accent-strong)" }}>
      <Icon name={icon} size={18} />
    </span>
    <div style={{ minWidth: 0 }}>
      <div className="eyebrow" style={{ marginBottom: 5, whiteSpace: "nowrap" }}>{label}</div>
      <div style={{ display: "flex", alignItems: "baseline", gap: 3 }}>
        <span className="tnum" style={{ fontSize: 24, fontWeight: 700, letterSpacing: "-.02em", lineHeight: 1, color: tone === "warning" ? "var(--warning)" : "var(--ink-900)" }}>{value}</span>
        {suffix && <span style={{ fontSize: 14, fontWeight: 600, color: suffix === "★" ? "var(--star)" : "var(--ink-400)" }}>{suffix}</span>}
      </div>
    </div>
  </div>
);

/* ---------- page ---------- */
const Locations = ({ onOpenDetail }) => {
  const [openId, setOpenId] = useStateL(null);
  const locs = realLocs();
  const open = openId ? locs.find(l => l.id === openId) : null;

  const totalReviews = locs.reduce((a, l) => a + l.reviews, 0);
  const totalPending = locs.reduce((a, l) => a + l.pending, 0);
  const avg = (locs.reduce((a, l) => a + l.rating * l.reviews, 0) / totalReviews).toFixed(1);
  const attention = locs.filter(l => l.status === "attention").length;

  return (
    <div style={{ maxWidth: 1240, margin: "0 auto", padding: "var(--gutter)" }}>
      {/* header */}
      <div style={{ display: "flex", alignItems: "flex-end", justifyContent: "space-between", gap: 16, flexWrap: "wrap", marginBottom: "var(--gutter)" }}>
        <div>
          <div className="eyebrow" style={{ marginBottom: 6 }}>Bright Smile Dental</div>
          <h1 style={{ fontSize: 26, fontWeight: 680, letterSpacing: "-.025em" }}>Locations</h1>
          <p style={{ fontSize: 13.5, color: "var(--ink-500)", marginTop: 5 }}>
            Monitor reputation across your {locs.length} connected locations{attention > 0 && <> — <b style={{ color: "var(--warning)" }}>{attention} need{attention > 1 ? "" : "s"} attention</b></>}.
          </p>
        </div>
        <div style={{ display: "flex", gap: 10 }}>
          <button className="btn btn-secondary"><Icon name="external" size={16} />Export</button>
          <button className="btn btn-primary"><Icon name="plus" size={16} />Add location</button>
        </div>
      </div>

      {/* portfolio summary */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: "var(--gutter)", marginBottom: "var(--gutter)" }} className="loc-stats">
        <PortStat icon="pin" label="Locations" value={locs.length} />
        <PortStat icon="star" label="Avg rating" value={avg} suffix="★" />
        <PortStat icon="chat" label="Total reviews" value={totalReviews.toLocaleString()} />
        <PortStat icon="inbox" label="Pending replies" value={totalPending} tone={totalPending > 5 ? "warning" : undefined} />
      </div>

      {/* cards */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(372px, 1fr))", gap: "var(--gutter)" }}>
        {locs.map(l => <LocationCard key={l.id} l={l} onOpen={(ll) => onOpenDetail ? onOpenDetail(ll.id) : setOpenId(ll.id)} />)}
      </div>

      {open && <LocationDrawer l={open} onClose={() => setOpenId(null)} />}
    </div>
  );
};

Object.assign(window, { Locations });
