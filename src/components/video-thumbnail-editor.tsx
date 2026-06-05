"use client";

import { useRef, useState } from "react";
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
}: VideoThumbnailEditorProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isCapturing, setIsCapturing] = useState(false);
  const [captureTimestamp, setCaptureTimestamp] = useState(
    capturedFrameTimestamp ?? Math.min(1, (durationSeconds ?? 10) / 2)
  );
  const [captureError, setCaptureError] = useState<string | null>(null);

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

  return (
    <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4 space-y-4">
      <div>
        <h3 className="font-semibold text-slate-900 text-sm mb-3">
          Thumbnail Settings
        </h3>

        {/* Current Thumbnail Display */}
        <div className="mb-4 p-3 rounded-lg bg-white border border-slate-200">
          <p className="text-xs font-medium text-slate-600 mb-2">
            Current Thumbnail
          </p>
          {currentThumbnailUrl ? (
            <img
              src={currentThumbnailUrl}
              alt={getThumbnailAlt(submitterName)}
              className="w-full h-32 object-cover rounded-lg bg-slate-100"
            />
          ) : (
            <div className="w-full h-32 bg-slate-100 rounded-lg flex items-center justify-center text-slate-400">
              <span className="text-sm">No thumbnail</span>
            </div>
          )}
        </div>

        {/* Thumbnail Source Selector */}
        {availableSources.length > 1 && (
          <div className="mb-4 p-3 rounded-lg bg-white border border-slate-200">
            <p className="text-xs font-medium text-slate-600 mb-2">
              Use thumbnail from:
            </p>
            <div className="space-y-2">
              {availableSources.map((source) => (
                <label key={source} className="flex items-center gap-2 cursor-pointer">
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
                  <span className="text-xs text-slate-700">
                    {source === "CUSTOM" && "Uploaded custom image"}
                    {source === "CAPTURED" && "Captured frame"}
                    {source === "DEFAULT" && "Default (first frame)"}
                  </span>
                </label>
              ))}
            </div>
          </div>
        )}

        {/* Custom Upload */}
        <div className="mb-4 p-3 rounded-lg bg-white border border-slate-200">
          <p className="text-xs font-medium text-slate-600 mb-2">
            Upload Custom Thumbnail
          </p>
          <p className="text-xs text-slate-500 mb-2">
            JPG, PNG, or WebP. Max 5MB.
          </p>
          <form action={uploadCustomThumbnail} className="flex gap-2">
            <input type="hidden" name="id" value={videoId} />
            <input
              ref={fileInputRef}
              type="file"
              name="file"
              accept="image/jpeg,image/png,image/webp"
              className="flex-1 text-xs"
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
                  className="rounded-lg border border-rose-200 bg-rose-50 px-2 py-1.5 text-xs font-medium text-rose-700 hover:border-rose-300"
                />
              </form>
            )}
          </form>
        </div>

        {/* Frame Capture */}
        {videoUrl && (
          <div className="p-3 rounded-lg bg-white border border-slate-200">
            <p className="text-xs font-medium text-slate-600 mb-2">
              Capture Frame from Video
            </p>

            {/* Video Preview */}
            <video
              ref={videoRef}
              src={videoUrl}
              className="w-full h-32 bg-slate-900 rounded-lg mb-2"
            />

            {/* Timestamp Slider */}
            {durationSeconds && durationSeconds > 0 && (
              <div className="mb-3">
                <div className="flex justify-between items-center mb-1">
                  <label
                    htmlFor={`capture-slider-${videoId}`}
                    className="text-xs font-medium text-slate-600"
                  >
                    Capture at:
                  </label>
                  <span className="text-xs text-slate-500">
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
              <div className="mb-2 p-2 bg-rose-50 border border-rose-200 rounded text-xs text-rose-700">
                {captureError}
              </div>
            )}

            {/* Capture Button */}
            <button
              onClick={handleCapture}
              disabled={isCapturing}
              className="w-full rounded-lg border border-slate-200 bg-slate-100 px-3 py-1.5 text-xs font-medium text-slate-700 hover:border-slate-300 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isCapturing ? "Capturing…" : "Capture Frame"}
            </button>

            {/* Remove Captured Frame */}
            {capturedFrameUrl && (
              <form action={deleteCapturedFrame} className="mt-2">
                <input type="hidden" name="id" value={videoId} />
                <FormSubmitButton
                  idleLabel="Remove Captured Frame"
                  pendingLabel="Removing…"
                  className="w-full rounded-lg border border-rose-200 bg-rose-50 px-3 py-1.5 text-xs font-medium text-rose-700 hover:border-rose-300"
                />
              </form>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
