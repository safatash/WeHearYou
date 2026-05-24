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
        <div className="border-b border-slate-200 pb-6">
          <p className="text-sm font-semibold uppercase tracking-[0.22em] text-indigo-600">Widget Customizer</p>
          <div className="mt-4 flex items-end justify-between gap-4">
            <div>
              <p className="text-sm text-slate-600 font-medium">Customizing</p>
              <h2 className="mt-1 text-4xl font-bold tracking-tight text-slate-950">{widget.location.name}</h2>
              <p className="mt-3 text-base text-slate-600">
                <span className="font-medium text-slate-900">{widget.name}</span> widget
              </p>
            </div>
            <div className="flex-shrink-0">
              <div className={`flex items-center justify-center rounded-full p-3 ${widget.health.status === "healthy" ? "bg-emerald-100" : "bg-amber-100"}`}>
                <span className="text-2xl">{widget.health.status === "healthy" ? "✓" : "⚠"}</span>
              </div>
              <p className="mt-2 text-xs font-semibold text-center uppercase tracking-wide text-slate-600">
                {widget.health.status.replace("_", " ")}
              </p>
            </div>
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
