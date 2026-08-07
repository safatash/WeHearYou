/* GBP Manager — Dashboard overview */

const { useState: useStateDB } = React;

/* metric card (mirrors WeHearYou MetricCard) */
const GMetricCard = ({ m }) => {
  const positive = m.tone === "up" || m.tone === "down-good";
  const deltaColor = positive ? "var(--success)" : "var(--danger)";
  const sparkColor = m.key === "unreplied" ? "var(--ink-400)" : "var(--accent)";
  const goodDown = m.tone === "down-good";
  return (
    <div className="card" style={{ padding: "var(--card-pad)", display: "flex", flexDirection: "column", gap: 10 }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
        <span style={{ fontSize: 12.5, color: "var(--ink-500)", fontWeight: 540 }}>{m.label}</span>
        <span className="badge tnum" style={{ background: `color-mix(in srgb, ${deltaColor} 12%, #fff)`, color: deltaColor, height: 20, paddingLeft: 6 }}>
          <Icon name="arrowUp" size={11} style={{ transform: goodDown ? "rotate(180deg)" : "none" }} />
          {m.delta > 0 ? "+" : ""}{m.delta}{m.key === "rating" || m.key === "unreplied" ? "" : "%"}
        </span>
      </div>
      <div style={{ display: "flex", alignItems: "flex-end", justifyContent: "space-between", gap: 12 }}>
        <div style={{ display: "flex", alignItems: "baseline", gap: 3 }}>
          <span className="tnum" style={{ fontSize: 30, fontWeight: 680, letterSpacing: "-.03em", lineHeight: 1 }}>{m.value}</span>
          {m.suffix && <span style={{ fontSize: 18, fontWeight: 600, color: m.key === "rating" ? "var(--star)" : "var(--ink-400)" }}>{m.suffix}</span>}
        </div>
        <Sparkline data={m.spark} color={sparkColor} w={88} h={32} />
      </div>
      <div style={{ fontSize: 11.5, color: "var(--ink-400)" }}>{m.deltaLabel}</div>
    </div>
  );
};

/* location health row */
const LocHealthRow = ({ l, onOpen }) => {
  const up = l.deltaRating >= 0;
  return (
    <button onClick={() => onOpen(l.id)} className="tap" style={{ width: "100%", display: "flex", alignItems: "center", gap: 13, padding: "12px 6px", borderTop: "1px solid var(--ink-150)", border: 0, borderTopWidth: 1, borderTopStyle: "solid", background: "transparent", cursor: "pointer", textAlign: "left" }}>
      <span style={{ width: 34, height: 34, borderRadius: 9, flex: "none", display: "grid", placeItems: "center", background: `hsl(${l.hue} 42% 94%)`, color: `hsl(${l.hue} 55% 32%)` }}>
        <Icon name="pin" size={16} />
      </span>
      <div style={{ minWidth: 0, flex: 1 }}>
        <div style={{ fontSize: 13.3, fontWeight: 600, display: "flex", alignItems: "center", gap: 7 }}>
          {l.area}
          {!l.verified && <span className="badge badge-warning" style={{ height: 17, fontSize: 10 }}>Unverified</span>}
        </div>
        <div style={{ fontSize: 11.5, color: "var(--ink-400)" }} className="tnum">{l.reviewCount.toLocaleString()} reviews · {l.unreplied} to reply</div>
      </div>
      <div style={{ textAlign: "right" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 6, justifyContent: "flex-end" }}>
          <span className="tnum" style={{ fontSize: 14, fontWeight: 660 }}>{l.rating}</span>
          <StarRow value={l.rating} size={12} />
        </div>
        <span className="badge tnum" style={{ height: 17, fontSize: 10.5, paddingLeft: 5, marginTop: 3, background: `color-mix(in srgb, ${up ? "var(--success)" : "var(--danger)"} 12%, #fff)`, color: up ? "var(--success)" : "var(--danger)" }}>
          <Icon name="arrowUp" size={9} style={{ transform: up ? "none" : "rotate(180deg)" }} />{up ? "+" : ""}{l.deltaRating}
        </span>
      </div>
      <Sparkline data={l.spark} color={l.verified ? "var(--accent)" : "var(--warning)"} w={70} h={30} />
    </button>
  );
};

/* recent posts performance row */
const PostPerfRow = ({ p }) => {
  const sm = POST_STATE_META[p.state];
  const typeMeta = POST_TYPES.find(t => t.key === p.topicType);
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 12, padding: "11px 6px", borderTop: "1px solid var(--ink-150)" }}>
      <span style={{ width: 32, height: 32, borderRadius: 8, flex: "none", display: "grid", placeItems: "center", background: "var(--ink-100)", color: "var(--ink-400)" }}><Icon name={typeMeta?.icon || "fileText"} size={15} /></span>
      <div style={{ minWidth: 0, flex: 1 }}>
        <div style={{ fontSize: 12.8, fontWeight: 580, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{p.title}</div>
        <div style={{ fontSize: 11, color: "var(--ink-400)", display: "flex", alignItems: "center", gap: 6, marginTop: 2 }}>
          <span className={"badge " + sm.cls} style={{ height: 16, fontSize: 9.5, paddingLeft: 5 }}><span className="dot" style={{ background: sm.dot }} />{sm.label}</span>
          <LocPill loc={p.loc} />
        </div>
      </div>
      {p.state === "LIVE" ? (
        <div style={{ textAlign: "right", flex: "none" }}>
          <div className="tnum" style={{ fontSize: 13, fontWeight: 660 }}>{p.views.toLocaleString()}</div>
          <div style={{ fontSize: 10, color: "var(--ink-400)" }}>views</div>
        </div>
      ) : (
        <span style={{ fontSize: 11, color: "var(--ink-400)", flex: "none" }}>{p.scheduleTime || "—"}</span>
      )}
    </div>
  );
};

