"use client";

import { useState } from "react";
import type { GoogleBusinessLocation } from "@/lib/google-oauth";
import { mapLocationToGoogleForOnboarding } from "@/app/onboarding/actions";
import { FormSubmitButton } from "@/components/form-submit-button";

type Props = {
  locationId: string;
  googleConnectionId: string;
  googleLocations: Array<GoogleBusinessLocation & { accountName?: string; accountResourceName?: string }>;
};

export function GoogleMappingForm({ locationId, googleConnectionId, googleLocations }: Props) {
  const [query, setQuery] = useState("");
  const [selected, setSelected] = useState<GoogleBusinessLocation & { accountName?: string; accountResourceName?: string } | null>(null);

  const filtered = googleLocations.filter((loc) => {
    const q = query.toLowerCase();
    return (
      (loc.title ?? loc.name).toLowerCase().includes(q) ||
      (loc.accountName ?? "").toLowerCase().includes(q) ||
      (loc.storefrontAddress?.locality ?? "").toLowerCase().includes(q)
    );
  });

  const payload = selected
    ? JSON.stringify({
        googleLocationId: selected.name.split("/").pop() ?? selected.name,
        googleLocationName: selected.name,
        googlePlaceId: selected.metadata?.placeId,
        reviewLink: selected.metadata?.newReviewUri,
        mapsUri: selected.metadata?.mapsUri,
      })
    : "";

  return (
    <form action={mapLocationToGoogleForOnboarding}>
      <input type="hidden" name="locationId" value={locationId} />
      <input type="hidden" name="googleConnectionId" value={googleConnectionId} />
      <input type="hidden" name="googleLocationPayload" value={payload} />

      <input
        type="text"
        placeholder="Search locations..."
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-2.5 text-sm text-slate-900 placeholder:text-slate-400 focus:border-indigo-400 focus:outline-none focus:ring-2 focus:ring-indigo-100 mb-3"
      />

      <div className="space-y-2 max-h-64 overflow-y-auto mb-4">
        {filtered.map((loc) => {
          const isSelected = selected?.name === loc.name;
          return (
            <button
              key={loc.name}
              type="button"
              onClick={() => setSelected(isSelected ? null : loc)}
              className={`w-full text-left rounded-2xl border p-3 text-sm transition-colors ${
                isSelected
                  ? "border-indigo-400 bg-indigo-50"
                  : "border-slate-200 bg-white hover:border-slate-300"
              }`}
            >
              <p className="font-semibold text-slate-900">{loc.title ?? loc.name}</p>
              <p className="text-slate-500 mt-0.5">
                {[loc.storefrontAddress?.locality, loc.storefrontAddress?.administrativeArea]
                  .filter(Boolean)
                  .join(", ") || "Address not available"}
              </p>
            </button>
          );
        })}
        {filtered.length === 0 && (
          <p className="text-sm text-slate-400 py-2">No locations match your search.</p>
        )}
      </div>

      <div className="flex items-center justify-between">
        <span className="text-xs text-slate-400">
          {selected ? `Selected: ${selected.title ?? selected.name}` : "No location selected"}
        </span>
        <FormSubmitButton
          idleLabel="Map & Continue →"
          pendingLabel="Mapping..."
          disabled={!selected}
          className="rounded-2xl bg-slate-950 px-6 py-2.5 text-sm font-semibold text-white hover:bg-slate-800 disabled:opacity-40 disabled:cursor-not-allowed"
        />
      </div>
    </form>
  );
}
