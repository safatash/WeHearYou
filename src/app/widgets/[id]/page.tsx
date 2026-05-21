export const dynamic = "force-dynamic";

import { notFound } from "next/navigation";
import { AppShell } from "@/components/app-shell";
import { WidgetCustomizer } from "@/components/widget-customizer";
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
  const tone =
    typeof query.tone === "string" && ["success", "error", "info"].includes(query.tone)
      ? (query.tone as "success" | "error" | "info")
      : "success";
  const appUrl = process.env.NEXT_PUBLIC_APP_URL?.replace(/\/$/, "") ?? "";
  const embedScriptUrl = appUrl ? `${appUrl}/embed/widget.js` : "/embed/widget.js";
  const localTestUrl = `/widgets/${widget.id}/test`;
  const preview = await getPublicReviewWidgetPayload(widget.publicToken, 10);

  return (
    <AppShell activeScreen="widgets" flash={flash ? { message: flash, tone } : null}>
      <div className="space-y-8">
        {/* Header */}
        <div>
          <p className="text-sm font-semibold uppercase tracking-[0.22em] text-indigo-600">Widget Customizer</p>
          <h2 className="mt-2 text-4xl font-bold tracking-tight text-slate-950">{widget.name}</h2>
          <p className="mt-2 text-slate-600">Location: <span className="font-semibold">{widget.location.name}</span></p>
          <div className="mt-3 inline-flex items-center gap-2 rounded-full border border-slate-200 bg-slate-50 px-3 py-1 text-xs font-semibold uppercase tracking-[0.18em] text-slate-700">
            <span className={widget.health.status === "healthy" ? "text-emerald-600" : "text-amber-600"}>
              {widget.health.status === "healthy" ? "✓" : "⚠"}
            </span>
            {widget.health.status.replace("_", " ")}
          </div>
        </div>

        {/* Customizer Component */}
        <WidgetCustomizer
          widget={widget}
          preview={preview}
          embedScriptUrl={embedScriptUrl}
          localTestUrl={localTestUrl}
        />
      </div>
    </AppShell>
  );
}
