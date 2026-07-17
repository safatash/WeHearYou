# Review Requests & Links Redesign Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Redesign the review request form and review links pages with improved UX, better previews, and comprehensive analytics.

**Architecture:** Implement a two-phase redesign: (1) Review Request form with 4-step layout, two-pane preview, and live mobile preview; (2) Review Links page with source-tracked cards grid, SVG QR code, email signature preview, and enhanced analytics with sparklines. Both pages use modern component-based architecture with client-side interactivity for previews and state management.

**Tech Stack:** React 18, Next.js App Router (server + client components), TypeScript, Tailwind CSS, existing icon system (Lucide), QR code generation (existing qrcode library)

## Global Constraints

- Use existing CSS patterns and design system from current codebase
- Maintain backward compatibility with campaign data model
- Use Next.js server components for data fetching, client components for interactivity
- All form data must integrate with existing `createCampaign` server action
- Review links must work with existing database schema and analytics
- Mobile responsive: collapse multi-column layouts on tablets/mobile
- Copy-to-clipboard must use navigator.clipboard API with timeout feedback
- QR codes must be deterministic (same URL = same QR code)
- All new components must follow existing codebase naming and structure conventions

---

## Task 1: Create Review Request Component Library

**Files:**
- Create: `src/app/campaigns/new/components/rcard.tsx`
- Create: `src/app/campaigns/new/components/option-card.tsx`
- Create: `src/app/campaigns/new/components/message-preview.tsx`
- Create: `src/app/campaigns/new/components/send-summary.tsx`

**Interfaces:**
- Consumes: React, tailwind CSS utilities
- Produces:
  - `RCard`: `{ step: number; title: string; sub?: string; right?: ReactNode; children: ReactNode }`
  - `OptionCard`: `{ icon: string; title: string; desc: string; on: boolean; onClick: () => void; kind?: "radio" | "check" }`
  - `MessagePreview`: `{ type: "review" | "video"; channel: "sms" | "email"; subject?: string; sms?: string; sample: string; location: string }`
  - `SendSummary`: `{ type: string; location: string; channels: { sms: boolean; email: boolean }; recipients: number }`

- [ ] **Step 1: Create RCard component for step containers**

```typescript
// src/app/campaigns/new/components/rcard.tsx
import { ReactNode } from "react";

interface RCardProps {
  step: number;
  title: string;
  sub?: string;
  right?: ReactNode;
  children: ReactNode;
}

export function RCard({ step, title, sub, right, children }: RCardProps) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
      <div className="flex items-start justify-between gap-4 mb-5">
        <div className="flex items-start gap-3">
          <div className="flex h-8 w-8 items-center justify-center rounded-full bg-indigo-100 text-sm font-semibold text-indigo-600">
            {step}
          </div>
          <div>
            <h3 className="text-lg font-semibold text-slate-950">{title}</h3>
            {sub && <p className="mt-1 text-sm text-slate-600">{sub}</p>}
          </div>
        </div>
        {right}
      </div>
      {children}
    </div>
  );
}
```

- [ ] **Step 2: Create OptionCard component for selection cards**

```typescript
// src/app/campaigns/new/components/option-card.tsx
import { ReactNode } from "react";

interface OptionCardProps {
  icon?: string;
  title: string;
  desc: string;
  on: boolean;
  onClick: () => void;
  kind?: "radio" | "check";
}

export function OptionCard({ icon, title, desc, on, onClick, kind = "radio" }: OptionCardProps) {
  return (
    <button
      onClick={onClick}
      className={`text-left rounded-2xl border-2 p-4 transition ${
        on
          ? "border-indigo-300 bg-indigo-50"
          : "border-slate-200 bg-white hover:border-slate-300"
      }`}
    >
      <div className="flex items-start gap-3">
        {kind === "radio" ? (
          <div className={`mt-0.5 h-5 w-5 rounded-full border-2 ${on ? "border-indigo-600 bg-indigo-600" : "border-slate-300"}`} />
        ) : (
          <div className={`mt-0.5 h-5 w-5 rounded border-2 ${on ? "border-indigo-600 bg-indigo-600" : "border-slate-300"}`} />
        )}
        <div>
          <p className={`font-semibold ${on ? "text-indigo-900" : "text-slate-900"}`}>{title}</p>
          <p className={`mt-1 text-sm ${on ? "text-indigo-700" : "text-slate-600"}`}>{desc}</p>
        </div>
      </div>
    </button>
  );
}
```

- [ ] **Step 3: Create MessagePreview component for mobile preview**

```typescript
// src/app/campaigns/new/components/message-preview.tsx
"use client";

interface MessagePreviewProps {
  type: "review" | "video";
  channel: "sms" | "email";
  subject?: string;
  sms?: string;
  sample: string;
  location: string;
}

const DEFAULTS = {
  review: {
    subject: "How was your experience?",
    sms: "Thanks for choosing {location}. Would you take a moment to share your experience? It really helps.",
  },
  video: {
    subject: "Share your experience",
    sms: "Thanks for choosing {location}. Would you share a short video about your experience?",
  },
};

export function MessagePreview({
  type,
  channel,
  subject,
  sms,
  sample,
  location,
}: MessagePreviewProps) {
  const def = DEFAULTS[type];
  const subj = subject?.trim() || def.subject;
  const body = sms?.trim() || def.sms;
  const filledBody = body.replace("{location}", location).replace("{first}", sample);
  const filledSubj = subj.replace("{location}", location).replace("{first}", sample);

  return (
    <div className="mx-auto w-72 overflow-hidden rounded-3xl border-8 border-slate-900 bg-slate-900 shadow-xl">
      <div className="rounded-2xl bg-white">
        {/* Phone notch */}
        <div className="flex justify-center bg-slate-900 px-12 py-1">
          <div className="h-5 w-32 rounded-b-2xl bg-slate-900"></div>
        </div>

        {channel === "sms" ? (
          <div className="flex flex-col bg-slate-100 p-3">
            <div className="mb-3 flex items-center gap-2 rounded-lg bg-white p-3">
              <div className="h-8 w-8 rounded-full bg-indigo-600 flex items-center justify-center text-white text-sm">
                B
              </div>
              <div>
                <p className="text-xs font-semibold">Bright Smile</p>
                <p className="text-xs text-slate-500">Text message · now</p>
              </div>
            </div>
            <div className="rounded-2xl rounded-tl-sm bg-white p-3 text-sm text-slate-700">
              {filledBody}
            </div>
          </div>
        ) : (
          <div className="flex flex-col bg-white p-4">
            <div className="mb-3 border-b pb-3">
              <p className="text-xs text-slate-400">Bright Smile via Review</p>
              <p className="mt-1 text-sm font-semibold text-slate-900">{filledSubj}</p>
            </div>
            <div className="flex items-center gap-2 mb-3">
              <div className="h-6 w-6 rounded-lg bg-indigo-600 flex items-center justify-center text-white text-xs">
                B
              </div>
              <span className="text-sm font-semibold">Bright Smile</span>
            </div>
            <p className="text-xs text-slate-600 mb-2">Hi {sample},</p>
            <p className="text-xs text-slate-600 mb-3">{filledBody}</p>
            {type === "review" && (
              <div className="flex gap-1 mb-3">
                {[1, 2, 3, 4, 5].map((i) => (
                  <span key={i} className="text-base">⭐</span>
                ))}
              </div>
            )}
            <button className="w-full rounded-lg bg-indigo-600 py-2 text-center text-xs font-semibold text-white">
              {type === "review" ? "Leave a review" : "Record video"}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
```

