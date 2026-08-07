/* GBP Manager — Settings / Google connection. */

const { useState: useStateST } = React;

const SettingRow = ({ label, hint, checked, onChange }) => (
  <div style={{ display: "flex", alignItems: "center", gap: 12, padding: "13px 0", borderTop: "1px solid var(--ink-150)" }}>
    <div style={{ flex: 1, minWidth: 0 }}>
      <div style={{ fontSize: 13.3, fontWeight: 540, color: "var(--ink-800)" }}>{label}</div>
      {hint && <div style={{ fontSize: 11.5, color: "var(--ink-400)", marginTop: 1, textWrap: "pretty" }}>{hint}</div>}
    </div>
    <button onClick={() => onChange(!checked)} role="switch" aria-checked={checked}
      style={{ width: 38, height: 22, borderRadius: 999, flex: "none", border: "none", cursor: "pointer", padding: 2, background: checked ? "var(--accent)" : "var(--ink-300)", transition: "background .16s", display: "flex", alignItems: "center" }}>
      <span style={{ width: 18, height: 18, borderRadius: "50%", background: "#fff", boxShadow: "0 1px 2px rgba(0,0,0,.25)", transform: checked ? "translateX(16px)" : "none", transition: "transform .16s" }} />
    </button>
  </div>
);

