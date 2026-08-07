/* WeHearYou — Auth: sign in / sign up.
   Single page; toggles between modes. Built on WeHearYou tokens + <Icon/>.
   Maps cleanly to Auth.js/NextAuth: Google OAuth provider + Credentials. */

const { useState: useStateAU, useEffect: useEffectAU } = React;

const GoogleMark = () => (
  <svg className="au-gmark" viewBox="0 0 24 24" aria-hidden="true">
    <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.27-4.74 3.27-8.1z"/>
    <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84A11 11 0 0 0 12 23z"/>
    <path fill="#FBBC05" d="M5.84 14.1a6.6 6.6 0 0 1 0-4.2V7.06H2.18a11 11 0 0 0 0 9.88l3.66-2.84z"/>
    <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84C6.71 7.31 9.14 5.38 12 5.38z"/>
  </svg>
);

const pwScore = (p) => {
  let s = 0;
  if (p.length >= 8) s++;
  if (/[A-Z]/.test(p) && /[a-z]/.test(p)) s++;
  if (/\d/.test(p)) s++;
  if (/[^A-Za-z0-9]/.test(p)) s++;
  return Math.min(s, 4);
};
const STRENGTH = ["", "Weak", "Fair", "Good", "Strong"];
const STRENGTH_COLOR = ["var(--ink-200)", "var(--danger)", "var(--warning)", "var(--accent)", "var(--success)"];

