export const dynamic = "force-dynamic";

import { headers } from "next/headers";
import Link from "next/link";
import Script from "next/script";
import { notFound } from "next/navigation";
import { AppShell } from "@/components/app-shell";
import { getReviewWidgetById } from "@/lib/review-widgets";

export default async function WidgetTestPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const widget = await getReviewWidgetById(id);

  if (!widget) {
    notFound();
  }

  const hdrs = await headers();
  const host = hdrs.get("host") ?? "";
  const proto = hdrs.get("x-forwarded-proto") ?? "https";
  const appUrl = host ? `${proto}://${host}` : (process.env.NEXT_PUBLIC_APP_URL?.replace(/\/$/, "") ?? "");
  const embedScriptUrl = `${appUrl}/embed/widget.js`;

  return (
    <AppShell activeScreen="widgets">
      <div className="space-y-6">
        <div>
          <Link href={`/widgets/${widget.id}`} className="text-sm font-semibold text-indigo-600">
            ← Back to widget
          </Link>
          <p className="mt-4 eyebrow">Widget Test Page</p>
          <h2 className="page-title">{widget.name}</h2>
          <p className="mt-2 text-sm text-slate-600">This page mounts the public embed script exactly like a customer site would.</p>
        </div>

        <section className="panel">
          <h3 className="section-title">Live mounted widget</h3>
          <p className="mt-2 text-sm text-slate-600">If reviews are synced and the widget is active, they should render below.</p>
          <div className="mt-6 rounded-3xl border border-dashed border-slate-300 bg-slate-50 p-6">
            <div id="why-reviews-widget"></div>
            <Script src={embedScriptUrl} data-token={widget.publicToken} data-mount="#why-reviews-widget" strategy="afterInteractive" />
          </div>
        </section>

        <section className="panel">
          <h3 className="section-title">Test details</h3>
          <div className="mt-4 space-y-2 text-sm text-slate-600">
            <p><span className="font-semibold text-slate-900">Widget token:</span> {widget.publicToken}</p>
            <p><span className="font-semibold text-slate-900">Embed script:</span> {embedScriptUrl}</p>
            <p><span className="font-semibold text-slate-900">JSON endpoint:</span> {appUrl ? `${appUrl}/api/public/widgets/${widget.publicToken}` : `/api/public/widgets/${widget.publicToken}`}</p>
          </div>
        </section>
      </div>
    </AppShell>
  );
}
