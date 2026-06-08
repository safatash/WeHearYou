"use client";

import { useRef, useState, useEffect } from "react";
import { FormSubmitButton } from "@/components/form-submit-button";
import {
  uploadCustomThumbnail,
  captureVideoFrame,
  setThumbnailSource,
  deleteCustomThumbnail,
  deleteCapturedFrame,
} from "@/app/video-testimonials/actions";
import {
  captureFrameFromVideo,
  formatTimestamp,
  clampTimestamp,
} from "@/app/video-testimonials/frame-capture";
import { getThumbnailUrl, getAvailableThumbnailSources, getThumbnailAlt } from "@/lib/thumbnail-utils";
import { ThumbnailSource } from "@prisma/client";

interface VideoThumbnailEditorProps {
  videoId: string;
  videoUrl: string;
  durationSeconds?: number | null;
  submitterName?: string | null;
  caption?: string | null;
  locationName?: string | null;
  status?: string | null;
  customThumbnailUrl?: string | null;
  capturedFrameUrl?: string | null;
  capturedFrameTimestamp?: number | null;
  thumbnailSource: ThumbnailSource;
  approveAction?: (formData: FormData) => Promise<void>;
  onClose?: () => void;
}

export function VideoThumbnailEditor({
  videoId,
  videoUrl,
  durationSeconds,
  submitterName,
  caption,
  locationName,
  status,
  customThumbnailUrl,
  capturedFrameUrl,
  capturedFrameTimestamp,
  thumbnailSource,
  approveAction,
  onClose = () => {},
}: VideoThumbnailEditorProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isOpen, setIsOpen] = useState(false);
  const [isCapturing, setIsCapturing] = useState(false);
  const [captureTimestamp, setCaptureTimestamp] = useState(
    capturedFrameTimestamp ?? Math.min(1, (durationSeconds ?? 10) / 2)
  );
  const [captureError, setCaptureError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<"auto" | "capture" | "upload">("capture");
  const [pendingSource, setPendingSource] = useState<ThumbnailSource>(thumbnailSource);

  const availableSources = getAvailableThumbnailSources({
    customThumbnailUrl,
    capturedFrameUrl,
    videoUrl,
    thumbnailSource,
  });

  const previewThumbnailUrl = getThumbnailUrl({
    customThumbnailUrl,
    capturedFrameUrl,
    videoUrl,
    thumbnailSource: pendingSource,
  });

  const handleCapture = async () => {
    if (!videoRef.current) {
      setCaptureError("Video element not found");
      return;
    }

    setIsCapturing(true);
    setCaptureError(null);

    try {
      const frameData = await captureFrameFromVideo(videoRef.current, captureTimestamp);

      // Submit to server action
      const form = new FormData();
      form.set("id", videoId);
      form.set("frameData", frameData);
      form.set("timestamp", String(captureTimestamp));

      await captureVideoFrame(form);
    } catch (error) {
      setCaptureError(
        error instanceof Error ? error.message : "Failed to capture frame"
      );
      setIsCapturing(false);
    }
  };

  const maxTimestamp = durationSeconds ? Math.max(0, durationSeconds - 0.1) : 30;

  const handleClose = () => {
    setIsOpen(false);
    onClose();
  };

  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === "Escape" && isOpen) handleClose();
    };
    window.addEventListener("keydown", handleEscape);
    return () => window.removeEventListener("keydown", handleEscape);
  }, [isOpen, onClose]);

  if (!isOpen) {
    return (
      <button
        onClick={() => setIsOpen(true)}
        className="rounded-xl border border-slate-200 px-3 py-1.5 text-xs font-medium text-slate-700 hover:border-slate-300"
      >
        Edit thumbnail
      </button>
    );
  }

  return (
    <>
      {/* Full-screen backdrop */}
      <div className="fixed inset-0 z-40 bg-black/60" onClick={handleClose} />

      {/* Modal — full screen, flex row */}
      <div
        className="fixed inset-0 z-50 flex overflow-hidden"
        role="dialog"
        aria-labelledby="thumb-editor-title"
        aria-modal="true"
      >
        {/* LEFT: Preview panel (hidden on mobile) */}
        <div className="hidden md:flex flex-col flex-1 bg-slate-900 items-center justify-center p-8 overflow-y-auto">
          <div className="w-full max-w-xs">
            <p className="text-xs font-semibold uppercase tracking-widest text-slate-500 mb-4 text-center">
              Widget Preview
            </p>

            <div className="rounded-2xl overflow-hidden bg-white shadow-2xl">
              {/* Thumbnail area */}
              <div className="relative aspect-video bg-slate-800">
                {previewThumbnailUrl ? (
                  <img
                    src={previewThumbnailUrl}
                    alt={getThumbnailAlt(submitterName)}
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <video
                    src={videoUrl}
                    preload="metadata"
                    className="w-full h-full object-cover"
                    muted
                  />
                )}
                {/* Play button overlay */}
                <div className="absolute inset-0 flex items-center justify-center">
                  <div className="w-10 h-10 rounded-full bg-black/40 flex items-center justify-center">
                    <svg className="w-4 h-4 text-white ml-0.5" fill="currentColor" viewBox="0 0 20 20">
                      <path d="M6.3 2.84A1.5 1.5 0 0 0 4 4.11v11.78a1.5 1.5 0 0 0 2.3 1.27l9.344-5.891a1.5 1.5 0 0 0 0-2.538L6.3 2.84Z" />
                    </svg>
                  </div>
                </div>
              </div>
              {/* Card info */}
              <div className="p-3">
                <p className="font-semibold text-sm text-slate-900 truncate">{submitterName ?? "Unnamed"}</p>
                {locationName && <p className="text-xs text-slate-500 truncate">{locationName}</p>}
                {caption && <p className="mt-1.5 text-xs text-slate-600 line-clamp-2">{caption}</p>}
                <div className="mt-2">
                  {status === "APPROVED"
                    ? <span className="inline-flex items-center rounded-full bg-emerald-50 px-2 py-0.5 text-xs font-medium text-emerald-700">Published</span>
                    : status === "PENDING"
                    ? <span className="inline-flex items-center rounded-full bg-amber-50 px-2 py-0.5 text-xs font-medium text-amber-700">Pending Review</span>
                    : null
                  }
                </div>
              </div>
            </div>

            {/* Source indicator */}
            <p className="mt-4 text-center text-xs text-slate-500">
              {pendingSource !== thumbnailSource
                ? <span className="text-amber-400">&#9888; Unsaved source change</span>
                : pendingSource === "CUSTOM"
                ? "Custom upload"
                : pendingSource === "CAPTURED"
                ? "Captured frame"
                : "Auto (first frame)"
              }
            </p>
          </div>
        </div>

        {/* RIGHT: Controls panel */}
        <div className="flex flex-col w-full md:w-[55%] bg-white shadow-2xl overflow-hidden">
          {/* Sticky header */}
          <div className="flex-shrink-0 border-b border-slate-200 px-6 py-4 flex justify-between items-center">
            <h2 id="thumb-editor-title" className="text-lg font-semibold text-slate-900">Edit Thumbnail</h2>
            <button
              onClick={handleClose}
              aria-label="Close"
              className="text-slate-400 hover:text-slate-600 text-xl leading-none"
            >
              ✕
            </button>
          </div>

          {/* Scrollable content */}
          <div className="flex-1 overflow-y-auto p-6 space-y-6">
            {/* Tabs */}
            <div className="border-b border-slate-200">
              <div className="flex gap-1 -mx-6 px-6" role="tablist">
                <button
                  id="tab-auto"
                  onClick={() => setActiveTab("auto")}
                  role="tab"
                  aria-selected={activeTab === "auto"}
                  aria-controls="content-auto"
                  className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
                    activeTab === "auto"
                      ? "border-indigo-600 text-indigo-600"
                      : "border-transparent text-slate-600 hover:text-slate-700"
                  }`}
                >
                  Auto
                </button>
                <button
                  id="tab-capture"
                  onClick={() => setActiveTab("capture")}
                  role="tab"
                  aria-selected={activeTab === "capture"}
                  aria-controls="content-capture"
                  className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
                    activeTab === "capture"
                      ? "border-indigo-600 text-indigo-600"
                      : "border-transparent text-slate-600 hover:text-slate-700"
                  }`}
                >
                  Capture
                </button>
                <button
                  id="tab-upload"
                  onClick={() => setActiveTab("upload")}
                  role="tab"
                  aria-selected={activeTab === "upload"}
                  aria-controls="content-upload"
                  className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
                    activeTab === "upload"
                      ? "border-indigo-600 text-indigo-600"
                      : "border-transparent text-slate-600 hover:text-slate-700"
                  }`}
                >
                  Upload
                </button>
              </div>
            </div>

            {/* Tab Content — Auto */}
            {activeTab === "auto" && (
              <div
                id="content-auto"
                role="tabpanel"
                aria-labelledby="tab-auto"
                className="p-4 rounded-lg bg-slate-50 border border-slate-200"
              >
                <p className="text-sm font-medium text-slate-700 mb-2">
                  Auto Source
                </p>
                <p className="text-sm text-slate-600">
                  Uses the first frame of the video as the thumbnail.
                </p>
              </div>
            )}

            {/* Tab Content — Upload */}
            {activeTab === "upload" && (
              <div
                id="content-upload"
                role="tabpanel"
                aria-labelledby="tab-upload"
                className="p-4 rounded-lg bg-slate-50 border border-slate-200"
              >
                <p className="text-sm font-medium text-slate-700 mb-2">
                  Upload Custom Thumbnail
                </p>
                <p className="text-xs text-slate-600 mb-3">
                  JPG, PNG, or WebP. Max 5MB.
                </p>
                <form action={uploadCustomThumbnail} className="flex gap-2">
                  <input type="hidden" name="id" value={videoId} />
                  <input
                    ref={fileInputRef}
                    type="file"
                    name="file"
                    accept="image/jpeg,image/png,image/webp"
                    className="flex-1 text-sm"
                    onChange={(e) => {
                      if (e.target.files?.[0]) {
                        const form = new FormData();
                        form.set("id", videoId);
                        form.set("file", e.target.files[0]);
                        uploadCustomThumbnail(form);
                      }
                    }}
                  />
                  {customThumbnailUrl && (
                    <form action={deleteCustomThumbnail}>
                      <input type="hidden" name="id" value={videoId} />
                      <FormSubmitButton
                        idleLabel="Remove"
                        pendingLabel="Removing…"
                        className="rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 text-sm font-medium text-rose-700 hover:border-rose-300"
                      />
                    </form>
                  )}
                </form>
              </div>
            )}

            {/* Tab Content — Capture */}
            {activeTab === "capture" && videoUrl && (
              <div
                id="content-capture"
                role="tabpanel"
                aria-labelledby="tab-capture"
                className="p-4 rounded-lg bg-slate-50 border border-slate-200 space-y-3"
              >
                <div>
                  <p className="text-sm font-medium text-slate-700 mb-2">
                    Capture Frame from Video
                  </p>

                  {/* Video Preview */}
                  <video
                    ref={videoRef}
                    src={videoUrl}
                    className="w-full h-40 bg-slate-900 rounded-lg mb-3"
                  />
                </div>

                {/* Timestamp Slider */}
                {durationSeconds && durationSeconds > 0 && (
                  <div>
                    <div className="flex justify-between items-center mb-2">
                      <label
                        htmlFor={`capture-slider-${videoId}`}
                        className="text-sm font-medium text-slate-700"
                      >
                        Capture at:
                      </label>
                      <span className="text-sm text-slate-600">
                        {formatTimestamp(captureTimestamp)}
                      </span>
                    </div>
                    <input
                      id={`capture-slider-${videoId}`}
                      type="range"
                      min="0"
                      max={maxTimestamp}
                      step="0.1"
                      value={captureTimestamp}
                      onChange={(e) => setCaptureTimestamp(parseFloat(e.target.value))}
                      className="w-full"
                    />
                  </div>
                )}

                {/* Error Message */}
                {captureError && (
                  <div className="p-3 bg-rose-50 border border-rose-200 rounded text-sm text-rose-700">
                    {captureError}
                  </div>
                )}

                {/* Capture Button */}
                <button
                  onClick={handleCapture}
                  disabled={isCapturing}
                  className="w-full rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                  {isCapturing ? "Capturing…" : "Capture Frame"}
                </button>

                {/* Remove Captured Frame */}
                {capturedFrameUrl && (
                  <form action={deleteCapturedFrame}>
                    <input type="hidden" name="id" value={videoId} />
                    <FormSubmitButton
                      idleLabel="Remove Captured Frame"
                      pendingLabel="Removing…"
                      className="w-full rounded-lg border border-rose-200 bg-rose-50 px-4 py-2 text-sm font-medium text-rose-700 hover:border-rose-300"
                    />
                  </form>
                )}
              </div>
            )}

            {/* Source Selector — deferred: updates pendingSource only, no immediate server action */}
            {availableSources.length > 1 && (
              <div className="p-4 rounded-lg bg-slate-50 border border-slate-200">
                <p className="text-sm font-medium text-slate-700 mb-3">Select Source</p>
                <div className="space-y-3">
                  {availableSources.map((source) => (
                    <label key={source} className="flex items-center gap-3 cursor-pointer p-2 rounded hover:bg-white transition-colors">
                      <input
                        type="radio"
                        name={`thumbnail-source-${videoId}`}
                        value={source}
                        checked={pendingSource === source}
                        onChange={(e) => setPendingSource(e.target.value as ThumbnailSource)}
                        className="h-4 w-4"
                      />
                      <span className="text-sm text-slate-700">
                        {source === "CUSTOM" && "Uploaded custom image"}
                        {source === "CAPTURED" && "Captured frame"}
                        {source === "DEFAULT" && "Default (first frame)"}
                      </span>
                      {pendingSource === source && source !== thumbnailSource && (
                        <span className="ml-auto text-xs text-amber-500">unsaved</span>
                      )}
                    </label>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Sticky footer */}
          <div className="sticky bottom-0 border-t border-slate-200 bg-white px-6 py-4 flex items-center justify-between gap-2">
            <button
              onClick={handleClose}
              className="rounded-lg border border-slate-200 px-4 py-2 text-sm font-medium text-slate-600 hover:bg-slate-50"
            >
              Cancel
            </button>

            <div className="flex gap-2">
              {/* Save Thumbnail: calls setThumbnailSource with pendingSource — only show when source has changed */}
              {pendingSource !== thumbnailSource && (
                <button
                  onClick={() => {
                    const form = new FormData();
                    form.set("id", videoId);
                    form.set("source", pendingSource);
                    setThumbnailSource(form);
                  }}
                  className="rounded-lg border border-indigo-200 bg-indigo-50 px-4 py-2 text-sm font-medium text-indigo-700 hover:border-indigo-300"
                >
                  Save Thumbnail
                </button>
              )}

              {/* Save & Publish: only when eligible (PENDING status, has approveAction) */}
              {status === "PENDING" && approveAction && (
                <form action={approveAction}>
                  <input type="hidden" name="id" value={videoId} />
                  <FormSubmitButton
                    idleLabel="Save & Publish"
                    pendingLabel="Publishing…"
                    className="rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-2 text-sm font-medium text-emerald-700 hover:border-emerald-300"
                  />
                </form>
              )}
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
