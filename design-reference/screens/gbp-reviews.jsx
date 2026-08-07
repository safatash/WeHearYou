/* GBP Manager — Reviews manager + AI reply drafts.
   Posting a reply is a Google API write → always gated behind ConfirmWrite.
   AI drafts are never auto-published: a human approves, then confirms the write. */

const { useState: useStateRV, useMemo: useMemoRV } = React;

/* ============ Reviews manager ============ */
const REVIEW_FILTERS = ["All", "Needs reply", "5★", "4★", "1–3★", "Replied"];

const ReplyComposer = ({ review, onClose, onPost }) => {
  const [text, setText] = useStateRV("");
  const [tone, setTone] = useStateRV("Warm");
  const [generating, setGenerating] = useStateRV(false);
  const [confirm, setConfirm] = useStateRV(false);
  const fire = useToast();

  const generate = (t = tone) => {
    setGenerating(true);
    setTimeout(() => {
      const base = review.starRating >= 4
        ? `Thank you so much, ${review.reviewer.split(" ")[0]}! We're thrilled you had a great experience and we'll share your kind words with the team. We look forward to seeing you again.`
        : `We're sorry your visit fell short, ${review.reviewer.split(" ")[0]}. That's not the standard we hold ourselves to — our office manager will reach out to make this right. Thank you for the honest feedback.`;
      setText(base);
      setGenerating(false);
    }, 650);
  };

  return (
    <div className="anim-up" style={{ marginTop: 12, border: "1px solid var(--ink-200)", borderRadius: "var(--r-md)", overflow: "hidden", background: "var(--ink-50)" }}>
      <div style={{ display: "flex", alignItems: "center", gap: 8, padding: "8px 11px", borderBottom: "1px solid var(--ink-200)", background: "var(--white)", flexWrap: "wrap" }}>
        <Icon name="sparkle" size={14} style={{ color: "var(--accent)" }} />
        <span style={{ fontSize: 12, color: "var(--ink-500)" }}>AI suggestion</span>
        <div className="seg" style={{ marginLeft: "auto" }}>
          {AI_TONES.map(t => <button key={t} data-active={tone === t} onClick={() => { setTone(t); if (text) generate(t); }}>{t}</button>)}
        </div>
        <button className="btn btn-soft btn-sm" onClick={() => generate()} disabled={generating}>
          {generating ? <><Icon name="refresh" size={13} className="spin" />Writing…</> : <><Icon name="sparkle" size={13} />{text ? "Regenerate" : "Draft reply"}</>}
        </button>
      </div>
      <textarea value={text} onChange={e => setText(e.target.value)} rows={3} placeholder="Write a reply, or generate a draft above…"
        style={{ width: "100%", border: 0, resize: "vertical", padding: "11px 12px", fontSize: 13.3, fontFamily: "inherit", color: "var(--ink-800)", background: "transparent", outline: "none", lineHeight: 1.55 }} />
      <div style={{ display: "flex", alignItems: "center", gap: 8, padding: "8px 11px", borderTop: "1px solid var(--ink-200)", background: "var(--white)" }}>
        <span style={{ fontSize: 11.5, color: "var(--ink-400)", display: "inline-flex", alignItems: "center", gap: 5 }}>
          <Icon name="google" size={13} style={{ color: "var(--src-google)" }} />Posts publicly as the owner
        </span>
        <button className="btn btn-ghost btn-sm" style={{ marginLeft: "auto" }} onClick={onClose}>Cancel</button>
        <button className="btn btn-primary btn-sm" disabled={!text.trim()} onClick={() => setConfirm(true)}><Icon name="send" size={13} />Post reply</button>
      </div>
      <ConfirmWrite open={confirm} onClose={() => setConfirm(false)}
        title="Post this reply to Google?"
        intent="publish a public reply"
        target={`${review.loc} · ${review.reviewer}`}
        method="PUT accounts.locations.reviews.updateReply"
        confirmLabel="Confirm & post reply"
        onConfirm={() => { setConfirm(false); onPost(review.id, text); fire("Reply posted to Google Business Profile"); }}>
        <div style={{ fontSize: 12.5, color: "var(--ink-600)", lineHeight: 1.5, textWrap: "pretty" }}>“{text}”</div>
      </ConfirmWrite>
    </div>
  );
};

