/* WeHearYou — marketing landing page.
   Built on the WeHearYou design system tokens (styles.css). Reuses the shared
   <Icon/> primitive. Light, premium SaaS aesthetic; one accent; lots of air. */

const { useState: useStateLP, useEffect: useEffectLP, useRef: useRefLP } = React;

/* ---------- scroll reveal hook ---------- */
const useReveal = () => {
  useEffectLP(() => {
    const els = Array.from(document.querySelectorAll("[data-reveal]"));
    // Progressive enhancement: only NOW do we let elements hide. If JS never ran,
    // the base CSS keeps everything visible.
    document.documentElement.classList.add("js-reveal");

    const reduce = matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (reduce || !("IntersectionObserver" in window)) {
      els.forEach(e => e.classList.add("in")); return;
    }

    // Immediate pass: reveal anything already in (or near) the viewport on load,
    // without waiting for an async IO callback.
    const revealIfVisible = (e) => {
      const r = e.getBoundingClientRect();
      if (r.top < (window.innerHeight || 0) * 1.05 && r.bottom > 0) { e.classList.add("in"); return true; }
      return false;
    };
    els.forEach(revealIfVisible);

    const io = new IntersectionObserver((entries) => {
      entries.forEach(e => { if (e.isIntersecting) { e.target.classList.add("in"); io.unobserve(e.target); } });
    }, { threshold: 0.12, rootMargin: "0px 0px -6% 0px" });
    els.forEach(e => { if (!e.classList.contains("in")) io.observe(e); });

    // Failsafe: nothing should ever stay hidden if the observer misbehaves.
    const failsafe = setTimeout(() => els.forEach(e => e.classList.add("in")), 1400);
    return () => { io.disconnect(); clearTimeout(failsafe); };
  }, []);
};

/* ---------- Wordmark ---------- */
const Wordmark = ({ onClick }) => (
  <a href="#top" onClick={onClick} style={{ display: "inline-flex", alignItems: "center", gap: 9 }}>
    <span style={{ width: 30, height: 30, borderRadius: 9, flex: "none", display: "grid", placeItems: "center", background: "var(--accent)", color: "#fff", boxShadow: "var(--shadow-sm)" }}>
      <svg viewBox="0 0 24 24" width="17" height="17" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M4 6c2.5-2 6-2 8 0s5.5 2 8 0" /><path d="M4 12c2.5-2 6-2 8 0s5.5 2 8 0" opacity=".8" /><path d="M4 18c2.5-2 6-2 8 0s5.5 2 8 0" opacity=".55" />
      </svg>
    </span>
    <span style={{ fontWeight: 680, fontSize: 17, letterSpacing: "-.02em" }}>WeHearYou</span>
  </a>
);

/* ---------- Navigation ---------- */
const NAV_LINKS = [["Product", "#product"], ["Use Cases", "#usecases"], ["Pricing", "#pricing"], ["About", "#about"]];

