"use client";

import { useRef, useState, useEffect } from "react";
import { upload } from "@vercel/blob/client";

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
  const [script, setScript] = useState("");
  const [uploadProgress, setUploadProgress] = useState(0);

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

  useEffect(() => {
    if (
      (stage === "idle" || stage === "countdown" || stage === "recording") &&
      streamRef.current &&
      videoRef.current
    ) {
      videoRef.current.srcObject = streamRef.current;
      videoRef.current.muted = true;
      videoRef.current.play().catch(() => {});
    }
  }, [stage]);

  useEffect(() => {
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
      stopStream();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

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
    setUploadProgress(0);
    setError(null);
    try {
      const rawType = videoBlob.type;
      const normalizedType = rawType.startsWith("video/webm")
        ? "video/webm"
        : rawType.startsWith("video/mp4") || rawType.startsWith("video/quicktime")
        ? "video/mp4"
        : "video/webm";
      const ext = normalizedType === "video/mp4" ? "mp4" : "webm";
      const file = new File([videoBlob], `testimonial.${ext}`, { type: normalizedType });

      await upload(file.name, file, {
        access: "public",
        handleUploadUrl: "/api/video-testimonials/upload",
        clientPayload: JSON.stringify({
          token,
          durationSeconds: duration,
          submitterName: name.trim(),
          submitterEmail: email.trim() || null,
        }),
        multipart: true,
        onUploadProgress: ({ percentage }) => setUploadProgress(Math.round(percentage)),
      });

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
          <div className="flex flex-col gap-1">
            <label className="text-xs font-semibold text-slate-600">
              Your script <span className="font-normal text-slate-400">(optional — shown while you record)</span>
            </label>
            <textarea
              value={script}
              onChange={(e) => setScript(e.target.value)}
              placeholder={`e.g. "I've been working with ${businessName} for two years and the results have been amazing…"`}
              rows={4}
              className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm text-slate-900 placeholder:text-slate-400 focus:border-indigo-400 focus:outline-none focus:ring-2 focus:ring-indigo-100 resize-none"
            />
          </div>
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
              style={{ maxHeight: "260px" }}
            />
            <div className="absolute bottom-3 left-0 right-0 px-3">
              <div className="mx-auto max-w-xs rounded-lg bg-black/60 px-3 py-1.5 text-center text-xs text-white/90 backdrop-blur-sm">
                {prompt}
              </div>
            </div>
          </div>
          {script && (
            <div className="rounded-2xl bg-slate-900 px-5 py-4 max-h-40 overflow-y-auto">
              <p className="text-xs font-semibold uppercase tracking-wide text-slate-500 mb-2">Your script</p>
              <p className="text-lg font-medium leading-relaxed text-white whitespace-pre-wrap">{script}</p>
            </div>
          )}
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
          {stage === "uploading" && (
            <div className="space-y-1">
              <div className="flex justify-between text-xs text-slate-500">
                <span>Uploading…</span>
                <span>{uploadProgress}%</span>
              </div>
              <div className="h-2 w-full overflow-hidden rounded-full bg-slate-100">
                <div
                  className="h-full rounded-full bg-indigo-600 transition-all duration-300"
                  style={{ width: `${uploadProgress}%` }}
                />
              </div>
            </div>
          )}
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
