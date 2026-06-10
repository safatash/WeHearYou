"use client";

import { useState, useTransition } from "react";
import { saveCampaignWizard } from "@/app/campaign-wizard/actions";

type Location = {
  id: string;
  name: string;
  slug: string;
  city: string;
  state: string;
  reviewLink: string | null;
  publicProfile: {
    funnelRatingStyle: string | null;
    funnelPromptTitle: string | null;
    funnelPromptBody: string | null;
    negativeFilterEnabled: boolean;
    negativeFilterThreshold: number;
    positiveReviewDestination: string | null;
  } | null;
};

const STEPS = [
  { id: "location", label: "Location", icon: "📍" },
  { id: "appearance", label: "Appearance", icon: "🎨" },
  { id: "message", label: "Message", icon: "✉️" },
  { id: "filter", label: "Review Filter", icon: "🔀" },
  { id: "share", label: "Share", icon: "🔗" },
];

function PhonePreview({
  title,
  body,
  ratingStyle,
  filterEnabled,
  threshold,
  locationName,
}: {
  title: string;
  body: string;
  ratingStyle: string;
  filterEnabled: boolean;
  threshold: number;
  locationName: string;
}) {
  const stars = [1, 2, 3, 4, 5];
  const faces = ["😞", "😐", "😊"];
  const thumbs = ["👎", "👍"];

  return (
    <div className="mx-auto w-[240px] rounded-[32px] border-4 border-slate-800 bg-slate-800 shadow-2xl">
      {/* Notch */}
      <div className="mx-auto h-5 w-20 rounded-b-xl bg-slate-800" />
      {/* Screen */}
      <div className="min-h-[440px] rounded-[24px] bg-white p-4">
        <div className="text-center">
          <p className="text-[9px] font-bold uppercase tracking-widest text-indigo-600">WeHearYou</p>
          <p className="mt-2 text-xs font-semibold leading-snug text-slate-900 line-clamp-2">
            {title || `How was your experience with ${locationName}?`}
          </p>
          <p className="mt-1.5 text-[9px] leading-relaxed text-slate-500 line-clamp-3">
            {body || "Share a quick rating below."}
          </p>
        </div>

        {/* Rating options */}
        <div className="mt-4 flex justify-center gap-1.5">
          {ratingStyle === "stars" && (
            <div className="flex gap-1.5">
              {stars.map((s) => (
                <div key={s} className="text-slate-400">
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" />
                  </svg>
                </div>
              ))}
            </div>
          )}
          {ratingStyle === "faces" && (
            <div className="flex gap-1">
              {faces.map((f, i) => (
                <div key={i} className="text-base">
                  {f}
                </div>
              ))}
            </div>
          )}
          {ratingStyle === "thumbs" && (
            <div className="flex gap-1">
              {thumbs.map((t, i) => (
                <div key={i} className="text-lg">
                  {t}
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Filter legend */}
        {filterEnabled && (
          <div className="mt-3 space-y-1">
            <div className="flex items-center gap-1.5 rounded-lg bg-indigo-50 px-2 py-1">
              <div className="h-1.5 w-1.5 rounded-full bg-indigo-500" />
              <p className="text-[8px] text-indigo-700">→ Google review</p>
            </div>
            <div className="flex items-center gap-1.5 rounded-lg bg-orange-50 px-2 py-1">
              <div className="h-1.5 w-1.5 rounded-full bg-orange-500" />
              <p className="text-[8px] text-orange-700">→ Private feedback (saved in WHY)</p>
            </div>
          </div>
        )}
      </div>
      {/* Home bar */}
      <div className="mx-auto mb-2 mt-1 h-1 w-16 rounded-full bg-slate-600" />
    </div>
  );
}

function QRCodeDisplay({ url }: { url: string }) {
  const encodedUrl = encodeURIComponent(url);
  const qrSrc = `https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${encodedUrl}&bgcolor=ffffff&color=0f172a&margin=10`;

  function downloadQR() {
    const link = document.createElement("a");
    link.download = "review-qr-code.png";
    link.href = qrSrc;
    link.click();
  }

  return (
    <div className="flex flex-col items-center gap-3">
      <img src={qrSrc} alt="QR Code" className="rounded-2xl border border-slate-200" width={200} height={200} />
      <button
        type="button"
        onClick={downloadQR}
        className="rounded-xl bg-slate-950 px-4 py-2 text-sm font-semibold text-white"
        style={{ color: "white" }}
      >
        Download PNG
      </button>
    </div>
  );
}

function CopyField({ label, value }: { label: string; value: string }) {
  const [copied, setCopied] = useState(false);
  function copy() {
    navigator.clipboard.writeText(value);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }
  return (
    <div className="space-y-2">
      <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">{label}</p>
      <div className="flex items-center gap-2 rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3">
        <p className="flex-1 truncate text-sm text-slate-700">{value}</p>
        <button
          type="button"
          onClick={copy}
          className="shrink-0 rounded-lg bg-slate-200 px-3 py-1 text-xs font-semibold text-slate-700 hover:bg-slate-300 transition"
        >
          {copied ? "Copied!" : "Copy"}
        </button>
      </div>
    </div>
  );
}

export function CampaignWizard({
  locations,
  appUrl,
}: {
  locations: Location[];
  appUrl: string;
}) {
  const [step, setStep] = useState(0);
  const [saved, setSaved] = useState(false);
  const [isPending, startTransition] = useTransition();

  const [selectedLocationId, setSelectedLocationId] = useState(locations[0]?.id ?? "");
  const selectedLocation = locations.find((l) => l.id === selectedLocationId) ?? locations[0];
  const profile = selectedLocation?.publicProfile;

  const [ratingStyle, setRatingStyle] = useState(profile?.funnelRatingStyle ?? "stars");
  const [promptTitle, setPromptTitle] = useState(
    profile?.funnelPromptTitle ?? `How was your experience with ${selectedLocation?.name}?`
  );
  const [promptBody, setPromptBody] = useState(
    profile?.funnelPromptBody ?? "Share a quick rating below."
  );
  const [emailSubject, setEmailSubject] = useState(`How was your experience at ${selectedLocation?.name}?`);
  const [messageBody, setMessageBody] = useState(
    `Hi {name}, thanks for visiting ${selectedLocation?.name}. We'd love to hear your feedback!`
  );
  const [filterEnabled, setFilterEnabled] = useState(profile?.negativeFilterEnabled ?? false);
  const [threshold, setThreshold] = useState(profile?.negativeFilterThreshold ?? 4);
  const [positiveReviewDestination, setPositiveReviewDestination] = useState(profile?.positiveReviewDestination ?? "GOOGLE");

  const funnelUrl = `${appUrl}/f/${selectedLocation?.slug}`;

  function handleSave() {
    startTransition(async () => {
      const fd = new FormData();
      fd.append("locationId", selectedLocationId);
      fd.append("funnelRatingStyle", ratingStyle);
      fd.append("funnelPromptTitle", promptTitle);
      fd.append("funnelPromptBody", promptBody);
      fd.append("negativeFilterEnabled", String(filterEnabled));
      fd.append("negativeFilterThreshold", String(threshold));
      fd.append("positiveReviewDestination", positiveReviewDestination);
      await saveCampaignWizard(fd);
      setSaved(true);
    });
  }

  const inputClass =
    "w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-900 focus:border-indigo-400 focus:outline-none focus:ring-2 focus:ring-indigo-100";

  return (
    <div className="grid gap-8 xl:grid-cols-[1fr_280px]">
      {/* Left: Wizard */}
      <div className="space-y-6">
        {/* Step indicators */}
        <div className="flex items-center gap-0">
          {STEPS.map((s, i) => (
            <div key={s.id} className="flex items-center">
              <button
                type="button"
                onClick={() => i < step || saved ? setStep(i) : undefined}
                className={`flex items-center gap-2 rounded-2xl px-3 py-2 text-sm font-semibold transition ${
                  i === step
                    ? "bg-indigo-600 text-white"
                    : i < step
                    ? "bg-slate-100 text-slate-700 hover:bg-slate-200 cursor-pointer"
                    : "text-slate-400 cursor-default"
                }`}
                style={i === step ? { color: "white" } : {}}
              >
                <span>{s.icon}</span>
                <span className="hidden sm:inline">{s.label}</span>
              </button>
              {i < STEPS.length - 1 && (
                <div className={`h-px w-4 ${i < step ? "bg-indigo-300" : "bg-slate-200"}`} />
              )}
            </div>
          ))}
        </div>

        {/* Step content */}
        <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">

          {/* Step 1: Location */}
          {step === 0 && (
            <div className="space-y-5">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.22em] text-indigo-600">Step 1 of 5</p>
                <h3 className="mt-2 text-2xl font-semibold text-slate-950">Select a location</h3>
                <p className="mt-2 text-sm text-slate-500">Choose which business location this campaign is for.</p>
              </div>
              <div className="space-y-3">
                {locations.map((loc) => (
                  <button
                    key={loc.id}
                    type="button"
                    onClick={() => {
                      setSelectedLocationId(loc.id);
                      const p = loc.publicProfile;
                      setRatingStyle(p?.funnelRatingStyle ?? "stars");
                      setPromptTitle(p?.funnelPromptTitle ?? `How was your experience with ${loc.name}?`);
                      setPromptBody(p?.funnelPromptBody ?? "Share a quick rating below.");
                      setFilterEnabled(p?.negativeFilterEnabled ?? false);
                      setThreshold(p?.negativeFilterThreshold ?? 4);
                      setPositiveReviewDestination(p?.positiveReviewDestination ?? "GOOGLE");
                    }}
                    className={`w-full rounded-2xl border p-4 text-left transition ${
                      loc.id === selectedLocationId
                        ? "border-indigo-300 bg-indigo-50"
                        : "border-slate-200 bg-slate-50 hover:border-slate-300 hover:bg-white"
                    }`}
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <p className="font-semibold text-slate-900">{loc.name}</p>
                        <p className="mt-1 text-sm text-slate-500">{loc.city}, {loc.state}</p>
                        <p className="mt-1 text-xs text-slate-400">/f/{loc.slug}</p>
                      </div>
                      {loc.id === selectedLocationId && (
                        <span className="rounded-full bg-indigo-600 px-2 py-1 text-[10px] font-semibold text-white" style={{ color: "white" }}>Selected</span>
                      )}
                    </div>
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Step 2: Appearance */}
          {step === 1 && (
            <div className="space-y-5">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.22em] text-indigo-600">Step 2 of 5</p>
                <h3 className="mt-2 text-2xl font-semibold text-slate-950">Appearance</h3>
                <p className="mt-2 text-sm text-slate-500">Customize what customers see on the funnel page. Preview updates live.</p>
              </div>
              <div className="space-y-4">
                <div>
                  <label className="mb-2 block text-sm font-semibold text-slate-700">Rating style</label>
                  <div className="grid grid-cols-3 gap-3">
                    {[
                      { value: "stars", label: "Stars", preview: "★★★★★" },
                      { value: "faces", label: "Faces", preview: "😞 😐 😊" },
                      { value: "thumbs", label: "Thumbs", preview: "👎 👍" },
                    ].map((opt) => (
                      <button
                        key={opt.value}
                        type="button"
                        onClick={() => {
                          setRatingStyle(opt.value);
                          if (opt.value === "thumbs") setThreshold(5);
                          else if (opt.value === "faces" && ![3, 5].includes(threshold)) setThreshold(5);
                        }}
                        className={`rounded-2xl border p-3 text-center transition ${
                          ratingStyle === opt.value
                            ? "border-indigo-300 bg-indigo-50"
                            : "border-slate-200 bg-slate-50 hover:border-slate-300"
                        }`}
                      >
                        <div className="text-xl">{opt.preview}</div>
                        <div className="mt-1 text-xs font-semibold text-slate-700">{opt.label}</div>
                      </button>
                    ))}
                  </div>
                </div>
                <div>
                  <label className="mb-2 block text-sm font-semibold text-slate-700">Headline</label>
                  <input
                    type="text"
                    value={promptTitle}
                    onChange={(e) => setPromptTitle(e.target.value)}
                    className={inputClass}
                    placeholder={`How was your experience with ${selectedLocation?.name}?`}
                  />
                </div>
                <div>
                  <label className="mb-2 block text-sm font-semibold text-slate-700">Subheading</label>
                  <textarea
                    rows={3}
                    value={promptBody}
                    onChange={(e) => setPromptBody(e.target.value)}
                    className={inputClass}
                    placeholder="Share a quick rating below."
                  />
                </div>
              </div>
            </div>
          )}

          {/* Step 3: Message */}
          {step === 2 && (
            <div className="space-y-5">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.22em] text-indigo-600">Step 3 of 5</p>
                <h3 className="mt-2 text-2xl font-semibold text-slate-950">Request message</h3>
                <p className="mt-2 text-sm text-slate-500">Used when sending review requests via Email or SMS through automations. Use <code className="rounded bg-slate-100 px-1">{"{name}"}</code> for the customer&apos;s name.</p>
              </div>
              <div className="space-y-4">
                <div>
                  <label className="mb-2 block text-sm font-semibold text-slate-700">Email subject</label>
                  <input
                    type="text"
                    value={emailSubject}
                    onChange={(e) => setEmailSubject(e.target.value)}
                    className={inputClass}
                    placeholder="How was your experience?"
                  />
                </div>
                <div>
                  <label className="mb-2 block text-sm font-semibold text-slate-700">Message body</label>
                  <textarea
                    rows={5}
                    value={messageBody}
                    onChange={(e) => setMessageBody(e.target.value)}
                    className={inputClass}
                  />
                </div>
                <div className="rounded-2xl border border-slate-100 bg-slate-50 p-4">
                  <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">Email preview</p>
                  <div className="mt-3 rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
                    <p className="text-xs text-slate-400">Subject: <span className="font-semibold text-slate-700">{emailSubject}</span></p>
                    <div className="mt-3 border-t border-slate-100 pt-3">
                      <p className="whitespace-pre-wrap text-sm leading-7 text-slate-700">{messageBody}</p>
                      <div className="mt-4 inline-block rounded-xl bg-indigo-600 px-5 py-2.5 text-sm font-semibold text-white" style={{ color: "white" }}>
                        Leave a review →
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Step 4: Review Filter */}
          {step === 3 && (
            <div className="space-y-5">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.22em] text-indigo-600">Step 4 of 5</p>
                <h3 className="mt-2 text-2xl font-semibold text-slate-950">Review filter</h3>
                <p className="mt-2 text-sm text-slate-500">Control how ratings are routed. This applies to your live funnel page.</p>
              </div>

              <div className="grid gap-3 sm:grid-cols-2">
                <button
                  type="button"
                  onClick={() => setFilterEnabled(false)}
                  className={`rounded-2xl border p-5 text-left transition ${
                    !filterEnabled ? "border-indigo-300 bg-indigo-50" : "border-slate-200 bg-slate-50 hover:border-slate-300"
                  }`}
                >
                  <div className="text-2xl">⭐</div>
                  <p className="mt-2 font-semibold text-slate-900">Filter off</p>
                  <p className="mt-1 text-sm text-slate-500">All ratings go to Google. Maximum public reviews.</p>
                  <div className="mt-3 space-y-1.5">
                    <div className="flex items-center gap-2 text-xs text-slate-600">
                      <span>{ratingStyle === "faces" ? "😞 😐 😊" : ratingStyle === "thumbs" ? "👎 👍" : "1-5★"}</span>
                      <span>→</span>
                      <span className="font-semibold text-indigo-600">Google review</span>
                    </div>
                  </div>
                </button>

                <button
                  type="button"
                  onClick={() => setFilterEnabled(true)}
                  className={`rounded-2xl border p-5 text-left transition ${
                    filterEnabled ? "border-indigo-300 bg-indigo-50" : "border-slate-200 bg-slate-50 hover:border-slate-300"
                  }`}
                >
                  <div className="text-2xl">🔀</div>
                  <p className="mt-2 font-semibold text-slate-900">Filter on</p>
                  <p className="mt-1 text-sm text-slate-500">Low ratings stay private in WHY. High ratings go to Google.</p>
                  <div className="mt-3 space-y-1.5">
                    <div className="flex items-center gap-2 text-xs text-slate-600">
                      <span className="text-orange-600">
                        {ratingStyle === "thumbs" ? "👎" : ratingStyle === "faces" ? (threshold >= 5 ? "😞 😐" : "😞") : `Below ${threshold}★`}
                      </span>
                      <span>→</span>
                      <span className="font-semibold text-orange-600">Private in WHY</span>
                    </div>
                    <div className="flex items-center gap-2 text-xs text-slate-600">
                      <span className="text-indigo-600">
                        {ratingStyle === "thumbs" ? "👍" : ratingStyle === "faces" ? (threshold >= 5 ? "😊" : "😐 😊") : `${threshold}★ and above`}
                      </span>
                      <span>→</span>
                      <span className="font-semibold text-indigo-600">Google review</span>
                    </div>
                  </div>
                </button>
              </div>

              {filterEnabled && ratingStyle === "stars" && (
                <div className="rounded-2xl border border-indigo-100 bg-indigo-50 p-4">
                  <label className="mb-3 block text-sm font-semibold text-slate-700">
                    Threshold — send to Google at <span className="text-indigo-600">{threshold} stars</span> and above
                  </label>
                  <input
                    type="range"
                    min={2}
                    max={5}
                    value={threshold}
                    onChange={(e) => setThreshold(Number(e.target.value))}
                    className="w-full accent-indigo-600"
                  />
                  <div className="mt-2 flex justify-between text-xs text-slate-500">
                    <span>2★ (strict)</span>
                    <span>3★</span>
                    <span>4★ (default)</span>
                    <span>5★ (only perfect)</span>
                  </div>
                  <p className="mt-3 text-xs text-slate-500">
                    Reviews below {threshold}★ are saved privately in WHY and can be shown in your review widget alongside Google reviews.
                  </p>
                </div>
              )}

              {filterEnabled && ratingStyle === "faces" && (
                <div className="rounded-2xl border border-indigo-100 bg-indigo-50 p-4">
                  <p className="mb-3 text-sm font-semibold text-slate-700">Which faces go to Google?</p>
                  <div className="grid grid-cols-2 gap-3">
                    <button
                      type="button"
                      onClick={() => setThreshold(5)}
                      className={`rounded-2xl border p-3 text-center transition ${threshold >= 5 ? "border-indigo-300 bg-white" : "border-slate-200 bg-white/60 hover:border-slate-300"}`}
                    >
                      <div className="text-2xl">😊</div>
                      <div className="mt-1 text-xs font-semibold text-slate-700">Only happy</div>
                      <div className="mt-0.5 text-xs text-slate-400">😞 😐 → Private</div>
                    </button>
                    <button
                      type="button"
                      onClick={() => setThreshold(3)}
                      className={`rounded-2xl border p-3 text-center transition ${threshold < 5 ? "border-indigo-300 bg-white" : "border-slate-200 bg-white/60 hover:border-slate-300"}`}
                    >
                      <div className="text-2xl">😐 😊</div>
                      <div className="mt-1 text-xs font-semibold text-slate-700">Neutral + happy</div>
                      <div className="mt-0.5 text-xs text-slate-400">😞 → Private</div>
                    </button>
                  </div>
                </div>
              )}

              {filterEnabled && ratingStyle === "thumbs" && (
                <div className="rounded-2xl border border-indigo-100 bg-indigo-50 p-4">
                  <p className="mb-2 text-sm font-semibold text-slate-700">Fixed threshold</p>
                  <div className="space-y-1.5">
                    <div className="flex items-center gap-2 text-sm text-slate-600">
                      <span>👎</span><span>→</span><span className="font-semibold text-orange-600">Private in WHY</span>
                    </div>
                    <div className="flex items-center gap-2 text-sm text-slate-600">
                      <span>👍</span><span>→</span><span className="font-semibold text-indigo-600">Google review</span>
                    </div>
                  </div>
                  <p className="mt-3 text-xs text-slate-500">With thumbs, negative feedback stays private and positive goes to Google automatically.</p>
                </div>
              )}

              {/* Positive review destination — where HIGH ratings go */}
              <div className="border-t border-slate-100 pt-5">
                <p className="text-sm font-semibold text-slate-900">Where do positive reviews go?</p>
                <p className="mt-1 text-sm text-slate-500">For high ratings, choose Google or capture a first-party review inside WeHearYou. Low ratings always stay in private feedback.</p>
                <div className="mt-3 grid gap-3 sm:grid-cols-2">
                  <button
                    type="button"
                    onClick={() => setPositiveReviewDestination("GOOGLE")}
                    className={`rounded-2xl border p-5 text-left transition ${
                      positiveReviewDestination !== "WEHEARYOU" ? "border-indigo-300 bg-indigo-50" : "border-slate-200 bg-slate-50 hover:border-slate-300"
                    }`}
                  >
                    <div className="text-2xl">🟦</div>
                    <p className="mt-2 font-semibold text-slate-900">Send happy customers to Google</p>
                    <p className="mt-1 text-sm text-slate-500">Default. High ratings continue to your public Google review.</p>
                  </button>

                  <button
                    type="button"
                    onClick={() => setPositiveReviewDestination("WEHEARYOU")}
                    className={`rounded-2xl border p-5 text-left transition ${
                      positiveReviewDestination === "WEHEARYOU" ? "border-indigo-300 bg-indigo-50" : "border-slate-200 bg-slate-50 hover:border-slate-300"
                    }`}
                  >
                    <div className="text-2xl">💬</div>
                    <p className="mt-2 font-semibold text-slate-900">Collect the review inside WeHearYou</p>
                    <p className="mt-1 text-sm text-slate-500">High ratings open a first-party review form (/f/your-slug/review) instead of Google.</p>
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* Step 5: Share */}
          {step === 4 && (
            <div className="space-y-5">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.22em] text-indigo-600">Step 5 of 5</p>
                <h3 className="mt-2 text-2xl font-semibold text-slate-950">Share your funnel</h3>
                <p className="mt-2 text-sm text-slate-500">Everything is ready. Share your funnel link, download the QR code, or copy the NFC URL.</p>
              </div>

              {saved ? (
                <div className="rounded-2xl border border-emerald-200 bg-emerald-50 p-4">
                  <p className="text-sm font-semibold text-emerald-700">✓ Campaign saved successfully</p>
                  <p className="mt-1 text-xs text-emerald-600">Your funnel page is live and updated.</p>
                </div>
              ) : (
                <div className="rounded-2xl border border-amber-200 bg-amber-50 p-4">
                  <p className="text-sm font-semibold text-amber-700">Save your campaign first</p>
                  <p className="mt-1 text-xs text-amber-600">Click save below to apply all your settings to the live funnel.</p>
                </div>
              )}

              <div className="space-y-4">
                <CopyField label="Funnel URL" value={funnelUrl} />
                <CopyField label="NFC / Short link" value={funnelUrl} />

                <div>
                  <p className="mb-3 text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">QR Code</p>
                  <QRCodeDisplay url={funnelUrl} />
                </div>

                <div className="flex gap-3 pt-2">
                  <a
                    href={funnelUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm font-semibold text-slate-700 shadow-sm hover:bg-slate-50 transition"
                  >
                    Open live funnel ↗
                  </a>
                  <a
                    href={`/funnel-preview?location=${selectedLocationId}`}
                    className="rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm font-semibold text-slate-700 shadow-sm hover:bg-slate-50 transition"
                  >
                    Open preview
                  </a>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Navigation */}
        <div className="flex items-center justify-between">
          <button
            type="button"
            onClick={() => setStep((s) => Math.max(0, s - 1))}
            disabled={step === 0}
            className="rounded-2xl border border-slate-200 bg-white px-5 py-3 text-sm font-semibold text-slate-700 shadow-sm disabled:opacity-40 hover:bg-slate-50 transition"
          >
            ← Back
          </button>

          <div className="flex gap-3">
            {step < 4 ? (
              <button
                type="button"
                onClick={() => setStep((s) => Math.min(4, s + 1))}
                className="rounded-2xl bg-indigo-600 px-5 py-3 text-sm font-semibold text-white shadow-sm hover:bg-indigo-700 transition"
                style={{ color: "white" }}
              >
                Next →
              </button>
            ) : (
              <button
                type="button"
                onClick={handleSave}
                disabled={isPending}
                className="rounded-2xl bg-slate-950 px-5 py-3 text-sm font-semibold text-white shadow-sm hover:bg-slate-800 transition disabled:opacity-60"
                style={{ color: "white" }}
              >
                {isPending ? "Saving..." : saved ? "Saved ✓" : "Save campaign"}
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Right: Live phone preview */}
      <div className="hidden xl:block">
        <div className="sticky top-6 space-y-4">
          <p className="text-center text-xs font-semibold uppercase tracking-[0.22em] text-slate-400">Live preview</p>
          <PhonePreview
            title={promptTitle}
            body={promptBody}
            ratingStyle={ratingStyle}
            filterEnabled={filterEnabled}
            threshold={threshold}
            locationName={selectedLocation?.name ?? ""}
          />
          <p className="text-center text-xs text-slate-400">{selectedLocation?.name}</p>
        </div>
      </div>
    </div>
  );
}
