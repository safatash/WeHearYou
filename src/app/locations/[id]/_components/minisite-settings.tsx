import { type LocationPublicProfile } from "@prisma/client";
import { saveMiniSiteSettings } from "@/app/locations/actions";
import { FormSubmitButton } from "@/components/form-submit-button";

type LocationForMiniSiteSettings = {
  id: string;
  name: string;
  publicProfile?: LocationPublicProfile | null;
};

const CTA_OPTIONS = [
  { value: "CALL", label: "Call" },
  { value: "WEBSITE", label: "Website" },
  { value: "DIRECTIONS", label: "Directions" },
  { value: "BOOK", label: "Book" },
  { value: "REVIEW", label: "Review" },
];

const REVIEW_SOURCES = [
  { value: "GOOGLE", label: "Google" },
  { value: "FACEBOOK", label: "Facebook" },
  { value: "YELP", label: "Yelp" },
  { value: "TRUSTPILOT", label: "Trustpilot" },
];

const TOGGLES: { name: string; label: string }[] = [
  { name: "showReviewSummary", label: "Show review summary" },
  { name: "showFeaturedReviews", label: "Show featured reviews" },
  { name: "showServices", label: "Show services" },
  { name: "showSourceBadges", label: "Show source badges" },
  { name: "showMap", label: "Show map" },
  { name: "showHours", label: "Show hours" },
  { name: "showTestimonials", label: "Show testimonials" },
  { name: "showAiReviewSummary", label: "Show AI review summary" },
  { name: "showVerifiedBadge", label: "Show verified badge" },
  { name: "showPoweredBy", label: "Show powered-by" },
];

const inputClass =
  "rounded-xl border border-[var(--ink-200)] bg-[var(--ink-50)] px-4 py-3 text-sm font-normal text-[var(--ink-700)]";
const labelClass = "grid gap-2 text-sm font-semibold text-[var(--ink-700)]";
const checkboxLabelClass =
  "flex items-center gap-3 rounded-xl border border-[var(--ink-200)] bg-[var(--ink-50)] px-4 py-4 text-sm font-semibold text-[var(--ink-700)]";

