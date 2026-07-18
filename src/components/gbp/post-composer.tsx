"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createGbpPostInline, updateGbpPostInline } from "@/app/gbp/posts/actions";

interface Location {
  id: string;
  name: string;
}

export interface EditPost {
  id: string;
  postType: "WHATS_NEW" | "EVENT" | "OFFER";
  content: string;
  locationId: string;
  imageUrl?: string | null;
}

interface PostComposerProps {
  locations: Location[];
  onClose: () => void;
  editPost?: EditPost;
}

const POST_TYPES = [
  { key: "WHATS_NEW", label: "Update", desc: "Share news, hours, events, or anything new", icon: "📣" },
  { key: "EVENT", label: "Event", desc: "Promote an upcoming event with dates", icon: "📅" },
  { key: "OFFER", label: "Offer", desc: "Highlight a deal, discount, or promo", icon: "🏷️" },
] as const;

const CTA_OPTIONS = ["Learn more", "Book", "Order online", "Shop", "Sign up", "Call now"];

export function PostComposer({ locations, onClose, editPost }: PostComposerProps) {
  const router = useRouter();
  const [postType, setPostType] = useState<"WHATS_NEW" | "EVENT" | "OFFER">(editPost?.postType ?? "WHATS_NEW");
  const [locationId, setLocationId] = useState(editPost?.locationId ?? locations[0]?.id ?? "");
  const [title, setTitle] = useState("");
  const [body, setBody] = useState(editPost?.content ?? "");
  const [cta, setCta] = useState("Learn more");
  const [ctaUrl, setCtaUrl] = useState("");
  const [offerStartDate, setOfferStartDate] = useState("");
  const [offerStartTime, setOfferStartTime] = useState("");
  const [offerEndDate, setOfferEndDate] = useState("");
  const [offerEndTime, setOfferEndTime] = useState("");
  const [offerCoupon, setOfferCoupon] = useState("");
  const [offerRedeemUrl, setOfferRedeemUrl] = useState("");
  const [offerTerms, setOfferTerms] = useState("");
  const [mode, setMode] = useState<"publish" | "schedule">("publish");
  const [scheduledAt, setScheduledAt] = useState("");
  const [confirm, setConfirm] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const isEditing = !!editPost;
  const valid = body.trim().length > 5;
  const canSchedule = mode === "schedule" ? !!scheduledAt : true;

  const offerDateError =
    postType === "OFFER" && offerStartDate && offerEndDate && offerEndDate < offerStartDate
      ? "End date must be on or after start date."
      : postType === "OFFER" && ((offerStartDate && !offerEndDate) || (!offerStartDate && offerEndDate))
      ? "Both start and end date are required."
      : null;
  const locationName = locations.find((l) => l.id === locationId)?.name ?? "All locations";

  const buildFormData = (publishNow: boolean) => {
    const fd = new FormData();
    if (isEditing) fd.set("postId", editPost.id);
    fd.set("locationId", locationId);
    fd.set("postType", postType);
    fd.set("content", body.trim());
    fd.set("ctaType", cta.toUpperCase().replace(/\s+/g, "_"));
    if (ctaUrl) fd.set("ctaUrl", ctaUrl);
    if (title) fd.set("title", title);
    if (postType === "OFFER") {
      if (offerStartDate) fd.set("offerStartDate", offerStartDate);
      if (offerStartTime) fd.set("offerStartTime", offerStartTime);
      if (offerEndDate) fd.set("offerEndDate", offerEndDate);
      if (offerEndTime) fd.set("offerEndTime", offerEndTime);
      if (offerCoupon) fd.set("offerCouponCode", offerCoupon);
      if (offerRedeemUrl) fd.set("offerRedeemUrl", offerRedeemUrl);
      if (offerTerms) fd.set("offerTerms", offerTerms);
    }
    fd.set("publishNow", publishNow ? "true" : "false");
    if (!publishNow && scheduledAt) fd.set("scheduledAt", scheduledAt);
    return fd;
  };

  const handleSaveDraft = async () => {
    setIsSubmitting(true);
    setError(null);
    try {
      const fd = buildFormData(false);
      const result = isEditing
        ? await updateGbpPostInline(fd)
        : await createGbpPostInline(fd);
      if (result.success) { router.refresh(); onClose(); }
      else setError(result.error ?? "Failed to save");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handlePublish = async () => {
    setIsSubmitting(true);
    setError(null);
    try {
      const fd = buildFormData(mode === "publish");
      const result = isEditing
        ? await updateGbpPostInline(fd)
        : await createGbpPostInline(fd);
      if (result.success) { router.refresh(); onClose(); }
      else setError(result.error ?? "Failed to publish");
    } finally {
      setIsSubmitting(false);
      setConfirm(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-[300] flex justify-end"
      style={{ background: "rgba(12,12,16,.5)", backdropFilter: "blur(3px)", animation: "fadeIn .16s ease both" }}
      onClick={onClose}
    >
      <div
        className="flex h-full flex-col bg-white shadow-2xl"
        style={{ width: "min(860px, 96vw)", animation: "slideIn .24s cubic-bezier(.2,.7,.2,1) both" }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center gap-3 border-b border-slate-200 px-6 py-4">
          <svg className="h-4.5 w-4.5 text-[#37aeb7]" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M3 11l19-9-9 19-2-8-8-2z"/>
          </svg>
          <h2 className="text-[16.5px] font-[660] tracking-tight text-slate-950">{isEditing ? "Edit post" : "New Google post"}</h2>
          <button
            className="ml-auto rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-700 transition"
            onClick={onClose}
          >
            <svg className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
            </svg>
          </button>
        </div>

        {/* Body: form + preview */}
        <div className="flex min-h-0 flex-1 overflow-y-auto">
          {/* Form */}
          <div className="flex flex-1 flex-col gap-5 overflow-y-auto border-r border-slate-150 p-6">
            {/* Post type */}
            <div>
              <p className="mb-2.5 text-[11px] font-bold uppercase tracking-[0.16em] text-slate-500">Post type</p>
              <div className="grid grid-cols-3 gap-2.5">
                {POST_TYPES.map((pt) => (
                  <button
                    key={pt.key}
                    onClick={() => setPostType(pt.key)}
                    className="tap rounded-xl p-3 text-left transition"
                    style={{
                      border: postType === pt.key ? "1.5px solid #37aeb7" : "1px solid #e5e7eb",
                      background: postType === pt.key ? "#f0f8f9" : "#fff",
                    }}
                  >
                    <span className="text-lg">{pt.icon}</span>
                    <div className="mt-1.5 text-[13px] font-semibold text-slate-900">{pt.label}</div>
                    <div className="mt-0.5 text-[11px] leading-[1.4] text-slate-400">{pt.desc}</div>
                  </button>
                ))}
              </div>
              <p className="mt-2 flex items-center gap-1 text-[11px] text-slate-400">
                <svg className="h-3 w-3 shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><line x1="12" y1="16" x2="12" y2="12"/><line x1="12" y1="8" x2="12.01" y2="8"/></svg>
                Product posts aren&apos;t available — Google doesn&apos;t support creating them via the API.
              </p>
            </div>

            {/* Location */}
            <label className="flex flex-col gap-2">
              <span className="text-[11.5px] font-semibold text-slate-500">Location</span>
              <div className="flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-3 py-2.5">
                <svg className="h-3.5 w-3.5 shrink-0 text-slate-400" viewBox="0 0 24 24" fill="currentColor"><path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7zm0 9.5c-1.38 0-2.5-1.12-2.5-2.5s1.12-2.5 2.5-2.5 2.5 1.12 2.5 2.5-1.12 2.5-2.5 2.5z"/></svg>
                <select
                  value={locationId}
                  onChange={(e) => setLocationId(e.target.value)}
                  className="flex-1 appearance-none bg-transparent text-sm text-slate-900 focus:outline-none"
                >
                  {locations.map((l) => <option key={l.id} value={l.id}>{l.name}</option>)}
                </select>
              </div>
            </label>

            {/* Title (Event/Offer only) */}
            {(postType === "EVENT" || postType === "OFFER") && (
              <label className="flex flex-col gap-2">
                <span className="text-[11.5px] font-semibold text-slate-500">
                  {postType === "EVENT" ? "Event title" : "Offer title"}
                </span>
                <input
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  className="rounded-lg border border-slate-200 px-3 py-2.5 text-sm text-slate-900 focus:border-[#37aeb7] focus:outline-none focus:ring-2 focus:ring-[#37aeb7]/20"
                  placeholder={postType === "EVENT" ? "Free Kids' Dental Day" : "$99 New Patient Exam"}
                />
              </label>
            )}

            {/* Body */}
            <label className="flex flex-col gap-2">
              <span className="flex items-center justify-between text-[11.5px] font-semibold text-slate-500">
                <span>Post text</span>
                <span className="font-normal tabular-nums text-slate-400">{body.length}/1500</span>
              </span>
              <textarea
                value={body}
                onChange={(e) => setBody(e.target.value)}
                rows={5}
                maxLength={1500}
                placeholder="Share an update, news, or what's new…"
                className="rounded-lg border border-slate-200 px-3 py-2.5 text-sm leading-relaxed text-slate-900 focus:border-[#37aeb7] focus:outline-none focus:ring-2 focus:ring-[#37aeb7]/20 resize-none"
              />
            </label>

            {/* Offer details */}
            {postType === "OFFER" && (
              <div className="flex flex-col gap-3.5 rounded-xl border border-amber-200 bg-amber-50/60 p-4">
                <p className="text-[11px] font-bold uppercase tracking-[0.16em] text-amber-700">Offer details</p>

                {/* Dates */}
                <div className="grid grid-cols-2 gap-3">
                  <label className="flex flex-col gap-1.5">
                    <span className="text-[11.5px] font-semibold text-slate-500">Start date</span>
                    <input
                      type="date"
                      value={offerStartDate}
                      onChange={(e) => setOfferStartDate(e.target.value)}
                      className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 focus:border-[#37aeb7] focus:outline-none focus:ring-2 focus:ring-[#37aeb7]/20"
                    />
                  </label>
                  <label className="flex flex-col gap-1.5">
                    <span className="text-[11.5px] font-semibold text-slate-500">Start time <span className="font-normal text-slate-400">(optional)</span></span>
                    <input
                      type="time"
                      value={offerStartTime}
                      onChange={(e) => setOfferStartTime(e.target.value)}
                      className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 focus:border-[#37aeb7] focus:outline-none focus:ring-2 focus:ring-[#37aeb7]/20"
                    />
                  </label>
                  <label className="flex flex-col gap-1.5">
                    <span className="text-[11.5px] font-semibold text-slate-500">End date</span>
                    <input
                      type="date"
                      value={offerEndDate}
                      onChange={(e) => setOfferEndDate(e.target.value)}
                      className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 focus:border-[#37aeb7] focus:outline-none focus:ring-2 focus:ring-[#37aeb7]/20"
                    />
                  </label>
                  <label className="flex flex-col gap-1.5">
                    <span className="text-[11.5px] font-semibold text-slate-500">End time <span className="font-normal text-slate-400">(optional)</span></span>
                    <input
                      type="time"
                      value={offerEndTime}
                      onChange={(e) => setOfferEndTime(e.target.value)}
                      className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 focus:border-[#37aeb7] focus:outline-none focus:ring-2 focus:ring-[#37aeb7]/20"
                    />
                  </label>
                </div>

                {offerDateError && (
                  <p className="flex items-center gap-1.5 text-[12px] font-medium text-red-600">
                    <svg className="h-3.5 w-3.5 shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>
                    {offerDateError}
                  </p>
                )}

                {/* Coupon */}
                <label className="flex flex-col gap-1.5">
                  <span className="text-[11.5px] font-semibold text-slate-500">Coupon code <span className="font-normal text-slate-400">(optional)</span></span>
                  <input
                    value={offerCoupon}
                    onChange={(e) => setOfferCoupon(e.target.value)}
                    className="rounded-lg border border-slate-200 bg-white px-3 py-2.5 font-mono text-sm text-slate-900 focus:border-[#37aeb7] focus:outline-none focus:ring-2 focus:ring-[#37aeb7]/20"
                    placeholder="SMILE99"
                  />
                </label>

                {/* Redeem URL */}
                <label className="flex flex-col gap-1.5">
                  <span className="text-[11.5px] font-semibold text-slate-500">Link to redeem offer <span className="font-normal text-slate-400">(optional)</span></span>
                  <input
                    type="url"
                    value={offerRedeemUrl}
                    onChange={(e) => setOfferRedeemUrl(e.target.value)}
                    className="rounded-lg border border-slate-200 bg-white px-3 py-2.5 text-sm text-slate-900 focus:border-[#37aeb7] focus:outline-none focus:ring-2 focus:ring-[#37aeb7]/20"
                    placeholder="https://example.com/redeem"
                  />
                </label>

                {/* Terms */}
                <label className="flex flex-col gap-1.5">
                  <span className="text-[11.5px] font-semibold text-slate-500">Terms and conditions <span className="font-normal text-slate-400">(optional)</span></span>
                  <textarea
                    value={offerTerms}
                    onChange={(e) => setOfferTerms(e.target.value)}
                    rows={2}
                    placeholder="e.g. Valid for new patients only. Cannot be combined with other offers."
                    className="rounded-lg border border-slate-200 bg-white px-3 py-2.5 text-sm leading-relaxed text-slate-900 focus:border-[#37aeb7] focus:outline-none focus:ring-2 focus:ring-[#37aeb7]/20 resize-none"
                  />
                </label>
              </div>
            )}

            {/* CTA */}
            <label className="flex flex-col gap-2">
              <span className="text-[11.5px] font-semibold text-slate-500">Button (call to action)</span>
              <select
                value={cta}
                onChange={(e) => setCta(e.target.value)}
                className="rounded-lg border border-slate-200 px-3 py-2.5 text-sm text-slate-900 focus:border-[#37aeb7] focus:outline-none"
              >
                {CTA_OPTIONS.map((c) => <option key={c} value={c}>{c}</option>)}
              </select>
            </label>

            {/* CTA URL */}
            <label className="flex flex-col gap-2">
              <span className="text-[11.5px] font-semibold text-slate-500">Button URL <span className="font-normal text-slate-400">(optional)</span></span>
              <input
                type="url"
                value={ctaUrl}
                onChange={(e) => setCtaUrl(e.target.value)}
                className="rounded-lg border border-slate-200 px-3 py-2.5 text-sm text-slate-900 focus:border-[#37aeb7] focus:outline-none focus:ring-2 focus:ring-[#37aeb7]/20"
                placeholder="https://example.com/book"
              />
            </label>

            {/* Photo */}
            <div>
              <p className="mb-2.5 text-[11px] font-bold uppercase tracking-[0.16em] text-slate-500">Photo</p>
              <div className="flex h-24 cursor-pointer items-center justify-center rounded-xl border-2 border-dashed border-slate-300 bg-slate-50 text-slate-400 hover:border-[#37aeb7]/50 hover:text-[#37aeb7] transition">
                <div className="text-center">
                  <svg className="mx-auto h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="3" width="18" height="18" rx="2"/><circle cx="8.5" cy="8.5" r="1.5"/><polyline points="21 15 16 10 5 21"/></svg>
                  <p className="mt-1 text-[12px]">Drag a photo or click to upload</p>
                </div>
              </div>
            </div>

            {/* Publish toggle */}
            <div>
              <p className="mb-2.5 text-[11px] font-bold uppercase tracking-[0.16em] text-slate-500">Publish</p>
              <div className="mb-3 flex overflow-hidden rounded-lg border border-slate-200 bg-slate-50">
                {(["publish", "schedule"] as const).map((m) => (
                  <button
                    key={m}
                    onClick={() => setMode(m)}
                    className={`flex flex-1 items-center justify-center gap-1.5 py-2 text-sm font-semibold transition ${
                      mode === m ? "bg-[#37aeb7] text-white" : "text-slate-600 hover:bg-slate-100"
                    }`}
                  >
                    {m === "publish" ? (
                      <><svg className="h-3.5 w-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"/></svg>Publish now</>
                    ) : (
                      <><svg className="h-3.5 w-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="4" width="18" height="18" rx="2" ry="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg>Schedule</>
                    )}
                  </button>
                ))}
              </div>
              {mode === "schedule" && (
                <input
                  type="datetime-local"
                  value={scheduledAt}
                  onChange={(e) => setScheduledAt(e.target.value)}
                  className="w-full rounded-lg border border-slate-200 px-3 py-2.5 text-sm text-slate-900 focus:border-[#37aeb7] focus:outline-none"
                />
              )}
            </div>
          </div>

          {/* Preview */}
          <div className="hidden w-[360px] shrink-0 flex-col gap-4 bg-slate-50 p-6 md:flex">
            <p className="text-[11px] font-bold uppercase tracking-[0.16em] text-slate-500">Preview on Google</p>
            <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-md">
              <div
                className="flex h-32 items-center justify-center text-white/50"
                style={{
                  background: postType === "OFFER"
                    ? "linear-gradient(135deg, hsl(40 60% 40%), hsl(25 55% 28%))"
                    : postType === "EVENT"
                    ? "linear-gradient(135deg, hsl(150 48% 38%), hsl(165 52% 24%))"
                    : "linear-gradient(135deg, hsl(188 48% 38%), hsl(200 52% 26%))",
                }}
              >
                <svg className="h-7 w-7" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="3" width="18" height="18" rx="2"/><circle cx="8.5" cy="8.5" r="1.5"/><polyline points="21 15 16 10 5 21"/></svg>
              </div>
              <div className="p-3.5">
                {(postType === "OFFER" || postType === "EVENT") && title && (
                  <p className="mb-1.5 text-[14px] font-[680] text-slate-900">{title}</p>
                )}
                {postType === "OFFER" && (
                  <div className="mb-2 flex flex-col gap-1">
                    <span className="inline-flex items-center gap-1 rounded-md bg-amber-100 px-2 py-0.5 text-[11px] font-semibold text-amber-800">
                      🏷️ Offer{offerCoupon ? ` · ${offerCoupon}` : ""}
                    </span>
                    {(offerStartDate || offerEndDate) && (
                      <span className="text-[11px] text-slate-400">
                        {offerStartDate || "?"} {offerStartTime ? `${offerStartTime} ` : ""}– {offerEndDate || "?"}{offerEndTime ? ` ${offerEndTime}` : ""}
                      </span>
                    )}
                  </div>
                )}
                {postType === "EVENT" && (
                  <span className="mb-2 inline-flex items-center gap-1 rounded-md bg-[#e0f2f4] px-2 py-0.5 text-[11px] font-semibold text-[#2a8a92]">
                    📅 Event
                  </span>
                )}
                <p className="text-[12.8px] leading-relaxed text-slate-600">{body || "Your post text will appear here…"}</p>
                <button className="mt-3 inline-flex items-center gap-1 rounded-lg border border-slate-200 px-3 py-1.5 text-[12px] font-semibold text-[#4285f4]">
                  {cta}
                  <svg className="h-3 w-3" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"/><polyline points="15 3 21 3 21 9"/><line x1="10" y1="14" x2="21" y2="3"/></svg>
                </button>
              </div>
            </div>
            <p className="flex gap-1.5 text-[11px] leading-relaxed text-slate-400">
              <svg className="mt-0.5 h-3 w-3 shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><line x1="12" y1="16" x2="12" y2="12"/><line x1="12" y1="8" x2="12.01" y2="8"/></svg>
              Live posts appear on your Business Profile in Search and Maps. Standard posts expire after ~7 days unless renewed.
            </p>
          </div>
        </div>

        {/* Footer */}
        {error && <p className="border-t border-red-100 bg-red-50 px-6 py-2 text-xs font-medium text-red-600">{error}</p>}
        <div className="flex items-center gap-2.5 border-t border-slate-200 px-6 py-3.5">
          <span className="flex items-center gap-1.5 text-[11.5px] text-slate-400">
            <svg className="h-3 w-3" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="11" width="18" height="11" rx="2" ry="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/></svg>
            Nothing is sent to Google until you confirm
          </span>
          <button onClick={onClose} className="ml-auto rounded-lg px-4 py-2 text-sm font-semibold text-slate-600 hover:bg-slate-100 transition">Cancel</button>
          <button
            onClick={handleSaveDraft}
            disabled={!valid || !!offerDateError || isSubmitting}
            className="rounded-lg border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50 transition disabled:opacity-50"
          >
            Save draft
          </button>
          <button
            onClick={() => setConfirm(true)}
            disabled={!valid || !canSchedule || !!offerDateError || isSubmitting}
            className="inline-flex items-center gap-1.5 rounded-lg bg-[#37aeb7] px-4 py-2 text-sm font-semibold text-white hover:bg-[#2a8a92] transition disabled:opacity-50"
          >
            {mode === "schedule" ? (
              <><svg className="h-3.5 w-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="4" width="18" height="18" rx="2" ry="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg>Schedule post</>
            ) : (
              <><svg className="h-3.5 w-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"/></svg>Publish now</>
            )}
          </button>
        </div>
      </div>

      {/* Confirm dialog */}
      {confirm && (
        <div
          className="fixed inset-0 z-[400] flex items-center justify-center p-4"
          style={{ background: "rgba(0,0,0,.4)" }}
          onClick={() => setConfirm(false)}
        >
          <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-2xl" onClick={(e) => e.stopPropagation()}>
            <h3 className="text-base font-semibold text-slate-900">
              {mode === "schedule" ? "Schedule this post?" : "Publish this post to Google?"}
            </h3>
            <p className="mt-1 text-sm text-slate-500">
              This will {mode === "schedule" ? "queue a post to publish later" : "publish a post"} to <span className="font-medium text-slate-700">{locationName}</span>.
            </p>
            <div className="mt-3 rounded-lg border border-slate-100 bg-slate-50 px-3 py-2.5 text-[12.5px] text-slate-700">
              <span className="font-semibold">{POST_TYPES.find((p) => p.key === postType)?.label}</span>
              {title ? ` · ${title}` : ""}
              {mode === "schedule" && scheduledAt ? ` · ${scheduledAt.replace("T", " ")}` : ""}
            </div>
            <div className="mt-4 flex justify-end gap-2.5">
              <button onClick={() => setConfirm(false)} className="rounded-lg border border-slate-200 px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50 transition">Cancel</button>
              <button
                onClick={handlePublish}
                disabled={isSubmitting}
                className="inline-flex items-center gap-1.5 rounded-lg bg-[#37aeb7] px-4 py-2 text-sm font-semibold text-white hover:bg-[#2a8a92] transition disabled:opacity-50"
              >
                {isSubmitting ? "Publishing…" : mode === "schedule" ? "Confirm & schedule" : "Confirm & publish"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
