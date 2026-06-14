"use client";

import { useState } from "react";
import { generateAiReplyDraft } from "@/app/reviews/actions";

export function GoogleReplySection({
  reviewId,
  replyDraft,
  hasGoogleConnection,
  isReplySent,
  onReplyChange,
}: {
  reviewId: string;
  replyDraft: string;
  hasGoogleConnection: boolean;
  isReplySent: boolean;
  onReplyChange: (text: string) => void;
}) {
  const [draftText, setDraftText] = useState(replyDraft);
  const [isGenerating, setIsGenerating] = useState(false);
  const [generateError, setGenerateError] = useState<string | null>(null);

  const handleGenerateDraft = async () => {
    setIsGenerating(true);
    setGenerateError(null);

    try {
      const result = await generateAiReplyDraft(reviewId);
      if (result.success && result.draft) {
        setDraftText(result.draft);
        onReplyChange(result.draft);
      } else {
        setGenerateError(result.error || "Failed to generate draft");
      }
    } catch (error) {
      setGenerateError(error instanceof Error ? error.message : "Failed to generate draft");
    } finally {
      setIsGenerating(false);
    }
  };

  return (
    <div className="space-y-4">
      {!hasGoogleConnection && (
        <div className="rounded-2xl border border-amber-200 bg-amber-50 p-4">
          <p className="text-sm font-semibold text-amber-900">
            ⚠️ Google connection required to send replies to Google
          </p>
        </div>
      )}

      {generateError && (
        <div className="rounded-2xl border border-rose-200 bg-rose-50 p-4">
          <p className="text-sm font-semibold text-rose-900">{generateError}</p>
        </div>
      )}

      <label className="grid gap-2 text-sm font-semibold text-slate-700">
        Reply text
        <textarea
          name="replyDraft"
          value={draftText}
          onChange={(e) => {
            setDraftText(e.target.value);
            onReplyChange(e.target.value);
          }}
          disabled={isReplySent}
          className={`min-h-40 rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm font-normal leading-7 text-slate-700 ${isReplySent ? "opacity-50 cursor-not-allowed" : ""}`}
        />
      </label>

      <div className="flex flex-wrap gap-3">
        <button
          type="button"
          onClick={handleGenerateDraft}
          disabled={isGenerating || !hasGoogleConnection || isReplySent}
          className={`rounded-2xl border border-slate-200 px-4 py-3 text-sm font-semibold ${isGenerating || !hasGoogleConnection || isReplySent ? "bg-slate-100 text-slate-400 cursor-not-allowed" : "bg-white text-slate-700 hover:bg-slate-50"}`}
        >
          {isGenerating ? "Generating..." : "Generate AI Draft"}
        </button>
      </div>
    </div>
  );
}
