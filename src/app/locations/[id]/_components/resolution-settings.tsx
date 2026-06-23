import type { LocationPublicProfile, ResolutionAssistantSettings } from "@prisma/client";
import { FormSubmitButton } from "@/components/form-submit-button";
import { saveResolutionSettings } from "@/app/locations/actions";

const inputClass = "rounded-xl border border-[var(--ink-200)] bg-[var(--ink-50)] px-4 py-3 text-sm font-normal text-[var(--ink-700)]";
const labelClass = "grid gap-2 text-sm font-semibold text-[var(--ink-700)]";
const checkboxLabelClass = "flex items-center gap-3 rounded-xl border border-[var(--ink-200)] bg-[var(--ink-50)] px-4 py-4 text-sm font-semibold text-[var(--ink-700)]";
const sectionLabel = "text-sm font-semibold uppercase tracking-[0.18em] text-[var(--ink-500)]";

function Toggle({ name, label, defaultChecked }: { name: string; label: string; defaultChecked: boolean }) {
  return (
    <label className={checkboxLabelClass}>
      <input type="checkbox" name={name} defaultChecked={defaultChecked} className="h-4 w-4" />
      {label}
    </label>
  );
}

export function ResolutionSettings({
  locationId,
  profile,
  settings,
}: {
  locationId: string;
  profile: LocationPublicProfile | null;
  settings: ResolutionAssistantSettings | null;
}) {
  return (
    <section className="rounded-2xl border border-[var(--ink-200)] bg-white p-6 shadow-[var(--shadow-sm)]">
      <h2 className="text-xl font-semibold text-[var(--ink-950)]">Customer Resolution Assistant</h2>
      <p className="mt-2 text-sm text-[var(--ink-600)]">
        Help unhappy customers (rated below the positive threshold) explain what happened, and turn it into an actionable case you can resolve. This is a recovery tool — it never suppresses or gates public reviews.
      </p>

      <form action={saveResolutionSettings} className="mt-6 space-y-8">
        <input type="hidden" name="locationId" value={locationId} />

        <div className="space-y-4">
          <p className={sectionLabel}>General</p>
          <Toggle name="enabled" label="Enable Customer Resolution Assistant" defaultChecked={settings?.enabled ?? false} />
          <label className={`${labelClass} max-w-xs`}>
            Positive threshold (ratings below this go to resolution)
            <select name="negativeFilterThreshold" defaultValue={String(profile?.negativeFilterThreshold ?? 4)} className={inputClass}>
              <option value="4">4 stars</option>
              <option value="5">5 stars</option>
            </select>
          </label>
        </div>

        <div className="space-y-4 border-t border-[var(--ink-200)] pt-6">
          <p className={sectionLabel}>AI features</p>
          <div className="grid gap-3 md:grid-cols-2">
            <Toggle name="allowAiRewrite" label="Enable AI feedback rewrite" defaultChecked={settings?.allowAiRewrite ?? true} />
            <Toggle name="allowAiSummary" label="Enable AI internal summary" defaultChecked={settings?.allowAiSummary ?? true} />
            <Toggle name="allowPriorityClassification" label="Enable priority classification" defaultChecked={settings?.allowPriorityClassification ?? true} />
            <Toggle name="allowAiResponseDrafts" label="Enable AI response drafts" defaultChecked={settings?.allowAiResponseDrafts ?? true} />
            <Toggle name="followUpEnabled" label="Enable follow-up workflow" defaultChecked={settings?.followUpEnabled ?? true} />
          </div>
        </div>

        <div className="space-y-4 border-t border-[var(--ink-200)] pt-6">
          <p className={sectionLabel}>Notifications</p>
          <div className="grid gap-3 md:grid-cols-2">
            <Toggle name="notifyOnNewFeedback" label="Notify business on new feedback" defaultChecked={settings?.notifyOnNewFeedback ?? true} />
            <Toggle name="notifyOnlyHighCritical" label="Notify only High/Critical feedback" defaultChecked={settings?.notifyOnlyHighCritical ?? false} />
          </div>
          <label className={labelClass}>
            Contact notification emails
            <input name="notifyEmails" defaultValue={(settings?.notifyEmails ?? []).join(", ")} placeholder="owner@business.com, manager@business.com" className={inputClass} />
            <span className="text-xs font-normal text-[var(--ink-500)]">Comma-separated.</span>
          </label>
          <label className={labelClass}>
            Contact notification SMS recipients
            <input name="notifySmsRecipients" defaultValue={(settings?.notifySmsRecipients ?? []).join(", ")} placeholder="+15551234567, +15557654321" className={inputClass} />
            <span className="text-xs font-normal text-[var(--ink-500)]">Comma-separated E.164 phone numbers.</span>
          </label>
        </div>

        <div className="border-t border-[var(--ink-200)] pt-6">
          <FormSubmitButton idleLabel="Save Resolution settings" pendingLabel="Saving…" className="rounded-xl bg-[var(--accent)] px-5 py-3 text-sm font-semibold !text-white hover:bg-[var(--accent-strong)]" />
        </div>
      </form>
    </section>
  );
}