- [ ] **Step 4: Create SendSummary component**

```typescript
// src/app/campaigns/new/components/send-summary.tsx
interface SendSummaryProps {
  type: string;
  location: string;
  channels: { sms: boolean; email: boolean };
  recipients: number;
}

export function SendSummary({
  type,
  location,
  channels,
  recipients,
}: SendSummaryProps) {
  const sends = recipients * ((channels.sms ? 1 : 0) + (channels.email ? 1 : 0));

  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
      <h3 className="text-sm font-semibold uppercase tracking-wider text-slate-600 mb-4">
        Send Summary
      </h3>
      <div className="space-y-3 text-sm">
        <div className="flex justify-between items-center border-t pt-3">
          <span className="text-slate-600">Type</span>
          <span className="font-semibold text-slate-900 capitalize">
            {type === "REVIEW" ? "Review request" : "Video testimonial"}
          </span>
        </div>
        <div className="flex justify-between items-center border-t pt-3">
          <span className="text-slate-600">Location</span>
          <span className="font-semibold text-slate-900">{location}</span>
        </div>
        <div className="flex justify-between items-center border-t pt-3">
          <span className="text-slate-600">Channels</span>
          <div className="flex gap-2">
            {channels.sms && (
              <span className="inline-block rounded-full bg-slate-100 px-2 py-1 text-xs font-medium text-slate-700">
                SMS
              </span>
            )}
            {channels.email && (
              <span className="inline-block rounded-full bg-slate-100 px-2 py-1 text-xs font-medium text-slate-700">
                Email
              </span>
            )}
          </div>
        </div>
        <div className="flex justify-between items-center border-t pt-3">
          <span className="text-slate-600">Recipients</span>
          <span className="font-bold text-lg text-slate-900">{recipients}</span>
        </div>
        <div className="flex justify-between items-center border-t pt-3">
          <span className="text-slate-600">Est. sends</span>
          <span className="font-bold text-lg text-slate-900">{sends}</span>
        </div>
      </div>
    </div>
  );
}
```

- [ ] **Step 5: Verify all components render correctly**

Run: `npm run dev` and navigate to `/campaigns/new` to ensure no console errors.

- [ ] **Step 6: Commit**

```bash
git add src/app/campaigns/new/components/
git commit -m "feat: add review request component library (RCard, OptionCard, MessagePreview, SendSummary)"
```

---

## Task 2: Redesign Review Request Form Page

**Files:**
- Modify: `src/app/campaigns/new/page.tsx`
- Create: `src/app/campaigns/new/campaign-form-client.tsx`
- Modify: `src/app/campaigns/new/recipient-picker.tsx` (integrate with new layout)

**Interfaces:**
- Consumes: RCard, OptionCard, MessagePreview, SendSummary components
- Produces: CampaignFormClient component that manages form state and integrates with createCampaign action

- [ ] **Step 1: Create campaign-form-client.tsx**

