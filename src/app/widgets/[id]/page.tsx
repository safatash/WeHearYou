export const dynamic = "force-dynamic";

import { notFound } from "next/navigation";
import { AppShell } from "@/components/app-shell";
import { CopyButton } from "@/components/copy-button";
import { ReviewWidgetPreview } from "@/components/review-widget-preview";
import { updateReviewWidget, regenerateReviewWidgetToken } from "@/app/widgets/actions";
import { getPublicReviewWidgetPayload, getReviewWidgetById } from "@/lib/review-widgets";

const LAYOUT_OPTIONS: Array<{ value: string; label: string; hint: string }> = [
  { value: "grid", label: "Grid", hint: "Two-column card grid. Default." },
  { value: "list", label: "List", hint: "Vertical stack, one review per row." },
  { value: "slider", label: "Slider", hint: "Horizontal carousel. Good for hero strips." },
  { value: "badge", label: "Badge", hint: "Compact rating pill. Good for footers and headers." },
];

const FONT_OPTIONS: Array<{ value: string; label: string }> = [
  { value: "system", label: "System" },
  { value: "sans", label: "Inter / Sans" },
  { value: "serif", label: "Serif" },
];

function Panel({
  title,
  description,
  children,
}: {
  title: string;
  description?: string;
  children: React.ReactNode;
}) {
  return (
    <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
      <div className="flex items-baseline justify-between gap-3">
        <h3 className="text-lg font-semibold text-slate-950">{title}</h3>
      </div>
      {description ? <p className="mt-1 text-sm text-slate-500">{description}</p> : null}
      <div className="mt-5 space-y-4">{children}</div>
    </section>
  );
}

function FieldLabel({ children }: { children: React.ReactNode }) {
  return <span className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">{children}</span>;
}

function ColorInput({
  name,
  defaultValue,
  label,
}: {
  name: string;
  defaultValue: string;
  label: string;
}) {
  return (
    <label className="flex flex-col gap-1">
      <FieldLabel>{label}</FieldLabel>
      <span className="flex items-center gap-2 rounded-2xl border border-slate-200 bg-slate-50 px-3 py-2">
        <input
          type="color"
          name={name}
          defaultValue={defaultValue}
          className="h-7 w-10 cursor-pointer rounded border border-slate-200 bg-transparent p-0"
          aria-label={label}
        />
        <input
          type="text"
          name={`${name}_text`}
          defaultValue={defaultValue}
          readOnly
          className="w-24 bg-transparent text-sm font-mono text-slate-700"
        />
      </span>
    </label>
  );
}

