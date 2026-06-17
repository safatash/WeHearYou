export const dynamic = "force-dynamic";

import Link from "next/link";
import { LayoutGrid, Layers, Film, Star, MessageCircle, Send, Plus } from "lucide-react";
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

// Decorative style chips shown on the empty state.
const STYLE_CHIPS = [
  { label: "Wall of Love", Icon: LayoutGrid },
  { label: "Review carousel", Icon: Layers },
  { label: "Single testimonial", Icon: Film },
  { label: "Rating badge", Icon: Star },
  { label: "Floating badge", Icon: MessageCircle },
  { label: "Collect reviews", Icon: Send },
];

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
  const hasWidgets = widgets.length > 0;

  return (
    <AppShell activeScreen="widgets" flash={flashMessage ? { message: flashMessage, tone: flashTone } : null}>
      <div className="space-y-8">
        {/* Header */}
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-400">Widgets</p>
            <h2 className="mt-2 text-3xl font-bold tracking-tight text-slate-950">Your widgets</h2>
            <p className="mt-2 text-base text-slate-500">Embeddable review displays for your site.</p>
          </div>
          {hasWidgets && (
            <Link
              href="/widgets/new"
              className="inline-flex items-center gap-2 rounded-xl bg-teal-600 px-5 py-3 text-sm font-semibold text-white shadow-sm transition hover:bg-teal-500"
            >
              <Plus size={16} strokeWidth={2.5} />
              New widget
            </Link>
          )}
        </div>

        {!hasWidgets ? (
          /* Empty state — matches the design mock */
          <div className="flex min-h-[60vh] flex-col items-center justify-center px-6 text-center">
            <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-teal-50">
              <LayoutGrid size={28} strokeWidth={2} className="text-teal-600" />
            </div>
            <h3 className="mt-6 text-2xl font-bold text-slate-900">No widgets yet</h3>
            <p className="mx-auto mt-3 max-w-md text-sm leading-relaxed text-slate-500">
              Widgets embed your reviews, ratings, and video testimonials anywhere on your site.
              Create your first one — pick a style, customize it, and copy the embed code.
            </p>
            <Link
              href="/widgets/new"
              className="mt-7 inline-flex items-center gap-2 rounded-xl bg-teal-600 px-6 py-3 text-sm font-semibold text-white shadow-sm transition hover:bg-teal-500"
            >
              <Plus size={16} strokeWidth={2.5} />
              Create a widget
            </Link>

            <div className="mt-8 flex max-w-xl flex-wrap items-center justify-center gap-2.5">
              {STYLE_CHIPS.map(({ label, Icon }) => (
                <span
                  key={label}
                  className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-white px-4 py-2 text-sm font-medium text-slate-700 shadow-sm"
                >
                  <Icon size={15} strokeWidth={2} className="text-teal-500" />
                  {label}
                </span>
              ))}
            </div>
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
                  className="group flex flex-col rounded-2xl border border-slate-200 bg-white p-5 shadow-sm transition hover:border-teal-300 hover:shadow-md"
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
                  <h3 className="mt-4 text-lg font-semibold text-slate-900 group-hover:text-teal-700">
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
