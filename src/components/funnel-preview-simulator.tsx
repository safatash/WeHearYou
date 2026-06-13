"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { RATING_MODES } from "@/lib/rating-styles";

const PREVIEW_LABELS: Record<string, { label: string; branchCopy: string }> = {
  stars: {
    label: "Stars (1 to 5)",
    branchCopy: "4 to 5 stars = promoter, 1 to 3 stars = detractor.",
  },
  faces: {
    label: "Happy / neutral / sad faces",
    branchCopy: "Happy face = promoter, neutral or sad face = private recovery.",
  },
  thumbs: {
    label: "Thumbs up / thumbs down",
    branchCopy: "Thumbs up = promoter, thumbs down = detractor.",
  },
} as const;

type RatingMode = "stars" | "faces" | "thumbs";

type PreviewStep = {
  id: string;
  title: string;
  detail: string;
};

type PreviewLocation = {
  id: string;
  name: string;
  slug: string;
  city: string;
  state: string;
  reviewLink: string | null;
};

type PreviewProfile = {
  headline: string | null;
  subheadline: string | null;
  ctaLabel: string | null;
  ctaUrl: string | null;
  bookingUrl: string | null;
  theme: string | null;
  funnelRatingStyle: string | null;
  funnelPromptTitle: string | null;
  funnelPromptBody: string | null;
  funnelPrivateTitle: string | null;
  funnelPrivateBody: string | null;
  funnelPrivateSubmitLabel: string | null;
  funnelThanksPublicTitle: string | null;
  funnelThanksPublicBody: string | null;
  funnelThanksPrivateTitle: string | null;
  funnelThanksPrivateBody: string | null;
  funnelReviewButtonLabel: string | null;
  lowRatingDestination: string | null;
  highRatingDestinations: string[] | null;
};

const HIGH_DEST_LABEL: Record<string, string> = {
  GOOGLE: "Google",
  FACEBOOK: "Facebook",
  WEHEARYOU: "WeHearYou",
  CUSTOM: "a custom link",
};

