/* WeHearYou — Review Funnel: POSITIVE flow (4–5 stars).
   intro+chips → details → AI review → accuracy confirm → copied celebration. */

const { useState: useStatePF, useEffect: useEffectPF } = React;

/* ===== SCREEN 2 — AI Review Assistant intro + "what stood out" ===== */
const PosIntro = ({ s, set, next }) => (
  <ScreenCard>
    <StepLabel step={0} total={4} label="Need help writing your review?" />
    <h1 className="fk-h1">Let's turn your visit into a review</h1>
    <p className="fk-sub">Pick a few things that stood out and we'll help you write a review for {BIZ.name} — you can edit every word before posting.</p>

    <div className="fk-field-label" style={{ marginTop: 22 }}>What stood out?</div>
    <ChipWrap>
      {STOOD_OUT.map(c => (
        <FChip key={c} label={c} active={s.chips.includes(c)}
          onClick={() => set({ chips: s.chips.includes(c) ? s.chips.filter(x => x !== c) : [...s.chips, c] })} />
      ))}
    </ChipWrap>

    <div className="fk-actions">
      <BigBtn onClick={next} disabled={s.chips.length === 0} icon="arrowRight">Continue</BigBtn>
      {s.chips.length === 0 && <p className="fk-hint">Select at least one to continue</p>}
    </div>
  </ScreenCard>
);