```typescript
// src/app/campaigns/new/campaign-form-client.tsx
"use client";

import { useState, useEffect } from "react";
import { createCampaign } from "@/app/campaigns/actions";
import Link from "next/link";
import { RCard } from "./components/rcard";
import { OptionCard } from "./components/option-card";
import { MessagePreview } from "./components/message-preview";
import { SendSummary } from "./components/send-summary";
import { RecipientPicker } from "./recipient-picker";

interface Contact {
  id: string;
  name: string;
  email: string | null;
  phone: string | null;
  locationId: string;
}

interface Location {
  id: string;
  name: string;
}

export function CampaignFormClient({
  contacts,
  locations,
}: {
  contacts: Contact[];
  locations: Location[];
}) {
  const [name, setName] = useState("Manual review request");
  const [destination, setDestination] = useState("REVIEW");
  const [locationId, setLocationId] = useState(locations[0]?.id || "");
  const [channels, setChannels] = useState({ sms: true, email: false });
  const [emailSubject, setEmailSubject] = useState("");
  const [messageBody, setMessageBody] = useState("");
  const [recipients, setRecipients] = useState<Contact[]>([]);
  const [previewChannel, setPreviewChannel] = useState<"sms" | "email">("sms");
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Adjust preview channel if selected channel becomes unavailable
  useEffect(() => {
    if (!channels[previewChannel]) {
      setPreviewChannel(channels.sms ? "sms" : "email");
    }
  }, [channels, previewChannel]);

  // Filter recipients to current location when location changes
  useEffect(() => {
    setRecipients((prev) =>
      prev.filter((r) => r.locationId === locationId || !contacts.some((c) => c.id === r.id))
    );
  }, [locationId, contacts]);

  const location = locations.find((l) => l.id === locationId);
  const anyChannel = channels.sms || channels.email;
  const canSend = anyChannel && recipients.length > 0;
  const sample = recipients[0]?.name.split(" ")[0] || "Alex";

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!canSend) return;

    setIsSubmitting(true);
    try {
      const formData = new FormData();
      formData.set("name", name);
      formData.set("destination", destination);
      formData.set("locationId", locationId);
      formData.set("channels", JSON.stringify(channels));
      formData.set("emailSubject", emailSubject);
      formData.set("messageBody", messageBody);
      formData.set("recipientIds", JSON.stringify(recipients.map((r) => r.id)));

      await createCampaign(formData);
      // Success - redirect handled by server
    } catch (error) {
      console.error("Error submitting campaign:", error);
      setIsSubmitting(false);
    }
  };

  return (
    <div className="max-w-5xl mx-auto px-6 py-8 pb-24">
      {/* Header */}
      <Link
        href="/campaigns"
        className="inline-flex items-center gap-2 mb-8 text-sm font-semibold text-indigo-600 hover:text-indigo-700"
      >
        ← Back to campaigns
      </Link>

      <div className="mb-8">
        <p className="text-sm font-semibold uppercase tracking-wide text-indigo-600 mb-2">
          Campaigns
        </p>
        <h1 className="text-4xl font-bold tracking-tight text-slate-950 mb-2">
          Send review requests
        </h1>
        <p className="text-base text-slate-600 max-w-2xl">
          Create a one-off campaign to request reviews or video testimonials from your customers.
        </p>
      </div>

      {/* Two-pane layout */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 mb-8">
        {/* Left: Form */}
        <form onSubmit={handleSubmit} className="lg:col-span-2 space-y-6">
          {/* Step 1: Campaign */}
          <RCard step={1} title="Campaign" sub="Name it and choose what you're asking for.">
            <div className="space-y-4">
              <label className="block">
                <span className="text-sm font-semibold text-slate-700 block mb-2">
                  Campaign name
                </span>
                <input
                  type="text"
                  name="name"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="e.g. Post-visit review request"
                  className="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm font-normal text-slate-700 focus:border-indigo-300 focus:outline-none focus:ring-2 focus:ring-indigo-100"
                />
              </label>

              <div>
                <span className="text-sm font-semibold text-slate-700 block mb-3">
                  Request type
                </span>
                <div className="grid grid-cols-2 gap-3">
                  <OptionCard
                    title="Review request"
                    desc="Ask for a star review on your sites"
                    on={destination === "REVIEW"}
                    onClick={() => setDestination("REVIEW")}
                  />
                  <OptionCard
                    title="Video testimonial"
                    desc="Ask for a short recorded video"
                    on={destination === "VIDEO_TESTIMONIAL"}
                    onClick={() => setDestination("VIDEO_TESTIMONIAL")}
                  />
                </div>
              </div>
            </div>
          </RCard>

          {/* Step 2: Sending */}
          <RCard step={2} title="Sending" sub="Where it comes from and how it's delivered.">
            <div className="space-y-4">
              <label className="block">
                <span className="text-sm font-semibold text-slate-700 block mb-2">
                  Sending location
                </span>
                <select
                  value={locationId}
                  onChange={(e) => setLocationId(e.target.value)}
                  className="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm font-normal text-slate-700 focus:border-indigo-300 focus:outline-none focus:ring-2 focus:ring-indigo-100 cursor-pointer"
                >
                  {locations.map((l) => (
                    <option key={l.id} value={l.id}>
                      {l.name}
                    </option>
                  ))}
                </select>
              </label>

              <div>
                <div className="flex items-center gap-2 mb-3">
                  <span className="text-sm font-semibold text-slate-700">
                    Delivery channels
                  </span>
                  {!anyChannel && (
                    <span className="text-xs text-rose-600 font-medium">Pick at least one</span>
                  )}
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <button
                    type="button"
                    onClick={() =>
                      setChannels((c) => ({
                        ...c,
                        sms: !c.sms,
                      }))
                    }
                    className={`text-left rounded-2xl border-2 p-4 transition ${
                      channels.sms
                        ? "border-indigo-300 bg-indigo-50"
                        : "border-slate-200 bg-white hover:border-slate-300"
                    }`}
                  >
                    <div className="flex items-start gap-3">
                      <div
                        className={`mt-0.5 h-5 w-5 rounded border-2 ${
                          channels.sms ? "border-indigo-600 bg-indigo-600" : "border-slate-300"
                        }`}
                      />
                      <div>
                        <p
                          className={`font-semibold ${
                            channels.sms ? "text-indigo-900" : "text-slate-900"
                          }`}
                        >
                          SMS
                        </p>
                        <p
                          className={`mt-1 text-sm ${
                            channels.sms ? "text-indigo-700" : "text-slate-600"
                          }`}
                        >
                          Text message — highest open rate
                        </p>
                      </div>
                    </div>
                  </button>

                  <button
                    type="button"
                    onClick={() =>
                      setChannels((c) => ({
                        ...c,
                        email: !c.email,
                      }))
                    }
                    className={`text-left rounded-2xl border-2 p-4 transition ${
                      channels.email
                        ? "border-indigo-300 bg-indigo-50"
                        : "border-slate-200 bg-white hover:border-slate-300"
                    }`}
                  >
                    <div className="flex items-start gap-3">
                      <div
                        className={`mt-0.5 h-5 w-5 rounded border-2 ${
                          channels.email ? "border-indigo-600 bg-indigo-600" : "border-slate-300"
                        }`}
                      />
                      <div>
                        <p
                          className={`font-semibold ${
                            channels.email ? "text-indigo-900" : "text-slate-900"
                          }`}
                        >
                          Email
                        </p>
                        <p
                          className={`mt-1 text-sm ${
                            channels.email ? "text-indigo-700" : "text-slate-600"
                          }`}
                        >
                          Good for longer follow-ups
                        </p>
                      </div>
                    </div>
                  </button>
                </div>
              </div>
            </div>
          </RCard>

          {/* Step 3: Message */}
          <RCard step={3} title="Message" sub="Leave blank to use defaults.">
            <div className="space-y-4">
              {channels.email && (
                <label className="block">
                  <span className="text-sm font-semibold text-slate-700 block mb-2">
                    Email subject
                  </span>
                  <input
                    type="text"
                    name="emailSubject"
                    value={emailSubject}
                    onChange={(e) => setEmailSubject(e.target.value)}
                    placeholder="How was your experience?"
                    className="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm font-normal text-slate-700 focus:border-indigo-300 focus:outline-none focus:ring-2 focus:ring-indigo-100"
                  />
                </label>
              )}

              {channels.sms && (
                <label className="block">
                  <div className="flex items-center gap-2 mb-2">
                    <span className="text-sm font-semibold text-slate-700">SMS message</span>
                    <span className="text-xs text-slate-500 font-medium">
                      {messageBody.length}/160
                    </span>
                  </div>
                  <textarea
                    name="messageBody"
                    value={messageBody}
                    onChange={(e) => setMessageBody(e.target.value)}
                    placeholder="Thanks for choosing {location}. Would you take a moment to share your experience?"
                    rows={3}
                    maxLength={160}
                    className="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm font-normal text-slate-700 focus:border-indigo-300 focus:outline-none focus:ring-2 focus:ring-indigo-100 resize-vertical"
                  />
                </label>
              )}

              {!anyChannel && (
                <p className="text-sm text-slate-500">
                  Select a delivery channel above to edit its message.
                </p>
              )}
            </div>
          </RCard>

          {/* Step 4: Recipients */}
          <RCard
            step={4}
            title="Recipients"
            sub="Select the contacts to include in this send."
            right={
              <span className="inline-block rounded-full bg-indigo-100 px-3 py-1 text-xs font-semibold text-indigo-700">
                {recipients.length} selected
              </span>
            }
          >
            <RecipientPicker
              initialContacts={contacts}
              locations={locations}
              selectedLocationId={locationId}
              selectedRecipients={recipients}
              setSelectedRecipients={setRecipients}
            />
          </RCard>
        </form>

        {/* Right: Preview + Summary */}
        <div className="lg:col-span-1 space-y-6 sticky top-8 h-fit">
          {/* Preview Card */}
          <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
            <div className="flex items-center gap-2 mb-4">
              <div className="h-2 w-2 rounded-full bg-emerald-500"></div>
              <span className="text-xs font-semibold text-emerald-600">Live preview</span>
            </div>

            {channels.sms && channels.email && (
              <div className="flex gap-2 mb-4 p-1 bg-slate-100 rounded-lg">
                {["sms", "email"].map((ch) => (
                  <button
                    key={ch}
                    type="button"
                    onClick={() => setPreviewChannel(ch as "sms" | "email")}
                    className={`flex-1 px-2 py-1 rounded text-xs font-semibold transition ${
                      previewChannel === ch
                        ? "bg-white text-slate-900 shadow-sm"
                        : "text-slate-600 hover:text-slate-900"
                    }`}
                  >
                    {ch.toUpperCase()}
                  </button>
                ))}
              </div>
            )}

            {anyChannel ? (
              <div className="flex justify-center">
                <MessagePreview
                  type={destination === "REVIEW" ? "review" : "video"}
                  channel={previewChannel}
                  subject={emailSubject}
                  sms={messageBody}
                  sample={sample}
                  location={location?.name || "Your Business"}
                />
              </div>
            ) : (
              <div className="h-64 flex items-center justify-center text-center text-sm text-slate-400">
                Select a delivery channel<br />to preview the message.
              </div>
            )}
          </div>

          {/* Summary Card */}
          <SendSummary
            type={destination}
            location={location?.name || "Select a location"}
            channels={channels}
            recipients={recipients.length}
          />
        </div>
      </div>

      {/* Sticky Footer Action Bar */}
      <div className="fixed bottom-0 left-0 right-0 bg-white/90 backdrop-blur-sm border-t border-slate-200 px-6 py-4">
        <div className="max-w-5xl mx-auto flex items-center justify-between gap-4">
          <div className="text-sm text-slate-600">
            {canSend ? (
              <>
                Ready to send to <span className="font-semibold text-slate-900">{recipients.length}</span>{" "}
                recipient{recipients.length === 1 ? "" : "s"}
              </>
            ) : !anyChannel ? (
              "Select a delivery channel to continue"
            ) : (
              "Add at least one recipient to send"
            )}
          </div>
          <div className="flex gap-3">
            <Link
              href="/campaigns"
              className="rounded-lg border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 hover:bg-slate-50 transition"
            >
              Cancel
            </Link>
            <button
              type="button"
              className="rounded-lg border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 hover:bg-slate-50 transition"
            >
              Save draft
            </button>
            <button
              onClick={handleSubmit}
              disabled={!canSend || isSubmitting}
              className={`rounded-lg px-4 py-2.5 text-sm font-semibold text-white transition ${
                canSend && !isSubmitting
                  ? "bg-indigo-600 hover:bg-indigo-700 cursor-pointer"
                  : "bg-slate-300 cursor-not-allowed opacity-50"
              }`}
            >
              {isSubmitting ? "Sending..." : "Send review request"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Update page.tsx to use new form client**

```typescript
// src/app/campaigns/new/page.tsx
export const dynamic = "force-dynamic";