export function FunnelPreviewSimulator({
  locations,
  selectedLocation,
  profile,
  previewSteps,
}: {
  locations: PreviewLocation[];
  selectedLocation: PreviewLocation;
  profile: PreviewProfile | null;
  previewSteps: PreviewStep[];
}) {
  const initialRatingMode = (
    (profile?.funnelRatingStyle as RatingMode | null) &&
    ["stars", "faces", "thumbs"].includes(profile?.funnelRatingStyle || "")
      ? (profile?.funnelRatingStyle as RatingMode)
      : "stars"
  );
  const [rating, setRating] = useState<number | null>(null);
  const [ratingMode, setRatingMode] = useState<RatingMode>(initialRatingMode);

  const branch = useMemo(() => {
    if (rating === null) return null;
    return rating >= 4 ? "promoter" : "detractor";
  }, [rating]);

  const primaryCta = profile?.ctaUrl ?? profile?.bookingUrl ?? null;
  const ratingOptions = RATING_MODES[ratingMode];
  const previewLabel = PREVIEW_LABELS[ratingMode];
  const highDests = (profile?.highRatingDestinations && profile.highRatingDestinations.length > 0
    ? profile.highRatingDestinations
    : ["GOOGLE"]);
  const isChoice = highDests.length > 1;
  const lowIsCustom = profile?.lowRatingDestination === "CUSTOM";

  return (
    <div className="grid gap-6 xl:grid-cols-[1.2fr_0.8fr]">
      <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
        <div className="flex flex-wrap items-center justify-between gap-4 rounded-2xl bg-slate-50 p-4 text-sm text-slate-600">
          <div>
            Live preview mode: <span className="font-semibold text-slate-900">rating selected → branch revealed → customer next step</span>
          </div>
          <div className="flex flex-wrap gap-3">
            <Link href={`/funnel-builder?location=${selectedLocation.id}`} className="rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm font-semibold text-slate-700 shadow-sm">
              Back to builder
            </Link>
            <Link href={`/f/${selectedLocation.slug}`} className="rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm font-semibold text-slate-700 shadow-sm">
              Open live funnel
            </Link>
            <Link href={`/b/${selectedLocation.slug}`} target="_blank" rel="noreferrer" className="rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm font-semibold text-slate-700 shadow-sm">
              Open mini-site
            </Link>
          </div>
        </div>

        <div className="mt-4 rounded-[2rem] border border-dashed border-slate-300 bg-slate-50 p-6">
          <div className="mx-auto max-w-xl rounded-[2rem] bg-white p-8 shadow-sm">
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.18em] text-indigo-600">Customer preview</p>
                <h3 className="mt-3 text-3xl font-semibold tracking-tight text-slate-950">
                  {profile?.funnelPromptTitle ?? previewSteps[0]?.title ?? profile?.headline ?? selectedLocation.name}
                </h3>
                <p className="mt-3 text-sm leading-7 text-slate-600">
                  {profile?.funnelPromptBody ?? previewSteps[0]?.detail ?? profile?.subheadline ?? "Collect a 1 to 5 star rating, then route the visitor based on sentiment."}
                </p>
              </div>
              <span className="rounded-full bg-slate-100 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-500">
                {profile?.theme ?? "light"}
              </span>
            </div>

            <div className="mt-6 rounded-3xl border border-slate-200 bg-slate-50 p-4">
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">Segmentation control</p>
              <div className="mt-3 flex flex-wrap gap-2">
                {(["stars", "faces", "thumbs"] as const).map((mode) => {
                  const active = mode === ratingMode;
                  return (
                    <button
                      key={mode}
                      type="button"
                      onClick={() => {
                        setRatingMode(mode);
                        setRating(null);
                      }}
                      className={`rounded-2xl border px-4 py-3 text-sm font-semibold transition ${
                        active ? "border-indigo-200 bg-indigo-50 text-indigo-700" : "border-slate-200 bg-white text-slate-700 hover:border-slate-300"
                      }`}
                    >
                      {PREVIEW_LABELS[mode].label}
                    </button>
                  );
                })}
              </div>
              <p className="mt-3 text-sm text-slate-600">{previewLabel.branchCopy}</p>
            </div>

            <div className="mt-6 flex flex-wrap gap-2">
              {ratingOptions.map((option) => {
                const active = rating === option.value || (ratingMode === "stars" && rating !== null && option.value <= rating);
                return (
                  <button
                    key={`${ratingMode}-${option.value}`}
                    type="button"
                    onClick={() => setRating(option.value)}
                    className={`flex min-h-14 min-w-14 items-center justify-center gap-2 rounded-2xl border px-4 py-3 text-center transition ${
                      active
                        ? "border-amber-300 bg-amber-50 text-slate-900"
                        : "border-slate-200 bg-white text-slate-500 hover:border-slate-300 hover:text-slate-900"
                    } ${ratingMode === "stars" ? "text-3xl" : "text-base"}`}
                    aria-label={option.label}
                  >
                    <span className={ratingMode === "stars" ? "text-3xl text-amber-400" : "text-3xl"}>{option.icon}</span>
                    <span className="text-sm font-semibold">{option.shortLabel}</span>
                  </button>
                );
              })}
            </div>

            <div className="mt-4 flex flex-wrap gap-3">
              <button
                type="button"
                onClick={() => setRating(null)}
                className="rounded-2xl border border-slate-200 px-4 py-3 text-sm font-semibold text-slate-700"
              >
                Reset preview
              </button>
              {rating !== null ? <p className="self-center text-sm text-slate-600">Selected signal: <span className="font-semibold text-slate-900">{ratingOptions.find((option) => option.value === rating)?.label ?? `${rating} / 5`}</span></p> : null}
            </div>

            <div className="mt-6">
              {branch === null ? (
                <div className="rounded-3xl border border-slate-200 bg-slate-50 p-5">
                  <p className="text-sm font-semibold text-slate-900">Waiting for rating selection</p>
                  <p className="mt-2 text-sm leading-6 text-slate-600">Pick a star rating above to preview the exact branch this customer would enter.</p>
                </div>
              ) : branch === "promoter" ? (
                <div className="rounded-3xl border border-emerald-200 bg-emerald-50 p-5">
                  <p className="text-xs font-semibold uppercase tracking-[0.18em] text-emerald-700">High rating path</p>
                  {isChoice ? (
                    <>
                      <h4 className="mt-2 text-xl font-semibold text-emerald-950">Show a choice of review destinations</h4>
                      <p className="mt-3 text-sm leading-6 text-emerald-900">
                        This customer would see a choice page (primary highlighted first): {highDests.map((d) => HIGH_DEST_LABEL[d] ?? d).join(", ")}.
                      </p>
                      <div className="mt-4 flex flex-wrap gap-2">
                        {highDests.map((d, i) => (
                          <span key={d} className={`rounded-2xl px-4 py-2 text-sm font-semibold ${i === 0 ? "bg-emerald-900 text-white" : "border border-emerald-200 bg-white text-emerald-800"}`}>
                            {HIGH_DEST_LABEL[d] ?? d}
                          </span>
                        ))}
                      </div>
                    </>
                  ) : (
                    <>
                      <h4 className="mt-2 text-xl font-semibold text-emerald-950">
                        {highDests[0] === "WEHEARYOU" ? "Collect a review inside WeHearYou" : `Send customer to ${HIGH_DEST_LABEL[highDests[0]] ?? highDests[0]}`}
                      </h4>
                      <p className="mt-3 text-sm leading-6 text-emerald-900">
                        {highDests[0] === "WEHEARYOU"
                          ? "This customer would write a first-party review captured in WeHearYou."
                          : `This customer would be handed off to leave a review on ${HIGH_DEST_LABEL[highDests[0]] ?? highDests[0]}.`}
                      </p>
                      <div className="mt-4 flex flex-wrap gap-3">
                        <span className="rounded-2xl bg-emerald-900 px-4 py-3 text-sm font-semibold text-white">
                          {highDests[0] === "WEHEARYOU" ? "Leave a review on WeHearYou" : `Review on ${HIGH_DEST_LABEL[highDests[0]] ?? highDests[0]}`}
                        </span>
                        {primaryCta ? <span className="rounded-2xl border border-emerald-200 bg-white px-4 py-3 text-sm font-semibold text-emerald-800">Fallback CTA available</span> : null}
                      </div>
                    </>
                  )}
                </div>
              ) : (
                <div className="rounded-3xl border border-amber-200 bg-amber-50 p-5">
                  <p className="text-xs font-semibold uppercase tracking-[0.18em] text-amber-700">Low rating path</p>
                  <h4 className="mt-2 text-xl font-semibold text-amber-950">{lowIsCustom ? "Send to a custom recovery page" : "Keep feedback private"}</h4>
                  <p className="mt-3 text-sm leading-6 text-amber-900">
                    {lowIsCustom
                      ? "This customer would be redirected to your custom recovery URL (support/complaint/helpdesk) — not a public review site."
                      : "This customer stays in the funnel and sees a private recovery form instead of a public review redirect."}
                  </p>
                  <div className="mt-4 rounded-2xl border border-amber-200 bg-white p-4">
                    <p className="text-sm font-semibold text-slate-900">{profile?.funnelPrivateTitle ?? "Private feedback form preview"}</p>
                    <p className="mt-2 text-sm leading-6 text-slate-600">
                      {profile?.funnelPrivateBody ?? "This customer stays in the funnel and can share feedback privately with the team."}
                    </p>
                    <div className="mt-3 space-y-3">
                      <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-500">What happened?</div>
                      <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-500">Email or phone so the team can follow up</div>
                      <div className="inline-flex rounded-2xl bg-slate-950 px-4 py-3 text-sm font-semibold text-white">{profile?.funnelPrivateSubmitLabel ?? "Send private feedback"}</div>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </section>

      <aside className="space-y-6">
        <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
          <p className="text-sm font-semibold uppercase tracking-[0.22em] text-indigo-600">Preview Location</p>
          <div className="mt-5 grid gap-3">
            {locations.map((location) => {
              const isSelected = location.id === selectedLocation.id;
              return (
                <Link
                  key={location.id}
                  href={`/funnel-preview?location=${location.id}`}
                  className={`block rounded-2xl border p-4 transition ${
                    isSelected ? "border-indigo-200 bg-indigo-50" : "border-slate-200 bg-slate-50 hover:border-slate-300 hover:bg-white"
                  }`}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="font-semibold text-slate-950">{location.name}</p>
                      <p className="mt-1 text-sm text-slate-600">{location.city}, {location.state}</p>
                    </div>
                    <span className={`rounded-full px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.18em] ${isSelected ? "bg-white text-indigo-700" : "bg-white text-slate-500"}`}>
                      {isSelected ? "Selected" : "Switch"}
                    </span>
                  </div>
                </Link>
              );
            })}
          </div>
        </section>

        <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
          <p className="text-sm font-semibold uppercase tracking-[0.22em] text-indigo-600">Current Configuration</p>
          <h3 className="mt-2 text-2xl font-semibold text-slate-950">{selectedLocation.name}</h3>
          <div className="mt-4 space-y-3 text-sm leading-7 text-slate-600">
            <p><span className="font-semibold text-slate-900">Funnel prompt:</span> {profile?.funnelPromptTitle ?? profile?.headline ?? selectedLocation.name}</p>
            <p><span className="font-semibold text-slate-900">Review button:</span> {profile?.funnelReviewButtonLabel ?? "Leave a Google review"}</p>
            <p><span className="font-semibold text-slate-900">Live funnel:</span> /f/{selectedLocation.slug}</p>
            <p><span className="font-semibold text-slate-900">Preview mode:</span> {previewLabel.label}</p>
            <p><span className="font-semibold text-slate-900">Public review link:</span> {selectedLocation.reviewLink ?? "Not set"}</p>
            <p><span className="font-semibold text-slate-900">Booking URL:</span> {profile?.bookingUrl ?? "Not set"}</p>
            <p><span className="font-semibold text-slate-900">Theme:</span> {profile?.theme ?? "light"}</p>
          </div>
        </section>

        <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
          <p className="text-sm font-semibold uppercase tracking-[0.22em] text-indigo-600">Branch Checklist</p>
          <div className="mt-4 space-y-3 text-sm leading-7 text-slate-600">
            <p><span className="font-semibold text-slate-900">Step 1:</span> customer sees brand copy and the selected segmentation style.</p>
            <p><span className="font-semibold text-slate-900">Step 2:</span> positive responses route toward the review request.</p>
            <p><span className="font-semibold text-slate-900">Step 3:</span> negative or neutral responses stay private for recovery.</p>
            <p><span className="font-semibold text-slate-900">Step 4:</span> compare stars, faces, and thumbs before choosing a live pattern.</p>
          </div>
        </section>
      </aside>
    </div>
  );
}