/* ===== SCREEN 3 — Review details collection ===== */
const PosDetails = ({ s, set, next, back }) => {
  const [svcOpen, setSvcOpen] = useStatePF(false);
  return (
    <ScreenCard>
      <StepLabel step={1} total={4} label="A little more detail" />
      <h1 className="fk-h1">Add a little more detail</h1>
      <p className="fk-sub">Optional, but it makes your review more helpful and specific. Skip anything you'd rather not answer.</p>

      <div className="fk-stack">
        <div>
          <div className="fk-field-label">Service received</div>
          <div style={{ position: "relative" }}>
            <button onClick={() => setSvcOpen(o => !o)} className="fk-select">
              <span style={{ color: s.service ? "var(--ink-900)" : "var(--ink-400)" }}>{s.service || "Choose a service (optional)"}</span>
              <Icon name="chevDown" size={17} style={{ color: "var(--ink-400)", transform: svcOpen ? "rotate(180deg)" : "none", transition: "transform .15s" }} />
            </button>
            {svcOpen && (
              <div className="fk-menu">
                {SERVICES.map(sv => (
                  <button key={sv} onClick={() => { set({ service: sv }); setSvcOpen(false); }} className="fk-menu-item" data-active={s.service === sv}>
                    {sv}{s.service === sv && <Icon name="check" size={15} style={{ color: "var(--accent)" }} />}
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>

        <div>
          <div className="fk-field-label">Who helped you? <span className="fk-opt">Optional</span></div>
          <input className="fk-input" placeholder="e.g. Jordan, the design team…" value={s.helper} onChange={e => set({ helper: e.target.value })} />
        </div>

        <div>
          <div className="fk-field-label">Anything else you'd like to mention? <span className="fk-opt">Optional</span></div>
          <textarea className="fk-textarea" rows={3} placeholder="A detail or moment that made it great…" value={s.extra} onChange={e => set({ extra: e.target.value })} />
        </div>
      </div>

      <div className="fk-actions fk-actions-row">
        <BigBtn variant="secondary" full={false} onClick={back} style={{ flex: "none", minWidth: 52, padding: 0, width: 52 }}><Icon name="arrowRight" size={18} style={{ transform: "rotate(180deg)" }} /></BigBtn>
        <BigBtn onClick={next} icon="sparkle">Write my review</BigBtn>
      </div>
    </ScreenCard>
  );
};

/* ===== SCREEN 4 — AI review generation ===== */
const TONE_ACTIONS = [
  { key: "regen", label: "Regenerate", icon: "refresh" },
  { key: "shorter", label: "Make Shorter", icon: "arrowUp" },
  { key: "longer", label: "Make Longer", icon: "arrowDown" },
  { key: "casual", label: "More Casual", icon: "chat" },
  { key: "professional", label: "More Professional", icon: "award" },
];
const PosReview = ({ s, set, next, back }) => {
  const [loading, setLoading] = useStatePF(true);
  const [tab, setTab] = useStatePF("detailed");
  const [tone, setTone] = useStatePF("balanced");
  const [busy, setBusy] = useStatePF(null);

  const regenerate = (variant = tab, t = tone) => set({
    reviewShort: buildReview(s, "short", t),
    reviewLong: buildReview(s, "detailed", t),
  });

  useEffectPF(() => { const id = setTimeout(() => { regenerate(); setLoading(false); }, 1400); return () => clearTimeout(id); }, []);

  const current = tab === "short" ? s.reviewShort : s.reviewLong;
  const setCurrent = (v) => set(tab === "short" ? { reviewShort: v } : { reviewLong: v });

  const doAction = (key) => {
    setBusy(key);
    setTimeout(() => {
      if (key === "regen") regenerate();
      else if (key === "casual") { setTone("casual"); set({ reviewShort: buildReview(s, "short", "casual"), reviewLong: buildReview(s, "detailed", "casual") }); }
      else if (key === "professional") { setTone("professional"); set({ reviewShort: buildReview(s, "short", "professional"), reviewLong: buildReview(s, "detailed", "professional") }); }
      else if (key === "shorter") setTab("short");
      else if (key === "longer") setTab("detailed");
      setBusy(null);
    }, key === "shorter" || key === "longer" ? 120 : 800);
  };

  const missingService = !s.service;

  if (loading) return <ScreenCard><StepLabel step={2} total={4} label="Your review" /><AiThinking /></ScreenCard>;

  return (
    <ScreenCard>
      <StepLabel step={2} total={4} label="Your review is ready" />
      <h1 className="fk-h1">Your review is ready <Icon name="sparkle" size={22} style={{ color: "var(--accent-strong)", verticalAlign: "-3px" }} /></h1>
      <p className="fk-sub">Edit it freely so it sounds like you. This is a draft to make writing easier — not a script.</p>

      {/* tabs */}
      <div className="fk-tabs" style={{ marginTop: 18 }}>
        {[["short", "Short"], ["detailed", "Detailed"]].map(([k, l]) => (
          <button key={k} className="fk-tab" data-active={tab === k} onClick={() => setTab(k)}>{l}</button>
        ))}
      </div>

      {/* review card (editable) */}
      <div className="fk-review-card" style={{ opacity: busy && busy !== "shorter" && busy !== "longer" ? .5 : 1, transition: "opacity .2s" }}>
        <div className="fk-review-head">
          <Avatar name="You" size={30} />
          <div style={{ display: "flex", flexDirection: "column" }}>
            <span style={{ fontSize: 13, fontWeight: 620 }}>Your review</span>
            <Stars value={s.rating} size={12} />
          </div>
          <span className="badge badge-accent" style={{ marginLeft: "auto" }}><Icon name="sparkle" size={11} />AI draft</span>
        </div>
        <textarea className="fk-review-text" value={current} onChange={e => setCurrent(e.target.value)} rows={tab === "short" ? 4 : 8} />
      </div>

      {missingService && (
        <div className="fk-tip">
          <Icon name="lightbulb" size={15} style={{ color: "var(--warning)", flex: "none", marginTop: 1 }} />
          <span>Add the service you received to make this review more specific and helpful.</span>
        </div>
      )}

      {/* tone/length actions */}
      <div style={{ display: "flex", flexWrap: "wrap", gap: 8, marginTop: 16 }}>
        {TONE_ACTIONS.map(a => (
          <ActionPill key={a.key} icon={busy === a.key ? "refresh" : a.icon} onClick={() => doAction(a.key)}
            active={(a.key === "casual" && tone === "casual") || (a.key === "professional" && tone === "professional")}>
            {busy === a.key ? "Working…" : a.label}
          </ActionPill>
        ))}
      </div>

      <div className="fk-notice">
        <Icon name="info" size={15} style={{ flex: "none", marginTop: 1 }} />
        <span>Please make sure this reflects your real experience before posting.</span>
      </div>

      <div className="fk-actions fk-actions-row">
        <BigBtn variant="secondary" full={false} onClick={back} style={{ flex: "none", minWidth: 52, padding: 0, width: 52 }}><Icon name="arrowRight" size={18} style={{ transform: "rotate(180deg)" }} /></BigBtn>
        <BigBtn onClick={next} icon="check">Looks good</BigBtn>
      </div>
    </ScreenCard>
  );
};

/* ===== SCREEN 5 — Accuracy confirmation ===== */
const PosConfirm = ({ s, next, back }) => {
  const final = s.reviewLong;
  return (
    <ScreenCard>
      <StepLabel step={3} total={4} label="Almost done" />
      <h1 className="fk-h1">Does this reflect your experience?</h1>
      <p className="fk-sub">Take one last look. You can still edit it, and nothing is posted until you choose where.</p>

      <div className="fk-review-card fk-review-static">
        <div className="fk-review-head">
          <Avatar name="You" size={30} />
          <div><span style={{ fontSize: 13, fontWeight: 620 }}>Your review</span><div><Stars value={s.rating} size={12} /></div></div>
        </div>
        <p className="fk-review-final">{final}</p>
      </div>

      <div className="fk-actions fk-stack">
        <BigBtn onClick={next} icon="copy">Yes, copy my review</BigBtn>
        <BigBtn variant="ghost" onClick={back}>Edit review</BigBtn>
      </div>
    </ScreenCard>
  );
};

/* ===== SCREEN 6 — Copied celebration ===== */
const PosCelebrate = ({ s, restart }) => {
  const [copied, setCopied] = useStatePF(true);
  const fire = true;
  const safeCopy = () => {
    try {
      if (navigator.clipboard && document.hasFocus()) {
        navigator.clipboard.writeText(s.reviewLong).catch(() => {});
      }
    } catch (e) {}
  };
  useEffectPF(() => { safeCopy(); }, []);
  const recopy = () => { safeCopy(); setCopied(false); setTimeout(() => setCopied(true), 60); };

  const preferred = DESTINATIONS.find(d => d.preferred);
  const others = DESTINATIONS.filter(d => !d.preferred);

  return (
    <ScreenCard>
      <div style={{ position: "relative", textAlign: "center", paddingTop: 8 }}>
        <Confetti fire={fire} />
        <SuccessCheck tone="accent" />
        <h1 className="fk-h1" style={{ textAlign: "center", marginTop: 18 }}>Review copied!</h1>
        <p className="fk-sub" style={{ textAlign: "center", margin: "8px auto 0", maxWidth: 360 }}>You're one click away from helping {BIZ.name}. Just paste it when you land on the site below.</p>

        <button onClick={recopy} className="fk-copied-pill">
          <Icon name={copied ? "check" : "copy"} size={14} />{copied ? "Copied to clipboard" : "Copy again"}
        </button>
      </div>

      {/* preferred destination — larger */}
      <a href="#" onClick={e => e.preventDefault()} className="fk-dest-primary" style={{ marginTop: 24 }}>
        <span className="fk-dest-glyph" style={{ background: preferred.color }}>{preferred.glyph}</span>
        <span style={{ flex: 1, textAlign: "left" }}>
          <span style={{ display: "block", fontSize: 15.5, fontWeight: 660 }}>Leave review on {preferred.label}</span>
          <span style={{ display: "block", fontSize: 12.5, color: "var(--ink-400)" }}>Recommended · opens in a new tab</span>
        </span>
        <Icon name="external" size={18} style={{ color: "var(--ink-400)" }} />
      </a>

      <div className="fk-dest-grid">
        {others.map(d => (
          <a key={d.id} href="#" onClick={e => e.preventDefault()} className="fk-dest-other">
            <span className="fk-dest-glyph sm" style={{ background: d.color }}>{d.glyph}</span>
            <span style={{ fontSize: 13.5, fontWeight: 580 }}>{d.label}</span>
            <Icon name="external" size={15} style={{ color: "var(--ink-300)", marginLeft: "auto" }} />
          </a>
        ))}
      </div>

      <p className="fk-hint" style={{ textAlign: "center", marginTop: 18 }}>Your review has already been copied — just paste &amp; post.</p>
      <button onClick={restart} className="fk-restart">Start over</button>
    </ScreenCard>
  );
};

Object.assign(window, { PosIntro, PosDetails, PosReview, PosConfirm, PosCelebrate });