/* stat rail — single card, divided compact stats (distinct from the app dashboard's 4-card grid) */
const StatRail = ({ metrics }) => (
  <div className="card" style={{ padding: 0, marginBottom: "var(--gutter)", display: "grid", gridTemplateColumns: `repeat(${metrics.length}, 1fr)` }}>
    {metrics.map((m, i) => {
      const positive = m.tone === "up" || m.tone === "down-good";
      const deltaColor = positive ? "var(--success)" : "var(--danger)";
      const goodDown = m.tone === "down-good";
      return (
        <div key={m.key} style={{ padding: "16px 20px", borderLeft: i > 0 ? "1px solid var(--ink-150)" : "none", display: "flex", flexDirection: "column", gap: 6 }}>
          <span style={{ fontSize: 11.5, color: "var(--ink-500)", fontWeight: 540 }}>{m.label}</span>
          <div style={{ display: "flex", alignItems: "baseline", gap: 8 }}>
            <span className="tnum" style={{ fontSize: 24, fontWeight: 680, letterSpacing: "-.03em", lineHeight: 1 }}>{m.value}{m.suffix && <span style={{ fontSize: 14, fontWeight: 600, color: m.key === "rating" ? "var(--star)" : "var(--ink-400)" }}>{m.suffix}</span>}</span>
            <span className="tnum" style={{ fontSize: 11.5, fontWeight: 640, color: deltaColor, display: "flex", alignItems: "center", gap: 2 }}>
              <Icon name="arrowUp" size={10} style={{ transform: goodDown ? "rotate(180deg)" : "none" }} />
              {m.delta > 0 ? "+" : ""}{m.delta}{m.key === "rating" || m.key === "unreplied" ? "" : "%"}
            </span>
          </div>
        </div>
      );
    })}
  </div>
);