import Link from "next/link";
import { AppShell } from "@/components/app-shell";
import { getContacts } from "@/lib/contacts";
import { getCurrentAccessibleLocationIds } from "@/lib/current-scope";
import { getLocations } from "@/lib/locations";
import { CampaignFormClient } from "./campaign-form-client";

export default async function NewCampaignPage() {
  const locationIds = await getCurrentAccessibleLocationIds();
  const [contacts, locations] = await Promise.all([
    getContacts(locationIds),
    getLocations(locationIds),
  ]);

  return (
    <AppShell activeScreen="campaigns">
      <CampaignFormClient
        contacts={contacts.map((c) => ({
          id: c.id,
          name: c.name,
          email: c.email,
          phone: c.phone,
          locationId: c.locationId,
        }))}
        locations={locations.map((l) => ({ id: l.id, name: l.name }))}
      />
    </AppShell>
  );
}
```

- [ ] **Step 3: Update RecipientPicker to work with new form state**

Update `src/app/campaigns/new/recipient-picker.tsx` props:

```typescript
// Update component signature to accept new props
interface RecipientPickerProps {
  initialContacts: Contact[];
  locations: Location[];
  selectedLocationId: string;
  selectedRecipients: Contact[];
  setSelectedRecipients: (recipients: Contact[]) => void;
}

export function RecipientPicker({
  initialContacts,
  locations,
  selectedLocationId,
  selectedRecipients,
  setSelectedRecipients,
}: RecipientPickerProps) {
  // Update implementation to filter by selectedLocationId
  const locationContacts = initialContacts.filter((c) => c.locationId === selectedLocationId);
  // ... rest of implementation
}
```

- [ ] **Step 4: Test the redesigned form**

Run: `npm run dev` and navigate to `/campaigns/new`. Test:
- All 4 steps render correctly
- Preview updates when message changes
- Channel toggle works and updates preview
- Recipient picker filters by location
- Summary updates with recipient count
- Footer action bar shows correct send status

- [ ] **Step 5: Commit**

```bash
git add src/app/campaigns/new/
git commit -m "feat: redesign review request form with 4-step layout and live preview"
```

---

## Task 3: Create Review Links Component Library

**Files:**
- Create: `src/app/review-links/components/source-card.tsx`
- Create: `src/app/review-links/components/qr-generator.tsx`
- Create: `src/app/review-links/components/email-sig-tab.tsx`
- Create: `src/app/review-links/components/analytics-tab.tsx`
- Create: `src/app/review-links/components/funnel-flow.tsx`

**Interfaces:**
- Consumes: React, existing analytics functions, QRCode library
- Produces:
  - `SourceCard`: `{ icon: string; label: string; color: string; url: string; views: number; happy: number; onCopy: (id: string, text: string) => void }`
  - `QRGenerator`: `{ url: string; size?: number }`
  - `EmailSigTab`: `{ url: string; onCopy: (id: string, text: string) => void }`
  - `AnalyticsTab`: `{ locations: Location[] }`
  - `FunnelFlow`: `{}`

- [ ] **Step 1: Create SourceCard component**

```typescript
// src/app/review-links/components/source-card.tsx
"use client";

import { useState } from "react";

interface SourceCardProps {
  icon: string;
  label: string;
  color: string;
  url: string;
  views: number;
  happy: number;
  tip: string;
  onCopy: (id: string, text: string) => void;
  copied: Record<string, boolean>;
}