const GBPSettings = () => {
  const c = GBP_CONNECTION;
  const fire = useToast();
  const [disc, setDisc] = useStateST(false);
  const [opts, setOpts] = useStateST({ confirmWrites: true, neverAutoPost: true, autoDraft: true, syncDaily: true, weeklyDigest: true });
  const set = (k, v) => { if (k === "confirmWrites" && !v) { fire("Write confirmation can't be disabled in this build", { tone: "danger", icon: "lock" }); return; } if (k === "neverAutoPost" && !v) { fire("Auto-publishing AI content is disabled by policy", { tone: "danger", icon: "lock" }); return; } setOpts(o => ({ ...o, [k]: v })); };
  const pct = Math.round((c.apiQuota.used / c.apiQuota.limit) * 100);

  return (
    <Page max={920}>
      <PageHeader eyebrow="Settings" title="Google connection"
        sub="Manage the OAuth link to your Google Business Profile account, sync, and safety controls." />

      {/* connection card */}
      <div className="card" style={{ padding: "var(--card-pad)", marginBottom: "var(--gutter)" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 14, flexWrap: "wrap" }}>
          <span style={{ width: 46, height: 46, borderRadius: 12, flex: "none", display: "grid", placeItems: "center", background: "var(--success-soft)", color: "var(--success)" }}><Icon name="google" size={22} /></span>
          <div style={{ flex: 1, minWidth: 200 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 9 }}>
              <h3 style={{ fontSize: 16, fontWeight: 660 }}>{c.account.accountName}</h3>
              <span className="badge badge-success"><span className="dot" style={{ background: "var(--success)" }} />Connected</span>
            </div>
            <div style={{ fontSize: 12.5, color: "var(--ink-500)", marginTop: 3 }}>{c.email} · {c.account.type.toLowerCase()} account</div>
          </div>
          <button className="btn btn-secondary btn-sm" onClick={() => fire("Reconnected to Google")}>Re-authorize</button>
          <button className="btn btn-ghost btn-sm" style={{ color: "var(--danger)" }} onClick={() => setDisc(true)}>Disconnect</button>
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 1, background: "var(--ink-150)", border: "1px solid var(--ink-150)", borderRadius: "var(--r-md)", overflow: "hidden", marginTop: 16 }}>
          {[["Scope", c.scopes.join(", ")], ["Token", c.tokenExpires], ["Last sync", c.lastSync]].map(([k, v]) => (
            <div key={k} style={{ background: "var(--white)", padding: "12px 14px" }}>
              <div className="eyebrow" style={{ marginBottom: 5 }}>{k}</div>
              <div style={{ fontSize: 12.8, fontWeight: 540, color: "var(--ink-800)", textWrap: "pretty" }}>{v}</div>
            </div>
          ))}
        </div>

        {/* api quota */}
        <div style={{ marginTop: 16 }}>
          <div style={{ display: "flex", justifyContent: "space-between", fontSize: 12, marginBottom: 6 }}>
            <span style={{ color: "var(--ink-500)", fontWeight: 540 }}>API quota ({c.apiQuota.window})</span>
            <span className="tnum" style={{ color: "var(--ink-400)" }}><b style={{ color: "var(--ink-800)" }}>{c.apiQuota.used.toLocaleString()}</b> / {c.apiQuota.limit.toLocaleString()}</span>
          </div>
          <div style={{ height: 8, borderRadius: 999, background: "var(--ink-100)", overflow: "hidden" }}>
            <div style={{ height: "100%", borderRadius: 999, background: pct > 85 ? "var(--warning)" : "var(--accent)", width: `${pct}%` }} />
          </div>
        </div>
      </div>

      {/* connected profiles */}
      <div className="card" style={{ padding: "var(--card-pad)", marginBottom: "var(--gutter)" }}>
        <SecHead title="Connected profiles" sub={`${GBP_LOCATIONS.length} locations linked to this account`} action={<button className="btn btn-secondary btn-sm"><Icon name="plus" size={13} />Add</button>} />
        <div style={{ marginTop: 12 }}>
          {GBP_LOCATIONS.map((l, i) => (
            <div key={l.id} style={{ display: "flex", alignItems: "center", gap: 12, padding: "12px 0", borderTop: i ? "1px solid var(--ink-150)" : "none" }}>
              <span style={{ width: 32, height: 32, borderRadius: 8, flex: "none", display: "grid", placeItems: "center", background: `hsl(${l.hue} 42% 94%)`, color: `hsl(${l.hue} 55% 32%)` }}><Icon name="pin" size={15} /></span>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: 13.3, fontWeight: 560 }}>{l.title} · {l.area}</div>
                <div className="mono" style={{ fontSize: 11, color: "var(--ink-400)" }}>{l.locationName}</div>
              </div>
              {l.verified ? <span className="badge badge-success"><Icon name="check" size={11} />Verified</span> : <span className="badge badge-warning"><Icon name="alert" size={11} />Unverified</span>}
            </div>
          ))}
        </div>
      </div>

      {/* safety controls */}
      <div className="card" style={{ padding: "var(--card-pad)", marginBottom: "var(--gutter)" }}>
        <SecHead title="Safety controls" sub="Guardrails for everything that writes to Google" />
        <div style={{ marginTop: 6 }}>
          <SettingRow label="Confirm every write to Google" hint="Show a confirmation before any reply, post, or profile edit is sent. Required." checked={opts.confirmWrites} onChange={v => set("confirmWrites", v)} />
          <SettingRow label="Never auto-publish AI content" hint="AI replies and posts always wait for a human to approve. Required." checked={opts.neverAutoPost} onChange={v => set("neverAutoPost", v)} />
          <SettingRow label="Auto-draft AI replies for new reviews" hint="Generate (but don't send) a draft reply when a new review arrives." checked={opts.autoDraft} onChange={v => set("autoDraft", v)} />
          <SettingRow label="Daily sync from Google" hint="Pull fresh reviews, insights, and post status once a day." checked={opts.syncDaily} onChange={v => set("syncDaily", v)} />
          <SettingRow label="Weekly performance digest" hint="Email a summary every Monday morning." checked={opts.weeklyDigest} onChange={v => set("weeklyDigest", v)} />
        </div>
      </div>

      <div style={{ marginBottom: "var(--gutter)" }}>
        <GatedNotice icon="shield">The top two controls are locked on in this MVP: every Google API write is confirmed, and AI never publishes without human approval.</GatedNotice>
      </div>

      <ConfirmWrite open={disc} onClose={() => setDisc(false)}
        title="Disconnect Google Business Profile?"
        intent="revoke access and stop all syncing"
        target={c.account.accountName}
        method="OAuth token revocation"
        confirmLabel="Disconnect"
        danger
        busyLabel="Disconnecting…"
        onConfirm={() => { setDisc(false); fire("Disconnected from Google", { tone: "danger", icon: "plug" }); }}>
        <div style={{ fontSize: 12.5, color: "var(--ink-600)", lineHeight: 1.5 }}>Reviews, posts, and insights will stop syncing. Your local data is kept, but no new data flows until you reconnect.</div>
      </ConfirmWrite>
    </Page>
  );
};

Object.assign(window, { GBPSettings });
