/* WeHearYou — Foundations / Design System reference view */

const Swatch = ({ name, varName, hex, fg }) => (
  <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
    <div style={{ height: 64, borderRadius: "var(--r-md)", background: `var(${varName})`, border: "1px solid rgba(0,0,0,.06)",
      display: "flex", alignItems: "flex-end", padding: 8 }}>
      {fg && <span style={{ fontSize: 11, color: fg, fontFamily: "var(--font-mono)" }}>{hex}</span>}
    </div>
    <div style={{ fontSize: 12, fontWeight: 560 }}>{name}</div>
    <div style={{ fontSize: 11, color: "var(--ink-400)", fontFamily: "var(--font-mono)" }}>{varName}</div>
  </div>
);

const FdSection = ({ title, children, desc }) => (
  <section style={{ marginBottom: 44 }}>
    <div style={{ marginBottom: 18 }}>
      <h2 style={{ fontSize: 18, fontWeight: 680, letterSpacing: "-.02em" }}>{title}</h2>
      {desc && <p style={{ fontSize: 13.5, color: "var(--ink-500)", marginTop: 4, maxWidth: 560 }}>{desc}</p>}
    </div>
    {children}
  </section>
);

const Foundations = () => {
  return (
    <div style={{ maxWidth: 1080, margin: "0 auto", padding: "var(--gutter)" }}>
      <div style={{ marginBottom: 36 }}>
        <div className="eyebrow" style={{ marginBottom: 8 }}>Design System</div>
        <h1 style={{ fontSize: 28, fontWeight: 700, letterSpacing: "-.03em" }}>Foundations</h1>
        <p style={{ fontSize: 14.5, color: "var(--ink-500)", marginTop: 8, maxWidth: 620, lineHeight: 1.6 }}>
          A calm, neutral-forward system built for trust. One accent does the work; the rest is type, space, and restraint.
          Switch the accent and density live from the <b>Tweaks</b> panel.
        </p>
      </div>

      {/* Color */}
      <FdSection title="Color" desc="A 12-step neutral ink ramp carries the interface. A single accent — derived into soft, strong, and ring variants with color-mix — signals action and selection.">
        <div className="eyebrow" style={{ marginBottom: 12 }}>Accent (live)</div>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(120px, 1fr))", gap: 14, marginBottom: 26 }}>
          <Swatch name="Accent" varName="--accent" hex="" fg="#fff"/>
          <Swatch name="Accent strong" varName="--accent-strong" hex="" fg="#fff"/>
          <Swatch name="Accent soft" varName="--accent-soft" hex=""/>
          <Swatch name="Accent border" varName="--accent-border" hex=""/>
        </div>
        <div className="eyebrow" style={{ marginBottom: 12 }}>Neutral ink ramp</div>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(96px, 1fr))", gap: 12, marginBottom: 26 }}>
          {["--ink-900","--ink-700","--ink-500","--ink-400","--ink-300","--ink-200","--ink-100","--ink-50"].map(v => (
            <Swatch key={v} name={v.replace("--ink-","Ink ")} varName={v} hex="" fg={["--ink-900","--ink-700","--ink-500"].includes(v)?"#fff":null}/>
          ))}
        </div>
        <div className="eyebrow" style={{ marginBottom: 12 }}>Semantic</div>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(120px, 1fr))", gap: 14 }}>
          <Swatch name="Success" varName="--success" hex="" fg="#fff"/>
          <Swatch name="Warning" varName="--warning" hex="" fg="#fff"/>
          <Swatch name="Danger" varName="--danger" hex="" fg="#fff"/>
          <Swatch name="Star" varName="--star" hex="" fg="#fff"/>
        </div>
      </FdSection>

      {/* Type */}
      <FdSection title="Typography" desc="Geist for interface text, Geist Mono for figures — numbers always use tabular lining so they don't jitter as data updates.">
        <div className="card" style={{ padding: 28, display: "flex", flexDirection: "column", gap: 18 }}>
          {[["Display / 28","28px","700","-.03em","Reputation you can see"],
            ["Title / 20","20px","640","-.02em","Recent reviews across every source"],
            ["Heading / 15","15px","640","-.01em","Campaign performance"],
            ["Body / 14","14px","440","0","Most reviews come in within 48 hours of a visit. Replying quickly lifts your rating."],
            ["Label / 12","12px","540",".01em","AWAITING REPLY"]].map(([l,sz,w,ls,sample]) => (
            <div key={l} style={{ display: "flex", gap: 24, alignItems: "baseline", borderBottom: "1px solid var(--ink-150)", paddingBottom: 16 }}>
              <div style={{ width: 110, flex: "none", fontSize: 11.5, color: "var(--ink-400)", fontFamily: "var(--font-mono)" }}>{l}</div>
              <div style={{ fontSize: parseInt(sz), fontWeight: w, letterSpacing: ls }}>{sample}</div>
            </div>
          ))}
          <div style={{ display: "flex", gap: 24, alignItems: "baseline" }}>
            <div style={{ width: 110, flex: "none", fontSize: 11.5, color: "var(--ink-400)", fontFamily: "var(--font-mono)" }}>Mono / tnum</div>
            <div className="mono tnum" style={{ fontSize: 22, fontWeight: 600 }}>1,284 · 4.6★ · 92%</div>
          </div>
        </div>
      </FdSection>

      {/* Components */}
      <FdSection title="Components" desc="The atoms every screen is built from — consistent height, radius, and focus behavior.">
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(260px, 1fr))", gap: "var(--gutter)" }}>
          {/* Buttons */}
          <div className="card" style={{ padding: 22 }}>
            <div className="eyebrow" style={{ marginBottom: 14 }}>Buttons</div>
            <div style={{ display: "flex", flexWrap: "wrap", gap: 10, marginBottom: 12 }}>
              <button className="btn btn-primary"><Icon name="plus" size={16}/>Primary</button>
              <button className="btn btn-secondary">Secondary</button>
            </div>
            <div style={{ display: "flex", flexWrap: "wrap", gap: 10, marginBottom: 12 }}>
              <button className="btn btn-soft"><Icon name="reply" size={15}/>Soft</button>
              <button className="btn btn-ghost">Ghost</button>
            </div>
            <div style={{ display: "flex", flexWrap: "wrap", gap: 10 }}>
              <button className="btn btn-primary btn-sm">Small</button>
              <button className="btn btn-secondary" disabled>Disabled</button>
            </div>
          </div>
          {/* Badges */}
          <div className="card" style={{ padding: 22 }}>
            <div className="eyebrow" style={{ marginBottom: 14 }}>Badges & status</div>
            <div style={{ display: "flex", flexWrap: "wrap", gap: 8, marginBottom: 14 }}>
              <span className="badge badge-success"><Icon name="check" size={12}/>Replied</span>
              <span className="badge badge-warning">Awaiting reply</span>
              <span className="badge badge-danger">Needs attention</span>
              <span className="badge badge-accent">Active</span>
              <span className="badge badge-neutral">Paused</span>
            </div>
            <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
              <SourceTag source="Google"/><SourceTag source="Facebook"/><SourceTag source="Yelp"/>
            </div>
          </div>
          {/* Inputs */}
          <div className="card" style={{ padding: 22 }}>
            <div className="eyebrow" style={{ marginBottom: 14 }}>Inputs</div>
            <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
              <input className="input focus-ring" placeholder="Search reviews…"/>
              <div style={{ position: "relative" }}>
                <Icon name="search" size={16} style={{ position: "absolute", left: 11, top: 11, color: "var(--ink-400)" }}/>
                <input className="input focus-ring" style={{ paddingLeft: 34 }} placeholder="With leading icon"/>
              </div>
              <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
                <span className="kbd">⌘</span><span className="kbd">K</span>
                <span style={{ fontSize: 12, color: "var(--ink-400)" }}>to open command bar</span>
              </div>
            </div>
          </div>
          {/* Stars */}
          <div className="card" style={{ padding: 22 }}>
            <div className="eyebrow" style={{ marginBottom: 14 }}>Rating</div>
            <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
              {[5,4.6,3,1.5].map(v => (
                <div key={v} style={{ display: "flex", alignItems: "center", gap: 10 }}>
                  <Stars value={v} size={18}/>
                  <span className="tnum" style={{ fontSize: 13, color: "var(--ink-500)" }}>{v.toFixed(1)}</span>
                </div>
              ))}
            </div>
          </div>
          {/* Avatars */}
          <div className="card" style={{ padding: 22 }}>
            <div className="eyebrow" style={{ marginBottom: 14 }}>Avatars</div>
            <div style={{ display: "flex", alignItems: "center", gap: -8 }}>
              {["Marcus Webb","Priya Anand","Sara Mendel","Tom Becker"].map((n,i) => (
                <span key={n} style={{ marginLeft: i?-10:0 }}><Avatar name={n} size={40}/></span>
              ))}
            </div>
          </div>
          {/* Radii & elevation */}
          <div className="card" style={{ padding: 22 }}>
            <div className="eyebrow" style={{ marginBottom: 14 }}>Radius & elevation</div>
            <div style={{ display: "flex", gap: 12, alignItems: "flex-end" }}>
              <div style={{ width: 54, height: 54, borderRadius: "var(--r-sm)", background: "var(--white)", boxShadow: "var(--shadow-sm)", border: "1px solid var(--ink-200)" }}/>
              <div style={{ width: 54, height: 54, borderRadius: "var(--r-md)", background: "var(--white)", boxShadow: "var(--shadow-md)" }}/>
              <div style={{ width: 54, height: 54, borderRadius: "var(--r-lg)", background: "var(--white)", boxShadow: "var(--shadow-lg)" }}/>
            </div>
          </div>
        </div>
      </FdSection>
    </div>
  );
};

Object.assign(window, { Foundations });
