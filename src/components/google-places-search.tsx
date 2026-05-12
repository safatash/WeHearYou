"use client";

import { useState } from "react";

type GooglePlacesSearchResult = {
  id: string;
  name: string;
  formattedAddress: string;
  addressLine1: string;
  city: string;
  state: string;
  postalCode: string;
  googlePlaceId: string;
  googleMapsUri: string;
  phone: string;
  websiteUri: string;
};

export function GooglePlacesSearch() {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<GooglePlacesSearchResult[]>([]);
  const [selectedId, setSelectedId] = useState<string>("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSearch() {
    if (!query.trim()) {
      setResults([]);
      setSelectedId("");
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const response = await fetch(`/api/integrations/google/places-search?q=${encodeURIComponent(query)}`);
      const json = await response.json();

      if (!response.ok) {
        throw new Error(json.error || "Search failed");
      }

      setResults(json.results || []);
      setSelectedId("");
    } catch (searchError) {
      setError(searchError instanceof Error ? searchError.message : "Search failed");
      setResults([]);
      setSelectedId("");
    } finally {
      setLoading(false);
    }
  }

  const selectedResult = results.find((result) => result.id === selectedId) ?? null;

  return (
    <div className="space-y-4">
      <div className="flex gap-3">
        <input
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          placeholder="Search business name or address"
          className="flex-1 rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-700"
        />
        <button
          type="button"
          onClick={handleSearch}
          className="rounded-2xl bg-slate-950 px-5 py-3 text-sm font-semibold !text-white shadow-sm visited:!text-white hover:!text-white"
        >
          {loading ? "Searching..." : "Search"}
        </button>
      </div>

      <input type="hidden" name="googleLocationPayload" value={selectedResult ? JSON.stringify(selectedResult) : ""} />

      {error ? <div className="rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-800">{error}</div> : null}

      {results.length > 0 ? (
        <div className="space-y-3">
          {results.map((result) => {
            const selected = result.id === selectedId;

            return (
              <button
                key={result.id}
                type="button"
                onClick={() => setSelectedId(result.id)}
                className={`block w-full rounded-2xl border p-4 text-left text-sm ${
                  selected ? "border-indigo-500 bg-indigo-50 text-indigo-900" : "border-slate-200 bg-slate-50 text-slate-700"
                }`}
              >
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <div className="font-semibold">{result.name}</div>
                    <div className="mt-1 text-slate-600">{result.formattedAddress}</div>
                    {result.googleMapsUri ? <div className="mt-1 text-xs text-slate-500">Place ID: {result.googlePlaceId}</div> : null}
                  </div>
                  <div className={`rounded-full px-3 py-1 text-xs font-semibold uppercase tracking-[0.18em] ${selected ? "bg-indigo-100 text-indigo-700" : "bg-white text-slate-500"}`}>
                    {selected ? "Selected" : "Select"}
                  </div>
                </div>
              </button>
            );
          })}
        </div>
      ) : null}

      {selectedResult ? (
        <div className="rounded-2xl bg-slate-50 p-4 text-sm text-slate-600">
          <p>
            <span className="font-semibold text-slate-900">Selected:</span> {selectedResult.name}
          </p>
          <p className="mt-1">{selectedResult.formattedAddress}</p>
        </div>
      ) : null}
    </div>
  );
}
