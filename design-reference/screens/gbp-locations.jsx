/* GBP Manager — Locations list + per-location detail.
   Detail is the command center for one Google Business Profile. Editing profile
   fields writes to Google → gated behind ConfirmWrite. */

const { useState: useStateLC } = React;

/* ---------- list ---------- */
const GLocCard = ({ l, onOpen }) => {
  const up = l.deltaRating >= 0;
  return (
    <div className="card" style={{ padding: "var(--card-pad)", display: "flex", flexDirection: "column", gap: 16 }}>
      <div style={{ display: "flex", alignItems: "flex-start", gap: 12 }}>
        <span style={{ width: 42, height: 42, borderRadius: 11, flex: "none", display: "grid", placeItems: "center", background: `hsl(${l.hue} 42% 94%)`, color: `hsl(${l.hue} 55% 32%)` }}><Icon name="pin" size={20} /></span>
        <div style={{ minWidth: 0, flex: 1 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <h3 style={{ fontSize: 15.5, fontWeight: 660, letterSpacing: "-.01em" }}>{l.area}</h3>
            {l.verified
              ? <span className="badge badge-success"><Icon name="check" size={11} />Verified</span>
              : <span className="badge badge-warning"><Icon name="alert" size={11} />Unverified</span>}
          </div>
          <div style={{ fontSize: 12.5, color: "var(--ink-400)", marginTop: 3, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{l.address} · {l.city}</div>
        </div>
      </div>

      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12 }}>
        <div>
          <div style={{ display: "flex", alignItems: "baseline", gap: 8 }}>
            <span className="tnum" style={{ fontSize: 32, fontWeight: 700, letterSpacing: "-.03em", lineHeight: 1 }}>{l.rating}</span>
            <StarRow value={l.rating} size={15} />
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 7, marginTop: 7 }}>
            <span className="tnum" style={{ fontSize: 12.5, color: "var(--ink-500)" }}>{l.reviewCount.toLocaleString()} reviews</span>
            <span className="badge tnum" style={{ height: 18, paddingLeft: 5, fontSize: 11, background: `color-mix(in srgb, ${up ? "var(--success)" : "var(--danger)"} 12%, #fff)`, color: up ? "var(--success)" : "var(--danger)" }}>
              <Icon name="arrowUp" size={10} style={{ transform: up ? "none" : "rotate(180deg)" }} />{up ? "+" : ""}{l.deltaRating}
            </span>
          </div>
        </div>
        <Sparkline data={l.spark} color={l.verified ? "var(--accent)" : "var(--warning)"} w={108} h={40} />
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 1, background: "var(--ink-150)", border: "1px solid var(--ink-150)", borderRadius: "var(--r-md)", overflow: "hidden" }}>
        {[{ k: "Profile views", v: l.impressions30d.toLocaleString() }, { k: "To reply", v: l.unreplied, warn: l.unreplied >= 5 }, { k: "Complete", v: l.profileComplete + "%", warn: l.profileComplete < 70 }].map(s => (
          <div key={s.k} style={{ background: "var(--white)", padding: "11px 10px", textAlign: "center" }}>
            <div className="tnum" style={{ fontSize: 16, fontWeight: 680, color: s.warn ? "var(--warning)" : "var(--ink-900)" }}>{s.v}</div>
            <div style={{ fontSize: 10.5, color: "var(--ink-400)", marginTop: 3 }}>{s.k}</div>
          </div>
        ))}
      </div>

      <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
        <span style={{ display: "inline-flex", alignItems: "center", gap: 5, fontSize: 11.5, fontWeight: 540, color: "var(--success)" }}><Icon name="google" size={13} />GBP linked</span>
        <span className="badge badge-neutral" style={{ marginLeft: "auto" }}>{l.primaryCategory}</span>
      </div>

      <div className="hr" />
      <div style={{ display: "flex", gap: 8 }}>
        <button className="btn btn-secondary btn-sm" style={{ flex: 1 }} onClick={() => onOpen(l.id)}><Icon name="building" size={14} />Manage profile</button>
        <button className="btn btn-secondary btn-sm btn-icon" title="Open on Google"><Icon name="external" size={15} /></button>
      </div>
    </div>
  );
};