export function SourceCard({
  icon,
  label,
  color,
  url,
  views,
  happy,
  tip,
  onCopy,
  copied,
}: SourceCardProps) {
  const id = label.toLowerCase().replace(/\s+/g, "-");
  const happyPct = views ? Math.round((happy / views) * 100) : 0;
  const isCopied = copied[id];

  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
      <div className="flex items-start gap-3 mb-4">
        <div
          className="w-10 h-10 rounded-lg flex items-center justify-center flex-none"
          style={{ backgroundColor: `${color}14`, color }}
        >
          {/* Icon would go here - using a placeholder emoji */}
          📎
        </div>
        <div className="flex-1 min-w-0">
          <p className="font-semibold text-slate-900">{label}</p>
          <p className="text-xs text-slate-600 mt-1 leading-relaxed">{tip}</p>
        </div>
      </div>

      <div className="flex items-center gap-2 mb-4 p-3 rounded-lg bg-slate-50 border border-slate-200">
        <span className="flex-1 font-mono text-xs text-slate-600 truncate">{url}</span>
        <button
          onClick={() => onCopy(id, url)}
          className={`flex-none px-3 py-1.5 rounded-lg text-xs font-semibold transition ${
            isCopied
              ? "bg-emerald-100 text-emerald-700"
              : "bg-indigo-600 text-white hover:bg-indigo-700"
          }`}
        >
          {isCopied ? "✓ Copied!" : "Copy"}
        </button>
      </div>

      <div className="flex items-center gap-6 text-xs">
        <div>
          <span className="font-bold text-slate-900">{views}</span>
          <span className="text-slate-600 ml-1">views</span>
        </div>
        <div>
          <span className="font-bold text-emerald-600">{happy}</span>
          <span className="text-slate-600 ml-1">happy ({happyPct}%)</span>
        </div>
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Create QRGenerator component**

```typescript
// src/app/review-links/components/qr-generator.tsx
"use client";

import { useEffect, useRef } from "react";
import QRCode from "qrcode";

interface QRGeneratorProps {
  url: string;
  size?: number;
}

export function QRGenerator({ url, size = 200 }: QRGeneratorProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    if (!canvasRef.current) return;
    QRCode.toCanvas(canvasRef.current, url, { width: size, margin: 2 }, () => {
      // QR code rendered
    });
  }, [url, size]);

  return (
    <div className="flex flex-col items-center gap-4">
      <div className="rounded-lg border border-slate-200 p-4 bg-white">
        <canvas ref={canvasRef} className="block" />
      </div>
      <div className="flex gap-2">
        {[
          { label: "SM", size: 140 },
          { label: "MD", size: 200 },
          { label: "LG", size: 260 },
        ].map((option) => (
          <button
            key={option.label}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold uppercase transition ${
              size === option.size
                ? "bg-indigo-600 text-white"
                : "bg-slate-100 text-slate-700 hover:bg-slate-200"
            }`}
          >
            {option.label}
          </button>
        ))}
      </div>
    </div>
  );
}
```

- [ ] **Step 3: Create EmailSigTab component**

```typescript
// src/app/review-links/components/email-sig-tab.tsx
"use client";

import { useState } from "react";

interface EmailSigTabProps {
  url: string;
  onCopy: (id: string, text: string) => void;
  copied: Record<string, boolean>;
}

const STYLE_OPTIONS = {
  cta: {
    label: "Button CTA",
    desc: "Branded button in your signature — highest click rate.",
  },
  text: {
    label: "Text link",
    desc: "Plain hyperlink — less visual weight, still tracked.",
  },
  minimal: {
    label: "Minimal",
    desc: "Just a small star icon and a word — zero distraction.",
  },
};

