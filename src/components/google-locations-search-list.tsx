"use client";

import { useState } from "react";
import type { GoogleBusinessLocation } from "@/lib/google-oauth";

type Props = {
  googleLocations: Array<GoogleBusinessLocation & { accountName?: string; accountResourceName?: string }>;
};

export function GoogleLocationsSearchList({ googleLocations }: Props) {
  const [query, setQuery] = useState("");

  const filtered = googleLocations.filter((location) => {
    const q = query.toLowerCase();
    return (
      (location.title ?? location.name).toLowerCase().includes(q) ||
      (location.accountName ?? "").toLowerCase().includes(q) ||
      (location.storefrontAddress?.locality ?? "").toLowerCase().includes(q) ||
      (location.storefrontAddress?.administrativeArea ?? "").toLowerCase().includes(q)
    );
  });

  return (
    <div className="mt-4 rounded-2xl bg-slate-50 p-4">
      <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">
        Discovered Google Business Profile locations ({googleLocations.length})
      </p>
      <input
        type="text"
        placeholder="Search locations..."
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        className="mt-3 w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 placeholder:text-slate-400 focus:border-indigo-400 focus:outline-none focus:ring-2 focus:ring-indigo-100"
      />
      {query && (
        <p className="mt-2 text-xs text-slate-500">
          Showing {filtered.length} of {googleLocations.length} locations
        </p>
      )}
      <div className="mt-3 space-y-3">
        {filtered.map((location) => (
          <div key={location.name} className="rounded-2xl border border-slate-200 bg-white p-3 text-sm text-slate-700">
            <p className="font-semibold text-slate-900">{location.title ?? location.name}</p>
            <p className="mt-1 text-slate-600">Account: {location.accountName ?? location.accountResourceName ?? "Unknown account"}</p>
            <p className="mt-1 text-slate-600">
              {[location.storefrontAddress?.locality, location.storefrontAddress?.administrativeArea].filter(Boolean).join(", ") || "Address not available"}
            </p>
          </div>
        ))}
        {filtered.length === 0 && (
          <p className="text-sm text-slate-500">No locations match your search.</p>
        )}
      </div>
    </div>
  );
}