const ReviewCard = ({ r, replied, onPost, onDelete }) => {
  const [open, setOpen] = useStateRV(false);
  const [confirmDelete, setConfirmDelete] = useStateRV(false);
  const isReplied = !!r.reply || replied[r.id];
  const negative = r.starRating <= 2;
  const fire = useToast();
  return (
    <div style={{ border: "1px solid var(--ink-150)", borderRadius: "var(--r-md)", padding: 16, background: "var(--white)", position: "relative" }}>
      {!isReplied && <span style={{ position: "absolute", left: 0, top: 14, bottom: 14, width: 3, borderRadius: 3, background: negative ? "var(--danger)" : "var(--warning)" }} />}
      <div style={{ display: "flex", alignItems: "center", gap: 11, marginBottom: 9 }}>
        <Avatar name={r.reviewer} size={36} />
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
            <span style={{ fontSize: 13.5, fontWeight: 620 }}>{r.reviewer}</span>
            <StarRow value={r.starRating} size={13} />
            <span style={{ display: "inline-flex", alignItems: "center", gap: 4, fontSize: 11, color: "var(--ink-400)" }}>
              <Icon name="google" size={11} style={{ color: "var(--src-google)" }} />Google
            </span>
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 8, marginTop: 2 }}>
            <LocPill loc={r.loc} /><span style={{ fontSize: 11.5, color: "var(--ink-400)" }}>· {r.createTime}</span>
          </div>
        </div>
        <span className={"badge " + (isReplied ? "badge-success" : negative ? "badge-danger" : "badge-warning")}>
          <span className="dot" style={{ background: isReplied ? "var(--success)" : negative ? "var(--danger)" : "var(--warning)" }} />
          {isReplied ? "Replied" : negative ? "Needs attention" : "Needs reply"}
        </span>
      </div>
      <p style={{ fontSize: 13.3, lineHeight: 1.55, color: "var(--ink-700)", margin: "0 0 12px", textWrap: "pretty" }}>{r.comment}</p>

      {isReplied ? (
        <div style={{ borderLeft: "2px solid var(--accent-border)", paddingLeft: 12, marginBottom: 4 }}>
          <div style={{ fontSize: 11.5, fontWeight: 600, color: "var(--accent-strong)", marginBottom: 3, display: "flex", alignItems: "center", gap: 5 }}>
            <Icon name="reply" size={12} />Owner reply{r.reply?.time ? ` · ${r.reply.time}` : ""}
          </div>
          <p style={{ fontSize: 12.8, color: "var(--ink-600)", lineHeight: 1.5, textWrap: "pretty" }}>{(replied[r.id] || r.reply?.comment)}</p>
        </div>
      ) : (
        <div style={{ display: "flex", gap: 7, flexWrap: "wrap" }}>
          <button className="btn btn-primary btn-sm" onClick={() => setOpen(o => !o)}><Icon name="reply" size={13} />Reply</button>
          <button className="btn btn-secondary btn-sm"><Icon name="flag" size={13} />Flag</button>
          <button className="btn btn-ghost btn-sm"><Icon name="external" size={13} />Open on Google</button>
          <button className="btn btn-ghost btn-sm" style={{ color: "var(--danger)" }} onClick={() => setConfirmDelete(true)}><Icon name="trash" size={13} />Delete</button>
        </div>
      )}
      {isReplied && (
        <button className="btn btn-ghost btn-sm" style={{ color: "var(--danger)", marginTop: 10 }} onClick={() => setConfirmDelete(true)}><Icon name="trash" size={13} />Delete</button>
      )}
      {open && !isReplied && <ReplyComposer review={r} onClose={() => setOpen(false)} onPost={onPost} />}
      <ConfirmWrite open={confirmDelete} onClose={() => setConfirmDelete(false)}
        title="Delete this review?"
        intent="remove this review from your inbox"
        target={`${r.loc} · ${r.reviewer}`}
        method="DELETE accounts.locations.reviews"
        confirmLabel="Delete review"
        danger
        onConfirm={() => { setConfirmDelete(false); onDelete(r.id); fire("Review deleted"); }}>
        <div style={{ fontSize: 12.5, color: "var(--ink-600)", lineHeight: 1.5, textWrap: "pretty" }}>“{r.comment}”</div>
      </ConfirmWrite>
    </div>
  );
};