export function EmailSigTab({ url, onCopy, copied }: EmailSigTabProps) {
  const [style, setStyle] = useState<"cta" | "text" | "minimal">("cta");

  const htmlSnippet = generateEmailSignatureHTML(url, style);

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
      {/* Preview */}
      <div className="lg:col-span-2">
        <div className="rounded-2xl border border-slate-200 bg-white p-6">
          <h3 className="text-lg font-semibold text-slate-950 mb-2">Email signature preview</h3>
          <p className="text-sm text-slate-600 mb-4">
            This is how your signature will look in Gmail / Outlook.
          </p>

          <div className="rounded-lg border border-slate-200 bg-white p-6 mb-4 font-sans text-sm text-slate-700">
            <div className="font-semibold text-slate-900 mb-1">Sarah Thompson</div>
            <div className="text-slate-600 text-xs mb-1">Marketing Manager · NOVA Advertising</div>
            <div className="text-slate-600 text-xs mb-3">(571) 555-0192 · nova-advertising.com</div>

            {style === "cta" && (
              <a href="#" className="inline-block bg-indigo-600 text-white text-xs font-semibold px-3 py-1.5 rounded-lg no-underline">
                ⭐ Share your experience
              </a>
            )}
            {style === "text" && (
              <div>
                Enjoyed working with us?{" "}
                <a href="#" className="text-indigo-600 font-semibold underline">
                  Leave us a quick review
                </a>
              </div>
            )}
            {style === "minimal" && (
              <div className="text-xs">
                ⭐{" "}
                <a href="#" className="text-slate-600 font-semibold underline">
                  Review us
                </a>
              </div>
            )}
          </div>

          <div className="flex gap-2 mb-4">
            {Object.entries(STYLE_OPTIONS).map(([key, value]) => (
              <button
                key={key}
                onClick={() => setStyle(key as any)}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition ${
                  style === key
                    ? "bg-indigo-600 text-white"
                    : "bg-slate-100 text-slate-700 hover:bg-slate-200"
                }`}
              >
                {value.label}
              </button>
            ))}
          </div>

          <p className="text-xs text-slate-600 mb-4">
            {STYLE_OPTIONS[style].desc}
          </p>

          <div className="flex gap-3">
            <button
              onClick={() => onCopy("sig-html", htmlSnippet)}
              className={`px-4 py-2 rounded-lg text-sm font-semibold transition ${
                copied["sig-html"]
                  ? "bg-emerald-100 text-emerald-700"
                  : "bg-indigo-600 text-white hover:bg-indigo-700"
              }`}
            >
              {copied["sig-html"] ? "✓ Copied HTML!" : "Copy HTML"}
            </button>
            <button className="px-4 py-2 rounded-lg text-sm font-semibold bg-slate-200 text-slate-700 hover:bg-slate-300 transition">
              📖 Install guide
            </button>
          </div>
        </div>
      </div>

      {/* Install Steps */}
      <div className="rounded-2xl border border-slate-200 bg-white p-6">
        <h3 className="text-sm font-semibold text-slate-950 mb-4">How to install</h3>
        <div className="space-y-3">
          {[
            ["Copy the HTML above", "Use the button to copy the raw HTML signature."],
            ["Open Gmail or Outlook settings", "Go to Settings → Signature, then paste into the signature editor."],
            ["Save and send a test", "Send yourself an email to confirm the link tracks correctly."],
          ].map(([title, desc], i) => (
            <div key={i} className="flex gap-3">
              <div className="flex-none w-6 h-6 rounded-full bg-indigo-100 text-indigo-700 flex items-center justify-center text-xs font-bold">
                {i + 1}
              </div>
              <div>
                <p className="text-sm font-semibold text-slate-900">{title}</p>
                <p className="text-xs text-slate-600 mt-1">{desc}</p>
              </div>
            </div>
          ))}
        </div>

        <div className="mt-6 pt-6 border-t border-slate-200">
          <p className="text-xs font-semibold text-slate-700 mb-2">Tracked URL</p>
          <div className="rounded-lg bg-slate-50 p-2 border border-slate-200">
            <code className="text-xs text-slate-600 break-all">{url}</code>
          </div>
        </div>
      </div>
    </div>
  );
}

function generateEmailSignatureHTML(url: string, style: string): string {
  const baseHTML = `<table cellpadding="0" cellspacing="0" border="0" style="font-family:Arial,sans-serif;font-size:13px;color:#3f3f46;line-height:1.5">
  <tr><td style="padding-bottom:10px;font-weight:700;font-size:14px;color:#18181b">Sarah Thompson</td></tr>
  <tr><td style="color:#71717a">Marketing Manager · NOVA Advertising</td></tr>
  <tr><td style="color:#71717a;padding-bottom:12px">(571) 555-0192 · nova-advertising.com</td></tr>
  <tr><td>`;

  if (style === "cta") {
    return (
      baseHTML +
      `<a href="${url}" style="display:inline-flex;align-items:center;gap:6px;background:#37aeb7;color:#fff;text-decoration:none;font-weight:600;font-size:12px;padding:7px 14px;border-radius:7px">⭐ Share your experience</a>` +
      `</td></tr></table>`
    );
  } else if (style === "text") {
    return (
      baseHTML +
      `Enjoyed working with us? <a href="${url}" style="color:#37aeb7;font-weight:600;text-decoration:underline">Leave us a quick review</a>` +
      `</td></tr></table>`
    );
  } else {
    return (
      baseHTML +
      `⭐ <a href="${url}" style="color:#666;text-decoration:none">Review us</a>` +
      `</td></tr></table>`
    );
  }
}
```

- [ ] **Step 4: Create FunnelFlow component**

```typescript
// src/app/review-links/components/funnel-flow.tsx
export function FunnelFlow() {
  return (
    <div className="rounded-2xl border border-indigo-200 bg-indigo-50 p-5">
      <p className="text-xs font-semibold text-indigo-900 mb-3 flex items-center gap-2">
        ⚡ How the funnel works
      </p>
      <div className="space-y-2">
        <div className="flex items-center gap-3">
          <div className="w-7 h-7 rounded-lg bg-white border border-indigo-200 flex items-center justify-center flex-none text-xs">
            ⭐
          </div>
          <span className="text-xs text-slate-700 font-medium">Customer clicks your link</span>
        </div>
        <div className="flex items-center gap-3 pl-3 opacity-40">
          <div className="text-xs">↓</div>
        </div>
        <div className="flex items-center gap-3">
          <div className="w-7 h-7 rounded-lg bg-white border border-indigo-200 flex items-center justify-center flex-none text-xs">
            👥
          </div>
          <span className="text-xs text-slate-700 font-medium">Rates their experience</span>
        </div>
        <div className="flex items-center gap-3 pl-3 opacity-40">
          <div className="text-xs">↓</div>
        </div>

        <div className="mt-3 grid grid-cols-2 gap-2 pt-2">
          <div className="rounded-lg bg-emerald-50 border border-emerald-200 p-2">
            <p className="text-xs font-semibold text-emerald-700 mb-1 flex items-center gap-1">
              ⭐ 4–5 stars
            </p>
            <p className="text-xs text-emerald-600">Sent to Google to leave a public review</p>
          </div>
          <div className="rounded-lg bg-amber-50 border border-amber-200 p-2">
            <p className="text-xs font-semibold text-amber-700 mb-1 flex items-center gap-1">
              ⚠️ 1–3 stars
            </p>
            <p className="text-xs text-amber-600">Captured privately so you can resolve it</p>
          </div>
        </div>
      </div>
    </div>
  );
}
```

- [ ] **Step 5: Create AnalyticsTab component**

```typescript
// src/app/review-links/components/analytics-tab.tsx
"use client";

import { useEffect, useState } from "react";

interface AnalyticsTabProps {
  slug: string;
}

export function AnalyticsTab({ slug }: AnalyticsTabProps) {
  const [range, setRange] = useState(30);
  const [data, setData] = useState<null | {
    uniqueViews: number;
    happyClicks: number;
    unhappyClicks: number;
    googleRedirects: number;
    feedbackSubmissions: number;
  }>(null);

  useEffect(() => {
    let cancelled = false;
    fetch(`/api/review-links/${slug}/analytics?range=${range}`)
      .then((r) => r.json())
      .then((result) => {
        if (!cancelled) setData(result);
      })
      .catch(() => {});
    return () => {
      cancelled = true;
      setData(null);
    };
  }, [slug, range]);

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-2">
        <span className="text-xs font-semibold text-slate-600">Period:</span>
        {[7, 30, 90].map((d) => (
          <button
            key={d}
            onClick={() => setRange(d)}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition ${
              range === d
                ? "bg-indigo-600 text-white"
                : "bg-slate-100 text-slate-700 hover:bg-slate-200"
            }`}
          >
            {d}d
          </button>
        ))}
      </div>

      {data ? (
        <div className="grid grid-cols-2 lg:grid-cols-3 gap-3">
          {[
            { label: "Views", value: data.uniqueViews },
            { label: "Happy", value: data.happyClicks },
            { label: "Unhappy", value: data.unhappyClicks },
            { label: "Google Redirects", value: data.googleRedirects },
            { label: "Feedback", value: data.feedbackSubmissions },
          ].map((stat) => (
            <div key={stat.label} className="rounded-lg border border-slate-200 bg-slate-50 p-3 text-center">
              <p className="text-xl font-bold text-slate-900">{stat.value}</p>
              <p className="text-xs text-slate-600 mt-1">{stat.label}</p>
            </div>
          ))}
        </div>
      ) : (
        <p className="text-sm text-slate-400">Loading…</p>
      )}
    </div>
  );
}
```

- [ ] **Step 6: Verify all components render**

Run: `npm run dev` and ensure no console errors.

- [ ] **Step 7: Commit**

```bash
git add src/app/review-links/components/
git commit -m "feat: add review links component library (SourceCard, QRGenerator, EmailSigTab, AnalyticsTab, FunnelFlow)"
```

---

## Task 4: Redesign Review Links Page

**Files:**
- Modify: `src/app/review-links/page.tsx`
- Modify: `src/app/review-links/review-links-client.tsx`

**Interfaces:**
- Consumes: All components from Task 3
- Produces: Updated review links page with new layout and tab structure

- [ ] **Step 1: Update review-links-client.tsx**

```typescript
// src/app/review-links/review-links-client.tsx
"use client";

import { useState, useEffect } from "react";
import { SourceCard } from "./components/source-card";
import { QRGenerator } from "./components/qr-generator";
import { EmailSigTab } from "./components/email-sig-tab";
import { AnalyticsTab } from "./components/analytics-tab";
import { FunnelFlow } from "./components/funnel-flow";

type LocationData = {
  id: string;
  name: string;
  slug: string;
  reviewUrl: string;
  hasGoogleUrl: boolean;
};

