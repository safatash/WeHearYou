/* GBP Manager — Local SEO audit.
   Scores profile completeness, reviews, photos, posts, and NAP consistency.
   Failing checks become one-click Tasks; any fix that writes to Google is gated. */

const { useState: useStateAU } = React;

const weightTone = { High: "var(--danger)", Medium: "var(--warning)", Low: "var(--ink-400)" };

const AuditCategory = ({ cat, onFix }) => {
  const [open, setOpen] = useStateAU(true);
  const failing = cat.items.filter(i => !i.ok).length;
  return (
    <div className="card" style={{ padding: 0, overflow: "hidden" }}>
      <button onClick={() => setOpen(o => !o)} className="tap" style={{ width: "100%", display: "flex", alignItems: "center", gap: 14, padding: "16px 18px", border: 0, background: "transparent", cursor: "pointer", textAlign: "left" }}>
        <ScoreRing value={cat.score} size={52} thickness={6} />
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <h3 style={{ fontSize: 14.5, fontWeight: 640 }}>{cat.name}</h3>
            <span className="badge badge-neutral" style={{ color: weightTone[cat.weight], borderColor: "var(--ink-200)" }}>{cat.weight} impact</span>
          </div>
          <div style={{ fontSize: 12, color: "var(--ink-400)", marginTop: 3 }}>
            {failing === 0 ? "All checks passing" : `${failing} of ${cat.items.length} checks need attention`}
          </div>
        </div>
        <Icon name="chevDown" size={17} style={{ color: "var(--ink-400)", transform: open ? "rotate(180deg)" : "none", transition: "transform .15s" }} />
      </button>
      {open && (
        <div style={{ borderTop: "1px solid var(--ink-150)" }}>
          {cat.items.map((it, i) => (
            <div key={i} style={{ display: "flex", alignItems: "center", gap: 12, padding: "12px 18px", borderTop: i ? "1px solid var(--ink-150)" : "none" }}>
              <span style={{ width: 22, height: 22, borderRadius: "50%", flex: "none", display: "grid", placeItems: "center", background: it.ok ? "var(--success-soft)" : "var(--warning-soft)", color: it.ok ? "var(--success)" : "var(--warning)" }}>
                <Icon name={it.ok ? "check" : "alert"} size={13} />
              </span>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: 13, fontWeight: 540, color: it.ok ? "var(--ink-700)" : "var(--ink-900)" }}>{it.label}</div>
                {!it.ok && it.fix && <div style={{ fontSize: 11.5, color: "var(--ink-400)", marginTop: 1 }}>{it.fix}</div>}
              </div>
              {!it.ok && <button className="btn btn-soft btn-sm" onClick={() => onFix(it)}><Icon name="arrowUpRight" size={13} />Fix</button>}
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

const GBPAudit = ({ go }) => {
  const fire = useToast();
  const a = GBP_AUDIT;
  const totalFailing = a.categories.reduce((n, c) => n + c.items.filter(i => !i.ok).length, 0);
  const onFix = (it) => fire(`Added to Tasks: ${it.label}`, { icon: "listChecks" });

  return (
    <Page>
      <PageHeader eyebrow="Performance" title="Local SEO audit"
        sub="An automated health check across the signals that drive local ranking. Re-runs daily and after every profile change."
        actions={<>
          <button className="btn btn-secondary" onClick={() => fire("Re-running audit across 3 profiles…")}><Icon name="refresh" size={16} />Re-run audit</button>
          <button className="btn btn-primary" onClick={() => go("tasks")}><Icon name="listChecks" size={16} />Fix {totalFailing} issues</button>
        </>}
      />

      {/* score header */}
      <div className="card" style={{ padding: "var(--card-pad)", marginBottom: "var(--gutter)", display: "flex", alignItems: "center", gap: 24, flexWrap: "wrap" }}>
        <ScoreRing value={a.score} size={104} thickness={10} label="/ 100" />
        <div style={{ flex: 1, minWidth: 220 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <h2 style={{ fontSize: 19, fontWeight: 680, letterSpacing: "-.02em" }}>Good — room to grow</h2>
            <span className="badge tnum" style={{ background: "var(--success-soft)", color: "var(--success)" }}><Icon name="arrowUp" size={11} />+{a.score - a.prevScore} this month</span>
          </div>
          <p style={{ fontSize: 13, color: "var(--ink-500)", marginTop: 6, lineHeight: 1.55, maxWidth: 520, textWrap: "pretty" }}>
            Resolving the <b style={{ color: "var(--ink-800)" }}>{totalFailing} open issues</b> — mostly reply rate and photo freshness at Northbridge — would lift your score into the 90s and improve ranking on high-intent searches.
          </p>
        </div>
        <div style={{ display: "flex", gap: 10 }}>
          {[["High impact", a.categories.filter(c => c.weight === "High").length], ["Open issues", totalFailing]].map(([k, v]) => (
            <div key={k} style={{ textAlign: "center", padding: "12px 18px", borderRadius: "var(--r-md)", background: "var(--ink-50)", border: "1px solid var(--ink-150)" }}>
              <div className="tnum" style={{ fontSize: 22, fontWeight: 700 }}>{v}</div>
              <div style={{ fontSize: 10.5, color: "var(--ink-400)", marginTop: 2 }}>{k}</div>
            </div>
          ))}
        </div>
      </div>

      <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
        {a.categories.map(c => <AuditCategory key={c.name} cat={c} onFix={onFix} />)}
      </div>
    </Page>
  );
};

Object.assign(window, { GBPAudit });
