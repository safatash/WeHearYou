"use client";

import { useEffect, useRef, useState } from "react";
import { submitResolutionCase } from "./actions";

type ContactPref = "PHONE" | "EMAIL" | "NONE" | "";

type Props = {
  token: string;
  locationId: string;
  businessName: string;
  rating: number;
  issueChips: string[];
  allowAiRewrite: boolean;
  prefillName: string;
  prefillEmail: string;
  prefillPhone: string;
};

const btn = "inline-flex items-center justify-center gap-2 rounded-2xl px-5 py-3 text-sm font-semibold transition-colors disabled:opacity-50 disabled:cursor-not-allowed";
const primary = `${btn} bg-indigo-600 text-white hover:bg-indigo-700`;
const secondary = `${btn} border border-slate-200 bg-white text-slate-700 hover:bg-slate-50`;
const field = "w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 text-sm text-slate-800";

export function ResolutionWizard(props: Props) {
  const [step, setStep] = useState(1);
  const [issues, setIssues] = useState<Set<string>>(new Set());
  const [whatHappened, setWhatHappened] = useState("");
  const [whatBetter, setWhatBetter] = useState("");
  const [outcome, setOutcome] = useState("");
  const [contactPref, setContactPref] = useState<ContactPref>("");
  const [name, setName] = useState(props.prefillName);
  const [email, setEmail] = useState(props.prefillEmail);
  const [phone, setPhone] = useState(props.prefillPhone);
  const [aiRewrite, setAiRewrite] = useState<string | null>(null);
  const [finalText, setFinalText] = useState("");
  const [editing, setEditing] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const startedFired = useRef(false);

  const fire = (event: string) => {
    try {
      const payload = JSON.stringify({ locationId: props.locationId, event });
      const blob = new Blob([payload], { type: "application/json" });
      if (navigator.sendBeacon) navigator.sendBeacon("/api/customer-resolution/event", blob);
      else fetch("/api/customer-resolution/event", { method: "POST", body: payload, headers: { "Content-Type": "application/json" }, keepalive: true });
    } catch {
      /* best-effort */
    }
  };

  useEffect(() => {
    fire("RESOLUTION_VIEWED");
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const toggleIssue = (issue: string) =>
    setIssues((prev) => {
      const next = new Set(prev);
      if (next.has(issue)) next.delete(issue);
      else next.add(issue);
      return next;
    });

  const composedFinal = () => {
    const base = (finalText || whatHappened).trim();
    return whatBetter.trim() ? `${base}\n\nWhat would have made this better: ${whatBetter.trim()}` : base;
  };

  const goToReview = () => {
    setFinalText(whatHappened);
    setStep(props.allowAiRewrite ? 4 : 5);
  };

  const requestRewrite = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/customer-resolution/rewrite", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ locationId: props.locationId, feedback: whatHappened, issueCategories: Array.from(issues) }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data?.error || "Couldn't generate a suggestion. You can continue with your own words.");
        return;
      }
      setAiRewrite(data.rewritten);
    } catch {
      setError("Network error. You can continue with your own words.");
    } finally {
      setLoading(false);
    }
  };

  const submit = async () => {
    setSubmitting(true);
    setError(null);
    try {
      await submitResolutionCase({
        token: props.token,
        rating: props.rating,
        issueCategories: Array.from(issues),
        originalFeedback: whatHappened,
        aiClearFeedback: aiRewrite,
        finalFeedback: composedFinal(),
        requestedOutcome: outcome || null,
        contactPreference: contactPref === "" ? "NONE" : contactPref,
        customerName: name || null,
        customerEmail: email || null,
        customerPhone: phone || null,
      });
    } catch (e) {
      // a thrown NEXT_REDIRECT navigates; anything else is a real error
      if (e && typeof e === "object" && "digest" in e && String((e as { digest?: string }).digest).startsWith("NEXT_REDIRECT")) return;
      setError("Something went wrong submitting your feedback. Please try again.");
      setSubmitting(false);
    }
  };

  return (
    <div>
      {/* SCREEN 1 — intro */}
      {step === 1 && (
        <div>
          <p className="text-sm font-semibold uppercase tracking-[0.22em] text-indigo-600">{props.businessName}</p>
          <h1 className="mt-3 text-3xl font-semibold tracking-tight text-slate-950 sm:text-4xl">We&apos;d like to understand what happened.</h1>
          <p className="mt-4 text-base leading-7 text-slate-600">Your feedback helps this business improve.</p>
          <button type="button" onClick={() => setStep(2)} className={`${primary} mt-8 w-full sm:w-auto`}>Continue</button>
        </div>
      )}

      {/* SCREEN 2 — issue selection */}
      {step === 2 && (
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-slate-950 sm:text-3xl">What best describes the issue?</h1>
          <p className="mt-2 text-sm text-slate-600">Select any that apply.</p>
          <div className="mt-5 flex flex-wrap gap-2">
            {props.issueChips.map((chip) => {
              const on = issues.has(chip);
              return (
                <button key={chip} type="button" onClick={() => toggleIssue(chip)} aria-pressed={on}
                  className={`rounded-full border px-3.5 py-2 text-sm font-medium transition-colors ${on ? "border-indigo-600 bg-indigo-600 text-white" : "border-slate-200 bg-white text-slate-700 hover:border-slate-300"}`}>
                  {chip}
                </button>
              );
            })}
          </div>
          <div className="mt-8 flex gap-2">
            <button type="button" onClick={() => setStep(1)} className={secondary}>Back</button>
            <button type="button" onClick={() => { fire("RESOLUTION_ISSUE_SELECTED"); setStep(3); }} className={primary}>Continue</button>
          </div>
        </div>
      )}

      {/* SCREEN 3 — feedback collection */}
      {step === 3 && (
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-slate-950 sm:text-3xl">Tell us what happened</h1>
          <label className="mt-5 grid gap-1.5 text-sm font-semibold text-slate-700">
            What happened?
            <textarea value={whatHappened} rows={5}
              onChange={(e) => { setWhatHappened(e.target.value); if (!startedFired.current) { startedFired.current = true; fire("RESOLUTION_FEEDBACK_STARTED"); } }}
              placeholder="Share as much or as little as you'd like." className={field} />
          </label>
          <label className="mt-4 grid gap-1.5 text-sm font-semibold text-slate-700">
            What would have made this better? <span className="font-normal text-slate-400">(optional)</span>
            <textarea value={whatBetter} onChange={(e) => setWhatBetter(e.target.value)} rows={2} className={field} />
          </label>
          <label className="mt-4 grid gap-1.5 text-sm font-semibold text-slate-700">
            What outcome would you like? <span className="font-normal text-slate-400">(optional)</span>
            <input value={outcome} onChange={(e) => setOutcome(e.target.value)} placeholder="e.g. Refund, Follow-up, Explanation, Issue fixed, No action needed" className={field} />
          </label>

          <fieldset className="mt-5">
            <legend className="text-sm font-semibold text-slate-700">Would you like the business to contact you?</legend>
            <div className="mt-2 grid gap-2">
              {([["PHONE", "Yes, by phone"], ["EMAIL", "Yes, by email"], ["NONE", "No thanks"]] as const).map(([val, label]) => (
                <label key={val} className={`flex items-center gap-3 rounded-xl border px-4 py-3 text-sm font-medium ${contactPref === val ? "border-indigo-300 bg-indigo-50 text-slate-900" : "border-slate-200 text-slate-700"}`}>
                  <input type="radio" name="contactPref" checked={contactPref === val}
                    onChange={() => { setContactPref(val); if (val !== "NONE") fire("RESOLUTION_CONTACT_REQUESTED"); }} />
                  {label}
                </label>
              ))}
            </div>
          </fieldset>

          {contactPref !== "" && contactPref !== "NONE" && (
            <div className="mt-4 grid gap-3 sm:grid-cols-2">
              <label className="grid gap-1.5 text-sm font-semibold text-slate-700">Name<input value={name} onChange={(e) => setName(e.target.value)} className={field} /></label>
              {contactPref === "PHONE"
                ? <label className="grid gap-1.5 text-sm font-semibold text-slate-700">Phone<input value={phone} onChange={(e) => setPhone(e.target.value)} className={field} /></label>
                : <label className="grid gap-1.5 text-sm font-semibold text-slate-700">Email<input value={email} type="email" onChange={(e) => setEmail(e.target.value)} className={field} /></label>}
            </div>
          )}

          <div className="mt-8 flex gap-2">
            <button type="button" onClick={() => setStep(2)} className={secondary}>Back</button>
            <button type="button" onClick={goToReview} disabled={!whatHappened.trim()} className={primary}>Continue</button>
          </div>
        </div>
      )}

      {/* SCREEN 4 — AI feedback helper (optional) */}
      {step === 4 && (
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-slate-950 sm:text-3xl">Want help saying this clearly?</h1>
          <p className="mt-2 text-sm text-slate-600">This is optional — you can skip it and use your own words.</p>

          {!aiRewrite ? (
            <button type="button" onClick={requestRewrite} disabled={loading} className={`${primary} mt-5`}>{loading ? "Working…" : "Make My Feedback Clearer"}</button>
          ) : (
            <div className="mt-5 space-y-4">
              <div>
                <p className="mb-1 text-xs font-semibold uppercase tracking-wide text-slate-400">Your feedback</p>
                <p className="whitespace-pre-wrap rounded-xl border border-slate-200 bg-slate-50 p-3 text-sm text-slate-700">{whatHappened}</p>
              </div>
              <div>
                <p className="mb-1 text-xs font-semibold uppercase tracking-wide text-indigo-500">Suggested version</p>
                <p className="whitespace-pre-wrap rounded-xl border border-indigo-100 bg-indigo-50 p-3 text-sm text-indigo-900">{aiRewrite}</p>
              </div>
              <p className="text-xs text-slate-500">We only improve clarity. We do not change the meaning of your feedback.</p>
              <div className="flex flex-wrap gap-2">
                <button type="button" onClick={() => { setFinalText(aiRewrite); setEditing(false); fire("RESOLUTION_AI_REWRITE_ACCEPTED"); setStep(5); }} className={primary}>Use Suggested Version</button>
                <button type="button" onClick={() => { setFinalText(whatHappened); setStep(5); }} className={secondary}>Keep Original</button>
                <button type="button" onClick={() => { setFinalText(aiRewrite); setEditing(true); setStep(5); }} className={secondary}>Edit Manually</button>
              </div>
            </div>
          )}

          {error && <p className="mt-4 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-700">{error}</p>}

          <div className="mt-8 flex gap-2">
            <button type="button" onClick={() => setStep(3)} className={secondary}>Back</button>
            <button type="button" onClick={() => { setFinalText(whatHappened); setStep(5); }} className={secondary}>Skip</button>
          </div>
        </div>
      )}

      {/* SCREEN 5 — final confirmation */}
      {step === 5 && (
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-slate-950 sm:text-3xl">Does this accurately describe your experience?</h1>
          {editing ? (
            <textarea value={finalText} onChange={(e) => setFinalText(e.target.value)} rows={7} className={`${field} mt-5`} />
          ) : (
            <p className="mt-5 whitespace-pre-wrap rounded-2xl border border-slate-200 bg-slate-50 p-4 text-sm leading-7 text-slate-800">{composedFinal()}</p>
          )}
          {error && <p className="mt-4 rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">{error}</p>}
          <div className="mt-8 flex flex-wrap gap-2">
            <button type="button" onClick={submit} disabled={submitting || !composedFinal().trim()} className={primary}>{submitting ? "Submitting…" : "Submit Feedback"}</button>
            <button type="button" onClick={() => setEditing((v) => !v)} className={secondary}>{editing ? "Done editing" : "Edit Feedback"}</button>
          </div>
        </div>
      )}
    </div>
  );
}