const SOURCES = [
  {
    id: "email-sig",
    label: "Email Signature",
    icon: "mail",
    color: "#37aeb7",
    param: "src=email_signature&medium=email",
    badge: "Most used",
    tip: "Embed in your team's email footer. Every conversation becomes a review opportunity.",
    views: 42,
    happy: 36,
  },
  {
    id: "qr-print",
    label: "QR / Print",
    icon: "qr",
    color: "#8b5cf6",
    param: "src=qr_counter&medium=print",
    badge: null,
    tip: "Print on receipts, counter cards, or anywhere customers linger after a purchase.",
    views: 18,
    happy: 14,
  },
  {
    id: "invoice",
    label: "Invoice",
    icon: "clipboard",
    color: "#eab308",
    param: "src=invoice&medium=print",
    badge: null,
    tip: "Send with invoices or payment confirmations — timing is perfect when the job is fresh.",
    views: 11,
    happy: 9,
  },
  {
    id: "website",
    label: "Website",
    icon: "globe",
    color: "#06b6d4",
    param: "src=website&medium=digital",
    badge: null,
    tip: "Add to your contact page, thank-you pages, or footer CTA.",
    views: 24,
    happy: 21,
  },
  {
    id: "sms",
    label: "SMS / Text",
    icon: "message",
    color: "#8b5cf6",
    param: "src=sms&medium=text",
    badge: "New",
    tip: "Short enough for a text. Paste into your texting platform or CRM campaign.",
    views: 5,
    happy: 4,
  },
  {
    id: "direct",
    label: "Direct link",
    icon: "link",
    color: "#64748b",
    param: null,
    badge: null,
    tip: "Base URL with no tracking. Use when you just need a clean link.",
    views: 7,
    happy: 6,
  },
];

const TABS = ["Links", "Email Sig", "QR Code", "Analytics"] as const;
type Tab = typeof TABS[number];