/* location profile strip — horizontal cards, replaces the sidebar list */
const LocProfileCard = ({ l, onOpen }) => {
  const up = l.deltaRating >= 0;
  return (
    <button onClick={() => onOpen(l.id)} className="tap card" style={{ flex: "none", width: 220, padding: 14, display: "flex", flexDirection: "column", gap: 10, border: "1px solid var(--ink-150)", cursor: "pointer", textAlign: "left", background: "var(--white)" }}>
      <div style={{ display: "flex", alignItems: "center", gap: 9 }}>
        <span style={{ width: 30, height: 30, borderRadius: 8, flex: "none", display: "grid", placeItems: "center", background: `hsl(${l.hue} 42% 94%)`, color: `hsl(${l.hue} 55% 32%)` }}><Icon name="pin" size={14} /></span>
        <div style={{ minWidth: 0 }}>
          <div style={{ fontSize: 12.8, fontWeight: 620, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{l.area}</div>
          {!l.verified && <span className="badge badge-warning" style={{ height: 15, fontSize: 9, marginTop: 2 }}>Unverified</span>}
        </div>
      </div>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 5 }}>
          <span className="tnum" style={{ fontSize: 15, fontWeight: 680 }}>{l.rating}</span>
          <StarRow value={l.rating} size={11} />
        </div>
        <span className="badge tnum" style={{ height: 16, fontSize: 9.5, paddingLeft: 5, background: `color-mix(in srgb, ${up ? "var(--success)" : "var(--danger)"} 12%, #fff)`, color: up ? "var(--success)" : "var(--danger)" }}>
          <Icon name="arrowUp" size={8} style={{ transform: up ? "none" : "rotate(180deg)" }} />{up ? "+" : ""}{l.deltaRating}
        </span>
      </div>
      <div style={{ fontSize: 11, color: "var(--ink-400)" }} className="tnum">{l.reviewCount.toLocaleString()} reviews{l.unreplied > 0 && <span style={{ color: "var(--danger)", fontWeight: 600 }}> · {l.unreplied} to reply</span>}</div>
    </button>
  );
};

