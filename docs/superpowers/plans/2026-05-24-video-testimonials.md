# Video Testimonials Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Rebuild the video testimonial section with a guided 6-step client recording flow, improved admin send form with contact search and live preview, thumbnail testimonials list, and widget system extended to support TEXT/VIDEO/MIXED content types with 5 layouts.

**Architecture:** `VideoRecorder` is refactored into a staged wizard with new props (`prompt`, `businessName`, `logoUrl`). Two new DB columns: `VideoTestimonial.prompt` (nullable TEXT) and `ReviewWidget.contentType` (TEXT, default `"TEXT"`). `WidgetLayoutPicker` gains a content-type picker step before layout. The embed script gains video card rendering, a lightbox player, and masonry CSS. The public widget API payload is extended with `contentType` and a `videoTestimonials` array.

**Tech Stack:** Next.js 14 App Router, Prisma/PostgreSQL, MediaRecorder API, Vercel Blob, plain JS embed script

**Verification command:** `npx tsc --noEmit` (type-check gate — use after each task)

---

## File Map

| Action | File |
|--------|------|
| Modify | `prisma/schema.prisma` |
| Create | `prisma/migrations/…_add_video_testimonial_prompt/migration.sql` (auto) |
| Create | `prisma/migrations/…_add_review_widget_content_type/migration.sql` (auto) |
| Modify | `src/components/video-recorder.tsx` |
| Modify | `src/app/vt/[token]/page.tsx` |
| Create | `src/components/send-video-request-form.tsx` |
| Modify | `src/app/video-testimonials/page.tsx` |
| Modify | `src/app/video-testimonials/actions.ts` |
| Modify | `src/lib/email.ts` |
| Modify | `src/lib/sms.ts` |
| Modify | `src/components/widget-layout-picker.tsx` |
| Modify | `src/app/widgets/actions.ts` |
| Modify | `src/lib/review-widgets.ts` |
| Modify | `src/app/embed/widget.js/route.ts` |

---

## Task 1: DB Schema + Migrations

**Files:**
- Modify: `prisma/schema.prisma`

- [ ] **Step 1: Add `prompt` to `VideoTestimonial` in schema**

In `prisma/schema.prisma`, find the `VideoTestimonial` model and add after the `token` field:

```prisma
model VideoTestimonial {
  id              String                 @id @default(cuid())
  locationId      String
  token           String                 @unique
  prompt          String?                // NEW
  submitterName   String?
  submitterEmail  String?
  videoUrl        String?
  mimeType        String?
  durationSeconds Int?
  status          VideoTestimonialStatus @default(PENDING)
  publishedAt     DateTime?
  createdAt       DateTime               @default(now())
  updatedAt       DateTime               @updatedAt

  location        Location               @relation(fields: [locationId], references: [id], onDelete: Cascade)

  @@index([locationId])
  @@index([token])
  @@index([status])
}
```

- [ ] **Step 2: Run migration for prompt column**

```bash
cd /Users/safatash/.openclaw/workspace/wehearyou
npx prisma migrate dev --name add_video_testimonial_prompt
```

Expected: `The following migration(s) have been applied: …add_video_testimonial_prompt`

- [ ] **Step 3: Add `contentType` to `ReviewWidget` in schema**

In `prisma/schema.prisma`, find the `ReviewWidget` model and add after the `isActive` field:

```prisma
model ReviewWidget {
  id               String       @id @default(cuid())
  organizationId   String
  locationId       String
  name             String
  publicToken      String       @unique
  isActive         Boolean      @default(true)
  contentType      String       @default("TEXT")   // NEW — values: TEXT | VIDEO | MIXED

  layout           String       @default("grid")
  // ... rest unchanged
```

- [ ] **Step 4: Run migration for contentType column**

```bash
npx prisma migrate dev --name add_review_widget_content_type
```

Expected: `The following migration(s) have been applied: …add_review_widget_content_type`

- [ ] **Step 5: Type-check**

```bash
npx tsc --noEmit
```

Expected: No errors.

- [ ] **Step 6: Commit**

```bash
git add prisma/schema.prisma prisma/migrations/
git commit -m "feat: add VideoTestimonial.prompt and ReviewWidget.contentType columns"
```

---

## Task 2: VideoRecorder Component Refactor

**Files:**
- Modify: `src/components/video-recorder.tsx`

The component gains new props (`prompt`, `businessName`, `logoUrl`) and new stages (`intro`, `countdown`). Camera permission is requested on "Let's Go" (entering step 2), not on "Start Recording". A 3-second countdown plays before recording begins. The name field on the attribution step becomes required.

- [ ] **Step 1: Replace the entire file**