const Nav = () => {
  const [scrolled, setScrolled] = useStateLP(false);
  const [open, setOpen] = useStateLP(false);
  useEffectLP(() => {
    const h = () => setScrolled(window.scrollY > 8);
    h(); window.addEventListener("scroll", h, { passive: true });
    return () => window.removeEventListener("scroll", h);
  }, []);
  useEffectLP(() => { document.body.style.overflow = open ? "hidden" : ""; }, [open]);
  const close = () => setOpen(false);

  return (
    <header style={{ position: "sticky", top: 0, zIndex: 60, transition: "border-color .2s, background .2s",
      borderBottom: `1px solid ${scrolled ? "var(--ink-200)" : "transparent"}`,
      background: scrolled ? "color-mix(in srgb, var(--white) 82%, transparent)" : "transparent",
      backdropFilter: scrolled ? "blur(10px)" : "none" }}>
      <div className="lp-container" style={{ height: 64, display: "flex", alignItems: "center", gap: 20 }}>
        <Wordmark onClick={close} />
        <nav className="lp-nav-links" style={{ display: "flex", alignItems: "center", gap: 4, marginLeft: 8 }}>
          {NAV_LINKS.map(([l, h]) => (
            <a key={l} href={h} className="lp-navlink">{l}</a>
          ))}
        </nav>
        <div className="lp-nav-cta" style={{ marginLeft: "auto", display: "flex", alignItems: "center", gap: 10 }}>
          <a href="#" className="btn btn-ghost">Sign in</a>
          <a href="#cta" className="btn btn-primary">Request a demo</a>
        </div>
        <button className="lp-burger btn btn-ghost btn-icon" aria-label="Menu" onClick={() => setOpen(o => !o)} style={{ marginLeft: "auto" }}>
          <Icon name={open ? "close" : "sliders"} size={20} />
        </button>
      </div>

      {/* mobile sheet */}
      {open && (
        <div className="lp-mobile-sheet" onClick={close}>
          <div className="lp-mobile-panel" onClick={e => e.stopPropagation()}>
            {NAV_LINKS.map(([l, h]) => <a key={l} href={h} onClick={close} className="lp-mobile-link">{l}</a>)}
            <div style={{ height: 1, background: "var(--ink-200)", margin: "8px 0" }} />
            <a href="#" onClick={close} className="btn btn-secondary" style={{ width: "100%", height: 44 }}>Sign in</a>
            <a href="#cta" onClick={close} className="btn btn-primary" style={{ width: "100%", height: 44, marginTop: 8 }}>Request a demo</a>
          </div>
        </div>
      )}
    </header>
  );
};

/* ---------- Hero ---------- */
const Hero = () => (
  <section id="top" style={{ position: "relative", overflow: "hidden" }}>
    <div className="lp-hero-glow" aria-hidden="true" />
    <div className="lp-container" style={{ paddingTop: 84, paddingBottom: 72, position: "relative" }}>
      <div className="lp-hero-grid">
        <div data-reveal>
          <a href="#product" className="lp-pill">
            <span className="badge badge-accent" style={{ height: 18, padding: "0 7px", fontSize: 10.5 }}>New</span>
            Themes now surface across every channel
            <Icon name="arrowRight" size={13} />
          </a>
          <h1 className="lp-h1">Know what your users are <span className="lp-hl">really</span> trying to tell you</h1>
          <p className="lp-lede">
            WeHearYou brings feedback from your users, your team, and your conversations into one clear place —
            so you can spot patterns, prioritize what matters, and respond with confidence.
          </p>
          <div style={{ display: "flex", gap: 12, flexWrap: "wrap", marginTop: 30 }}>
            <a href="#cta" className="btn btn-primary lp-btn-lg">Get started<Icon name="arrowRight" size={17} /></a>
            <a href="#product" className="btn btn-secondary lp-btn-lg">See how it works</a>
          </div>
          <div className="lp-trust">
            <div className="lp-avatars">
              {["Mara Lopez", "Devin Park", "Aisha Bello", "Tom Reuss"].map((n, i) => (
                <span key={n} style={{ marginLeft: i ? -8 : 0, zIndex: 4 - i }}><Avatar name={n} size={28} /></span>
              ))}
            </div>
            <div>
              <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                <Stars value={5} size={14} />
                <span style={{ fontSize: 13, fontWeight: 600 }}>4.9/5</span>
              </div>
              <div style={{ fontSize: 12.5, color: "var(--ink-500)" }}>from 600+ product &amp; support teams</div>
            </div>
          </div>
        </div>

        <div data-reveal className="lp-hero-art">
          <HeroInbox />
        </div>
      </div>
    </div>
  </section>
);

