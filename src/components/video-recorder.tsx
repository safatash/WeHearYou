"use client";

import { useRef, useState } from "react";

type Props = { token: string };
type Stage = "idle" | "requesting" | "recording" | "preview" | "form" | "uploading" | "done" | "error" | "unsupported";

export function VideoRecorder({ token }: Props) {
  const [stage, setStage] = useState<Stage>("idle");
  const [error, setError] = useState<string | null>(null);
  const [videoBlob, setVideoBlob] = useState<Blob | null>(null);
  const [videoUrl, setVideoUrl] = useState<string | null>(null);
  const [duration, setDuration] = useState<number>(0);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");

  const videoRef = useRef<HTMLVideoElement>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const startTimeRef = useRef<number>(0);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const [elapsed, setElapsed] = useState(0);

  const MAX_SECONDS = 90;

  function stopStream() {
    streamRef.current?.getTracks().forEach((t) => t.stop());
    streamRef.current = null;
  }

  async function startRecording() {
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

      const mimeType = MediaRecorder.isTypeSupported("video/webm;codecs=vp9,opus")
        ? "video/webm;codecs=vp9,opus"
        : MediaRecorder.isTypeSupported("video/webm")
        ? "video/webm"
        : "video/mp4";

      const recorder = new MediaRecorder(stream, { mimeType });
      mediaRecorderRef.current = recorder;
      chunksRef.current = [];

      recorder.ondataavailable = (e) => { if (e.data.size > 0) chunksRef.current.push(e.data); };
      recorder.onstop = () => {
        const blob = new Blob(chunksRef.current, { type: mimeType });
        setVideoBlob(blob);
        setVideoUrl(URL.createObjectURL(blob));
        setDuration(Math.round((Date.now() - startTimeRef.current) / 1000));
        stopStream();
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
    } catch (err) {
      setError("Camera access was denied. Please allow camera and microphone access and try again.");
      setStage("idle");
    }
  }

  function stopRecording() {
    if (timerRef.current) clearInterval(timerRef.current);
    mediaRecorderRef.current?.stop();
  }

  function reRecord() {
    if (videoUrl) URL.revokeObjectURL(videoUrl);
    setVideoBlob(null);
    setVideoUrl(null);
    setStage("idle");
  }

  async function submitVideo() {
    if (!videoBlob) return;
    setStage("uploading");
    setError(null);
    try {
      const fd = new FormData();
      fd.append("token", token);
      fd.append("video", videoBlob, "testimonial.webm");
      fd.append("durationSeconds", String(duration));
      if (name.trim()) fd.append("submitterName", name.trim());
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

  if (stage === "unsupported") return (
    <div className="rounded-2xl border border-rose-200 bg-rose-50 p-6 text-center text-sm text-rose-700">
      Your browser does not support video recording. Please try Chrome or Safari on a recent device.
    </div>
  );

  if (stage === "done") return (
    <div className="rounded-3xl border border-slate-200 bg-white p-8 text-center shadow-sm">
      <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-emerald-100 text-2xl">✓</div>
      <h2 className="text-xl font-semibold text-slate-950">Thank you!</h2>
      <p className="mt-2 text-sm text-slate-600">Your video testimonial has been submitted and is under review.</p>
    </div>
  );

  return (
    <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
      <video
        ref={videoRef}
        src={videoUrl ?? undefined}
        controls={stage === "preview" || stage === "form"}
        playsInline
        className={`w-full rounded-2xl bg-slate-900 ${stage === "idle" || stage === "requesting" ? "hidden" : "block"}`}
        style={{ maxHeight: "360px" }}
      />

      {(stage === "idle" || stage === "requesting") && (
        <div className="flex flex-col items-center gap-4 py-8">
          <div className="flex h-20 w-20 items-center justify-center rounded-full bg-slate-100 text-4xl">🎥</div>
          <p className="text-sm text-slate-600 text-center">Click below to start recording. Max {MAX_SECONDS} seconds.</p>
          <button onClick={startRecording} disabled={stage === "requesting"} className="rounded-2xl bg-indigo-600 px-6 py-3 text-sm font-semibold text-white hover:bg-indigo-700 disabled:opacity-60">
            {stage === "requesting" ? "Requesting camera..." : "Start Recording"}
          </button>
        </div>
      )}

      {stage === "recording" && (
        <div className="mt-4 flex flex-col items-center gap-3">
          <div className="flex items-center gap-2">
            <span className="h-3 w-3 animate-pulse rounded-full bg-rose-500" />
            <span className="text-sm font-semibold text-slate-700">{elapsed}s / {MAX_SECONDS}s</span>
          </div>
          <button onClick={stopRecording} className="rounded-2xl bg-rose-600 px-6 py-3 text-sm font-semibold text-white hover:bg-rose-700">
            Stop Recording
          </button>
        </div>
      )}

      {stage === "preview" && (
        <div className="mt-4 flex flex-wrap justify-center gap-3">
          <button onClick={reRecord} className="rounded-2xl border border-slate-200 px-5 py-2.5 text-sm font-medium text-slate-700 hover:border-slate-300">
            Re-record
          </button>
          <button onClick={() => setStage("form")} className="rounded-2xl bg-indigo-600 px-5 py-2.5 text-sm font-semibold text-white hover:bg-indigo-700">
            Looks good →
          </button>
        </div>
      )}

      {(stage === "form" || stage === "uploading") && (
        <div className="mt-4 space-y-3">
          <div>
            <label className="text-xs font-semibold text-slate-600">Your name <span className="font-normal text-slate-400">(optional)</span></label>
            <input value={name} onChange={(e) => setName(e.target.value)} placeholder="Jane Smith" className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2 text-sm focus:border-indigo-400 focus:outline-none focus:ring-2 focus:ring-indigo-100" />
          </div>
          <div>
            <label className="text-xs font-semibold text-slate-600">Email <span className="font-normal text-slate-400">(optional)</span></label>
            <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="jane@example.com" className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2 text-sm focus:border-indigo-400 focus:outline-none focus:ring-2 focus:ring-indigo-100" />
          </div>
          {error && <p className="text-sm text-rose-600">{error}</p>}
          <div className="flex gap-3">
            <button onClick={reRecord} disabled={stage === "uploading"} className="rounded-2xl border border-slate-200 px-4 py-2 text-sm font-medium text-slate-700 hover:border-slate-300 disabled:opacity-50">
              Re-record
            </button>
            <button onClick={submitVideo} disabled={stage === "uploading"} className="flex-1 rounded-2xl bg-indigo-600 px-4 py-2 text-sm font-semibold text-white hover:bg-indigo-700 disabled:opacity-60">
              {stage === "uploading" ? "Uploading..." : "Submit Testimonial"}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
