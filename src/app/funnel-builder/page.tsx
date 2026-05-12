import Link from "next/link";
import { AppShell } from "@/components/app-shell";
import { FunnelBuilderForm } from "@/components/funnel-builder-form";
import { Field, StatCard } from "@/components/ui";
import { getFunnelBuilderData } from "@/lib/funnels";

export default async function FunnelBuilderPage({
  searchParams,
}: {
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
}) {
  const params = await searchParams;
  const selectedLocationParam = typeof params?.location === "string" ? params.location : undefined;
  const flash = typeof params?.flash === "string" ? params.flash : null;
  const tone = typeof params?.tone === "string" && ["success", "error", "info"].includes(params.tone) ? params.tone as "success" | "error" | "info" : "success";
  const data = await getFunnelBuilderData(selectedLocationParam);

  if (!data.selectedLocation) {
    return (
      <AppShell activeScreen="funnel-builder">
        <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
          <p className="text-sm font-semibold text-slate-900">No locations found.</p>
          <p className="mt-2 text-sm text-slate-600">Seed the database to load a starter funnel configuration.</p>
        </div>
      </AppShell>
    );
  }

  const { locations, selectedLocation, profile } = data;
  const destinationLabel = selectedLocation.reviewLink ? "Google review" : "Private follow-up";

  return (
    <AppShell activeScreen="funnel-builder" flash={flash ? { message: flash, tone } : null}>
      <div className="space-y-6">
        <div>
          <p className="text-sm font-semibold uppercase tracking-[0.22em] text-indigo-600">Funnel Builder</p>
          <h2 className="mt-2 text-3xl font-semibold tracking-tight text-slate-950">Configure the live review funnel</h2>
          <p className="mt-3 max-w-3xl text-slate-600">
            This page should stay focused on setup. Define which location you are editing, what customers see first, and where each branch of the funnel sends them.
          </p>
        </div>

        <div className="grid gap-4 xl:grid-cols-3">
          <StatCard title="Locations" value={locations.length} meta="Available branded funnel variants" />
          <StatCard title="Active Location" value={selectedLocation.name} meta={`${selectedLocation.city}, ${selectedLocation.state}`} />
          <StatCard title="Promoter Destination" value={destinationLabel} meta={selectedLocation.reviewLink ? "Public review path configured" : "Needs review destination"} />
        </div>

        <div className="grid gap-6 xl:grid-cols-[1.2fr_0.8fr]">
          <div className="space-y-6">
            <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <h3 className="text-xl font-semibold text-slate-950">Location scope</h3>
                  <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-600">Pick which business location this funnel belongs to. The live funnel, preview, and public page should all inherit from this selection.</p>
                </div>
                <span className="rounded-full bg-slate-100 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-500">Builder</span>
              </div>
              <div className="mt-5 grid gap-3 md:grid-cols-2">
                {locations.map((location) => {
                  const isSelected = location.id === selectedLocation.id;
                  return (
                    <Link
                      key={location.id}
                      href={`/funnel-builder?location=${location.id}`}
                      className={`block rounded-2xl border p-4 transition ${
                        isSelected ? "border-indigo-200 bg-indigo-50" : "border-slate-200 bg-slate-50 hover:border-slate-300 hover:bg-white"
                      }`}
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div>
                          <p className="font-semibold text-slate-950">{location.name}</p>
                          <p className="mt-1 text-sm text-slate-600">{location.city}, {location.state}</p>
                        </div>
                        <span
                          className={`rounded-full px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.18em] ${
                            isSelected ? "bg-white text-indigo-700" : "bg-white text-slate-500"
                          }`}
                        >
                          {isSelected ? "Selected" : "Switch"}
                        </span>
                      </div>
                      <p className="mt-3 text-sm leading-6 text-slate-600">
                        Slug: <span className="font-medium text-slate-900">/{location.slug}</span>
                      </p>
                    </Link>
                  );
                })}
              </div>
            </section>

            <FunnelBuilderForm
              locationId={selectedLocation.id}
              locationName={selectedLocation.name}
              locationSlug={selectedLocation.slug}
              defaultValues={{
                funnelRatingStyle: profile?.funnelRatingStyle ?? "stars",
                funnelPromptTitle: profile?.funnelPromptTitle ?? `How was your experience with ${selectedLocation.name}?`,
                funnelPromptBody: profile?.funnelPromptBody ?? `Share a quick rating for ${selectedLocation.name}. Happy customers can continue to a public review, while lower ratings stay private so the team can follow up directly.`,
                funnelPrivateTitle: profile?.funnelPrivateTitle ?? `Tell ${selectedLocation.name} how they can improve`,
                funnelPrivateBody: profile?.funnelPrivateBody ?? "Thanks for the honest rating. Your feedback stays private and goes directly to the team for follow-up.",
                funnelPrivateSubmitLabel: profile?.funnelPrivateSubmitLabel ?? "Send private feedback",
                funnelThanksPublicTitle: profile?.funnelThanksPublicTitle ?? `Thanks for rating ${selectedLocation.name}`,
                funnelThanksPublicBody: profile?.funnelThanksPublicBody ?? "One final step, post your review publicly if you'd like to help other customers discover this business.",
                funnelThanksPrivateTitle: profile?.funnelThanksPrivateTitle ?? "Thanks for sharing your feedback",
                funnelThanksPrivateBody: profile?.funnelThanksPrivateBody ?? "Your feedback has been sent privately to the team.",
                funnelReviewButtonLabel: profile?.funnelReviewButtonLabel ?? "Leave a Google review",
              }}
            />
          </div>

          <aside className="space-y-6">
            <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
              <p className="text-sm font-semibold uppercase tracking-[0.22em] text-indigo-600">Builder Summary</p>
              <div className="mt-5 space-y-4">
                <Field label="Selected location" value={selectedLocation.name} />
                <Field label="Live funnel route" value={`/f/${selectedLocation.slug}`} />
                <Field label="Preview route" value={`/funnel-preview?location=${selectedLocation.id}`} />
                <Field label="Promoter destination" value={selectedLocation.reviewLink ?? "Set this in Location Settings"} multiline />
              </div>
              <div className="mt-6 flex flex-wrap gap-3">
                <Link href={`/funnel-preview?location=${selectedLocation.id}`} className="rounded-2xl bg-slate-950 px-4 py-3 text-sm font-semibold text-white shadow-sm">
                  Open preview
                </Link>
                <Link href={`/f/${selectedLocation.slug}`} className="rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm font-semibold text-slate-700 shadow-sm">
                  Open live funnel
                </Link>
                <Link href={`/b/${selectedLocation.slug}`} target="_blank" rel="noreferrer" className="rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm font-semibold text-slate-700 shadow-sm">
                  Open mini-site
                </Link>
              </div>
            </section>

            <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
              <p className="text-sm font-semibold uppercase tracking-[0.22em] text-indigo-600">What belongs elsewhere</p>
              <div className="mt-4 space-y-3 text-sm leading-7 text-slate-600">
                <p><span className="font-semibold text-slate-900">Preview page:</span> interactive star clicks, branch simulation, device testing.</p>
                <p><span className="font-semibold text-slate-900">Live funnel page:</span> real rating capture, redirects, and private feedback submissions.</p>
                <p><span className="font-semibold text-slate-900">Location settings:</span> review destination, CTA links, business info, social links, and public mini-site controls.</p>
              </div>
            </section>
          </aside>
        </div>
      </div>
    </AppShell>
  );
}
