"use client";

import { useActionState, useState } from "react";
import { Icon } from "@/components/icon";
import { signUp, type SignUpState } from "@/app/signup/actions";

const initialState: SignUpState = {};

const STRENGTH = ["", "Weak", "Fair", "Good", "Strong"];
const STRENGTH_COLOR = ["var(--ink-200)", "var(--danger)", "var(--warning)", "var(--accent)", "var(--success)"];

function pwScore(p: string) {
  let s = 0;
  if (p.length >= 8) s++;
  if (/[A-Z]/.test(p) && /[a-z]/.test(p)) s++;
  if (/\d/.test(p)) s++;
  if (/[^A-Za-z0-9]/.test(p)) s++;
  return Math.min(s, 4);
}

const leadIcon: React.CSSProperties = { position: "absolute", left: 14, color: "var(--ink-400)", pointerEvents: "none" };

export function SignUpForm() {
  const [state, formAction, pending] = useActionState(signUp, initialState);
  const [first, setFirst] = useState("");
  const [last, setLast] = useState("");
  const [password, setPassword] = useState("");
  const [show, setShow] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);

  const score = pwScore(password);
  const fullName = `${first} ${last}`.trim();

  return (
    <form action={formAction} className="au-fields" style={{ marginTop: 26 }}>
      <input type="hidden" name="name" value={fullName} />

      <div className="au-row2">
        <div>
          <label className="au-field-label" htmlFor="su-first">First name</label>
          <div className="au-inwrap">
            <input id="su-first" className="au-input no-lead" value={first} onChange={(e) => setFirst(e.target.value)} required autoComplete="given-name" placeholder="Dana" />
          </div>
        </div>
        <div>
          <label className="au-field-label" htmlFor="su-last">Last name</label>
          <div className="au-inwrap">
            <input id="su-last" className="au-input no-lead" value={last} onChange={(e) => setLast(e.target.value)} required autoComplete="family-name" placeholder="Reyes" />
          </div>
        </div>
      </div>

      <div>
        <label className="au-field-label" htmlFor="su-email">Work email</label>
        <div className="au-inwrap">
          <Icon name="mail" size={17} style={leadIcon} />
          <input id="su-email" className="au-input" name="email" type="email" required autoComplete="email" placeholder="you@company.com" />
        </div>
      </div>

      <div>
        <label className="au-field-label" htmlFor="su-org">Organization name</label>
        <div className="au-inwrap">
          <Icon name="package" size={17} style={leadIcon} />
          <input id="su-org" className="au-input" name="organizationName" type="text" required autoComplete="organization" placeholder="NOVA Advertising" />
        </div>
      </div>

      <div>
        <label className="au-field-label" htmlFor="su-website">
          <span>Website</span>
          <span style={{ fontWeight: 500, color: "var(--ink-400)" }}>optional</span>
        </label>
        <div className="au-inwrap">
          <Icon name="external" size={17} style={leadIcon} />
          <input id="su-website" className="au-input" name="website" type="url" autoComplete="url" placeholder="https://example.com" />
        </div>
      </div>

      <div>
        <label className="au-field-label" htmlFor="su-password">Password</label>
        <div className="au-inwrap">
          <Icon name="lock" size={17} style={leadIcon} />
          <input
            id="su-password"
            className="au-input"
            name="password"
            type={show ? "text" : "password"}
            required
            minLength={8}
            autoComplete="new-password"
            placeholder="Create a password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />
          <button type="button" className="au-eye" onClick={() => setShow((s) => !s)} aria-label={show ? "Hide password" : "Show password"}>
            <Icon name={show ? "eyeOff" : "eye"} size={17} />
          </button>
        </div>
        {password.length > 0 && (
          <>
            <div className="au-strength">
              {[0, 1, 2, 3].map((i) => (
                <span key={i} style={{ background: i < score ? STRENGTH_COLOR[score] : "var(--ink-200)" }} />
              ))}
            </div>
            <div className="au-strength-label" style={{ color: score >= 3 ? "var(--success)" : "var(--ink-400)" }}>
              {score > 0 ? `${STRENGTH[score]} password` : "Use 8+ characters with a mix of letters, numbers & symbols"}
            </div>
          </>
        )}
      </div>

      <div>
        <label className="au-field-label" htmlFor="su-confirm">Confirm password</label>
        <div className="au-inwrap">
          <Icon name="lock" size={17} style={leadIcon} />
          <input
            id="su-confirm"
            className="au-input"
            name="confirmPassword"
            type={showConfirm ? "text" : "password"}
            required
            minLength={8}
            autoComplete="new-password"
            placeholder="Re-enter your password"
          />
          <button type="button" className="au-eye" onClick={() => setShowConfirm((s) => !s)} aria-label={showConfirm ? "Hide password" : "Show password"}>
            <Icon name={showConfirm ? "eyeOff" : "eye"} size={17} />
          </button>
        </div>
      </div>

      {state.error ? <div className="au-error">{state.error}</div> : null}

      <button type="submit" className="au-submit" disabled={pending}>
        {pending ? "Creating account…" : "Create account"}
        {!pending && <Icon name="arrowRight" size={18} />}
      </button>
    </form>
  );
}