export default async function WidgetDetailPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
}) {
  const { id } = await params;
  const query = (await searchParams) ?? {};
  const widget = await getReviewWidgetById(id);

  if (!widget) {
    notFound();
  }

  const flash = typeof query.flash === "string" ? query.flash : null;
  const tone =
    typeof query.tone === "string" && ["success", "error", "info"].includes(query.tone)
      ? (query.tone as "success" | "error" | "info")
      : "success";
  const appUrl = process.env.NEXT_PUBLIC_APP_URL?.replace(/\/$/, "") ?? "";
  const embedScriptUrl = appUrl ? `${appUrl}/embed/widget.js` : "/embed/widget.js";
  const publicJsonUrl = appUrl
    ? `${appUrl}/api/public/widgets/${widget.publicToken}`
    : `/api/public/widgets/${widget.publicToken}`;
  const localTestUrl = `/widgets/${widget.id}/test`;
  const embedCode = `<div id="why-reviews-widget"></div>\n<script src="${embedScriptUrl}" data-token="${widget.publicToken}" data-mount="#why-reviews-widget"></script>`;
  const preview = await getPublicReviewWidgetPayload(widget.publicToken, 1);

  return (
    <AppShell activeScreen="widgets" flash={flash ? { message: flash, tone } : null}>
      <div className="space-y-6">
        <div>
          <p className="text-sm font-semibold uppercase tracking-[0.22em] text-indigo-600">Widget Detail</p>
          <h2 className="mt-2 text-3xl font-semibold tracking-tight text-slate-950">{widget.name}</h2>
          <p className="mt-2 text-sm text-slate-600">Location: {widget.location.name}</p>
          <div className="mt-3 inline-flex rounded-full border border-slate-200 bg-slate-50 px-3 py-1 text-xs font-semibold uppercase tracking-[0.18em] text-slate-700">
            {widget.health.status.replace("_", " ")}
          </div>
          <p className="mt-2 text-sm text-slate-600">{widget.health.message}</p>
        </div>

        <form action={updateReviewWidget} className="space-y-6">
          <input type="hidden" name="widgetId" value={widget.id} />

          <Panel title="Basics" description="Name, layout, and which reviews to show.">
            <label className="flex flex-col gap-1">
              <FieldLabel>Name</FieldLabel>
              <input
                name="name"
                defaultValue={widget.name}
                className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm"
              />
            </label>

            <div className="grid gap-4 md:grid-cols-2">
              <label className="flex flex-col gap-1">
                <FieldLabel>Layout</FieldLabel>
                <select
                  name="layout"
                  defaultValue={widget.layout}
                  className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm"
                >
                  {LAYOUT_OPTIONS.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label} — {option.hint}
                    </option>
                  ))}
                </select>
              </label>

              <label className="flex flex-col gap-1">
                <FieldLabel>Sort</FieldLabel>
                <select
                  name="sort"
                  defaultValue={widget.sort}
                  className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm"
                >
                  <option value="newest">Newest first</option>
                  <option value="highest">Highest rated</option>
                  <option value="lowest">Lowest rated</option>
                </select>
              </label>

              <label className="flex flex-col gap-1">
                <FieldLabel>Minimum rating</FieldLabel>
                <input
                  name="minRating"
                  type="number"
                  min={1}
                  max={5}
                  defaultValue={widget.minRating}
                  className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm"
                />
              </label>

              <label className="flex flex-col gap-1">
                <FieldLabel>Reviews per page</FieldLabel>
                <input
                  name="pageSize"
                  type="number"
                  min={1}
                  max={50}
                  defaultValue={widget.pageSize}
                  className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm"
                />
              </label>
            </div>

            <label className="flex items-center gap-2 text-sm text-slate-700">
              <input type="checkbox" name="isActive" defaultChecked={widget.isActive} /> Active (widget renders publicly)
            </label>
          </Panel>

          <Panel
            title="Header"
            description="The block above the reviews — business name, average rating, and review count."
          >
            <label className="flex items-center gap-2 text-sm text-slate-700">
              <input type="checkbox" name="showHeader" defaultChecked={widget.showHeader} /> Show header
            </label>

            <div className="grid gap-3 md:grid-cols-2">
              <label className="flex items-center gap-2 text-sm text-slate-700">
                <input type="checkbox" name="showAvgRating" defaultChecked={widget.showAvgRating} /> Show average rating
              </label>
              <label className="flex items-center gap-2 text-sm text-slate-700">
                <input type="checkbox" name="showReviewCount" defaultChecked={widget.showReviewCount} /> Show review count
              </label>
            </div>

            <label className="flex flex-col gap-1">
              <FieldLabel>Header alignment</FieldLabel>
              <select
                name="headerAlign"
                defaultValue={widget.headerAlign}
                className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm"
              >
                <option value="left">Left</option>
                <option value="center">Center</option>
              </select>
            </label>
          </Panel>

          <Panel
            title="Reviews"
            description="What each individual review card shows."
          >
            <div className="grid gap-3 md:grid-cols-2">
              <label className="flex items-center gap-2 text-sm text-slate-700">
                <input type="checkbox" name="showRating" defaultChecked={widget.showRating} /> Show star rating
              </label>
              <label className="flex items-center gap-2 text-sm text-slate-700">
                <input type="checkbox" name="showReviewerName" defaultChecked={widget.showReviewerName} /> Show reviewer name
              </label>
              <label className="flex items-center gap-2 text-sm text-slate-700">
                <input type="checkbox" name="showDate" defaultChecked={widget.showDate} /> Show date
              </label>
              <label className="flex items-center gap-2 text-sm text-slate-700">
                <input type="checkbox" name="showResponses" defaultChecked={widget.showResponses} /> Show owner responses
              </label>
              <label className="flex items-center gap-2 text-sm text-slate-700">
                <input type="checkbox" name="showWriteReview" defaultChecked={widget.showWriteReview} /> Show &ldquo;Write a review&rdquo; link
              </label>
            </div>

            <label className="flex flex-col gap-1">
              <FieldLabel>Truncate review body at (characters)</FieldLabel>
              <input
                name="bodyMaxChars"
                type="number"
                min={40}
                max={2000}
                defaultValue={widget.bodyMaxChars}
                className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm"
              />
            </label>
          </Panel>

          <Panel
            title="Appearance"
            description="Colors and typography — applied across whichever layout you pick."
          >
            <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-4">
              <ColorInput name="primaryColor" defaultValue={widget.primaryColor} label="Primary" />
              <ColorInput name="starColor" defaultValue={widget.starColor} label="Stars" />
              <ColorInput name="backgroundColor" defaultValue={widget.backgroundColor} label="Background" />
              <ColorInput name="textColor" defaultValue={widget.textColor} label="Text" />
            </div>

            <label className="flex flex-col gap-1">
              <FieldLabel>Font family</FieldLabel>
              <select
                name="fontFamily"
                defaultValue={widget.fontFamily}
                className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm md:max-w-xs"
              >
                {FONT_OPTIONS.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </label>

            <label className="flex flex-col gap-1">
              <FieldLabel>Theme (legacy)</FieldLabel>
              <select
                name="theme"
                defaultValue={widget.theme}
                className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm md:max-w-xs"
              >
                <option value="light">Light</option>
                <option value="dark">Dark</option>
              </select>
            </label>
          </Panel>

          <div className="flex justify-end">
            <button className="rounded-2xl bg-slate-950 px-5 py-3 text-sm font-semibold text-white">
              Save widget
            </button>
          </div>
        </form>

        <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
          <h3 className="text-xl font-semibold text-slate-950">Embed code</h3>
          <textarea
            readOnly
            value={embedCode}
            className="mt-4 min-h-32 w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm"
          />
          <div className="mt-4 flex flex-wrap gap-3">
            <CopyButton value={embedCode} label="Copy embed code" copiedLabel="Embed code copied" />
            <CopyButton value={publicJsonUrl} label="Copy JSON URL" copiedLabel="JSON URL copied" />
            <a
              href={publicJsonUrl}
              target="_blank"
              rel="noreferrer"
              className="rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm font-semibold text-slate-700 shadow-sm hover:border-slate-300 hover:text-slate-950"
            >
              Open public JSON
            </a>
            <a
              href={localTestUrl}
              className="rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm font-semibold text-slate-700 shadow-sm hover:border-slate-300 hover:text-slate-950"
            >
              Open local test page
            </a>
            <form action={regenerateReviewWidgetToken}>
              <input type="hidden" name="widgetId" value={widget.id} />
              <button className="rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm font-semibold text-slate-700">
                Regenerate token
              </button>
            </form>
          </div>
          {!appUrl ? (
            <p className="mt-3 text-sm text-amber-700">
              Set NEXT_PUBLIC_APP_URL to generate a production-ready absolute embed URL.
            </p>
          ) : null}
        </section>

        <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
          <h3 className="text-xl font-semibold text-slate-950">Preview</h3>
          <p className="mt-2 text-sm text-slate-600">
            Live preview using the current saved settings. Hit &ldquo;Save widget&rdquo; above to refresh after changes.
          </p>
          {widget.health.status !== "healthy" ? (
            <div className="mt-4 rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
              This widget is not fully ready for production use yet. {widget.health.message}
            </div>
          ) : null}
          <div className="mt-5">
            <ReviewWidgetPreview
              businessName={preview?.location.name ?? widget.location.name}
              avgRating={preview?.location.avgRating ?? widget.location.avgRating ?? null}
              reviewCount={preview?.location.reviewCount ?? 0}
              reviews={preview?.reviews ?? []}
              layout={widget.layout}
              showHeader={widget.showHeader}
              showAvgRating={widget.showAvgRating}
              showReviewCount={widget.showReviewCount}
              headerAlign={widget.headerAlign}
              showRating={widget.showRating}
              showReviewerName={widget.showReviewerName}
              showDate={widget.showDate}
              showWriteReview={widget.showWriteReview}
              showResponses={widget.showResponses}
              bodyMaxChars={widget.bodyMaxChars}
              primaryColor={widget.primaryColor}
              starColor={widget.starColor}
              backgroundColor={widget.backgroundColor}
              textColor={widget.textColor}
              fontFamily={widget.fontFamily}
              reviewLink={preview?.location.reviewLink ?? widget.location.reviewLink ?? null}
            />
          </div>
        </section>
      </div>
    </AppShell>
  );
}
