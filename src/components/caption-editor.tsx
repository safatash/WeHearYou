"use client";

import { useState } from "react";
import { updateVideoTestimonialCaption } from "@/app/video-testimonials/actions";

const RECOMMENDED_CHARS = 120;

export function CaptionEditor({
  vtId,
  currentCaption,
  prompt,
}: {
  vtId: string;
  currentCaption: string | null | undefined;
  prompt: string | null | undefined;
}) {
  const [isOpen, setIsOpen] = useState(false);
  const [caption, setCaption] = useState(currentCaption ?? "");

  const isDirty = caption !== (currentCaption ?? "");
  const charCount = caption.length;
  const isOverLimit = charCount > RECOMMENDED_CHARS;

  if (!isOpen) {
    return (
      <button
        onClick={() => setIsOpen(true)}
        className="rounded-lg border border-slate-200 px-3 py-1.5 text-xs font-medium text-slate-700 hover:border-slate-300"
      >
        Edit Details
      </button>
    );
  }

  return (
    <div className="w-full mt-3 rounded-xl border border-slate-200 bg-slate-50 p-4 space-y-4">
      <div className="flex items-center justify-between">
        <p className="text-xs font-semibold text-slate-700 uppercase tracking-wide">Edit Details</p>
        <button
          onClick={() => setIsOpen(false)}
          className="text-slate-400 hover:text-slate-600 text-sm leading-none"
          aria-label="Close edit details"
        >
          ✕
        </button>
      </div>

      {prompt && (
        <div>
          <p className="text-xs font-medium text-slate-500 mb-1">
            Recording prompt <span className="font-normal text-slate-400">(private — sent to submitter)</span>
          </p>
          <div className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs text-slate-500 italic">
            {prompt}
          </div>
        </div>
      )}

      <form action={updateVideoTestimonialCaption} onSubmit={() => setIsOpen(false)}>
        <input type="hidden" name="id" value={vtId} />
        <div>
          <label className="block text-xs font-medium text-slate-700 mb-1">
            Public caption{" "}
            <span className="font-normal text-slate-400">— shown under the video in widgets and embeds</span>
          </label>
          <textarea
            name="caption"
            rows={3}
            value={caption}
            onChange={(e) => setCaption(e.target.value)}
            placeholder="Add a short description that will appear below the video for visitors…"
            className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs text-slate-900 placeholder-slate-400 focus:border-indigo-400 focus:outline-none focus:ring-1 focus:ring-indigo-400 resize-none"
          />
        </div>

        <div className="flex items-center justify-between mt-2">
          <span className={`text-xs ${isOverLimit ? "text-orange-600 font-medium" : "text-slate-400"}`}>
            {charCount} / {RECOMMENDED_CHARS} recommended
            {isDirty && <span className="ml-2 text-amber-500">• Unsaved</span>}
          </span>
          <button
            type="submit"
            className="rounded-lg border border-indigo-200 bg-indigo-50 px-3 py-1.5 text-xs font-medium text-indigo-700 hover:border-indigo-300 disabled:opacity-50"
            disabled={!isDirty}
          >
            Save
          </button>
        </div>
      </form>
    </div>
  );
}
