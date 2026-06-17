export const dynamic = "force-dynamic";

import Link from "next/link";
import { AppShell } from "@/components/app-shell";
import { requireActiveMembershipPage } from "@/lib/page-guards";
import { getOrganizationReviewWidgets } from "@/lib/review-widgets";

// Friendly label + icon for each stored layout value.
const LAYOUT_META: Record<string, { label: string; icon: string }> = {
  grid: { label: "Grid", icon: "▦" },
  masonry: { label: "Wall of Love", icon: "🧱" },
  carousel: { label: "Carousel", icon: "🎠" },
  slider: { label: "Slider", icon: "↔️" },
  list: { label: "List", icon: "☰" },
  badge: { label: "Rating badge", icon: "⭐" },
  floating: { label: "Floating badge", icon: "💬" },
  video: { label: "Video", icon: "🎬" },
  "video-grid": { label: "Video grid", icon: "🎬" },
  "video-carousel": { label: "Video carousel", icon: "🎬" },
  "featured-video": { label: "Featured video", icon: "🎬" },
  "video-wall": { label: "Video wall", icon: "🎬" },
  "mixed-masonry": { label: "Mixed masonry", icon: "🧱" },
  "featured-video-reviews": { label: "Featured + reviews", icon: "🎬" },
  "mixed-carousel": { label: "Mixed carousel", icon: "🎠" },
  tabbed: { label: "Tabbed", icon: "🗂️" },
};

const HEALTH_META: Record<string, { label: string; className: string }> = {
  healthy: { label: "Healthy", className: "bg-emerald-50 text-emerald-700 ring-emerald-600/20" },
  sync_required: { label: "Sync required", className: "bg-amber-50 text-amber-700 ring-amber-600/20" },
  mapping_required: { label: "Mapping required", className: "bg-amber-50 text-amber-700 ring-amber-600/20" },
  inactive: { label: "Inactive", className: "bg-slate-100 text-slate-600 ring-slate-500/20" },
};

function layoutMeta(layout: string) {
  return LAYOUT_META[layout] ?? { label: layout, icon: "▦" };
}

export default async function WidgetsPage({
  searchParams,
}: {
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
}) {
  const membership = await requireActiveMembershipPage();
  const query = (await searchParams) ?? {};
  const flashMessage = typeof query.flash === "string" ? query.flash : null;
  const flashTone =
    typeof query.tone === "string" && ["success", "error", "info"].includes(query.tone)
      ? (query.tone as "success" | "error" | "info")
      : "success";

  const widgets = await getOrganizationReviewWidgets(membership.organization.id);

  return (
    <AppShell activeScreen="widgets" flash={flashMessage ? { message: flashMessage, tone: flashTone } : null}>
      <div className="space-y-8">
        {/* Header */}
        <div className="flex flex-wrap items-end justify-between gap-4 border-b border-slate-200 pb-6">
          <div>
            <p className="text-sm font-semibold uppercase tracking-[0.22em] text-indigo-600">Widgets</p>
            <h2 className="mt-3 text-4xl font-bold tracking-tight text-slate-950">Review widgets</h2>
            <p className="mt-3 max-w-2xl text-base text-slate-600">
              Embed your reviews anywhere. Create a widget, customize it live, then copy the embed snippet.
            </p>
          </div>
          <Link
            href="/widgets/new"
            className="rounded-xl bg-indigo-600 px-5 py-3 text-sm font-semibold text-white shadow-sm transition hover:bg-indigo-500"
          >
            + New widget
          </Link>
        </div>

        {widgets.length === 0 ? (
          /* Empty state */
          <div className="rounded-3xl border border-dashed border-slate-300 bg-white px-6 py-16 text-center">
            <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-indigo-50 text-2xl">
              ▦
            </div>
            <h3 className="mt-5 text-xl font-semibold text-slate-900">No widgets yet</h3>
            <p className="mx-auto mt-2 max-w-md text-sm text-slate-600">
              Build your first review widget to show off your best feedback on your website.
            </p>
            <Link
              href="/widgets/new"
              className="mt-6 inline-flex rounded-xl bg-indigo-600 px-5 py-3 text-sm font-semibold text-white shadow-sm transition hover:bg-indigo-500"
            >
              + Create a widget
            </Link>
          </div>
        ) : (
          <div className="grid gap-5 sm:grid-cols-2 xl:grid-cols-3">
            {widgets.map((widget) => {
              const meta = layoutMeta(widget.layout);
              const health = HEALTH_META[widget.health.status] ?? HEALTH_META.inactive;
              return (
                <Link
                  key={widget.id}
                  href={`/widgets/${widget.id}`}
                  className="group flex flex-col rounded-2xl border border-slate-200 bg-white p-5 shadow-sm transition hover:border-indigo-300 hover:shadow-md"
                >
                  <div className="flex items-start justify-between gap-3">
                    <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-slate-100 text-xl">
                      {meta.icon}
                    </span>
                    <span
                      className={`rounded-full px-2.5 py-1 text-xs font-semibold uppercase tracking-wide ring-1 ring-inset ${health.className}`}
                    >
                      {health.label}
                    </span>
                  </div>
                  <h3 className="mt-4 text-lg font-semibold text-slate-900 group-hover:text-indigo-700">
                    {widget.name}
                  </h3>
                  <p className="mt-1 text-sm text-slate-600">{widget.location.name}</p>
                  <div className="mt-4 flex flex-wrap items-center gap-2 border-t border-slate-100 pt-4 text-xs text-slate-500">
                    <span className="rounded-md bg-slate-50 px-2 py-1 font-medium text-slate-700">{meta.label}</span>
                    <span className="rounded-md bg-slate-50 px-2 py-1 font-medium text-slate-700">{widget.contentType}</span>
                    <span className="ml-auto font-medium text-slate-600">
                      {widget.health.reviewCount} review{widget.health.reviewCount === 1 ? "" : "s"}
                    </span>
                  </div>
                </Link>
              );
            })}
          </div>
        )}
      </div>
    </AppShell>
  );
}