function LocationCard({
  location,
  appUrl,
  emailSnippet,
}: {
  location: LocationData;
  appUrl: string;
  emailSnippet: string;
}) {
  const [activeTab, setActiveTab] = useState<Tab>("Links");
  const [copied, setCopied] = useState<Record<string, boolean>>({});
  const [qrSize, setQrSize] = useState(200);

  const copy = (id: string, text: string) => {
    navigator.clipboard?.writeText(text).catch(() => {});
    setCopied((p) => ({ ...p, [id]: true }));
    setTimeout(() => setCopied((p) => ({ ...p, [id]: false })), 1800);
  };

  const baseUrl = appUrl.replace(/\/$/, "");
  const qrUrl = `${baseUrl}/review/${location.slug}?src=qr_counter&medium=print`;

  return (
    <div className="rounded-2xl border border-slate-200 bg-white overflow-hidden shadow-sm">
      {/* Location Header */}
      <div className="border-b border-slate-200 bg-white px-6 py-4">
        <div className="flex items-start justify-between">
          <div>
            <p className="font-semibold text-slate-900">{location.name}</p>
            <p className="text-xs text-slate-500 mt-1 font-mono">{location.slug}</p>
          </div>
          <span className="inline-block px-2.5 py-1 rounded-full bg-emerald-100 text-emerald-700 text-xs font-semibold">
            ✓ Active
          </span>
        </div>
        {!location.hasGoogleUrl && (
          <p className="text-xs text-amber-600 mt-2">
            ⚠️ No Google review URL configured — happy card disabled.
          </p>
        )}
      </div>

      {/* Tab Bar */}
      <div className="flex border-b border-slate-200 bg-white">
        {TABS.map((tab) => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={`px-4 py-3 text-xs font-semibold transition border-b-2 ${
              activeTab === tab
                ? "border-indigo-600 text-indigo-600"
                : "border-transparent text-slate-500 hover:text-slate-700"
            }`}
          >
            {tab}
          </button>
        ))}
      </div>

      {/* Tab Content */}
      <div className="px-6 py-6">
        {activeTab === "Links" && (
          <div className="space-y-6">
            {/* Default link */}
            <div>
              <p className="text-xs font-semibold uppercase tracking-wider text-slate-600 mb-3">
                Default link
              </p>
              <div className="flex gap-2">
                <input
                  readOnly
                  value={baseUrl + "/review/" + location.slug}
                  className="flex-1 rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-xs font-mono text-slate-600"
                />
                <button
                  onClick={() => copy("default", baseUrl + "/review/" + location.slug)}
                  className={`px-3 py-2 rounded-lg text-xs font-semibold transition ${
                    copied["default"]
                      ? "bg-emerald-100 text-emerald-700"
                      : "bg-indigo-600 text-white hover:bg-indigo-700"
                  }`}
                >
                  {copied["default"] ? "✓" : "Copy"}
                </button>
              </div>
            </div>

            {/* Source cards grid */}
            <div>
              <p className="text-sm font-semibold text-slate-900 mb-4">Source-tracked links</p>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {SOURCES.map((source) => {
                  const url = source.param
                    ? `${baseUrl}/review/${location.slug}?${source.param}`
                    : baseUrl + "/review/" + location.slug;

                  return (
                    <SourceCard
                      key={source.id}
                      icon={source.icon}
                      label={source.label}
                      color={source.color}
                      url={url}
                      views={source.views}
                      happy={source.happy}
                      tip={source.tip}
                      onCopy={copy}
                      copied={copied}
                    />
                  );
                })}
              </div>
            </div>

            {/* Funnel Flow Info */}
            <FunnelFlow />
          </div>
        )}

        {activeTab === "Email Sig" && (
          <EmailSigTab url={baseUrl + "/review/" + location.slug + "?src=email_signature&medium=email"} onCopy={copy} copied={copied} />
        )}

        {activeTab === "QR Code" && (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div>
              <QRGenerator url={qrUrl} size={qrSize} />
            </div>
            <div className="lg:col-span-2 space-y-4">
              <div className="rounded-lg border border-slate-200 bg-white p-4">
                <p className="text-sm font-semibold text-slate-900 mb-3">Best uses</p>
                <ul className="space-y-2 text-xs">
                  <li className="flex gap-2">
                    <span>✓</span>
                    <div>
                      <p className="font-medium text-slate-700">Front desk / counter</p>
                      <p className="text-slate-600">Print at 3–4″ and laminate.</p>
                    </div>
                  </li>
                  <li className="flex gap-2">
                    <span>✓</span>
                    <div>
                      <p className="font-medium text-slate-700">Receipts & invoices</p>
                      <p className="text-slate-600">Small enough for a receipt footer.</p>
                    </div>
                  </li>
                </ul>
              </div>

              <div className="rounded-lg border border-slate-200 bg-white p-4">
                <p className="text-xs font-semibold text-slate-700 mb-2">Tracked URL</p>
                <div className="flex gap-2">
                  <input
                    readOnly
                    value={qrUrl}
                    className="flex-1 rounded-lg border border-slate-200 bg-slate-50 px-2 py-1 text-xs font-mono text-slate-600 truncate"
                  />
                  <button
                    onClick={() => copy("qr-url", qrUrl)}
                    className={`px-2 py-1 rounded-lg text-xs font-semibold transition ${
                      copied["qr-url"]
                        ? "bg-emerald-100 text-emerald-700"
                        : "bg-indigo-600 text-white hover:bg-indigo-700"
                    }`}
                  >
                    Copy
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {activeTab === "Analytics" && <AnalyticsTab slug={location.slug} />}
      </div>
    </div>
  );
}

export function ReviewLinksClient({
  locations,
  appUrl,
  emailSnippets,
}: {
  locations: LocationData[];
  appUrl: string;
  emailSnippets: Record<string, string>;
}) {
  const [search, setSearch] = useState("");
  const filtered = locations.filter((l) =>
    l.name.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="space-y-6">
      {locations.length > 3 && (
        <input
          type="search"
          placeholder="Filter locations…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="w-full max-w-sm rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm text-slate-900 placeholder-slate-400 focus:border-indigo-400 focus:outline-none focus:ring-2 focus:ring-indigo-100"
        />
      )}
      {filtered.length === 0 && (
        <p className="text-sm text-slate-500">No locations match your search.</p>
      )}
      {filtered.map((loc) => (
        <LocationCard
          key={loc.id}
          location={loc}
          appUrl={appUrl}
          emailSnippet={emailSnippets[loc.slug] ?? ""}
        />
      ))}
    </div>
  );
}
```

- [ ] **Step 2: Update page.tsx with new stats**

```typescript
// src/app/review-links/page.tsx - Update header and stats section
export default async function ReviewLinksPage() {
  const membership = await getCurrentMembership();
  if (!membership) redirect("/sign-in");

  const locations = await prisma.location.findMany({
    where: { organizationId: membership.organizationId },
    select: {
      id: true,
      name: true,
      slug: true,
      reviewLink: true,
      googlePlaceId: true,
    },
    orderBy: { name: "asc" },
  });

  const appUrl = process.env.NEXT_PUBLIC_APP_URL?.replace(/\/$/, "") ?? "";

  const statsPerLocation = await Promise.all(
    locations.map((loc) => getLocationAnalytics(loc.id, 30))
  );
  const totalViews = statsPerLocation.reduce((sum, s) => sum + s.uniqueViews, 0);
  const totalHappy = statsPerLocation.reduce((sum, s) => sum + s.happyClicks, 0);
  const totalUnhappy = statsPerLocation.reduce((sum, s) => sum + s.unhappyClicks, 0);

  const locationData = locations.map((loc) => ({
    id: loc.id,
    name: loc.name,
    slug: loc.slug,
    reviewUrl: `${appUrl}/review/${loc.slug}`,
    hasGoogleUrl: Boolean(loc.reviewLink ?? buildGoogleWriteReviewLink(loc.googlePlaceId)),
  }));

  const emailSnippets = Object.fromEntries(
    locations.map((loc) => [
      loc.slug,
      buildEmailSignatureSnippet({ appUrl, slug: loc.slug }),
    ])
  );

  return (
    <AppShell activeScreen="review-links">
      <div className="max-w-6xl mx-auto px-6 py-8 space-y-8">
        {/* Header */}
        <div>
          <p className="text-sm font-semibold uppercase tracking-wide text-indigo-600 mb-2">
            Requests &amp; Feedback
          </p>
          <h1 className="text-4xl font-bold tracking-tight text-slate-950 mb-2">
            Review Links
          </h1>
          <p className="text-base text-slate-600 max-w-2xl">
            Anonymous links for emails, QR codes, invoices, and websites. Happy customers go to Google — unhappy ones come to you privately.
          </p>
        </div>

        {/* Stats Strip */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {[
            { label: "Locations", value: locations.length },
            { label: "Views (30d)", value: totalViews },
            { label: "Happy (30d)", value: totalHappy },
            { label: "Unhappy (30d)", value: totalUnhappy },
          ].map((stat) => (
            <div
              key={stat.label}
              className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm text-center"
            >
              <p className="text-2xl font-bold text-slate-950">{stat.value}</p>
              <p className="text-xs text-slate-500 mt-1">{stat.label}</p>
            </div>
          ))}
        </div>

        {/* Content */}
        {locations.length === 0 ? (
          <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm text-center">
            <p className="text-sm font-semibold text-slate-900">No locations yet.</p>
            <p className="mt-2 text-sm text-slate-600">
              Add a location first to generate review links.
            </p>
          </div>
        ) : (
          <ReviewLinksClient
            locations={locationData}
            appUrl={appUrl}
            emailSnippets={emailSnippets}
          />
        )}
      </div>
    </AppShell>
  );
}
```

- [ ] **Step 3: Test the redesigned review links page**

Run: `npm run dev` and navigate to `/review-links`. Test:
- All locations render in cards
- Tab switching works (Links → Email Sig → QR → Analytics)
- Copy-to-clipboard buttons work
- QR code generates and size toggle works
- Email signature preview and styles work
- Analytics tab loads data
- Source cards display with correct URLs and stats

- [ ] **Step 4: Verify responsive design**

Test on mobile (narrow viewport) to ensure:
- Cards stack properly
- Tab bar scrolls if needed
- Grids collapse to single column
- All buttons are clickable

- [ ] **Step 5: Commit**

```bash
git add src/app/review-links/
git commit -m "feat: redesign review links page with tabs, source cards, QR generator, and analytics"
```

---

## Task 5: Integration Testing

**Files:**
- Test: Manual testing in browser

**Interfaces:**
- Consumes: All updated pages and components
- Produces: Verified working UI

- [ ] **Step 1: Test complete review request flow**

1. Navigate to `/campaigns/new`
2. Fill campaign name
3. Toggle between Review and Video types
4. Select location
5. Enable SMS and Email channels
6. Edit message and watch preview update
7. Switch preview between SMS and Email
8. Add recipients from picker
9. Watch footer show correct send count
10. Submit and verify redirect to campaigns page

- [ ] **Step 2: Test complete review links flow**

1. Navigate to `/review-links`
2. Verify stats at top
3. Click through each location card
4. Test Links tab:
   - Copy default link
   - Copy source-tracked links
   - Copy multiple links
5. Test Email Sig tab:
   - Switch between styles
   - Copy HTML
   - View install guide
6. Test QR Code tab:
   - Generate QR
   - Test size toggles
   - Copy URL
   - View best uses info
7. Test Analytics tab:
   - View 30d data
   - Switch to 7d and 90d
   - Verify stats update

- [ ] **Step 3: Test on mobile**

Use browser dev tools to test responsive behavior:
- 375px width (mobile)
- 768px width (tablet)
- Verify all components readable
- Verify buttons clickable

- [ ] **Step 4: Final verification**

Check no console errors, no broken links, all buttons work

- [ ] **Step 5: Commit**

```bash
git add .
git commit -m "test: verify UI redesigns in browser and on mobile"
```

---

## Summary

This plan implements a comprehensive redesign of the review requests and review links pages with:

1. **Review Requests Form** - 4-step layout with two-pane preview, message customization, and recipient selection
2. **Review Links Page** - Tab-based interface with source-tracked cards, QR code generator, email signature builder, and analytics

All components are built to integrate with existing data models and server actions. The implementation uses Next.js server and client components, maintaining backward compatibility while significantly improving user experience.
