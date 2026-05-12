export const dynamic = "force-dynamic";

import { notFound } from "next/navigation";
import { AppShell } from "@/components/app-shell";
import { CopyButton } from "@/components/copy-button";
import { ReviewWidgetPreview } from "@/components/review-widget-preview";
import { updateReviewWidget, regenerateReviewWidgetToken } from "@/app/widgets/actions";
import { getPublicReviewWidgetPayload, getReviewWidgetById } from "@/lib/review-widgets";

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
  const tone = typeof query.tone === "string" && ["success", "error", "info"].includes(query.tone) ? (query.tone as "success" | "error" | "info") : "success";
  const appUrl = process.env.NEXT_PUBLIC_APP_URL?.replace(/\/$/, "") ?? "";
  const embedScriptUrl = appUrl ? `${appUrl}/embed/widget.js` : "/embed/widget.js";
  const publicJsonUrl = appUrl ? `${appUrl}/api/public/widgets/${widget.publicToken}` : `/api/public/widgets/${widget.publicToken}`;
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

        <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
          <h3 className="text-xl font-semibold text-slate-950">Settings</h3>

          <form action={updateReviewWidget} className="mt-6 space-y-4">
            <input type="hidden" name="widgetId" value={widget.id} />

            <input name="name" defaultValue={widget.name} className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm" />

            <div className="grid gap-4 md:grid-cols-2">
              <select name="layout" defaultValue={widget.layout} className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm">
                <option value="grid">Grid</option>
              </select>

              <select name="theme" defaultValue={widget.theme} className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm">
                <option value="light">Light</option>
                <option value="dark">Dark</option>
              </select>

              <select name="sort" defaultValue={widget.sort} className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm">
                <option value="newest">Newest</option>
                <option value="highest">Highest</option>
                <option value="lowest">Lowest</option>
              </select>

              <input name="minRating" type="number" min="1" max="5" defaultValue={widget.minRating} className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm" />

              <input name="pageSize" type="number" min="1" max="50" defaultValue={widget.pageSize} className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm" />
            </div>

            <div className="grid gap-3 md:grid-cols-2">
              <label><input type="checkbox" name="isActive" defaultChecked={widget.isActive} /> Active</label>
              <label><input type="checkbox" name="showHeader" defaultChecked={widget.showHeader} /> Show header</label>
              <label><input type="checkbox" name="showRating" defaultChecked={widget.showRating} /> Show stars</label>
              <label><input type="checkbox" name="showReviewerName" defaultChecked={widget.showReviewerName} /> Show reviewer name</label>
              <label><input type="checkbox" name="showDate" defaultChecked={widget.showDate} /> Show date</label>
              <label><input type="checkbox" name="showWriteReview" defaultChecked={widget.showWriteReview} /> Show write review link</label>
            </div>

            <button className="rounded-2xl bg-slate-950 px-4 py-3 text-sm font-semibold text-white">
              Save widget
            </button>
          </form>
        </section>

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
            <a href={publicJsonUrl} target="_blank" rel="noreferrer" className="rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm font-semibold text-slate-700 shadow-sm hover:border-slate-300 hover:text-slate-950">
              Open public JSON
            </a>
            <a href={localTestUrl} className="rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm font-semibold text-slate-700 shadow-sm hover:border-slate-300 hover:text-slate-950">
              Open local test page
            </a>
            <form action={regenerateReviewWidgetToken}>
              <input type="hidden" name="widgetId" value={widget.id} />
              <button className="rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm font-semibold text-slate-700">
                Regenerate token
              </button>
            </form>
          </div>
          {!appUrl ? <p className="mt-3 text-sm text-amber-700">Set NEXT_PUBLIC_APP_URL to generate a production-ready absolute embed URL.</p> : null}
        </section>

        <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
          <h3 className="text-xl font-semibold text-slate-950">Preview</h3>
          <p className="mt-2 text-sm text-slate-600">This is a live preview using the current public widget payload.</p>
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
              showHeader={widget.showHeader}
              showRating={widget.showRating}
              showReviewerName={widget.showReviewerName}
              showDate={widget.showDate}
              showWriteReview={widget.showWriteReview}
              reviewLink={preview?.location.reviewLink ?? widget.location.reviewLink ?? null}
            />
          </div>
        </section>
      </div>
    </AppShell>
  );
}
