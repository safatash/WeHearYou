"use client";

import { useEffect, useRef, useState } from "react";
import { submitCampaignPositiveReview } from "../actions";
import { ASSISTANT_LENGTHS, type AssistantLength, type AssistantTone } from "@/lib/review-assistant";

export type AssistDestination = { key: "GOOGLE" | "YELP" | "FACEBOOK" | "TRUSTPILOT"; label: string; url: string };

type Props = {
  token: string;
  locationId: string;
  rating: number;
  businessName: string;
  chips: string[];
  services: string[];
  destinations: AssistDestination[];
  wehearyouEnabled: boolean;
  allowTone: boolean;
  allowLength: boolean;
  allowRegenerate: boolean;
  allowNotes: boolean;
};

const btnBase = "inline-flex items-center justify-center gap-2 rounded-2xl px-4 py-2.5 text-sm font-semibold transition-colors disabled:opacity-50 disabled:cursor-not-allowed";
const primaryBtn = `${btnBase} bg-indigo-600 text-white hover:bg-indigo-700`;
const secondaryBtn = `${btnBase} border border-slate-200 bg-white text-slate-700 hover:bg-slate-50`;

export function ReviewAssistantClient(props: Props) {
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [service, setService] = useState("");
  const [staff, setStaff] = useState("");
  const [notes, setNotes] = useState("");
  const [tone, setTone] = useState<AssistantTone>("friendly");
  const [length, setLength] = useState<AssistantLength>("medium");
  const [review, setReview] = useState("");
  const [loading, setLoading] = useState(false);
  const [copied, setCopied] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const editedFired = useRef(false);
  const sessionRef = useRef<string | null>(null);

  const fireEvent = (event: string) => {
    try {
      const payload = JSON.stringify({ locationId: props.locationId, event, sessionId: sessionRef.current });
      const blob = new Blob([payload], { type: "application/json" });
      if (navigator.sendBeacon) navigator.sendBeacon("/api/review-assistant/event", blob);
      else fetch("/api/review-assistant/event", { method: "POST", body: payload, headers: { "Content-Type": "application/json" }, keepalive: true });
    } catch {
      /* best-effort */
    }
  };

  useEffect(() => {
    fireEvent("AI_ASSIST_VIEWED");
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const toggleChip = (chip: string) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(chip)) next.delete(chip);
      else next.add(chip);
      return next;
    });
  };

  const generate = async (opts?: { regenerate?: boolean; tone?: AssistantTone; length?: AssistantLength }) => {
    const useTone = opts?.tone ?? tone;
    const useLength = opts?.length ?? length;
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/review-assistant/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          locationId: props.locationId,
          rating: props.rating,
          selectedPhrases: Array.from(selected),
          service: service || null,
          staffMember: staff || null,
          notes: notes || null,
          tone: useTone,
          length: useLength,
          sessionId: sessionRef.current,
          isRegenerate: Boolean(opts?.regenerate),
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data?.error || "Something went wrong. Please try again.");
        return;
      }
      setReview(data.review);
      if (data.sessionId) {
        sessionRef.current = data.sessionId;
      }
      if (opts?.tone) setTone(opts.tone);
      if (opts?.length) setLength(opts.length);
    } catch {
      setError("Network error. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const changeLength = (dir: -1 | 1) => {
    const idx = ASSISTANT_LENGTHS.indexOf(length);
    const next = ASSISTANT_LENGTHS[Math.min(ASSISTANT_LENGTHS.length - 1, Math.max(0, idx + dir))];
    if (next !== length) generate({ regenerate: true, length: next });
  };

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(review);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
      fireEvent("AI_ASSIST_COPIED");
    } catch {
      setError("Couldn't copy automatically — please select and copy the text.");
    }
  };

  const goToDestination = async (d: AssistDestination) => {
    try {
      await navigator.clipboard.writeText(review);
    } catch {
      /* clipboard optional */
    }
    fireEvent(`AI_ASSIST_DEST_${d.key}`);
    window.open(d.url, "_blank", "noopener");
  };

  const onEdit = (value: string) => {
    setReview(value);
    if (!editedFired.current) {
      editedFired.current = true;
      fireEvent("AI_ASSIST_EDITED");
    }
  };

  const hasReview = review.trim().length > 0;

  return (
    <div>
      <p className="text-sm font-semibold uppercase tracking-[0.22em] text-indigo-600">Need help writing your review?</p>
      <h1 className="mt-3 text-3xl font-semibold tracking-tight text-slate-950 sm:text-4xl">
        Let&apos;s turn your visit into a review
      </h1>
      <p className="mt-3 text-base leading-7 text-slate-600">
        Select a few things that stood out and we&apos;ll help turn your experience into a review for {props.businessName}.
      </p>

      {/* Experience chips */}
      {props.chips.length > 0 && (
        <div className="mt-6">
          <p className="mb-2 text-sm font-semibold text-slate-700">What stood out?</p>
          <div className="flex flex-wrap gap-2">
            {props.chips.map((chip) => {
              const on = selected.has(chip);
              return (
                <button
                  key={chip}
                  type="button"
                  onClick={() => toggleChip(chip)}
                  aria-pressed={on}
                  className={`rounded-full border px-3.5 py-1.5 text-sm font-medium transition-colors ${
                    on ? "border-indigo-600 bg-indigo-600 text-white" : "border-slate-200 bg-white text-slate-700 hover:border-slate-300"
                  }`}
                >
                  {chip}
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* Optional inputs */}
      <div className="mt-5 grid gap-4 sm:grid-cols-2">
        {props.services.length > 0 && (
          <label className="grid gap-1.5 text-sm font-semibold text-slate-700">
            Service received
            <select value={service} onChange={(e) => setService(e.target.value)} className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 text-sm font-normal text-slate-700">
              <option value="">Select a service (optional)</option>
              {props.services.map((s) => (
                <option key={s} value={s}>{s}</option>
              ))}
            </select>
          </label>
        )}
        <label className="grid gap-1.5 text-sm font-semibold text-slate-700">
          Who helped you?
          <input value={staff} onChange={(e) => setStaff(e.target.value)} placeholder="Optional" className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 text-sm font-normal text-slate-700" />
        </label>
      </div>

      {props.allowNotes && (
        <label className="mt-4 grid gap-1.5 text-sm font-semibold text-slate-700">
          Anything else you&apos;d like to mention?
          <textarea value={notes} onChange={(e) => setNotes(e.target.value)} rows={3} placeholder="Optional" className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 text-sm font-normal leading-6 text-slate-700" />
        </label>
      )}

      {!hasReview && (
        <button type="button" onClick={() => generate()} disabled={loading} className={`${primaryBtn} mt-6 w-full sm:w-auto`}>
          {loading ? "Writing your review…" : "Write My Review"}
        </button>
      )}

      {error && <p className="mt-4 rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">{error}</p>}

      {/* Generated review */}
      {hasReview && (
        <div className="mt-6">
          <div className="rounded-2xl border border-slate-200 bg-white p-4">
            <textarea
              value={review}
              onChange={(e) => onEdit(e.target.value)}
              rows={7}
              className="w-full resize-y rounded-xl border border-slate-200 bg-slate-50 px-3 py-3 text-sm leading-7 text-slate-800"
            />
            <p className="mt-2 text-xs text-slate-500">Please edit this so it reflects your real experience.</p>
          </div>

          {/* Controls */}
          <div className="mt-3 flex flex-wrap gap-2">
            <button type="button" onClick={copy} className={primaryBtn}>{copied ? "Copied!" : "Copy Review"}</button>
            {props.allowRegenerate && (
              <button type="button" onClick={() => generate({ regenerate: true })} disabled={loading} className={secondaryBtn}>Regenerate</button>
            )}
            {props.allowLength && (
              <>
                <button type="button" onClick={() => changeLength(-1)} disabled={loading || length === "short"} className={secondaryBtn}>Make Shorter</button>
                <button type="button" onClick={() => changeLength(1)} disabled={loading || length === "detailed"} className={secondaryBtn}>Make Longer</button>
              </>
            )}
            {props.allowTone && (
              <>
                <button type="button" onClick={() => generate({ regenerate: true, tone: "casual" })} disabled={loading} className={secondaryBtn}>More Casual</button>
                <button type="button" onClick={() => generate({ regenerate: true, tone: "professional" })} disabled={loading} className={secondaryBtn}>More Professional</button>
              </>
            )}
          </div>

          {/* Destinations */}
          <div className="mt-8 border-t border-slate-200 pt-6">
            <h2 className="text-xl font-semibold text-slate-950">Post your review</h2>
            <p className="mt-1 text-sm text-slate-600">Copy your review, then choose where you&apos;d like to post it.</p>
            <div className="mt-4 flex flex-wrap gap-2">
              {props.destinations.map((d) => (
                <button key={d.key} type="button" onClick={() => goToDestination(d)} className={primaryBtn}>
                  Write on {d.label}
                </button>
              ))}
            </div>

            {props.wehearyouEnabled && (
              <form
                action={submitCampaignPositiveReview}
                onSubmit={() => fireEvent("AI_ASSIST_WEHEARYOU_SUBMITTED")}
                className="mt-6 grid gap-3 rounded-2xl border border-slate-200 bg-slate-50 p-4"
              >
                <p className="text-sm font-semibold text-slate-700">Or post it directly to {props.businessName}</p>
                <input type="hidden" name="token" value={props.token} />
                <input type="hidden" name="rating" value={props.rating} />
                <input type="hidden" name="body" value={review} />
                <div className="grid gap-3 sm:grid-cols-2">
                  <input name="name" placeholder="Your name" className="rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm text-slate-700" />
                  <input name="email" type="email" placeholder="Email (optional)" className="rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm text-slate-700" />
                </div>
                <button type="submit" className={`${primaryBtn} w-full sm:w-auto`}>Submit review</button>
              </form>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