```tsx
"use client";

import { useRef, useState, useEffect } from "react";

type Props = {
  token: string;
  prompt: string;
  businessName: string;
  logoUrl?: string;
};

type Stage =
  | "intro"
  | "idle"
  | "requesting"
  | "countdown"
  | "recording"
  | "preview"
  | "form"
  | "uploading"
  | "done"
  | "error"
  | "unsupported";

const MAX_SECONDS = 90;

export function VideoRecorder({ token, prompt, businessName, logoUrl }: Props) {
  const [stage, setStage] = useState<Stage>("intro");
  const [error, setError] = useState<string | null>(null);
  const [videoBlob, setVideoBlob] = useState<Blob | null>(null);
  const [videoUrl, setVideoUrl] = useState<string | null>(null);
  const [duration, setDuration] = useState<number>(0);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [elapsed, setElapsed] = useState(0);
  const [countdown, setCountdown] = useState(3);

  const videoRef = useRef<HTMLVideoElement>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const startTimeRef = useRef<number>(0);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  function stopStream() {
    streamRef.current?.getTracks().forEach((t) => t.stop());
    streamRef.current = null;
  }

  async function startStream() {
    if (!navigator.mediaDevices?.getUserMedia) {
      setStage("unsupported");
      return;
    }
    setStage("requesting");
    setError(null);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        videoRef.current.muted = true;
        videoRef.current.play();
      }
      setStage("idle");
    } catch {
      setError("Camera access was denied. Please allow camera and microphone access and try again.");
      setStage("intro");
    }
  }

  function startCountdown() {
    setCountdown(3);
    setStage("countdown");
  }

  useEffect(() => {
    if (stage !== "countdown") return;
    if (countdown === 0) {
      startActualRecording();
      return;
    }
    const t = setTimeout(() => setCountdown((c) => c - 1), 1000);
    return () => clearTimeout(t);
  }, [stage, countdown]);

  function startActualRecording() {
    if (!streamRef.current) return;

    const mimeType = MediaRecorder.isTypeSupported("video/webm;codecs=vp9,opus")
      ? "video/webm;codecs=vp9,opus"
      : MediaRecorder.isTypeSupported("video/webm")
      ? "video/webm"
      : "video/mp4";

    const recorder = new MediaRecorder(streamRef.current, { mimeType });
    mediaRecorderRef.current = recorder;
    chunksRef.current = [];

    recorder.ondataavailable = (e) => {
      if (e.data.size > 0) chunksRef.current.push(e.data);
    };
    recorder.onstop = () => {
      const blob = new Blob(chunksRef.current, { type: mimeType });
      setVideoBlob(blob);
      setVideoUrl(URL.createObjectURL(blob));
      setDuration(Math.round((Date.now() - startTimeRef.current) / 1000));
      stopStream();
      if (videoRef.current) {
        videoRef.current.srcObject = null;
      }
      setStage("preview");
    };

    recorder.start(1000);
    startTimeRef.current = Date.now();
    setElapsed(0);
    setStage("recording");

    timerRef.current = setInterval(() => {
      const secs = Math.round((Date.now() - startTimeRef.current) / 1000);
      setElapsed(secs);
      if (secs >= MAX_SECONDS) stopRecording();
    }, 500);
  }

  function stopRecording() {
    if (timerRef.current) clearInterval(timerRef.current);
    mediaRecorderRef.current?.stop();
  }

  function reRecord() {
    if (videoUrl) URL.revokeObjectURL(videoUrl);
    setVideoBlob(null);
    setVideoUrl(null);
    setStage("intro");
  }

  async function submitVideo() {
    if (!videoBlob || !name.trim()) return;
    setStage("uploading");
    setError(null);
    try {
      const fd = new FormData();
      fd.append("token", token);
      fd.append("video", videoBlob, "testimonial.webm");
      fd.append("durationSeconds", String(duration));
      fd.append("submitterName", name.trim());
      if (email.trim()) fd.append("submitterEmail", email.trim());

      const res = await fetch("/api/video-testimonials/upload", { method: "POST", body: fd });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error ?? "Upload failed");
      setStage("done");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Upload failed. Please try again.");
      setStage("form");
    }
  }

  const initials = businessName
    .split(" ")
    .slice(0, 2)
    .map((w) => w[0])
    .join("")
    .toUpperCase();

  if (stage === "unsupported") {
    return (
      <div className="rounded-2xl border border-rose-200 bg-rose-50 p-6 text-center text-sm text-rose-700">
        Your browser does not support video recording. Please try Chrome or Safari on a recent device.
      </div>
    );
  }

  if (stage === "done") {
    return (
      <div className="rounded-3xl border border-slate-200 bg-white p-8 text-center shadow-sm">
        <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-emerald-100 text-2xl">✓</div>
        <h2 className="text-xl font-semibold text-slate-950">Thank you!</h2>
        <p className="mt-2 text-sm text-slate-600">
          Your video testimonial for <span className="font-semibold">{businessName}</span> has been submitted and is under review.
        </p>
      </div>
    );
  }

  return (
    <div className="rounded-3xl border border-slate-200 bg-white shadow-sm overflow-hidden">
      {/* Step 1 — Intro */}
      {stage === "intro" && (
        <div className="flex flex-col items-center gap-6 p-8 text-center">
          {logoUrl ? (
            <img src={logoUrl} alt={businessName} className="h-14 object-contain" />
          ) : (
            <div className="flex h-14 w-14 items-center justify-center rounded-full bg-indigo-100 text-xl font-bold text-indigo-700">
              {initials}
            </div>
          )}
          <div>
            <h2 className="text-xl font-semibold text-slate-950">{businessName} wants to hear from you</h2>
            <p className="mt-2 text-sm text-slate-600">Share your experience in ~90 seconds. No app needed.</p>
          </div>
          <ul className="text-left text-sm text-slate-600 space-y-1 w-full max-w-xs">
            <li>✓ Record a short video in your browser</li>
            <li>✓ Review before you submit</li>
            <li>✓ Takes about 90 seconds</li>
          </ul>
          {error && <p className="text-sm text-rose-600">{error}</p>}
          <button
            onClick={startStream}
            className="w-full rounded-2xl bg-indigo-600 px-6 py-3 text-sm font-semibold text-white hover:bg-indigo-700"
          >
            Let&apos;s Go →
          </button>
        </div>
      )}

      {/* Step 2 — Prompt + live camera preview */}
      {(stage === "idle" || stage === "requesting") && (
        <div className="flex flex-col gap-4 p-6">
          <div className="rounded-xl bg-indigo-50 border border-indigo-100 px-4 py-3">
            <p className="text-xs font-semibold uppercase tracking-wide text-indigo-600 mb-1">Your question</p>
            <p className="text-sm font-medium text-slate-800 italic">&ldquo;{prompt}&rdquo;</p>
          </div>
          <ul className="text-xs text-slate-500 space-y-0.5">
            <li>• Look at the camera, not the screen</li>
            <li>• Find a quiet, well-lit spot</li>
            <li>• Speak naturally — 60–90 seconds is perfect</li>
          </ul>
          <video
            ref={videoRef}
            autoPlay
            playsInline
            muted
            className="w-full rounded-2xl bg-slate-900"
            style={{ maxHeight: "320px" }}
          />
          <button
            onClick={startCountdown}
            disabled={stage === "requesting"}
            className="w-full rounded-2xl bg-indigo-600 px-6 py-3 text-sm font-semibold text-white hover:bg-indigo-700 disabled:opacity-60"
          >
            {stage === "requesting" ? "Starting camera…" : "Start Recording"}
          </button>
        </div>
      )}

      {/* Step 3a — Countdown */}
      {stage === "countdown" && (
        <div className="flex flex-col items-center justify-center gap-4 p-12">
          <video
            ref={videoRef}
            autoPlay
            playsInline
            muted
            className="w-full rounded-2xl bg-slate-900 mb-2"
            style={{ maxHeight: "240px" }}
          />
          <div className="text-7xl font-bold text-indigo-600 tabular-nums">{countdown}</div>
          <p className="text-sm text-slate-500">Get ready…</p>
        </div>
      )}

      {/* Step 3b — Recording */}
      {stage === "recording" && (
        <div className="flex flex-col gap-4 p-6">
          <div className="relative">
            <video
              ref={videoRef}
              autoPlay
              playsInline
              muted
              className="w-full rounded-2xl bg-slate-900"
              style={{ maxHeight: "320px" }}
            />
            <div className="absolute bottom-3 left-0 right-0 px-3">
              <div className="mx-auto max-w-xs rounded-lg bg-black/60 px-3 py-1.5 text-center text-xs text-white/90 backdrop-blur-sm">
                {prompt}
              </div>
            </div>
          </div>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="h-3 w-3 animate-pulse rounded-full bg-rose-500" />
              <span className="text-sm font-semibold text-slate-700">{elapsed}s / {MAX_SECONDS}s</span>
            </div>
            <button
              onClick={stopRecording}
              className="rounded-2xl bg-rose-600 px-6 py-2.5 text-sm font-semibold text-white hover:bg-rose-700"
            >
              Stop
            </button>
          </div>
        </div>
      )}

      {/* Step 4 — Playback */}
      {stage === "preview" && (
        <div className="flex flex-col gap-4 p-6">
          <video
            src={videoUrl ?? undefined}
            controls
            playsInline
            className="w-full rounded-2xl bg-slate-900"
            style={{ maxHeight: "320px" }}
          />
          <div className="flex gap-3">
            <button
              onClick={reRecord}
              className="flex-1 rounded-2xl border border-slate-200 px-5 py-2.5 text-sm font-medium text-slate-700 hover:border-slate-300"
            >
              Re-record
            </button>
            <button
              onClick={() => setStage("form")}
              className="flex-1 rounded-2xl bg-indigo-600 px-5 py-2.5 text-sm font-semibold text-white hover:bg-indigo-700"
            >
              Looks good →
            </button>
          </div>
        </div>
      )}

      {/* Step 5 — Attribution */}
      {(stage === "form" || stage === "uploading") && (
        <div className="flex flex-col gap-4 p-6">
          <div>
            <label className="text-xs font-semibold text-slate-600">
              Your name <span className="text-rose-500">*</span>
            </label>
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Jane Smith"
              required
              className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2 text-sm focus:border-indigo-400 focus:outline-none focus:ring-2 focus:ring-indigo-100"
            />
          </div>
          <div>
            <label className="text-xs font-semibold text-slate-600">
              Email <span className="font-normal text-slate-400">(optional)</span>
            </label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="jane@example.com"
              className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2 text-sm focus:border-indigo-400 focus:outline-none focus:ring-2 focus:ring-indigo-100"
            />
          </div>
          {error && <p className="text-sm text-rose-600">{error}</p>}
          <div className="flex gap-3">
            <button
              onClick={reRecord}
              disabled={stage === "uploading"}
              className="rounded-2xl border border-slate-200 px-4 py-2 text-sm font-medium text-slate-700 hover:border-slate-300 disabled:opacity-50"
            >
              Re-record
            </button>
            <button
              onClick={submitVideo}
              disabled={stage === "uploading" || !name.trim()}
              className="flex-1 rounded-2xl bg-indigo-600 px-4 py-2 text-sm font-semibold text-white hover:bg-indigo-700 disabled:opacity-60"
            >
              {stage === "uploading" ? "Uploading…" : "Submit Testimonial"}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
```

- [ ] **Step 2: Type-check**

```bash
npx tsc --noEmit
```

Expected: No errors.

- [ ] **Step 3: Commit**

```bash
git add src/components/video-recorder.tsx
git commit -m "feat: refactor VideoRecorder into 6-step guided flow with prompt + intro"
```

---

## Task 3: Update /vt/[token]/page.tsx

**Files:**
- Modify: `src/app/vt/[token]/page.tsx`

Pass `prompt`, `businessName`, `logoUrl` from the fetched testimonial into `VideoRecorder`.

- [ ] **Step 1: Replace the file**

```tsx
import { notFound } from "next/navigation";
import { getVideoTestimonialByToken } from "@/lib/video-testimonials";
import { VideoRecorder } from "@/components/video-recorder";

export default async function VideoTestimonialRecorderPage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  const testimonial = await getVideoTestimonialByToken(token);

  if (!testimonial) notFound();

  if (testimonial.videoUrl) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-50 px-4">
        <div className="w-full max-w-md rounded-3xl border border-slate-200 bg-white p-8 text-center shadow-sm">
          <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-emerald-100 text-2xl">✓</div>
          <h1 className="text-xl font-semibold text-slate-950">Already submitted</h1>
          <p className="mt-2 text-sm text-slate-600">This link has already been used. Thank you for your testimonial!</p>
        </div>
      </div>
    );
  }

  const businessName = testimonial.location.name;
  const logoUrl = testimonial.location.publicProfile?.logoUrl ?? undefined;
  const prompt = testimonial.prompt ?? `Share your experience with ${businessName}`;

  return (
    <div className="flex min-h-screen flex-col items-center bg-slate-50 px-4 py-8">
      <div className="w-full max-w-lg">
        <VideoRecorder token={token} prompt={prompt} businessName={businessName} logoUrl={logoUrl} />
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Type-check**

```bash
npx tsc --noEmit
```

Expected: No errors.

- [ ] **Step 3: Commit**

```bash
git add src/app/vt/\[token\]/page.tsx
git commit -m "feat: pass prompt, businessName, logoUrl to VideoRecorder from /vt/[token]"
```

---

## Task 4: SendVideoRequestForm Client Component

**Files:**
- Create: `src/components/send-video-request-form.tsx`

New client component with contact search autocomplete, channel toggle, prompt textarea, and live email/SMS preview.

- [ ] **Step 1: Create the file**

```tsx
"use client";