/* compact feedback inbox shown in hero */
const HERO_ITEMS = [
  { name: "Priya A.", src: "google", txt: "Onboarding was confusing — took me three tries to connect our data.", tag: "Onboarding", tone: "warning", t: "2m" },
  { name: "Marcus W.", src: "trustpilot", txt: "Theme detection is a game changer. We caught a billing issue early.", tag: "Billing", tone: "success", t: "18m" },
  { name: "Lena F.", src: "facebook", txt: "Wish there was a Slack integration for new feedback alerts.", tag: "Integrations", tone: "accent", t: "1h" },
];
const SRC_COLOR = { google: "var(--src-google)", facebook: "var(--src-facebook)", yelp: "var(--src-yelp)", trustpilot: "var(--src-trustpilot)" };
const HeroInbox = () => (
  <div className="card lp-floatcard" style={{ padding: 0, overflow: "hidden" }}>
    <div style={{ display: "flex", alignItems: "center", gap: 9, padding: "13px 16px", borderBottom: "1px solid var(--ink-150)" }}>
      <Icon name="inbox" size={16} style={{ color: "var(--accent-strong)" }} />
      <span style={{ fontSize: 13, fontWeight: 600 }}>Feedback inbox</span>
      <span className="badge badge-neutral" style={{ marginLeft: "auto" }}>Live</span>
    </div>
    <div>
      {HERO_ITEMS.map((it, i) => (
        <div key={i} style={{ display: "flex", gap: 11, padding: "13px 16px", borderTop: i ? "1px solid var(--ink-150)" : "none" }}>
          <span style={{ position: "relative", flex: "none" }}>
            <Avatar name={it.name} size={32} />
            <span style={{ position: "absolute", right: -2, bottom: -2, width: 12, height: 12, borderRadius: "50%", background: SRC_COLOR[it.src], border: "2px solid var(--white)" }} />
          </span>
          <div style={{ minWidth: 0, flex: 1 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 7 }}>
              <span style={{ fontSize: 12.5, fontWeight: 600 }}>{it.name}</span>
              <span style={{ fontSize: 11, color: "var(--ink-400)", marginLeft: "auto" }}>{it.t}</span>
            </div>
            <p style={{ fontSize: 12.5, color: "var(--ink-600)", lineHeight: 1.5, margin: "3px 0 7px", textWrap: "pretty" }}>{it.txt}</p>
            <span className={"badge badge-" + it.tone} style={{ height: 19 }}><Icon name="tag" size={10} />{it.tag}</span>
          </div>
        </div>
      ))}
    </div>
  </div>
);

/* ---------- Logo strip ---------- */
const LogoStrip = () => (
  <section className="lp-container" style={{ paddingTop: 8, paddingBottom: 48 }}>
    <p data-reveal style={{ textAlign: "center", fontSize: 12.5, color: "var(--ink-400)", fontWeight: 540, letterSpacing: ".03em", marginBottom: 22 }}>
      Trusted by modern product and support teams
    </p>
    <div data-reveal className="lp-logos">
      {["Northwind", "Cedar", "Lumen", "Fathom", "Outset", "Verra"].map(n => (
        <span key={n} className="lp-logo">{n}</span>
      ))}
    </div>
  </section>
);

