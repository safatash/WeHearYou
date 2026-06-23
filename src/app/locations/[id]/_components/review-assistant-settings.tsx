import type { Location, LocationPublicProfile } from "@prisma/client";
import { FormSubmitButton } from "@/components/form-submit-button";
import { saveReviewAssistantSettings } from "@/app/locations/actions";

const inputClass =
  "rounded-xl border border-[var(--ink-200)] bg-[var(--ink-50)] px-4 py-3 text-sm font-normal text-[var(--ink-700)]";
const labelClass = "grid gap-2 text-sm font-semibold text-[var(--ink-700)]";
const checkboxLabelClass =
  "flex items-center gap-3 rounded-xl border border-[var(--ink-200)] bg-[var(--ink-50)] px-4 py-4 text-sm font-semibold text-[var(--ink-700)]";
const sectionLabel = "text-sm font-semibold uppercase tracking-[0.18em] text-[var(--ink-500)]";

function Toggle({ name, label, defaultChecked }: { name: string; label: string; defaultChecked: boolean }) {
  return (
    <label className={checkboxLabelClass}>
      <input type="checkbox" name={name} defaultChecked={defaultChecked} className="h-4 w-4" />
      {label}
    </label>
  );
}

export function ReviewAssistantSettings({
  location,
  profile,
}: {
  location: Pick<Location, "id" | "reviewLink" | "yelpBusinessUrl">;
  profile: LocationPublicProfile | null;
}) {
  return (
    <section className="rounded-2xl border border-[var(--ink-200)] bg-white p-6 shadow-[var(--shadow-sm)]">
      <h2 className="text-xl font-semibold text-[var(--ink-950)]">AI Review Assistant</h2>
      <p className="mt-2 text-sm text-[var(--ink-600)]">
        Help happy customers turn a few tapped phrases into an authentic review they can copy and post. Customers always edit and post it themselves — nothing is auto-submitted.
      </p>

      <form action={saveReviewAssistantSettings} className="mt-6 space-y-8">
        <input type="hidden" name="locationId" value={location.id} />

        {/* General */}
        <div className="space-y-4">
          <p className={sectionLabel}>General</p>
          <Toggle name="aiAssistantEnabled" label="Enable AI Review Assistant" defaultChecked={profile?.aiAssistantEnabled ?? false} />
          <label className={`${labelClass} max-w-xs`}>
            Positive threshold (assistant shows at or above)
            <select name="negativeFilterThreshold" defaultValue={String(profile?.negativeFilterThreshold ?? 4)} className={inputClass}>
              <option value="4">4 stars</option>
              <option value="5">5 stars</option>
            </select>
            <span className="text-xs font-normal text-[var(--ink-500)]">Ratings below this route to private feedback (never to public review sites).</span>
          </label>
        </div>

        {/* AI controls */}
        <div className="space-y-4 border-t border-[var(--ink-200)] pt-6">
          <p className={sectionLabel}>What customers can do</p>
          <div className="grid gap-3 md:grid-cols-2">
            <Toggle name="aiAssistantAllowGeneration" label="Allow AI draft generation" defaultChecked={profile?.aiAssistantAllowGeneration ?? true} />
            <Toggle name="aiAssistantAllowTone" label="Allow tone selection" defaultChecked={profile?.aiAssistantAllowTone ?? true} />
            <Toggle name="aiAssistantAllowLength" label="Allow length selection" defaultChecked={profile?.aiAssistantAllowLength ?? true} />
            <Toggle name="aiAssistantAllowRegenerate" label="Allow regenerate" defaultChecked={profile?.aiAssistantAllowRegenerate ?? true} />
            <Toggle name="aiAssistantAllowNotes" label="Allow customer notes" defaultChecked={profile?.aiAssistantAllowNotes ?? true} />
          </div>
        </div>

        {/* SEO / natural mentions */}
        <div className="space-y-4 border-t border-[var(--ink-200)] pt-6">
          <p className={sectionLabel}>Natural mentions</p>
          <p className="text-sm text-[var(--ink-600)]">Mentioned naturally in the draft — never keyword-stuffed.</p>
          <div className="grid gap-3 md:grid-cols-3">
            <Toggle name="aiAssistantIncludeBusiness" label="Include business name" defaultChecked={profile?.aiAssistantIncludeBusiness ?? true} />
            <Toggle name="aiAssistantIncludeCity" label="Include city" defaultChecked={profile?.aiAssistantIncludeCity ?? true} />
            <Toggle name="aiAssistantIncludeService" label="Include service name" defaultChecked={profile?.aiAssistantIncludeService ?? true} />
          </div>
        </div>

        {/* Chips */}
        <div className="space-y-4 border-t border-[var(--ink-200)] pt-6">
          <p className={sectionLabel}>Experience chips</p>
          <Toggle name="aiAssistantUseReviewThemes" label="Use AI-generated themes from existing reviews" defaultChecked={profile?.aiAssistantUseReviewThemes ?? true} />
          <label className={labelClass}>
            Custom chips
            <input name="aiAssistantCustomChips" defaultValue={(profile?.aiAssistantCustomChips ?? []).join(", ")} placeholder="Friendly Staff, Fast Service, Great Value" className={inputClass} />
            <span className="text-xs font-normal text-[var(--ink-500)]">Comma-separated. Shown alongside category and service chips, in this order.</span>
          </label>
        </div>

        {/* Destinations */}
        <div className="space-y-4 border-t border-[var(--ink-200)] pt-6">
          <p className={sectionLabel}>Review destinations</p>
          <div className="grid gap-4 md:grid-cols-2">
            <label className={labelClass}>
              Google review URL
              <input name="reviewLink" defaultValue={location.reviewLink ?? ""} placeholder="https://search.google.com/local/writereview?placeid=…" className={inputClass} />
            </label>
            <label className={labelClass}>
              Yelp URL
              <input name="yelpBusinessUrl" defaultValue={location.yelpBusinessUrl ?? ""} placeholder="https://www.yelp.com/biz/…" className={inputClass} />
            </label>
            <label className={labelClass}>
              Facebook review URL
              <input name="facebookReviewUrl" defaultValue={profile?.facebookReviewUrl ?? ""} placeholder="https://www.facebook.com/…/reviews" className={inputClass} />
            </label>
            <label className={labelClass}>
              Trustpilot URL
              <input name="trustpilotReviewUrl" defaultValue={profile?.trustpilotReviewUrl ?? ""} placeholder="https://www.trustpilot.com/review/…" className={inputClass} />
            </label>
          </div>
          <Toggle name="wehearyouReviewsEnabled" label="Allow posting directly to WeHearYou" defaultChecked={profile?.wehearyouReviewsEnabled ?? true} />
        </div>

        <div className="border-t border-[var(--ink-200)] pt-6">
          <FormSubmitButton
            idleLabel="Save AI Assistant settings"
            pendingLabel="Saving…"
            className="rounded-xl bg-[var(--accent)] px-5 py-3 text-sm font-semibold !text-white hover:bg-[var(--accent-strong)]"
          />
        </div>
      </form>
    </section>
  );
}
