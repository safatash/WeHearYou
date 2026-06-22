import Link from "next/link";
import type { LocationStatus } from "@/lib/location-status";
import { CopyLinkButton } from "./copy-link-button";

const STATUS_STYLES: Record<LocationStatus, string> = {
  Active: "bg-[var(--success-soft)] text-[#047857]",
  Draft: "bg-[var(--ink-100)] text-[var(--ink-600)]",
  Paused: "bg-[var(--warning-soft)] text-[#92400e]",
  "Needs setup": "bg-[var(--danger-soft)] text-[#b91c1c]",
};

export function LocationHeader({
  location, publicUrl, status, connectedSources, avgRating, totalReviews,
}: {
  location: { id: string; name: string; slug: string; city: string; state: string };
  publicUrl: string;
  status: LocationStatus;
  connectedSources: string[];
  avgRating: number | null;
  totalReviews: number;
}) {
  return (
    <header className="rounded-2xl border border-[var(--ink-200)] bg-white p-6 shadow-[var(--shadow-sm)]">
      <Link href="/locations" className="text-sm font-semibold text-[var(--accent)]">← All locations</Link>
      <div className="mt-3 flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
        <div>
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-semibold tracking-tight text-[var(--ink-900)]">{location.name}</h1>
            <span className={`rounded-full px-3 py-1 text-xs font-semibold ${STATUS_STYLES[status]}`}>{status}</span>
          </div>
          <p className="mt-1 text-sm text-[var(--ink-500)]">{location.city}, {location.state}</p>
          <div className="mt-2 flex items-center gap-2 text-sm">
            <span className="font-semibold text-[var(--ink-900)]">{avgRating ? avgRating.toFixed(1) : "—"}</span>
            <span className="text-[var(--star)]">{"★".repeat(Math.round(avgRating ?? 0))}</span>
            <span className="text-[var(--ink-500)]">({totalReviews} reviews)</span>
          </div>
          <div className="mt-3 flex items-center gap-2">
            <span className="inline-flex items-center gap-2 rounded-full border border-[var(--accent-border)] bg-[var(--accent-softer)] px-3 py-1.5 font-mono text-xs text-[var(--accent-strong)]">{publicUrl.replace(/^https?:\/\//, "")}</span>
            <CopyLinkButton url={publicUrl} label="Copy" className="rounded-full border border-[var(--ink-200)] px-3 py-1.5 text-xs font-semibold text-[var(--ink-600)] hover:bg-[var(--ink-50)]" />
          </div>
          {connectedSources.length > 0 && (
            <div className="mt-3 flex flex-wrap gap-1.5">
              {connectedSources.map((s) => (
                <span key={s} className="rounded-md bg-[var(--ink-100)] px-2 py-0.5 text-xs font-semibold text-[var(--ink-600)]">{s}</span>
              ))}
            </div>
          )}
        </div>
        <div className="flex flex-wrap gap-2">
          <CopyLinkButton url={publicUrl} />
          <a href={publicUrl} target="_blank" rel="noreferrer" className="rounded-xl border border-[var(--ink-200)] bg-white px-3 py-2 text-sm font-semibold text-[var(--ink-700)] hover:bg-[var(--ink-50)]">Open public page</a>
          <a href="#minisite-settings" className="rounded-xl border border-[var(--ink-200)] bg-white px-3 py-2 text-sm font-semibold text-[var(--ink-700)] hover:bg-[var(--ink-50)]">Customize mini site</a>
          <a href="#location-settings" className="rounded-xl border border-[var(--ink-200)] bg-white px-3 py-2 text-sm font-semibold text-[var(--ink-700)] hover:bg-[var(--ink-50)]">Edit location</a>
          <Link href={`/campaigns/new?locationId=${location.id}`} className="rounded-xl bg-[var(--accent)] px-3 py-2 text-sm font-semibold !text-white hover:bg-[var(--accent-strong)]">Send review request</Link>
          <a href="#connected-sources" className="rounded-xl border border-[var(--ink-200)] bg-white px-3 py-2 text-sm font-semibold text-[var(--ink-700)] hover:bg-[var(--ink-50)]">Manage sources</a>
        </div>
      </div>
    </header>
  );
}
