/* GBP Manager — Tasks. Generated from the audit, system events, and manual adds. */

const { useState: useStateTK } = React;

const TASK_ICON = { review: "star", profile: "building", media: "camera", post: "megaphone" };

const GBPTasks = ({ go }) => {
  const [tasks, setTasks] = useStateTK(GBP_TASKS);
  const [filter, setFilter] = useStateTK("open");
  const fire = useToast();
  const toggle = (id) => setTasks(ts => ts.map(t => t.id === id ? { ...t, done: !t.done } : t));

  const shown = tasks.filter(t => filter === "all" ? true : filter === "open" ? !t.done : t.done);
  const open = tasks.filter(t => !t.done);
  const byPriority = { high: open.filter(t => t.priority === "high").length, medium: open.filter(t => t.priority === "medium").length, low: open.filter(t => t.priority === "low").length };

  const routeFor = (t) => t.type === "review" ? "reviews" : t.type === "post" ? "posts" : t.type === "media" ? "locations" : "locations";

  return (
    <Page max={920}>
      <PageHeader eyebrow="Manage" title="Tasks"
        sub="Everything that needs a human — pulled from the SEO audit, Google alerts, and your own to-dos."
        actions={<button className="btn btn-primary"><Icon name="plus" size={16} />Add task</button>}
      />

      <div style={{ display: "flex", gap: "var(--gutter)", marginBottom: "var(--gutter)", flexWrap: "wrap" }}>
        {[["Open", open.length, "var(--ink-900)"], ["High priority", byPriority.high, "var(--danger)"], ["Medium", byPriority.medium, "var(--warning)"], ["Completed", tasks.filter(t => t.done).length, "var(--success)"]].map(([k, v, c]) => (
          <div key={k} className="card" style={{ flex: 1, minWidth: 140, padding: "14px 16px" }}>
            <div className="eyebrow" style={{ marginBottom: 6 }}>{k}</div>
            <div className="tnum" style={{ fontSize: 24, fontWeight: 700, color: c }}>{v}</div>
          </div>
        ))}
      </div>

      <div style={{ display: "flex", gap: 7, marginBottom: 16 }}>
        {[["open", "Open"], ["done", "Completed"], ["all", "All"]].map(([k, l]) => <button key={k} onClick={() => setFilter(k)} className="chip" data-active={filter === k}>{l}</button>)}
      </div>

      <div className="card" style={{ padding: 0, overflow: "hidden" }}>
        {shown.length === 0
          ? <EmptyState icon="checkCircle" title="Nothing here" sub="You're all caught up." />
          : shown.map((t, i) => {
            const pm = PRIORITY_META[t.priority];
            return (
              <div key={t.id} style={{ display: "flex", alignItems: "center", gap: 13, padding: "14px 18px", borderTop: i ? "1px solid var(--ink-150)" : "none", opacity: t.done ? 0.6 : 1 }}>
                <button onClick={() => { toggle(t.id); if (!t.done) fire("Task completed", { icon: "checkCircle" }); }} role="checkbox" aria-checked={t.done}
                  style={{ width: 22, height: 22, borderRadius: 6, flex: "none", cursor: "pointer", border: t.done ? "0" : "1.5px solid var(--ink-300)", background: t.done ? "var(--accent)" : "var(--white)", display: "grid", placeItems: "center", color: "#fff" }}>
                  {t.done && <Icon name="check" size={14} />}
                </button>
                <span style={{ width: 32, height: 32, borderRadius: 8, flex: "none", display: "grid", placeItems: "center", background: "var(--ink-100)", color: "var(--ink-500)" }}><Icon name={TASK_ICON[t.type] || "listChecks"} size={15} /></span>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: 13.5, fontWeight: 540, textDecoration: t.done ? "line-through" : "none", color: t.done ? "var(--ink-400)" : "var(--ink-900)" }}>{t.title}</div>
                  <div style={{ display: "flex", alignItems: "center", gap: 8, marginTop: 3 }}>
                    <LocPill loc={t.loc} />
                    <span style={{ fontSize: 11, color: "var(--ink-300)" }}>·</span>
                    <span style={{ fontSize: 11, color: "var(--ink-400)" }}>from {t.source}</span>
                  </div>
                </div>
                {!t.done && <span className={"badge " + pm.cls}>{pm.label}</span>}
                <span style={{ fontSize: 11.5, color: t.due === "Overdue" ? "var(--danger)" : "var(--ink-400)", fontWeight: t.due === "Overdue" ? 600 : 400, width: 58, textAlign: "right" }}>{t.due}</span>
                {!t.done && <button className="btn btn-ghost btn-sm" onClick={() => go(routeFor(t))}><Icon name="arrowUpRight" size={14} /></button>}
              </div>
            );
          })}
      </div>
    </Page>
  );
};

Object.assign(window, { GBPTasks });