export function MiniSiteSettings({
  location,
  profile,
}: {
  location: LocationForMiniSiteSettings;
  profile: LocationPublicProfile | null;
}) {
  return (
    <section className="rounded-2xl border border-[var(--ink-200)] bg-white p-6 shadow-[var(--shadow-sm)]">
      <h2 id="minisite-settings" className="text-xl font-semibold text-[var(--ink-950)]">
        Mini site settings
      </h2>
      <p className="mt-2 text-sm text-[var(--ink-600)]">
        Customise the public mini-site content, design, and feature visibility for this location.
      </p>

      <form action={saveMiniSiteSettings} className="mt-6 space-y-8">
        <input type="hidden" name="locationId" value={location.id} />

        {/* Identity */}
        <div className="space-y-4">
          <p className="text-sm font-semibold uppercase tracking-[0.18em] text-[var(--ink-500)]">
            Identity
          </p>
          <div className="grid gap-4 md:grid-cols-2">
            <label className={labelClass}>
              Headline
              <input
                name="headline"
                defaultValue={profile?.headline ?? location.name}
                className={inputClass}
                placeholder="e.g. Your trusted local expert"
              />
            </label>
            <label className={labelClass}>
              Website URL
              <input
                name="websiteUrl"
                defaultValue={profile?.websiteUrl ?? ""}
                className={inputClass}
                placeholder="https://example.com"
              />
            </label>
            <label className={`${labelClass} md:col-span-2`}>
              Subheadline
              <textarea
                name="subheadline"
                defaultValue={profile?.subheadline ?? ""}
                className={`min-h-20 ${inputClass}`}
                placeholder="A short description shown below the headline"
              />
            </label>
            <label className={labelClass}>
              Phone
              <input
                name="phone"
                defaultValue={profile?.phone ?? ""}
                className={inputClass}
                placeholder="+1 (555) 000-0000"
              />
            </label>
            <label className={labelClass}>
              Address Line 1
              <input
                name="addressLine1"
                defaultValue={profile?.addressLine1 ?? ""}
                className={inputClass}
                placeholder="123 Main St"
              />
            </label>
            <label className={labelClass}>
              Timezone
              <input
                name="timezone"
                defaultValue={profile?.timezone ?? ""}
                className={inputClass}
                placeholder="America/Chicago"
              />
            </label>
          </div>
        </div>

        {/* Hero image */}
        <div className="space-y-4 border-t border-[var(--ink-200)] pt-6">
          <p className="text-sm font-semibold uppercase tracking-[0.18em] text-[var(--ink-500)]">
            Hero image
          </p>
          <div className="grid gap-2 text-sm font-semibold text-[var(--ink-700)]">
            <span>
              Cover image{" "}
              <span className="font-normal text-[var(--ink-400)]">
                (shown as hero banner on mini-site)
              </span>
            </span>
            <input type="hidden" name="existingHeroImageUrl" value={profile?.heroImageUrl ?? ""} />
            <input
              name="heroImageFile"
              type="file"
              accept="image/png,image/jpeg,image/webp"
              className="rounded-xl border border-dashed border-[var(--ink-200)] bg-[var(--ink-50)] px-4 py-3 text-sm font-normal text-[var(--ink-700)] file:mr-3 file:rounded-xl file:border-0 file:bg-[var(--ink-900)] file:px-3 file:py-2 file:text-sm file:font-semibold file:text-white"
            />
            {profile?.heroImageUrl ? (
              <div className="flex items-center gap-4 rounded-xl border border-[var(--ink-200)] bg-[var(--ink-50)] px-4 py-3">
                <img
                  src={profile.heroImageUrl}
                  alt="Hero cover"
                  className="h-14 w-24 rounded-xl object-cover"
                />
                <p className="text-sm font-normal text-[var(--ink-600)]">
                  Current cover image. Upload a new one to replace it.
                </p>
              </div>
            ) : (
              <p className="text-sm font-normal text-[var(--ink-500)]">
                Recommended: 1200×400 px or wider.
              </p>
            )}
          </div>
        </div>

        {/* Design */}
        <div className="space-y-4 border-t border-[var(--ink-200)] pt-6">
          <p className="text-sm font-semibold uppercase tracking-[0.18em] text-[var(--ink-500)]">
            Design
          </p>
          <div className="grid gap-4 md:grid-cols-2">
            <div className={labelClass}>
              <span>Accent colour</span>
              <div className="flex items-center gap-3">
                <input
                  type="color"
                  name="accentColor"
                  defaultValue={profile?.accentColor ?? "#37AEB7"}
                  className="h-10 w-12 cursor-pointer rounded-lg border border-[var(--ink-200)] bg-[var(--ink-50)] p-1"
                />
                <input
                  type="text"
                  name="accentColor"
                  defaultValue={profile?.accentColor ?? "#37AEB7"}
                  className={`flex-1 ${inputClass}`}
                  placeholder="#37AEB7"
                  aria-label="Accent colour hex value"
                />
              </div>
            </div>
          </div>
        </div>

        {/* Services */}
        <div className="space-y-4 border-t border-[var(--ink-200)] pt-6">
          <p className="text-sm font-semibold uppercase tracking-[0.18em] text-[var(--ink-500)]">
            Services
          </p>
          <label className={labelClass}>
            Services{" "}
            <span className="font-normal text-[var(--ink-400)]">(comma-separated)</span>
            <input
              name="services"
              defaultValue={profile?.services?.join(", ") ?? ""}
              className={inputClass}
              placeholder="Oil change, Tyre rotation, Brake inspection"
            />
          </label>
        </div>

        {/* Hours */}
        <div className="space-y-4 border-t border-[var(--ink-200)] pt-6">
          <p className="text-sm font-semibold uppercase tracking-[0.18em] text-[var(--ink-500)]">
            Hours
          </p>
          <label className={labelClass}>
            Google hours
            <textarea
              name="googleHours"
              defaultValue={profile?.googleHours ?? ""}
              className={`min-h-28 ${inputClass}`}
              placeholder={"Monday: 9:00 AM – 5:00 PM\nTuesday: 9:00 AM – 5:00 PM"}
            />
          </label>
        </div>

        {/* CTAs */}
        <div className="space-y-4 border-t border-[var(--ink-200)] pt-6">
          <p className="text-sm font-semibold uppercase tracking-[0.18em] text-[var(--ink-500)]">
            Calls to action
          </p>
          <div className="grid gap-4 md:grid-cols-2">
            <label className={labelClass}>
              Primary CTA type
              <select
                name="ctaType"
                defaultValue={profile?.ctaType ?? "REVIEW"}
                className={inputClass}
              >
                {CTA_OPTIONS.map((opt) => (
                  <option key={opt.value} value={opt.value}>
                    {opt.label}
                  </option>
                ))}
              </select>
            </label>
            <label className={labelClass}>
              Primary CTA label
              <input
                name="ctaLabel"
                defaultValue={profile?.ctaLabel ?? ""}
                className={inputClass}
                placeholder="Leave a review"
              />
            </label>
            <label className={labelClass}>
              Secondary CTA type
              <select
                name="secondaryCtaType"
                defaultValue={profile?.secondaryCtaType ?? ""}
                className={inputClass}
              >
                <option value="">None</option>
                {CTA_OPTIONS.map((opt) => (
                  <option key={opt.value} value={opt.value}>
                    {opt.label}
                  </option>
                ))}
              </select>
            </label>
            <label className={labelClass}>
              Secondary CTA label
              <input
                name="secondaryCtaLabel"
                defaultValue={profile?.secondaryCtaLabel ?? ""}
                className={inputClass}
                placeholder="Book an appointment"
              />
            </label>
          </div>
        </div>

        {/* Review sources */}
        <div className="space-y-4 border-t border-[var(--ink-200)] pt-6">
          <div>
            <p className="text-sm font-semibold uppercase tracking-[0.18em] text-[var(--ink-500)]">
              Review sources
            </p>
            <p className="mt-1 text-sm text-[var(--ink-600)]">
              Choose which review platforms to display on the mini-site.
            </p>
          </div>
          <div className="grid gap-3 md:grid-cols-2">
            {REVIEW_SOURCES.map((source) => (
              <label key={source.value} className={checkboxLabelClass}>
                <input
                  type="checkbox"
                  name="enabledReviewSources"
                  value={source.value}
                  defaultChecked={profile?.enabledReviewSources?.includes(source.value)}
                  className="h-4 w-4"
                />
                {source.label}
              </label>
            ))}
          </div>
        </div>

        {/* Feature toggles */}
        <div className="space-y-4 border-t border-[var(--ink-200)] pt-6">
          <div>
            <p className="text-sm font-semibold uppercase tracking-[0.18em] text-[var(--ink-500)]">
              Visibility toggles
            </p>
            <p className="mt-1 text-sm text-[var(--ink-600)]">
              Control which sections appear on the public mini-site.
            </p>
          </div>
          <div className="grid gap-3 md:grid-cols-2">
            {TOGGLES.map((toggle) => {
              const profileValue = profile?.[toggle.name as keyof LocationPublicProfile];
              const defaultChecked = profileValue !== false;
              return (
                <label key={toggle.name} className={checkboxLabelClass}>
                  <input
                    type="checkbox"
                    name={toggle.name}
                    defaultChecked={defaultChecked}
                    className="h-4 w-4"
                  />
                  {toggle.label}
                </label>
              );
            })}
          </div>
        </div>

        <div className="border-t border-[var(--ink-200)] pt-6">
          <FormSubmitButton
            idleLabel="Save mini site settings"
            pendingLabel="Saving…"
            className="rounded-xl bg-[var(--accent)] px-5 py-3 text-sm font-semibold !text-white hover:bg-[var(--accent-strong)]"
          />
        </div>
      </form>
    </section>
  );
}