const GBPLocations = ({ go, openDetail }) => {
  const locs = GBP_LOCATIONS;
  const totalReviews = locs.reduce((a, l) => a + l.reviewCount, 0);
  const totalUnreplied = locs.reduce((a, l) => a + l.unreplied, 0);
  const avg = (locs.reduce((a, l) => a + l.rating * l.reviewCount, 0) / totalReviews).toFixed(1);
  const unverified = locs.filter(l => !l.verified).length;

  return (
    <Page>
      <PageHeader eyebrow="Bright Smile Dental Group" title="Locations"
        sub={<>Manage {locs.length} connected Google Business Profiles{unverified > 0 && <> — <b style={{ color: "var(--warning)" }}>{unverified} unverified</b></>}.</>}
        actions={<>
          <button className="btn btn-secondary"><Icon name="external" size={16} />Export</button>
          <button className="btn btn-primary" onClick={() => go("settings")}><Icon name="plus" size={16} />Connect profile</button>
        </>}
      />

      <div className="loc-stats" style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: "var(--gutter)", marginBottom: "var(--gutter)" }}>
        {[["pin", "Profiles", locs.length], ["star", "Avg rating", avg, "★"], ["messageSquare", "Total reviews", totalReviews.toLocaleString()], ["reply", "To reply", totalUnreplied]].map(([ic, label, val, suf]) => (
          <div key={label} className="card" style={{ padding: "16px 18px", display: "flex", alignItems: "center", gap: 13 }}>
            <span style={{ width: 38, height: 38, borderRadius: 10, flex: "none", display: "grid", placeItems: "center", background: "var(--accent-soft)", color: "var(--accent-strong)" }}><Icon name={ic} size={18} /></span>
            <div>
              <div className="eyebrow" style={{ marginBottom: 5 }}>{label}</div>
              <div style={{ display: "flex", alignItems: "baseline", gap: 3 }}>
                <span className="tnum" style={{ fontSize: 24, fontWeight: 700, letterSpacing: "-.02em", lineHeight: 1 }}>{val}</span>
                {suf && <span style={{ fontSize: 14, fontWeight: 600, color: "var(--star)" }}>{suf}</span>}
              </div>
            </div>
          </div>
        ))}
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(360px, 1fr))", gap: "var(--gutter)" }}>
        {locs.map(l => <GLocCard key={l.id} l={l} onOpen={openDetail} />)}
      </div>
    </Page>
  );
};

