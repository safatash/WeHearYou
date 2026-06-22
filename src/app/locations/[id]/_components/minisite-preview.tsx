"use client";
import { useState } from "react";
import type { SetupChecklistItem } from "@/lib/minisite-setup";
import { toggleMiniSitePublish } from "@/app/locations/actions";
import { CopyLinkButton } from "./copy-link-button";

export function MiniSitePreview({
  locationId, publicUrl, published, lastUpdated, checklist,
}: {
  locationId: string;
  publicUrl: string;
  published: boolean;
  lastUpdated: string;
  checklist: SetupChecklistItem[];
}) {
  const [device, setDevice] = useState<"desktop" | "mobile">("desktop");
  const previewUrl = `${publicUrl}?preview=1`;
  const incomplete = checklist.filter((i) => !i.done);

  return (
    <section className="rounded-2xl border border-[var(--ink-200)] bg-white p-6 shadow-[var(--shadow-sm)]">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-lg font-semibold text-[var(--ink-900)]">Public mini site</h2>
          <p className="mt-0.5 text-sm text-[var(--ink-500)]">
            <span className={`mr-2 rounded-full px-2 py-0.5 text-xs font-semibold ${published ? "bg-[var(--success-soft)] text-[#047857]" : "bg-[var(--ink-100)] text-[var(--ink-600)]"}`}>
              {published ? "Published" : "Draft"}
            </span>
            Updated {lastUpdated}
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <div className="flex rounded-xl border border-[var(--ink-200)] p-0.5">
            <button type="button" onClick={() => setDevice("desktop")} className={`rounded-lg px-3 py-1 text-xs font-semibold ${device === "desktop" ? "bg-[var(--ink-100)] text-[var(--ink-900)]" : "text-[var(--ink-500)]"}`}>Desktop</button>
            <button type="button" onClick={() => setDevice("mobile")} className={`rounded-lg px-3 py-1 text-xs font-semibold ${device === "mobile" ? "bg-[var(--ink-100)] text-[var(--ink-900)]" : "text-[var(--ink-500)]"}`}>Mobile</button>
          </div>
          <CopyLinkButton url={publicUrl} label="Copy link" />
          <a href={publicUrl} target="_blank" rel="noreferrer" className="rounded-xl border border-[var(--ink-200)] bg-white px-3 py-2 text-sm font-semibold text-[var(--ink-700)] hover:bg-[var(--ink-50)]">Open page</a>
          <a href="#minisite-settings" className="rounded-xl border border-[var(--ink-200)] bg-white px-3 py-2 text-sm font-semibold text-[var(--ink-700)] hover:bg-[var(--ink-50)]">Customize</a>
          <form action={toggleMiniSitePublish}>
            <input type="hidden" name="locationId" value={locationId} />
            <input type="hidden" name="publish" value={(!published).toString()} />
            <button type="submit" className="rounded-xl bg-[var(--accent)] px-3 py-2 text-sm font-semibold !text-white hover:bg-[var(--accent-strong)]">{published ? "Unpublish" : "Publish"}</button>
          </form>
        </div>
      </div>

      {incomplete.length > 0 && (
        <ul className="mt-4 grid gap-2 rounded-xl border border-[var(--warning-soft)] bg-[var(--warning-soft)]/40 p-4 sm:grid-cols-2">
          {checklist.map((item) => (
            <li key={item.key} className={`flex items-center gap-2 text-sm ${item.done ? "text-[var(--ink-400)] line-through" : "text-[var(--ink-700)]"}`}>
              <span>{item.done ? "✓" : "○"}</span>{item.label}
            </li>
          ))}
        </ul>
      )}

      <div className="mt-4 overflow-hidden rounded-xl border border-[var(--ink-200)] bg-[var(--ink-50)]">
        <div className="flex items-center gap-1.5 border-b border-[var(--ink-200)] bg-white px-3 py-2">
          <span className="h-3 w-3 rounded-full bg-[var(--ink-200)]" />
          <span className="h-3 w-3 rounded-full bg-[var(--ink-200)]" />
          <span className="h-3 w-3 rounded-full bg-[var(--ink-200)]" />
          <span className="ml-3 truncate rounded-md bg-[var(--ink-100)] px-2 py-0.5 font-mono text-xs text-[var(--ink-500)]">{publicUrl.replace(/^https?:\/\//, "")}</span>
        </div>
        <div className="flex justify-center bg-[var(--ink-100)] p-4">
          <iframe
            title="Mini site preview"
            src={previewUrl}
            className="h-[640px] rounded-lg border border-[var(--ink-200)] bg-white transition-all"
            style={{ width: device === "mobile" ? 390 : "100%" }}
          />
        </div>
      </div>
    </section>
  );
}