/* ---------- Product preview (big dashboard mock) ---------- */
const THEMES = [
  { name: "Onboarding friction", count: 38, trend: +24, tone: "warning" },
  { name: "Billing clarity", count: 27, trend: +11, tone: "danger" },
  { name: "Slack integration", count: 19, trend: +52, tone: "accent" },
  { name: "Mobile performance", count: 14, trend: -8, tone: "success" },
];
const ProductPreview = () => (
  <section id="product" className="lp-section">
    <div className="lp-container">
      <div data-reveal className="lp-sec-head">
        <span className="lp-eyebrow">The product</span>
        <h2 className="lp-h2">Everything you hear, in one calm view</h2>
        <p className="lp-sec-sub">Feedback lands in a single inbox, gets tagged by theme and sentiment automatically, and rolls up into the signals your team actually needs to make a call.</p>
      </div>

      <div data-reveal className="lp-dash card">
        {/* top bar */}
        <div className="lp-dash-bar">
          <div style={{ display: "flex", gap: 6 }}>
            <span className="lp-dot" style={{ background: "#ef6a5a" }} /><span className="lp-dot" style={{ background: "#f3c14a" }} /><span className="lp-dot" style={{ background: "#54c06e" }} />
          </div>
          <div className="lp-dash-url">app.wehearyou.app/inbox</div>
        </div>
        <div className="lp-dash-body">
          {/* left: inbox */}
          <div className="lp-dash-inbox">
            <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 14 }}>
              <span style={{ fontSize: 13.5, fontWeight: 660 }}>Inbox</span>
              <span className="badge badge-accent" style={{ height: 19 }}>98 new</span>
              <span className="lp-seg" style={{ marginLeft: "auto" }}>
                <span data-active="true">All</span><span>Unread</span><span>Mine</span>
              </span>
            </div>
            {[
              { n: "Sara Mendel", s: "google", st: 5, q: "The new dashboard is so much clearer. Found our top issue in minutes.", tag: "Insights", tone: "success", t: "just now" },
              { n: "Dani Okafor", s: "trustpilot", st: 2, q: "Billing page double-charged me and support took two days to reply.", tag: "Billing", tone: "danger", t: "12m" },
              { n: "Jordan Avery", s: "facebook", st: 4, q: "Love it, but I really need a Slack alert when new feedback comes in.", tag: "Integrations", tone: "accent", t: "40m" },
              { n: "Rosa Iglesias", s: "yelp", st: 3, q: "Setup took longer than expected. The data connection step is confusing.", tag: "Onboarding", tone: "warning", t: "1h" },
            ].map((it, i) => (
              <div key={i} className="lp-inbox-row">
                <span style={{ position: "relative", flex: "none" }}>
                  <Avatar name={it.n} size={34} />
                  <span style={{ position: "absolute", right: -2, bottom: -2, width: 12, height: 12, borderRadius: "50%", background: SRC_COLOR[it.s], border: "2px solid var(--white)" }} />
                </span>
                <div style={{ minWidth: 0, flex: 1 }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                    <span style={{ fontSize: 12.8, fontWeight: 600 }}>{it.n}</span>
                    <Stars value={it.st} size={11} />
                    <span style={{ fontSize: 11, color: "var(--ink-400)", marginLeft: "auto" }}>{it.t}</span>
                  </div>
                  <p style={{ fontSize: 12.6, color: "var(--ink-600)", lineHeight: 1.5, margin: "3px 0 7px", textWrap: "pretty" }}>{it.q}</p>
                  <span className={"badge badge-" + it.tone} style={{ height: 19 }}><Icon name="tag" size={10} />{it.tag}</span>
                </div>
              </div>
            ))}
          </div>

          {/* right: signals */}
          <div className="lp-dash-side">
            <div className="lp-side-card">
              <div className="lp-side-head"><Icon name="layers" size={14} style={{ color: "var(--accent-strong)" }} />Trending themes</div>
              {THEMES.map(t => (
                <div key={t.name} className="lp-theme-row">
                  <span style={{ fontSize: 12.5, fontWeight: 540, flex: 1, minWidth: 0, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{t.name}</span>
                  <span className="tnum" style={{ fontSize: 12, color: "var(--ink-500)" }}>{t.count}</span>
                  <span className="tnum" style={{ fontSize: 11, fontWeight: 600, width: 40, textAlign: "right", color: t.trend >= 0 ? "var(--success)" : "var(--danger)" }}>
                    {t.trend >= 0 ? "+" : ""}{t.trend}%
                  </span>
                </div>
              ))}
            </div>

            <div className="lp-side-card">
              <div className="lp-side-head"><Icon name="bolt" size={14} style={{ color: "var(--accent-strong)" }} />Priority score</div>
              <div style={{ display: "flex", alignItems: "baseline", gap: 8 }}>
                <span className="tnum" style={{ fontSize: 30, fontWeight: 700, letterSpacing: "-.03em" }}>92</span>
                <span className="badge badge-danger" style={{ height: 19 }}>Act now</span>
              </div>
              <p style={{ fontSize: 11.8, color: "var(--ink-500)", lineHeight: 1.5, marginTop: 7 }}>Billing clarity is rising fast across 3 channels and tied to churn risk.</p>
              <div style={{ display: "flex", gap: 7, marginTop: 12 }}>
                <span className="btn btn-primary btn-sm" style={{ flex: 1 }}>Create action</span>
                <span className="btn btn-secondary btn-sm btn-icon"><Icon name="reply" size={14} /></span>
              </div>
            </div>

            <div className="lp-side-card">
              <div className="lp-side-head"><Icon name="chat" size={14} style={{ color: "var(--accent-strong)" }} />Team note</div>
              <div style={{ display: "flex", gap: 9 }}>
                <Avatar name="Devin Park" size={26} />
                <p style={{ fontSize: 12, color: "var(--ink-600)", lineHeight: 1.5 }}><b style={{ color: "var(--ink-800)" }}>Devin</b> looped in payments — fix shipping Thursday.</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  </section>
);

/* ---------- Problem ---------- */
const PROBLEMS = [
  { icon: "layers", title: "Feedback scattered everywhere", txt: "Reviews, tickets, calls, DMs, and surveys all live in different tools. No one sees the whole picture." },
  { icon: "eye", title: "Repeated signals slip by", txt: "The same issue shows up ten times across channels — but no single person notices the pattern." },
  { icon: "megaphone", title: "Roadmaps follow the loudest voice", txt: "Without weighting, the squeakiest request wins instead of what most users actually need." },
  { icon: "refresh", title: "No loop from feedback to action", txt: "People share their thoughts and hear nothing back. Trust quietly erodes over time." },
];
const Problem = () => (
  <section className="lp-section lp-section-tint">
    <div className="lp-container">
      <div data-reveal className="lp-sec-head">
        <span className="lp-eyebrow">The problem</span>
        <h2 className="lp-h2">Listening shouldn't be this hard</h2>
        <p className="lp-sec-sub">Most teams are drowning in feedback and starving for clarity. The signal is there — it's just buried.</p>
      </div>
      <div className="lp-prob-grid">
        {PROBLEMS.map((p, i) => (
          <div key={p.title} data-reveal style={{ transitionDelay: `${i * 60}ms` }} className="lp-prob-card">
            <span className="lp-prob-ic"><Icon name={p.icon} size={19} /></span>
            <h3 style={{ fontSize: 15, fontWeight: 640, letterSpacing: "-.01em" }}>{p.title}</h3>
            <p style={{ fontSize: 13.3, color: "var(--ink-500)", lineHeight: 1.55, marginTop: 6, textWrap: "pretty" }}>{p.txt}</p>
          </div>
        ))}
      </div>
    </div>
  </section>
);

/* ---------- Features ---------- */
const FEATURES = [
  { icon: "inbox", title: "Unified feedback inbox", txt: "Pull reviews, support tickets, surveys, and call notes into one stream your whole team can see." },
  { icon: "layers", title: "Theme detection", txt: "Feedback is grouped into clear themes automatically, so recurring issues surface on their own." },
  { icon: "bolt", title: "Prioritization signals", txt: "Each theme gets a priority score from volume, sentiment, and revenue — not just who shouted loudest." },
  { icon: "users", title: "Team collaboration", txt: "Assign, comment, and tag teammates. Decisions and context live next to the feedback itself." },
  { icon: "reply", title: "Close-the-loop responses", txt: "Reply in-app or draft a public response, and let customers know their feedback led somewhere." },
  { icon: "chart", title: "Insights dashboard", txt: "Track sentiment, themes, and resolution over time — ready to share in your next planning meeting." },
];
const Features = () => (
  <section className="lp-section">
    <div className="lp-container">
      <div data-reveal className="lp-sec-head">
        <span className="lp-eyebrow">What you get</span>
        <h2 className="lp-h2">From scattered feedback to confident decisions</h2>
        <p className="lp-sec-sub">Six things working together to turn raw input into a roadmap you can defend.</p>
      </div>
      <div className="lp-feat-grid">
        {FEATURES.map((f, i) => (
          <div key={f.title} data-reveal style={{ transitionDelay: `${(i % 3) * 60}ms` }} className="lp-feat-card">
            <span className="lp-feat-ic"><Icon name={f.icon} size={20} /></span>
            <h3 style={{ fontSize: 15.5, fontWeight: 640, letterSpacing: "-.01em", marginTop: 16 }}>{f.title}</h3>
            <p style={{ fontSize: 13.4, color: "var(--ink-500)", lineHeight: 1.58, marginTop: 7, textWrap: "pretty" }}>{f.txt}</p>
          </div>
        ))}
      </div>
    </div>
  </section>
);

/* ---------- Use cases ---------- */
const USECASES = [
  { tag: "Product teams", title: "Prioritize the roadmap with evidence", txt: "Walk into planning with themes ranked by real demand and sentiment — not gut feel or the last loud email.", icon: "grid", points: ["Theme-level priority scores", "Tie feedback to revenue", "Share read-only insight links"] },
  { tag: "Founders", title: "Understand your earliest customers", txt: "See what every early user is telling you, spot what's working, and decide what to build next with a clear head.", icon: "heart", points: ["One inbox for everything", "Weekly sentiment digest", "Catch churn signals early"] },
  { tag: "Support teams", title: "Surface recurring issues fast", txt: "Stop re-discovering the same problem. WeHearYou clusters tickets so you can escalate patterns, not one-offs.", icon: "inbox", points: ["Auto-grouped tickets", "Escalate by volume", "Loop product in with context"] },
  { tag: "Communities", title: "Listen at scale, stay human", txt: "Hear thousands of members without losing the individual voice. Respond where it matters most.", icon: "users", points: ["Multi-channel capture", "Sentiment at a glance", "Close the loop publicly"] },
];
const UseCases = () => {
  const [active, setActive] = useStateLP(0);
  const uc = USECASES[active];
  return (
    <section id="usecases" className="lp-section lp-section-tint">
      <div className="lp-container">
        <div data-reveal className="lp-sec-head">
          <span className="lp-eyebrow">Use cases</span>
          <h2 className="lp-h2">Built for everyone who needs to listen</h2>
        </div>
        <div data-reveal className="lp-uc">
          <div className="lp-uc-tabs">
            {USECASES.map((u, i) => (
              <button key={u.tag} className="lp-uc-tab" data-active={active === i} onClick={() => setActive(i)}>
                <span className="lp-uc-tabic"><Icon name={u.icon} size={17} /></span>
                <span>{u.tag}</span>
                <Icon name="chevRight" size={15} style={{ marginLeft: "auto", opacity: active === i ? 1 : .3 }} />
              </button>
            ))}
          </div>
          <div className="lp-uc-panel card" key={active}>
            <span className="badge badge-accent" style={{ marginBottom: 14 }}>{uc.tag}</span>
            <h3 style={{ fontSize: 22, fontWeight: 680, letterSpacing: "-.02em", textWrap: "balance" }}>{uc.title}</h3>
            <p style={{ fontSize: 14.5, color: "var(--ink-500)", lineHeight: 1.6, marginTop: 12, maxWidth: 460, textWrap: "pretty" }}>{uc.txt}</p>
            <ul className="lp-uc-points">
              {uc.points.map(p => (
                <li key={p}><span className="lp-check"><Icon name="check" size={12} /></span>{p}</li>
              ))}
            </ul>
            <a href="#cta" className="btn btn-soft" style={{ marginTop: 22 }}>Explore for {uc.tag.toLowerCase()}<Icon name="arrowRight" size={15} /></a>
          </div>
        </div>
      </div>
    </section>
  );
};

/* ---------- Testimonials ---------- */
const QUOTES = [
  { q: "We used to argue about what to build next. Now we open WeHearYou, look at the top themes, and the conversation is basically over.", n: "Mara Lopez", r: "Head of Product, Cedar", st: 5 },
  { q: "It caught a billing complaint trending across three channels before it ever hit our churn numbers. That alone paid for the year.", n: "Devin Park", r: "Founder, Outset", st: 5 },
  { q: "Support finally feels heard by product. We escalate patterns with real evidence instead of forwarding angry emails.", n: "Aisha Bello", r: "Support Lead, Lumen", st: 5 },
];
const Testimonials = () => (
  <section className="lp-section">
    <div className="lp-container">
      <div data-reveal className="lp-sec-head">
        <span className="lp-eyebrow">Loved by teams</span>
        <h2 className="lp-h2">Calmer decisions, happier customers</h2>
      </div>
      <div className="lp-quote-grid">
        {QUOTES.map((t, i) => (
          <figure key={t.n} data-reveal style={{ transitionDelay: `${i * 70}ms` }} className="lp-quote card">
            <Stars value={t.st} size={15} />
            <blockquote style={{ fontSize: 14.8, lineHeight: 1.6, color: "var(--ink-700)", margin: "14px 0 18px", textWrap: "pretty" }}>“{t.q}”</blockquote>
            <figcaption style={{ display: "flex", alignItems: "center", gap: 11, marginTop: "auto" }}>
              <Avatar name={t.n} size={38} />
              <div>
                <div style={{ fontSize: 13.3, fontWeight: 620 }}>{t.n}</div>
                <div style={{ fontSize: 12, color: "var(--ink-500)" }}>{t.r}</div>
              </div>
            </figcaption>
          </figure>
        ))}
      </div>
    </div>
  </section>
);

/* ---------- Pricing teaser ---------- */
const TIERS = [
  { name: "Free", price: "$0", unit: "forever", desc: "For solo founders finding their first signal.", feats: ["1 feedback channel", "Up to 200 items / mo", "Theme detection", "Weekly digest"], cta: "Start free", primary: false },
  { name: "Team", price: "$49", unit: "per month", desc: "For product & support teams that listen daily.", feats: ["Unlimited channels", "Priority scoring", "Team collaboration", "Close-the-loop replies", "Insights dashboard"], cta: "Start 14-day trial", primary: true, badge: "Most popular" },
  { name: "Scale", price: "Let's talk", unit: "custom", desc: "For larger teams with security needs.", feats: ["SSO & SAML", "Advanced roles", "API & webhooks", "Dedicated support"], cta: "Contact sales", primary: false },
];
const Pricing = () => (
  <section id="pricing" className="lp-section lp-section-tint">
    <div className="lp-container">
      <div data-reveal className="lp-sec-head">
        <span className="lp-eyebrow">Pricing</span>
        <h2 className="lp-h2">Start free, grow with your team</h2>
        <p className="lp-sec-sub">No credit card to begin. Upgrade when listening becomes a team sport.</p>
      </div>
      <div className="lp-price-grid">
        {TIERS.map((t, i) => (
          <div key={t.name} data-reveal style={{ transitionDelay: `${i * 60}ms` }} className={"lp-price card" + (t.primary ? " lp-price-hot" : "")}>
            {t.badge && <span className="lp-price-badge">{t.badge}</span>}
            <div style={{ fontSize: 14, fontWeight: 640 }}>{t.name}</div>
            <div style={{ display: "flex", alignItems: "baseline", gap: 7, marginTop: 12 }}>
              <span style={{ fontSize: 34, fontWeight: 720, letterSpacing: "-.03em" }}>{t.price}</span>
              <span style={{ fontSize: 13, color: "var(--ink-400)" }}>{t.unit}</span>
            </div>
            <p style={{ fontSize: 13, color: "var(--ink-500)", lineHeight: 1.5, marginTop: 8, minHeight: 38, textWrap: "pretty" }}>{t.desc}</p>
            <a href="#cta" className={"btn " + (t.primary ? "btn-primary" : "btn-secondary")} style={{ width: "100%", marginTop: 4 }}>{t.cta}</a>
            <div style={{ height: 1, background: "var(--ink-150)", margin: "18px 0" }} />
            <ul className="lp-price-feats">
              {t.feats.map(f => <li key={f}><span className="lp-check"><Icon name="check" size={11} /></span>{f}</li>)}
            </ul>
          </div>
        ))}
      </div>
    </div>
  </section>
);

/* ---------- Final CTA ---------- */
const FinalCTA = () => (
  <section id="cta" className="lp-section">
    <div className="lp-container">
      <div data-reveal className="lp-cta">
        <div className="lp-cta-glow" aria-hidden="true" />
        <h2 className="lp-cta-h">Start listening with clarity</h2>
        <p className="lp-cta-sub">Bring every voice into one place and turn feedback into calmer, smarter product decisions — starting today.</p>
        <div style={{ display: "flex", gap: 12, flexWrap: "wrap", justifyContent: "center", marginTop: 28 }}>
          <a href="#" className="btn lp-btn-lg" style={{ background: "#fff", color: "var(--accent-strong)" }}>Get started free<Icon name="arrowRight" size={17} /></a>
          <a href="#" className="btn lp-btn-lg lp-btn-glass">Request a demo</a>
        </div>
        <p style={{ fontSize: 12.5, color: "rgba(255,255,255,.7)", marginTop: 18 }}>Free forever plan · No credit card required</p>
      </div>
    </div>
  </section>
);

/* ---------- Footer ---------- */
const FOOTER = [
  ["Product", ["Overview", "Feedback inbox", "Themes", "Insights", "Pricing"]],
  ["Use cases", ["Product teams", "Founders", "Support", "Communities"]],
  ["Company", ["About", "Careers", "Blog", "Contact"]],
  ["Legal", ["Privacy", "Terms", "Security"]],
];
const Footer = () => (
  <footer id="about" style={{ borderTop: "1px solid var(--ink-200)", background: "var(--white)" }}>
    <div className="lp-container" style={{ paddingTop: 56, paddingBottom: 40 }}>
      <div className="lp-foot-grid">
        <div style={{ maxWidth: 280 }}>
          <Wordmark />
          <p style={{ fontSize: 13, color: "var(--ink-500)", lineHeight: 1.6, marginTop: 14, textWrap: "pretty" }}>
            A clearer way to listen to your users. Bring feedback together, understand it, and act with confidence.
          </p>
        </div>
        <div className="lp-foot-cols">
          {FOOTER.map(([h, items]) => (
            <div key={h}>
              <div style={{ fontSize: 12, fontWeight: 640, color: "var(--ink-800)", marginBottom: 12 }}>{h}</div>
              <ul style={{ listStyle: "none", padding: 0, margin: 0, display: "flex", flexDirection: "column", gap: 9 }}>
                {items.map(it => <li key={it}><a href="#" className="lp-foot-link">{it}</a></li>)}
              </ul>
            </div>
          ))}
        </div>
      </div>
      <div className="lp-foot-bottom">
        <span style={{ fontSize: 12.5, color: "var(--ink-400)" }}>© 2026 WeHearYou, Inc. All rights reserved.</span>
        <div style={{ display: "flex", gap: 14 }}>
          {["Twitter", "LinkedIn", "GitHub"].map(s => <a key={s} href="#" className="lp-foot-link" style={{ fontSize: 12.5 }}>{s}</a>)}
        </div>
      </div>
    </div>
  </footer>
);

/* ---------- Page ---------- */
const Landing = () => {
  useReveal();
  return (
    <div style={{ minHeight: "100%", background: "var(--white)" }}>
      <Nav />
      <main>
        <Hero />
        <LogoStrip />
        <ProductPreview />
        <Problem />
        <Features />
        <UseCases />
        <Testimonials />
        <Pricing />
        <FinalCTA />
      </main>
      <Footer />
    </div>
  );
};

ReactDOM.createRoot(document.getElementById("root")).render(<Landing />);