const GBPDashboard = ({ tweaks, go }) => {
  const fire = useToast();
  const chartVariant = tweaks.chartStyle || "area";
  const totalUnreplied = GBP_LOCATIONS.reduce((a, l) => a + l.unreplied, 0);
  const pendingDrafts = GBP_REPLY_DRAFTS.filter(d => d.status !== "confirmed").length;
  const flaggedDrafts = GBP_REPLY_DRAFTS.filter(d => d.status === "generated" && d.flagged).length;
  const overdueTasks = GBP_TASKS.filter(t => !t.done && t.due === "Overdue").length;
  const openTasks = GBP_TASKS.filter(t => !t.done).length;
  const recentPosts = [...GBP_POSTS].sort((a, b) => (b.state === "LIVE") - (a.state === "LIVE")).slice(0, 4);

  return (
    <Page>
      {/* masthead — business profile identity, not a personal greeting */}
      <div className="card" style={{ padding: "18px 22px", marginBottom: "var(--gutter)", display: "flex", alignItems: "center", gap: 16, flexWrap: "wrap" }}>
        <span style={{ width: 48, height: 48, borderRadius: 12, flex: "none", display: "grid", placeItems: "center", background: "var(--accent-softer)", color: "var(--accent)" }}><Icon name="map" size={22} /></span>
        <div style={{ minWidth: 0, flex: 1 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
            <span style={{ fontSize: 17, fontWeight: 680 }}>{GBP_CONNECTION.accountName || GBP_CONNECTION.account.accountName}</span>
            <span className="badge badge-success" style={{ height: 19 }}><Icon name="check" size={10} />Verified</span>
            <span className="badge badge-neutral" style={{ height: 19 }}><Icon name="google" size={10} />Connected · synced {GBP_CONNECTION.lastSync}</span>
          </div>
          <div style={{ fontSize: 12.5, color: "var(--ink-500)", marginTop: 4 }}>3 profiles · Dental care</div>
        </div>
        <div style={{ textAlign: "right" }}>
          <div style={{ display: "flex", alignItems: "baseline", gap: 6, justifyContent: "flex-end" }}>
            <span className="tnum" style={{ fontSize: 26, fontWeight: 700 }}>{GBP_METRICS.find(m => m.key === "rating")?.value || "4.8"}</span>
            <StarRow value={4.8} size={15} />
          </div>
          <div style={{ fontSize: 11, color: "var(--ink-400)" }}>average across all profiles</div>
        </div>
        <div style={{ display: "flex", gap: 8 }}>
          <button className="btn btn-secondary btn-sm" onClick={() => fire("Refreshing from Google… profiles up to date")}><Icon name="refresh" size={14} />Sync</button>
          <button className="btn btn-primary" onClick={() => go("posts")}><Icon name="plus" size={16} />New Google post</button>
        </div>
      </div>

      {/* priority zone — the one thing to look at first */}
      {(totalUnreplied > 0 || overdueTasks > 0) && (
        <div className="card" style={{ padding: "15px 18px", marginBottom: "var(--gutter)", display: "flex", alignItems: "center", gap: 14, flexWrap: "wrap", border: "1px solid color-mix(in srgb, var(--accent) 22%, var(--ink-200))", background: "color-mix(in srgb, var(--accent) 4%, var(--white))" }}>
          <span style={{ width: 36, height: 36, borderRadius: 9, flex: "none", display: "grid", placeItems: "center", background: "var(--accent-softer)", color: "var(--accent)" }}><Icon name="alert" size={17} /></span>
          <div style={{ minWidth: 0, flex: 1 }}>
            <div style={{ fontSize: 13.5, fontWeight: 640 }}>Needs your attention</div>
            <div style={{ fontSize: 12, color: "var(--ink-500)" }} className="tnum">
              {totalUnreplied} review{totalUnreplied === 1 ? "" : "s"} awaiting reply{flaggedDrafts > 0 ? ` · ${flaggedDrafts} AI draft${flaggedDrafts === 1 ? "" : "s"} flagged for review` : ""}{overdueTasks > 0 ? ` · ${overdueTasks} task${overdueTasks === 1 ? "" : "s"} overdue` : ""}
            </div>
          </div>
          <button className="btn btn-soft btn-sm" onClick={() => go("drafts")}>Review drafts<Icon name="chevRight" size={13} /></button>
          <button className="btn btn-primary btn-sm" onClick={() => go("reviews")}>Open review inbox<Icon name="chevRight" size={13} /></button>
        </div>
      )}

      {/* location profile strip */}
      <div style={{ display: "flex", gap: 12, overflowX: "auto", paddingBottom: 4, marginBottom: "var(--gutter)" }}>
        {GBP_LOCATIONS.map(l => <LocProfileCard key={l.id} l={l} onOpen={(id) => go("locations", { detail: id })} />)}
      </div>

      {/* stat rail */}
      <StatRail metrics={GBP_METRICS} />

      {/* main grid — action queue left, analytics right (inverse of the app dashboard's chart-first layout) */}
      <div className="main-grid" style={{ display: "grid", gridTemplateColumns: "minmax(0, 1fr) minmax(0, 1.5fr)", gap: "var(--gutter)", alignItems: "start" }}>
        <div style={{ display: "flex", flexDirection: "column", gap: "var(--gutter)" }}>
          {/* AI reply drafts queue */}
          <div className="card" style={{ padding: "var(--card-pad)" }}>
            <SecHead title="AI reply drafts" sub="Generated from new reviews — approve before they post"
              action={<button className="btn btn-soft btn-sm" onClick={() => go("drafts")}>Review all {pendingDrafts}<Icon name="chevRight" size={14} /></button>} />
            <div style={{ marginTop: 12, display: "flex", flexDirection: "column", gap: 10 }}>
              {GBP_REPLY_DRAFTS.filter(d => d.status === "generated").slice(0, 2).map(d => (
                <div key={d.id} style={{ border: "1px solid var(--ink-200)", borderRadius: "var(--r-md)", padding: 13, background: d.flagged ? "color-mix(in srgb, var(--warning) 5%, #fff)" : "var(--ink-50)" }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 7 }}>
                    <Avatar name={d.reviewer} size={28} />
                    <span style={{ fontSize: 12.8, fontWeight: 600 }}>{d.reviewer}</span>
                    <StarRow value={d.starRating} size={11} />
                    <LocPill loc={d.loc} />
                    <span style={{ marginLeft: "auto" }}><AIBadge /></span>
                  </div>
                  <p style={{ fontSize: 12.6, color: "var(--ink-600)", lineHeight: 1.5, textWrap: "pretty" }}>{d.draft}</p>
                  <div style={{ display: "flex", alignItems: "center", gap: 7, marginTop: 10 }}>
                    {d.flagged && <span className="badge badge-warning" style={{ height: 19 }}><Icon name="alert" size={11} />Needs human review</span>}
                    <button className="btn btn-ghost btn-sm" onClick={() => go("drafts")}>Edit</button>
                    <button className="btn btn-primary btn-sm" onClick={() => go("drafts")}><Icon name="check" size={13} />Approve & post</button>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* tasks */}
          <div className="card" style={{ padding: "var(--card-pad)" }}>
            <SecHead title="Open tasks" action={<button className="btn btn-ghost btn-sm" onClick={() => go("tasks")}>All<Icon name="chevRight" size={14} /></button>} />
            <div style={{ marginTop: 8, display: "flex", flexDirection: "column", gap: 2 }}>
              {GBP_TASKS.filter(t => !t.done).slice(0, 4).map(t => (
                <div key={t.id} style={{ display: "flex", alignItems: "center", gap: 10, padding: "9px 4px" }}>
                  <span style={{ width: 7, height: 7, borderRadius: "50%", flex: "none", background: t.priority === "high" ? "var(--danger)" : t.priority === "medium" ? "var(--warning)" : "var(--ink-300)" }} />
                  <span style={{ fontSize: 12.8, color: "var(--ink-700)", flex: 1, minWidth: 0, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{t.title}</span>
                  <span style={{ fontSize: 11, color: t.due === "Overdue" ? "var(--danger)" : "var(--ink-400)", fontWeight: t.due === "Overdue" ? 600 : 400 }}>{t.due}</span>
                </div>
              ))}
            </div>
          </div>
        </div>

        <div style={{ display: "flex", flexDirection: "column", gap: "var(--gutter)" }}>
          {/* performance trend */}
          <div className="card" style={{ padding: "var(--card-pad)" }}>
            <SecHead title="Profile views & rating" sub="Search + Maps impressions vs. average rating, last 12 weeks"
              action={<button className="btn btn-ghost btn-sm" onClick={() => go("insights")}>Full insights<Icon name="chevRight" size={14} /></button>} />
            <div style={{ marginTop: 14 }}>
              <RatingTrendChart data={GBP_TREND} variant={chartVariant} height={tweaks.density === "compact" ? 180 : 224} />
            </div>
          </div>

          {/* recent posts performance */}
          <div className="card" style={{ padding: "var(--card-pad)" }}>
            <SecHead title="Recent posts performance" sub="Latest Google posts across all profiles"
              action={<button className="btn btn-ghost btn-sm" onClick={() => go("posts")}>All posts<Icon name="chevRight" size={14} /></button>} />
            <div style={{ marginTop: 4 }}>
              {recentPosts.map(p => <PostPerfRow key={p.id} p={p} />)}
            </div>
          </div>

          {/* customer actions */}
          <div className="card" style={{ padding: "var(--card-pad)" }}>
            <SecHead title="Customer actions" sub="Last 30 days" />
            <div style={{ marginTop: 16 }}>
              <SourceBars data={GBP_ACTIONS} />
            </div>
          </div>
        </div>
      </div>
    </Page>
  );
};

Object.assign(window, { GBPDashboard });