const GBPReviews = ({ go }) => {
  const [filter, setFilter] = useStateRV("All");
  const [locFilter, setLocFilter] = useStateRV("all");
  const [replied, setReplied] = useStateRV({});
  const [deleted, setDeleted] = useStateRV([]);
  const onPost = (id, text) => setReplied(p => ({ ...p, [id]: text }));
  const onDelete = (id) => setDeleted(d => [...d, id]);

  const filtered = useMemoRV(() => GBP_REVIEWS.filter(r => {
    if (deleted.includes(r.id)) return false;
    if (locFilter !== "all" && r.locId !== locFilter) return false;
    const isReplied = !!r.reply || replied[r.id];
    if (filter === "All") return true;
    if (filter === "Needs reply") return !isReplied;
    if (filter === "Replied") return isReplied;
    if (filter === "5★") return r.starRating === 5;
    if (filter === "4★") return r.starRating === 4;
    if (filter === "1–3★") return r.starRating <= 3;
    return true;
  }), [filter, locFilter, replied, deleted]);

  const needsReply = GBP_REVIEWS.filter(r => !r.reply && !replied[r.id] && !deleted.includes(r.id)).length;

  return (
    <Page>
      <PageHeader eyebrow="Reputation" title="Reviews"
        sub="Every Google review across your connected profiles. Replies post publicly as the business owner — always after you confirm."
        actions={<>
          <button className="btn btn-secondary"><Icon name="external" size={16} />Export CSV</button>
          <button className="btn btn-primary" onClick={() => go("drafts")}><Icon name="sparkle" size={16} />AI reply drafts</button>
        </>}
      />

      <div style={{ marginBottom: 16 }}>
        <GatedNotice>Replies are written to Google only after you review and confirm each one. AI never posts on its own.</GatedNotice>
      </div>

      {/* filters */}
      <div className="card" style={{ padding: "12px 14px", marginBottom: 16, display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
        <div style={{ display: "flex", gap: 7, flexWrap: "wrap" }}>
          {REVIEW_FILTERS.map(f => <button key={f} onClick={() => setFilter(f)} className="chip" data-active={filter === f}>{f}{f === "Needs reply" && needsReply > 0 && <span className="ld-tabcount" style={{ marginLeft: 4 }}>{needsReply}</span>}</button>)}
        </div>
        <div className="seg" style={{ marginLeft: "auto" }}>
          <button data-active={locFilter === "all"} onClick={() => setLocFilter("all")}>All locations</button>
          {GBP_LOCATIONS.map(l => <button key={l.id} data-active={locFilter === l.id} onClick={() => setLocFilter(l.id)}>{l.area}</button>)}
        </div>
      </div>

      <div style={{ display: "flex", flexDirection: "column", gap: 11 }}>
        {filtered.length === 0
          ? <div className="card"><EmptyState icon="checkCircle" title="All caught up" sub="No reviews match this filter." /></div>
          : filtered.map(r => <ReviewCard key={r.id} r={r} replied={replied} onPost={onPost} onDelete={onDelete} />)}
      </div>
    </Page>
  );
};

/* ============ AI reply drafts queue ============ */
const DraftCard = ({ d, onApprove, onDismiss }) => {
  const [text, setText] = useStateRV(d.draft);
  const [tone, setTone] = useStateRV(d.tone);
  const [regen, setRegen] = useStateRV(false);
  const [confirm, setConfirm] = useStateRV(false);
  const [approved, setApproved] = useStateRV(d.status === "approved");
  const fire = useToast();
  const negative = d.starRating <= 2;

  const regenerate = (t = tone) => { setRegen(true); setTimeout(() => { setRegen(false); fire(`Regenerated in a ${t.toLowerCase()} tone`); }, 700); };

  return (
    <div className="card" style={{ padding: 0, overflow: "hidden", borderColor: d.flagged ? "var(--warning)" : "var(--ink-200)" }}>
      {/* source review */}
      <div style={{ padding: "14px 16px", borderBottom: "1px solid var(--ink-150)", background: d.flagged ? "color-mix(in srgb, var(--warning) 5%, #fff)" : "var(--ink-50)" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 9, flexWrap: "wrap" }}>
          <Avatar name={d.reviewer} size={32} />
          <span style={{ fontSize: 13.3, fontWeight: 600 }}>{d.reviewer}</span>
          <StarRow value={d.starRating} size={12} />
          <LocPill loc={d.loc} />
          <div style={{ marginLeft: "auto", display: "flex", alignItems: "center", gap: 7 }}>
            <span style={{ fontSize: 11, color: "var(--ink-400)" }}>Confidence</span>
            <span className="tnum" style={{ fontSize: 11.5, fontWeight: 700, color: d.confidence >= 0.85 ? "var(--success)" : d.confidence >= 0.7 ? "var(--warning)" : "var(--danger)" }}>{Math.round(d.confidence * 100)}%</span>
          </div>
        </div>
        <p style={{ fontSize: 12.6, color: "var(--ink-500)", marginTop: 8, lineHeight: 1.5, fontStyle: "italic", textWrap: "pretty" }}>“{d.snippet}”</p>
      </div>

      {/* draft */}
      <div style={{ padding: "14px 16px" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 9, flexWrap: "wrap" }}>
          <AIBadge />
          {d.flagged && <span className="badge badge-warning"><Icon name="alert" size={11} />Negative — human review required</span>}
          <div className="seg" style={{ marginLeft: "auto" }}>
            {AI_TONES.map(t => <button key={t} data-active={tone === t} onClick={() => { setTone(t); regenerate(t); }}>{t}</button>)}
          </div>
        </div>
        <textarea value={text} onChange={e => { setText(e.target.value); setApproved(false); }} rows={4} disabled={regen}
          style={{ width: "100%", border: "1px solid var(--ink-200)", borderRadius: "var(--r-sm)", resize: "vertical", padding: "11px 12px", fontSize: 13.3, fontFamily: "inherit", color: "var(--ink-800)", background: regen ? "var(--ink-50)" : "var(--white)", outline: "none", lineHeight: 1.55 }} />
        <div style={{ display: "flex", alignItems: "center", gap: 8, marginTop: 11, flexWrap: "wrap" }}>
          <button className="btn btn-ghost btn-sm" onClick={() => regenerate()} disabled={regen}>{regen ? <><Icon name="refresh" size={13} className="spin" />Regenerating…</> : <><Icon name="sparkle" size={13} />Regenerate</>}</button>
          <button className="btn btn-ghost btn-sm" onClick={() => onDismiss(d.id)}><Icon name="trash" size={13} />Dismiss</button>
          <div style={{ marginLeft: "auto", display: "flex", gap: 8 }}>
            {!approved
              ? <button className="btn btn-secondary btn-sm" onClick={() => { setApproved(true); fire("Draft approved — confirm to post"); }}><Icon name="check" size={13} />Approve</button>
              : <span className="badge badge-success" style={{ height: 32, padding: "0 11px" }}><Icon name="check" size={13} />Approved</span>}
            <button className="btn btn-primary btn-sm" disabled={!approved} onClick={() => setConfirm(true)}><Icon name="send" size={13} />Post to Google</button>
          </div>
        </div>
      </div>

      <ConfirmWrite open={confirm} onClose={() => setConfirm(false)}
        title="Post approved reply to Google?"
        intent="publish a public reply"
        target={`${d.loc} · ${d.reviewer}`}
        method="PUT accounts.locations.reviews.updateReply"
        confirmLabel="Confirm & post reply"
        danger={negative}
        onConfirm={() => { setConfirm(false); onApprove(d.id, text); fire("Reply posted to Google Business Profile"); }}>
        <div style={{ fontSize: 12.5, color: "var(--ink-600)", lineHeight: 1.5, textWrap: "pretty" }}>“{text}”</div>
      </ConfirmWrite>
    </div>
  );
};

const GBPDrafts = ({ go }) => {
  const [drafts, setDrafts] = useStateRV(GBP_REPLY_DRAFTS);
  const [posted, setPosted] = useStateRV([]);
  const remove = (id) => setDrafts(d => d.filter(x => x.id !== id));
  const approve = (id) => { setPosted(p => [...p, id]); setTimeout(() => remove(id), 400); };
  const pending = drafts.filter(d => !posted.includes(d.id));
  const flagged = pending.filter(d => d.flagged).length;

  return (
    <Page max={920}>
      <PageHeader eyebrow="Reputation · AI assist" title="AI reply drafts"
        sub="One draft per unanswered review, written in your brand voice. Edit, choose a tone, approve — then confirm the write. Drafts never post on their own."
        actions={<button className="btn btn-secondary" onClick={() => go("reviews")}><Icon name="star" size={16} />Back to reviews</button>}
      />

      <div style={{ display: "flex", gap: "var(--gutter)", marginBottom: "var(--gutter)", flexWrap: "wrap" }}>
        <div className="card" style={{ flex: 1, minWidth: 150, padding: "14px 16px" }}>
          <div className="eyebrow" style={{ marginBottom: 6 }}>Ready to review</div>
          <div className="tnum" style={{ fontSize: 24, fontWeight: 700 }}>{pending.length}</div>
        </div>
        <div className="card" style={{ flex: 1, minWidth: 150, padding: "14px 16px" }}>
          <div className="eyebrow" style={{ marginBottom: 6 }}>Need human review</div>
          <div className="tnum" style={{ fontSize: 24, fontWeight: 700, color: flagged ? "var(--warning)" : "var(--ink-900)" }}>{flagged}</div>
        </div>
        <div className="card" style={{ flex: 2, minWidth: 240, padding: "12px 14px", display: "flex", alignItems: "center", gap: 11 }}>
          <Icon name="shield" size={18} style={{ color: "var(--accent-strong)", flex: "none" }} />
          <span style={{ fontSize: 12.3, color: "var(--ink-600)", lineHeight: 1.45, textWrap: "pretty" }}>Negative reviews (1–2★) are always flagged for human review and require an explicit confirm before posting.</span>
        </div>
      </div>

      <div style={{ display: "flex", flexDirection: "column", gap: "var(--gutter)" }}>
        {pending.length === 0
          ? <div className="card"><EmptyState icon="checkCircle" title="No drafts pending" sub="New drafts appear here as fresh reviews arrive." action={<button className="btn btn-primary" onClick={() => go("reviews")}>Go to reviews</button>} /></div>
          : pending.map(d => <DraftCard key={d.id} d={d} onApprove={approve} onDismiss={remove} />)}
      </div>
    </Page>
  );
};

Object.assign(window, { GBPReviews, GBPDrafts });