import { useRef, useState, useTransition } from "react";
import { isRedirectError } from "next/dist/client/components/redirect-error";
import { sendVideoTestimonialRequest } from "@/app/video-testimonials/actions";

type Contact = {
  id: string;
  name: string;
  email: string | null;
  phone: string | null;
  locationId: string;
};

type Location = {
  id: string;
  name: string;
  city: string;
  state: string;
};

interface SendVideoRequestFormProps {
  locations: Location[];
  contacts: Contact[];
}

export function SendVideoRequestForm({ locations, contacts }: SendVideoRequestFormProps) {
  const [locationId, setLocationId] = useState(locations[0]?.id ?? "");
  const [contactQuery, setContactQuery] = useState("");
  const [selectedContact, setSelectedContact] = useState<Contact | null>(null);
  const [showDropdown, setShowDropdown] = useState(false);
  const [channel, setChannel] = useState<"EMAIL" | "SMS">("EMAIL");
  const [recipientName, setRecipientName] = useState("");
  const [recipientEmail, setRecipientEmail] = useState("");
  const [recipientPhone, setRecipientPhone] = useState("");
  const [prompt, setPrompt] = useState("");
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const dropdownRef = useRef<HTMLDivElement>(null);

  const selectedLocation = locations.find((l) => l.id === locationId);
  const defaultPrompt = selectedLocation ? `How has ${selectedLocation.name} helped you?` : "";

  const displayPrompt = prompt || defaultPrompt;

  const filteredContacts = contactQuery.length > 0
    ? contacts
        .filter((c) => c.locationId === locationId)
        .filter((c) =>
          c.name.toLowerCase().includes(contactQuery.toLowerCase()) ||
          (c.email ?? "").toLowerCase().includes(contactQuery.toLowerCase()) ||
          (c.phone ?? "").includes(contactQuery)
        )
        .slice(0, 6)
    : [];

  function selectContact(c: Contact) {
    setSelectedContact(c);
    setContactQuery(c.name);
    setRecipientName(c.name);
    setRecipientEmail(c.email ?? "");
    setRecipientPhone(c.phone ?? "");
    setShowDropdown(false);
  }

  function clearContact() {
    setSelectedContact(null);
    setContactQuery("");
    setRecipientName("");
    setRecipientEmail("");
    setRecipientPhone("");
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setErrorMessage(null);
    const fd = new FormData();
    fd.append("locationId", locationId);
    fd.append("recipientName", selectedContact ? selectedContact.name : recipientName);
    fd.append("recipientEmail", selectedContact ? (selectedContact.email ?? "") : recipientEmail);
    fd.append("recipientPhone", selectedContact ? (selectedContact.phone ?? "") : recipientPhone);
    fd.append("channel", channel);
    fd.append("prompt", displayPrompt);
    startTransition(async () => {
      try {
        await sendVideoTestimonialRequest(fd);
      } catch (err) {
        if (isRedirectError(err)) throw err;
        setErrorMessage(err instanceof Error ? err.message : "Something went wrong.");
      }
    });
  }

  const effectiveName = selectedContact ? selectedContact.name : recipientName;
  const effectiveEmail = selectedContact ? (selectedContact.email ?? "") : recipientEmail;

  return (
    <div className="grid gap-8 lg:grid-cols-[1.4fr_1fr]">
      {/* Left: compose form */}
      <form onSubmit={handleSubmit} className="grid gap-4">
        {/* Location */}
        <div className="flex flex-col gap-1">
          <label className="text-xs font-semibold text-slate-600">Location</label>
          <select
            value={locationId}
            onChange={(e) => { setLocationId(e.target.value); clearContact(); }}
            required
            className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 focus:border-indigo-400 focus:outline-none focus:ring-2 focus:ring-indigo-100"
          >
            {locations.map((loc) => (
              <option key={loc.id} value={loc.id}>{loc.name} — {loc.city}, {loc.state}</option>
            ))}
          </select>
        </div>

        {/* Contact search */}
        <div className="flex flex-col gap-1 relative">
          <label className="text-xs font-semibold text-slate-600">Contact</label>
          <div className={`flex items-center rounded-xl border px-3 py-2 text-sm ${selectedContact ? "border-indigo-400 ring-2 ring-indigo-100" : "border-slate-200"}`}>
            <input
              value={contactQuery}
              onChange={(e) => {
                setContactQuery(e.target.value);
                if (selectedContact) clearContact();
                setShowDropdown(true);
              }}
              onFocus={() => setShowDropdown(true)}
              onBlur={() => setTimeout(() => setShowDropdown(false), 150)}
              placeholder="Search by name, email, or phone…"
              className="flex-1 bg-transparent outline-none text-slate-900 placeholder:text-slate-400"
            />
            {selectedContact && (
              <span className="ml-2 text-xs font-semibold text-indigo-600 flex-shrink-0">from contacts ✓</span>
            )}
          </div>
          {showDropdown && filteredContacts.length > 0 && (
            <div ref={dropdownRef} className="absolute top-full left-0 right-0 z-10 mt-1 rounded-xl border border-slate-200 bg-white shadow-lg overflow-hidden">
              {filteredContacts.map((c) => (
                <button
                  key={c.id}
                  type="button"
                  onMouseDown={() => selectContact(c)}
                  className="flex w-full items-center justify-between px-4 py-2.5 text-sm hover:bg-slate-50 text-left"
                >
                  <span className="font-medium text-slate-900">{c.name}</span>
                  <span className="text-slate-400 text-xs">{c.email ?? c.phone}</span>
                </button>
              ))}
            </div>
          )}
          {!selectedContact && (
            <p className="text-xs text-slate-400">Or enter manually below if not in contacts</p>
          )}
        </div>

        {/* Manual entry (shown when no contact selected) */}
        {!selectedContact && (
          <div className="grid gap-3 sm:grid-cols-3 bg-slate-50 rounded-xl p-3 border border-slate-100">
            <div className="flex flex-col gap-1">
              <label className="text-xs font-semibold text-slate-500">Name</label>
              <input
                value={recipientName}
                onChange={(e) => setRecipientName(e.target.value)}
                required
                placeholder="Jane Smith"
                className="rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-sm focus:border-indigo-400 focus:outline-none"
              />
            </div>
            <div className="flex flex-col gap-1">
              <label className="text-xs font-semibold text-slate-500">Email</label>
              <input
                type="email"
                value={recipientEmail}
                onChange={(e) => setRecipientEmail(e.target.value)}
                placeholder="jane@example.com"
                className="rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-sm focus:border-indigo-400 focus:outline-none"
              />
            </div>
            <div className="flex flex-col gap-1">
              <label className="text-xs font-semibold text-slate-500">Phone</label>
              <input
                type="tel"
                value={recipientPhone}
                onChange={(e) => setRecipientPhone(e.target.value)}
                placeholder="+17031234567"
                className="rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-sm focus:border-indigo-400 focus:outline-none"
              />
            </div>
          </div>
        )}

        {/* Channel toggle */}
        <div className="flex flex-col gap-1">
          <label className="text-xs font-semibold text-slate-600">Channel</label>
          <div className="flex gap-2">
            {(["EMAIL", "SMS"] as const).map((ch) => (
              <button
                key={ch}
                type="button"
                onClick={() => setChannel(ch)}
                className={`flex-1 rounded-xl border px-4 py-2 text-sm font-semibold transition-colors ${
                  channel === ch
                    ? "border-indigo-400 bg-indigo-50 text-indigo-700"
                    : "border-slate-200 bg-white text-slate-500 hover:border-slate-300"
                }`}
              >
                {ch === "EMAIL" ? "✉ Email" : "💬 SMS"}
              </button>
            ))}
          </div>
        </div>

        {/* Recording prompt */}
        <div className="flex flex-col gap-1">
          <label className="text-xs font-semibold text-slate-600">
            Recording prompt{" "}
            <span className="font-normal text-slate-400">(shown to customer while recording)</span>
          </label>
          <textarea
            value={prompt}
            onChange={(e) => setPrompt(e.target.value)}
            placeholder={defaultPrompt}
            rows={2}
            className="rounded-xl border border-slate-200 px-3 py-2 text-sm text-slate-900 placeholder:text-slate-400 focus:border-indigo-400 focus:outline-none focus:ring-2 focus:ring-indigo-100 resize-none"
          />
          <p className="text-xs text-slate-400">Keep it open-ended. Defaults to &ldquo;{defaultPrompt}&rdquo; if left blank.</p>
        </div>

        {errorMessage && <p className="text-sm text-rose-600">{errorMessage}</p>}

        <button
          type="submit"
          disabled={isPending}
          className="rounded-2xl bg-indigo-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-indigo-700 disabled:opacity-60"
        >
          {isPending ? "Sending…" : "Send Video Request 🎥"}
        </button>
      </form>

      {/* Right: live preview */}
      <div className="hidden lg:block">
        <p className="text-xs font-semibold uppercase tracking-wide text-slate-500 mb-3">
          {channel === "EMAIL" ? "Email preview" : "SMS preview"} — what {effectiveName || "your customer"} receives
        </p>
        {channel === "EMAIL" ? (
          <div className="rounded-2xl border border-slate-200 bg-white p-5 text-sm text-slate-700 space-y-3 shadow-sm">
            <div className="border-b border-slate-100 pb-3 text-xs text-slate-400 space-y-0.5">
              <div>From: {selectedLocation?.name ?? "Your location"} via WeHearYou</div>
              {effectiveEmail && <div>To: {effectiveEmail}</div>}
              <div className="font-semibold text-slate-600 mt-1">
                {effectiveName ? `${effectiveName}, can you share a quick video?` : "Share a quick video about your experience"}
              </div>
            </div>
            <p className="text-xs leading-relaxed text-slate-600">
              Hi {effectiveName || "there"},<br /><br />
              Thank you for being a customer of {selectedLocation?.name ?? "ours"}. We&apos;d love to hear your experience in your own words — would you be willing to record a short 90-second video?
            </p>
            {displayPrompt && (
              <div className="border-l-4 border-indigo-500 bg-indigo-50 px-3 py-2 text-xs italic text-slate-600 rounded-r-lg">
                &ldquo;{displayPrompt}&rdquo;
              </div>
            )}
            <div className="rounded-lg bg-indigo-600 py-2.5 text-center text-xs font-bold text-white">
              Record My Video →
            </div>
            <p className="text-center text-xs text-slate-400">Nothing to download or install. Takes about 90 seconds.</p>
          </div>
        ) : (
          <div className="rounded-2xl border border-slate-200 bg-slate-50 p-5 shadow-sm">
            <div className="inline-block rounded-2xl rounded-tl-sm bg-white border border-slate-200 px-4 py-3 text-sm text-slate-800 shadow-sm max-w-xs">
              Hi {effectiveName || "there"}, {selectedLocation?.name ?? "we"}&apos;d love a short video testimonial from you!{displayPrompt ? ` "${displayPrompt}"` : ""} Record here (90 sec): [link]
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Type-check**

```bash
npx tsc --noEmit
```

Expected: No errors.

- [ ] **Step 3: Commit**

```bash
git add src/components/send-video-request-form.tsx
git commit -m "feat: add SendVideoRequestForm with contact search and live preview"
```

---

## Task 5: Update video-testimonials/page.tsx

**Files:**
- Modify: `src/app/video-testimonials/page.tsx`

Integrate `SendVideoRequestForm`, fetch contacts, update list cards with thumbnails + prompt + dashed awaiting state + Copy button.

- [ ] **Step 1: Replace the file**

```tsx
export const dynamic = "force-dynamic";

import { AppShell } from "@/components/app-shell";
import { FormSubmitButton } from "@/components/form-submit-button";
import { requireActiveMembershipPage } from "@/lib/page-guards";
import { prisma } from "@/lib/prisma";
import { SendVideoRequestForm } from "@/components/send-video-request-form";
import { approveVideoTestimonial, rejectVideoTestimonial, deleteVideoTestimonial } from "./actions";

function formatDuration(seconds: number | null) {
  if (!seconds) return null;
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return m > 0 ? `${m}m ${s}s` : `${s}s`;
}

function StatusBadge({ status, hasVideo }: { status: string; hasVideo: boolean }) {
  if (!hasVideo) {
    return <span className="rounded-full bg-slate-100 px-2 py-0.5 text-xs font-semibold uppercase tracking-wide text-slate-500">Awaiting</span>;
  }
  if (status === "PUBLISHED" || status === "APPROVED") {
    return <span className="rounded-full bg-emerald-50 px-2 py-0.5 text-xs font-semibold uppercase tracking-wide text-emerald-700">Published</span>;
  }
  if (status === "REJECTED") {
    return <span className="rounded-full bg-rose-50 px-2 py-0.5 text-xs font-semibold uppercase tracking-wide text-rose-700">Rejected</span>;
  }
  return <span className="rounded-full bg-amber-50 px-2 py-0.5 text-xs font-semibold uppercase tracking-wide text-amber-700">Pending</span>;
}

function CopyButton({ text }: { text: string }) {
  return (
    <button
      type="button"
      onClick={() => navigator.clipboard.writeText(text)}
      className="flex-shrink-0 rounded-lg border border-slate-200 px-2 py-1 text-xs font-semibold text-indigo-600 hover:border-indigo-300 hover:bg-indigo-50"
    >
      Copy
    </button>
  );
}

export default async function VideoTestimonialsPage() {
  const membership = await requireActiveMembershipPage();
  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";

  const [locations, contactRows] = await Promise.all([
    prisma.location.findMany({
      where: { organizationId: membership.organizationId },
      select: {
        id: true,
        name: true,
        city: true,
        state: true,
        videoTestimonials: {
          orderBy: { createdAt: "desc" },
          select: {
            id: true,
            token: true,
            prompt: true,
            submitterName: true,
            submitterEmail: true,
            videoUrl: true,
            durationSeconds: true,
            status: true,
            createdAt: true,
          },
        },
      },
      orderBy: { name: "asc" },
    }),
    prisma.contact.findMany({
      where: { location: { organizationId: membership.organizationId } },
      select: { id: true, name: true, email: true, phone: true, locationId: true },
      orderBy: { name: "asc" },
    }),
  ]);

  const locationList = locations.map((loc) => ({
    id: loc.id,
    name: loc.name,
    city: loc.city,
    state: loc.state,
  }));

  const allTestimonials = locations
    .flatMap((loc) =>
      loc.videoTestimonials.map((vt) => ({
        ...vt,
        location: { id: loc.id, name: loc.name, city: loc.city, state: loc.state },
      }))
    )
    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

  const pendingCount = allTestimonials.filter((vt) => vt.status === "PENDING" && vt.videoUrl).length;
  const publishedCount = allTestimonials.filter((vt) => vt.status === "PUBLISHED" || vt.status === "APPROVED").length;

  return (
    <AppShell activeScreen="video-testimonials">
      <div className="space-y-6">
        <div>
          <p className="text-sm font-semibold uppercase tracking-[0.22em] text-indigo-600">Video Testimonials</p>
          <h2 className="mt-2 text-3xl font-semibold tracking-tight text-slate-950">Collect and publish video testimonials</h2>
          <p className="mt-2 text-sm text-slate-600">Generate a recording link, share it with a customer, review their submission, and embed published videos on your website.</p>
        </div>

        <div className="grid gap-4 sm:grid-cols-3">
          <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
            <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Total Received</p>
            <p className="mt-1 text-3xl font-semibold text-slate-950">{allTestimonials.filter((vt) => vt.videoUrl).length}</p>
          </div>
          <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
            <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Awaiting Review</p>
            <p className="mt-1 text-3xl font-semibold text-amber-600">{pendingCount}</p>
          </div>
          <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
            <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Published</p>
            <p className="mt-1 text-3xl font-semibold text-emerald-600">{publishedCount}</p>
          </div>
        </div>

        <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
          <h3 className="text-lg font-semibold text-slate-950">Send a Video Request</h3>
          <p className="mt-1 mb-5 text-sm text-slate-600">Send a customer a personalised link to record a short video testimonial via email or SMS.</p>
          {locations.length === 0 ? (
            <p className="text-sm text-slate-500">Add a location first to send video testimonial requests.</p>
          ) : (
            <SendVideoRequestForm locations={locationList} contacts={contactRows} />
          )}
        </section>

        <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
          <h3 className="text-lg font-semibold text-slate-950">All Testimonials</h3>
          {allTestimonials.length === 0 ? (
            <p className="mt-4 text-sm text-slate-500">No video testimonials yet. Send a request above and share it with a customer.</p>
          ) : (
            <div className="mt-4 space-y-4">
              {allTestimonials.map((vt) => {
                const recorderUrl = `${appUrl}/vt/${vt.token}`;
                const isPublished = vt.status === "PUBLISHED" || vt.status === "APPROVED";
                const embedCode = isPublished && vt.videoUrl
                  ? `<iframe src="${appUrl}/embed/vt/${vt.id}" width="640" height="360" frameborder="0" allow="autoplay; fullscreen" allowfullscreen></iframe>`
                  : null;

                return (
                  <div
                    key={vt.id}
                    className={`rounded-2xl border p-4 ${!vt.videoUrl ? "border-dashed border-slate-200 opacity-75" : "border-slate-200"}`}
                  >
                    <div className="flex gap-4 items-start">
                      {/* Thumbnail */}
                      {vt.videoUrl ? (
                        <video
                          src={vt.videoUrl}
                          preload="metadata"
                          className="w-24 h-16 flex-shrink-0 rounded-lg bg-slate-900 object-cover"
                        />
                      ) : (
                        <div className="w-24 h-16 flex-shrink-0 rounded-lg bg-slate-100 border border-dashed border-slate-300 flex items-center justify-center text-2xl">
                          🎥
                        </div>
                      )}

                      {/* Info */}
                      <div className="flex-1 min-w-0">
                        <div className="flex flex-wrap items-center gap-2 mb-1">
                          <span className="font-semibold text-slate-900">{vt.submitterName ?? "Unnamed"}</span>
                          <StatusBadge status={vt.status} hasVideo={!!vt.videoUrl} />
                          {vt.durationSeconds && (
                            <span className="text-xs text-slate-400">{formatDuration(vt.durationSeconds)}</span>
                          )}
                          <span className="text-xs text-slate-400">
                            {!vt.videoUrl ? "Sent" : ""} {new Date(vt.createdAt).toLocaleDateString()}
                          </span>
                        </div>
                        <p className="text-sm text-slate-500 mb-1">{vt.location.name} · {vt.location.city}, {vt.location.state}</p>
                        {vt.prompt && (
                          <p className="text-xs text-slate-400 italic mb-2">&ldquo;{vt.prompt}&rdquo;</p>
                        )}

                        <div className="flex flex-wrap gap-2">
                          {!vt.videoUrl && (
                            <a href={recorderUrl} target="_blank" rel="noreferrer" className="rounded-xl border border-slate-200 px-3 py-1.5 text-xs font-medium text-slate-700 hover:border-slate-300">
                              Open recorder link ↗
                            </a>
                          )}
                          {vt.videoUrl && vt.status === "PENDING" && (
                            <>
                              <a href={vt.videoUrl} target="_blank" rel="noreferrer" className="rounded-xl border border-slate-200 px-3 py-1.5 text-xs font-medium text-slate-700 hover:border-slate-300">Watch ↗</a>
                              <form action={approveVideoTestimonial}>
                                <input type="hidden" name="id" value={vt.id} />
                                <FormSubmitButton idleLabel="Publish" pendingLabel="Publishing…" className="rounded-xl border border-emerald-200 bg-emerald-50 px-3 py-1.5 text-xs font-medium text-emerald-700 hover:border-emerald-300" />
                              </form>
                              <form action={rejectVideoTestimonial}>
                                <input type="hidden" name="id" value={vt.id} />
                                <FormSubmitButton idleLabel="Reject" pendingLabel="Rejecting…" className="rounded-xl border border-rose-200 bg-rose-50 px-3 py-1.5 text-xs font-medium text-rose-700 hover:border-rose-300" />
                              </form>
                            </>
                          )}
                          {isPublished && vt.videoUrl && (
                            <a href={vt.videoUrl} target="_blank" rel="noreferrer" className="rounded-xl border border-slate-200 px-3 py-1.5 text-xs font-medium text-slate-700 hover:border-slate-300">Watch ↗</a>
                          )}
                          <form action={deleteVideoTestimonial}>
                            <input type="hidden" name="id" value={vt.id} />
                            <FormSubmitButton idleLabel="Delete" pendingLabel="Deleting…" className="rounded-xl border border-slate-200 px-3 py-1.5 text-xs font-medium text-slate-500 hover:border-slate-300 hover:text-rose-600" />
                          </form>
                        </div>

                        {embedCode && (
                          <div className="mt-3 flex items-center gap-2 rounded-xl bg-slate-50 border border-slate-100 p-2">
                            <code className="flex-1 truncate text-xs text-slate-600">{embedCode}</code>
                            <CopyButton text={embedCode} />
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </section>
      </div>
    </AppShell>
  );
}
```

- [ ] **Step 2: Type-check**

```bash
npx tsc --noEmit
```

Expected: No errors. (Note: `CopyButton` uses `navigator.clipboard` which is a browser API — this component renders on the server but the onClick only runs client-side. This is intentional and fine in Next.js RSC.)

- [ ] **Step 3: Commit**

```bash
git add src/app/video-testimonials/page.tsx
git commit -m "feat: update testimonials list with thumbnails, prompt display, awaiting state, copy button"
```

---

## Task 6: Update sendVideoTestimonialRequest Action + Email/SMS Templates

**Files:**
- Modify: `src/app/video-testimonials/actions.ts`
- Modify: `src/lib/email.ts`
- Modify: `src/lib/sms.ts`

- [ ] **Step 1: Update `sendVideoTestimonialRequest` in `actions.ts`**

Find the `sendVideoTestimonialRequest` function and replace it:

```ts
export async function sendVideoTestimonialRequest(formData: FormData) {
  const locationId = String(formData.get("locationId") ?? "").trim();
  const recipientName = String(formData.get("recipientName") ?? "").trim();
  const recipientEmail = String(formData.get("recipientEmail") ?? "").trim();
  const recipientPhone = String(formData.get("recipientPhone") ?? "").trim();
  const channel = String(formData.get("channel") ?? "EMAIL").trim();
  const prompt = String(formData.get("prompt") ?? "").trim() || null;

  if (!locationId) throw new Error("Location is required");
  if (!recipientName) throw new Error("Recipient name is required");
  if (channel === "EMAIL" && !recipientEmail) throw new Error("Email is required");
  if (channel === "SMS" && !recipientPhone) throw new Error("Phone is required");

  await requireLocationAccess(locationId);

  const location = await prisma.location.findUnique({
    where: { id: locationId },
    select: { name: true },
  });
  if (!location) throw new Error("Location not found");

  const { nanoid } = await import("nanoid");
  const token = nanoid(24);

  await prisma.videoTestimonial.create({
    data: { locationId, token, submitterName: recipientName, submitterEmail: recipientEmail || null, prompt },
  });

  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";
  const recorderUrl = `${appUrl}/vt/${token}`;

  if (channel === "EMAIL" && recipientEmail) {
    const { sendVideoTestimonialRequestEmail } = await import("@/lib/email");
    await sendVideoTestimonialRequestEmail({
      to: recipientEmail,
      recipientName,
      locationName: location.name,
      recorderUrl,
      prompt: prompt ?? undefined,
    });
  }

  if (channel === "SMS" && recipientPhone) {
    const { sendVideoTestimonialRequestSMS } = await import("@/lib/sms");
    await sendVideoTestimonialRequestSMS({
      to: recipientPhone,
      recipientName,
      locationName: location.name,
      recorderUrl,
      prompt: prompt ?? undefined,
    });
  }

  revalidatePath("/video-testimonials");
  redirect(`/video-testimonials?flash=Video+testimonial+request+sent+to+${encodeURIComponent(recipientName)}&tone=success`);
}
```

- [ ] **Step 2: Update `sendVideoTestimonialRequestEmail` in `src/lib/email.ts`**

Find the function signature and add `prompt?: string`. Then add the prompt as a block-quote in the HTML body. Change the signature from:

```ts
export async function sendVideoTestimonialRequestEmail({
  to,
  recipientName,
  locationName,
  recorderUrl,
}: {
  to: string;
  recipientName: string;
  locationName: string;
  recorderUrl: string;
})
```

To:

```ts
export async function sendVideoTestimonialRequestEmail({
  to,
  recipientName,
  locationName,
  recorderUrl,
  prompt,
}: {
  to: string;
  recipientName: string;
  locationName: string;
  recorderUrl: string;
  prompt?: string;
})
```

And inside the `html` template string, after the intro paragraph and before the CTA button, add:

```html
${prompt ? `<div style="border-left:3px solid #4f46e5;background:#eef2ff;border-radius:0 8px 8px 0;padding:12px 16px;margin:16px 0;font-style:italic;color:#3730a3;">${prompt}</div>` : ''}
```

- [ ] **Step 3: Update `sendVideoTestimonialRequestSMS` in `src/lib/sms.ts`**

Change the function signature to accept `prompt?: string` and include it in the SMS body:

```ts
export async function sendVideoTestimonialRequestSMS({
  to,
  recipientName,
  locationName,
  recorderUrl,
  prompt,
}: {
  to: string;
  recipientName: string;
  locationName: string;
  recorderUrl: string;
  prompt?: string;
}) {
  const promptPart = prompt ? ` "${prompt}"` : "";
  const body = `Hi ${recipientName}, ${locationName} would love a short video testimonial from you!${promptPart} Record here (90 sec): ${recorderUrl}`;
  await sendSMS({ to, body });
}
```

- [ ] **Step 4: Type-check**

```bash
npx tsc --noEmit
```

Expected: No errors.

- [ ] **Step 5: Commit**

```bash
git add src/app/video-testimonials/actions.ts src/lib/email.ts src/lib/sms.ts
git commit -m "feat: store and pass prompt in video testimonial send action and email/SMS templates"
```

---

## Task 7: WidgetLayoutPicker — Add Content Type Step

**Files:**
- Modify: `src/components/widget-layout-picker.tsx`

Add a `step` state (`"content-type" | "layout"`) and a content type picker as Step 1 before the existing layout picker. Pass `contentType` in formData to `createReviewWidget`.

- [ ] **Step 1: Add content type state and picker**

At the top of the component, after the existing state declarations, add:

```ts
const [step, setStep] = useState<"content-type" | "layout">("content-type");
const [contentType, setContentType] = useState<"TEXT" | "VIDEO" | "MIXED" | null>(null);
```

Replace the `eligibleLocations` line with:

```ts
const eligibleLocations = contentType === "VIDEO"
  ? locations.filter((l) => (l as Location & { videoTestimonialCount?: number }).videoTestimonialCount ?? 0 > 0)
  : locations.filter((l) => l.canCreateWidget);
```

- [ ] **Step 2: Update handleSubmit to include contentType**

In `handleSubmit`, add before `createReviewWidget(formData)`:

```ts
formData.append("contentType", contentType ?? "TEXT");
```

- [ ] **Step 3: Add content type picker UI before tabs**

Replace the return statement body with a two-step structure. Before the Tabs `<div>`, add:

```tsx
{step === "content-type" && (
  <div className="mb-10">
    <h2 className="text-xl font-semibold text-slate-900 mb-2">What content should this widget show?</h2>
    <p className="text-sm text-slate-500 mb-6">You can mix text reviews and video testimonials, or keep them separate.</p>
    <div className="grid gap-4 sm:grid-cols-3">
      {([
        {
          value: "TEXT" as const,
          icon: "⭐",
          label: "Text Reviews",
          desc: "Google reviews synced from Google Business Profile",
        },
        {
          value: "VIDEO" as const,
          icon: "🎥",
          label: "Video Testimonials",
          desc: "Published video testimonials for the location",
        },
        {
          value: "MIXED" as const,
          icon: "⭐🎥",
          label: "Both",
          desc: "Text reviews and video testimonials mixed by date",
        },
      ] as const).map((opt) => (
        <button
          key={opt.value}
          type="button"
          onClick={() => { setContentType(opt.value); setStep("layout"); }}
          className="rounded-2xl border-2 border-slate-200 bg-white p-5 text-left hover:border-indigo-400 hover:shadow-md transition-all"
        >
          <div className="text-2xl mb-2">{opt.icon}</div>
          <div className="font-semibold text-slate-900">{opt.label}</div>
          <div className="text-xs text-slate-500 mt-1">{opt.desc}</div>
        </button>
      ))}
    </div>
  </div>
)}

{step === "layout" && (
  <>
    <div className="flex items-center gap-3 mb-6">
      <button
        type="button"
        onClick={() => { setStep("content-type"); setSelectedLayout(null); }}
        className="text-sm text-slate-500 hover:text-slate-700"
      >
        ← Back
      </button>
      <span className="text-sm text-slate-400">|</span>
      <span className="text-sm font-medium text-slate-700">
        {contentType === "TEXT" ? "⭐ Text Reviews" : contentType === "VIDEO" ? "🎥 Video Testimonials" : "⭐🎥 Both"}
      </span>
    </div>
    {/* existing tabs + grid */}
```

Close the `step === "layout"` block after the slide-up panel `</div>`.

- [ ] **Step 4: Update the slide-up panel location dropdown**

In the slide-up panel, the location dropdown currently only shows `eligibleLocations`. For VIDEO content type, the message when no eligible locations exist should read:

```tsx
{eligibleLocations.length === 0 ? (
  <p className="flex-1 text-sm text-amber-700 bg-amber-50 border border-amber-200 rounded-lg px-4 py-2.5">
    {contentType === "VIDEO"
      ? "No published video testimonials yet — publish some first."
      : "No eligible locations yet — sync Google reviews first."}
  </p>
) : (
  // existing select...
)}
```

- [ ] **Step 5: Type-check**

```bash
npx tsc --noEmit
```

Expected: No errors.

- [ ] **Step 6: Commit**

```bash
git add src/components/widget-layout-picker.tsx
git commit -m "feat: add content type picker step to WidgetLayoutPicker"
```

---

## Task 8: Update widgets/actions.ts — Accept contentType

**Files:**
- Modify: `src/app/widgets/actions.ts`

`createReviewWidget` accepts `contentType`. For VIDEO widgets, skip the Google mapping check and verify published video testimonials exist instead.

- [ ] **Step 1: Update `createReviewWidget`**

Find `createReviewWidget` and replace it:

```ts
export async function createReviewWidget(formData: FormData) {
  const membership = await getCurrentMembership();
  const locationId = String(formData.get("locationId") ?? "").trim();
  const name = String(formData.get("name") ?? "").trim() || "Reviews Widget";

  const ALLOWED_LAYOUTS = new Set(["grid", "list", "slider", "badge", "carousel", "masonry", "floating"]);
  const rawLayout = String(formData.get("layout") ?? "").trim();
  const layout = ALLOWED_LAYOUTS.has(rawLayout) ? rawLayout : "grid";

  const ALLOWED_CONTENT_TYPES = new Set(["TEXT", "VIDEO", "MIXED"]);
  const rawContentType = String(formData.get("contentType") ?? "TEXT").trim();
  const contentType = ALLOWED_CONTENT_TYPES.has(rawContentType) ? rawContentType : "TEXT";

  if (!membership) {
    throw new Error("Organization is required");
  }

  const organizationId = membership.organizationId;

  if (!locationId) {
    throw new Error("Location is required");
  }

  await requireOrganizationAccess(organizationId);

  const location = await prisma.location.findFirst({
    where: { id: locationId, organizationId },
    select: { id: true, googleLocationName: true, name: true },
  });

  if (!location) {
    throw new Error("Location not found for this organization");
  }

  if (contentType === "VIDEO") {
    const videoCount = await prisma.videoTestimonial.count({
      where: { locationId: location.id, status: "APPROVED" },
    });
    if (videoCount === 0) {
      redirect(`/widgets?flash=${encodeURIComponent(`Publish at least one video testimonial for ${location.name} before creating a video widget`)}&tone=error`);
    }
  } else {
    if (!location.googleLocationName) {
      redirect(`/widgets?flash=${encodeURIComponent(`Map ${location.name} to Google before creating a widget`)}&tone=error`);
    }

    const reviewCount = await prisma.review.count({
      where: { locationId: location.id, source: "GOOGLE", status: "PUBLISHED" },
    });

    if (reviewCount === 0) {
      redirect(`/widgets?flash=${encodeURIComponent(`Sync Google reviews for ${location.name} before creating a widget`)}&tone=error`);
    }
  }

  const widget = await prisma.reviewWidget.create({
    data: {
      organizationId,
      locationId,
      name,
      layout,
      contentType,
      publicToken: generateReviewWidgetToken(),
    },
  });

  redirect(`/widgets/${widget.id}`);
}
```

- [ ] **Step 2: Type-check**

```bash
npx tsc --noEmit
```

Expected: No errors.

- [ ] **Step 3: Commit**

```bash
git add src/app/widgets/actions.ts
git commit -m "feat: accept contentType in createReviewWidget; skip Google check for VIDEO widgets"
```

---

## Task 9: Extend review-widgets.ts — Video Payload + Eligible Locations

**Files:**
- Modify: `src/lib/review-widgets.ts`

Add `PublicWidgetVideoTestimonial` type, extend `PublicWidgetPayload` with `contentType` and `videoTestimonials`, update `getPublicReviewWidgetPayload` to fetch video testimonials for VIDEO/MIXED, and update `getWidgetEligibleLocations` to include `videoTestimonialCount`.

- [ ] **Step 1: Add new type after `PublicWidgetReview`**

```ts
export type PublicWidgetVideoTestimonial = {
  id: string;
  submitterName: string | null;
  videoUrl: string;
  durationSeconds: number | null;
  publishedAt: string | null;
};
```

- [ ] **Step 2: Extend `PublicWidgetPayload`**

In the `widget` object inside `PublicWidgetPayload`, add:

```ts
contentType: string;
```

After `reviews: PublicWidgetReview[];`, add:

```ts
videoTestimonials?: PublicWidgetVideoTestimonial[];
```

- [ ] **Step 3: Update `getPublicReviewWidgetPayload`**

At the end of the function, before the `return` statement, add video testimonial fetching. Replace the return with:

```ts
  const videoTestimonials: PublicWidgetVideoTestimonial[] = [];
  if (widget.contentType === "VIDEO" || widget.contentType === "MIXED") {
    const vts = await prisma.videoTestimonial.findMany({
      where: {
        locationId: widget.locationId,
        status: "APPROVED",
        videoUrl: { not: null },
      },
      orderBy: { publishedAt: "desc" },
      select: {
        id: true,
        submitterName: true,
        videoUrl: true,
        durationSeconds: true,
        publishedAt: true,
      },
    });
    videoTestimonials.push(
      ...vts
        .filter((v): v is typeof v & { videoUrl: string } => v.videoUrl !== null)
        .map((v) => ({
          id: v.id,
          submitterName: v.submitterName,
          videoUrl: v.videoUrl,
          durationSeconds: v.durationSeconds,
          publishedAt: v.publishedAt ? v.publishedAt.toISOString() : null,
        }))
    );
  }

  return {
    widget: {
      name: widget.name,
      layout: widget.layout,
      contentType: widget.contentType,
      theme: widget.theme,
      pageSize,
      showHeader: widget.showHeader,
      showAvgRating: widget.showAvgRating,
      showReviewCount: widget.showReviewCount,
      headerAlign: widget.headerAlign,
      showRating: widget.showRating,
      showReviewerName: widget.showReviewerName,
      showDate: widget.showDate,
      showWriteReview: widget.showWriteReview,
      showResponses: widget.showResponses,
      bodyMaxChars: widget.bodyMaxChars,
      primaryColor: widget.primaryColor,
      starColor: widget.starColor,
      backgroundColor: widget.backgroundColor,
      textColor: widget.textColor,
      fontFamily: widget.fontFamily,
    },
    location: {
      name: widget.location.name,
      avgRating: widget.location.avgRating ?? null,
      reviewCount: total,
      reviewLink: widget.location.reviewLink ?? null,
    },
    reviews: reviews.map((review) => ({
      id: review.id,
      reviewerName: review.reviewerName,
      reviewerPhotoUrl: review.reviewerPhotoUrl ?? null,
      sourceReviewUrl: review.sourceReviewUrl ?? null,
      sourceReplyText: review.sourceReplyText ?? null,
      rating: review.rating,
      body: review.body,
      reviewedAt: review.reviewedAt ? review.reviewedAt.toISOString() : null,
    })),
    pagination: {
      page: safePage,
      pageSize,
      total,
      hasMore: skip + reviews.length < total,
    },
    ...(videoTestimonials.length > 0 ? { videoTestimonials } : {}),
  };
```

- [ ] **Step 4: Update `getWidgetEligibleLocations` to add `videoTestimonialCount`**

In the `locations.map` callback, after `const reviewCount = ...`, add:

```ts
      const videoTestimonialCount = await prisma.videoTestimonial.count({
        where: { locationId: location.id, status: "APPROVED" },
      });
```

And include it in the returned object:

```ts
      return {
        ...location,
        reviewCount,
        videoTestimonialCount,
        hasMappedGoogleLocation,
        canCreateWidget,
        guidance: !hasMappedGoogleLocation
          ? "Map this location to Google first"
          : reviewCount === 0
            ? "Sync Google reviews before creating a widget"
            : "Ready",
      };
```

- [ ] **Step 5: Update the `Location` type in widget-layout-picker.tsx**

In `src/components/widget-layout-picker.tsx`, add `videoTestimonialCount?: number` to the `Location` type:

```ts
type Location = {
  id: string;
  name: string;
  canCreateWidget: boolean;
  guidance: string;
  reviewCount: number;
  videoTestimonialCount?: number;
};
```

- [ ] **Step 6: Type-check**

```bash
npx tsc --noEmit
```

Expected: No errors.

- [ ] **Step 7: Commit**

```bash
git add src/lib/review-widgets.ts src/components/widget-layout-picker.tsx
git commit -m "feat: extend widget payload with contentType and videoTestimonials; add videoTestimonialCount to eligible locations"
```

---

## Task 10: Embed Script — Video Cards, Lightbox, Masonry, MIXED Mode

**Files:**
- Modify: `src/app/embed/widget.js/route.ts`

Add CSS for video cards and masonry layout, add `renderVideoCard`, `openVideoLightbox`, `attachVideoCardHandlers` functions, and update `loadPage` to handle `data.videoTestimonials` array (including MIXED mode interleaving).

- [ ] **Step 1: Add CSS for video cards and masonry**

In `ensureStyles()`, after the last existing CSS string (`.why-widget-branding a:hover{...}`), append:

```js
      ".why-video-card{display:flex;flex-direction:column;gap:0;border:1px solid rgba(0,0,0,.08);border-radius:16px;background:#fff;overflow:hidden;cursor:pointer;transition:transform .15s,box-shadow .15s}" +
      ".why-video-card:hover{transform:translateY(-2px);box-shadow:0 4px 16px rgba(0,0,0,.1)}" +
      ".why-video-thumb{position:relative;background:#0f172a;aspect-ratio:16/9;overflow:hidden;display:flex;align-items:center;justify-content:center}" +
      ".why-video-thumb video{width:100%;height:100%;object-fit:cover;display:block}" +
      ".why-video-play{position:absolute;width:44px;height:44px;background:rgba(255,255,255,.2);border-radius:50%;display:flex;align-items:center;justify-content:center;font-size:18px;color:#fff;backdrop-filter:blur(2px)}" +
      ".why-video-duration{position:absolute;bottom:6px;right:8px;font-size:11px;color:rgba(255,255,255,.8);background:rgba(0,0,0,.5);padding:1px 5px;border-radius:4px}" +
      ".why-video-info{padding:10px 12px}" +
      ".why-video-name{font-size:13px;font-weight:600}" +
      ".why-widget-masonry{display:grid;gap:16px;grid-template-columns:repeat(auto-fit,minmax(220px,1fr));align-items:start}";
```

- [ ] **Step 2: Add `renderVideoCard`, `openVideoLightbox`, `attachVideoCardHandlers` functions**

After the `renderBadge` function, add:

```js
  function formatDuration(seconds) {
    if (!seconds) return "";
    var m = Math.floor(seconds / 60);
    var s = seconds % 60;
    return m > 0 ? m + ":" + (s < 10 ? "0" : "") + s : s + "s";
  }

  function renderVideoCard(vt) {
    var dur = formatDuration(vt.durationSeconds);
    var name = escapeHtml(vt.submitterName || "Anonymous");
    return '<div class="why-video-card" data-video-url="' + escapeHtml(vt.videoUrl) + '">' +
      '<div class="why-video-thumb">' +
        '<video src="' + escapeHtml(vt.videoUrl) + '#t=0.001" preload="metadata" muted playsinline style="width:100%;height:100%;object-fit:cover"></video>' +
        '<div class="why-video-play">▶</div>' +
        (dur ? '<div class="why-video-duration">' + escapeHtml(dur) + '</div>' : '') +
      '</div>' +
      '<div class="why-video-info"><div class="why-video-name">' + name + '</div></div>' +
    '</div>';
  }

  function openVideoLightbox(url) {
    var overlay = document.createElement("div");
    overlay.style.cssText = "position:fixed;inset:0;z-index:99999;background:rgba(0,0,0,.85);display:flex;align-items:center;justify-content:center;padding:16px";
    var inner = document.createElement("div");
    inner.style.cssText = "position:relative;width:100%;max-width:900px;aspect-ratio:16/9;background:#000;border-radius:12px;overflow:hidden";
    var vid = document.createElement("video");
    vid.src = url;
    vid.controls = true;
    vid.autoplay = true;
    vid.playsInline = true;
    vid.style.cssText = "width:100%;height:100%;object-fit:contain";
    var closeBtn = document.createElement("button");
    closeBtn.textContent = "✕";
    closeBtn.style.cssText = "position:absolute;top:8px;right:10px;background:rgba(0,0,0,.5);color:#fff;border:none;border-radius:50%;width:32px;height:32px;font-size:16px;cursor:pointer;z-index:1";
    closeBtn.addEventListener("click", function () { document.body.removeChild(overlay); });
    overlay.addEventListener("click", function (e) { if (e.target === overlay) document.body.removeChild(overlay); });
    inner.appendChild(vid);
    inner.appendChild(closeBtn);
    overlay.appendChild(inner);
    document.body.appendChild(overlay);
  }

  function attachVideoCardHandlers(container) {
    var cards = container.querySelectorAll(".why-video-card[data-video-url]");
    cards.forEach(function (card) {
      card.addEventListener("click", function () {
        var url = card.getAttribute("data-video-url");
        if (url) openVideoLightbox(url);
      });
    });
  }
```

- [ ] **Step 3: Update `loadPage` to handle VIDEO and MIXED content**

In `loadPage`, after `widgetConfig = data.widget;`, add interleaving logic for MIXED mode. Find the block that builds `layoutClass` (around the line `var layoutClass = data.widget.layout === "list" ? ...`) and replace the full `if (nextPage === 1)` block and subsequent card-rendering section with the updated version below.

The key changes are:
1. If `contentType === "VIDEO"`, use video cards exclusively from `data.videoTestimonials`
2. If `contentType === "MIXED"`, interleave `data.reviews` and `data.videoTestimonials` sorted by date
3. After inserting video cards into the container, call `attachVideoCardHandlers(container)`
4. For masonry layout, add class `why-widget-masonry` instead of `why-widget-grid`

Replace the section from `if (nextPage === 1) {` through `done = !data.pagination.hasMore...` with:

```js
        // Build unified item list for VIDEO and MIXED
        var items = [];
        if (data.widget.contentType === "VIDEO") {
          var vts = data.videoTestimonials || [];
          items = vts.map(function (vt) { return { type: "video", data: vt, date: vt.publishedAt || "" }; });
        } else if (data.widget.contentType === "MIXED") {
          var reviewItems = (data.reviews || []).map(function (r) { return { type: "review", data: r, date: r.reviewedAt || "" }; });
          var vtItems = (data.videoTestimonials || []).map(function (vt) { return { type: "video", data: vt, date: vt.publishedAt || "" }; });
          items = reviewItems.concat(vtItems).sort(function (a, b) { return b.date < a.date ? -1 : b.date > a.date ? 1 : 0; });
        } else {
          items = (data.reviews || []).map(function (r) { return { type: "review", data: r, date: r.reviewedAt || "" }; });
        }

        if (nextPage === 1) {
          var layoutClass = data.widget.layout === "list"
            ? "why-widget-list"
            : data.widget.layout === "slider"
              ? "why-widget-slider-track"
              : data.widget.layout === "carousel"
                ? "why-widget-carousel"
                : data.widget.layout === "masonry"
                  ? "why-widget-masonry"
                  : "why-widget-grid";

          var listWrapper = '';
          if (data.widget.layout === "slider") {
            listWrapper = '<div class="why-widget-slider"><div class="' + layoutClass + '"></div>' +
              (data.widget.showNav !== false ? '<div class="why-widget-slider-controls"><button class="why-widget-slider-btn why-widget-slider-prev" type="button">‹</button><span class="why-widget-slider-label"></span><button class="why-widget-slider-btn why-widget-slider-next" type="button">›</button></div>' : '') +
              '</div>';
          } else if (data.widget.layout === "carousel") {
            listWrapper = '<div class="why-widget-carousel">' +
              '<div class="' + layoutClass + '"></div>' +
              (data.widget.showNav !== false ? '<div class="why-widget-carousel-controls"><button class="why-widget-carousel-btn why-widget-carousel-prev" type="button">‹</button><button class="why-widget-carousel-btn why-widget-carousel-next" type="button">›</button></div>' : '') +
              (data.widget.showPagination !== false ? '<div class="why-widget-carousel-pagination"></div>' : '') +
              '</div>';
          } else {
            listWrapper = '<div class="' + layoutClass + '"></div>';
          }

          var titleHtml = data.widget.name ? '<h2 style="font-size:18px;font-weight:700;margin:0 0 12px 0;color:' + escapeHtml(data.widget.textColor) + '">' + escapeHtml(data.widget.name) + '</h2>' : '';
          mount.innerHTML = '<div class="why-widget" style="font-family:' + fontStack(data.widget.fontFamily) + ';background:' + escapeHtml(data.widget.backgroundColor) + ';color:' + escapeHtml(data.widget.textColor) + ';border-radius:18px;padding:20px;border:1px solid rgba(0,0,0,.06)">' +
            titleHtml +
            renderHeader(data) +
            listWrapper +
            '<div class="why-widget-footer"></div>' +
          '</div>';

          container = mount.querySelector("." + layoutClass);
          footerActions = mount.querySelector(".why-widget-footer");
        }

        if (container) {
          if (data.widget.layout === "slider") {
            container.insertAdjacentHTML("beforeend", items.map(function (item) {
              return '<div class="why-widget-slide">' + (item.type === "video" ? renderVideoCard(item.data) : renderCard(item.data, data.widget)) + '</div>';
            }).join(""));
          } else if (data.widget.layout === "carousel") {
            container.insertAdjacentHTML("beforeend", items.map(function (item, idx) {
              return '<div class="why-widget-carousel-item' + (idx === 0 ? ' active' : '') + '">' + (item.type === "video" ? renderVideoCard(item.data) : renderCard(item.data, data.widget)) + '</div>';
            }).join(""));
            var paginationContainer = mount.querySelector(".why-widget-carousel-pagination");
            if (paginationContainer && data.widget.showPagination !== false) {
              paginationContainer.innerHTML = items.map(function (_, idx) {
                return '<div class="why-widget-carousel-dot' + (idx === 0 ? ' active' : '') + '"></div>';
              }).join("");
            }
          } else {
            container.insertAdjacentHTML("beforeend", items.map(function (item) {
              return item.type === "video" ? renderVideoCard(item.data) : renderCard(item.data, data.widget);
            }).join(""));
          }
          attachVideoCardHandlers(container);
        }

        if (nextPage === 1 && footerActions) {
          var footerHtml = '';
          if (data.widget.showWriteReview && data.location.reviewLink && data.widget.contentType !== "VIDEO") {
            footerHtml += '<a class="why-widget-link" href="' + escapeHtml(data.location.reviewLink) + '" target="_blank" rel="noopener noreferrer" style="color:' + escapeHtml(data.widget.primaryColor) + '">Write a review</a>';
          }
          if (data.widget.showBranding !== false) {
            footerHtml += '<div class="why-widget-branding">Powered by <a href="https://www.wehearyou.io" target="_blank" rel="noopener noreferrer">WeHearYou</a></div>';
          }
          footerActions.innerHTML = footerHtml;
        }

        if (footerActions && !loadMoreButton && data.widget.layout !== "slider" && data.widget.layout !== "carousel" && data.widget.contentType !== "VIDEO") {
          loadMoreButton = document.createElement("button");
          loadMoreButton.type = "button";
          loadMoreButton.className = "why-widget-button";
          loadMoreButton.textContent = "Load more";
          loadMoreButton.addEventListener("click", function () { void loadPage(page + 1); });
          footerActions.appendChild(loadMoreButton);
        }

        if (data.widget.layout === "slider" && nextPage === 1) {
          var slider = mount.querySelector(".why-widget-slider");
          if (slider) attachSliderControls(slider);
        }

        if (data.widget.layout === "carousel" && nextPage === 1) {
          var carousel = mount.querySelector(".why-widget-carousel");
          if (carousel && items.length > 0) {
            attachCarouselControls(carousel, items.length);
          }
        }

        page = data.pagination.page;
        done = !data.pagination.hasMore || data.widget.layout === "slider" || data.widget.layout === "carousel" || data.widget.contentType === "VIDEO" || data.widget.contentType === "MIXED";
        setLoadingState(false);
```

- [ ] **Step 4: Type-check**

```bash
npx tsc --noEmit
```

Expected: No errors. (The embed script is a string constant — TypeScript only checks the surrounding route handler types, not the JS string contents.)

- [ ] **Step 5: Commit**

```bash
git add src/app/embed/widget.js/route.ts
git commit -m "feat: add video card rendering, lightbox, masonry CSS, and MIXED mode to embed script"
```

---

## Task 11: Update /widgets/new Page to Pass videoTestimonialCount

**Files:**
- Modify: `src/app/widgets/new/page.tsx`

The `getWidgetEligibleLocations` function now returns `videoTestimonialCount` — the page needs to pass it through to `WidgetLayoutPicker`.

- [ ] **Step 1: Find the widgets/new page**

```bash
find /Users/safatash/.openclaw/workspace/wehearyou/src/app/widgets -name "page.tsx" | head -5
```

- [ ] **Step 2: Read the file and verify it passes locations to WidgetLayoutPicker**

The page should call `getWidgetEligibleLocations` and pass the result to `<WidgetLayoutPicker locations={...} />`. Since `getWidgetEligibleLocations` now returns `videoTestimonialCount` in the object, no code change is needed in the page — the extra field flows through automatically. Verify this is the case by reading the file.

If the page type-narrows the locations object before passing it, add `videoTestimonialCount` to that type.

- [ ] **Step 3: Type-check**

```bash
npx tsc --noEmit
```

Expected: No errors.

- [ ] **Step 4: Commit if changes were needed**

```bash
git add src/app/widgets/new/page.tsx
git commit -m "chore: pass videoTestimonialCount through to WidgetLayoutPicker"
```

---

## Self-Review Checklist

| Spec requirement | Covered in task |
|-----------------|----------------|
| 6-step client recording flow | Task 2 |
| Prompt shown in step 2 and recording overlay | Task 2 |
| Camera on "Let's Go", not "Start Recording" | Task 2 |
| 3-second countdown | Task 2 |
| Name field required | Task 2 |
| Pass prompt/businessName/logoUrl to VideoRecorder | Task 3 |
| Contact search autocomplete | Task 4 |
| Channel toggle (EMAIL/SMS) | Task 4 |
| Custom prompt field | Task 4 |
| Live email/SMS preview | Task 4 |
| SendVideoRequestForm replaces static form | Task 5 |
| Video thumbnails in list | Task 5 |
| Prompt display in list | Task 5 |
| Awaiting state (dashed card) | Task 5 |
| Copy embed button | Task 5 |
| prompt stored on VideoTestimonial | Task 6 |
| Prompt in email template (block-quote callout) | Task 6 |
| Prompt in SMS body | Task 6 |
| DB: VideoTestimonial.prompt column | Task 1 |
| DB: ReviewWidget.contentType column | Task 1 |
| Content type picker (TEXT/VIDEO/MIXED) as Step 1 in widget creation | Task 7 |
| All 5 layouts apply to all content types | Task 7 + Task 10 |
| VIDEO widget skips Google check | Task 8 |
| Widget payload includes contentType + videoTestimonials | Task 9 |
| Video cards in embed (thumbnail + play + name + duration) | Task 10 |
| Lightbox modal player on video card click | Task 10 |
| Masonry layout CSS | Task 10 |
| MIXED mode: interleave by date | Task 10 |
| Existing TEXT widgets unaffected (default "TEXT") | Task 1 (default) |
