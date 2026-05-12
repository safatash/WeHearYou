export const dynamic = "force-dynamic";

import { AppShell } from "@/components/app-shell";
import { Field, StatCard } from "@/components/ui";
import { FormSubmitButton } from "@/components/form-submit-button";
import { updateOrganizationSettings } from "@/app/settings/actions";
import { getSettingsData } from "@/lib/settings";
import { requireTeamAccessPage } from "@/lib/page-guards";

export default async function SettingsPage({
  searchParams,
}: {
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
}) {
  const params = (await searchParams) ?? {};
  await requireTeamAccessPage();
  const data = await getSettingsData();
  const flash = typeof params.flash === "string" ? params.flash : null;
  const tone = typeof params.tone === "string" && ["success", "error", "info"].includes(params.tone) ? params.tone as "success" | "error" | "info" : "success";

  if (!data) {
    return (
      <AppShell activeScreen="settings">
        <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
          <p className="text-sm font-semibold text-slate-900">No organization found.</p>
          <p className="mt-2 text-sm text-slate-600">Seed the database to load the starter organization and settings data.</p>
        </div>
      </AppShell>
    );
  }

  const { organization, defaults, stats } = data;

  return (
    <AppShell activeScreen="settings" flash={flash ? { message: flash, tone } : null}>
      <div className="space-y-6">
        <div>
          <p className="text-sm font-semibold uppercase tracking-[0.22em] text-indigo-600">Settings</p>
          <h2 className="mt-2 text-3xl font-semibold tracking-tight text-slate-950">Organization and funnel defaults</h2>
          <p className="mt-3 max-w-3xl text-slate-600">
            Manage the core identity and shared defaults that shape review flows, mini-sites, integrations, and team operations.
          </p>
        </div>

        <div className="grid gap-4 xl:grid-cols-4">
          <StatCard title="Locations" value={stats.locations} meta="Operational locations in this org" />
          <StatCard title="Google Connections" value={stats.googleConnections} meta="Connected Business Profile accounts" />
          <StatCard title="Active Automations" value={stats.activeAutomations} meta="Live workflow defaults currently enabled" />
          <StatCard title="Active Users" value={stats.activeUsers} meta="Team members with active access" />
        </div>

        <div className="grid gap-6 xl:grid-cols-[1fr_1fr]">
          <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
            <p className="text-sm font-semibold uppercase tracking-[0.22em] text-indigo-600">Organization</p>
            <h3 className="mt-2 text-2xl font-semibold text-slate-950">Editable account settings</h3>

            <form action={updateOrganizationSettings} className="mt-6 space-y-4">
              <input type="hidden" name="organizationId" value={organization.id} />

              <label className="grid gap-2 text-sm font-semibold text-slate-700">
                Organization Name
                <input name="name" defaultValue={organization.name} className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm font-normal text-slate-700" />
              </label>

              <label className="grid gap-2 text-sm font-semibold text-slate-700">
                Slug
                <input name="slug" defaultValue={organization.slug} className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm font-normal text-slate-700" />
              </label>

              <label className="grid gap-2 text-sm font-semibold text-slate-700">
                Website
                <input name="website" defaultValue={organization.website ?? ""} className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm font-normal text-slate-700" />
              </label>

              <FormSubmitButton
                idleLabel="Save Organization Settings"
                pendingLabel="Saving..."
                className="rounded-2xl bg-slate-950 px-4 py-3 text-sm font-semibold !text-white shadow-sm visited:!text-white hover:!text-white"
              />
            </form>
          </section>

          <aside className="space-y-6">
            <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
              <p className="text-sm font-semibold uppercase tracking-[0.22em] text-indigo-600">Shared Defaults</p>
              <div className="mt-6 space-y-4">
                <Field label="Default Review Link" value={defaults.defaultReviewLink || "No review link set"} />
                <Field label="Default Booking URL" value={defaults.bookingUrl || "No booking URL set"} />
                <Field label="Default CTA Label" value={defaults.ctaLabel || "No CTA label set"} />
                <Field label="Default CTA URL" value={defaults.ctaUrl || "No CTA URL set"} />
                <Field label="Default Theme" value={defaults.theme} />
              </div>
            </section>

            <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
              <p className="text-sm font-semibold uppercase tracking-[0.22em] text-indigo-600">Operational Footprint</p>
              <div className="mt-4 space-y-3">
                {organization.locations.map((location) => (
                  <div key={location.id} className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                    <div className="flex items-center justify-between gap-3">
                      <p className="font-semibold text-slate-900">{location.name}</p>
                      <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold uppercase tracking-[0.18em] text-slate-600">{location.status}</span>
                    </div>
                    <p className="mt-1 text-sm text-slate-600">{location.city}, {location.state}</p>
                    <p className="mt-1 text-sm text-slate-600">Review link: {location.reviewLink ?? "Not set"}</p>
                  </div>
                ))}
              </div>
            </section>
          </aside>
        </div>
      </div>
    </AppShell>
  );
}
