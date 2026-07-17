"use client";

import { useEffect, useState } from "react";

interface AnalyticsData {
  uniqueViews: number;
  happyClicks: number;
  unhappyClicks: number;
  googleRedirects: number;
  feedbackSubmissions: number;
}

interface AnalyticsTabProps {
  slug: string;
}

export function AnalyticsTab({ slug }: AnalyticsTabProps) {
  const [range, setRange] = useState(30);
  const [data, setData] = useState<AnalyticsData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);

    fetch(`/api/review-links/${slug}/analytics?range=${range}`)
      .then((r) => r.json())
      .then((result) => {
        if (!cancelled) {
          setData(result);
          setLoading(false);
        }
      })
      .catch(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [slug, range]);

  return (
    <div className="pt-4 space-y-4">
      <div className="flex items-center gap-2">
        <span className="text-xs font-semibold text-slate-500">Period:</span>
        {[7, 30, 90].map((d) => (
          <button
            key={d}
            type="button"
            onClick={() => setRange(d)}
            className={`rounded-lg px-3 py-1 text-xs font-semibold transition ${
              range === d
                ? "bg-indigo-600 text-white"
                : "bg-slate-100 text-slate-700 hover:bg-slate-200"
            }`}
          >
            {d}d
          </button>
        ))}
      </div>

      {loading ? (
        <p className="text-sm text-slate-400">Loading…</p>
      ) : data ? (
        <div className="grid grid-cols-3 gap-3">
          {[
            { label: "Views", value: data.uniqueViews },
            { label: "Happy", value: data.happyClicks },
            { label: "Unhappy", value: data.unhappyClicks },
            { label: "Google Redirects", value: data.googleRedirects },
            { label: "Feedback", value: data.feedbackSubmissions },
          ].map((stat) => (
            <div
              key={stat.label}
              className="rounded-xl border border-slate-200 bg-slate-50 p-3 text-center"
            >
              <p className="text-xl font-bold text-slate-900">{stat.value}</p>
              <p className="text-xs text-slate-500">{stat.label}</p>
            </div>
          ))}
        </div>
      ) : (
        <p className="text-sm text-slate-400">No data available</p>
      )}
    </div>
  );
}
