/* WeHearYou — Funnel Builder: configure the live review funnel page (/f/:slug) */
const { useState: useStateFB } = React;

const slugify = (s) => s.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "");

const FBSection = ({ eyebrow, title, sub, children }) => (
  <div style={{ paddingTop: 22, marginTop: 22, borderTop: "1px solid var(--ink-150)" }}>
    {eyebrow && <div className="eyebrow" style={{ marginBottom: 6 }}>{eyebrow}</div>}
    {sub && <div style={{ fontSize: 12.5, color: "var(--ink-400)", marginBottom: 14, lineHeight: 1.5 }}>{sub}</div>}
    <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>{children}</div>
  </div>
);

const FBField = ({ label, children }) => (
  <label style={{ display: "flex", flexDirection: "column", gap: 7 }}>
    <span style={{ fontSize: 11.5, fontWeight: 600, color: "var(--ink-500)" }}>{label}</span>
    {children}
  </label>
);

const FunnelBuilder = ({ go }) => {
  const locs = LOCATIONS.filter(l => l.id !== "all");
  const [locId, setLocId] = useStateFB(locs[0].id);
  const loc = locs.find(l => l.id === locId);
  const slug = slugify(loc.name + "-" + loc.area);

  const [cfg, setCfg] = useStateFB({
    promptTitle: `How was your experience with ${loc.name}?`,
    promptBody: "Happy customers can continue to a public review, while lower ratings stay private so our team can follow up directly.",
    ratingStyle: "stars",
    publicLabel: "Leave a Google review",
    privateTitle: `Tell ${loc.name} how they can improve`,
    privateBody: "Thanks for the honest rating. Your feedback stays private and goes directly to the team for follow-up.",
    privateSubmitLabel: "Send private feedback",
    publicThanksTitle: `Thanks for rating ${loc.name}`,
    publicThanksBody: "One final step — post your review publicly if you'd like to help other customers discover this business.",
    privateThanksTitle: "Thanks for sharing your feedback",
    privateThanksBody: "Your feedback has been sent privately to the team.",
  });
  const set = (k, v) => setCfg(p => ({ ...p, [k]: v }));
  const fire = useToast();

  const liveRoute = `/f/${slug}`;
  const previewRoute = `/funnel-preview?location=${loc.id}`;

  return (
    <Page>
      <PageHeader eyebrow="Funnel Setup" title="Funnel Builder"
        sub="Define what customers see first and where each rating routes them."
        actions={<button className="btn btn-primary" onClick={() => fire("Funnel settings saved")}><Icon name="check" size={16} />Save changes</button>} />

      <div className="card" style={{ padding: "14px 18px", marginBottom: "var(--gutter)", display: "flex", alignItems: "center", gap: 14, flexWrap: "wrap" }}>
        <span style={{ fontSize: 11.5, fontWeight: 600, color: "var(--ink-500)" }}>Editing</span>
        <select value={locId} onChange={e => setLocId(e.target.value)} className="input" style={{ width: "auto", minWidth: 220, fontWeight: 620 }}>
          {locs.map(l => <option key={l.id} value={l.id}>{l.name} — {l.area}</option>)}
        </select>
        <span className="mono" style={{ fontSize: 11.5, color: "var(--ink-400)" }}>{liveRoute}</span>
        <div style={{ marginLeft: "auto", display: "flex", gap: 8 }}>
          <button className="btn btn-secondary btn-sm" onClick={() => fire("Opening live funnel preview…")}><Icon name="eye" size={13} />Preview</button>
          <button className="btn btn-secondary btn-sm" onClick={() => fire("Opening live funnel…")}><Icon name="external" size={13} />Open live funnel</button>
        </div>
      </div>

      <div className="main-grid" style={{ display: "grid", gridTemplateColumns: "minmax(0,1fr) 300px", gap: "var(--gutter)", alignItems: "start" }}>
        <div className="card" style={{ padding: "var(--card-pad)" }}>
          <SecHead title="What customers see first" sub="The funnel entry page and first impression." />
          <div style={{ display: "flex", flexDirection: "column", gap: 14, marginTop: 10 }}>
            <FBField label="Prompt title">
              <input className="input" value={cfg.promptTitle} onChange={e => set("promptTitle", e.target.value)} />
            </FBField>
            <FBField label="Prompt body">
              <textarea className="input" rows={2} style={{ height: "auto", padding: "11px 12px", lineHeight: 1.5, resize: "vertical" }}
                value={cfg.promptBody} onChange={e => set("promptBody", e.target.value)} />
            </FBField>
            <FBField label="Rating style">
              <Segmented value={cfg.ratingStyle} onChange={v => set("ratingStyle", v)}
                options={[{ value: "stars", label: "★ Stars" }, { value: "faces", label: "🙂 Faces" }, { value: "thumbs", label: "👍 Thumbs" }]} />
            </FBField>
          </div>

          <FBSection eyebrow="Routing" sub={<>Where low and high ratings go — Google, Facebook, WeHearYou, or a custom link — is configured in <a href="#" onClick={e => { e.preventDefault(); go("wizard"); }} style={{ color: "var(--accent-strong)", fontWeight: 600 }}>Campaign Wizard → Smart routing</a>.</>}>
            <FBField label="Public review button label">
              <input className="input" value={cfg.publicLabel} onChange={e => set("publicLabel", e.target.value)} />
            </FBField>
          </FBSection>

          <FBSection eyebrow="Private feedback" sub="Shown when a rating falls below the routing threshold and stays private.">
            <FBField label="Title"><input className="input" value={cfg.privateTitle} onChange={e => set("privateTitle", e.target.value)} /></FBField>
            <FBField label="Body">
              <textarea className="input" rows={2} style={{ height: "auto", padding: "11px 12px", lineHeight: 1.5, resize: "vertical" }}
                value={cfg.privateBody} onChange={e => set("privateBody", e.target.value)} />
            </FBField>
            <FBField label="Submit button label"><input className="input" value={cfg.privateSubmitLabel} onChange={e => set("privateSubmitLabel", e.target.value)} /></FBField>
          </FBSection>

          <FBSection eyebrow="Thank-you states" sub="Shown after a customer completes either branch.">
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14 }}>
              <FBField label="Public thank-you title"><input className="input" value={cfg.publicThanksTitle} onChange={e => set("publicThanksTitle", e.target.value)} /></FBField>
              <FBField label="Private thank-you title"><input className="input" value={cfg.privateThanksTitle} onChange={e => set("privateThanksTitle", e.target.value)} /></FBField>
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14 }}>
              <FBField label="Public thank-you body">
                <textarea className="input" rows={2} style={{ height: "auto", padding: "10px 12px", lineHeight: 1.5, resize: "vertical" }}
                  value={cfg.publicThanksBody} onChange={e => set("publicThanksBody", e.target.value)} />
              </FBField>
              <FBField label="Private thank-you body">
                <textarea className="input" rows={2} style={{ height: "auto", padding: "10px 12px", lineHeight: 1.5, resize: "vertical" }}
                  value={cfg.privateThanksBody} onChange={e => set("privateThanksBody", e.target.value)} />
              </FBField>
            </div>
          </FBSection>
        </div>

        <div style={{ display: "flex", flexDirection: "column", gap: "var(--gutter)", position: "sticky", top: "var(--gutter)" }}>
          <div className="card" style={{ padding: "var(--card-pad)" }}>
            <SecHead title="Live links" />
            <div style={{ display: "flex", flexDirection: "column", gap: 10, marginTop: 10 }}>
              <div>
                <div style={{ fontSize: 11, color: "var(--ink-400)", marginBottom: 3 }}>Live funnel route</div>
                <div className="mono" style={{ fontSize: 12, background: "var(--ink-100)", padding: "8px 10px", borderRadius: "var(--r-sm)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{liveRoute}</div>
              </div>
              <div>
                <div style={{ fontSize: 11, color: "var(--ink-400)", marginBottom: 3 }}>Preview route</div>
                <div className="mono" style={{ fontSize: 12, background: "var(--ink-100)", padding: "8px 10px", borderRadius: "var(--r-sm)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{previewRoute}</div>
              </div>
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: 8, marginTop: 14 }}>
              <button className="btn btn-primary btn-sm" onClick={() => fire("Opening preview…")}><Icon name="eye" size={13} />Open preview</button>
              <button className="btn btn-secondary btn-sm" onClick={() => fire("Opening live funnel…")}><Icon name="external" size={13} />Open live funnel</button>
            </div>
          </div>
          <div className="card" style={{ padding: "var(--card-pad)" }}>
            <SecHead title="Preview" />
            <div style={{ marginTop: 10, borderRadius: "var(--r-md)", border: "1px solid var(--ink-150)", padding: 18, textAlign: "center", background: "var(--ink-50)" }}>
              <div style={{ fontSize: 13, fontWeight: 640, marginBottom: 6 }}>{cfg.promptTitle}</div>
              <div style={{ fontSize: 11.5, color: "var(--ink-500)", lineHeight: 1.5, marginBottom: 12 }}>{cfg.promptBody}</div>
              {cfg.ratingStyle === "faces" ? (
                <div style={{ display: "flex", justifyContent: "center", gap: 10, fontSize: 24 }}>😞 😐 😊</div>
              ) : cfg.ratingStyle === "thumbs" ? (
                <div style={{ display: "flex", justifyContent: "center", gap: 14, fontSize: 22 }}>👎 👍</div>
              ) : (
                <div style={{ display: "flex", justifyContent: "center" }}><Stars value={0} size={22} /></div>
              )}
            </div>
          </div>
        </div>
      </div>
    </Page>
  );
};

Object.assign(window, { FunnelBuilder });
