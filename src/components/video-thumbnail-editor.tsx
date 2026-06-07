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
  customThumbnailUrl?: string | null;
  capturedFrameUrl?: string | null;
  capturedFrameTimestamp?: number | null;
  thumbnailSource: ThumbnailSource;
  onClose?: () => void;
}

export function VideoThumbnailEditor({
  videoId,
  videoUrl,
  durationSeconds,
  submitterName,
  customThumbnailUrl,
  capturedFrameUrl,
  capturedFrameTimestamp,
  thumbnailSource,
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

  const availableSources = getAvailableThumbnailSources({
    customThumbnailUrl,
    capturedFrameUrl,
    videoUrl,
    thumbnailSource,
  });

  const currentThumbnailUrl = getThumbnailUrl({
    customThumbnailUrl,
    capturedFrameUrl,
    videoUrl,
    thumbnailSource,
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
      {/* Backdrop */}
      <div className="fixed inset-0 z-40 bg-black bg-opacity-50" onClick={handleClose} />

      {/* Drawer */}
      <div
        className="fixed right-0 top-0 z-50 h-full w-full max-w-2xl overflow-y-auto bg-white shadow-2xl"
        role="dialog"
        aria-labelledby="drawer-title"
        aria-modal="true"
      >
        {/* Header */}
        <div className="sticky top-0 border-b border-slate-200 bg-white px-6 py-4 flex justify-between items-center">
          <h2 id="drawer-title" className="text-lg font-semibold text-slate-900">Edit Thumbnail</h2>
          <button
            onClick={handleClose}
            aria-label="Close"
            className="text-slate-500 hover:text-slate-700 text-xl leading-none"
          >
            ✕
          </button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-6">
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

          {/* Current Thumbnail Display */}
          <div className="p-4 rounded-lg bg-slate-50 border border-slate-200">
            <p className="text-sm font-medium text-slate-700 mb-3">
              Current Thumbnail
            </p>
            {currentThumbnailUrl ? (
              <img
                src={currentThumbnailUrl}
                alt={getThumbnailAlt(submitterName)}
                className="w-full h-40 object-cover rounded-lg bg-slate-100"
              />
            ) : (
              <div className="w-full h-40 bg-slate-100 rounded-lg flex items-center justify-center text-slate-400">
                <span className="text-sm">No thumbnail selected</span>
              </div>
            )}
          </div>

          {/* Thumbnail Source Selector */}
          {availableSources.length > 1 && (
            <div className="p-4 rounded-lg bg-slate-50 border border-slate-200">
              <p className="text-sm font-medium text-slate-700 mb-3">
                Select Source
              </p>
              <div className="space-y-3">
                {availableSources.map((source) => (
                  <label
                    key={source}
                    className="flex items-center gap-3 cursor-pointer p-2 rounded hover:bg-white transition-colors"
                  >
                    <input
                      type="radio"
                      name={`thumbnail-source-${videoId}`}
                      value={source}
                      checked={thumbnailSource === source}
                      onChange={(e) => {
                        const form = new FormData();
                        form.set("id", videoId);
                        form.set("source", e.target.value);
                        setThumbnailSource(form);
                      }}
                      className="h-4 w-4"
                    />
                    <span className="text-sm text-slate-700">
                      {source === "CUSTOM" && "Uploaded custom image"}
                      {source === "CAPTURED" && "Captured frame"}
                      {source === "DEFAULT" && "Default (first frame)"}
                    </span>
                  </label>
                ))}
              </div>
            </div>
          )}

          {/* Tab Content */}
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

          {/* Custom Upload Tab */}
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

          {/* Frame Capture Tab */}
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
        </div>

        {/* Footer */}
        <div className="sticky bottom-0 border-t border-slate-200 bg-white px-6 py-4 flex gap-2 justify-end">
          <button
            onClick={handleClose}
            className="rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50 transition-colors"
          >
            Close
          </button>
        </div>
      </div>
    </>
  );
}