/* ---------- detail ---------- */
const ProfileField = ({ label, value, hint, mono, onEdit }) => (
  <div style={{ display: "flex", alignItems: "center", gap: 12, padding: "13px 0", borderTop: "1px solid var(--ink-150)" }}>
    <div style={{ flex: 1, minWidth: 0 }}>
      <div style={{ fontSize: 11.5, color: "var(--ink-400)" }}>{label}</div>
      <div style={{ fontSize: 13.3, fontWeight: 540, color: "var(--ink-800)", marginTop: 2, fontFamily: mono ? "var(--font-mono)" : "inherit", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{value}</div>
    </div>
    {onEdit && <button className="btn btn-ghost btn-sm" onClick={onEdit}><Icon name="edit" size={13} />Edit</button>}
  </div>
);

const GBPLocationDetail = ({ locId, onBack, go }) => {
  const l = GBP_LOCATIONS.find(x => x.id === locId) || GBP_LOCATIONS[0];
  const [tab, setTab] = useStateLC("overview");
  const [edit, setEdit] = useStateLC(null); // {field,label,value}
  const [vals, setVals] = useStateLC({ title: l.title, primaryPhone: l.primaryPhone, websiteUri: l.websiteUri, address: `${l.address}, ${l.city}` });
  const [draft, setDraft] = useStateLC("");
  const fire = useToast();
  const locReviews = GBP_REVIEWS.filter(r => r.locId === l.id);

  const TABS = [
    { id: "overview", label: "Overview", icon: "grid" },
    { id: "info", label: "Business info", icon: "building" },
    { id: "reviews", label: "Reviews", icon: "star", count: locReviews.length },
    { id: "posts", label: "Posts", icon: "megaphone", count: GBP_POSTS.filter(p => p.locId === l.id).length },
    { id: "hours", label: "Hours", icon: "clock" },
  ];

  const startEdit = (field, label, value) => { setEdit({ field, label }); setDraft(value); };

  return (
    <Page max={1100}>
      <button onClick={onBack} className="btn btn-ghost btn-sm" style={{ marginBottom: 14, paddingLeft: 6, color: "var(--ink-500)" }}>
        <Icon name="arrowRight" size={15} style={{ transform: "rotate(180deg)" }} />All locations
      </button>

      {/* header */}
      <div className="card" style={{ padding: "20px 22px", marginBottom: 18, display: "flex", gap: 20, flexWrap: "wrap" }}>
        <span style={{ width: 60, height: 60, borderRadius: 15, flex: "none", display: "grid", placeItems: "center", background: `linear-gradient(140deg, hsl(${l.hue} 46% 40%), hsl(${l.hue + 24} 52% 26%))`, color: "#fff" }}><Icon name="building" size={28} /></span>
        <div style={{ flex: 1, minWidth: 240 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 11, flexWrap: "wrap" }}>
            <h1 style={{ fontSize: 22, fontWeight: 700, letterSpacing: "-.025em" }}>{vals.title}</h1>
            <span style={{ fontSize: 14, color: "var(--ink-400)" }}>· {l.area}</span>
            {l.verified
              ? <span className="badge badge-success"><Icon name="check" size={11} />Verified</span>
              : <span className="badge badge-warning"><Icon name="alert" size={11} />Unverified</span>}
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 14, marginTop: 8, flexWrap: "wrap", fontSize: 13, color: "var(--ink-500)" }}>
            <span style={{ display: "inline-flex", alignItems: "center", gap: 5 }}><Icon name="pin" size={14} />{l.address}, {l.city}</span>
            <span style={{ display: "inline-flex", alignItems: "center", gap: 6 }}><StarRow value={l.rating} size={14} /><b className="tnum" style={{ color: "var(--ink-800)" }}>{l.rating}</b> <span className="tnum">({l.reviewCount.toLocaleString()})</span></span>
            <span className="mono" style={{ fontSize: 11.5, color: "var(--ink-400)" }}>{l.placeId}</span>
          </div>
        </div>
        <div style={{ display: "flex", flexDirection: "column", gap: 8, minWidth: 180 }}>
          <button className="btn btn-primary" onClick={() => go("posts")}><Icon name="plus" size={15} />New post</button>
          <button className="btn btn-secondary"><Icon name="external" size={14} />View on Google</button>
        </div>
      </div>

      {/* summary */}
      <div className="ld-summary" style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 12, marginBottom: 18 }}>
        {[["Profile views (30d)", l.impressions30d.toLocaleString(), "eye"], ["Customer actions", l.actions30d.toLocaleString(), "navigation"], ["To reply", l.unreplied, "reply"], ["Completeness", l.profileComplete + "%", "checkCircle"]].map(([k, v, ic]) => (
          <div key={k} className="card" style={{ padding: "15px 16px", display: "flex", flexDirection: "column", gap: 7 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <span style={{ width: 28, height: 28, borderRadius: 8, background: "var(--accent-soft)", color: "var(--accent-strong)", display: "grid", placeItems: "center", flex: "none" }}><Icon name={ic} size={15} /></span>
              <span style={{ fontSize: 12, color: "var(--ink-500)", fontWeight: 540 }}>{k}</span>
            </div>
            <span className="tnum" style={{ fontSize: 24, fontWeight: 700, letterSpacing: "-.02em" }}>{v}</span>
          </div>
        ))}
      </div>

      {!l.verified && (
        <div className="card" style={{ padding: "14px 18px", marginBottom: 18, borderColor: "var(--warning)", background: "color-mix(in srgb, var(--warning) 7%, #fff)", display: "flex", alignItems: "center", gap: 13, flexWrap: "wrap" }}>
          <span style={{ width: 34, height: 34, borderRadius: 9, background: "color-mix(in srgb, var(--warning) 16%, #fff)", color: "var(--warning)", display: "grid", placeItems: "center", flex: "none" }}><Icon name="alert" size={17} /></span>
          <div style={{ flex: 1, minWidth: 200 }}>
            <div style={{ fontSize: 13.5, fontWeight: 620 }}>This profile isn't verified with Google</div>
            <div style={{ fontSize: 12.5, color: "var(--ink-500)", marginTop: 2 }}>Posts and edits can't go live until you complete verification.</div>
          </div>
          <button className="btn btn-primary btn-sm">Start verification<Icon name="arrowRight" size={13} /></button>
        </div>
      )}

      {/* tabs */}
      <div className="ld-tabs" style={{ display: "flex", gap: 4, marginBottom: 16, borderBottom: "1px solid var(--ink-200)", overflowX: "auto" }}>
        {TABS.map(t => <button key={t.id} onClick={() => setTab(t.id)} className="ld-tab" data-active={tab === t.id}><Icon name={t.icon} size={15} />{t.label}{t.count != null && <span className="ld-tabcount">{t.count}</span>}</button>)}
      </div>

      {tab === "overview" && (
        <div className="ld-settings-grid" style={{ display: "grid", gridTemplateColumns: "1.4fr 1fr", gap: 18, alignItems: "start" }}>
          <div className="card" style={{ padding: "var(--card-pad)" }}>
            <SecHead title="Recent reviews" action={<button className="btn btn-ghost btn-sm" onClick={() => go("reviews")}>Open inbox<Icon name="chevRight" size={13} /></button>} />
            <div style={{ marginTop: 10, display: "flex", flexDirection: "column", gap: 12 }}>
              {locReviews.slice(0, 3).map(r => (
                <div key={r.id} style={{ display: "flex", gap: 11 }}>
                  <Avatar name={r.reviewer} size={34} />
                  <div style={{ minWidth: 0, flex: 1 }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 8 }}><span style={{ fontSize: 13, fontWeight: 600 }}>{r.reviewer}</span><StarRow value={r.starRating} size={12} /><span style={{ fontSize: 11, color: "var(--ink-400)", marginLeft: "auto" }}>{r.createTime}</span></div>
                    <p style={{ fontSize: 12.6, color: "var(--ink-600)", lineHeight: 1.5, marginTop: 4, textWrap: "pretty" }}>{r.comment}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
          <div className="card" style={{ padding: "var(--card-pad)" }}>
            <SecHead title="Profile completeness" />
            <div style={{ display: "grid", placeItems: "center", margin: "16px 0" }}><ScoreRing value={l.profileComplete} size={104} thickness={10} /></div>
            <button className="btn btn-secondary btn-sm" style={{ width: "100%" }} onClick={() => setTab("info")}>Complete profile<Icon name="arrowRight" size={13} /></button>
          </div>
        </div>
      )}

      {tab === "info" && (
        <div className="card" style={{ padding: "var(--card-pad)" }}>
          <SecHead title="Business information" sub="Edits are written to your live Google profile after you confirm." />
          <div style={{ marginTop: 6 }}>
            <ProfileField label="Business name" value={vals.title} onEdit={() => startEdit("title", "Business name", vals.title)} />
            <ProfileField label="Phone" value={vals.primaryPhone} onEdit={() => startEdit("primaryPhone", "Phone", vals.primaryPhone)} />
            <ProfileField label="Website" value={vals.websiteUri} onEdit={() => startEdit("websiteUri", "Website", vals.websiteUri)} />
            <ProfileField label="Address" value={vals.address} onEdit={() => startEdit("address", "Address", vals.address)} />
            <ProfileField label="Primary category" value={l.primaryCategory} onEdit={() => startEdit("category", "Primary category", l.primaryCategory)} />
            <ProfileField label="Place ID" value={l.placeId} mono />
          </div>
        </div>
      )}

      {tab === "reviews" && (
        <div className="card" style={{ padding: "var(--card-pad)" }}>
          <SecHead title={`Reviews · ${l.area}`} action={<button className="btn btn-secondary btn-sm" onClick={() => go("reviews")}>Full inbox<Icon name="external" size={13} /></button>} />
          <div style={{ marginTop: 12, display: "flex", flexDirection: "column", gap: 10 }}>
            {locReviews.map(r => (
              <div key={r.id} style={{ border: "1px solid var(--ink-150)", borderRadius: "var(--r-md)", padding: 14 }}>
                <div style={{ display: "flex", alignItems: "center", gap: 9, marginBottom: 7 }}><Avatar name={r.reviewer} size={30} /><span style={{ fontSize: 13, fontWeight: 600 }}>{r.reviewer}</span><StarRow value={r.starRating} size={12} /><span className={"badge " + (r.reply ? "badge-success" : "badge-warning")} style={{ marginLeft: "auto" }}>{r.reply ? "Replied" : "Needs reply"}</span></div>
                <p style={{ fontSize: 12.8, color: "var(--ink-600)", lineHeight: 1.5, textWrap: "pretty" }}>{r.comment}</p>
              </div>
            ))}
          </div>
        </div>
      )}

      {tab === "posts" && (
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))", gap: "var(--gutter)" }}>
          {GBP_POSTS.filter(p => p.locId === l.id).map(p => <PostCard key={p.id} p={p} />)}
          <button onClick={() => go("posts")} className="card tap" style={{ border: "1.5px dashed var(--ink-300)", background: "var(--ink-50)", display: "grid", placeItems: "center", minHeight: 200, cursor: "pointer", color: "var(--ink-500)" }}>
            <div style={{ textAlign: "center" }}><Icon name="plus" size={22} /><div style={{ fontSize: 12.5, marginTop: 6 }}>New post</div></div>
          </button>
        </div>
      )}

      {tab === "hours" && (
        <div className="card" style={{ padding: "var(--card-pad)" }}>
          <SecHead title="Business hours" sub="Shown on your Google profile" />
          <div style={{ marginTop: 12, display: "flex", flexDirection: "column", gap: 8 }}>
            {["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"].map((d, i) => (
              <div key={d} style={{ display: "flex", justifyContent: "space-between", fontSize: 13, padding: "4px 0" }}>
                <span style={{ color: "var(--ink-500)" }}>{d}</span>
                <span style={{ fontWeight: 540, color: i === 6 ? "var(--ink-400)" : "var(--ink-800)" }}>{i === 6 ? "Closed" : i === 4 ? "8:00 AM – 5:00 PM" : i === 5 ? "9:00 AM – 2:00 PM" : "8:00 AM – 6:00 PM"}</span>
              </div>
            ))}
          </div>
          <button className="btn btn-secondary btn-sm" style={{ marginTop: 14 }}><Icon name="edit" size={13} />Edit hours</button>
        </div>
      )}

      {/* edit modal — gated write */}
      <ConfirmWrite open={!!edit} onClose={() => setEdit(null)}
        title={`Update ${edit?.label?.toLowerCase()} on Google?`}
        intent="change a business detail"
        target={`${l.title} · ${l.area}`}
        method="PATCH accounts.locations.patch"
        confirmLabel="Confirm & save to Google"
        onConfirm={() => { setVals(v => ({ ...v, [edit.field]: draft })); setEdit(null); fire(`${edit.label} updated on Google Business Profile`); }}>
        <label style={{ display: "flex", flexDirection: "column", gap: 6 }}>
          <span style={{ fontSize: 11.5, fontWeight: 600, color: "var(--ink-500)" }}>{edit?.label}</span>
          <input value={draft} onChange={e => setDraft(e.target.value)} className="input" autoFocus />
        </label>
      </ConfirmWrite>
    </Page>
  );
};

Object.assign(window, { GBPLocations, GBPLocationDetail });
