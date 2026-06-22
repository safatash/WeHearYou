"use client";
import { setReviewFeatured, setReviewHiddenFromMiniSite, setReviewWidgetVisible } from "@/app/locations/actions";

export function ReviewRowActions({ reviewId, isFeatured, isHidden, isWidgetVisible }: { reviewId: string; isFeatured: boolean; isHidden: boolean; isWidgetVisible: boolean }) {
  const btn = "rounded-lg border border-[var(--ink-200)] px-2.5 py-1 text-xs font-semibold text-[var(--ink-600)] hover:bg-[var(--ink-50)]";
  return (
    <div className="flex flex-wrap gap-1.5">
      <form action={setReviewFeatured}>
        <input type="hidden" name="reviewId" value={reviewId} />
        <input type="hidden" name="featured" value={(!isFeatured).toString()} />
        <button className={btn} type="submit">{isFeatured ? "Remove from featured" : "Mark as featured"}</button>
      </form>
      <form action={setReviewHiddenFromMiniSite}>
        <input type="hidden" name="reviewId" value={reviewId} />
        <input type="hidden" name="hidden" value={(!isHidden).toString()} />
        <button className={btn} type="submit">{isHidden ? "Show on public page" : "Hide from public page"}</button>
      </form>
      <form action={setReviewWidgetVisible}>
        <input type="hidden" name="reviewId" value={reviewId} />
        <input type="hidden" name="visible" value={(!isWidgetVisible).toString()} />
        <button className={btn} type="submit">{isWidgetVisible ? "Remove from widget" : "Add to widget"}</button>
      </form>
    </div>
  );
}
