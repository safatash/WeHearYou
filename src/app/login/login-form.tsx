"use client";

import { useActionState, useState } from "react";
import { Icon } from "@/components/icon";
import { authenticate, type LoginActionState } from "@/app/login/actions";

const initialState: LoginActionState = {};

export function LoginForm() {
  const [state, formAction, pending] = useActionState(authenticate, initialState);
  const [show, setShow] = useState(false);

  return (
    <form action={formAction} className="au-fields" style={{ marginTop: 26 }}>
      <div>
        <label className="au-field-label" htmlFor="login-email">Work email</label>
        <div className="au-inwrap">
          <Icon name="mail" size={17} style={{ position: "absolute", left: 14, color: "var(--ink-400)", pointerEvents: "none" }} />
          <input id="login-email" className="au-input" name="email" type="email" required autoComplete="email" placeholder="you@company.com" />
        </div>
      </div>

      <div>
        <label className="au-field-label" htmlFor="login-password">Password</label>
        <div className="au-inwrap">
          <Icon name="lock" size={17} style={{ position: "absolute", left: 14, color: "var(--ink-400)", pointerEvents: "none" }} />
          <input
            id="login-password"
            className="au-input"
            name="password"
            type={show ? "text" : "password"}
            required
            autoComplete="current-password"
            placeholder="Enter your password"
          />
          <button type="button" className="au-eye" onClick={() => setShow((s) => !s)} aria-label={show ? "Hide password" : "Show password"}>
            <Icon name={show ? "eyeOff" : "eye"} size={17} />
          </button>
        </div>
      </div>

      {state.error ? <div className="au-error">{state.error}</div> : null}

      <button type="submit" className="au-submit" disabled={pending}>
        {pending ? "Signing in…" : "Sign in"}
        {!pending && <Icon name="arrowRight" size={18} />}
      </button>
    </form>
  );
}