function AuthApp() {
  const [mode, setMode] = useStateAU("signin"); // signin | signup
  const [show, setShow] = useStateAU(false);
  const [pw, setPw] = useStateAU("");
  const [remember, setRemember] = useStateAU(true);
  const [agree, setAgree] = useStateAU(false);
  const signup = mode === "signup";
  const score = pwScore(pw);

  useEffectAU(() => { document.title = signup ? "WeHearYou — Create account" : "WeHearYou — Sign in"; }, [signup]);

  const switchTo = (m) => { setMode(m); setPw(""); setShow(false); };

  return (
    <div className="au-root">
      {/* ===== Brand panel ===== */}
      <aside className="au-brand">
        <div className="au-brand-grain" />
        <div className="au-logo">
          <span className="au-logo-mark"><Icon name="bolt" size={20} /></span>
          <span className="au-logo-name">WeHearYou</span>
        </div>

        <div className="au-brand-mid">
          <h1 className="au-brand-h">Turn customer feedback into a five-star reputation.</h1>
          <p className="au-brand-sub">Collect reviews, reply with AI assistance, and understand every signal across your locations — all in one calm, clear place.</p>

          <figure className="au-quote">
            <p>"WeHearYou doubled our Google reviews in a quarter and gave the whole team one inbox to act on. It just feels effortless."</p>
            <figcaption className="au-quote-by">
              <span className="au-quote-av">DR</span>
              <span className="au-quote-meta"><b>Dana Reyes</b><span>Marketing Lead, NOVA Advertising</span></span>
            </figcaption>
          </figure>
        </div>

        <div className="au-brand-foot">
          <span><Icon name="shield" size={14} />SOC 2 Type II</span>
          <span><Icon name="lock" size={14} />GDPR ready</span>
          <span><Icon name="star" size={14} />4.9 on G2</span>
        </div>
      </aside>

      {/* ===== Form panel ===== */}
      <main className="au-form-wrap">
        <div className="au-form-top">
          <span>{signup ? "Already have an account?" : "New to WeHearYou?"}</span>
          <button className="au-switch-link" onClick={() => switchTo(signup ? "signin" : "signup")}>{signup ? "Sign in" : "Create an account"}</button>
        </div>

        <div className="au-form" key={mode}>
          <div className="au-mobile-logo">
            <span className="au-logo-mark"><Icon name="bolt" size={19} style={{ color: "#fff" }} /></span>
            <span className="au-logo-name">WeHearYou</span>
          </div>

          <h2 className="au-h1">{signup ? "Create your account" : "Welcome back"}</h2>
          <p className="au-lede">{signup ? "Start collecting and acting on feedback in minutes — no credit card required." : "Sign in to your dashboard to manage reviews, posts, and insights."}</p>

          {/* OAuth */}
          <div className="au-oauth">
            <button className="au-oauth-btn"><GoogleMark />Continue with Google</button>
          </div>

          <div className="au-divider">or {signup ? "sign up" : "sign in"} with email</div>

          {/* fields */}
          <form className="au-fields" onSubmit={e => e.preventDefault()}>
            {signup && (
              <div className="au-row2">
                <div>
                  <label className="au-field-label">First name</label>
                  <div className="au-inwrap"><input className="au-input no-lead" placeholder="Dana" autoComplete="given-name" /></div>
                </div>
                <div>
                  <label className="au-field-label">Last name</label>
                  <div className="au-inwrap"><input className="au-input no-lead" placeholder="Reyes" autoComplete="family-name" /></div>
                </div>
              </div>
            )}

            <div>
              <label className="au-field-label">Work email</label>
              <div className="au-inwrap">
                <Icon name="mail" size={17} className="au-lead-ic" />
                <input className="au-input" type="email" placeholder="you@company.com" autoComplete="email" />
              </div>
            </div>

            <div>
              <label className="au-field-label">
                Password
                {!signup && <button type="button" className="au-forgot">Forgot password?</button>}
              </label>
              <div className="au-inwrap">
                <Icon name="lock" size={17} className="au-lead-ic" />
                <input className="au-input" type={show ? "text" : "password"} value={pw} onChange={e => setPw(e.target.value)}
                  placeholder={signup ? "Create a password" : "Enter your password"} autoComplete={signup ? "new-password" : "current-password"} />
                <button type="button" className="au-eye" onClick={() => setShow(s => !s)} aria-label={show ? "Hide password" : "Show password"}>
                  <Icon name={show ? "eyeOff" : "eye"} size={17} />
                </button>
              </div>
              {signup && pw.length > 0 && (
                <>
                  <div className="au-strength">
                    {[0, 1, 2, 3].map(i => <span key={i} style={{ background: i < score ? STRENGTH_COLOR[score] : "var(--ink-200)" }} />)}
                  </div>
                  <div className="au-strength-label" style={{ color: score >= 3 ? "var(--success)" : "var(--ink-400)" }}>
                    {score > 0 ? `${STRENGTH[score]} password` : "Use 8+ characters with a mix of letters, numbers & symbols"}
                  </div>
                </>
              )}
            </div>

            {signup ? (
              <label className="au-check">
                <input type="checkbox" checked={agree} onChange={e => setAgree(e.target.checked)} />
                <span className="au-check-box">{agree && <Icon name="check" size={13} />}</span>
                <span className="au-check-text">I agree to the <a href="#" onClick={e => e.preventDefault()}>Terms of Service</a> and <a href="#" onClick={e => e.preventDefault()}>Privacy Policy</a>.</span>
              </label>
            ) : (
              <label className="au-check" style={{ marginTop: 4 }}>
                <input type="checkbox" checked={remember} onChange={e => setRemember(e.target.checked)} />
                <span className="au-check-box">{remember && <Icon name="check" size={13} />}</span>
                <span className="au-check-text">Keep me signed in on this device</span>
              </label>
            )}

            <button className="au-submit" type="submit" disabled={signup && !agree} style={signup && !agree ? { opacity: .5, cursor: "not-allowed" } : {}}>
              {signup ? "Create account" : "Sign in"}<Icon name="arrowRight" size={18} />
            </button>
          </form>

          <p className="au-switch-foot">
            {signup ? "Already have an account? " : "Don't have an account? "}
            <button className="au-switch-link" onClick={() => switchTo(signup ? "signin" : "signup")}>{signup ? "Sign in" : "Sign up free"}</button>
          </p>

          {signup && <p className="au-legal">Protected by reCAPTCHA · Your data is encrypted and never sold.</p>}
        </div>
      </main>
    </div>
  );
}

ReactDOM.createRoot(document.getElementById("root")).render(<AuthApp />);
